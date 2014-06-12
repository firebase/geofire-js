// TODO: Investigate the correct value for this and maybe make it user configurable
// Default geohash length
var g_GEOHASH_PRECISION = 6;

// Characters used in location geohashes
var g_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

// Arrays used to determine neighboring geohashes
var g_NEIGHBORS = {
  north: {
    even: "p0r21436x8zb9dcf5h7kjnmqesgutwvy",
    odd: "bc01fg45238967deuvhjyznpkmstqrwx",
  },
  east: {
    even: "bc01fg45238967deuvhjyznpkmstqrwx",
    odd: "p0r21436x8zb9dcf5h7kjnmqesgutwvy"
  },
  south: {
    even: "14365h7k9dcfesgujnmqp0r2twvyx8zb",
    odd: "238967debc01fg45kmstqrwxuvhjyznp"
  },
  west: {
    even: "238967debc01fg45kmstqrwxuvhjyznp",
    odd: "14365h7k9dcfesgujnmqp0r2twvyx8zb"
  }
};
var g_BORDERS = {
  north: {
    even: "prxz",
    odd: "bcfguvyz"
  },
  east: {
    even: "bcfguvyz",
    odd: "prxz"
  },
  south:{
    even: "028b",
    odd: "0145hjnp"
  },
  west: {
    even: "0145hjnp",
    odd: "028b"
  }
};

// Approximate bounding box dimensions for certain geohash lengths
var g_BOUNDING_BOX_SHORTEST_EDGE_BY_GEOHASH_LENGTH = [
  null,
  5003.771699005143,
  625.4714623756429,
  156.36786559391072,
  19.54598319923884,
  4.88649579980971,
  0.6108119749762138
];

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
  else if (1 + g_GEOHASH_PRECISION + key.length > 755) { // TODO: is 755 correct
    // Firebase can only stored child paths up to 768 characters
    // The child path for this key is at the least: "i/<geohash>key"
    error = "key is too long to be stored in Firebase";
  }
  else if (/[\[\].#$\/\u0000-\u001F\u007F]/.test(key)) {
    // Firebase does not allow node keys to contain the following characters
    error = "key cannot contain any of the following characters: . # $ ] [ /";
  }

  if (typeof error !== "undefined") {
    throw new Error("Invalid GeoFire key \"" + key + "\": " + error);
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
    throw new Error("Invalid GeoFire location \"[" + location + "]\": " + error);
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
    throw new Error("Invalid GeoFire geohash \"" + geohash + "\": " + error);
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
        throw new Error("Unexpected attribute \"" + key + "\" found in query criteria");
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
 * Returns the geohash of the neighboring bounding box in the direction
 * specified.
 *
 * @param {string} geohash The geohash whose neighbor we are calculating.
 * @param {string} direction The direction from the inputted geohash in
 * which we should find the neighboring geohash.
 * @return {string} The geohash of the neighboring bounding box in the
 * direction specified.
 */
var neighborByDirection = function(geohash, direction) {
  validateGeohash(geohash);
  if (["north", "south", "east", "west"].indexOf(direction) === -1) {
    throw new Error("Error: direction must be one of \"north\", \"south\", \"east\", or \"west\"");
  }

  var lastChar = geohash.charAt(geohash.length - 1);
  var type = (geohash.length % 2) ? "odd" : "even";
  var base = geohash.substring(0, geohash.length - 1);

  if (g_BORDERS[direction][type].indexOf(lastChar) !== -1) {
    if (base.length <= 0) {
      return "";
    }
    base = neighborByDirection(base, direction);
  }

  return base + g_BASE32[g_NEIGHBORS[direction][type].indexOf(lastChar)];
};

/**
 * Returns the geohashes of all neighboring bounding boxes.
 *
 * @param {string} geohash The geohash whose neighbors we are calculating.
 * @return {array} An array of geohashes representing the bounding boxes
 * around the inputted geohash.
 */
var neighbors = function(geohash) {
  validateGeohash(geohash);

  var neighbors = [];
  neighbors.push(neighborByDirection(geohash, "north"));
  neighbors.push(neighborByDirection(geohash, "south"));
  neighbors.push(neighborByDirection(geohash, "east"));
  neighbors.push(neighborByDirection(geohash, "west"));
  if (neighbors[0] !== "") {
    neighbors.push(neighborByDirection(neighbors[0], "east"));
    neighbors.push(neighborByDirection(neighbors[0], "west"));
  }
  if (neighbors[1] !== "") {
    neighbors.push(neighborByDirection(neighbors[1], "east"));
    neighbors.push(neighborByDirection(neighbors[1], "west"));
  }
  return neighbors;
};