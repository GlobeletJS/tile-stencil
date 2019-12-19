// From mapbox-gl-js, style-spec/deref.js
const refProperties = [
  'type', 
  'source', 
  'source-layer', 
  'minzoom', 
  'maxzoom', 
  'filter', 
  'layout'
];

/**
 * Given an array of layers, some of which may contain `ref` properties
 * whose value is the `id` of another property, return a new array where
 * such layers have been augmented with the 'type', 'source', etc. properties
 * from the parent layer, and the `ref` property has been removed.
 *
 * The input is not modified. The output may contain references to portions
 * of the input.
 */
function derefLayers(layers) {
  layers = layers.slice(); // ??? What are we trying to achieve here?

  const map = Object.create(null); // stackoverflow.com/a/21079232/10082269
  layers.forEach( layer => { map[layer.id] = layer; } );

  for (let i = 0; i < layers.length; i++) {
    if ('ref' in layers[i]) {
      layers[i] = deref(layers[i], map[layers[i].ref]);
    }
  }

  return layers;
}

function deref(layer, parent) {
  const result = {};

  for (const k in layer) {
    if (k !== 'ref') {
      result[k] = layer[k];
    }
  }

  refProperties.forEach((k) => {
    if (k in parent) {
      result[k] = parent[k];
    }
  });

  return result;
}

function expandStyleURL(url, token) {
  var prefix = /^mapbox:\/\/styles\//;
  if ( !url.match(prefix) ) return url;
  var apiRoot = "https://api.mapbox.com/styles/v1/";
  return url.replace(prefix, apiRoot) + "?access_token=" + token;
}

function expandSpriteURLs(url, token) {
  // Returns an array containing urls to .png and .json files
  var prefix = /^mapbox:\/\/sprites\//;
  if ( !url.match(prefix) ) return {
    image: url + ".png", 
    meta: url + ".json",
  };

  // We have a Mapbox custom url. Expand to an absolute URL, as per the spec
  var apiRoot = "https://api.mapbox.com/styles/v1/";
  url = url.replace(prefix, apiRoot) + "/sprite";
  var tokenString = "?access_token=" + token;
  return {
    image: url + ".png" + tokenString, 
    meta: url + ".json" + tokenString,
  };
}

function expandTileURL(url, token) {
  var prefix = /^mapbox:\/\//;
  if ( !url.match(prefix) ) return url;
  var apiRoot = "https://api.mapbox.com/v4/";
  return url.replace(prefix, apiRoot) + ".json?secure&access_token=" + token;
}

function getJSON(dataHref) {
  // Wrap the fetch API to force a rejected promise if response is not OK
  const checkResponse = (response) => (response.ok)
    ? response.json()
    : Promise.reject(response); // Can check .status on returned response

  return fetch(dataHref).then(checkResponse);
}

