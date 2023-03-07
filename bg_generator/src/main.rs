#[macro_use]
extern crate clap;
#[macro_use]
extern crate lazy_static;
#[macro_use]
extern crate thiserror;

mod defs;
use defs::{ Definition, DefsError };
mod generator;

fn main() {
    let matches = clap_app!(app => 
        (version: "1.0")
        (author: "Daniel")
        (about: "generate random scatter svg backgrounds")
        (@arg defs: -d --defs +takes_value +required "Set the defs file")
        (@arg input: +required "Set the output file name")
    ).get_matches();

    let defs_filepath = matches.value_of("defs").unwrap_or("defs.json");
    let output_filepath = matches.value_of("input").unwrap_or("test.svg");

    match exec(&defs_filepath, &output_filepath) {
        Ok(_) => std::process::exit(0),
        Err(e) => {
            println!("{}", e);
            std::process::exit(1);
        },
    };
}

fn exec(defs_filepath:&str, output_filepath:&str) -> Result<(), DefsError> {
    let defs = Definition::from_file(defs_filepath)?;
    generator::generate(&defs, output_filepath)?;

    Ok(())
}
