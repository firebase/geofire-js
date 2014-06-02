// GeoFire is a JavaScript library that allows you to store and query a set of
// keys based on their geographic location. GeoFire uses Firebase for data
// storage, allowing query results to be updated in realtime as they change.
//
//   GeoFire 2.0.0
//   https://github.com/firebase/geoFire/
//   License: MIT

var GeoFire = (function() {
  "use strict";
/**
 * Creates a GeoCallbackRegistration instance.
 *
 * @constructor
 * @this {GeoFire}
 * @param {function} cancelCallback Function to call when the callback is cancelled.
 */
var GeoCallbackRegistration = function(cancelCallback) {
  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Cancels this GeoCallbackRegistration so that it no longer fires callbacks.
   */
  this.cancel = function() {
    if (typeof _cancelCallback !== "undefined") {
      _cancelCallback();
      _cancelCallback = undefined;
    }
  };

  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  if (typeof cancelCallback !== "function") {
    throw new Error("GeoCallbackRegistration.cancel() callback must be a function.");
  }

  var _cancelCallback = cancelCallback;
};
/*************/
/*  GLOBALS  */
/*************/
// TODO: Investigate the correct value for this
var g_GEOHASH_LENGTH = 12;

/**
 * Creates a GeoFire instance.
 *
 * @constructor
 * @this {GeoFire}
 * @param {object} firebaseRef A Firebase reference where the GeoFire data will be stored.
 */
var GeoFire = function(firebaseRef) {
  /*********************/
  /*  PRIVATE METHODS  */
  /*********************/
  /**
   * Returns a promise that is fulfilled after the inputted key has been verified.
   *
   * @param {string/number} key A GeoFire key.
   * @return {promise} A promise that is fulfilled when the verification is complete.
   */
  function _validateKey(key) {
    return new RSVP.Promise(function(resolve, reject) {
      var error;

      if (typeof key !== "string" && typeof key !== "number") {
        error = "key must be a string or a number";
      }

      if (error !== undefined) {
        reject("Error: Invalid key \"" + key + "\": " + error);
      }
      else {
        resolve();
      }
    });
  }

  /**
   * Returns a promise that is fulfilled after the inputted location has been verified.
   *
   * @param {array} location A latitude/longitude pair.
   * @return {promise} A promise that is fulfilled when the verification is complete.
   */
  function _validateLocation(location) {
    return new RSVP.Promise(function(resolve, reject) {
      var error;

      // Setting location to null is valid since it will remove the location key from Firebase
      if (location === null) {
        resolve();
      }

      if (Object.prototype.toString.call(location) !== "[object Array]" || location.length !== 2) {
        error = "expected array of length 2, got " + location.length;
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

      if (error !== undefined) {
        reject("Error: Invalid location [" + location + "]: " + error);
      }
      else {
        resolve();
      }
    });
  }

  /**
   * Returns a promise that is fulfilled after key's previous location has been removed from the /indices/
   * node in Firebase. If the key's previous location is the same as its new location, Firebase is not
   * updated.
   *
   * @param {string/number} key The key of the location to add.
   * @param {array} location A latitude/longitude pair.
   * @return {promise} A promise that is fulfilled when the write is over.
   */
  function _removePreviousIndex(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      _firebaseRef.child("locations/" + key).once("value", function(locationsChildSnapshot) {
        // If the key is not in GeoFire, there is no old index to remove
        var previousLocation = locationsChildSnapshot.val();
        if (previousLocation === null) {
          resolve(location !== null);
        }
        else {
          // If the location is not changing, there is no need to do anything
          previousLocation = previousLocation.split(",").map(Number);
          if (location !== null && location[0] === previousLocation[0] && location[1] === previousLocation[1]) {
            resolve(false);
          }

          // Otherwise, overwrite the previous index
          _firebaseRef.child("indices/" + encodeGeohash(previousLocation, g_GEOHASH_LENGTH) + key).remove(function(error) {
            if (error) {
              reject("Error: Firebase synchronization failed: " + error);
            }
            else {
              resolve(true);
            }
          });
        }
      }, function(error) {
        reject("Error: Firebase synchronization failed: " + error);
      });
    });
  }

  /**
   * Returns a promise that is fulfilled after key-location pair has been added to the /locations/ node
   * in Firebase.
   *
   * @param {string/number} key The key of the location to add.
   * @param {array} location A latitude/longitude pair.
   * @return {promise} A promise that is fulfilled when the write is over.
   */
  function _updateLocationsNode(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      _firebaseRef.child("locations/" + key).set(location ? location.toString() : null, function(error) {
        if (error) {
          reject("Error: Firebase synchronization failed: " + error);
        }
        else {
          resolve();
        }
      });
    });
  }

  /**
   * Returns a promise that is fulfilled after key-location pair has been added to the /indices/ node
   * in Firebase. If the location is null, Firebase is not updated.
   *
   * @param {string/number} key The key of the location to add.
   * @param {array} location A latitude/longitude pair.
   * @return {promise} A promise that is fulfilled when the write is over.
   */
  function _updateIndicesNode(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      // If the new location is null, there is no need to update it
      if (location === null) {
        resolve();
      }
      else {
        _firebaseRef.child("indices/" + encodeGeohash(location, g_GEOHASH_LENGTH) + key).set(true, function(error) {
          if (error) {
            reject("Error: Firebase synchronization failed: " + error);
          }
          else {
            resolve();
          }
        });
      }
    });
  }

  /**
   * Returns a promise that is fulfilled with the location corresponding to the given key.
   * Note: If the key does not exist, null is returned.
   *
   * @param {string/number} key The key of the location to retrieve.
   * @return {promise} A promise that is fulfilled with the location of the given key.
   */
  function _getLocation(key) {
    return new RSVP.Promise(function(resolve, reject) {
      _firebaseRef.child("locations/" + key.toString()).once("value", function(dataSnapshot) {
        resolve(dataSnapshot.val() ? dataSnapshot.val().split(",").map(Number) : null);
      }, function(error) {
        reject("Error: Firebase synchronization failed: " + error);
      });
    });
  }


  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Returns a promise after adding the key-location pair.
   *
   * @param {string/number} key The key of the location to add.
   * @param {array} location A latitude/longitude pair.
   * @return {promise} A promise that is fulfilled when the write is complete.
   */
  this.set = function(key, location) {
    return new RSVP.all([_validateKey(key), _validateLocation(location)]).then(function() {
      return _removePreviousIndex(key, location);
    }).then(function(locationChanged) {
      // If the location has actually changed, update Firebase; otherwise, just return an empty promise
      if (locationChanged) {
        return new RSVP.all([_updateLocationsNode(key, location), _updateIndicesNode(key, location)]);
      }
      else {
        return new RSVP.Promise(function(resolve) { resolve(); });
      }
    });
  };

  /**
   * Returns a promise that is fulfilled with the location corresponding to the given key.
   * Note: If the key does not exist, null is returned.
   *
   * @param {string/number} key The key of the location to retrieve.
   * @return {promise} A promise that is fulfilled with the location of the given key.
   */
  this.get = function(key) {
    return _validateKey(key).then(function() {
      return _getLocation(key);
    });
  };

  /**
   * Returns a promise that is fulfilled after the location corresponding to the given key is removed.
   *
   * @param {string/number} key The key of the location to remove.
   * @return {promise} A promise that is fulfilled after the inputted key is removed.
   */
  this.remove = function(key) {
    return this.set(key, null);
  };

  /**
   * Creates and returns a GeoQuery object.
   *
   * @param {object} queryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
   * @return {GeoQuery} The new GeoQuery object.
   */
  this.query = function(queryCriteria) {
    return new GeoQuery(_firebaseRef, queryCriteria);
  };

  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  // Private variables
  var _firebaseRef = firebaseRef;
};

