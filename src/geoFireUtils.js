// Default geohash length
var g_GEOHASH_PRECISION = 10;

// Characters used in location geohashes
var g_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

var g_EARTH_MERI_CIRCUMFERENCE = 40007860;
var g_METERS_PER_DEGREE_LATITUDE = 110574;
var g_MAXIMUM_BITS_PRECISION = 22*5;
var g_BITS_PER_CHAR = 5;
var g_EARTH_EQ_RADIUS = 6378137.0;
// var g_EARTH_POL_RADIUS = 6356752.3;
// g_E2 == (g_EARTH_EQ_RADIUS^2-g_EARTH_POL_RADIUS^2)/(g_EARTH_EQ_RADIUS^2)
// Use exact value to avoid rounding errors
var g_E2 = 0.00669447819799;

var g_EPSILON = 1e-12;

Math.log2 = Math.log2 || function(x) {
  return Math.log(x)/Math.log(2);
};

/**
 * Validates the inputted key and throws an error if it is invalid.
 *
 * @param {string} key The key to be verified.
 */
var validateKey = function(key) {
  var error;

  if (typeof key !== "string") {
    error = "key must be a string";
  }
  else if (key.length === 0) {
    error = "key cannot be the empty string";
  }
  else if (1 + g_GEOHASH_PRECISION + key.length > 755) {
    // Firebase can only stored child paths up to 768 characters
    // The child path for this key is at the least: "i/<geohash>key"
    error = "key is too long to be stored in Firebase";
  }
  else if (/[\[\].#$\/\u0000-\u001F\u007F]/.test(key)) {
    // Firebase does not allow node keys to contain the following characters
    error = "key cannot contain any of the following characters: . # $ ] [ /";
  }

  if (typeof error !== "undefined") {
    throw new Error("Invalid GeoFire key '" + key + "': " + error);
  }
};

/**
 * Validates the inputted location and throws an error if it is invalid.
 *
 * @param {array} location The [latitude, longitude] pair to be verified.
 */
var validateLocation = function(location) {
  var error;

  if (Object.prototype.toString.call(location) !== "[object Array]") {
    error = "location must be an array";
  }
  else if (location.length !== 2) {
    error = "expected array of length 2, got length " + location.length;
  }
  else {
    var latitude = location[0];
    var longitude = location[1];

    if (typeof latitude !== "number") {
      error = "latitude must be a number";
    }
    else if (latitude < -90 || latitude > 90) {
      error = "latitude must be within the range [-90, 90]";
    }
    else if (typeof longitude !== "number") {
      error = "longitude must be a number";
    }
    else if (longitude < -180 || longitude > 180) {
      error = "longitude must be within the range [-180, 180]";
    }
  }

  if (typeof error !== "undefined") {
    throw new Error("Invalid GeoFire location '" + location + "': " + error);
  }
};

/**
 * Validates the inputted geohash and throws an error if it is invalid.
 *
 * @param {string} geohash The geohash to be validated.
 */
var validateGeohash = function(geohash) {
  var error;

  if (typeof geohash !== "string") {
    error = "geohash must be a string";
  }
  else if (geohash.length === 0) {
    error = "geohash cannot be the empty string";
  }
  else {
    for (var i = 0, length = geohash.length; i < length; ++i) {
      if (g_BASE32.indexOf(geohash[i]) === -1) {
        error = "geohash cannot contain \"" + geohash[i] + "\"";
      }
    }
  }

  if (typeof error !== "undefined") {
    throw new Error("Invalid GeoFire geohash '" + geohash + "': " + error);
  }
};

/**
 * Validates the inputted query criteria and throws an error if it is invalid.
 *
 * @param {object} newQueryCriteria The criteria which specifies the query's center and/or radius.
 */
var validateCriteria = function(newQueryCriteria, requireCenterAndRadius) {
  if (typeof newQueryCriteria !== "object") {
    throw new Error("query criteria must be an object");
  }
  else if (typeof newQueryCriteria.center === "undefined" && typeof newQueryCriteria.radius === "undefined") {
    throw new Error("radius and/or center must be specified");
  }
  else if (requireCenterAndRadius && (typeof newQueryCriteria.center === "undefined" || typeof newQueryCriteria.radius === "undefined")) {
    throw new Error("query criteria for a new query must contain both a center and a radius");
  }

  // Throw an error if there are any extraneous attributes
  for (var key in newQueryCriteria) {
    if (newQueryCriteria.hasOwnProperty(key)) {
      if (key !== "center" && key !== "radius") {
        throw new Error("Unexpected attribute '" + key + "'' found in query criteria");
      }
    }
  }

  // Validate the "center" attribute
  if (typeof newQueryCriteria.center !== "undefined") {
    validateLocation(newQueryCriteria.center);
  }

  // Validate the "radius" attribute
  if (typeof newQueryCriteria.radius !== "undefined") {
    if (typeof newQueryCriteria.radius !== "number") {
      throw new Error("radius must be a number");
    }
    else if (newQueryCriteria.radius < 0) {
      throw new Error("radius must be greater than or equal to 0");
    }
  }
};

/**
 * Converts degrees to radians.
 *
 * @param {number} degrees The number of degrees to be converted to radians.
 * @return {number} The number of radians equal to the inputted number of degrees.
 */
var degreesToRadians = function(degrees) {
  if (typeof degrees !== "number") {
    throw new Error("Error: degrees must be a number");
  }

  return (degrees * Math.PI / 180);
};

/**
 * Generates a geohash of the specified precision/string length
 * from the [latitude, longitude] pair, specified as an array.
 *
 * @param {array} location The [latitude, longitude] pair to encode into
 * a geohash.
 * @param {number} precision The length of the geohash to create. If no
 * precision is specified, the global default is used.
 * @return {string} The geohash of the inputted location.
 */
var encodeGeohash = function(location, precision) {
  validateLocation(location);
  if (typeof precision !== "undefined") {
    if (typeof precision !== "number") {
      throw new Error("precision must be a number");
    }
    else if (precision <= 0) {
      throw new Error("precision must be greater than 0");
    }
    else if (precision > 22) {
      throw new Error("precision cannot be greater than 22");
    }
    else if (Math.round(precision) !== precision) {
      throw new Error("precision must be an integer");
    }
  }

  // Use the global precision default if no precision is specified
  precision = precision || g_GEOHASH_PRECISION;

  var latitudeRange = {
    min: -90,
    max: 90
  };
  var longitudeRange = {
    min: -180,
    max: 180
  };
  var hash = "";
  var hashVal = 0;
  var bits = 0;
  var even = 1;

  while (hash.length < precision) {
    var val = even ? location[1] : location[0];
    var range = even ? longitudeRange : latitudeRange;
    var mid = (range.min + range.max) / 2;

    /* jshint -W016 */
    if (val > mid) {
      hashVal = (hashVal << 1) + 1;
      range.min = mid;
    }
    else {
      hashVal = (hashVal << 1) + 0;
      range.max = mid;
    }
    /* jshint +W016 */

    even = !even;
    if (bits < 4) {
      bits++;
    }
    else {
      bits = 0;
      hash += g_BASE32[hashVal];
      hashVal = 0;
    }
  }

  return hash;
};

/**
 * Calculates the number of degrees a given distance is at a given latitude
 * @param {number} distance
 * @param {number} latitude
 * @return {number} The number of degrees the distance corresponds to
 */
var metersToLongitudeDegrees = function(distance, latitude) {
  //var circ = Math.cos(degreesToRadians(latitude))*g_EARTH_EQ_CIRCUMFERENCE;
  var radians = degreesToRadians(latitude);
  var num = Math.cos(radians)*g_EARTH_EQ_RADIUS*Math.PI/180;
  var denom = 1/Math.sqrt(1-g_E2*Math.sin(radians)*Math.sin(radians));
  var deltaDeg = num*denom;
  if (deltaDeg  < g_EPSILON) {
    return 0;
  } else {
    return distance/deltaDeg;
  }
};

/**
 * Calculates the bits necessary to reach a given resolution in meters for
 * the longitude at a given latitude
 * @param {number} resolution
 * @param {number} latitude
 * @return {number}
 */
var longitudeBitsForResolution = function(resolution, latitude) {
  var degs = metersToLongitudeDegrees(resolution, latitude);
  return (Math.abs(degs) > 0.000001) ?  Math.log2(360/degs) : g_MAXIMUM_BITS_PRECISION;
};

/**
 * Calculates the bits necessary to reach a given resolution in meters for
 * the longitude
 * @param {number} resolution
 */
var latitudeBitsForResolution = function(resolution) {
  return Math.min(Math.log2(g_EARTH_MERI_CIRCUMFERENCE/2/resolution), g_MAXIMUM_BITS_PRECISION);
};

/**
 * Wraps the longitude to [-180,180];
 * @param {number} longitude
 * @return {number} longitude
 */
var wrapLongitude = function(longitude) {
  if (longitude <= 180 && longitude >= -180) {
    return longitude;
  }
  var adjusted = longitude + 180;
  if (adjusted > 0) {
    return adjusted % 360 - 180;
  } else {
    return 180 - (-adjusted % 360);
  }
};

/**
 * Calculates the maximum number of bits of a geohash to get
 * a bounding box that is larger than a given size at the given
 * coordinate.
 * @param {array} coordinate The coordinate as a [latitude, longitude] pair
 * @param {number} size The size of the bounding box
 * @return {number} The number of bits necessary for the geohash
 */
var boundingBoxBits = function(coordinate, size) {
  var latDeltaDegrees = size/g_METERS_PER_DEGREE_LATITUDE;
  var latitudeNorth = Math.min(90, coordinate[0] + latDeltaDegrees);
  var latitudeSouth = Math.max(-90, coordinate[0] - latDeltaDegrees);
  var bitsLat = Math.floor(latitudeBitsForResolution(size))*2;
  var bitsLongNorth = Math.floor(longitudeBitsForResolution(size, latitudeNorth))*2-1;
  var bitsLongSouth = Math.floor(longitudeBitsForResolution(size, latitudeSouth))*2-1;
  return Math.min.apply(null, [bitsLat, bitsLongNorth, bitsLongSouth, g_MAXIMUM_BITS_PRECISION]);
};

/**
 * Calculates 8 points on the bounding box and the center of a given circle.
 * At least one geohashe of these 9 coordinates, truncated to a precision of
 * at most radius, are guaranteed to be prefixes of any geohash that lies
 * within the circle.
 * @param {array} center The center given as [latitude, longitude]
 * @param {number} radius The radius of the circle
 * @return {number} The four bounding box points
 */
var boundingBoxCoordinates = function(center, radius) {
  var latDegrees = radius/g_METERS_PER_DEGREE_LATITUDE;
  var latitudeNorth = Math.min(90, center[0] + latDegrees);
  var latitudeSouth = Math.max(-90, center[0] - latDegrees);
  var longDegsNorth = metersToLongitudeDegrees(radius, latitudeNorth);
  var longDegsSouth = metersToLongitudeDegrees(radius, latitudeSouth);
  var longDegs = Math.max(longDegsNorth, longDegsSouth);
  return [
    [center[0], center[1]],
    [center[0], wrapLongitude(center[1] - longDegs)],
    [center[0], wrapLongitude(center[1] + longDegs)],
    [latitudeNorth, center[1]],
    [latitudeNorth, wrapLongitude(center[1] - longDegs)],
    [latitudeNorth, wrapLongitude(center[1] + longDegs)],
    [latitudeSouth, center[1]],
    [latitudeSouth, wrapLongitude(center[1] - longDegs)],
    [latitudeSouth, wrapLongitude(center[1] + longDegs)]
  ];
};

/**
 * Calculates the bounding box query for a geohash with x bits precision
 * @param {string} geohash
 * @param {number} bits
 * @return {array} A [start,end] pair
 */
var geohashQuery = function(geohash, bits) {
  validateGeohash(geohash);
  var precision = Math.ceil(bits/g_BITS_PER_CHAR);
  if (geohash.length < precision) {
    return [geohash, geohash+"~"];
  }
  geohash = geohash.substring(0, precision);
  var base = geohash.substring(0, geohash.length - 1);
  var lastValue = g_BASE32.indexOf(geohash.charAt(geohash.length - 1));
  var significantBits = bits - (base.length*g_BITS_PER_CHAR);
  if (significantBits === 0) {
    return [base, base+"~"];
  }
  var unusedBits = (g_BITS_PER_CHAR - significantBits);
  /*jshint bitwise: false*/
  // delete unused bits
  var startValue = (lastValue >> unusedBits) << unusedBits;
  var endValue = startValue + (1 << unusedBits);
  /*jshint bitwise: true*/
  if (endValue > 31) {
    return [base+g_BASE32[startValue], base+"~"];
  } else {
    return [base+g_BASE32[startValue], base+g_BASE32[endValue]];
  }
};

/**
 * Calculates a set of queries to fully contain a given circle
 * A query is a [start,end] pair where any geohash is guaranteed to
 * be lexiographically larger then start and smaller than end
 * @param {array} center The center given as [latitude, longitude] pair
 * @param {number} radius The radius of the circle
 * @return {array} An array of geohashes containing a [start,end] pair
 */
var geohashQueries = function(center, radius) {
  validateLocation(center);
  var queryBits = Math.max(1, boundingBoxBits(center, radius));
  var geohashPrecision = Math.ceil(queryBits/g_BITS_PER_CHAR);
  var coordinates = boundingBoxCoordinates(center, radius);
  var queries = coordinates.map(function(coordinate) {
    return geohashQuery(encodeGeohash(coordinate, geohashPrecision), queryBits);
  });
  // remove duplicates
  return queries.filter(function(query) {
    for (var i = 0; i < queries.length; i++) {
      if (queries[i][0] === query[0] && queries[i][1] === query[1]) {
        return true;
      }
    }
    return false;
  });
};
