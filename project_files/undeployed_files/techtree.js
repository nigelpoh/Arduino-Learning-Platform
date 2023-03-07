const gravity = -100;
const forceManyBody = d3.forceManyBody().strength(gravity);

const calculateRadius = (links, d) => {
	const weight = links
		.filter(link => link.source == d.id)
		.reduce((acc, val) => acc + 1, 0);

	return Math.exp(weight / links.length) * 10;
};

fetch('/projects.json')
	.then(res => res.json())
	.then(res => {
		const data = {};

		data.nodes = res.projects.map((d, i) => {
			return {
				...d,
				abbr: d.name.split(' ').map(w => w.charAt(0)).join(''),
				influence: 1,
				index: i,
			};
		});

		data.links = data.nodes.map(node => node.precursors.map(precursor => {
			return {
				id: `${precursor}-${node.id}`,
				source: precursor,
				target: node.id,
				weight: 3,
				type: "SUPERVISORY",
				overlap: 0,
			};
		})).flat();

		return data;

		/*
		return Promise.all(res.map((d, i) => {
			return fetch(d.logo)
				.then(res => res.text())
				.then(logo => {
					return {
						...d,
						logo,
						influence: 1,
						index: i,
					};
				})
		})).then(nodes => {
			data.nodes = nodes;
			data.links = data.nodes.map(node => node.precursors.map(precursor => {
				return {
					id: `${precursor}-${node.id}`,
					source: precursor,
					target: node.id,
					weight: 3,
					type: "SUPERVISORY",
					overlap: 0,
				};
			})).flat();
			return data;
		});
		*/
	}).then(data => {
		console.log(data);

		const svg = d3.select('svg');
		const width = +svg.attr('width');
		const height = +svg.attr('height');

		const colours = d3.scaleOrdinal()
			.domain([ 'Black', 'White' ])
			.range([ '#000000', '#FFFFFF' ]);

		const forceLink = d3.forceLink(data.links)
			.id(d => d.id).distance(50)
			.distance(() => 100 + Math.random() * 230);

		const links = svg.append('g')
			.attr('class', 'links')
			.selectAll('line')
			.data(data.links)
			.enter()
			.append('line')
			.attr('stroke', colours('White'))
			.attr('stroke-width', d => Math.sqrt(d.weight));

		const name_tooltip = d3.select('body')
			.append('div')
			.attr('class', 'tooltip')
			.style('opacity', 0);

		const nodes = svg.append('g')
			.attr('class', 'nodes')
			.selectAll('g')
			.data(data.nodes)
			.enter()
			.append('g')
			.on('mouseover', function(event, d) {
				d3.select(this)
					.transition()
					.duration(50)
					.attr('opacity', 0.85);

				name_tooltip.transition()
					.duration(50)
					.style('opacity', 1);
				name_tooltip.html(d.name)
					.style('left', `${event.pageX + 10}px`)
					.style('top', `${event.pageY - 15}px`);
			})
			.on('mouseout', function(event, d) {
				d3.select(this)
					.transition()
					.duration(50)
					.attr('opacity', 1);

				name_tooltip.transition()
					.duration(50)
					.style('opacity', 0);
			})
			.on('click', function(event, d){
				window.location = "/projects/" + d.id;
			});

		// TODO test
		/*
		const names = nodes.append('text')
			.text(d => d.name)
			.attr('id', d => `name-${d.id}`)
			.attr('visibility', 'hidden')
			.attr('text-anchor', 'middle')
      .attr('transform', 'translate(0, -30)')
			.attr('fill', d => colours('Black'))
			.attr('font-size', 15)
			.attr('font-family', 'sans-serif')
			.attr('font-weight', 700);
			*/

		/*
		const defs = svg.append('defs')
			.selectAll('defs')
			.data(data.nodes)
			.enter()
			.append('pattern')
			.attr('id', d => `logo-${d.id}`)
			.attr('width', d => calculateRadius(data.links, d) * 2)
			.attr('height', d => calculateRadius(data.links, d) * 2)
			.attr('preserveAspectRatio', 'xMidYMid slice')
			.append('image')
			.attr('width', d => calculateRadius(data.links, d) * 2)
			.attr('height', d => calculateRadius(data.links, d) * 2)
			.attr('href', d => d.logo)
			.attr('preserveAspectRatio', 'xMidYMid slice')
			.attr('fill', d => colours('White'));
		*/

		const circles = nodes.append('circle')
			.attr('r', d => calculateRadius(data.links, d))
			.attr('fill', d => colours('White'));

		const labels = nodes.append('text')
			.text(d => d.abbr)
			.attr('y', d => calculateRadius(data.links, d) / 2)
			.attr('dy', '-0.1em') // No idea why this is needed for centering
			.attr('stroke', colours('Black'))
			.attr('font-size', d => calculateRadius(data.links, d))
			.attr('font-weight', 300)
			.attr('font-family', 'sans-serif')
			.attr('text-anchor', 'middle')

		const simulation = d3.forceSimulation(data.nodes)
			.force('link', forceLink)
			.force('charge', forceManyBody)
			.force('center', d3.forceCenter(width / 2, height / 2))
			.on('tick', () => {
				links
					.attr('x1', d => d.source.x)
					.attr('y1', d => d.source.y)
					.attr('x2', d => d.target.x)
					.attr('y2', d => d.target.y);

				nodes.attr('transform', d => `translate(${d.x},${d.y})`);
			});

		circles
			.call(d3.drag()
				.on('start', (event, d) => {
					if (!event.active)
						simulation.alphaTarget(0.3).restart();

					d.fx = d.x;
					d.fy = d.y;
				})
				.on('drag', (event, d) => {
					d.fx = event.x;
					d.fy = event.y;
				})
				.on('end', (event, d) => {
					if (!event.active)
						simulation.alphaTarget(0).restart();

					d.fx = null;
					d.fy = null;
				})
			);
		
	})
	.catch(e => {
		console.error(e);
	});