function getImage(href) {
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

function buildFeatureFilter(filterObj) {
  // filterObj is a filter definition following the "deprecated" syntax:
  // https://docs.mapbox.com/mapbox-gl-js/style-spec/#other-filter
  if (!filterObj) return () => true;

  var type, key, vals;

  // If this is a combined filter, the vals are themselves filter definitions
  [type, ...vals] = filterObj;
  switch (type) {
    case "all": {
      let filters = vals.map(buildFeatureFilter);  // Iteratively recursive!
      return (d) => filters.every( filt => filt(d) );
    }
    case "any": {
      let filters = vals.map(buildFeatureFilter);
      return (d) => filters.some( filt => filt(d) );
    }
    case "none": {
      let filters = vals.map(buildFeatureFilter);
      return (d) => filters.every( filt => !filt(d) );
    }
  }

  [type, key, ...vals] = filterObj;
  var getVal = initFeatureValGetter(key);

  switch (type) {
    // Existential Filters
    case "has": 
      return d => !!getVal(d); // !! forces a Boolean return
    case "!has": 
      return d => !getVal(d);

    // Comparison Filters
    case "==": 
      return d => getVal(d) === vals[0];
    case "!=":
      return d => getVal(d) !== vals[0];
    case ">":
      return d => getVal(d) > vals[0];
    case ">=":
      return d => getVal(d) >= vals[0];
    case "<":
      return d => getVal(d) < vals[0];
    case "<=":
      return d => getVal(d) <= vals[0];

    // Set Membership Filters
    case "in" :
      return d => vals.includes( getVal(d) );
    case "!in" :
      return d => !vals.includes( getVal(d) );
    default:
      console.log("prepFilter: unknown filter type = " + filterObj[0]);
  }
  // No recognizable filter criteria. Return a filter that is always true
  return () => true;
}

function initFeatureValGetter(key) {
  switch (key) {
    case "$type":
      // NOTE: data includes MultiLineString, MultiPolygon, etc-NOT IN SPEC
      return f => {
        let t = f.geometry.type;
        if (t === "MultiPoint") return "Point";
        if (t === "MultiLineString") return "LineString";
        if (t === "MultiPolygon") return "Polygon";
        return t;
      };
    case "$id":
      return f => f.id;
    default:
      return f => f.properties[key];
  }
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var csscolorparser = createCommonjsModule(function (module, exports) {
// (c) Dean McNamee <dean@gmail.com>, 2012.
//
// https://github.com/deanm/css-color-parser-js
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// http://www.w3.org/TR/css3-color/
var kCSSColorTable = {
  "transparent": [0,0,0,0], "aliceblue": [240,248,255,1],
  "antiquewhite": [250,235,215,1], "aqua": [0,255,255,1],
  "aquamarine": [127,255,212,1], "azure": [240,255,255,1],
  "beige": [245,245,220,1], "bisque": [255,228,196,1],
  "black": [0,0,0,1], "blanchedalmond": [255,235,205,1],
  "blue": [0,0,255,1], "blueviolet": [138,43,226,1],
  "brown": [165,42,42,1], "burlywood": [222,184,135,1],
  "cadetblue": [95,158,160,1], "chartreuse": [127,255,0,1],
  "chocolate": [210,105,30,1], "coral": [255,127,80,1],
  "cornflowerblue": [100,149,237,1], "cornsilk": [255,248,220,1],
  "crimson": [220,20,60,1], "cyan": [0,255,255,1],
  "darkblue": [0,0,139,1], "darkcyan": [0,139,139,1],
  "darkgoldenrod": [184,134,11,1], "darkgray": [169,169,169,1],
  "darkgreen": [0,100,0,1], "darkgrey": [169,169,169,1],
  "darkkhaki": [189,183,107,1], "darkmagenta": [139,0,139,1],
  "darkolivegreen": [85,107,47,1], "darkorange": [255,140,0,1],
  "darkorchid": [153,50,204,1], "darkred": [139,0,0,1],
  "darksalmon": [233,150,122,1], "darkseagreen": [143,188,143,1],
  "darkslateblue": [72,61,139,1], "darkslategray": [47,79,79,1],
  "darkslategrey": [47,79,79,1], "darkturquoise": [0,206,209,1],
  "darkviolet": [148,0,211,1], "deeppink": [255,20,147,1],
  "deepskyblue": [0,191,255,1], "dimgray": [105,105,105,1],
  "dimgrey": [105,105,105,1], "dodgerblue": [30,144,255,1],
  "firebrick": [178,34,34,1], "floralwhite": [255,250,240,1],
  "forestgreen": [34,139,34,1], "fuchsia": [255,0,255,1],
  "gainsboro": [220,220,220,1], "ghostwhite": [248,248,255,1],
  "gold": [255,215,0,1], "goldenrod": [218,165,32,1],
  "gray": [128,128,128,1], "green": [0,128,0,1],
  "greenyellow": [173,255,47,1], "grey": [128,128,128,1],
  "honeydew": [240,255,240,1], "hotpink": [255,105,180,1],
  "indianred": [205,92,92,1], "indigo": [75,0,130,1],
  "ivory": [255,255,240,1], "khaki": [240,230,140,1],
  "lavender": [230,230,250,1], "lavenderblush": [255,240,245,1],
  "lawngreen": [124,252,0,1], "lemonchiffon": [255,250,205,1],
  "lightblue": [173,216,230,1], "lightcoral": [240,128,128,1],
  "lightcyan": [224,255,255,1], "lightgoldenrodyellow": [250,250,210,1],
  "lightgray": [211,211,211,1], "lightgreen": [144,238,144,1],
  "lightgrey": [211,211,211,1], "lightpink": [255,182,193,1],
  "lightsalmon": [255,160,122,1], "lightseagreen": [32,178,170,1],
  "lightskyblue": [135,206,250,1], "lightslategray": [119,136,153,1],
  "lightslategrey": [119,136,153,1], "lightsteelblue": [176,196,222,1],
  "lightyellow": [255,255,224,1], "lime": [0,255,0,1],
  "limegreen": [50,205,50,1], "linen": [250,240,230,1],
  "magenta": [255,0,255,1], "maroon": [128,0,0,1],
  "mediumaquamarine": [102,205,170,1], "mediumblue": [0,0,205,1],
  "mediumorchid": [186,85,211,1], "mediumpurple": [147,112,219,1],
  "mediumseagreen": [60,179,113,1], "mediumslateblue": [123,104,238,1],
  "mediumspringgreen": [0,250,154,1], "mediumturquoise": [72,209,204,1],
  "mediumvioletred": [199,21,133,1], "midnightblue": [25,25,112,1],
  "mintcream": [245,255,250,1], "mistyrose": [255,228,225,1],
  "moccasin": [255,228,181,1], "navajowhite": [255,222,173,1],
  "navy": [0,0,128,1], "oldlace": [253,245,230,1],
  "olive": [128,128,0,1], "olivedrab": [107,142,35,1],
  "orange": [255,165,0,1], "orangered": [255,69,0,1],
  "orchid": [218,112,214,1], "palegoldenrod": [238,232,170,1],
  "palegreen": [152,251,152,1], "paleturquoise": [175,238,238,1],
  "palevioletred": [219,112,147,1], "papayawhip": [255,239,213,1],
  "peachpuff": [255,218,185,1], "peru": [205,133,63,1],
  "pink": [255,192,203,1], "plum": [221,160,221,1],
  "powderblue": [176,224,230,1], "purple": [128,0,128,1],
  "rebeccapurple": [102,51,153,1],
  "red": [255,0,0,1], "rosybrown": [188,143,143,1],
  "royalblue": [65,105,225,1], "saddlebrown": [139,69,19,1],
  "salmon": [250,128,114,1], "sandybrown": [244,164,96,1],
  "seagreen": [46,139,87,1], "seashell": [255,245,238,1],
  "sienna": [160,82,45,1], "silver": [192,192,192,1],
  "skyblue": [135,206,235,1], "slateblue": [106,90,205,1],
  "slategray": [112,128,144,1], "slategrey": [112,128,144,1],
  "snow": [255,250,250,1], "springgreen": [0,255,127,1],
  "steelblue": [70,130,180,1], "tan": [210,180,140,1],
  "teal": [0,128,128,1], "thistle": [216,191,216,1],
  "tomato": [255,99,71,1], "turquoise": [64,224,208,1],
  "violet": [238,130,238,1], "wheat": [245,222,179,1],
  "white": [255,255,255,1], "whitesmoke": [245,245,245,1],
  "yellow": [255,255,0,1], "yellowgreen": [154,205,50,1]};

function clamp_css_byte(i) {  // Clamp to integer 0 .. 255.
  i = Math.round(i);  // Seems to be what Chrome does (vs truncation).
  return i < 0 ? 0 : i > 255 ? 255 : i;
}

function clamp_css_float(f) {  // Clamp to float 0.0 .. 1.0.
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

function parse_css_int(str) {  // int or percentage.
  if (str[str.length - 1] === '%')
    return clamp_css_byte(parseFloat(str) / 100 * 255);
  return clamp_css_byte(parseInt(str));
}

function parse_css_float(str) {  // float or percentage.
  if (str[str.length - 1] === '%')
    return clamp_css_float(parseFloat(str) / 100);
  return clamp_css_float(parseFloat(str));
}

function css_hue_to_rgb(m1, m2, h) {
  if (h < 0) h += 1;
  else if (h > 1) h -= 1;

  if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
  if (h * 2 < 1) return m2;
  if (h * 3 < 2) return m1 + (m2 - m1) * (2/3 - h) * 6;
  return m1;
}

function parseCSSColor(css_str) {
  // Remove all whitespace, not compliant, but should just be more accepting.
  var str = css_str.replace(/ /g, '').toLowerCase();

  // Color keywords (and transparent) lookup.
  if (str in kCSSColorTable) return kCSSColorTable[str].slice();  // dup.

  // #abc and #abc123 syntax.
  if (str[0] === '#') {
    if (str.length === 4) {
      var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xfff)) return null;  // Covers NaN.
      return [((iv & 0xf00) >> 4) | ((iv & 0xf00) >> 8),
              (iv & 0xf0) | ((iv & 0xf0) >> 4),
              (iv & 0xf) | ((iv & 0xf) << 4),
              1];
    } else if (str.length === 7) {
      var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xffffff)) return null;  // Covers NaN.
      return [(iv & 0xff0000) >> 16,
              (iv & 0xff00) >> 8,
              iv & 0xff,
              1];
    }

    return null;
  }

  var op = str.indexOf('('), ep = str.indexOf(')');
  if (op !== -1 && ep + 1 === str.length) {
    var fname = str.substr(0, op);
    var params = str.substr(op+1, ep-(op+1)).split(',');
    var alpha = 1;  // To allow case fallthrough.
    switch (fname) {
      case 'rgba':
        if (params.length !== 4) return null;
        alpha = parse_css_float(params.pop());
        // Fall through.
      case 'rgb':
        if (params.length !== 3) return null;
        return [parse_css_int(params[0]),
                parse_css_int(params[1]),
                parse_css_int(params[2]),
                alpha];
      case 'hsla':
        if (params.length !== 4) return null;
        alpha = parse_css_float(params.pop());
        // Fall through.
      case 'hsl':
        if (params.length !== 3) return null;
        var h = (((parseFloat(params[0]) % 360) + 360) % 360) / 360;  // 0 .. 1
        // NOTE(deanm): According to the CSS spec s/l should only be
        // percentages, but we don't bother and let float or percentage.
        var s = parse_css_float(params[1]);
        var l = parse_css_float(params[2]);
        var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
        var m1 = l * 2 - m2;
        return [clamp_css_byte(css_hue_to_rgb(m1, m2, h+1/3) * 255),
                clamp_css_byte(css_hue_to_rgb(m1, m2, h) * 255),
                clamp_css_byte(css_hue_to_rgb(m1, m2, h-1/3) * 255),
                alpha];
      default:
        return null;
    }
  }

  return null;
}

try { exports.parseCSSColor = parseCSSColor; } catch(e) { }
});
var csscolorparser_1 = csscolorparser.parseCSSColor;

