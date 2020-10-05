export function getJSON(data) {
  switch (typeof data) {
    case "object":
      // data may be GeoJSON already. Confirm and return
      return (data !== null && data.type)
        ? Promise.resolve(data)
        : Promise.reject(data);

    case "string":
      // data must be a URL
      return fetch(data).then(response => {
        return (response.ok)
          ? response.json()
          : Promise.reject(response);
      });

    default:
      return Promise.reject(data);
  }
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
