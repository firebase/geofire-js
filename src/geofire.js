// Tell JSHint about variables defined elsewhere
/* global module, RSVP */

/**
 * Helper functions to detect invalid inputs
 */
var validateKey = function (key) {
  return new RSVP.Promise(function(resolve, reject) {
    var error;

    if (typeof key !== "string" && typeof key !== "number") {
      error = "key must be a string or a number";
    }

    if (error !== undefined) {
      reject("Error: Invalid key '" + key + "': " + error);
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
      reject("Erorr: Invalid location [" + location + "]: " + error);
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
  return new RSVP.Promise(function(resolve, reject) {
    // Setting location to null will remove key from the Firebase so there is nothing to do here
    if (location === null) {
      resolve();
    }

    // TODO: make sure 12 is correct; want 1 meter precision
    firebaseRef.child("indices/" + encodeGeohash(location, 12)).set(key, function(error) {
      if (error) {
        reject("Error: Firebase synchronization failed: " + error);
      }
      else {
        resolve();
      }
    });
  });
};

var updateFirebaseLocation = function(firebaseRef, key, location, allLocations) {
  var removeOldIndex = function() {
    return new RSVP.Promise(function(resolve, reject) {
      if (allLocations[key] !== undefined) {
        // TODO: make sure 12 is correct; want 1 meter precision
        firebaseRef.child("indices/" + encodeGeohash(allLocations[key].split(",").map(Number), 12)).remove(function(error) {
          if (error) {
            reject("Error: Firebase synchronization failed: " + error);
          }
          else {
            resolve();
          }
        });
      }
      else {
        resolve();
      }
    }.bind(this));
  };

  var updateLocation = function() {
    return new RSVP.Promise(function(resolve, reject) {
      firebaseRef.child("locations/" + key).set(location ? location.toString() : null, function(error) {
        if (error) {
          reject("Error: Firebase synchronization failed: " + error);
        }
        else {
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
  if (typeof queryCriteria.center === "undefined") {
    throw new Error("No \"center\" attribute specified for query criteria.");
  }
  if (typeof queryCriteria.radius === "undefined") {
    throw new Error("No \"radius\" attribute specified for query criteria.");
  }
  this._saveQueryCriteria(queryCriteria);

  this._firebaseRef = firebaseRef;
  this._callbacks = {
    key_entered: [],
    key_left: [],
    key_moved: []
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

  // Fire the "key_left" event if a location in the query is removed entirely from geoFire
  this._firebaseRef.child("locations").on("child_removed", function(locationsChildSnapshot) {
    var locationKey = locationsChildSnapshot.name();
    if (this._locationsInQuery[locationKey] !== undefined) {
      this._callbacks.key_left.forEach(function(callback) {
        callback(locationKey, this._allLocations[locationKey], dist(this._allLocations[locationKey],this._center));
      }.bind(this));
      delete this._allLocations[locationKey];
    }
  }.bind(this));
};


GeoQuery.prototype._fireCallbacks = function(locationKey, location) {
  var wasAlreadyInQuery = (this._locationsInQuery[locationKey] !== undefined);
	var distance = dist(location, this._center);
	var isNowInQuery = (distance <= this._radius);

  if (!wasAlreadyInQuery && isNowInQuery) {
    this._callbacks.key_entered.forEach(function(callback) {
      callback(locationKey, location, distance);
    });

    // Add the current location key to our list of location keys within this GeoQuery
    this._locationsInQuery[locationKey] = location;
  }
  else if (wasAlreadyInQuery && !isNowInQuery) {
    this._callbacks.key_left.forEach(function(callback) {
      callback(locationKey, location, distance);
    });

    // Remove the current location key from our list of location keys within this GeoQuery
    delete this._locationsInQuery[locationKey];
  }
  else if (wasAlreadyInQuery) {
    this._callbacks.key_moved.forEach(function(callback) {
      callback(locationKey, location, distance);
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
        results.push({
          key: key,
          location: this._locationsInQuery[key],
	        distance: dist(this._locationsInQuery[key], this._center)
        });
      }
    }
    resolve(results);
  }.bind(this));
};

/**
 * Attaches a callback to this GeoQuery for a given event type.
 *
 * @param {string} eventType The event type for which to attach the callback. One of "key_entered", "key_left", or "key_moved".
 * @param {function} callback Callback function to be called when an event of type eventType fires.
 * @return {GeoCallbackRegistration} A callback registration which can be used to cancel the provided callback.
 */
GeoQuery.prototype.on = function(eventType, callback) {
  if (["key_entered", "key_left", "key_moved"].indexOf(eventType) === -1) {
    throw new Error("Event type must be \"key_entered\", \"key_left\", or \"key_moved\"");
  }
  if (typeof callback !== "function") {
    throw new Error("Event callback must be a function.");
  }

  // Add the callback to this GeoQuery's callbacks list
  this._callbacks[eventType].push(callback);

  // Fire the "key_entered" callback for every location already within our GeoQuery
  if (eventType === "key_entered") {
    for (var key in this._locationsInQuery) {
      if (this._locationsInQuery.hasOwnProperty(key)) {
        callback(key, this._locationsInQuery[key], dist(this._locationsInQuery[key], this._center));
      }
    }
  }

  // Return an event registration which can be used to cancel the callback
  return new GeoCallbackRegistration(function() {
    this._callbacks[eventType].splice(this._callbacks[eventType].indexOf(callback), 1);
  }.bind(this));
};

/**
 * Terminates this GeoQuery so that it no longer sends location updates.
 */
GeoQuery.prototype.cancel = function () {
  this._callbacks = {
    key_entered: [],
    key_left: [],
    key_moved: []
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

  // Loop through all of the locations and fire the "key_entered" or "key_left" callbacks if necessary
  for (var key in this._allLocations) {
    if (this._allLocations.hasOwnProperty(key)) {
      this._fireCallbacks(key, this._allLocations[key]);
    }
  }
};

/**
 * Returns this GeoQuery's center.
 *
 * @return {array} The [latitude, longitude] pair signifying the center of this GeoQuery.
 */
GeoQuery.prototype.getCenter = function() {
  return this._center;
};

/**
 * Returns this GeoQuery's radius.
 *
 * @return {integer} The radius of this GeoQuery.
 */
GeoQuery.prototype.getRadius = function() {
  return this._radius;
};

/**
 * Overwrites this GeoQuery's current query criteria with the inputted one.
 *
 * @param {object} newQueryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
 */
GeoQuery.prototype._saveQueryCriteria = function(newQueryCriteria) {
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

  // Validate the "radius" attribute
  if (typeof newQueryCriteria.radius !== "undefined") {
    if (typeof newQueryCriteria.radius !== "number" || newQueryCriteria.radius < 0) {
      throw new Error("Invalid \"radius\" attribute specified for query criteria. Radius must be a number greater than or equal to 0.");
    }
  }

  // Save the query criteria
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
var GeoFire = function(firebaseRef) {
  // Private variables
  var _firebaseRef = firebaseRef;
  var _allLocations = {};

  // Keep track of all of the locations
  _firebaseRef.child("locations").on("child_added", function(locationsChildSnapshot) {
    _allLocations[locationsChildSnapshot.name()] = locationsChildSnapshot.val();
  });
  _firebaseRef.child("locations").on("child_removed", function(locationsChildSnapshot) {
    delete _allLocations[locationsChildSnapshot.name()];
  });

  /**
   * Returns a promise after adding the key-location pair.
   *
   * @param {string} key The key of the location to add.
   * @param {array} location A latitude/longitude pair
   * @return {promise} A promise that is fulfilled when the write is complete.
   */
  this.set = function(key, location) {
    return RSVP.all([validateKey(key), validateLocation(location)]).then(function() {
      return updateFirebaseLocation(_firebaseRef, key.toString(), location, _allLocations);
    }).then(function() {
      return updateFirebaseIndex(_firebaseRef, key.toString(), location);
    });
  };

  /**
   * Returns a promise that is fulfilled with the location corresponding to the given key.
   * Note: If the key does not exist, null is returned.   // TODO: is this what we want?
   *
   * @param {string} key The key of the location to retrieve.
   * @return {promise} A promise that is fulfilled with the location of the given key.
   */
  this.get = function(key) {
    return validateKey(key).then(function() {
      return new RSVP.Promise(function(resolve, reject) {
        _firebaseRef.child("locations/" + key.toString()).once("value", function(dataSnapshot) {
          resolve(dataSnapshot.val() ? dataSnapshot.val().split(",").map(Number) : null);
        }, function(error) {
          reject("Error: Firebase synchronization failed: " + error);
        });
      });
    });
  };

  /**
   * Returns a promise that is fulfilled after the location corresponding to the given key is removed.
   *
   * @param {string} key The ID/key of the location to retrieve.
   * @return {promise} A promise that is fulfilled with the location of the given ID/key.
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
  this.query = function(criteria) {
    return new GeoQuery(_firebaseRef, criteria);
  };
};