function buildInterpFunc(base, sampleVal) {
  // Return a function to interpolate the value of y(x), given endpoints
  // p0 = (x0, y0) and p2 = (x1, y1)

  const scale = getScale(base);
  const interpolate = getInterpolator(sampleVal);

  return (p0, x, p1) => interpolate( p0[1], scale(p0[0], x, p1[0]), p1[1] );
}

function getScale(base) {
  // Return a function to find the relative position of x between a and b

  // Exponential scale follows mapbox-gl-js, style-spec/function/index.js
  // NOTE: https://github.com/mapbox/mapbox-gl-js/issues/2698 not addressed!
  const scale = (base === 1)
    ? (a, x, b) => (x - a) / (b - a)  // Linear scale
    : (a, x, b) => (Math.pow(base, x - a) - 1) / (Math.pow(base, b - a) - 1);

  // Add check for zero range
  return (a, x, b) => (a === b)
    ? 0
    : scale(a, x, b);
}

function getInterpolator(sampleVal) {
  // Return a function to find an interpolated value between end values v1, v2,
  // given relative position t between the two end positions

  var type = typeof sampleVal;
  if (type === "string" && csscolorparser_1(sampleVal)) type = "color";

  switch (type) {
    case "number": // Linear interpolator
      return (v1, t, v2) => v1 + t * (v2 - v1);

    case "color":  // Interpolate RGBA
      return (v1, t, v2) => 
        interpColor( csscolorparser_1(v1), t, csscolorparser_1(v2) );

    default:       // Assume step function
      return (v1, t, v2) => v1;
  }
}

