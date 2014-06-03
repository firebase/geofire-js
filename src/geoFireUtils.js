var g_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

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

// TODO: Investigate the correct value for this and maybe make it user configurable
var g_GEOHASH_LENGTH = 12;

var deg2rad = function(deg) {
  return deg * Math.PI / 180;
};

/**
 * Calculate the distance between two points on a globe, via Haversine
 * formula, in kilometers. This is approximate due to the nature of the
 * Earth's radius varying between 6356.752 km through 6378.137 km.
 */
var dist = function(location1, location2) {
  var radius = 6371; // km
  var latDelta = deg2rad(location2[0] - location1[0]);
  var lonDelta = deg2rad(location2[1] - location1[1]);

  var a = (Math.sin(latDelta / 2) * Math.sin(latDelta / 2)) +
          (Math.cos(deg2rad(location1[0])) * Math.cos(deg2rad(location2[0])) *
          Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2));

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radius * c;
};


/**
 * Return the geohash of the neighboring bounding box in the
 * direction specified,
 */
var neighbor = function(geohash, direction) {
  var lastChar = geohash.charAt(geohash.length - 1);
  var type = (geohash.length % 2) ? "odd" : "even";
  var base = geohash.substring(0, geohash.length - 1);

  if (g_BORDERS[direction][type].indexOf(lastChar) !== -1) {
    if (base.length <= 0) {
      return "";
    }
    base = neighbor(base, direction);
  }

  return base + g_BASE32[g_NEIGHBORS[direction][type].indexOf(lastChar)];
};

/**
 * Return the geohashes of all neighboring bounding boxes.
 */
var neighbors = function(geohash) {
  var neighbors = [];
  neighbors.push(neighbor(geohash, "north"));
  neighbors.push(neighbor(geohash, "south"));
  neighbors.push(neighbor(geohash, "east"));
  neighbors.push(neighbor(geohash, "west"));
  neighbors.push(neighbor(neighbors[0], "east"));
  neighbors.push(neighbor(neighbors[0], "west"));
  neighbors.push(neighbor(neighbors[1], "east"));
  neighbors.push(neighbor(neighbors[1], "west"));
  return neighbors;
};

/**
 * Generate a geohash of the specified precision/string length
 * from the [latitude, longitude] pair, specified as an array.
 */
var encodeGeohash = function(latLon, precision) {
  var latRange = {
    min: -90,
    max: 90
  };
  var lonRange = {
    min: -180,
    max: 180
  };
  var lat = latLon[0];
  var lon = latLon[1];
  var hash = "";
  var hashVal = 0;
  var bits = 0;
  var even = 1;

  // TODO: should precesion just use the global flag?
  precision = Math.min(precision || 12, 22);

  // TODO: more error checking here?
  if (lat < latRange.min || lat > latRange.max) {
    throw new Error("Invalid latitude specified in encodeGeohash(): " + lat);
  }
  if (lon < lonRange.min || lon > lonRange.max) {
    throw new Error("Invalid longitude specified in encodeGeohash(): " + lon);
  }

  while (hash.length < precision) {
    var val = even ? lon : lat;
    var range = even ? lonRange : latRange;

    var mid = (range.min + range.max) / 2;
    if (val > mid) {
      /* jshint -W016 */
      hashVal = (hashVal << 1) + 1;
      /* jshint +W016 */
      range.min = mid;
    }
    else {
      /* jshint -W016 */
      hashVal = (hashVal << 1) + 0;
      /* jshint +W016 */
      range.max = mid;
    }

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