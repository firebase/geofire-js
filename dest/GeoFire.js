// GeoFire is a JavaScript library that allows you to store and query a set of
// keys based on their geographic location. GeoFire uses Firebase for data
// storage, allowing query results to be updated in realtime as they change.
//
//   GeoFire 2.0.0
//   https://github.com/firebase/geoFire/
//   License: MIT

//(function(){
//  "use strict";
var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

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

/** public functions **/

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

// TODO: delete before releasing or make it like Firebase.enableLogging()
var GEOFIRE_DEBUG = true;
console.log("Note: debug set to " + GEOFIRE_DEBUG);

function log(message) {
  if (GEOFIRE_DEBUG) {
    console.log(message);
  }
}

/**
 * Helper functions to detect invalid inputs
 */
var validateKey = function (key) {
  return new RSVP.Promise(function(resolve, reject) {
    var error;

    if (typeof key !== "string") {
      error = "key must be a string";
    }

    if (error !== undefined) {
      reject("Invalid key '" + key + "': " + error);
    }
    else {
      resolve();
    }
  });
};

var validateLocation = function (location) {
  return new RSVP.Promise(function(resolve, reject) {
    var error;

    // Setting location to null is valid since it will remove the location key from Firebase
    if (location === null) {
      resolve();
    }

    if (!(location instanceof Array) || location.length !== 2) {
      error = "expected 2 values, got " + location.length;
    }
    else {
      var latitude = location[0];
      var longitude = location[1];

      if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
        error = "latitude must be a number within the range [-90, 90]";
      }
      else if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
        error = "longitude must be a number within the range [-180, 180]";
      }
    }

    if (error !== undefined) {
      reject("Invalid location [" + location + "]: " + error);
    }
    else {
      resolve();
    }
  });
};

/**
 * Helper functions to write to Firebase
 */
var updateFirebaseIndex = function(firebaseRef, key, location) {
  log("updateFirebaseIndex() called");
  return new RSVP.Promise(function(resolve, reject) {
    // Setting location to null will remove key from the Firebase so there is nothing to do here
    if (location === null) {
      resolve();
    }

    // TODO: make sure 12 is correct; want 1 meter precision
    firebaseRef.child("indices/" + encodeGeohash(location, 12)).set(key, function(error) {
      if (error) {
        reject("Firebase synchronization failed: " + error);
      }
      else {
        log("write to /indices/");
        resolve();
      }
    });
  });
};

var updateFirebaseLocation = function(firebaseRef, key, location, allLocations) {
  log("updateFirebaseLocation() called");
  var removeOldIndex = function() {
    return new RSVP.Promise(function(resolve, reject) {
      if (allLocations[key] !== undefined) {
        // TODO: make sure 12 is correct; want 1 meter precision
        firebaseRef.child("indices/" + encodeGeohash(allLocations[key].split(",").map(Number), 12)).remove(function(error) {
          if (error) {
            reject("Firebase synchronization failed: " + error);
          }
          else {
            log("removal of /indices/");
            resolve();
          }
        });
      }
      else {
        resolve();
      }
    }.bind(this));

    /*return new RSVP.Promise(function(resolve, reject) {
      firebaseRef.child("locations/" + key).once("value", function(locationsChildSnapshot) {
        if (locationsChildSnapshot.val()) {
          // TODO: make sure 12 is correct; want 1 meter precision
          firebaseRef.child("indices/" + encodeGeohash(locationsChildSnapshot.val().split(",").map(Number), 12)).remove(function(error) {
            if (error) {
              reject("Firebase synchronization failed: " + error);
            }
            else {
              log("removal of /indices/");
              resolve();
            }
          });
        }
        else {
          resolve();
        }
      });
    });*/
  };

  var updateLocation = function() {
    return new RSVP.Promise(function(resolve, reject) {
      firebaseRef.child("locations/" + key).set(location ? location.toString() : null, function(error) {
        if (error) {
          reject("Firebase synchronization failed: " + error);
        }
        else {
          log("write to /locations/");
          resolve();
        }
      });
    });
  };

  return removeOldIndex().then(function() {
    return updateLocation();
  });
};



