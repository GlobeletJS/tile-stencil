export function expandStyleURL(url, token) {
  const prefix = /^mapbox:\/\/styles\//;
  if (!url.match(prefix)) return url;
  const apiRoot = "https://api.mapbox.com/styles/v1/";
  return url.replace(prefix, apiRoot) + "?access_token=" + token;
}

export function expandSpriteURLs(url, pixRatio, token) {
  // Returns an array containing urls to .png and .json files
  const ratio = Math.floor(Math.min(Math.max(1.0, pixRatio), 4.0));
  const ratioStr = (ratio > 1)
    ? "@" + ratio + "x"
    : "";

  const prefix = /^mapbox:\/\/sprites\//;
  if (!url.match(prefix)) return {
    image: url + ratioStr + ".png",
    meta: url + ratioStr + ".json",
  };

  // We have a Mapbox custom url. Expand to an absolute URL, as per the spec
  const apiRoot = "https://api.mapbox.com/styles/v1/";
  url = url.replace(prefix, apiRoot) + "/sprite";
  const tokenString = "?access_token=" + token;
  return {
    image: url + ratioStr + ".png" + tokenString,
    meta: url + ratioStr + ".json" + tokenString,
  };
}

export function expandTileURL(url, token) {
  const prefix = /^mapbox:\/\//;
  if (!url.match(prefix)) return url;
  const apiRoot = "https://api.mapbox.com/v4/";
  return url.replace(prefix, apiRoot) + ".json?secure&access_token=" + token;
}

export function expandGlyphURL(url, token) {
  const prefix = /^mapbox:\/\/fonts\//;
  if (!url.match(prefix)) return url;
  const apiRoot = "https://api.mapbox.com/fonts/v1/";
  return url.replace(prefix, apiRoot) + "?access_token=" + token;
}
