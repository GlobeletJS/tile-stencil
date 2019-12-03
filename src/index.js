import { expandLayerReferences } from "./deref.js";
import { expandStyleURL, expandSpriteURLs, expandTileURL } from "./mapbox.js";
import { getJSON, getImage } from "./read.js";
import { buildFeatureFilter } from "./filter.js";
import { autoGetters } from "./style-func.js";
import { layoutDefaults, paintDefaults } from "./defaults.js";

export function parseLayer(layer) {
  // NOTE: modifies input layer!
  layer.filter = buildFeatureFilter(layer.filter);
  layer.layout = autoGetters(layer.layout, layoutDefaults(layer.type));
  layer.paint  = autoGetters(layer.paint,  paintDefaults(layer.type) );
  return layer;
}

export function parseStyle(style, mapboxToken) {
  // Get a Promise that resolves to a Mapbox style document
  const getStyleJson = (typeof style === "object")
    ? Promise.resolve(style)                // style is JSON already
    : getJSON( expandStyleURL(style, mapboxToken) ); // Get from URL

  // Now set up a Promise chain to process the document
  return getStyleJson
    .then( expandLayerReferences )

    .then( retrieveSourceInfo )

    .then( parseLayers );

  // Gets data from referenced URLs, and attaches it to the style
  function retrieveSourceInfo(styleDoc) {
    const getSprite = loadSprite(styleDoc, mapboxToken);

    const expandSources = Object.keys(styleDoc.sources)
      .map(key => expandSource(key, styleDoc.sources, mapboxToken));

    return Promise.all([...expandSources, getSprite])
      .then(() => styleDoc);
  }
}

function parseLayers(styleDoc) {
  styleDoc.layers.forEach(parseLayer);
  return styleDoc;
}

function loadSprite(styleDoc, token) {
  if (!styleDoc.sprite) return;

  const urls = expandSpriteURLs(styleDoc.sprite, token);

  return Promise.all([getImage(urls.image), getJSON(urls.meta)])
    .then(([image, meta]) => { styleDoc.spriteData = { image, meta }; });
}

function expandSource(key, sources, token) {
  var source = sources[key];
  if (source.url === undefined) return; // No change

  // Load the referenced TileJSON document
  return getJSON( expandTileURL(source.url, token) )
    .then(json => merge(json));

  function merge(json) {
    // Add any custom properties from the style document
    Object.keys(source).forEach( k2 => { json[k2] = source[k2]; } );
    // Replace current entry with the TileJSON data
    sources[key] = json;
  }
}