/**
 * Creates a GeoCallbackRegistration instance.
 *
 * @constructor
 * @this {GeoFire}
 * @param {function} cancelCallback Function to call when the callback is cancelled.
 */
var GeoCallbackRegistration = function(cancelCallback) {
  if (typeof cancelCallback !== "function") {
    throw new Error("GeoCallbackRegistration.cancel() callback must be a function.");
  }

  this._cancelCallback = cancelCallback;
};

/**
 * Cancels this GeoCallbackRegistration so that it no longer fires callbacks.
 */
GeoCallbackRegistration.prototype.cancel = function() {
  this._cancelCallback();
  delete this._cancelCallback;
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
  this._saveQueryCriteria(queryCriteria);
  this._firebaseRef = firebaseRef;
  this._callbacks = {
    "onKeyMoved": [],
    "onKeyEntered": [],
    "onKeyLeft": []
  };
  this._locationsInQuery = {};
  this._allLocations = {};

  this._firebaseRef.child("indices").on("child_added", function(indicesChildSnapshot) {
    var locationKey = indicesChildSnapshot.val();

    this._firebaseRef.child("locations/" + locationKey).once("value", function(locationsDataSnapshot) {
      var location = locationsDataSnapshot.val().split(",").map(Number);

      this._allLocations[locationKey] = location;

      this._fireCallbacks(locationKey, location);
    }.bind(this));
  }.bind(this));

  // Fire the onKeyLeft() event if a location in the query is removed entirely from geoFire
  this._firebaseRef.child("locations").on("child_removed", function(locationsChildSnapshot) {
    var locationKey = locationsChildSnapshot.name();
    if (this._locationsInQuery[locationKey] !== undefined) {
      this._callbacks.onKeyLeft.forEach(function(callback) {
        callback(locationKey, this._allLocations[locationKey]);
      }.bind(this));
      delete this._allLocations[locationKey];
    }
  }.bind(this));
};


GeoQuery.prototype._fireCallbacks = function(locationKey, location) {
  var wasAlreadyInQuery = (this._locationsInQuery[locationKey] !== undefined);
  var isNowInQuery = (dist(location, this._center) <= this._radius);
  if (!wasAlreadyInQuery && isNowInQuery) {
    log(locationKey + " entered GeoQuery");
    this._callbacks.onKeyEntered.forEach(function(callback) {
      callback(locationKey, location);
    });

    // Add the current location key to our list of location keys within this GeoQuery
    this._locationsInQuery[locationKey] = location;
  }
  else if (wasAlreadyInQuery && !isNowInQuery) {
    log(locationKey + " left GeoQuery");
    this._callbacks.onKeyLeft.forEach(function(callback) {
      callback(locationKey, location);
    });

    // Remove the current location key from our list of location keys within this GeoQuery
    delete this._locationsInQuery[locationKey];
  }
  else if (wasAlreadyInQuery) {
    log(locationKey + " moved within GeoQuery");
    this._callbacks.onKeyMoved.forEach(function(callback) {
      callback(locationKey, location);
    });

    // Update the current location's location
    this._locationsInQuery[locationKey] = location;
  }
};


/**
 * Returns a promise fulfilled with the locations inside of this GeoQuery.
 *
 * @return {promise} A promise that is fulfilled with an array of locations which are inside of this
 *                   GeoQuery. The array takes the form of { key1: location1, key2: location2, ... }.
 */
GeoQuery.prototype.getResults = function() {
  return new RSVP.Promise(function(resolve) {
    var results = [];
    for (var key in this._locationsInQuery) {
      if (this._locationsInQuery.hasOwnProperty(key)) {
        results.push([key, this._locationsInQuery[key]]);
      }
    }
    resolve(results);
  }.bind(this));
};

