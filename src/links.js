import { derefLayers } from "./deref.js";
import { expandSpriteURLs, expandGlyphURL, expandTileURL } from "./mapbox.js";
import { getGeoJSON, getJSON, getImage } from "./read.js";

export function loadLinks(styleDoc, mapboxToken) {
  const { sources: rawSources, glyphs, sprite, layers } = styleDoc;

  styleDoc.layers = derefLayers(layers);
  if (glyphs) {
    styleDoc.glyphs = expandGlyphURL(glyphs, mapboxToken);
  }

  return Promise.all([
    expandSources(rawSources, mapboxToken),
    loadSprite(sprite, mapboxToken),
  ]).then(([sources, spriteData]) => {
    return Object.assign(styleDoc, { sources, spriteData });
  });
}

function expandSources(rawSources, token) {
  const expandPromises = Object.entries(rawSources).map(expandSource);

  function expandSource([key, source]) {
    const { type, url } = source;

    const infoPromise =
      (type === "geojson") ? getGeoJSON(source.data).then(data => ({ data })) :
      (url) ? getJSON(expandTileURL(url, token)) : // Get linked TileJSON
      Promise.resolve({}); // No linked info

    return infoPromise.then(info => {
      // Assign everything to a new object for return.
      // Note: shallow copy! Some properties may point back to the original
      // style document, like .vector_layers, .bounds, .center, .extent
      const updatedSource = Object.assign({}, source, info, { type });
      return { [key]: updatedSource };
    });
  }

  return Promise.allSettled(expandPromises)
    .then(results => results.reduce(processResult, {}));

  function processResult(sources, result) {
    if (result.status === "fulfilled") {
      return Object.assign(sources, result.value);
    } else {
      // If one source fails to load, just log the reason and move on
      warn("Error loading sources: " + result.reason.message);
      return sources;
    }
  }
}

function loadSprite(sprite, token) {
  if (!sprite) return;

  const pixRatio = window?.devicePixelRatio || 1.0;
  const urls = expandSpriteURLs(sprite, pixRatio, token);

  return Promise.all([getImage(urls.image), getJSON(urls.meta)])
    .then( ([image, meta]) => ({ image, meta }) )
    .catch(err => {
      // If sprite doesn't load, just log the error and move on
      warn("Error loading sprite: " + err.message);
    });
}

function warn(message) {
  console.log("tile-stencil had a problem loading part of the style document");
  console.log("  " + message);
  console.log("  Not a fatal error. Proceeding with the rest of the style...");
}
