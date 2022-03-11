export function getGeoJSON(data) {
  const dataPromise = (typeof data === "object" && data !== null)
    ? Promise.resolve(data)
    : getJSON(data); // data may be a URL. Try loading it

  return dataPromise.then(json => {
    // Is it valid GeoJSON? For now, just check for a .type property
    return (json.type)
      ? json
      : Promise.reject(Error("invalid GeoJSON: " + JSON.stringify(json)));
  });
}

export function getJSON(href) {
  return (typeof href === "string" && href.length)
    ? fetch(href).then(checkFetch)
    : Promise.reject(Error("invalid URL: " + JSON.stringify(href)));
}

function checkFetch(response) {
  if (!response.ok) {
    const { status, statusText, url } = response;
    const message = `HTTP ${status} ${statusText} for URL ${url}`;
    return Promise.reject(Error(message));
  }

  return response.json();
}

export function getImage(href) {
  const img = new Image();

  return new Promise( (resolve, reject) => {
    img.onerror = () => reject(Error("Failed to retrieve image from " + href));

    img.onload = () => (img.complete && img.naturalWidth !== 0)
      ? resolve(img)
      : reject(Error("Incomplete image received from " + href));

    img.crossOrigin = "anonymous";
    img.src = href;
  });
}

export function warn(message) {
  console.log("tile-stencil had a problem loading part of the style document");
  console.log("  " + message);
  console.log("  Not a fatal error. Proceeding with the rest of the style...");
}
