import { derefLayers } from "./deref.js";
import { expandStyleURL, expandSpriteURLs, expandTileURL } from "./mapbox.js";
import { getJSON, getImage } from "./read.js";
import { buildFeatureFilter } from "./filter.js";
import { autoGetters } from "./style-func.js";
import { layoutDefaults, paintDefaults } from "./defaults.js";

export function parseLayer(inputLayer) {
  // Make a shallow copy of the layer, to leave the input unchanged
  const layer = Object.assign({}, inputLayer);

  // Replace filter and rendering properties with functions
  layer.filter = buildFeatureFilter(layer.filter);
  layer.layout = autoGetters(layer.layout, layoutDefaults[layer.type]);
  layer.paint  = autoGetters(layer.paint,  paintDefaults[layer.type] );

  return layer;
}

export function parseStyle(style, mapboxToken) {
  // Get a Promise that resolves to a raw Mapbox style document
  const getStyleJson = (typeof style === "object")
    ? Promise.resolve(style)                // style is JSON already
    : getJSON( expandStyleURL(style, mapboxToken) ); // Get from URL

  // Set up an asynchronous function to process the document
  function parseStyleJson(rawStyleDoc) {
    // Make a shallow copy of the document, to leave the input unchanged
    const styleDoc = Object.assign({}, rawStyleDoc);

    // Expand layer references, then parse
    styleDoc.layers = derefLayers(styleDoc.layers).map(parseLayer);

    // Get linked info for sources and sprites
    const sourcePromise = expandSources(styleDoc.sources, mapboxToken);
    const spritePromise = loadSprite(styleDoc.sprite, mapboxToken);

    return Promise.all([sourcePromise, spritePromise])
      .then( ([sources, spriteData]) => {
        styleDoc.sources = sources;
        styleDoc.spriteData = spriteData;
        return styleDoc;
      });
  }

  // Chain together and return
  return getStyleJson.then( parseStyleJson );
}

function expandSources(rawSources, token) {
  const expandPromises = Object.entries(rawSources).map(expandSource);

  function expandSource([key, rawSource]) {
    // Make a shallow copy of the input. Note: some properties may still be
    // pointing back to the original style document, like .vector_layers,
    // .bounds, .center, .extent
    const source = Object.assign({}, rawSource);

    if (source.url === undefined) return [key, source]; // No change

    // Load the referenced TileJSON document, and copy its values to source
    return getJSON( expandTileURL(source.url, token) )
      .then( tileJson => [key, Object.assign(source, tileJson)] );
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
