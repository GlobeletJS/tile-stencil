export function getJSON(data) {
  switch (typeof data) {
    case "object":
      // data may be GeoJSON already. Confirm and return
      return (data !== null && data.type)
        ? Promise.resolve(data)
        : Promise.reject(data);

    case "string":
      // data must be a URL
      return (data.length)
        ? fetch(data).then(checkFetch)
        : Promise.reject("tile-stencil: getJSON called with empty string!");

    default:
      return Promise.reject(data);
  }
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
