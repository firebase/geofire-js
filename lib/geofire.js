// TODO: formalize function descriptions

/**
 * Helper functions to detect invalid inputs
 */
var validateKey = function (key) {
  //console.log("validateKey(" + key + ")");
  return new RSVP.Promise(function(resolve, reject) {
    if (typeof key !== "string") {
      reject("Invalid key " + key + ": key must be a string");
    }

    resolve();
  });
};

var validateLocation = function (loc) {
  //console.log("validateLocation(" + loc + ")");
  return new RSVP.Promise(function(resolve, reject) {
    // TODO: make sure Array goes far enough back
    if (loc instanceof Array && loc.length != 2) {
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
    var geoHash = encode(location, 12);    // TODO: make sure 12 is correct; want 1 meter precision
    newData[geoHash] = key;
    console.log("write to indices: {" + geoHash + ": " + key + "}");
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
    console.log("write to locations: {" + key + ": [" + location + "]}");
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
  //extend Promise...
  var _this = this;
  this._saveQueryCriteria(queryCriteria);
  this._ref = dataRef;
  /*this.getInitialResults().then(function(initialResults) {
    _this.locations = initialResults;
  });*/
};


/**
 * @return a promise that is fulfilled with the list of initial locations within the GeoQuery
 */
 // TODO: question for Andrew: will this only be able to be called before anything else is called? or can this be
 // called anytime? If the latter, should it be called getCurrentResults?
GeoQuery.prototype.getInitialResults = function() {
  var _this = this;
  console.log("start");

  return new RSVP.Promise(function(resolve, reject) {
    var initialResults = [];
    _this._ref.child("indices").once("value", function(dataSnapshot) {
      var indices = dataSnapshot.val();
      for (var geoHash in indices) {
        console.log(distByHash(_this._centerHash, geoHash));
        if (distByHash(_this._centerHash, geoHash) <= _this._radius) {
          initialResults.push(indices[geoHash]);
        }
      }
      console.log("Initial results: " + initialResults);
      _this.locations = initialResults;
      resolve(initialResults);
    });
  });
};

GeoQuery.prototype.onKeyEntered = function(callback) {
  console.log("onKeyEntered()");
  this._ref.child("locations").on("child_changed", function(childSnapshot) {
    console.log("checking if key entered: " + childSnapshot.name());
    var key = childSnapshot.name();
    var location = childSnapshot.val().split(",");
    if (this.locations.indexOf(key) == -1) {
      if (dist(location[0], location[1], this._center[0], this._center[1]) <= this._radius) {
        this.locations.push(key);
        callback(key, location);
      }
    }
  }.bind(this));
};

GeoQuery.prototype.onKeyMoved = function(callback) {
  console.log("onKeyMoved()");
  this._ref.child("locations").on("child_changed", function(childSnapshot) {
    console.log("key moved: " + childSnapshot.name());
    callback(childSnapshot.name(), childSnapshot.val().split(","));
  });
};

GeoQuery.prototype.onKeyLeft = function(callback) {
  console.log("onKeyLeft()");
  this._ref.child("locations").on("child_changed", function(childSnapshot) {
    console.log("checking if key left: " + childSnapshot.name());
    var key = childSnapshot.name();
    var location = childSnapshot.val().split(",");
    var index = this.locations.indexOf(key);
    if (index != -1) {
      if (dist(location[0], location[1], this._center[0], this._center[1]) > this._radius) {
        this.locations.splice(index, 1);
        callback(key, location);
      }
    }
  }.bind(this));
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
  this._centerHash = encode(queryCriteria.center, 12);
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
