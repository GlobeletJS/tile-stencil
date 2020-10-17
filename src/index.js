import { expandStyleURL } from "./mapbox.js";
import { getJSON } from "./read.js";
import { buildFeatureFilter } from "./filter.js";
import { autoGetters } from "./style-func.js";
import { layoutDefaults, paintDefaults } from "./defaults.js";
import { loadLinks } from "./links.js";

export function getStyleFuncs(inputLayer) {
  const layer = Object.assign({}, inputLayer); // Leave input unchanged

  // Replace rendering properties with functions
  layer.layout = autoGetters(layer.layout, layoutDefaults[layer.type]);
  layer.paint  = autoGetters(layer.paint,  paintDefaults[layer.type] );

  return layer;
}

export function parseLayer(inputLayer) {
  // Like getStyleFuncs, but also parses the filter. DEPRECATED
  const layer = Object.assign({}, inputLayer); // Leave input unchanged

  layer.layout = autoGetters(layer.layout, layoutDefaults[layer.type]);
  layer.paint  = autoGetters(layer.paint,  paintDefaults[layer.type] );
  layer.filter = buildFeatureFilter(layer.filter);

  return layer;
}

export function loadStyle(style, mapboxToken) {
  // Loads a style document and any linked information

  const getStyle = (typeof style === "object")
    ? Promise.resolve(style)                // style is JSON already
    : getJSON( expandStyleURL(style, mapboxToken) ); // Get from URL

  return getStyle
    .then( styleDoc => loadLinks(styleDoc, mapboxToken) );
}

export function parseStyle(style, mapboxToken) {
  // Like loadStyle, but also parses layers. DEPRECATED

  const getStyleJson = (typeof style === "object")
    ? Promise.resolve(style)                // style is JSON already
    : getJSON( expandStyleURL(style, mapboxToken) ); // Get from URL

  return getStyleJson
    .then( rawStyle => Object.assign({}, rawStyle) ) // Leave input unchanged
    .then( styleDoc => loadLinks(styleDoc, mapboxToken) )
    .then( style => { style.layers = style.layers.map(parseLayer); } );
}
