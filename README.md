# tile-stencil

Load a Mapbox style document and parse it into Javascript functions

[Mapbox style documents] describe how a map should be drawn. The document
begins with input information, such as:
- [Data sources] to be used (tiles, GeoJSON, etc.)
- Where to get [sprites]  (small images used as labels)

Then, it specifies a list of [layers], in the order in which they should be
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

[Mapbox style documents]: https://docs.mapbox.com/mapbox-gl-js/style-spec/
[Data sources]: https://docs.mapbox.com/mapbox-gl-js/style-spec/#sources
[sprites]: https://docs.mapbox.com/mapbox-gl-js/style-spec/#sprite
[layers]: https://docs.mapbox.com/mapbox-gl-js/style-spec/#layers


## Installation
tile-stencil is provided as an ESM import.
```javascript
import * as tileStencil from 'tile-stencil';
```

tileStencil exposes four methods:
- getStyleFuncs
- parseLayer
- loadStyle
- parseStyle

## getStyleFuncs

### Syntax
```javascript
const parsedLayer = tileStencil.getStyleFuncs(inputLayer);
```

### Parameters
- `layer`: An element from the [layers] property of a Mapbox style document

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

## parseLayer
Like getStyleFuncs, but also parses the input layer's `.filter` property.

The `.filter` property on the returned object can be used to filter features
to the appropriate subset to be used in rendering this layer, e.g.,
```javascript
layerFeatures = features.filter(parsedLayer.filter);
```

## loadStyle
Loads a style document and any linked information

### Syntax
```javascript
const loadedStyle = loadStyle(styleDoc, mapboxToken);
```

### Parameters
- `styleDoc`: A Mapbox Style document, OR a URL pointing to a style document
- `mapboxToken`: Your Mapbox API key (Optional). This is only needed if your
  style document includes references to Mapbox-hosted resources, such as
  TileJSON or sprite data.

### Return value
A [Promise] that resolves to a parsed style document.

The parsed document will have the following changes relative to the input:
- `styleDoc.sources`: If a source was specified as a URL pointing to a
  [TileJSON] document, the properties of that source will be augmented by
  properties retrieved from the linked document
- `styleDoc.spriteData`: This additional object contains the data pointed to
  by the URL in `styleDoc.sprite`. `.spriteData` has two properties:
  - `.spriteData.image`: A PNG image file containing the sprite data
  - `.spriteData.meta`: The JSON document containing the description of each
    image contained in the sprite
- `styleDoc.layers`: Some Mapbox styles have non-standard layers that do not 
  list all of the required properties, but rather 'reference' these properties
  from another layer. The layers in the parsed document will have these
  references resolved, so that the returned document is standards-compliant. 

## parseStyle
Like loadStyle, but each layer in the returned document is processed through
parseLayer.

[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[TileJSON]: https://github.com/mapbox/tilejson-spec

## Un-supported features
tile-stencil does not implement the following features of the style
specification:
- GeoJSON, image, or video sources
- [Zoom-and-property functions](https://docs.mapbox.com/mapbox-gl-js/style-spec/#types-function-zoom-property)
- [Expressions](https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions)

While expressions are not yet implemented, tile-stencil *does* implement the
following older features:
- [functions](https://docs.mapbox.com/mapbox-gl-js/style-spec/#other-function)
  for describing the dependence of a style value on zoom level or feature
  properties. But note: zoom-and-property functions are not implemented!
- [filters](https://docs.mapbox.com/mapbox-gl-js/style-spec/#other-filter)
  for defining the subset of a source-layer's features to be used in the
  current layer
