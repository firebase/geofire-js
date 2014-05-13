// TODO: do I want to use this file like this?
var encodeGeohash;
var decodeGeohash;
var dist;

(function() {
  var BITS = [16, 8, 4, 2, 1];

  var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

  function halve_interval(interval, decimal, mask) {
    var mid = (interval.min + interval.max) / 2;
    if (decimal & mask) {
      interval.min = mid;
    }
    else {
      interval.max = mid;
    }
  }


  function deg2rad(deg) {
    return deg * Math.PI / 180;
  }

  /**
   * Calculate the distance between two points on a globe, via Haversine
   * formula, in kilometers. This is approximate due to the nature of the
   * Earth's radius varying between 6356.752 km through 6378.137 km.
   */
  dist = function(loc1, loc2) {
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

  /** public functions **/

  /**
   * Generate a geohash of the specified precision/string length
   * from the [latitude, longitude] pair, specified as an array.
   */
  encodeGeohash = function(latLon, precision) {
    var latRange = { "min": -90, "max": 90 },
      lonRange = { "min": -180, "max": 180 };
    var lat = latLon[0],
      lon = latLon[1],
      hash = "",
      hashVal = 0,
      bits = 0,
      even = 1,
      val, range, mid;

    precision = Math.min(precision || 12, 22);

    if (lat < latRange.min || lat > latRange.max) {
      throw "Invalid latitude specified! (" + lat + ")";
    }

    if (lon < lonRange.min || lon > lonRange.max) {
      throw "Invalid longitude specified! (" + lon + ")";
    }

    while (hash.length < precision) {
      val = even ? lon : lat;
      range = even ? lonRange : latRange;

      mid = (range.min + range.max) / 2;
      if (val > mid) {
        hashVal = (hashVal << 1) + 1;
        range.min = mid;
      }
      else {
        hashVal = (hashVal << 1) + 0;
        range.max = mid;
      }

      even = !even;
      if (bits < 4) {
        bits++;
      }
      else {
        bits = 0;
        hash += BASE32[hashVal].toString();
        hashVal = 0;
      }
    }

    return hash;
  };

  /**
   * Decode the geohash to get the location of the center of the bounding box it represents;
   * the [latitude, longitude] coordinates of the center are returned as an array.
   */
  decodeGeohash = function(hash) {
    var latRange = { "min": -90, "max": 90 },
      lonRange = { "min": -180, "max": 180 };
    var even = 1,
      lat, lon, decimal, mask, interval;

    for (var i = 0; i < hash.length; i++) {
      decimal = BASE32.indexOf(hash[i]);

      for (var j = 0; j < 5; j++) {
        interval = (even) ? lonRange : latRange;
        mask = BITS[j];
        halve_interval(interval, decimal, mask);
        even = !even;
      }
    }

    lat = (latRange.min + latRange.max) / 2;
    lon = (lonRange.min + lonRange.max) / 2;

    return [lat, lon];
  };
})();
