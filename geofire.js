// geoFire is a helper library for location-based operations in Firebase.
// It provides functions to store data for location querying in Firebase,
// and perform location queries such as location updates and localized searches.
// geoFire stores the location coordinates of a data point as a geohash
// (http://en.wikipedia.org/wiki/Geohash) in Firebase.


(function () {
  /**
   * Helper function to detect disallowed key names. Throws an exception
   */
  var validateKey = function (key) {
    throw new Error("Invalid key " + key);
  }

  var validateLocation = function (loc) {
    throw new Error("Invalid location " + loc);
  }

  /**
   * Takes a location (an array with x and y coordinates) and turns it into a geohash.
   * @param location
   */
  var geoEncode = function (location) {

  }

  var BITS = [16, 8, 4, 2, 1];

  var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

  var NEIGHBORS = {
    "north": {
      "even": "p0r21436x8zb9dcf5h7kjnmqesgutwvy",
      "odd": "bc01fg45238967deuvhjyznpkmstqrwx",
    },
    "east": {
      "even": "bc01fg45238967deuvhjyznpkmstqrwx",
      "odd": "p0r21436x8zb9dcf5h7kjnmqesgutwvy"
    },
    "south": {
      "even": "14365h7k9dcfesgujnmqp0r2twvyx8zb",
      "odd": "238967debc01fg45kmstqrwxuvhjyznp"
    },
    "west": {
      "even": "238967debc01fg45kmstqrwxuvhjyznp",
      "odd": "14365h7k9dcfesgujnmqp0r2twvyx8zb"
    }
  };

  var BORDERS = {
    "north": { "even": "prxz", "odd": "bcfguvyz" },
    "east": { "even": "bcfguvyz", "odd": "prxz"     },
    "south": { "even": "028b", "odd": "0145hjnp" },
    "west": { "even": "0145hjnp", "odd": "028b"     }
  };

  var noop = function () {
  };

  var onSearches = {},
    onCallbacks = {};

  /**
   * Generate a geohash of the specified precision/string length
   * from the [latitude, longitude] pair, specified as an array.
   */
  function encode(latLon, precision) {
    var lat = latLon[0],
      lon = latLon[1],
      hash = "",
      hashVal = 0,
      bits = 0,
      even = 1,
      latRange = { "min": -90, "max": 90 },
      lonRange = { "min": -180, "max": 180 },
      val, range, mid;

    precision = Math.min(precision || 12, 22);

    if (lat < latRange["min"] || lat > latRange["max"])
      throw "Invalid latitude specified! (" + lat + ")";

    if (lon < lonRange["min"] || lon > lonRange["max"])
      throw "Invalid longitude specified! (" + lon + ")";

    while (hash.length < precision) {
      val = (even) ? lon : lat;
      range = (even) ? lonRange : latRange;

      mid = (range["min"] + range["max"]) / 2;
      if (val > mid) {
        hashVal = (hashVal << 1) + 1;
        range["min"] = mid;
      } else {
        hashVal = (hashVal << 1) + 0;
        range["max"] = mid;
      }

      even = !even;
      if (bits < 4) {
        bits++;
      } else {
        bits = 0;
        hash += BASE32[hashVal].toString();
        hashVal = 0;
      }
    }

    return hash;
  }

  function halve_interval(interval, decimal, mask) {
    var mid = (interval["min"] + interval["max"]) / 2;
    if (decimal & mask)
      interval["min"] = mid;
    else
      interval["max"] = mid;
  }

  /**
   * Decode the geohash to get the location of the center of the bounding box it represents;
   * the [latitude, longitude] coordinates of the center are returned as an array.
   */
  function decode(hash) {
    var latRange = { "min": -90, "max": 90 },
      lonRange = { "min": -180, "max": 180 },
      even = 1,
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

    lat = (latRange["min"] + latRange["max"]) / 2;
    lon = (lonRange["min"] + lonRange["max"]) / 2;

    return [lat, lon];
  }

  function deg2rad(deg) {
    return deg * Math.PI / 180;
  }

  function rad2deg(rad) {
    return rad * 180 / Math.PI;
  }

  function rad2km(rad) {
    return 6371 * rad;
  }

  function deg2km(deg) {
    return rad2km(deg2rad(deg));
  }

  function miles2km(miles) {
    return miles * 1.60934;
  }

  function km2miles(kilometers) {
    return kilometers * 0.621371;
  }

  /**
   * Calculate the distance between two points on a globe, via Haversine
   * formula, in kilometers. This is approximate due to the nature of the
   * Earth's radius varying between 6356.752 km through 6378.137 km.
   */
  function dist(lat1, lon1, lat2, lon2) {
    var radius = 6371, // km
      dlat = deg2rad(lat2 - lat1),
      dlon = deg2rad(lon2 - lon1),
      a, c;

    a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dlon / 2) * Math.sin(dlon / 2);

    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radius * c;
  }

  /**
   * Calculate the distance between two points specified by their geohashes.
   * The distance is calculated in kilometers, using the Haversine formula.
   */
  function distByHash(hash1, hash2) {
    var loc1 = decode(hash1);
    var loc2 = decode(hash2);
    return dist(loc1[0], loc1[1], loc2[0], loc2[1]);
  }

  /**
   * Calculate the dimensions of the bounding box for the specified geohash,
   * in kilometers. This method is even more approximate.
   */
  function dimensions(hash) {
    var length = hash.length,
      parity = (length % 2) ? 1 : 0,
      a = 5 * length - parity;

    return {
      "height": deg2km(180 / Math.pow(2, a / 2)),
      "width": deg2km(180 / Math.pow(2, (a - 1) / 2))
    };
  }


  /**
   * Return the geohash of the neighboring bounding box in the
   * direction specified,
   */
  function neighbor(hash, dir) {
    hash = hash.toLowerCase();

    var lastChar = hash.charAt(hash.length - 1),
      type = (hash.length % 2) ? "odd" : "even",
      base = hash.substring(0, hash.length - 1);

    if (BORDERS[dir][type].indexOf(lastChar) != -1) {
      if (base.length <= 0)
        return "";
      base = neighbor(base, dir);
    }

    return base + BASE32[NEIGHBORS[dir][type].indexOf(lastChar)];
  }

  geoFire.prototype.searchRadius = function searchRadius(srcHash, radius, setAlert, cb) {

    // An approximation of the bounding box dimension per hash length.
    var boundingBoxShortestEdgeByHashLength = [ null, 5003.771699005143,
      625.4714623756429,
      156.36786559391072,
      19.54598319923884,
      4.88649579980971,
      0.6108119749762138 ];
    var zoomLevel = 6;
    while (radius > boundingBoxShortestEdgeByHashLength[zoomLevel])
      zoomLevel -= 1;
  };

  var getGeoHashPrefixesForRegion = function (region)
  var isLocationInRegion
  (criteria, loc)
  {

  }

  //REPLACE ME WITH REAL PROMISE IMPL
  var Promise = function () {

  }

  var GeoCBRegistration = function (onCancel) {
    this._onCancel = onCancel;
  }

  GeoCBRegistration.prototype.cancel = function () {
    if (this._onCancel()) {
      this._onCancel();
      delete this._onCancel;
    }
  }

  var GeoQuery = function (queryCriteria) {


    //extend Promise...


  }

  //extend Promise...
  GeoQuery.prototype = Promise.prototype;

  GeoQuery.prototype.onKey = function (callback) {

  }

  GeoQuery.prototype.changeQuery = function (newCriteria) {

  }

  GeoQuery.prototype.cancel = function () {

  }

  var GeoFire = function (ref) {
    this._ref = ref;

  }

  GeoFire.prototype.set = function (key, location) {
    validateKey(key);
    validateLocation(location);
  }

  GeoFire.prototype.get = function (key) {
    validateKey(key);
  }

  if (typeof module === "undefined") {
    self.geoFire = GeoFire;
  } else {
    module.exports = GeoFire;
  }
})();
