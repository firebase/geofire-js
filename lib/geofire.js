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
var updateFirebaseIndex = function(dataRef, key, location) {
  return new RSVP.Promise(function(resolve, reject) {
    // Setting location to null will remove key from the Firebase so there is nothing to do here
    if (location == null) {
      resolve();
    }

    // TODO: make sure 12 is correct; want 1 meter precision
    dataRef.child("indices/" + encodeGeohash(location, 12)).set(key, function(error) {
      if (error) {
        reject("Firebase synchronization failed: " + error);
      }
      else {
        resolve();
      }
    });
  });
};

var updateFirebaseLocation = function(dataRef, key, location) {
  return new RSVP.Promise(function(resolve, reject) {
    dataRef.child("locations/" + key).set(location ? location.toString() : null, function(error) {
      if (error) {
        reject("Firebase synchronization failed: " + error);
      }
      else {
        // TODO: make sure 12 is correct; want 1 meter precision
        // When the current key changes locations, remove it's old geohash from the indices node
        if (location != null) {
          dataRef.child("locations/" + key).once("value", function() {
            dataRef.child("indices/" + encodeGeohash(location, 12)).remove();
          });
        }
        resolve();
      }
    });
  });
};

/**
 * GeoQuery constructor
 * @dataRef a reference to a Firebase location
 * @queryCriteria the criteria which determine the GeoQuery's type, center, and radius
 */
var GeoQuery = function (dataRef, queryCriteria) {
  this._saveQueryCriteria(queryCriteria);
  this._ref = dataRef;
  this._callbacks = {
    "onKeyMoved": function() {},
    "onKeyEntered": function() {},
    "onKeyLeft": function() {}
  };
  this._locations = {};

  this._ref.child("indices").on("child_added", function(indicesChildSnapshot) {
    var locationKey = indicesChildSnapshot.val();

    this._ref.child("locations/" + locationKey).once("value", function(locationsDataSnapshot) {
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
 * @return a promise that is fulfilled with the list of initial locations within the GeoQuery
 */
GeoQuery.prototype.getResults = function() {
  return new RSVP.Promise(function(resolve, reject) {
    resolve(this._locations);
  }.bind(this));
};

/**
 * Sets the GeoQuery's onKeyMoved callback
 */
GeoQuery.prototype.onKeyMoved = function(callback) {
  // TODO: what if they pass in something other than a callback, such as a undefined, string or int?
  this._callbacks["onKeyMoved"] = callback;
};

GeoQuery.prototype.onKeyEntered = function(callback) {
  // TODO: what if they pass in something other than a callback, such as a undefined, string or int?
  this._callbacks["onKeyEntered"] = callback;

  // Fire the onKeyEntered() callback for every location already within our GeoQuery
  for (var key in this._locations) {
    callback(key, this._locations[key]);
  }
};

GeoQuery.prototype.onKeyLeft = function(callback) {
  // TODO: what if they pass in something other than a callback, such as a undefined, string or int?
  this._callbacks["onKeyLeft"] = callback;
};

GeoQuery.prototype.updateQueryCriteria = function (newCriteria) {
  this._saveQueryCriteria(newCriteria);
};

GeoQuery.prototype.cancel = function () {

};

/**
 * A helper function which overwrites the GeoQuery's current query criteria with the inputted one
 * @queryCriteria the criteria which determine the GeoQuery's type, center, and radius
 */
GeoQuery.prototype._saveQueryCriteria = function(queryCriteria) {
  // TODO: Validate inputs
  this._type = queryCriteria.type;
  this._center = queryCriteria.center;
  this._centerHash = encodeGeohash(queryCriteria.center, 12);
  this._radius = queryCriteria.radius;
};

/**
 * Callback registration, used to cancel outstanding callbacks.
 */
var GeoCallbackRegistration = function (onCancel) {
  this._onCancel = onCancel;
};

GeoCallbackRegistration.prototype.cancel = function () {
  if (this._onCancel()) {
    this._onCancel();
    delete this._onCancel;
  }
};


/**
 * GeoFire API - This is the only public symbol we expose.
 * @ref a reference to a Firebase location
 */
var GeoFire = function (ref) {
  this._ref = ref;
};

/**
 * @key the ID corresponding to the requested location to write
 * @location a latitude/longitute pair
 * @return a promise that is fulfilled when the write is complete.
 */
GeoFire.prototype.set = function (key, location) {
  return RSVP.all([validateKey(key), validateLocation(location)]).then(function() {
    RSVP.all(updateFirebaseIndex(this._ref, key, location), updateFirebaseLocation(this._ref, key, location));
  }.bind(this));
};

/**
 * @key the ID corresponding to the requested location
 * @return a promise that is fulfilled with the location of the given key.
 * Note: if the key does not exist, null is returned // TODO: is this what we want?
 */
GeoFire.prototype.get = function (key) {
  return validateKey(key).then(function() {
    return new RSVP.Promise(function(resolve, reject) {
      this._ref.child("locations/" + key).once("value", function(dataSnapshot) {
        if (dataSnapshot.val()) {
          resolve(dataSnapshot.val().split(",").map(Number));
        }
        else {  // TODO: should non-existent key resolve to null?
          resolve(null);
        }
      }, function(error) {
        reject(error);
      });
    }.bind(this));
  }.bind(this));
};

/**
 * @key the ID corresponding to the requested location
 * @return a promise that is fulfilled with the location of the given key.
 * Note: if the key does not exist, null is returned // TODO: is this what we want?
 */
GeoFire.prototype.remove = function (key) {
  return this.set(key, null);
};

/**
 * Creates and returns a query object
 * @criteria the criteria which determine the GeoQuery's type, center, and radius
 */
GeoFire.prototype.query = function(criteria) {
  return new GeoQuery(this._ref, criteria);
};
