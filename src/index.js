import { derefLayers } from "./deref.js";
import { expandStyleURL, expandSpriteURLs, expandGlyphURL, expandTileURL } from "./mapbox.js";
import { getJSON, getImage } from "./read.js";
import { buildFeatureFilter } from "./filter.js";
import { autoGetters } from "./style-func.js";
import { layoutDefaults, paintDefaults } from "./defaults.js";

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
    .then( styleDoc => expandLinks(styleDoc, mapboxToken) );
}

export function parseStyle(style, mapboxToken) {
  // Like loadStyle, but also parses layers. DEPRECATED

  const getStyleJson = (typeof style === "object")
    ? Promise.resolve(style)                // style is JSON already
    : getJSON( expandStyleURL(style, mapboxToken) ); // Get from URL

  return getStyleJson
    .then( rawStyle => Object.assign({}, rawStyle) ) // Leave input unchanged
    .then( styleDoc => expandLinks(styleDoc, mapboxToken) )
    .then( style => { style.layers = style.layers.map(parseLayer); } );
}

function expandLinks(styleDoc, mapboxToken) {
  styleDoc.layers = derefLayers(styleDoc.layers);
  if (styleDoc.glyphs) {
    styleDoc.glyphs = expandGlyphURL(styleDoc.glyphs, mapboxToken);
  }

  return Promise.all([
    expandSources(styleDoc.sources, mapboxToken),
    loadSprite(styleDoc.sprite, mapboxToken),
  ]).then( ([sources, spriteData]) => {
    styleDoc.sources = sources;
    styleDoc.spriteData = spriteData;
    return styleDoc;
  });
}

function expandSources(rawSources, token) {
  const expandPromises = Object.entries(rawSources).map(expandSource);

  function expandSource([key, source]) {
    // If no .url, return a shallow copy of the input. 
    // Note: some properties may still be pointing back to the original 
    // style document, like .vector_layers, .bounds, .center, .extent
    if (source.type === "geojson") return getJSON(source.data).then(JSON => [key,Object.assign(JSON, source)]);
    if (source.url === undefined) return [key, Object.assign({}, source)];

    // Load the referenced TileJSON document, add any values from source
    return getJSON( expandTileURL(source.url, token) )
      .then( tileJson => [key, Object.assign(tileJson, source)] );
  }

  function combineSources(keySourcePairs) {
    const sources = {};
    keySourcePairs.forEach( ([key, val]) => { sources[key] = val; } );
    return sources;
  }

  return Promise.all( expandPromises ).then( combineSources );
}

function loadSprite(sprite, token) {
  if (!sprite) return;

  const urls = expandSpriteURLs(sprite, token);

  return Promise.all([getImage(urls.image), getJSON(urls.meta)])
    .then( ([image, meta]) => ({ image, meta }) );
}
