use regex::Regex;
use serde::{ Deserialize, Serialize };
use std::fs::File;
use std::io::{ BufReader, Read };
use std::path::Path;

lazy_static! {
    static ref GROUP_RE:Regex = Regex::new(r"<g[^>]*>([\s\S]*)</g>").unwrap();
}

#[derive(Debug, Error)]
pub enum DefsError {
    #[error("{0}")]
    IO(#[from] std::io::Error),
    #[error("{0}")]
    Serde(#[from] serde_json::Error),
    #[error("Supplied component file does not contain a group")]
    MissingGroup,
}

#[derive(Debug, Copy, Clone, Deserialize, Serialize)]
pub struct Distribution {
    pub lowest: f64,
    pub mean: f64,
    pub highest: f64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RawComponent {
    path: String,
    density: f64,
    scale: Distribution,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RawDefinition {
    width: u64,
    height: u64,
    background_colour: String,
    bodies: u64,
    margin: f64,
    components: Vec<RawComponent>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Component {
    pub component: String,
    pub density: f64,
    pub scale: Distribution,
}
impl Component {
    fn get_group<'a>(raw:&'a str) -> Option<&'a str> {
        let caps = GROUP_RE.captures(raw)?;
        Some(caps.get(1)?.as_str().trim())
    }

    pub fn from_raw(raw:&RawComponent) -> Result<Self, DefsError> {
        let mut component_file = File::open(Path::new(&raw.path))?;
        let mut component_string = String::new();
        component_file.read_to_string(&mut component_string)?;

        let component = Self::get_group(&component_string).ok_or(DefsError::MissingGroup)?.to_string();

        Ok(Self {
            component,
            density: raw.density,
            scale: raw.scale,
        })
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Definition {
    pub width: u64,
    pub height: u64,
    pub bodies: u64,
    pub margin: f64,
    pub background_colour: String,
    pub components: Vec<Component>,
}
impl Definition {
    pub fn from_file(filename:&str) -> Result<Self, DefsError> {
        let defs_file = File::open(Path::new(filename))?;
        let defs:RawDefinition = serde_json::from_reader(BufReader::new(defs_file))?;

        let components = defs.components
            .iter()
            .map(|r| Component::from_raw(r))
            .collect::<Result<Vec<Component>, DefsError>>()?;

        Ok(Self {
            width: defs.width,
            height: defs.height,
            bodies: defs.bodies,
            margin: defs.margin,
            background_colour: defs.background_colour,
            components,
        })
    }
}