/**
 * Sets this GeoQuery's onKeyEntered() callback.
 *
 * @param {function} callback Callback function to be called when a key enters this GeoQuery.
 * @return {GeoCallbackRegistration} A callback registration which can be used to cancel the onKeyEntered() callback.
 */
GeoQuery.prototype.onKeyEntered = function(callback) {
  if (typeof callback !== "function") {
    throw new Error("onKeyEntered() callback must be a function.");
  }

  this._callbacks.onKeyEntered.push(callback);

  // Fire the onKeyEntered() callback for every location already within our GeoQuery
  for (var key in this._locationsInQuery) {
    if (this._locationsInQuery.hasOwnProperty(key)) {
      callback(key, this._locationsInQuery[key]);
    }
  }

  return new GeoCallbackRegistration(function() {
    this._callbacks.onKeyEntered.splice(this._callbacks.onKeyEntered.indexOf(callback), 1);
  }.bind(this));
};

/**
 * Sets this GeoQuery's onKeyLeft() callback.
 *
 * @param {function} callback Callback function to be called when a key leaves this GeoQuery.
 * @return {GeoCallbackRegistration} A callback registration which can be used to cancel the onKeyLeft() callback.
 */
GeoQuery.prototype.onKeyLeft = function(callback) {
  if (typeof callback !== "function") {
    throw new Error("onKeyLeft() callback must be a function.");
  }

  this._callbacks.onKeyLeft.push(callback);

  return new GeoCallbackRegistration(function() {
    this._callbacks.onKeyLeft.splice(this._callbacks.onKeyLeft.indexOf(callback), 1);
  }.bind(this));
};

/**
 * Sets this GeoQuery's onKeyMoved() callback.
 *
 * @param {function} callback Callback function to be called when a key within this GeoQuery moves.
 * @return {GeoCallbackRegistration} A callback registration which can be used to cancel the onKeyMoved() callback.
 */
GeoQuery.prototype.onKeyMoved = function(callback) {
  if (typeof callback !== "function") {
    throw new Error("onKeyMoved() callback must be a function.");
  }

  this._callbacks.onKeyMoved.push(callback);

  return new GeoCallbackRegistration(function() {
    this._callbacks.onKeyMoved.splice(this._callbacks.onKeyMoved.indexOf(callback), 1);
  }.bind(this));
};

/**
 * Terminates this GeoQuery so that it no longer sends location updates.
 */
GeoQuery.prototype.cancel = function () {
  this._callbacks = {
      "onKeyMoved": [],
      "onKeyEntered": [],
      "onKeyLeft": []
  };

  this._firebaseRef.child("indices").off();
  this._firebaseRef.child("locations").off();
};

/**
 * Updates this GeoQuery's query criteria.
 *
 * @param {object} newQueryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
 */
GeoQuery.prototype.updateQueryCriteria = function(newQueryCriteria) {
  this._saveQueryCriteria(newQueryCriteria);

  // Loop through all of the locations and fire the onKeyEntered() or onKeyLeft() callbacks if necessary
  for (var key in this._allLocations) {
    if (this._allLocations.hasOwnProperty(key)) {
      this._fireCallbacks(key, this._allLocations[key]);
    }
  }
};

/**
 * Overwrites this GeoQuery's current query criteria with the inputted one.
 *
 * @param {object} newQueryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
 */
