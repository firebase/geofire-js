(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.geofire = {}));
}(this, function (exports) { 'use strict';

  /**
   * Creates a GeoCallbackRegistration instance.
   */
  var GeoCallbackRegistration = /** @class */ (function () {
      /**
       * @param _cancelCallback Callback to run when this callback registration is cancelled.
       */
      function GeoCallbackRegistration(_cancelCallback) {
          this._cancelCallback = _cancelCallback;
          if (Object.prototype.toString.call(this._cancelCallback) !== '[object Function]') {
              throw new Error('callback must be a function');
          }
      }
      /********************/
      /*  PUBLIC METHODS  */
      /********************/
      /**
       * Cancels this callback registration so that it no longer fires its callback. This
       * has no effect on any other callback registrations you may have created.
       */
      GeoCallbackRegistration.prototype.cancel = function () {
          if (typeof this._cancelCallback !== 'undefined') {
              this._cancelCallback();
              this._cancelCallback = undefined;
          }
      };
      return GeoCallbackRegistration;
  }());

  // Default geohash length
  var GEOHASH_PRECISION = 10;
  // Characters used in location geohashes
  var BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  // The meridional circumference of the earth in meters
  var EARTH_MERI_CIRCUMFERENCE = 40007860;
  // Length of a degree latitude at the equator
  var METERS_PER_DEGREE_LATITUDE = 110574;
  // Number of bits per geohash character
  var BITS_PER_CHAR = 5;
  // Maximum length of a geohash in bits
  var MAXIMUM_BITS_PRECISION = 22 * BITS_PER_CHAR;
  // Equatorial radius of the earth in meters
  var EARTH_EQ_RADIUS = 6378137.0;
  // The following value assumes a polar radius of
  // const EARTH_POL_RADIUS = 6356752.3;
  // The formulate to calculate E2 is
  // E2 == (EARTH_EQ_RADIUS^2-EARTH_POL_RADIUS^2)/(EARTH_EQ_RADIUS^2)
  // The exact value is used here to avoid rounding errors
  var E2 = 0.00669447819799;
  // Cutoff for rounding errors on double calculations
  var EPSILON = 1e-12;
  function log2(x) {
      return Math.log(x) / Math.log(2);
  }
  /**
   * Validates the inputted key and throws an error if it is invalid.
   *
   * @param key The key to be verified.
   */
  function validateKey(key) {
      var error;
      if (typeof key !== 'string') {
          error = 'key must be a string';
      }
      else if (key.length === 0) {
          error = 'key cannot be the empty string';
      }
      else if (1 + GEOHASH_PRECISION + key.length > 755) {
          // Firebase can only stored child paths up to 768 characters
          // The child path for this key is at the least: 'i/<geohash>key'
          error = 'key is too long to be stored in Firebase';
      }
      else if (/[\[\].#$\/\u0000-\u001F\u007F]/.test(key)) {
          // Firebase does not allow node keys to contain the following characters
          error = 'key cannot contain any of the following characters: . # $ ] [ /';
      }
      if (typeof error !== 'undefined') {
          throw new Error('Invalid GeoFire key \'' + key + '\': ' + error);
      }
  }
  /**
   * Validates the inputted location and throws an error if it is invalid.
   *
   * @param location The [latitude, longitude] pair to be verified.
   */
  function validateLocation(location) {
      var error;
      if (!Array.isArray(location)) {
          error = 'location must be an array';
      }
      else if (location.length !== 2) {
          error = 'expected array of length 2, got length ' + location.length;
      }
      else {
          var latitude = location[0];
          var longitude = location[1];
          if (typeof latitude !== 'number' || isNaN(latitude)) {
              error = 'latitude must be a number';
          }
          else if (latitude < -90 || latitude > 90) {
              error = 'latitude must be within the range [-90, 90]';
          }
          else if (typeof longitude !== 'number' || isNaN(longitude)) {
              error = 'longitude must be a number';
          }
          else if (longitude < -180 || longitude > 180) {
              error = 'longitude must be within the range [-180, 180]';
          }
      }
      if (typeof error !== 'undefined') {
          throw new Error('Invalid GeoFire location \'' + location + '\': ' + error);
      }
  }
  /**
   * Validates the inputted geohash and throws an error if it is invalid.
   *
   * @param geohash The geohash to be validated.
   */
  function validateGeohash(geohash) {
      var error;
      if (typeof geohash !== 'string') {
          error = 'geohash must be a string';
      }
      else if (geohash.length === 0) {
          error = 'geohash cannot be the empty string';
      }
      else {
          for (var _i = 0, geohash_1 = geohash; _i < geohash_1.length; _i++) {
              var letter = geohash_1[_i];
              if (BASE32.indexOf(letter) === -1) {
                  error = 'geohash cannot contain \'' + letter + '\'';
              }
          }
      }
      if (typeof error !== 'undefined') {
          throw new Error('Invalid GeoFire geohash \'' + geohash + '\': ' + error);
      }
  }
  /**
   * Validates the inputted query criteria and throws an error if it is invalid.
   *
   * @param newQueryCriteria The criteria which specifies the query's center and/or radius.
   * @param requireCenterAndRadius The criteria which center and radius required.
   */
  function validateCriteria(newQueryCriteria, requireCenterAndRadius) {
      if (requireCenterAndRadius === void 0) { requireCenterAndRadius = false; }
      if (typeof newQueryCriteria !== 'object') {
          throw new Error('query criteria must be an object');
      }
      else if (typeof newQueryCriteria.center === 'undefined' && typeof newQueryCriteria.radius === 'undefined') {
          throw new Error('radius and/or center must be specified');
      }
      else if (requireCenterAndRadius && (typeof newQueryCriteria.center === 'undefined' || typeof newQueryCriteria.radius === 'undefined')) {
          throw new Error('query criteria for a new query must contain both a center and a radius');
      }
      // Throw an error if there are any extraneous attributes
      var keys = Object.keys(newQueryCriteria);
      for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
          var key = keys_1[_i];
          if (key !== 'center' && key !== 'radius') {
              throw new Error('Unexpected attribute \'' + key + '\' found in query criteria');
          }
      }
      // Validate the 'center' attribute
      if (typeof newQueryCriteria.center !== 'undefined') {
          validateLocation(newQueryCriteria.center);
      }
      // Validate the 'radius' attribute
      if (typeof newQueryCriteria.radius !== 'undefined') {
          if (typeof newQueryCriteria.radius !== 'number' || isNaN(newQueryCriteria.radius)) {
              throw new Error('radius must be a number');
          }
          else if (newQueryCriteria.radius < 0) {
              throw new Error('radius must be greater than or equal to 0');
          }
      }
  }
  /**
   * Converts degrees to radians.
   *
   * @param degrees The number of degrees to be converted to radians.
   * @returns The number of radians equal to the inputted number of degrees.
   */
  function degreesToRadians(degrees) {
      if (typeof degrees !== 'number' || isNaN(degrees)) {
          throw new Error('Error: degrees must be a number');
      }
      return (degrees * Math.PI / 180);
  }
  /**
   * Generates a geohash of the specified precision/string length from the  [latitude, longitude]
   * pair, specified as an array.
   *
   * @param location The [latitude, longitude] pair to encode into a geohash.
   * @param precision The length of the geohash to create. If no precision is specified, the
   * global default is used.
   * @returns The geohash of the inputted location.
   */
  function encodeGeohash(location, precision) {
      if (precision === void 0) { precision = GEOHASH_PRECISION; }
      validateLocation(location);
      if (typeof precision !== 'undefined') {
          if (typeof precision !== 'number' || isNaN(precision)) {
              throw new Error('precision must be a number');
          }
          else if (precision <= 0) {
              throw new Error('precision must be greater than 0');
          }
          else if (precision > 22) {
              throw new Error('precision cannot be greater than 22');
          }
          else if (Math.round(precision) !== precision) {
              throw new Error('precision must be an integer');
          }
      }
      var latitudeRange = {
          min: -90,
          max: 90
      };
      var longitudeRange = {
          min: -180,
          max: 180
      };
      var hash = '';
      var hashVal = 0;
      var bits = 0;
      var even = 1;
      while (hash.length < precision) {
          var val = even ? location[1] : location[0];
          var range = even ? longitudeRange : latitudeRange;
          var mid = (range.min + range.max) / 2;
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
              hash += BASE32[hashVal];
              hashVal = 0;
          }
      }
      return hash;
  }
  /**
   * Calculates the number of degrees a given distance is at a given latitude.
   *
   * @param distance The distance to convert.
   * @param latitude The latitude at which to calculate.
   * @returns The number of degrees the distance corresponds to.
   */
  function metersToLongitudeDegrees(distance, latitude) {
      var radians = degreesToRadians(latitude);
      var num = Math.cos(radians) * EARTH_EQ_RADIUS * Math.PI / 180;
      var denom = 1 / Math.sqrt(1 - E2 * Math.sin(radians) * Math.sin(radians));
      var deltaDeg = num * denom;
      if (deltaDeg < EPSILON) {
          return distance > 0 ? 360 : 0;
      }
      else {
          return Math.min(360, distance / deltaDeg);
      }
  }
  /**
   * Calculates the bits necessary to reach a given resolution, in meters, for the longitude at a
   * given latitude.
   *
   * @param resolution The desired resolution.
   * @param latitude The latitude used in the conversion.
   * @return The bits necessary to reach a given resolution, in meters.
   */
  function longitudeBitsForResolution(resolution, latitude) {
      var degs = metersToLongitudeDegrees(resolution, latitude);
      return (Math.abs(degs) > 0.000001) ? Math.max(1, log2(360 / degs)) : 1;
  }
  /**
   * Calculates the bits necessary to reach a given resolution, in meters, for the latitude.
   *
   * @param resolution The bits necessary to reach a given resolution, in meters.
   * @returns Bits necessary to reach a given resolution, in meters, for the latitude.
   */
  function latitudeBitsForResolution(resolution) {
      return Math.min(log2(EARTH_MERI_CIRCUMFERENCE / 2 / resolution), MAXIMUM_BITS_PRECISION);
  }
  /**
   * Wraps the longitude to [-180,180].
   *
   * @param longitude The longitude to wrap.
   * @returns longitude The resulting longitude.
   */
  function wrapLongitude(longitude) {
      if (longitude <= 180 && longitude >= -180) {
          return longitude;
      }
      var adjusted = longitude + 180;
      if (adjusted > 0) {
          return (adjusted % 360) - 180;
      }
      else {
          return 180 - (-adjusted % 360);
      }
  }
  /**
   * Calculates the maximum number of bits of a geohash to get a bounding box that is larger than a
   * given size at the given coordinate.
   *
   * @param coordinate The coordinate as a [latitude, longitude] pair.
   * @param size The size of the bounding box.
   * @returns The number of bits necessary for the geohash.
   */
  function boundingBoxBits(coordinate, size) {
      var latDeltaDegrees = size / METERS_PER_DEGREE_LATITUDE;
      var latitudeNorth = Math.min(90, coordinate[0] + latDeltaDegrees);
      var latitudeSouth = Math.max(-90, coordinate[0] - latDeltaDegrees);
      var bitsLat = Math.floor(latitudeBitsForResolution(size)) * 2;
      var bitsLongNorth = Math.floor(longitudeBitsForResolution(size, latitudeNorth)) * 2 - 1;
      var bitsLongSouth = Math.floor(longitudeBitsForResolution(size, latitudeSouth)) * 2 - 1;
      return Math.min(bitsLat, bitsLongNorth, bitsLongSouth, MAXIMUM_BITS_PRECISION);
  }
  /**
   * Calculates eight points on the bounding box and the center of a given circle. At least one
   * geohash of these nine coordinates, truncated to a precision of at most radius, are guaranteed
   * to be prefixes of any geohash that lies within the circle.
   *
   * @param center The center given as [latitude, longitude].
   * @param radius The radius of the circle.
   * @returns The eight bounding box points.
   */
  function boundingBoxCoordinates(center, radius) {
      var latDegrees = radius / METERS_PER_DEGREE_LATITUDE;
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
  }
  /**
   * Calculates the bounding box query for a geohash with x bits precision.
   *
   * @param geohash The geohash whose bounding box query to generate.
   * @param bits The number of bits of precision.
   * @returns A [start, end] pair of geohashes.
   */
  function geohashQuery(geohash, bits) {
      validateGeohash(geohash);
      var precision = Math.ceil(bits / BITS_PER_CHAR);
      if (geohash.length < precision) {
          return [geohash, geohash + '~'];
      }
      geohash = geohash.substring(0, precision);
      var base = geohash.substring(0, geohash.length - 1);
      var lastValue = BASE32.indexOf(geohash.charAt(geohash.length - 1));
      var significantBits = bits - (base.length * BITS_PER_CHAR);
      var unusedBits = (BITS_PER_CHAR - significantBits);
      // delete unused bits
      var startValue = (lastValue >> unusedBits) << unusedBits;
      var endValue = startValue + (1 << unusedBits);
      if (endValue > 31) {
          return [base + BASE32[startValue], base + '~'];
      }
      else {
          return [base + BASE32[startValue], base + BASE32[endValue]];
      }
  }
  /**
   * Calculates a set of queries to fully contain a given circle. A query is a [start, end] pair
   * where any geohash is guaranteed to be lexiographically larger then start and smaller than end.
   *
   * @param center The center given as [latitude, longitude] pair.
   * @param radius The radius of the circle.
   * @return An array of geohashes containing a [start, end] pair.
   */
  function geohashQueries(center, radius) {
      validateLocation(center);
      var queryBits = Math.max(1, boundingBoxBits(center, radius));
      var geohashPrecision = Math.ceil(queryBits / BITS_PER_CHAR);
      var coordinates = boundingBoxCoordinates(center, radius);
      var queries = coordinates.map(function (coordinate) {
          return geohashQuery(encodeGeohash(coordinate, geohashPrecision), queryBits);
      });
      // remove duplicates
      return queries.filter(function (query, index) {
          return !queries.some(function (other, otherIndex) {
              return index > otherIndex && query[0] === other[0] && query[1] === other[1];
          });
      });
  }
  /**
   * Encodes a location and geohash as a GeoFire object.
   *
   * @param location The location as [latitude, longitude] pair.
   * @param geohash The geohash of the location.
   * @returns The location encoded as GeoFire object.
   */
  function encodeGeoFireObject(location, geohash) {
      validateLocation(location);
      validateGeohash(geohash);
      return { '.priority': geohash, 'g': geohash, 'l': location };
  }
  /**
   * Decodes the location given as GeoFire object. Returns null if decoding fails.
   *
   * @param geoFireObj The location encoded as GeoFire object.
   * @returns The location as [latitude, longitude] pair or null if decoding fails.
   */
  function decodeGeoFireObject(geoFireObj) {
      if (geoFireObj && 'l' in geoFireObj && Array.isArray(geoFireObj.l) && geoFireObj.l.length === 2) {
          return geoFireObj.l;
      }
      else {
          throw new Error('Unexpected location object encountered: ' + JSON.stringify(geoFireObj));
      }
  }
  /**
   * Returns the key of a Firebase snapshot across SDK versions.
   *
   * @param A Firebase snapshot.
   * @returns The Firebase snapshot's key.
   */
  function geoFireGetKey(snapshot) {
      var key;
      if (typeof snapshot.key === 'string' || snapshot.key === null) {
          key = snapshot.key;
      }
      else if (typeof snapshot.key === 'function') {
          // @ts-ignore
          key = snapshot.key();
      }
      else {
          // @ts-ignore
          key = snapshot.name();
      }
      return key;
  }
  /**
   * Method which calculates the distance, in kilometers, between two locations,
   * via the Haversine formula. Note that this is approximate due to the fact that the
   * Earth's radius varies between 6356.752 km and 6378.137 km.
   *
   * @param location1 The [latitude, longitude] pair of the first location.
   * @param location2 The [latitude, longitude] pair of the second location.
   * @returns The distance, in kilometers, between the inputted locations.
   */
  function distance(location1, location2) {
      validateLocation(location1);
      validateLocation(location2);
      var radius = 6371; // Earth's radius in kilometers
      var latDelta = degreesToRadians(location2[0] - location1[0]);
      var lonDelta = degreesToRadians(location2[1] - location1[1]);
      var a = (Math.sin(latDelta / 2) * Math.sin(latDelta / 2)) +
          (Math.cos(degreesToRadians(location1[0])) * Math.cos(degreesToRadians(location2[0])) *
              Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2));
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return radius * c;
  }

  /**
   * Creates a GeoQuery instance.
   */
  var GeoQuery = /** @class */ (function () {
      /**
       * @param _firebaseRef A Firebase reference where the GeoFire data will be stored.
       * @param queryCriteria The criteria which specifies the query's center and radius.
       */
      function GeoQuery(_firebaseRef, queryCriteria) {
          var _this = this;
          this._firebaseRef = _firebaseRef;
          // Event callbacks
          this._callbacks = { ready: [], key_entered: [], key_exited: [], key_moved: [] };
          // Variable to track when the query is cancelled
          this._cancelled = false;
          // A dictionary of geohash queries which currently have an active callbacks
          this._currentGeohashesQueried = {};
          // A dictionary of locations that a currently active in the queries
          // Note that not all of these are currently within this query
          this._locationsTracked = {};
          // Variables used to keep track of when to fire the 'ready' event
          this._valueEventFired = false;
          this._geohashCleanupScheduled = false;
          this._cleanUpCurrentGeohashesQueriedTimeout = null;
          // Firebase reference of the GeoFire which created this query
          if (Object.prototype.toString.call(this._firebaseRef) !== '[object Object]') {
              throw new Error('firebaseRef must be an instance of Firebase');
          }
          // Every ten seconds, clean up the geohashes we are currently querying for. We keep these around
          // for a little while since it's likely that they will need to be re-queried shortly after they
          // move outside of the query's bounding box.
          this._cleanUpCurrentGeohashesQueriedInterval = setInterval(function () {
              if (_this._geohashCleanupScheduled === false) {
                  _this._cleanUpCurrentGeohashesQueried();
              }
          }, 10000);
          // Validate and save the query criteria
          validateCriteria(queryCriteria, true);
          this._center = queryCriteria.center;
          this._radius = queryCriteria.radius;
          // Listen for new geohashes being added around this query and fire the appropriate events
          this._listenForNewGeohashes();
      }
      /********************/
      /*  PUBLIC METHODS  */
      /********************/
      /**
       * Terminates this query so that it no longer sends location updates. All callbacks attached to this
       * query via on() will be cancelled. This query can no longer be used in the future.
       */
      GeoQuery.prototype.cancel = function () {
          var _this = this;
          // Mark this query as cancelled
          this._cancelled = true;
          // Cancel all callbacks in this query's callback list
          this._callbacks = { ready: [], key_entered: [], key_exited: [], key_moved: [] };
          // Turn off all Firebase listeners for the current geohashes being queried
          var keys = Object.keys(this._currentGeohashesQueried);
          keys.forEach(function (geohashQueryStr) {
              var query = _this._stringToQuery(geohashQueryStr);
              _this._cancelGeohashQuery(query, _this._currentGeohashesQueried[geohashQueryStr]);
              delete _this._currentGeohashesQueried[geohashQueryStr];
          });
          // Delete any stored locations
          this._locationsTracked = {};
          // Turn off the current geohashes queried clean up interval
          clearInterval(this._cleanUpCurrentGeohashesQueriedInterval);
      };
      /**
       * Returns the location signifying the center of this query.
       *
       * @returns The [latitude, longitude] pair signifying the center of this query.
       */
      GeoQuery.prototype.center = function () {
          return this._center;
      };
      /**
       * Attaches a callback to this query which will be run when the provided eventType fires. Valid eventType
       * values are 'ready', 'key_entered', 'key_exited', and 'key_moved'. The ready event callback is passed no
       * parameters. All other callbacks will be passed three parameters: (1) the location's key, (2) the location's
       * [latitude, longitude] pair, and (3) the distance, in kilometers, from the location to this query's center
       *
       * 'ready' is used to signify that this query has loaded its initial state and is up-to-date with its corresponding
       * GeoFire instance. 'ready' fires when this query has loaded all of the initial data from GeoFire and fired all
       * other events for that data. It also fires every time updateCriteria() is called, after all other events have
       * fired for the updated query.
       *
       * 'key_entered' fires when a key enters this query. This can happen when a key moves from a location outside of
       * this query to one inside of it or when a key is written to GeoFire for the first time and it falls within
       * this query.
       *
       * 'key_exited' fires when a key moves from a location inside of this query to one outside of it. If the key was
       * entirely removed from GeoFire, both the location and distance passed to the callback will be null.
       *
       * 'key_moved' fires when a key which is already in this query moves to another location inside of it.
       *
       * Returns a GeoCallbackRegistration which can be used to cancel the callback. You can add as many callbacks
       * as you would like for the same eventType by repeatedly calling on(). Each one will get called when its
       * corresponding eventType fires. Each callback must be cancelled individually.
       *
       * @param eventType The event type for which to attach the callback. One of 'ready', 'key_entered',
       * 'key_exited', or 'key_moved'.
       * @param callback Callback function to be called when an event of type eventType fires.
       * @returns A callback registration which can be used to cancel the provided callback.
       */
      GeoQuery.prototype.on = function (eventType, callback) {
          var _this = this;
          // Validate the inputs
          if (['ready', 'key_entered', 'key_exited', 'key_moved'].indexOf(eventType) === -1) {
              throw new Error('event type must be \'ready\', \'key_entered\', \'key_exited\', or \'key_moved\'');
          }
          if (typeof callback !== 'function') {
              throw new Error('callback must be a function');
          }
          // Add the callback to this query's callbacks list
          this._callbacks[eventType].push(callback);
          // If this is a 'key_entered' callback, fire it for every location already within this query
          if (eventType === 'key_entered') {
              var keys = Object.keys(this._locationsTracked);
              keys.forEach(function (key) {
                  var locationDict = _this._locationsTracked[key];
                  if (typeof locationDict !== 'undefined' && locationDict.isInQuery) {
                      callback(key, locationDict.location, locationDict.distanceFromCenter);
                  }
              });
          }
          // If this is a 'ready' callback, fire it if this query is already ready
          if (eventType === 'ready' && this._valueEventFired) {
              callback();
          }
          // Return an event registration which can be used to cancel the callback
          return new GeoCallbackRegistration(function () {
              _this._callbacks[eventType].splice(_this._callbacks[eventType].indexOf(callback), 1);
          });
      };
      /**
       * Returns the radius of this query, in kilometers.
       *
       * @returns The radius of this query, in kilometers.
       */
      GeoQuery.prototype.radius = function () {
          return this._radius;
      };
      /**
       * Updates the criteria for this query.
       *
       * @param newQueryCriteria The criteria which specifies the query's center and radius.
       */
      GeoQuery.prototype.updateCriteria = function (newQueryCriteria) {
          // Validate and save the new query criteria
          validateCriteria(newQueryCriteria);
          this._center = newQueryCriteria.center || this._center;
          this._radius = newQueryCriteria.radius || this._radius;
          // Loop through all of the locations in the query, update their distance from the center of the
          // query, and fire any appropriate events
          var keys = Object.keys(this._locationsTracked);
          for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
              var key = keys_1[_i];
              // If the query was cancelled while going through this loop, stop updating locations and stop
              // firing events
              if (this._cancelled === true) {
                  break;
              }
              // Get the cached information for this location
              var locationDict = this._locationsTracked[key];
              // Save if the location was already in the query
              var wasAlreadyInQuery = locationDict.isInQuery;
              // Update the location's distance to the new query center
              locationDict.distanceFromCenter = distance(locationDict.location, this._center);
              // Determine if the location is now in this query
              locationDict.isInQuery = (locationDict.distanceFromCenter <= this._radius);
              // If the location just left the query, fire the 'key_exited' callbacks
              // Else if the location just entered the query, fire the 'key_entered' callbacks
              if (wasAlreadyInQuery && !locationDict.isInQuery) {
                  this._fireCallbacksForKey('key_exited', key, locationDict.location, locationDict.distanceFromCenter);
              }
              else if (!wasAlreadyInQuery && locationDict.isInQuery) {
                  this._fireCallbacksForKey('key_entered', key, locationDict.location, locationDict.distanceFromCenter);
              }
          }
          // Reset the variables which control when the 'ready' event fires
          this._valueEventFired = false;
          // Listen for new geohashes being added to GeoFire and fire the appropriate events
          this._listenForNewGeohashes();
      };
      /*********************/
      /*  PRIVATE METHODS  */
      /*********************/
      /**
       * Turns off all callbacks for the provide geohash query.
       *
       * @param query The geohash query.
       * @param queryState An object storing the current state of the query.
       */
      GeoQuery.prototype._cancelGeohashQuery = function (query, queryState) {
          var queryRef = this._firebaseRef.orderByChild('g').startAt(query[0]).endAt(query[1]);
          queryRef.off('child_added', queryState.childAddedCallback);
          queryRef.off('child_removed', queryState.childRemovedCallback);
          queryRef.off('child_changed', queryState.childChangedCallback);
          queryRef.off('value', queryState.valueCallback);
      };
      /**
       * Callback for child added events.
       *
       * @param locationDataSnapshot A snapshot of the data stored for this location.
       */
      GeoQuery.prototype._childAddedCallback = function (locationDataSnapshot) {
          this._updateLocation(geoFireGetKey(locationDataSnapshot), decodeGeoFireObject(locationDataSnapshot.val()));
      };
      /**
       * Callback for child changed events
       *
       * @param locationDataSnapshot A snapshot of the data stored for this location.
       */
      GeoQuery.prototype._childChangedCallback = function (locationDataSnapshot) {
          this._updateLocation(geoFireGetKey(locationDataSnapshot), decodeGeoFireObject(locationDataSnapshot.val()));
      };
      /**
       * Callback for child removed events
       *
       * @param locationDataSnapshot A snapshot of the data stored for this location.
       */
      GeoQuery.prototype._childRemovedCallback = function (locationDataSnapshot) {
          var _this = this;
          var key = geoFireGetKey(locationDataSnapshot);
          if (key in this._locationsTracked) {
              this._firebaseRef.child(key).once('value', function (snapshot) {
                  var location = (snapshot.val() === null) ? null : decodeGeoFireObject(snapshot.val());
                  var geohash = (location !== null) ? encodeGeohash(location) : null;
                  // Only notify observers if key is not part of any other geohash query or this actually might not be
                  // a key exited event, but a key moved or entered event. These events will be triggered by updates
                  // to a different query
                  if (!_this._geohashInSomeQuery(geohash)) {
                      _this._removeLocation(key, location);
                  }
              });
          }
      };
      /**
       * Removes unnecessary Firebase queries which are currently being queried.
       */
      GeoQuery.prototype._cleanUpCurrentGeohashesQueried = function () {
          var _this = this;
          var keys = Object.keys(this._currentGeohashesQueried);
          keys.forEach(function (geohashQueryStr) {
              var queryState = _this._currentGeohashesQueried[geohashQueryStr];
              if (queryState.active === false) {
                  var query = _this._stringToQuery(geohashQueryStr);
                  // Delete the geohash since it should no longer be queried
                  _this._cancelGeohashQuery(query, queryState);
                  delete _this._currentGeohashesQueried[geohashQueryStr];
              }
          });
          // Delete each location which should no longer be queried
          keys = Object.keys(this._locationsTracked);
          keys.forEach(function (key) {
              if (!_this._geohashInSomeQuery(_this._locationsTracked[key].geohash)) {
                  if (_this._locationsTracked[key].isInQuery) {
                      throw new Error('Internal State error, trying to remove location that is still in query');
                  }
                  delete _this._locationsTracked[key];
              }
          });
          // Specify that this is done cleaning up the current geohashes queried
          this._geohashCleanupScheduled = false;
          // Cancel any outstanding scheduled cleanup
          if (this._cleanUpCurrentGeohashesQueriedTimeout !== null) {
              clearTimeout(this._cleanUpCurrentGeohashesQueriedTimeout);
              this._cleanUpCurrentGeohashesQueriedTimeout = null;
          }
      };
      /**
       * Fires each callback for the provided eventType, passing it provided key's data.
       *
       * @param eventType The event type whose callbacks to fire. One of 'key_entered', 'key_exited', or 'key_moved'.
       * @param key The key of the location for which to fire the callbacks.
       * @param location The location as [latitude, longitude] pair
       * @param distanceFromCenter The distance from the center or null.
       */
      GeoQuery.prototype._fireCallbacksForKey = function (eventType, key, location, distanceFromCenter) {
          this._callbacks[eventType].forEach(function (callback) {
              if (typeof location === 'undefined' || location === null) {
                  callback(key, null, null);
              }
              else {
                  callback(key, location, distanceFromCenter);
              }
          });
      };
      /**
       * Fires each callback for the 'ready' event.
       */
      GeoQuery.prototype._fireReadyEventCallbacks = function () {
          this._callbacks.ready.forEach(function (callback) {
              callback();
          });
      };
      /**
       * Checks if this geohash is currently part of any of the geohash queries.
       *
       * @param geohash The geohash.
       * @returns Returns true if the geohash is part of any of the current geohash queries.
       */
      GeoQuery.prototype._geohashInSomeQuery = function (geohash) {
          var keys = Object.keys(this._currentGeohashesQueried);
          for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
              var queryStr = keys_2[_i];
              if (queryStr in this._currentGeohashesQueried) {
                  var query = this._stringToQuery(queryStr);
                  if (geohash >= query[0] && geohash <= query[1]) {
                      return true;
                  }
              }
          }
          return false;
      };
      /**
       * Called once all geohash queries have received all child added events and fires the ready
       * event if necessary.
       */
      GeoQuery.prototype._geohashQueryReadyCallback = function (queryStr) {
          var index = this._outstandingGeohashReadyEvents.indexOf(queryStr);
          if (index > -1) {
              this._outstandingGeohashReadyEvents.splice(index, 1);
          }
          this._valueEventFired = (this._outstandingGeohashReadyEvents.length === 0);
          // If all queries have been processed, fire the ready event
          if (this._valueEventFired) {
              this._fireReadyEventCallbacks();
          }
      };
      /**
       * Attaches listeners to Firebase which track when new geohashes are added within this query's
       * bounding box.
       */
      GeoQuery.prototype._listenForNewGeohashes = function () {
          var _this = this;
          // Get the list of geohashes to query
          var geohashesToQuery = geohashQueries(this._center, this._radius * 1000).map(this._queryToString);
          // Filter out duplicate geohashes
          geohashesToQuery = geohashesToQuery.filter(function (geohash, i) { return geohashesToQuery.indexOf(geohash) === i; });
          // For all of the geohashes that we are already currently querying, check if they are still
          // supposed to be queried. If so, don't re-query them. Otherwise, mark them to be un-queried
          // next time we clean up the current geohashes queried dictionary.
          var keys = Object.keys(this._currentGeohashesQueried);
          keys.forEach(function (geohashQueryStr) {
              var index = geohashesToQuery.indexOf(geohashQueryStr);
              if (index === -1) {
                  _this._currentGeohashesQueried[geohashQueryStr].active = false;
              }
              else {
                  _this._currentGeohashesQueried[geohashQueryStr].active = true;
                  geohashesToQuery.splice(index, 1);
              }
          });
          // If we are not already cleaning up the current geohashes queried and we have more than 25 of them,
          // kick off a timeout to clean them up so we don't create an infinite number of unneeded queries.
          if (this._geohashCleanupScheduled === false && Object.keys(this._currentGeohashesQueried).length > 25) {
              this._geohashCleanupScheduled = true;
              this._cleanUpCurrentGeohashesQueriedTimeout = setTimeout(this._cleanUpCurrentGeohashesQueried, 10);
          }
          // Keep track of which geohashes have been processed so we know when to fire the 'ready' event
          this._outstandingGeohashReadyEvents = geohashesToQuery.slice();
          // Loop through each geohash to query for and listen for new geohashes which have the same prefix.
          // For every match, attach a value callback which will fire the appropriate events.
          // Once every geohash to query is processed, fire the 'ready' event.
          geohashesToQuery.forEach(function (toQueryStr) {
              // decode the geohash query string
              var query = _this._stringToQuery(toQueryStr);
              // Create the Firebase query
              var firebaseQuery = _this._firebaseRef.orderByChild('g').startAt(query[0]).endAt(query[1]);
              // For every new matching geohash, determine if we should fire the 'key_entered' event
              var childAddedCallback = firebaseQuery.on('child_added', function (a) { return _this._childAddedCallback(a); });
              var childRemovedCallback = firebaseQuery.on('child_removed', function (a) { return _this._childRemovedCallback(a); });
              var childChangedCallback = firebaseQuery.on('child_changed', function (a) { return _this._childChangedCallback(a); });
              // Once the current geohash to query is processed, see if it is the last one to be processed
              // and, if so, mark the value event as fired.
              // Note that Firebase fires the 'value' event after every 'child_added' event fires.
              var valueCallback = firebaseQuery.on('value', function () {
                  firebaseQuery.off('value', valueCallback);
                  _this._geohashQueryReadyCallback(toQueryStr);
              });
              // Add the geohash query to the current geohashes queried dictionary and save its state
              _this._currentGeohashesQueried[toQueryStr] = {
                  active: true,
                  childAddedCallback: childAddedCallback,
                  childRemovedCallback: childRemovedCallback,
                  childChangedCallback: childChangedCallback,
                  valueCallback: valueCallback
              };
          });
          // Based upon the algorithm to calculate geohashes, it's possible that no 'new'
          // geohashes were queried even if the client updates the radius of the query.
          // This results in no 'READY' event being fired after the .updateCriteria() call.
          // Check to see if this is the case, and trigger the 'READY' event.
          if (geohashesToQuery.length === 0) {
              this._geohashQueryReadyCallback();
          }
      };
      /**
       * Encodes a query as a string for easier indexing and equality.
       *
       * @param query The query to encode.
       * @returns The encoded query as string.
       */
      GeoQuery.prototype._queryToString = function (query) {
          if (query.length !== 2) {
              throw new Error('Not a valid geohash query: ' + query);
          }
          return query[0] + ':' + query[1];
      };
      /**
       * Removes the location from the local state and fires any events if necessary.
       *
       * @param key The key to be removed.
       * @param currentLocation The current location as [latitude, longitude] pair or null if removed.
       */
      GeoQuery.prototype._removeLocation = function (key, currentLocation) {
          var locationDict = this._locationsTracked[key];
          delete this._locationsTracked[key];
          if (typeof locationDict !== 'undefined' && locationDict.isInQuery) {
              var distanceFromCenter = (currentLocation) ? distance(currentLocation, this._center) : null;
              this._fireCallbacksForKey('key_exited', key, currentLocation, distanceFromCenter);
          }
      };
      /**
       * Decodes a query string to a query
       *
       * @param str The encoded query.
       * @returns The decoded query as a [start, end] pair.
       */
      GeoQuery.prototype._stringToQuery = function (str) {
          var decoded = str.split(':');
          if (decoded.length !== 2) {
              throw new Error('Invalid internal state! Not a valid geohash query: ' + str);
          }
          return decoded;
      };
      /**
       * Callback for any updates to locations. Will update the information about a key and fire any necessary
       * events every time the key's location changes.
       *
       * When a key is removed from GeoFire or the query, this function will be called with null and performs
       * any necessary cleanup.
       *
       * @param key The key of the geofire location.
       * @param location The location as [latitude, longitude] pair.
       */
      GeoQuery.prototype._updateLocation = function (key, location) {
          validateLocation(location);
          // Get the key and location
          var distanceFromCenter, isInQuery;
          var wasInQuery = (key in this._locationsTracked) ? this._locationsTracked[key].isInQuery : false;
          var oldLocation = (key in this._locationsTracked) ? this._locationsTracked[key].location : null;
          // Determine if the location is within this query
          distanceFromCenter = distance(location, this._center);
          isInQuery = (distanceFromCenter <= this._radius);
          // Add this location to the locations queried dictionary even if it is not within this query
          this._locationsTracked[key] = {
              location: location,
              distanceFromCenter: distanceFromCenter,
              isInQuery: isInQuery,
              geohash: encodeGeohash(location)
          };
          // Fire the 'key_entered' event if the provided key has entered this query
          if (isInQuery && !wasInQuery) {
              this._fireCallbacksForKey('key_entered', key, location, distanceFromCenter);
          }
          else if (isInQuery && oldLocation !== null && (location[0] !== oldLocation[0] || location[1] !== oldLocation[1])) {
              this._fireCallbacksForKey('key_moved', key, location, distanceFromCenter);
          }
          else if (!isInQuery && wasInQuery) {
              this._fireCallbacksForKey('key_exited', key, location, distanceFromCenter);
          }
      };
      return GeoQuery;
  }());

  /**
   * GeoFire is an open-source library that allows you to store and query a set
   * of keys based on their geographic location. At its heart, GeoFire simply
   * stores locations with string keys. Its main benefit, however, is the
   * possibility of retrieving only those keys within a given geographic area -
   * all in realtime.
   *
   * GeoFire 0.0.0
   * https://github.com/firebase/geofire-js/
   * License: MIT
   */
  /**
   * Creates a GeoFire instance.
   */
  var GeoFire = /** @class */ (function () {
      /**
       * @param _firebaseRef A Firebase reference where the GeoFire data will be stored.
       */
      function GeoFire(_firebaseRef) {
          this._firebaseRef = _firebaseRef;
          if (Object.prototype.toString.call(this._firebaseRef) !== '[object Object]') {
              throw new Error('firebaseRef must be an instance of Firebase');
          }
      }
      /********************/
      /*  PUBLIC METHODS  */
      /********************/
      /**
       * Returns a promise fulfilled with the location corresponding to the provided key.
       *
       * If the provided key does not exist, the returned promise is fulfilled with null.
       *
       * @param key The key of the location to retrieve.
       * @returns A promise that is fulfilled with the location of the given key.
       */
      GeoFire.prototype.get = function (key) {
          validateKey(key);
          return this._firebaseRef.child(key).once('value').then(function (dataSnapshot) {
              var snapshotVal = dataSnapshot.val();
              if (snapshotVal === null) {
                  return null;
              }
              else {
                  return decodeGeoFireObject(snapshotVal);
              }
          });
      };
      /**
       * Returns the Firebase instance used to create this GeoFire instance.
       *
       * @returns The Firebase instance used to create this GeoFire instance.
       */
      GeoFire.prototype.ref = function () {
          return this._firebaseRef;
      };
      /**
       * Removes the provided key from this GeoFire. Returns an empty promise fulfilled when the key has been removed.
       *
       * If the provided key is not in this GeoFire, the promise will still successfully resolve.
       *
       * @param key The key of the location to remove.
       * @returns A promise that is fulfilled after the inputted key is removed.
       */
      GeoFire.prototype.remove = function (key) {
          return this.set(key, null);
      };
      /**
       * Adds the provided key - location pair(s) to Firebase. Returns an empty promise which is fulfilled when the write is complete.
       *
       * If any provided key already exists in this GeoFire, it will be overwritten with the new location value.
       *
       * @param keyOrLocations The key representing the location to add or a mapping of key - location pairs which
       * represent the locations to add.
       * @param location The [latitude, longitude] pair to add.
       * @returns A promise that is fulfilled when the write is complete.
       */
      GeoFire.prototype.set = function (keyOrLocations, location) {
          var locations;
          if (typeof keyOrLocations === 'string' && keyOrLocations.length !== 0) {
              // If this is a set for a single location, convert it into a object
              locations = {};
              locations[keyOrLocations] = location;
          }
          else if (typeof keyOrLocations === 'object') {
              if (typeof location !== 'undefined') {
                  throw new Error('The location argument should not be used if you pass an object to set().');
              }
              locations = keyOrLocations;
          }
          else {
              throw new Error('keyOrLocations must be a string or a mapping of key - location pairs.');
          }
          var newData = {};
          Object.keys(locations).forEach(function (key) {
              validateKey(key);
              var location = locations[key];
              if (location === null) {
                  // Setting location to null is valid since it will remove the key
                  newData[key] = null;
              }
              else {
                  validateLocation(location);
                  var geohash = encodeGeohash(location);
                  newData[key] = encodeGeoFireObject(location, geohash);
              }
          });
          return this._firebaseRef.update(newData);
      };
      /**
       * Returns a new GeoQuery instance with the provided queryCriteria.
       *
       * @param queryCriteria The criteria which specifies the GeoQuery's center and radius.
       * @return A new GeoQuery object.
       */
      GeoFire.prototype.query = function (queryCriteria) {
          return new GeoQuery(this._firebaseRef, queryCriteria);
      };
      /********************/
      /*  STATIC METHODS  */
      /********************/
      /**
       * Static method which calculates the distance, in kilometers, between two locations,
       * via the Haversine formula. Note that this is approximate due to the fact that the
       * Earth's radius varies between 6356.752 km and 6378.137 km.
       *
       * @param location1 The [latitude, longitude] pair of the first location.
       * @param location2 The [latitude, longitude] pair of the second location.
       * @returns The distance, in kilometers, between the inputted locations.
       */
      GeoFire.distance = function (location1, location2) {
          return distance(location1, location2);
      };
      return GeoFire;
  }());

  exports.GeoCallbackRegistration = GeoCallbackRegistration;
  exports.GeoFire = GeoFire;
  exports.GeoQuery = GeoQuery;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
