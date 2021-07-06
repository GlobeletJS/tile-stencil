import { expandStyleURL } from "./mapbox.js";
import { getJSON } from "./read.js";
import { autoGetters } from "./style-func.js";
import { layoutDefaults, paintDefaults } from "./defaults.js";
import { loadLinks } from "./links.js";

export { buildFeatureFilter } from "./filter.js";

export function getStyleFuncs(inputLayer) {
  const layer = Object.assign({}, inputLayer); // Leave input unchanged

  // Replace rendering properties with functions
  layer.layout = autoGetters(layer.layout, layoutDefaults[layer.type]);
  layer.paint  = autoGetters(layer.paint,  paintDefaults[layer.type] );

  return layer;
}

export function loadStyle(style, mapboxToken) {
  // Loads a style document and any linked information

  const getStyle = (typeof style === "object")
    ? Promise.resolve(style)                // style is JSON already
    : getJSON( expandStyleURL(style, mapboxToken) ); // Get from URL

  return getStyle.then(checkStyle)
    .then( styleDoc => loadLinks(styleDoc, mapboxToken) );
}

function checkStyle(doc) {
  const { version, sources, layers } = doc;

  const noSource =
    typeof sources !== "object" ||
    sources === null ||
    Array.isArray(sources);

  const error =
    noSource ? "missing sources object" :
    (!Array.isArray(layers)) ? "missing layers array" :
    (version !== 8) ? "unsupported version number" :
    null;

  return (error) ? Promise.reject(error) : doc;
}