function interpColor(c0, t, c1) {
  // Inputs c0, c1 are 4-element RGBA arrays as returned by parseCSSColor
  let c = c0.map( (c0_i, i) => c0_i + t * (c1[i] - c0_i) );

  return "rgba(" +
    Math.round(c[0]) + ", " +
    Math.round(c[1]) + ", " + 
    Math.round(c[2]) + ", " +
    c[3] + ")";
}

function autoGetters(properties = {}, defaults) {
  const getters = {};
  Object.keys(defaults).forEach(key => {
    getters[key] = buildStyleFunc(properties[key], defaults[key]);
  });
  return getters;
}

function buildStyleFunc(style, defaultVal) {
  var styleFunc, getArg;

  if (style === undefined) {
    styleFunc = () => defaultVal;
    styleFunc.type = "constant";

  } else if (typeof style !== "object" || Array.isArray(style)) {
    styleFunc = () => style;
    styleFunc.type = "constant";

  } else if (!style.property || style.property === "zoom") {
    getArg = (zoom, feature) => zoom;
    styleFunc = getStyleFunc(style, getArg);
    styleFunc.type = "zoom";

  } else {
    getArg = (zoom, feature) => feature.properties[style.property];
    styleFunc = getStyleFunc(style, getArg);
    styleFunc.type = "property";

  } // NOT IMPLEMENTED: zoom-and-property functions

  return styleFunc;
}

