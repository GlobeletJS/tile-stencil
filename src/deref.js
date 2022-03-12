const refProperties = ["type", "minzoom", "maxzoom",
  "source", "source-layer", "filter", "layout"];

export function derefLayers(layers) {
  // Some layers in Mapbox styles contain a non-standard "ref" property,
  // pointing to the "id" of another layer.
  // Augment these layers with properties from the referenced layer

  const map = layers.reduce((m, l) => (m[l.id] = l, m), {});
  return layers.map(l => ("ref" in l) ? deref(l, map[l.ref]) : l);
}

function deref(layer, parent) {
  const result = Object.assign({}, layer);
  delete result.ref;

  refProperties.forEach(k => {
    if (k in parent) result[k] = parent[k];
  });

  return result;
}
