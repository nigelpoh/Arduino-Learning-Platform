const round_rect = (context, x, y, width, height, radius) => {
	context.beginPath();
	context.moveTo(x + radius, y)
	context.lineTo(x + width - radius, y);
	context.quadraticCurveTo(x + width, y, x + width, y + radius);
	context.lineTo(x + width, y + height - radius);
	context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	context.lineTo(x + radius, y + height);
	context.quadraticCurveTo(x, y, x + radius, y);
	context.closePath();
};

const djb2 = s => s.split('') // Hash function
	.reduce((acc, ch) => (acc << 5) + acc + ch.charCodeAt(0), 5381);

const stringToColour = (str) => {
	const toHexString = (n) => n.toString(16).padStart(2, '0');

	const hash = djb2(str);
	const r = (hash & 0xFF0000) >> 16;
	const g = (hash & 0x00FF00) >> 8;
	const b = (hash & 0x0000FF);

	return `#${toHexString(r)}${toHexString(g)}${toHexString(b)}`;
};

const wrap = (text, width) => {
	text.each(function() {
		const text = d3.select(this);
		const words = text.text().split(/\s+/).reverse();

		let line = [];
		let line_number = 0;
		const line_height = 1.1; //ems

		const x = text.attr('x');
		const y = text.attr('y');

		const dy = parseFloat(text.attr('dy')) || 0.0;
		let tspan = text.text(null)
			.append('tspan')
			.attr('x', x)
			.attr('y', y)
			.attr('dy', dy + 'em');

		let word = '';
		while (word = words.pop()) {
			line.push(word);
			tspan.text(line.join(' '));

			if (tspan.node().getComputedTextLength() > width) {
				line.pop();
				tspan.text(line.join(' '));
				line = [ word ];
				tspan = text.append("tspan")
					.attr("x", x)
					.attr("y", y)
					.attr("dy", ++line_number * line_height + dy + "em").text(word);
			}
		}
	});
};

const centre = (sorted) => { // descending
	const res = [sorted[0]];
	let i = 1;
	while (i < sorted.length) {
		res.unshift(sorted[i]);
		i++;
		
		if (i < sorted.length) {
			res.push(sorted[i]);
		}
		i++
	}

	return res;
};

const populate_layers = (nodes, i) => {
	// if (!nodes[i].layer) {
		const max_previous_layer = nodes[i].precursors
			.map(precursor => nodes.findIndex(n => n.id == precursor))
			.filter(n => n != -1)
			.reduce((acc, n) => {
				const l = populate_layers(nodes, n);
				return l > acc ? l : acc;
			}, -1);

		nodes[i].layer = max_previous_layer + 1;
	// }

	return nodes[i].layer;
};

// Levels are inverse thanks to the algorithm
const populate_levels = (nodes, i) => {
	// if (!nodes[i].level) {
		const max_previous_level = nodes[i].precursors
			.map(precursor => nodes.findIndex(n => n.id == precursor))
			.filter(n => n != -1)
			.reduce((acc, n) => {
				const l = populate_levels(nodes, n);
				return l > acc ? l : acc;
			}, 0);

		nodes[i].level = max_previous_level + 1;
	// }

	return nodes[i].level;
};

const populate_tree_levels = (nodes, nid, i, j) => {
	const node = nodes.find(n => n.id == id);
	if (!node.level || i > node.level) {
		node.level = i;
	}

	if (!node.layer || j > node.layer) {
		node.layer = j;
	}

	node.successors.forEach(successor => {
		const max = populate_tree_levels(nodes, successor, i + 1, j);
		j = max + 1;
	});

	return j;
};

const build_tree = (node, i, j) => {
	const l = { id: node.id, level: i, layer: j };
	let n = j;
	
	l.successors = node.successors.map(successor => {
		const { s, max } = build_tree(successor, i + 1, n);
		n = max + 1;
		return s;
	});

	return { s: l, max: n };
};

const calculate_x = (meta, width, padding) => {
	return meta.level * width + Math.max(meta.level - 1, 0) * padding;
};
const calculate_y = (meta, height, padding) => {
	return meta.layer * height + Math.max(meta.layer - 1, 0) * padding;
};
const draw_tree = ({ node, meta, context, width, height, padding }) => {
	const x = calculate_x(meta, width, padding);
	const y = calculate_y(meta, height, padding);

	context.beginPath();
	context.rect(x, y, width, height);
};

