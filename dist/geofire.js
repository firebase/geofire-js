// GeoFire is a JavaScript library that allows you to store and query a set of
// keys based on their geographic location. GeoFire uses Firebase for data
// storage, allowing query results to be updated in realtime as they change.
//
//   GeoFire 2.0.0
//   https://github.com/firebase/geofire/
//   License: MIT

// Include RSVP if this is being run in node
if (typeof module !== "undefined" && typeof process !== "undefined") {
  var RSVP = require("RSVP");
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
          previousLocation = previousLocation.split(",").map(Number);
          if (location !== null && location[0] === previousLocation[0] && location[1] === previousLocation[1]) {
            resolve(false);
          }

          // Otherwise, overwrite the previous index
          else {
            _firebaseRef.child("i/" + encodeGeohash(previousLocation, g_GEOHASH_PRECISION) + key).remove(function(error) {
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
      _firebaseRef.child("l/" + key).set(location ? location.toString() : null, function(error) {
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
        _firebaseRef.child("i/" + encodeGeohash(location, g_GEOHASH_PRECISION) + key).set(true, function(error) {
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

// TODO: Investigate the correct value for this and maybe make it user configurable
// Default geohash length
var g_GEOHASH_PRECISION = 12;

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
      callback(key, locationDict.location, locationDict.distanceFromCenter);
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
   * every time its location changes. It also fires any necessary events when the key's location
   * changes.
   *
   * When the provided key is removed from GeoFire, this value callback will remove itself and delete
   * the globally stored information about the key.
   *
   * @param {string} key The key for which to attach the value callback.
   */
  function _attachValueCallback(key) {
    var locationValueCallback = _firebaseRef.child("l/" + key).on("value", function(locationsDataSnapshot) {
      // Get the key's current location
      var location = locationsDataSnapshot.val() ? locationsDataSnapshot.val().split(",").map(Number) : null;

      // If this is the first time we are receiving the location for this key, check if we should fire the
      // "key_entered" event
      if (typeof _locationsQueried[key] === "undefined" || _locationsQueried[key].isInQuery === false) {
        if (location === null) {
          _firebaseRef.child("l/" + key).off("value", _locationsQueried[key].valueCallback);
          delete _locationsQueried[key];
        }
        else {
          // Determine if the location was and is now within this query
          var distanceFromCenter = GeoFire.distance(location, _center);
          var isInQuery = (distanceFromCenter <= _radius);

          // Add this location to the all locations queried dictionary even if it is not added to the list of
          // locations within this query
          _locationsQueried[key] = {
            location: location,
            distanceFromCenter: distanceFromCenter,
            isInQuery: isInQuery,
            valueCallback: locationValueCallback
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

          // TODO: should I do this?
          //if (!_locationsQueried[key].isInQuery) {
          //  _firebaseRef.child("l/" + key).off("value", _locationsQueried[key].valueCallback);
          //}
        }
      }

      // Otherwise,
      else {
        if (location === null || location[0] !== _locationsQueried[key].location[0] || location[1] !== _locationsQueried[key].location[1]) {
          // If the updated location has changed, calculate if it is still in this query
          _locationsQueried[key].location = location;
          _locationsQueried[key].distanceFromCenter = (location === null) ? null : GeoFire.distance(location, _center);
          _locationsQueried[key].isInQuery = (location === null) ? false : (_locationsQueried[key].distanceFromCenter <= _radius);

          // If the updated location is still in the query, fire the "key_moved" event and save the key's updated
          // location in the list of keys in this query
          if (_locationsQueried[key].isInQuery) {
            _fireCallbacksForKey("key_moved", key);
          }

          // Otherwise, fire the "key_exited" event, cancel the key's value callback, and remove it from the list of
          // locations in this query
          else {
            _fireCallbacksForKey("key_exited", key);

            if (location === null) {
              _firebaseRef.child("l/" + key).off("value", _locationsQueried[key].valueCallback);
              delete _locationsQueried[key];
            }
          }
        }
      }
    });
  }

  /**
   * Attaches listeners to Firebase which track when new keys are added near this query.
   */
  function _listenForNewGeohashes() {
    //console.groupCollapsed("_listenForNewGeohashes()");
    //console.time("TOTAL _listenForNewGeohashes()");
    //console.time("Get center hash at zoom level");
    // Approximate the bounding box dimensions depending on hash length
    var boundingBoxShortestEdgeByHashLength = [
      null,
      5003.771699005143,
      625.4714623756429,
      156.36786559391072,
      19.54598319923884,
      4.88649579980971,
      0.6108119749762138
    ];

    // Determine a zoom level at which to find neighboring geohashes
    var zoomLevel = 6;
    while (_radius > boundingBoxShortestEdgeByHashLength[zoomLevel]) {
      zoomLevel -= 1;
    }

    // Get the geohash for this query's center at the determined zoom level
    var centerHash = encodeGeohash(_center, g_GEOHASH_PRECISION).substring(0, zoomLevel);
    //console.timeEnd("Get center hash at zoom level");

    // Get the list of geohashes to query
    //console.time("neighbors()");
    var geohashesToQuery = neighbors(centerHash);
    geohashesToQuery.push(centerHash);
    //console.timeEnd("neighbors()");

    // Filter out empty geohashes and duplicate geohashes
    //console.time("Filter out duplicates");
    geohashesToQuery = geohashesToQuery.filter(function(geohash, i){
      return (geohash !== "" && geohashesToQuery.indexOf(geohash) === i);
    });
    //console.timeEnd("Filter out duplicates");

    // For all of the geohashes that we are already currently querying, check if they are still
    // supposed to be queried. If so, don't re-query them. Otherwise, stop querying them and remove
    // them from the current geohashes queried dictionary.
    console.time("Compare to current geohashes queried");
    //console.log(geohashesToQuery.length);
    //console.log(geohashesToQuery);
    //console.log(_currentGeohashesQueried);
    for (var geohashStartPrefix in _currentGeohashesQueried) {
      if (_currentGeohashesQueried.hasOwnProperty(geohashStartPrefix)) {
        var index = geohashesToQuery.indexOf(geohashStartPrefix);
        if (index === -1) {
          // TODO: cancel all _locationsQueried[key] listeners with that startprefix
          //_firebaseRef.child("i").off("child_added");
          _currentGeohashesQueried[geohashStartPrefix].shouldDelete = true;
          //_firebaseRef.child("i").off("child_added", _currentGeohashesQueried[geohashStartPrefix].childAddedCallback);
          //delete _currentGeohashesQueried[geohashStartPrefix];
          // TODO: I'm deleting it right awway and then trying to deref it
        }
        else {
          geohashesToQuery.splice(index, 1);
        }
      }
    }
    console.timeEnd("Compare to current geohashes queried");

    //console.groupCollapsed("Query geohashes");
    //console.log(geohashesToQuery);
    //console.time("TOTAL Query geohashes");
    // Keep track of how many geohashes have been processed so we know when to fire the "ready" event
    var numGeohashesToQueryProcessed = 0;

    // Loop through each geohash to query for and listen for new geohashes which have the same prefix.
    // For every match, determine if we should fire the "key_entered" or "key_moved" events.
    // Once every geohash to query is processed, fire the "ready" event.
    for (var i = 0, numGeohashesToQuery = geohashesToQuery.length; i < numGeohashesToQuery; ++i) {
      //console.groupCollapsed("Querying geohash " + i);
      //console.time("TOTAL Querying geohash " + i);

      //console.time("Getting prefixes");
      // Set the start prefix as a subset of the current geohash
      var startPrefix = geohashesToQuery[i].substring(0, zoomLevel);

      // Set the end prefix as the start prefix plus a ~ to put it last in alphabetical order
      var endPrefix = startPrefix + "~";
      //console.timeEnd("Getting prefixes");

      //console.time("Get firebase query");
      // Create the Firebase query
      var firebaseQuery = _firebaseRef.child("i").startAt(null, startPrefix).endAt(null, endPrefix);
      //console.timeEnd("Get firebase query");

      //console.time("childAddedCallback");
      /* jshint -W083 */
      // For every new matching geohash, determine if we should fire the "key_entered" event
      var childAddedCallback = firebaseQuery.on("child_added", function(indicesChildSnapshot) {
        if (!_valueEventFired) {
          _numChildAddedEventsToProcess++;
        }

        var key = indicesChildSnapshot.name().slice(g_GEOHASH_PRECISION);

        // If the key is not already in this query, check if it should be added
        if (typeof _locationsQueried[key] === "undefined") {
          _attachValueCallback(key);
        }
      });
      //console.timeEnd("childAddedCallback");

      //console.time("once value");

      // Add the geohash to the current geohashes queried dictionary
      _currentGeohashesQueried[startPrefix] = {
        childAddedCallback: childAddedCallback,
        shouldDelete: false
      };

      // Once the current geohash to query is processed, see if it is the last one to be processed
      // and, if so, flip the corresponding variable.
      // The "value" event will fire after every "child_added" event fires.
      firebaseQuery.once("value", function() {
        numGeohashesToQueryProcessed++;
        _valueEventFired = (numGeohashesToQueryProcessed === geohashesToQuery.length);

        // It's possible that there are no more child added events to process and that the "ready"
        // event will therefore not get called. We should call the "ready" event in that case.
        if (_valueEventFired && _numChildAddedEventsToProcess === 0) {
          _fireReadyEventCallbacks();
        }
      });
      //console.timeEnd("once value");
      /* jshint +W083 */
      //console.timeEnd("Querying geohash " + i);
      //console.groupEnd("Querying geohash " + i);
    }
    //console.timeEnd("TOTAL Query geohashes");
    //console.groupEnd("Query geohashes");
    //console.timeEnd("TOTAL _listenForNewGeohashes()");
    //console.groupEnd("_listenForNewGeohashes()");
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
    //console.group("updateCriteria()");
    //console.time("TOTAL updateCriteria()");
    // Save the new query criteria
    //console.time("_saveCriteria()");
    // Validate and save the new query criteria
    validateCriteria(newQueryCriteria);
    _center = newQueryCriteria.center || _center;
    _radius = newQueryCriteria.radius || _radius;
    //console.timeEnd("_saveCriteria()");

    //console.time("Fire \"key_exited\" and \"key_entered\"");
    // Loop through all of the locations in the query, update their distance from the center of the
    // query, and fire any appropriate events
    for (var key in _locationsQueried) {
      if (_locationsQueried.hasOwnProperty(key)) {
        // Get the cached information for this location
        var locationDict = _locationsQueried[key];

        // Save if the location was already in the query
        var wasAlreadyInQuery = locationDict.isInQuery;

        // Update the location's distance to the new query center
        locationDict.distanceFromCenter = GeoFire.distance(locationDict.location, _center);

        // Determine if the location is now in this query
        locationDict.isInQuery = (locationDict.distanceFromCenter <= _radius);

        // If the location just left the query, fire the "key_exited" callbacks
        if (wasAlreadyInQuery && !locationDict.isInQuery) {
          _fireCallbacksForKey("key_exited", key);

          // TODO: do I need to do this?
          //_firebaseRef.child("l/" + key).off("value", locationDict.valueCallback);
        }

        // If the location just entered the query, fire the "key_entered" callbacks
        else if (!wasAlreadyInQuery && locationDict.isInQuery) {
          _fireCallbacksForKey("key_entered", key);
        }
      }
    }
    //console.timeEnd("Fire \"key_exited\" and \"key_entered\"");

    // Reset the variables which control when the "ready" event fires
    //console.time("_listenForNewGeohashes()");
    _valueEventFired = false;
    _numChildAddedEventsToProcess = 0;

    // Listen for new geohashes being added to GeoFire and fire the appropriate events
    _listenForNewGeohashes();
    //console.timeEnd("_listenForNewGeohashes()");

    //console.timeEnd("TOTAL updateCriteria()");
    //console.groupEnd("updateCriteria()");
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
      throw new Error("Event type must be \"key_entered\", \"key_exited\", or \"key_moved\"");
    }
    if (typeof callback !== "function") {
      throw new Error("Event callback must be a function.");
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

    // Turn off all Firebase listeners for this query
    //_firebaseRef.child("i").off("child_added");
    for (var geohashStartPrefix in _currentGeohashesQueried) {
      if (_currentGeohashesQueried.hasOwnProperty(geohashStartPrefix)) {
        _firebaseRef.child("i").off("child_added", _currentGeohashesQueried[geohashStartPrefix].childAddedCallback);
        delete _currentGeohashesQueried[geohashStartPrefix];
      }
    }

    // Loop through all of the locations in the query and cancel their value change event callbacks
    for (var key in _locationsQueried) {
      if (_locationsQueried.hasOwnProperty(key)) {
        _firebaseRef.child("l/" + key).off("value", _locationsQueried[key].valueCallback);
        delete _locationsQueried[key];
      }
    }
  };


  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  // Firebase reference of the GeoFire which created this query
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

  // A dictionary of keys which were queried for the current criteria
  // Note that not all of these are currently within this query
  var _locationsQueried = {};

  // A dictionary of geohashes which currently have an active "child_added" event callback
  var _currentGeohashesQueried = {};
  /*setInterval(function() {
    for (var geohashStartPrefix in _currentGeohashesQueried) {
      if (_currentGeohashesQueried.hasOwnProperty(geohashStartPrefix)) {
        console.log(_currentGeohashesQueried[geohashStartPrefix].shouldDelete);
        if (_currentGeohashesQueried[geohashStartPrefix].shouldDelete === true) {
          _firebaseRef.child("i").off("child_added", _currentGeohashesQueried[geohashStartPrefix].childAddedCallback);
          delete _currentGeohashesQueried[geohashStartPrefix];
        }
      }
    }
  }, 5000);*/

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