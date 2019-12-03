# tile-stencil

Load a Mapbox style document and parse it into Javascript functions

[Mapbox style documents] describe how a map should be drawn. The document
begins with input information, such as:
- [Data sources] to be used: tiles, GeoJSON, etc
- Where to get [sprites] -- small images used as labels

Then, it specifies a list of [layers], in the order in which they should be
drawn--layers further down the list are drawn on top of the earlier layers.
For each layer, the style document describes:
- Which data source to use
- A data filter, to select features from the source to draw in this layer
- What style properties (colors, line thicknesses, fonts, etc) to use when 
  drawing

The style properties (colors, etc) are specified as *functions*--i.e., they
can vary depending on the zoom level or some property of the feature.

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

## API
tileStencil exposes two methods: parseLayer and parseStyle

### parseLayer

#### Syntax
```javascript
const parsedLayer = parseLayer(layer);
```

#### Parameters
- `layer`: An element from the [layers] property of a Mapbox style document

#### Return value
A back link to the modified layer. (NOTE: the input layer is changed!)
The following properties
- `layer.filter` is replaced by a filter function, which can be used to filter
  features to the appropriate subset to be used in this layer, e.g.,
  `layerFeatures = features.filter(layer.filter);`
- `layer.layout` is replaced by a value getter dictionary
- `layer.paint` is replaced by a value getter dictionary

#### Structure of returned .layout and .paint objects
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

### parseStyle

#### Syntax
```javascript
const parsedStyle = parseStyle(styleDoc, mapboxToken);
```

#### Parameters
- `styleDoc`: A Mapbox Style document, OR a URL pointing to a style document
- `mapboxToken`: Your Mapbox API key (Optional). This is only needed if your
  style document includes references to Mapbox-hosted resources, such as
  TileJSON or sprite data.

#### Return value
A [Promise] that resolves to the modified style document.

When the promise resolves, the following changes will have been made to the 
input styleDoc:
- `styleDoc.sources`: If a source was specified as a URL pointing to a
  [TileJSON] document, the properties of that source will be augmented by
  properties retrieved from the linked document
- `styleDoc.spriteData`: This additional object contains the data pointed to
  by the URL in `styleDoc.sprite`. `.spriteData` has two properties:
  - `.spriteData.image`: A PNG image file containing the sprite data
  - `.spriteData.meta`: The JSON document containing the description of each
    image contained in the sprite
- `styleDoc.layers`: Each layer in the returned style document is parsed by
  `tileStencil.parseLayer`, as described above

[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[TileJSON]: https://github.com/mapbox/tilejson-spec

## Un-supported features
tile-painter does not implement the following features of the style
specification:
- [fill-extrusion layers](https://docs.mapbox.com/mapbox-gl-js/style-spec/#layers-fill-extrusion)
- [heatmap layers](https://docs.mapbox.com/mapbox-gl-js/style-spec/#layers-heatmap)
- [hillshade layers](https://docs.mapbox.com/mapbox-gl-js/style-spec/#layers-hillshade)
- [Zoom-and-property functions](https://docs.mapbox.com/mapbox-gl-js/style-spec/#types-function-zoom-property)
- [Expressions](https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions)

While expressions are not yet implemented, tile-painter *does* implement the
following older features:
- [functions](https://docs.mapbox.com/mapbox-gl-js/style-spec/#other-function)
  for describing the dependence of a style value on zoom level or feature
  properties. But note: zoom-and-property functions are not implemented!
- [filters](https://docs.mapbox.com/mapbox-gl-js/style-spec/#other-filter)
  for defining the subset of a source-layer's features to be used in the
  current layer