fetch('/projects.json')
	.then(res => res.json())
	.then(res => {
		const data = {};

		data.nodes = res.projects.map((d, i) => {
			return {
				...d,
				abbr: d.name.split(' ').map(w => w.charAt(0)).join(''),
				index: i,
			};
		});

		data.nodes.forEach((node) => {
			node.successors = data.nodes
				.filter(n => n.precursors.includes(node.id))
				.map(n => n.id);
		});

		data.nodes.forEach((n, i) => {
			populate_layers(data.nodes, i);
			populate_levels(data.nodes, i);
		});

		const max_layer = data.nodes.reduce((acc, n) => n.layer > acc ? n.layer : acc, 0);
		data.layers = [];
		for (let i = 0; i < max_layer + 1; i++) {
			data.layers.push({});
		}

		data.nodes.forEach(n => {
			const top_child = n.precursors
				.map(p => data.nodes.find(n => n.id == p))
				.reduce((acc, c) => {
					if (!acc) return c;
					if (acc.layer == c.layer) {
						if (acc.successors.length > c.successors.length) {
							return acc;
						} else if (acc.successors.length < c.successors.length) {
							return c;
						} else if (data.layers[n.layer][acc.id]) {
							return acc;
						} else if (data.layers[n.layer][c.id]) {
							return c;
						} else {
							return c;
						}
					}
					return acc.layer > c.layer ? acc : c;
				}, null);
			
			const tid = top_child ? top_child.id : '_childless';
			if (!data.layers[n.layer][tid]) data.layers[n.layer][tid] = [];

			if (!(n.precursors == 0 && n.successors == 0))
				data.layers[n.layer][tid].push(n);
		});

		data.layers = data.layers.map(layer => {
			const l = Object.values(layer);
			l.sort((a, b) => b.length - a.length);
			return centre(l).flat();
		});

		const max_level = data.layers.reduce((acc, layer) => Math.max(acc, layer.length), 0);
		data.layers2 = data.layers.map((layer, i) => {
			return layer.map((node, j) => {
				return {
					...node,
					layer: i,
					layer: j,
					offset: (max_level - layer.length) / 2,
				};
			});
		}).flat();

		data.links = data.nodes.map(node => node.precursors.map(precursor => {
			return {
				id: `${precursor}-${node.id}`,
				source: precursor,
				target: node.id,
			};
		})).flat();

		data.max_level = max_level;
		data.max_layer = max_layer + 1;

		return data;
	})
	.then(data => {
		console.log(data.nodes)
		console.log(data.layers2);

		const rect_width = 100;
		const rect_height = 55;
		const padding = 15;
		const radius = 5;

		const x = (node) => Math.max(node.level - 1, 0) * (rect_width + padding);
		const y = (node) => (node.layer + node.offset) * (rect_height + padding);

		const node_positions = data.layers2.reduce((acc, node) => {
			acc[node.id] = { 
				x: x(node) + rect_width / 2, 
				y: y(node) + rect_height / 2,
			};

			return acc;
		}, {});

		const link_lines = data.links.map(link => {
			const source = node_positions[link.source];
			const target = node_positions[link.target];
			const midpoint_x = target.x - (rect_width / 2 + padding / 2);

			const l1 = {
				x1: source.x,
				y1: source.y,
				x2: midpoint_x,
				y2: source.y,
			};

			const l2 = {
				x1: midpoint_x,
				y1: source.y,
				x2: midpoint_x,
				y2: target.y,
			};

			const l3 = {
				x1: midpoint_x,
				y1: target.y,
				x2: target.x,
				y2: target.y,
			};

			return [l1, l2, l3];
		}).flat();

		// const width = 1200;
		// const height = 720;
		console.log(data.max_layer, data.max_level);
		const width = data.max_layer * rect_width + (data.max_layer + 1) * padding;
		const height = data.max_level * rect_height + (data.max_level + 1) * padding;

		console.log(width, height);

		const svg = d3.select('#techtree').append('svg')
			.attr('width', width)
			.attr('height', height);

		const container = svg.append('g');

		const links = container.append('g')
			.selectAll('line')
			.data(link_lines)
			.enter()
			.append('line')
			.attr('x1', d => d.x1)
			.attr('y1', d => d.y1)
			.attr('x2', d => d.x2)
			.attr('y2', d => d.y2)
			.style('stroke', '#FF0000');

		const nodes = container.append('g')
			.selectAll('g')
			.data(data.layers2)
			.enter()
			.append('g');

		const node_rects = nodes.append('rect')
			.attr('rx', radius)
			.attr('ry', radius)
			.attr('width', rect_width)
			.attr('height', rect_height)
			.attr('x', node => x(node))
			.attr('y', node => y(node))
			.style('fill', d => stringToColour(d.series));

		const node_labels = nodes.append('text')
			.attr('x', d => x(d) + rect_width / 2)
			.attr('y', d => y(d) + rect_height / 2)
			.attr('font-size', '14px')
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.text(d => d.name)
			.call(wrap, rect_width);

		// console.log(rect_width, rect_height);
		// const wrap = d3.textwrap().bounds({ height: `${rect_height}px`, width: `${rect_width}px` });
		// d3.selectAll('text').call(wrap);

		/*
		const tmp = {};
		const canvas = document.getElementById('techtree');
		const context = canvas.getContext('2d');
		const width = canvas.width;
		const height = canvas.height;
		console.log(width, height);
		const max_level = data.layers.reduce((acc, layer) => Math.max(acc, layer.length), 0);
		console.log(max_level);
		const node_positions = {};
		data.layers.forEach(layer => {
			const offset = (max_level - layer.length) / 2;
			console.log(offset);
			layer
			.filter(node => !(node.successors.length == 0 && node.precursors.length == 0))
			.forEach((node, layer) => {
				const x = node.level * rect_width + Math.max(node.level - 1, 0) * padding;
				const y = (layer + offset) * (rect_height + padding);
				context.beginPath();
				round_rect(context, x, y, rect_width, rect_height, 5);
				context.strokeText(node.abbr, x + 10, y + 10);
				context.stroke();
				node_positions[node.id] = { x: x + rect_width / 2, y: y + rect_height / 2 };
			});
		});
		const max_layer = data.nodes.reduce((acc, n) => n.layer > acc ? n.layer : acc, 0);
		const colours = [];
		const random_colour = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
		for (let i = 0; i < max_layer + 1; i++) {
			const r = random_colour();
			const g = random_colour();
			const b = random_colour();
			colours.push(`#${r}${g}${b}`);
		}
		data.links.forEach(link => {
			const source = node_positions[link.source];
			const target = node_positions[link.target];
			const target_layer = data.nodes.find(n => n.id == link.target).layer;
			const midpoint_x = target.x - (rect_width / 2 + padding / 2);
			context.beginPath();
			context.moveTo(source.x, source.y);
			context.lineTo(midpoint_x, source.y);
			context.lineTo(midpoint_x, target.y);
			context.lineTo(target.x, target.y);
			// context.strokeStyle = stringToColour(target_layer + '');
			context.strokeStyle = colours[target_layer];
			context.stroke();
		});
		*/
	});