GeoQuery.prototype._saveQueryCriteria = function(newQueryCriteria) {
  // Validate the inputs
  if (newQueryCriteria.type === undefined) {
    throw new Error("No \"type\" attribute specified for query criteria.");
  }
  else {
    if (newQueryCriteria.type !== "circle" && newQueryCriteria.type !== "square") {
      throw new Error("Invalid \"type\" attribute specified for query criteria. Valid types are \"circle\" and \"square\".");
    }
  }

  if (newQueryCriteria.center === undefined) {
    throw new Error("No \"center\" attribute specified for query criteria.");
  }
  else {
    if (!(newQueryCriteria.center instanceof Array) || newQueryCriteria.center.length !== 2) {
      throw new Error("Invalid \"center\" attribute specified for query criteria. Expected array of length 2, got " + newQueryCriteria._center.length);
    }
    else {
      var latitude = newQueryCriteria.center[0];
      var longitude = newQueryCriteria.center[1];

      if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
        throw new Error("Invalid \"center\" attribute specified for query criteria. Latitude must be a number within the range [-90, 90]");
      }
      else if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
        throw new Error("Invalid \"center\" attribute specified for query criteria. Longitude must be a number within the range [-180, 180]");
      }
    }
  }

  if (newQueryCriteria.radius === undefined) {
    throw new Error("No \"radius\" attribute specified for query criteria.");
  }
  else {
    if (typeof newQueryCriteria.radius !== "number" || newQueryCriteria.radius < 0) {
      throw new Error("Invalid \"radius\" attribute specified for query criteria. Radius must be a number greater than or equal to 0.");
    }
  }

  this._type = newQueryCriteria.type;
  this._center = newQueryCriteria.center;
  this._centerHash = encodeGeohash(newQueryCriteria.center, 12);  // TODO: is 12 the correct value here?
  this._radius = newQueryCriteria.radius;
};



/**
 * Creates a GeoFire instance.
 *
 * @constructor
 * @this {GeoFire}
 * @param {object} firebaseRef A Firebase reference.
 */
var GeoFire = function (firebaseRef) {
  this._firebaseRef = firebaseRef;

  // Keep track of all of the locations
  this._allLocations = {};
  this._firebaseRef.child("locations").on("child_added", function(locationsChildSnapshot) {
    this._allLocations[locationsChildSnapshot.name()] = locationsChildSnapshot.val();
  }.bind(this));
  this._firebaseRef.child("locations").on("child_removed", function(locationsChildSnapshot) {
    delete this._allLocations[locationsChildSnapshot.name()];
  }.bind(this));
};

/**
 * Returns a promise after adding the key-location pair.
 *
 * @param {string} key The key of the location to add.
 * @param {array} location A latitude/longitude pair
 * @return {promise} A promise that is fulfilled when the write is complete.
 */
GeoFire.prototype.set = function (key, location) {
  log("set(" + key + ", [" + location + "]) called");
  return RSVP.all([validateKey(key), validateLocation(location)]).then(function() {
    return updateFirebaseLocation(this._firebaseRef, key, location, this._allLocations);
  }.bind(this)).then(function() {
    return updateFirebaseIndex(this._firebaseRef, key, location);
  }.bind(this));
};

/**
 * Returns a promise that is fulfilled with the location corresponding to the given key.
 * Note: If the key does not exist, null is returned.   // TODO: is this what we want?
 *
 * @param {string} key The key of the location to retrieve.
 * @return {promise} A promise that is fulfilled with the location of the given key.
 */
GeoFire.prototype.get = function (key) {
  log("get(" + key + ") called");
  return validateKey(key).then(function() {
    return new RSVP.Promise(function(resolve, reject) {
      this._firebaseRef.child("locations/" + key).once("value", function(dataSnapshot) {
        resolve(dataSnapshot.val() ? dataSnapshot.val().split(",").map(Number) : null);
      }, function(error) {
        reject(error);
      });
    }.bind(this));
  }.bind(this));
};

/**
 * Returns a promise that is fulfilled after the location corresponding to the given key is removed.
 *
 * @param {string} key The ID/key of the location to retrieve.
 * @return {promise} A promise that is fulfilled with the location of the given ID/key.
 */
GeoFire.prototype.remove = function (key) {
  return this.set(key, null);
};

/**
 * Creates and returns a GeoQuery object.
 *
 * @param {object} queryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
 * @return {GeoQuery} The new GeoQuery object.
 */
GeoFire.prototype.query = function(criteria) {
  return new GeoQuery(this._firebaseRef, criteria);
};
//  return GeoFire;
//})();

//Make sure this works in node.
if (typeof module !== "undefined") {
  module.exports = GeoFire;
}