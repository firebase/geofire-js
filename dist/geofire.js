// GeoFire is a JavaScript library that allows you to store and query a set of
// keys based on their geographic location. GeoFire uses Firebase for data
// storage, allowing query results to be updated in realtime as they change.
//
//   GeoFire 2.1.0
//   https://github.com/firebase/geofire/
//   License: MIT

// Include RSVP if this is being run in node
if (typeof module !== "undefined" && typeof process !== "undefined") {
  var RSVP = require("rsvp");
}

var GeoFire = (function() {
  "use strict";
/**
 * Creates a GeoCallbackRegistration instance.
 *
 * @constructor
 * @this {GeoCallbackRegistration}
 * @param {function} cancelCallback Callback to run when this callback registration is cancelled.
 */
var GeoCallbackRegistration = function(cancelCallback) {
  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Cancels this callback registration so that it no longer fires its callback. This
   * has no effect on any other callback registrations you may have created.
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
    throw new Error("callback must be a function");
  }

  var _cancelCallback = cancelCallback;
};
/*************/
/*  GLOBALS  */
/*************/
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
   * Returns a promise that is fulfilled after the provided key's previous location has been removed
   * from the /indices/ node in Firebase.
   *
   * If the provided key's previous location is the same as its new location, Firebase is not updated.
   *
   * @param {string} key The key of the location to add.
   * @param {array} location The provided key's new [latitude, longitude] pair.
   * @return {RSVP.Promise} A promise that is fulfilled when the write is over.
   */
  function _removePreviousIndex(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      _firebaseRef.child("l/" + key).once("value", function(locationsChildSnapshot) {
        // If the key is not in GeoFire, there is no old index to remove
        var previousLocation = locationsChildSnapshot.val();
        if (previousLocation === null) {
          resolve(location !== null);
        }
        else {
          // If the location is not changing, there is no need to do anything
          if (location !== null && location[0] === previousLocation[0] && location[1] === previousLocation[1]) {
            resolve(false);
          }

          // Otherwise, overwrite the previous index
          else {
            _firebaseRef.child("i/" + encodeGeohash(previousLocation, g_GEOHASH_PRECISION) + ":" + key).remove(function(error) {
              if (error) {
                reject("Error: Firebase synchronization failed: " + error);
              }
              else {
                resolve(true);
              }
            });
          }
        }
      }, function(error) {
        reject("Error: Firebase synchronization failed: " + error);
      });
    });
  }

  /**
   * Returns a promise that is fulfilled after the provided key-location pair has been added to the
   * /locations/ node in Firebase.
   *
   * @param {string} key The key of the location to add.
   * @param {array} location The provided key's new [latitude, longitude] pair.
   * @return {RSVP.Promise} A promise that is fulfilled when the write is over.
   */
  function _updateLocationsNode(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      _firebaseRef.child("l/" + key).set(location, function(error) {
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
   * Returns a promise that is fulfilled after provided key-location pair has been added to the
   * /indices/ node in Firebase.
   *
   * If the provided location is null, Firebase is not updated.
   *
   * @param {string} key The key of the location to add.
   * @param {array} location The provided key's new [latitude, longitude] pair.
   * @return {RSVP.Promise} A promise that is fulfilled when the write is over.
   */
  function _updateIndicesNode(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      // If the new location is null, there is no need to update it
      if (location === null) {
        resolve();
      }
      else {
        _firebaseRef.child("i/" + encodeGeohash(location, g_GEOHASH_PRECISION) + ":" + key).set(true, function(error) {
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
   * Returns a promise fulfilled with the location corresponding to the provided key.
   *
   * If the key does not exist, the returned promise is fulfilled with null.
   *
   * @param {string} key The key whose location should be retrieved.
   * @return {RSVP.Promise} A promise that is fulfilled with the location of the provided key.
   */
  function _getLocation(key) {
    return new RSVP.Promise(function(resolve, reject) {
      _firebaseRef.child("l/" + key).once("value", function(dataSnapshot) {
        resolve(dataSnapshot.val());
      }, function(error) {
        reject("Error: Firebase synchronization failed: " + error);
      });
    });
  }


  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Returns the Firebase instance used to create this GeoFire instance.
   *
   * @return {Firebase} The Firebase instance used to create this GeoFire instance.
   */
  this.ref = function() {
    return _firebaseRef;
  };

  /**
   * Adds the provided key - location pair to Firebase. Returns an empty promise which is fulfilled when the write is complete.
   *
   * If the provided key already exists in this GeoFire, it will be overwritten with the new location value.
   *
   * @param {string} key The key representing the location to add.
   * @param {array} location The [latitude, longitude] pair to add.
   * @return {RSVP.Promise} A promise that is fulfilled when the write is complete.
   */
  this.set = function(key, location) {
    validateKey(key);
    if (location !== null) {
      // Setting location to null is valid since it will remove the key
      validateLocation(location);
    }

    return _removePreviousIndex(key, location).then(function(locationChanged) {
      // If the location has actually changed, update Firebase; otherwise, just return an empty promise
      if (locationChanged === true) {
        return new RSVP.all([_updateLocationsNode(key, location), _updateIndicesNode(key, location)]);
      }
      else {
        return new RSVP.Promise(function(resolve) { resolve(); });
      }
    });
  };

  /**
   * Returns a promise fulfilled with the location corresponding to the provided key.
   *
   * If the provided key does not exist, the returned promise is fulfilled with null.
   *
   * @param {string} key The key of the location to retrieve.
   * @return {RSVP.Promise} A promise that is fulfilled with the location of the given key.
   */
  this.get = function(key) {
    validateKey(key);

    return _getLocation(key);
  };

  /**
   * Removes the provided key from this GeoFire. Returns an empty promise fulfilled when the key has been removed.
   *
   * If the provided key is not in this GeoFire, the promise will still successfully resolve.
   *
   * @param {string} key The key of the location to remove.
   * @return {RSVP.Promise} A promise that is fulfilled after the inputted key is removed.
   */
  this.remove = function(key) {
    return this.set(key, null);
  };

  /**
   * Returns a new GeoQuery instance with the provided queryCriteria.
   *
   * @param {object} queryCriteria The criteria which specifies the GeoQuery's center and radius.
   * @return {GeoQuery} A new GeoQuery object.
   */
  this.query = function(queryCriteria) {
    return new GeoQuery(_firebaseRef, queryCriteria);
  };

  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  if (firebaseRef instanceof Firebase === false) {
    throw new Error("firebaseRef must be an instance of Firebase");
  }

  var _firebaseRef = firebaseRef;
};

/**
 * Static method which calculates the distance, in kilometers, between two locations,
 * via the Haversine formula. Note that this is approximate due to the fact that the
 * Earth's radius varies between 6356.752 km and 6378.137 km.
 *
 * @param {array} location1 The [latitude, longitude] pair of the first location.
 * @param {array} location2 The [latitude, longitude] pair of the second location.
 * @return {number} The distance, in kilometers, between the inputted locations.
 */
GeoFire.distance = function(location1, location2) {
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
};

// Default geohash length
var g_GEOHASH_PRECISION = 10;

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
/**
 * Creates a GeoQuery instance.
 *
 * @constructor
 * @this {GeoQuery}
 * @param {object} firebaseRef A Firebase reference.
 * @param {object} queryCriteria The criteria which specifies the query's center and radius.
 */
var GeoQuery = function (firebaseRef, queryCriteria) {
  /*********************/
  /*  PRIVATE METHODS  */
  /*********************/
  /**
   * Fires each callback for the provided eventType, passing it provided key's data.
   *
   * @param {string} eventType The event type whose callbacks to fire. One of "key_entered", "key_exited", or "key_moved".
   * @param {string} key The key of the location for which to fire the callbacks.
   */
  function _fireCallbacksForKey(eventType, key) {
    var locationDict = _locationsQueried[key];
    _callbacks[eventType].forEach(function(callback) {
      if (typeof locationDict === "undefined") {
        callback(key, null, null);
      }
      else {
        callback(key, locationDict.location, locationDict.distanceFromCenter);
      }
    });
  }

  /**
   * Fires each callback for the "ready" event.
   */
  function _fireReadyEventCallbacks() {
    _callbacks.ready.forEach(function(callback) {
      callback();
    });
  }

  /**
   * Attaches a value callback for the provided key which will update the information about the key
   * and fire any necessary events every time the key's location changes.
   *
   * When the key is removed from GeoFire, this value callback will remove itself and delete the globally
   * stored information about the key.
   *
   * @param {Firebase DataSnapshot} indicesChildSnapshot A snapshot of the data stored for this geohash.
   */
  function _attachValueCallback(indicesChildSnapshot) {
    // If the below "value" event has not fired yet, we should wait to the the "ready" event until
    // this child added event is completely processed
    if (_valueEventFired === false) {
      _numChildAddedEventsToProcess++;
    }

    // Get the key from the child snapshot's name, which has the form "<geohash>:<key>"
    var key = indicesChildSnapshot.name().split(":").splice(1).join(":");

    // If the key is not already being queried, add it and attach a "value" callback to it
    if (typeof _locationsQueried[key] === "undefined") {
      _locationsQueried[key] = {
        isInQuery: false
      };

      _firebaseRef.child("l/" + key).on("value", _locationValueCallback);
    }
  }

  /**
   * Represents the value callback which will update the information about a key and fire any necessary
   * events every time the key's location changes.
   *
   * When the key is removed from GeoFire, this value callback will remove itself and delete the globally
   * stored information about the key.
   *
   * @param {Firebase DataSnapshot} locationsDataSnapshot A snapshot of the data stored for this location.
   */
  function _locationValueCallback(locationsDataSnapshot) {
    // Get the key and location
    var key = locationsDataSnapshot.name();
    var location = locationsDataSnapshot.val();
    var distanceFromCenter, isInQuery;

    // If this key is not already in the query, check if we should fire the "key_entered" event
    if (_locationsQueried[key].isInQuery === false) {
      // If the location has been removed from GeoFire, cancel this callback and delete the location
      if (location === null) {
        _firebaseRef.child("l/" + key).off("value", _locationValueCallback);
        delete _locationsQueried[key];
      }

      // Otherwise, create or update the information for this location and fire the "key_entered" event if
      // necessary
      else {
        // Determine if the location is within this query
        distanceFromCenter = GeoFire.distance(location, _center);
        isInQuery = (distanceFromCenter <= _radius);

        // Add this location to the locations queried dictionary even if it is not within this query
        _locationsQueried[key] = {
          location: location,
          distanceFromCenter: distanceFromCenter,
          isInQuery: isInQuery,
          geohash: encodeGeohash(location, g_GEOHASH_PRECISION)
        };

        // Fire the "key_entered" event if the provided key has entered this query
        if (isInQuery) {
          _fireCallbacksForKey("key_entered", key);
        }

        // Fire the "key_ready" event if we have processed all the "child_added" events and the "value" event has fired
        if (_numChildAddedEventsToProcess > 0) {
          _numChildAddedEventsToProcess--;
          if (_valueEventFired && _numChildAddedEventsToProcess === 0) {
            _fireReadyEventCallbacks();
          }
        }
      }
    }

    // Otherwise, the location is already within our query and we should check if we need to fire the "key_moved" or
    // "key_exited" event
    else {
      // If the location has been removed from GeoFire, cancel this callback and delete the location
      if (location === null) {
          _firebaseRef.child("l/" + key).off("value", _locationValueCallback);
          delete _locationsQueried[key];
          _fireCallbacksForKey("key_exited", key);
      }

      // Otherwise, if the location has actually changed, fire the "key_moved" or "key_exited" event
      else if (location[0] !== _locationsQueried[key].location[0] || location[1] !== _locationsQueried[key].location[1]) {
        // Calculate if the location is still in this query
        distanceFromCenter = GeoFire.distance(location, _center);
        isInQuery = (distanceFromCenter <= _radius);

        // Update the location's data
        _locationsQueried[key] = {
          location: location,
          distanceFromCenter: distanceFromCenter,
          isInQuery: isInQuery,
          geohash: encodeGeohash(location, g_GEOHASH_PRECISION)
        };

        // Fire the "key_moved" or "key_exited" event
        if (isInQuery) {
          _fireCallbacksForKey("key_moved", key);
        }
        else {
          _fireCallbacksForKey("key_exited", key);
        }
      }
    }
  }

  /**
   * Checks if we have processed all of the geohashes to query and fires the ready event if necessary.
   */
  function _checkIfShouldFireReadyEvent() {
    // Increment the number of geohashes processed and set the "value" event as fired if we have
    // processed all of the geohashes we were expecting to process.
    _numGeohashesToQueryProcessed++;
    _valueEventFired = (_numGeohashesToQueryProcessed === _geohashesToQuery.length);

    // It's possible that there are no more child added events to process and that the "ready"
    // event will therefore not get called. We should call the "ready" event in that case.
    if (_valueEventFired && _numChildAddedEventsToProcess === 0) {
      _fireReadyEventCallbacks();
    }
  }

  /**
   * Attaches listeners to Firebase which track when new geohashes are added within this query's
   * bounding box.
   */
  function _listenForNewGeohashes() {
    // Determine a zoom level at which to find neighboring geohashes
    var zoomLevel = 6;
    while (_radius > g_BOUNDING_BOX_SHORTEST_EDGE_BY_GEOHASH_LENGTH[zoomLevel]) {
      zoomLevel -= 1;
    }

    // Get the geohash for this query's center at the determined zoom level
    var centerHash = encodeGeohash(_center, g_GEOHASH_PRECISION).substring(0, zoomLevel);

    // Get the list of geohashes to query
    _geohashesToQuery = neighbors(centerHash);
    _geohashesToQuery.push(centerHash);

    // Filter out empty and duplicate geohashes
    _geohashesToQuery = _geohashesToQuery.filter(function(geohash, i){
      return (geohash !== "" && _geohashesToQuery.indexOf(geohash) === i);
    });

    // For all of the geohashes that we are already currently querying, check if they are still
    // supposed to be queried. If so, don't re-query them. Otherwise, mark them to be un-queried
    // next time we clean up the current geohashes queried dictionary.
    for (var geohashStartPrefix in _currentGeohashesQueried) {
      if (_currentGeohashesQueried.hasOwnProperty(geohashStartPrefix)) {
        var index = _geohashesToQuery.indexOf(geohashStartPrefix);
        if (index === -1) {
          _currentGeohashesQueried[geohashStartPrefix] = false;
        }
        else {
          _currentGeohashesQueried[geohashStartPrefix] = true;
          _geohashesToQuery.splice(index, 1);
        }
      }
    }

    // Keep track of how many geohashes have been processed so we know when to fire the "ready" event
    _numGeohashesToQueryProcessed = 0;

    // Loop through each geohash to query for and listen for new geohashes which have the same prefix.
    // For every match, attach a value callback which will fire the appropriate events.
    // Once every geohash to query is processed, fire the "ready" event.
    for (var i = 0, numGeohashesToQuery = _geohashesToQuery.length; i < numGeohashesToQuery; ++i) {
      // Set the start prefix as a subset of the current geohash
      var startPrefix = _geohashesToQuery[i].substring(0, zoomLevel);

      // Set the end prefix as the start prefix plus ~ to put it last in alphabetical order
      var endPrefix = startPrefix + "~";

      // Create the Firebase query
      var firebaseQuery = _firebaseRef.child("i").startAt(null, startPrefix).endAt(null, endPrefix);

      // Add the geohash start prefix to the current geohashes queried dictionary and mark it as not
      // to be un-queried
      _currentGeohashesQueried[startPrefix] = true;

      // For every new matching geohash, determine if we should fire the "key_entered" event
      firebaseQuery.on("child_added", _attachValueCallback);

      // Once the current geohash to query is processed, see if it is the last one to be processed
      // and, if so, mark the value event as fired.
      // Note that Firebase fires the "value" event after every "child_added" event fires.
      firebaseQuery.once("value", _checkIfShouldFireReadyEvent);
    }
  }

  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Returns the location signifying the center of this query.
   *
   * @return {array} The [latitude, longitude] pair signifying the center of this query.
   */
  this.center = function() {
    return _center;
  };

  /**
   * Returns the radius of this query, in kilometers.
   *
   * @return {integer} The radius of this query, in kilometers.
   */
  this.radius = function() {
    return _radius;
  };

  /**
   * Updates the criteria for this query.
   *
   * @param {object} newQueryCriteria The criteria which specifies the query's center and radius.
   */
  this.updateCriteria = function(newQueryCriteria) {
    // Validate and save the new query criteria
    validateCriteria(newQueryCriteria);
    _center = newQueryCriteria.center || _center;
    _radius = newQueryCriteria.radius || _radius;

    // Loop through all of the locations in the query, update their distance from the center of the
    // query, and fire any appropriate events
    for (var key in _locationsQueried) {
      if (_locationsQueried.hasOwnProperty(key)) {
        // Get the cached information for this location
        var locationDict = _locationsQueried[key];

        // It's possible that we have added a new location to our queried dictionary
        // in _attachValueCallback() but not yet retrieved its location in _locationValueCallback().
        // Ignore these locations as _locationValueCallback() will fire the required events.
        if (typeof locationDict.location !== "undefined") {
          // Save if the location was already in the query
          var wasAlreadyInQuery = locationDict.isInQuery;

          // Update the location's distance to the new query center
          locationDict.distanceFromCenter = GeoFire.distance(locationDict.location, _center);

          // Determine if the location is now in this query
          locationDict.isInQuery = (locationDict.distanceFromCenter <= _radius);

          // If the location just left the query, fire the "key_exited" callbacks
          if (wasAlreadyInQuery && !locationDict.isInQuery) {
            _fireCallbacksForKey("key_exited", key);
          }

          // If the location just entered the query, fire the "key_entered" callbacks
          else if (!wasAlreadyInQuery && locationDict.isInQuery) {
            _fireCallbacksForKey("key_entered", key);
          }
        }
      }
    }

    // Reset the variables which control when the "ready" event fires
    _valueEventFired = false;
    _numChildAddedEventsToProcess = 0;

    // Listen for new geohashes being added to GeoFire and fire the appropriate events
    _listenForNewGeohashes();
  };

  /**
   * Attaches a callback to this query which will be run when the provided eventType fires. Valid eventType
   * values are "ready", "key_entered", "key_exited", and "key_moved". The ready event callback is passed no
   * parameters. All other callbacks will be passed three parameters: (1) the location's key, (2) the location's
   * [latitude, longitude] pair, and (3) the distance, in kilometers, from the location to this query's center
   *
   * "ready" is used to signify that this query has loaded its initial state and is up-to-date with its corresponding
   * GeoFire instance. "ready" fires when this query has loaded all of the initial data from GeoFire and fired all
   * other events for that data. It also fires every time updateQuery() is called, after all other events have
   * fired for the updated query.
   *
   * "key_entered" fires when a key enters this query. This can happen when a key moves from a location outside of
   * this query to one inside of it or when a key is written to GeoFire for the first time and it falls within
   * this query.
   *
   * "key_exited" fires when a key moves from a location inside of this query to one outside of it. If the key was
   * entirely removed from GeoFire, both the location and distance passed to the callback will be null.
   *
   * "key_moved" fires when a key which is already in this query moves to another location inside of it.
   *
   * Returns a GeoCallbackRegistration which can be used to cancel the callback. You can add as many callbacks
   * as you would like for the same eventType by repeatedly calling on(). Each one will get called when its
   * corresponding eventType fires. Each callback must be cancelled individually.
   *
   * @param {string} eventType The event type for which to attach the callback. One of "ready", "key_entered",
   * "key_exited", or "key_moved".
   * @param {function} callback Callback function to be called when an event of type eventType fires.
   * @return {GeoCallbackRegistration} A callback registration which can be used to cancel the provided callback.
   */
  this.on = function(eventType, callback) {
    // Validate the inputs
    if (["ready", "key_entered", "key_exited", "key_moved"].indexOf(eventType) === -1) {
      throw new Error("event type must be \"ready\", \"key_entered\", \"key_exited\", or \"key_moved\"");
    }
    if (typeof callback !== "function") {
      throw new Error("callback must be a function");
    }

    // Add the callback to this query's callbacks list
    _callbacks[eventType].push(callback);

    // If this is a "key_entered" callback, fire it for every location already within this query
    if (eventType === "key_entered") {
      for (var key in _locationsQueried) {
        if (_locationsQueried.hasOwnProperty(key)) {
          var locationDict = _locationsQueried[key];
          if (locationDict.isInQuery) {
            callback(key, locationDict.location, locationDict.distanceFromCenter);
          }
        }
      }
    }

    // If this is a "ready" callback, fire it if this query is already ready
    if (eventType === "ready") {
      if (_valueEventFired) {
        callback();
      }
    }

    // Return an event registration which can be used to cancel the callback
    return new GeoCallbackRegistration(function() {
      _callbacks[eventType].splice(_callbacks[eventType].indexOf(callback), 1);
    });
  };

  /**
   * Terminates this query so that it no longer sends location updates. All callbacks attached to this
   * query via on() will be cancelled. This query can no longer be used in the future.
   */
  this.cancel = function () {
    // Cancel all callbacks in this query's callback list
    _callbacks = {
      ready: [],
      key_entered: [],
      key_exited: [],
      key_moved: []
    };

    // Turn off all Firebase listeners for the current geohashes being queried
    for (var geohashStartPrefix in _currentGeohashesQueried) {
      if (_currentGeohashesQueried.hasOwnProperty(geohashStartPrefix)) {
        _firebaseRef.child("i").startAt(null, geohashStartPrefix).endAt(null, geohashStartPrefix + "~").off("child_added", _attachValueCallback);
        delete _currentGeohashesQueried[geohashStartPrefix];
      }
    }

    // Loop through all of the locations in the query and cancel their value change event callbacks
    for (var key in _locationsQueried) {
      if (_locationsQueried.hasOwnProperty(key)) {
        _firebaseRef.child("l/" + key).off("value", _locationValueCallback);
        delete _locationsQueried[key];
      }
    }
  };


  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  // Firebase reference of the GeoFire which created this query
  if (firebaseRef instanceof Firebase === false) {
    throw new Error("firebaseRef must be an instance of Firebase");
  }
  var _firebaseRef = firebaseRef;

  // Event callbacks
  var _callbacks = {
    ready: [],
    key_entered: [],
    key_exited: [],
    key_moved: []
  };

  // Variables used to keep track of when to fire the "ready" event
  var _valueEventFired = false;
  var _numChildAddedEventsToProcess = 0;
  var _geohashesToQuery, _numGeohashesToQueryProcessed;

  // A dictionary of keys which were queried for the current criteria
  // Note that not all of these are currently within this query
  var _locationsQueried = {};

  // A dictionary of geohashes which currently have an active "child_added" event callback
  var _currentGeohashesQueried = {};

  // Every ten seconds, clean up the geohashes we are currently querying for. We keep these around
  // for a little while since it's likely that they will need to be re-queried shortly after they
  // move outside of the query's bounding box.
  setInterval(function() {
    for (var geohashStartPrefix in _currentGeohashesQueried) {
      if (_currentGeohashesQueried.hasOwnProperty(geohashStartPrefix)) {
        if (_currentGeohashesQueried[geohashStartPrefix] === false) {
          // Delete the geohash since it should no longer be queried
          _firebaseRef.child("i").startAt(null, geohashStartPrefix).endAt(null, geohashStartPrefix + "~").off("child_added", _attachValueCallback);
          delete _currentGeohashesQueried[geohashStartPrefix];

          // Delete each location which should no longer be queried
          for (var key in _locationsQueried) {
            if (_locationsQueried.hasOwnProperty(key)) {
              if (typeof _locationsQueried[key].geohash !== "undefined" && _locationsQueried[key].geohash.indexOf(geohashStartPrefix) === 0) {
                _firebaseRef.child("l/" + key).off("value", _locationValueCallback);
                delete _locationsQueried[key];
              }
            }
          }
        }
      }
    }
  }, 10000);

  // Validate and save the query criteria
  validateCriteria(queryCriteria, /* requireCenterAndRadius */ true);
  var _center = queryCriteria.center;
  var _radius = queryCriteria.radius;

  // Listen for new geohashes being added around this query and fire the appropriate events
  _listenForNewGeohashes();
};
  return GeoFire;
})();

// Export GeoFire if this is being run in node
if (typeof module !== "undefined" && typeof process !== "undefined") {
  module.exports = GeoFire;
}