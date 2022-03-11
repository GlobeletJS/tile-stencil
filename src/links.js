import { derefLayers } from "./deref.js";
import { expandSpriteURLs, expandGlyphURL, expandTileURL } from "./mapbox.js";
import { getGeoJSON, getJSON, getImage, warn } from "./read.js";

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

    return infoPromise.then(
      val => ({ [key]: Object.assign({}, source, val, { type }) }),
      err => (warn("sources." + key + ": " + err.message), ({}))
    );
  }

  return Promise.all(expandPromises).then(results => {
    return results.reduce((a, c) => Object.assign(a, c), {});
  });
}

function loadSprite(sprite, token) {
  if (!sprite) return;

  const notWorker = (window && window.devicePixelRatio);
  const pixRatio = (notWorker) ? window.devicePixelRatio : 1.0;
  const urls = expandSpriteURLs(sprite, pixRatio, token);

  return Promise.all([getImage(urls.image), getJSON(urls.meta)]).then(
    ([image, meta]) => ({ image, meta }),
    err => warn("sprite: " + err.message)
  );
}
