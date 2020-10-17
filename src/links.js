import { derefLayers } from "./deref.js";
import { expandSpriteURLs, expandGlyphURL, expandTileURL } from "./mapbox.js";
import { getJSON, getImage } from "./read.js";

export function loadLinks(styleDoc, mapboxToken) {
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
    if (source.type === "geojson") {
      return getJSON(source.data).then(JSON => {
        source.data = JSON;
        return [key, source];
      });
    }

    // If no .url, return a shallow copy of the input. 
    // Note: some properties may still be pointing back to the original 
    // style document, like .vector_layers, .bounds, .center, .extent
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
