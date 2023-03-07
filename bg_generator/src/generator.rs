use crate::defs::Definition;
use rand::Rng;
use rand::distributions::Standard;
use std::fs::File;
use std::io::Write;
use std::path::Path;

pub fn generate(def:&Definition, output_file:&str) -> std::io::Result<()> {
    let mut output_file = File::create(Path::new(output_file))?;
    output_file.write_all(b"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" ?>\n")?;
    output_file.write_all(format!("<svg width=\"{}px\" height=\"{}px\" viewBox=\"0 0 {} {}\" preserveAspectRatio=\"none\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:svg=\"http://www.w3.org/2000/svg\">\n", def.width, def.height, def.width, def.height).as_bytes())?;

    output_file.write_all(format!("<rect style=\"fill:{};\" width=\"{}px\" height=\"{}px\" />\n", def.background_colour, def.width, def.height).as_bytes())?;

    let width = def.width as f64;
    let height = def.height as f64;
    let margin_x = width * def.margin;
    let margin_y = height * def.margin; 

    let mut rng = rand::thread_rng();
    for component in &def.components {
        let num = ((def.bodies as f64) * component.density).floor() as u64;
        for _ in 0..num {
            let scale:f64 = rng.gen_range(component.scale.lowest..component.scale.highest);

            let x:f64 = margin_x + rng.sample::<f64, _>(Standard) * (width - margin_x * 2.0);
            let y:f64 = margin_y + rng.sample::<f64, _>(Standard) * (height - margin_y * 2.0);

            output_file.write_all(format!("<g transform=\"translate({},{}) scale({},{})\">\n", x, y, scale, scale).as_bytes())?;
            output_file.write_all(component.component.as_bytes())?;
            output_file.write_all(b"\n</g>\n")?;
        }
    }

    output_file.write_all(b"</svg>")?;

    Ok(())
}
