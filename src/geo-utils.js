var deg2rad = function(deg) {
  return deg * Math.PI / 180;
};

/**
 * Calculate the distance between two points on a globe, via Haversine
 * formula, in kilometers. This is approximate due to the nature of the
 * Earth's radius varying between 6356.752 km through 6378.137 km.
 */
var dist = function(loc1, loc2) {
  var lat1 = loc1[0],
    lon1 = loc1[1],
    lat2 = loc2[0],
    lon2 = loc2[1];

  var radius = 6371, // km
    dlat = deg2rad(lat2 - lat1),
    dlon = deg2rad(lon2 - lon1),
    a, c;

  a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dlon / 2) * Math.sin(dlon / 2);

  c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
};

/**
 * Generate a geohash of the specified precision/string length
 * from the [latitude, longitude] pair, specified as an array.
 */
var encodeGeohash = function(latLon, precision) {
  var latRange = { "min": -90, "max": 90 },
    lonRange = { "min": -180, "max": 180 };
  var lat = latLon[0],
    lon = latLon[1],
    hash = "",
    hashVal = 0,
    bits = 0,
    even = 1;

  precision = Math.min(precision || 12, 22);

  if (lat < latRange.min || lat > latRange.max) {
    throw "Invalid latitude specified! (" + lat + ")";
  }

  if (lon < lonRange.min || lon > lonRange.max) {
    throw "Invalid longitude specified! (" + lon + ")";
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
      hash += "0123456789bcdefghjkmnpqrstuvwxyz"[hashVal];
      hashVal = 0;
    }
  }

  return hash;
};