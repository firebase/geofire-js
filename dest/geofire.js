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
      hash += "0123456789bcdefghjkmnpqrstuvwxyz"[hashVal];
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
    _centerHash = encodeGeohash(_center, g_GEOHASH_LENGTH);
    _radius = newQueryCriteria.radius || _radius;
  }


  function _fireCallbacks(key, location) {
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
    else if (wasAlreadyInQuery && !isNowInQuery) {
      _callbacks.key_exited.forEach(function(callback) {
        callback(key, location, distanceFromCenter);
      });

      // Remove the current location key from our list of location keys within this GeoQuery
      delete _locationsInQuery[key];
    }
    else if (wasAlreadyInQuery) {
      _callbacks.key_moved.forEach(function(callback) {
        callback(key, location, distanceFromCenter);
      });

      // Update the current location's location
      _locationsInQuery[key] = location;
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

    // Loop through all of the locations and fire the "key_entered" or "key_exited" callbacks if necessary
    for (var key in _allLocations) {
      if (_allLocations.hasOwnProperty(key)) {
        _fireCallbacks(key, _allLocations[key]);
      }
    }
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
  var _locationsInQuery = {};
  var _allLocations = {};
  var _center, _radius, _centerHash;

  // Verify the query criteria
  if (typeof queryCriteria.center === "undefined") {
    throw new Error("No \"center\" attribute specified for query criteria.");
  }
  if (typeof queryCriteria.radius === "undefined") {
    throw new Error("No \"radius\" attribute specified for query criteria.");
  }
  _saveCriteria(queryCriteria);

  // Fire any key events for new or existing indices
  _firebaseRef.child("indices").on("child_added", function(indicesChildSnapshot) {
    console.log("child_added");
    var key = indicesChildSnapshot.name().slice(g_GEOHASH_LENGTH);

    _firebaseRef.child("locations/" + key).once("value", function(locationsDataSnapshot) {
      var location = locationsDataSnapshot.val().split(",").map(Number);

      _allLocations[key] = location;

      _fireCallbacks(key, location);
    });
  });

  // Fire the "ready" event once the data is loaded
  _firebaseRef.child("indices").once("value", function(snapshot) {
    console.log("value");
    _callbacks.ready.forEach(function(callback) {
      callback();
    });
  });

  // Fire the "key_exited" callbacks if a location in the query is removed entirely from GeoFire
  _firebaseRef.child("locations").on("child_removed", function(locationsChildSnapshot) {
    // Get the key of the location being removed
    var key = locationsChildSnapshot.name();

    // If the removed location is in this query, fire the "key_exited" callbacks for it and remove
    // it from the locations in query dictionary
    if (_locationsInQuery[key] !== undefined) {
      var distanceFromCenter = dist(_locationsInQuery[key], _center);
      _callbacks.key_exited.forEach(function(callback) {
        callback(key, _locationsInQuery[key], distanceFromCenter);
      });
      delete _locationsInQuery[key];
    }

    // Remove the location from the all locations dictionary
    delete _allLocations[key];
  });
};
  return GeoFire;
})();

//Make sure this works in node.
if (typeof module !== "undefined") {
  module.exports = GeoFire;
}