// TODO: formalize function descriptions

/**
 * Helper functions to detect invalid inputs
 */
var validateKey = function (key) {
  return new RSVP.Promise(function(resolve, reject) {
    if (typeof key !== "string") {
      reject("Invalid key " + key + ": key must be a string");
    }

    resolve();
  });
};

var validateLocation = function (loc) {
  return new RSVP.Promise(function(resolve, reject) {
    if (!(loc instanceof Array) || loc.length != 2) {
      reject("Invalid location " + loc + ": expected 2 parameters, got " + loc.length);
    }

    var latitude = loc[0];
    var longitude = loc[1];

    if (typeof latitude !== "number") {
      reject("Invalid location " + loc + ": latitude must be a number");
    }
    if (typeof longitude !== "number") {
      reject("Invalid location " + loc + ": longitude must be a number");
    }
    if (latitude < -90 || latitude > 90) {
      reject("Invalid location " + loc + ": latitude must be within range [-90, 90]");
    }
    if (longitude < -180 || longitude > 180) {
      reject("Invalid location " + loc + ": longitude must be within range [-180, 180]");
    }

    resolve();
  });
};

/**
 * Helper functions to write to Firebase
 */
var updateFirebaseIndex = function(dataRef, key, location) {
  // TODO: if the key already exists in /locations/, clear it from /indices/
  return new RSVP.Promise(function(resolve, reject) {
    var newData = {};
    var geohash = encodeGeohash(location, 12);    // TODO: make sure 12 is correct; want 1 meter precision
    newData[geohash] = key;
    //console.log("Write to /indices/: {" + geohash + ": " + key + "}");
    dataRef.child("indices").update(newData, function(error) {
      if (error) {
        reject("Synchronization failed.");
      }
      else {
        resolve();
      }
    });
  });
};

var updateFirebaseLocation = function(dataRef, key, location) {
  return new RSVP.Promise(function(resolve, reject) {
    var newData = {};
    newData[key] = location.toString();
    //console.log("Write to /locations/: {" + key + ": [" + location + "]}");
    dataRef.child("locations").update(newData, function(error) {
      if (error) {
        reject("Synchronization failed.");
      }
      else {
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


  this._ref.child("indices").on("child_added", function(indicesChildSnapshot) {
    var geohash = indicesChildSnapshot.name();
    var locationKey = indicesChildSnapshot.val();
    var location = decodeGeohash(geohash);

    // Fire the onKeyMoved callback
    console.log(locationKey + " moved to [" + location + "]");
    this._callbacks["onKeyMoved"](locationKey, location);

    // If the location is within our GeoQuery, fire the onKeyEntered callback
    if (dist(location[0], location[1], this._center[0], this._center[1]) <= this._radius) {
      console.log(locationKey + " entered GeoQuery");
      this._callbacks["onKeyEntered"](locationKey, location);

      // When the location leaves our GeoQuery, fire the onKeyLeft callback
      this._ref.child("locations/" + locationKey).on("value", function(locationsChildSnapshot) {
        var newLocation = locationsChildSnapshot.val();
        if (dist(newLocation[0], newLocation[1], this._center[0], this._center[1]) < this._radius) {
          console.log(locationKey + " left GeoQuery");
          this._callbacks["onKeyLeft"](locationKey, location);

          // Stop listening for when to fire the onKeyLeft callback
          this._ref.child("locations/" + locationKey).off("value"); // TODO: should I only remove this specific callback? What if the user also is listening for "value" on this node?
        }
      }.bind(this));
    };
  }.bind(this));
};


/**
 * @return a promise that is fulfilled with the list of initial locations within the GeoQuery
 */
GeoQuery.prototype.getResults = function() {
  var _this = this;

  return new RSVP.Promise(function(resolve, reject) {
    var initialResults = [];
    _this._ref.child("indices").once("value", function(dataSnapshot) {
      var indices = dataSnapshot.val();
      for (var geohash in indices) {
        console.log(distByHash(_this._centerHash, geohash));
        if (distByHash(_this._centerHash, geohash) <= _this._radius) {
          initialResults.push(indices[geohash]);
        }
      }
      console.log("Initial results: " + initialResults);
      resolve(initialResults);
    });
  });
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
  var dataRef = this._ref;
  return validateKey(key)
    .then(function() {
      validateLocation(location)
    }).then(function() {
      updateFirebaseIndex(dataRef, key, location)
    }).then(function() {
      updateFirebaseLocation(dataRef, key, location);
    });
};

/**
 * @key the ID corresponding to the requested location to write
 * @location a latitude/longitute pair
 * @return a promise that is fulfilled when the write is complete.
 */
GeoFire.prototype.batchSet = function (keyLocationPairs) {
  var promises = keyLocationPairs.map(function(keyLocationPair) {
    return this.set(keyLocationPair.key, keyLocationPair.location);
  }.bind(this));
  return new RSVP.all(promises);
};

/**
 * @key the ID corresponding to the requested location
 * @return a promise that is fulfilled with the location of the given key.
 * Note: if the key does not exist, null is returned // TODO: is this what we want?
 */
GeoFire.prototype.get = function (key) {
  var dataRef = this._ref;
  return validateKey(key)
    .then(function() {
      return new RSVP.Promise(function(resolve, reject) {
        dataRef.child("locations/" + key).once("value", function(dataSnapshot) {
          var data = dataSnapshot.val();
          if (data) {
            resolve(dataSnapshot.val().split(",").map(Number));
          }
          else {
            resolve(null);
          }
        }, function(error) {
          reject(error);
        });
      });
    });
};

/**
 * Creates and returns a query object
 * @criteria the criteria which determine the GeoQuery's type, center, and radius
 */
GeoFire.prototype.query = function(criteria) {
  return new GeoQuery(this._ref, criteria);
};
