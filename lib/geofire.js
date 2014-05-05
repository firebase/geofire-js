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
    dataRef.child("locations/" + key).set(location.toString(), function(error) {
      if (error) {
        reject("Firebase synchronization failed: " + error);
      }
      else {
        // TODO: make sure 12 is correct; want 1 meter precision
        // When the current key changes locations, remove it's old geohash from the indices node
        dataRef.child("locations/" + key).once("value", function() {
          dataRef.child("indices/" + encodeGeohash(location, 12)).remove();
        });
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
    console.log("child_added");

    this._ref.child("locations/" + locationKey).once("value", function(locationsDataSnapshot) {
      var location = locationsDataSnapshot.val().split(",").map(Number);
      console.log(location);

      // If the location is within our GeoQuery, fire the onKeyEntered callback
      if (dist(location, this._center) <= this._radius) {
        console.log(locationKey + " entered GeoQuery");
        this._callbacks["onKeyEntered"](locationKey, location);

        //this._ref.child("locations/" + locationKey).once("value", function(locationsChildSnapshot) {
          //var newLocation = locationsChildSnapshot.val().split(",").map(Number);
          var newLocation = location;
          // Fire the onKeyMoved callback since our location has moved
          console.log(locationKey + " moved within or out of GeoQuery");
          this._callbacks["onKeyMoved"](locationKey, newLocation);

          // If the location leaves our GeoQuery, fire the onKeyLeft callback and then stop listening for movements for this location
          if (dist(newLocation, this._center) < this._radius) {
            console.log(locationKey + " left GeoQuery");
            this._callbacks["onKeyLeft"](locationKey, newLocation);

            // Stop listening for when to fire the onKeyLeft callback
            //this._ref.child("locations/" + locationKey).off("value"); // TODO: should I only remove this specific callback? What if the user also is listening for "value" on this node?
          }
        //}.bind(this));
      }
    }.bind(this));
  }.bind(this));

  // Fire the onKeyMoved callback every time a locations child changes
  /*this._ref.child("locations").on("child_changed", function(locationsChildSnapshot) {
    // Only fire for locations which were already within the GeoQuery

    var locationKey = locationsChildSnapshot.name();
    var location = locationsChildSnapshot.val();

    console.log(locationKey + " moved to [" + location + "]");
    this._callbacks["onKeyMoved"](locationKey, location);
  }.bind(this));*/
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

  // TODO: this causes some events to improperly fire
  /*this._ref.child("indices").once("value", function(dataSnapshot) {
    dataSnapshot.forEach(function(indicesChildSnapshot) {
      var geohash = indicesChildSnapshot.name();
      var locationKey = indicesChildSnapshot.val();
      var location = decodeGeohash(geohash);

      // If the location is within our GeoQuery, fire the onKeyEntered callback
      if (dist(location, this._center) <= this._radius) {
        console.log(locationKey + " entered(2) GeoQuery");
        this._callbacks["onKeyEntered"](locationKey, location);
      }
    }.bind(this));
  }.bind(this));*/
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
 * @key the ID corresponding to the requested location to write
 * @location a latitude/longitute pair
 * @return a promise that is fulfilled when the write is complete.
 */
GeoFire.prototype.batchSet = function (keyLocationPairs) {
  var promises = keyLocationPairs.map(function(keyLocationPair) {
    return this.set(keyLocationPair.key, keyLocationPair.location);
  }.bind(this));
  return RSVP.allSettled(promises); // Should this be .all() or .allSettled()?
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
 * Creates and returns a query object
 * @criteria the criteria which determine the GeoQuery's type, center, and radius
 */
GeoFire.prototype.query = function(criteria) {
  return new GeoQuery(this._ref, criteria);
};