function getStyleFunc(style, getArg) {
  if (style.type === "identity") return getArg;

  // We should be building a stop function now. Make sure we have enough info
  var stops = style.stops;
  if (!stops || stops.length < 2 || stops[0].length !== 2) {
    console.log("buildStyleFunc: style = " + JSON.stringify(style));
    console.log("ERROR in buildStyleFunc: failed to understand style!");
    return;
  }

  var stopFunc = buildStopFunc(stops, style.base);
  return (zoom, feature) => stopFunc( getArg(zoom, feature) );
}

function buildStopFunc(stops, base = 1) {
  const izm = stops.length - 1;
  const interpolateVal = buildInterpFunc(base, stops[0][1]);

  return function(x) {
    let iz = stops.findIndex(stop => stop[0] > x);

    if (iz === 0) return stops[0][1]; // x is below first stop
    if (iz < 0) return stops[izm][1]; // x is above last stop

    return interpolateVal(stops[iz-1], x, stops[iz]);
  }
}

const layoutDefaults = {
  "background": {
    "visibility": "visible",
  },
  "fill": {
    "visibility": "visible",
  },
  "line": {
    "visibility": "visible",
    "line-cap": "butt",
    "line-join": "miter",
    "line-miter-limit": 2,
    "line-round-limit": 1.05,
  },
  "symbol": {
    "visibility": "visible",

    "symbol-placement": "point",
    "symbol-spacing": 250,
    "symbol-avoid-edges": false,
    "symbol-sort-key": undefined,
    "symbol-z-order": "auto",

    "icon-allow-overlap": false,
    "icon-ignore-placement": false,
    "icon-optional": false,
    "icon-rotation-alignment": "auto",
    "icon-size": 1,
    "icon-text-fit": "none",
    "icon-text-fit-padding": [0, 0, 0, 0],
    "icon-image": undefined,
    "icon-rotate": 0,
    "icon-padding": 2,
    "icon-keep-upright": false,
    "icon-offset": [0, 0],
    "icon-anchor": "center",
    "icon-pitch-alignment": "auto",

    "text-pitch-alignment": "auto",
    "text-rotation-alignment": "auto",
    "text-field": "",
    "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
    "text-size": 16,
    "text-max-width": 10,
    "text-line-height": 1.2,
    "text-letter-spacing": 0,
    "text-justify": "center",
    "text-radial-offset": 0,
    "text-variable-anchor": undefined,
    "text-anchor": "center",
    "text-max-angle": 45,
    "text-rotate": 0,
    "text-padding": 2.0,
    "text-keep-upright": true,
    "text-transform": "none",
    "text-offset": [0, 0],
    "text-allow-overlap": false,
    "text-ignore-placement": false,
    "text-optional": false,
  },
  "raster": {
    "visibility": "visible",
  },
  "circle": {
    "visibility": "visible",
  },
  "fill-extrusion": {
    "visibility": "visible",
  },
  "heatmap": {
    "visibility": "visible",
  },
  "hillshade": {
    "visibility": "visible",
  },
};

