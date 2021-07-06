# tile-stencil

![tests](https://github.com/GlobeletJS/tile-stencil/actions/workflows/node.js.yml/badge.svg)

Load a MapLibre style document and parse it into Javascript functions

[MapLibre style documents][MapLibre style] describe how a map should be drawn. 
The document begins with input information, such as:
- [Data sources][] to be used (tiles, GeoJSON, etc.)
- Where to get [sprites][]  (small images used as labels)

Then, it specifies a list of [layers][layer], in the order in which they should be
drawn. Layers further down the list are drawn on top of the earlier layers.
For each layer, the style document describes:
- Which data source to use
- A data filter, to select features from the source to draw in this layer
- What style properties (colors, line thicknesses, fonts, etc) to use when 
  drawing

The style properties (colors, etc) are specified as *functions*&mdash;i.e., 
they can vary depending on the zoom level or some property of the feature.

tile-stencil reads the document, loads relevant data about the source, loads 
the sprite data, and parses the specified filters and property functions into 
Javascript functions that can be used by a renderer.

[MapLibre style]: https://maplibre.org/maplibre-gl-js-docs/style-spec/
[Data sources]: https://maplibre.org/maplibre-gl-js-docs/style-spec/sources/
[sprites]: https://maplibre.org/maplibre-gl-js-docs/style-spec/sprite/
[layer]: https://maplibre.org/maplibre-gl-js-docs/style-spec/layers/


## Installation
tile-stencil is provided as an ESM import.
```javascript
import * as tileStencil from 'tile-stencil';
```

tileStencil exposes three methods:
- getStyleFuncs
- loadStyle
- buildFeatureFilter

## getStyleFuncs

### Syntax
```javascript
const parsedLayer = tileStencil.getStyleFuncs(inputLayer);
```

### Parameters
- `layer`: An element from the [layers][] property of a MapLibre style document

### Return value
A copy of `inputLayer`, where the `.layout` and `.paint` properties have been
replaced by value getter dictionaries

### Structure of returned .layout and .paint objects
The returned objects can be used to retrieve style properties as follows
(where our example layer has `layer.type === "line"`):
```javascript
var lineColor = paint["line-color"](zoom, feature);
```
where `zoom` is the zoom level of the map being drawn, and `feature` is the
feature being drawn.

Some styles do not depend on feature properties, or even the zoom level.
Each `.layout` and `.paint` property function has a defined `.type`, e.g.,
```javascript
styleFunctionType = paint["style-property"].type;
```
where `.type` may take one of three values:
- `constant`: Defines a style property that does not vary
- `zoom`: Style value depends on the map zoom level
- `property`: Style value depends on feature properties

## loadStyle
Loads a style document and any linked information.

You can test this method live using the [validator example][validator].

[validator]: https://globeletjs.github.io/tile-stencil/examples/validator/index.html

### Syntax
```javascript
const loadedStyle = loadStyle(styleDoc, mapboxToken);
```

### Parameters
- `styleDoc`: A MapLibre Style document, OR a URL pointing to a style document
- `mapboxToken`: Your Mapbox API key (Optional). This is only needed if your
  style document includes references to Mapbox-hosted resources, such as
  TileJSON or sprite data.

### Return value
A [Promise] that resolves to a parsed style document.

The parsed document will have the following changes relative to the input:
- `styleDoc.sources`: If a source was specified as a URL pointing to a
  [TileJSON][] document, the properties of that source will be augmented by
  properties retrieved from the linked document
- `styleDoc.spriteData`: This additional object contains the data pointed to
  by the URL in `styleDoc.sprite`. `.spriteData` has two properties:
  - `.spriteData.image`: A PNG image file containing the sprite data
  - `.spriteData.meta`: The JSON document containing the description of each
    image contained in the sprite
- `styleDoc.layers`: Some MapLibre styles have non-standard layers that do not 
  list all of the required properties, but rather 'reference' these properties
  from another layer. The layers in the parsed document will have these
  references resolved, so that the returned document is standards-compliant. 

## buildFeatureFilter
Converts the filter description from a [MapLibre layer][layer] into a 
JavaScript function for filtering GeoJSON features.

The returned function can be used to filter features to the appropriate subset
to be used in rendering this layer, e.g.,
```javascript
const parsedFilter = buildFeatureFilter(layer.filter);
layerFeatures = features.filter(parsedFilter);
```

Note: the supplied filter description MUST follow the 
[deprecated syntax][filter]!

[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[TileJSON]: https://github.com/mapbox/tilejson-spec

## Un-supported features
tile-stencil does not implement the following features of the style
specification:
- Image or video sources
- [Zoom-and-property functions](https://maplibre.org/maplibre-gl-js-docs/style-spec/other/#types-function-zoom-property)
- [Expressions](https://maplibre.org/maplibre-gl-js-docs/style-spec/expressions/)

While expressions are not yet implemented, tile-stencil *does* implement the
following older features:
- [functions](https://maplibre.org/maplibre-gl-js-docs/style-spec/other/#function)
  for describing the dependence of a style value on zoom level or feature
  properties. But note: zoom-and-property functions are not implemented!
- [filters][filter] for defining the subset of a source-layer's features to be 
  used in the current layer

[filter]: https://maplibre.org/maplibre-gl-js-docs/style-spec/other/#other-filter