var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

var NEIGHBORS = {
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

var BORDERS = {
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

  if (BORDERS[direction][type].indexOf(lastChar) !== -1) {
    if (base.length <= 0) {
      return "";
    }
    base = neighbor(base, direction);
  }

  return base + BASE32[NEIGHBORS[direction][type].indexOf(lastChar)];
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
      hash += BASE32[hashVal];
      hashVal = 0;
    }
  }

  return hash;
};
/**
 * Creates a GeoQuery instance.
 *
 * @constructor
 * @this {GeoQuery}
 * @param {object} firebaseRef A Firebase reference.
 * @param {object} queryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
 */
var GeoQuery = function (firebaseRef, queryCriteria) {
  /*********************/
  /*  PRIVATE METHODS  */
  /*********************/
  /**
   * Overwrites this GeoQuery's current query criteria with the inputted one.
   *
   * @param {object} newQueryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
   */
  function _saveCriteria(newQueryCriteria) {
    // Throw an error if there are any extraneous attributes
    for (var key in newQueryCriteria) {
      if (newQueryCriteria.hasOwnProperty(key)) {
        if (key !== "center" && key !== "radius") {
          throw new Error("Unexpected \"" + key + "\" attribute found in query criteria.");
        }
      }
    }

    // Validate the "center" attribute
    if (typeof newQueryCriteria.center !== "undefined") {
      if (Object.prototype.toString.call(newQueryCriteria.center) !== "[object Array]" || newQueryCriteria.center.length !== 2) {
        throw new Error("Invalid \"center\" attribute specified for query criteria. Expected array of length 2, got " + newQueryCriteria._center.length);
      }
      else {
        var latitude = newQueryCriteria.center[0];
        var longitude = newQueryCriteria.center[1];

        if (typeof latitude !== "number") {
          throw new Error("Invalid \"center\" attribute specified for query criteria. Latitude must be a number.");
        }
        else if (latitude < -90 || latitude > 90) {
          throw new Error("Invalid \"center\" attribute specified for query criteria. Latitude must be within the range [-90, 90].");
        }
        else if (typeof longitude !== "number") {
          throw new Error("Invalid \"center\" attribute specified for query criteria. Longitude must be a number.");
        }
        else if (longitude < -180 || longitude > 180) {
          throw new Error("Invalid \"center\" attribute specified for query criteria. Longitude must be within the range [-180, 180].");
        }
      }
    }

    // Validate the "radius" attribute
    if (typeof newQueryCriteria.radius !== "undefined") {
      if (typeof newQueryCriteria.radius !== "number") {
        throw new Error("Invalid \"radius\" attribute specified for query criteria. Radius must be a number.");
      }
      else if (newQueryCriteria.radius < 0) {
        throw new Error("Invalid \"radius\" attribute specified for query criteria. Radius must be greater than or equal to 0.");
      }
    }

    // Save the query criteria
    _center = newQueryCriteria.center || _center;
    _radius = newQueryCriteria.radius || _radius;
  }


  // TODO: function description/comment
  function _fireKeyEnteredAndMovedCallbacks(key, location) {
    var distanceFromCenter = dist(location, _center);
    var wasAlreadyInQuery = (_locationsInQuery[key] !== undefined);
    var isNowInQuery = (distanceFromCenter <= _radius);

    if (!wasAlreadyInQuery && isNowInQuery) {
      _callbacks.key_entered.forEach(function(callback) {
        callback(key, location, distanceFromCenter);
      });

      // Add the current location key to our list of location keys within this GeoQuery
      _locationsInQuery[key] = location;
    }
    else if (wasAlreadyInQuery && isNowInQuery) {
      _callbacks.key_moved.forEach(function(callback) {
        callback(key, location, distanceFromCenter);
      });

      // Update the current location's location
      _locationsInQuery[key] = location;
    }
  }

  // TODO: function description/comment
  function _fireKeyExitedCallbacks(key, location) {
    var wasAlreadyInQuery = (_locationsInQuery[key] !== undefined);
    var distanceFromCenter = (location === null) ? null : dist(location, _center);
    var isNowInQuery = (location === null) ? false : (distanceFromCenter <= _radius);

    if (wasAlreadyInQuery && !isNowInQuery) {
      console.log(_callbacks.key_exited);
      _callbacks.key_exited.forEach(function(callback) {
        callback(key, location, distanceFromCenter);
      });

      // Remove the current location key from our list of location keys within this GeoQuery
      delete _locationsInQuery[key];
    }
  }

  /**
     * Find all data points within the specified radius, in kilometers,
     * from the point with the specified geohash.
     * The matching points are passed to the callback function in distance sorted order.
     * If the setAlert flag is set, the callback function is called each time the search results change i.e.
     * if the set of data points that are within the radius changes.
     */
  function _listenForKeys() {
    // An approximation of the bounding box dimension per hash length.
    var boundingBoxShortestEdgeByHashLength = [
      null,
      5003.771699005143,
      625.4714623756429,
      156.36786559391072,
      19.54598319923884,
      4.88649579980971,
      0.6108119749762138
    ];
    var zoomLevel = 6;
    while (_radius > boundingBoxShortestEdgeByHashLength[zoomLevel]) {
      zoomLevel -= 1;
    }

    // Reduce the length of the query center's hash
    var centerHash = encodeGeohash(_center, g_GEOHASH_LENGTH).substring(0, zoomLevel);

    // TODO: Be smarter about this, and only zoom out if actually optimal.
    // Get the neighboring geohashes to query
    var neighborGeohashes = neighbors(centerHash);

    // Make sure we also query the center geohash
    neighborGeohashes.push(centerHash);

    // Remove any duplicate or empty neighboring geohashes
    neighborGeohashes = neighborGeohashes.filter(function(item, i){
      return (item.length > 0 && neighborGeohashes.indexOf(item) === i);
    });

    // Listen for added and removed geohashes which have the same prefix as the neighboring geohashes
    for (var i = 0, numNeighbors = neighborGeohashes.length; i < numNeighbors; ++i) {
      // Set the start prefix as a subset of the current neighbor's geohash
      var startPrefix = neighborGeohashes[i].substring(0, zoomLevel);

      // Set the end prefix as the start prefix plus a ~ to put it last in alphabetical order
      var endPrefix = startPrefix + "~";

      // Query firebase for any matching geohashes
      var firebaseQuery = _firebaseRef.child("indices").startAt(null, startPrefix).endAt(null, endPrefix);

      var childAddedCallback = firebaseQuery.on("child_added", function(indicesChildSnapshot) {
        console.log("child_added: " + indicesChildSnapshot.name());
        var key = indicesChildSnapshot.name().slice(g_GEOHASH_LENGTH);

        _firebaseRef.child("locations/" + key).once("value", function(locationsDataSnapshot) {
          var location = locationsDataSnapshot.val().split(",").map(Number);

          _fireKeyEnteredAndMovedCallbacks(key, location, "child_added");
        });
      });
      _firebaseChildAddedCallbacks.push(childAddedCallback);

      var childRemovedCallback = firebaseQuery.on("child_removed", function(indicesChildSnapshot) {
        console.log("child_removed: " + indicesChildSnapshot.name());
        var key = indicesChildSnapshot.name().slice(g_GEOHASH_LENGTH);
        window.setTimeout(function() {
          _firebaseRef.child("locations/" + key).once("value", function(locationsDataSnapshot) {
            var location = locationsDataSnapshot.val() ? locationsDataSnapshot.val().split(",").map(Number) : null;

            _fireKeyExitedCallbacks(key, location);
          });
        }, 100);
      });
      _firebaseChildRemovedCallbacks.push(childRemovedCallback);
    }
  }

  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Returns a promise fulfilled with the locations inside of this GeoQuery.
   *
   * @return {promise} A promise that is fulfilled with an array of locations which are inside of this
   *                   GeoQuery. The array takes the form of { key1: location1, key2: location2, ... }.
   */
  this.results = function() {
    return new RSVP.Promise(function(resolve) {
      var results = [];
      for (var key in _locationsInQuery) {
        if (_locationsInQuery.hasOwnProperty(key)) {
          results.push({
            key: key,
            location: _locationsInQuery[key]
            // TODO: add distance
          });
        }
      }
      resolve(results);
    });
  };

  /**
   * Attaches a callback to this GeoQuery for a given event type.
   *
   * @param {string} eventType The event type for which to attach the callback. One of "ready", "key_entered", "key_exited", or "key_moved".
   * @param {function} callback Callback function to be called when an event of type eventType fires.
   * @return {GeoCallbackRegistration} A callback registration which can be used to cancel the provided callback.
   */
  this.on = function(eventType, callback) {
    if (["ready", "key_entered", "key_exited", "key_moved"].indexOf(eventType) === -1) {
      throw new Error("Event type must be \"key_entered\", \"key_exited\", or \"key_moved\"");
    }
    if (typeof callback !== "function") {
      throw new Error("Event callback must be a function.");
    }

    // Add the callback to this GeoQuery's callbacks list
    _callbacks[eventType].push(callback);

    // Fire the "key_entered" callback for every location already within our GeoQuery
    if (eventType === "key_entered") {
      for (var key in _locationsInQuery) {
        if (_locationsInQuery.hasOwnProperty(key)) {
          callback(key, _locationsInQuery[key], dist(_locationsInQuery[key], _center));
        }
      }
    }

    // Return an event registration which can be used to cancel the callback
    return new GeoCallbackRegistration(function() {
      _callbacks[eventType].splice(_callbacks[eventType].indexOf(callback), 1);
    });
  };

  /**
   * Terminates this GeoQuery so that it no longer sends location updates.
   */
  this.cancel = function () {
    _callbacks = {
      ready: [],
      key_entered: [],
      key_exited: [],
      key_moved: []
    };

    // TODO: only cancel this particular instance of the callback; add test for this
    _firebaseRef.child("indices").off("child_added");
    _firebaseRef.child("locations").off("child_removed");
  };

  /**
   * Updates this GeoQuery's query criteria.
   *
   * @param {object} newQueryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
   */
  this.updateCriteria = function(newQueryCriteria) {
    _saveCriteria(newQueryCriteria);

    // Turn off all Firebase listeners for the previous query criteria
    _firebaseChildAddedCallbacks.forEach(function(childAddedCallback) {
      _firebaseRef.child("indices").off("child_added", childAddedCallback);
    });
    _firebaseChildRemovedCallbacks.forEach(function(childRemovedCallback) {
      _firebaseRef.child("indices").off("child_removed", childRemovedCallback);
    });

    _firebaseChildAddedCallbacks = [];
    _firebaseChildRemovedCallbacks = [];

    // Loop through all of the locations in the query and fire the "key_exited" callbacks if necessary
    for (var key in _locationsInQuery) {
      if (_locationsInQuery.hasOwnProperty(key)) {
        _fireKeyExitedCallbacks(key, _locationsInQuery[key]);
      }
    }

    // Listen for keys being added and removed from GeoFire and fire the appropriate event callbacks
    _listenForKeys();
  };

  /**
   * Returns this GeoQuery's center.
   *
   * @return {array} The [latitude, longitude] pair signifying the center of this GeoQuery.
   */
  this.center = function() {
    return _center;
  };

  /**
   * Returns this GeoQuery's radius.
   *
   * @return {integer} The radius of this GeoQuery.
   */
  this.radius = function() {
    return _radius;
  };

  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  // Private variables
  var _firebaseRef = firebaseRef;
  var _callbacks = {
    ready: [],
    key_entered: [],
    key_exited: [],
    key_moved: []
  };
  var _firebaseChildAddedCallbacks = [];
  var _firebaseChildRemovedCallbacks = [];
  var _locationsInQuery = {};
  var _center, _radius;

  // Verify the query criteria
  if (typeof queryCriteria.center === "undefined") {
    throw new Error("No \"center\" attribute specified for query criteria.");
  }
  if (typeof queryCriteria.radius === "undefined") {
    throw new Error("No \"radius\" attribute specified for query criteria.");
  }
  _saveCriteria(queryCriteria);

  // Listen for keys being added and removed from GeoFire and fire the appropriate event callbacks
  _listenForKeys();
};
  return GeoFire;
})();

//Make sure this works in node.
if (typeof module !== "undefined") {
  module.exports = GeoFire;
}