const paintDefaults = {
  "background": {
    "background-color": "#000000",
    "background-opacity": 1,
    "background-pattern": undefined,
  },
  "fill": {
    "fill-antialias": true,
    "fill-opacity": 1,
    "fill-color": "#000000",
    "fill-outline-color": undefined,
    "fill-outline-width": 1, // non-standard!
    "fill-translate": [0, 0],
    "fill-translate-anchor": "map",
    "fill-pattern": undefined,
  },
  "line": {
    "line-opacity": 1,
    "line-color": "#000000",
    "line-translate": [0, 0],
    "line-translate-anchor": "map",
    "line-width": 1,
    "line-gap-width": 0,
    "line-offset": 0,
    "line-blur": 0,
    "line-dasharray": undefined,
    "line-pattern": undefined,
    "line-gradient": undefined,
  },
  "symbol": {
    "icon-opacity": 1,
    "icon-color": "#000000",
    "icon-halo-color": "rgba(0, 0, 0, 0)",
    "icon-halo-width": 0,
    "icon-halo-blur": 0,
    "icon-translate": [0, 0],
    "icon-translate-anchor": "map",

    "text-opacity": 1,
    "text-color": "#000000",
    "text-halo-color": "rgba(0, 0, 0, 0)",
    "text-halo-width": 0,
    "text-halo-blur": 0,
    "text-translate": [0, 0],
    "text-translate-anchor": "map",
  },
  "raster": {
    "raster-opacity": 1,
    "raster-hue-rotate": 0,
    "raster-brighness-min": 0,
    "raster-brightness-max": 1,
    "raster-saturation": 0,
    "raster-contrast": 0,
    "raster-resampling": "linear",
    "raster-fade-duration": 300,
  },
  "circle": {
    "circle-radius": 5,
    "circle-color": "#000000",
    "circle-blur": 0,
    "circle-opacity": 1,
    "circle-translate": [0, 0],
    "circle-translate-anchor": "map",
    "circle-pitch-scale": "map",
    "circle-pitch-alignment": "viewport",
    "circle-stroke-width": 0,
    "circle-stroke-color": "#000000",
    "circle-stroke-opacity": 1,
  },
  "fill-extrusion": {
    "fill-extrusion-opacity": 1,
    "fill-extrusion-color": "#000000",
    "fill-extrusion-translate": [0, 0],
    "fill-extrusion-translate-anchor": "map",
    "fill-extrusion-height": 0,
    "fill-extrusion-base": 0,
    "fill-extrusion-vertical-gradient": true,
  },
  "heatmap": {
    "heatmap-radius": 30,
    "heatmap-weight": 1,
    "heatmap-intensity": 1,
    "heatmap-color": ["interpolate",["linear"],["heatmap-density"],0,"rgba(0, 0, 255,0)",0.1,"royalblue",0.3,"cyan",0.5,"lime",0.7,"yellow",1,"red"],
    "heatmap-opacity": 1,
  },
  "hillshade": {
    "hillshade-illumination-direction": 335,
    "hillshade-illumination-anchor": "viewport",
    "hillshade-exaggeration": 0.5,
    "hillshade-shadow-color": "#000000",
    "hillshade-highlight-color": "#FFFFFF",
    "hillshade-accent-color": "#000000",
  },
};

