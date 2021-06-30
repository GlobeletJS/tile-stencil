export function getGeoJSON(data) {
  const dataPromise = (typeof data === "object" && data !== null)
    ? Promise.resolve(data)
    : getJSON(data); // data may be a URL. Try loading it

  return dataPromise.then(json => {
    // Is it valid GeoJSON? For now, just check for a .type property
    return (data.type)
      ? data
      : Promise.reject("invalid GeoJSON: " + JSON.stringify(json));
  });
}

export function getJSON(href) {
  return (typeof href === "string" && href.length)
    ? fetch(href).then(checkFetch)
    : Promise.reject("invalid URL: " + JSON.stringify(href));
}

function checkFetch(response) {
  if (!response.ok) {
    const err = ["HTTP", response.status, response.statusText].join(" ");
    return Promise.reject(err);
  }

  return response.json();
}

export function getImage(href) {
  const errMsg = "ERROR in getImage for href " + href;
  const img = new Image();

  return new Promise( (resolve, reject) => {
    img.onerror = () => reject(errMsg);

    img.onload = () => (img.complete && img.naturalWidth !== 0)
        ? resolve(img)
        : reject(errMsg);

    img.crossOrigin = "anonymous";
    img.src = href;
  });
}
