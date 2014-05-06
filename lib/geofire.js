// TODO: formalize function descriptions

/**
 * Helper functions to detect invalid inputs
 */
var validateKey = function (key) {
  return new RSVP.Promise(function(resolve, reject) {
    var error;

    if (typeof key !== "string") {
      error = "key must be a string";
    }

    if (error) {
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
    if (location == null) {
      resolve();
    }

    if (!(location instanceof Array) || location.length != 2) {
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

    if (error) {
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
  console.log("updateFirebaseIndex() called");
  return new RSVP.Promise(function(resolve, reject) {
    // Setting location to null will remove key from the Firebase so there is nothing to do here
    if (location == null) {
      resolve();
    }

    // TODO: make sure 12 is correct; want 1 meter precision
    firebaseRef.child("indices/" + encodeGeohash(location, 12)).set(key, function(error) {
      if (error) {
        reject("Firebase synchronization failed: " + error);
      }
      else {
        console.log("write to /indices/");
        resolve();
      }
    });
  });
};

var updateFirebaseLocation = function(firebaseRef, key, location) {
  console.log("updateFirebaseLocation() called");
  var removeOldIndex = function() {
    return new RSVP.Promise(function(resolve, reject) {
      firebaseRef.child("locations/" + key).once("value", function(locationsChildSnapshot) {
        if (locationsChildSnapshot.val()) {
          // TODO: make sure 12 is correct; want 1 meter precision
          firebaseRef.child("indices/" + encodeGeohash(locationsChildSnapshot.val().split(",").map(Number), 12)).remove(function(error) {
            if (error) {
              reject("Firebase synchronization failed: " + error);
            }
            else {
              console.log("removal of /indices/");
              resolve();
            }
          });
        }
        else {
          resolve();
        }
      });
    });
  };

  var updateLocation = function() {
    return new RSVP.Promise(function(resolve, reject) {
      firebaseRef.child("locations/" + key).set(location ? location.toString() : null, function(error) {
        if (error) {
          reject("Firebase synchronization failed: " + error);
        }
        else {
          console.log("write to /locations/");
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
    "onKeyMoved": function() {},
    "onKeyEntered": function() {},
    "onKeyLeft": function() {}
  };
  this._locations = {};

  this._firebaseRef.child("indices").on("child_added", function(indicesChildSnapshot) {
    var locationKey = indicesChildSnapshot.val();

    this._firebaseRef.child("locations/" + locationKey).once("value", function(locationsDataSnapshot) {
      console.log(locationKey + " being evaluated");
      var location = locationsDataSnapshot.val().split(",").map(Number);
      var wasAlreadyInQuery = (this._locations[locationKey] !== undefined);
      var isNowInQuery = (dist(location, this._center) <= this._radius);

      if (!wasAlreadyInQuery && isNowInQuery) {
        console.log(locationKey + " entered GeoQuery");
        this._callbacks["onKeyEntered"](locationKey, location);

        // Add the current location key to our list of location keys within this GeoQuery
        this._locations[locationKey] = location;
      }
      else if (wasAlreadyInQuery && !isNowInQuery) {
        console.log(locationKey + " left GeoQuery");
        this._callbacks["onKeyLeft"](locationKey, location);

        // Remove the current location key from our list of location keys within this GeoQuery
        delete this._locations[locationKey];
      }
      else if (wasAlreadyInQuery) {
        console.log(locationKey + " moved within GeoQuery");
        this._callbacks["onKeyMoved"](locationKey, location);

        // UPdate the current location's location
        this._locations[locationKey] = location;
      }
    }.bind(this));
  }.bind(this));
};


/**
 * Returns a promise fulfilled with the locations inside of this GeoQuery.
 *
 * @return {promise} A promise that is fulfilled with an array of locations which are inside of this
 *                   GeoQuery. The array takes the form of { key1: location1, key2: location2, ... }.
 */
GeoQuery.prototype.getResults = function() {
  return new RSVP.Promise(function(resolve, reject) {
    resolve(this._locations);
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

  this._callbacks["onKeyMoved"] = callback;

  return new GeoCallbackRegistration(function() {
    this._callbacks["onKeyMoved"] = function() {};
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

  this._callbacks["onKeyEntered"] = callback;

  // Fire the onKeyEntered() callback for every location already within our GeoQuery
  for (var key in this._locations) {
    callback(key, this._locations[key]);
  }

  return new GeoCallbackRegistration(function() {
    this._callbacks["onKeyEntered"] = function() {};
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

  this._callbacks["onKeyLeft"] = callback;

  return new GeoCallbackRegistration(function() {
    this._callbacks["onKeyLeft"] = function() {};
  }.bind(this));
};

/**
 * Terminates this GeoQuery so that it no longer sends location updates.
 */
GeoQuery.prototype.cancel = function () {
  this._callbacks = {
      "onKeyMoved": function() {},
      "onKeyEntered": function() {},
      "onKeyLeft": function() {}
  };

  this._firebaseRef.child("indices").off();
};

/**
 * Updates this GeoQuery's query criteria.
 *
 * @param {object} newQueryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
 */
GeoQuery.prototype.updateQueryCriteria = function(newQueryCriteria) {
  this._saveQueryCriteria(newQueryCriteria);
};

/**
 * Overwrites this GeoQuery's current query criteria with the inputted one.
 *
 * @param {object} newQueryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
 */
GeoQuery.prototype._saveQueryCriteria = function(newQueryCriteria) {
  // TODO: Validate inputs
  this._type = newQueryCriteria.type;
  this._center = newQueryCriteria.center;
  this._centerHash = encodeGeohash(newQueryCriteria.center, 12);  // TODO: is 12 the correct value here?
  this._radius = newQueryCriteria.radius;
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
 * Creates a GeoFire instance.
 * Note: This is the only publicly exposed symbol.
 *
 * @constructor
 * @this {GeoFire}
 * @param {object} firebaseRef A Firebase reference.
 */
var GeoFire = function (firebaseRef) {
  this._firebaseRef = firebaseRef;
};

/**
 * Adds the location to the this GeoFire object.
 *
 * @param {string} key The key of the location to add.
 * @param {array} location A latitude/longitude pair
 * @return {promise} A promise that is fulfilled when the write is complete.
 */
GeoFire.prototype.set = function (key, location) {
  console.log("set(" + key + ", [" + location + "]) called");
  return RSVP.all([validateKey(key), validateLocation(location)]).then(function() {
    return updateFirebaseLocation(this._firebaseRef, key, location);
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
  console.log("get(" + key + ") called");
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
 * Removes the location corresponding to the given key.
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