function parseLayer(inputLayer) {
  // Make a shallow copy of the layer, to leave the input unchanged
  const layer = Object.assign({}, inputLayer);

  // Replace filter and rendering properties with functions
  layer.filter = buildFeatureFilter(layer.filter);
  layer.layout = autoGetters(layer.layout, layoutDefaults[layer.type]);
  layer.paint  = autoGetters(layer.paint,  paintDefaults[layer.type] );

  return layer;
}

function parseStyle(style, mapboxToken) {
  // Get a Promise that resolves to a raw Mapbox style document
  const getStyleJson = (typeof style === "object")
    ? Promise.resolve(style)                // style is JSON already
    : getJSON( expandStyleURL(style, mapboxToken) ); // Get from URL

  // Set up an asynchronous function to process the document
  function parseStyleJson(rawStyleDoc) {
    // Make a shallow copy of the document, to leave the input unchanged
    const styleDoc = Object.assign({}, rawStyleDoc);

    // Expand layer references, then parse
    styleDoc.layers = derefLayers(styleDoc.layers).map(parseLayer);

    // Get linked info for sources and sprites
    const sourcePromise = expandSources(styleDoc.sources, mapboxToken);
    const spritePromise = loadSprite(styleDoc.sprite, mapboxToken);

    return Promise.all([sourcePromise, spritePromise])
      .then( ([sources, spriteData]) => {
        styleDoc.sources = sources;
        styleDoc.spriteData = spriteData;
        return styleDoc;
      });
  }

  // Chain together and return
  return getStyleJson.then( parseStyleJson );
}

function expandSources(rawSources, token) {
  const expandPromises = Object.entries(rawSources).map(expandSource);

  function expandSource([key, source]) {
    // If no .url, return a shallow copy of the input. 
    // Note: some properties may still be pointing back to the original 
    // style document, like .vector_layers, .bounds, .center, .extent
    if (source.url === undefined) return [key, Object.assign({}, source)];

    // Load the referenced TileJSON document, add any values from source
    return getJSON( expandTileURL(source.url, token) )
      .then( tileJson => [key, Object.assign(tileJson, source)] );
  }

  function combineSources(keySourcePairs) {
    const sources = {};
    keySourcePairs.forEach( ([key, val]) => { sources[key] = val; } );
    return sources;
  }

  return Promise.all( expandPromises ).then( combineSources );
}

function loadSprite(sprite, token) {
  if (!sprite) return;

  const urls = expandSpriteURLs(sprite, token);

  return Promise.all([getImage(urls.image), getJSON(urls.meta)])
    .then( ([image, meta]) => ({ image, meta }) );
}

export { parseLayer, parseStyle };
