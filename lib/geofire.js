/**
 * Helper functions to detect invalid inputs
 */
var validateKey = function (key) {
  console.log("validateKey(" + key + ")");
  return new RSVP.Promise(function(resolve, reject) {
    if (typeof key !== "string") {
      reject("Invalid key " + key + ": key must be a string");
    }

    resolve();
  });
};

var validateLocation = function (loc) {
  console.log("validateLocation(" + loc + ")");
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
      console.log("bad latitude");
      reject("Invalid location " + loc + ": latitude must be within range [-90, 90]");
    }
    if (longitude < -180 || longitude > 180) {
      console.log("bad longitude");
      reject("Invalid location " + loc + ": longitude must be within range [-180, 180]");
    }

    resolve();
  });
};

/**
 * Helper functions to write to Firebase
 */
var updateFirebaseIndex = function(dataRef, key, location) {
  console.log("updateFirebaseIndex(" + key + "," + location + ")");
  return new RSVP.Promise(function(resolve, reject) {
    var newData = {};
    var geoHash = encode(location, 12);    // TODO: make sure 12 is correct; want 1 meter precision
    newData[geoHash] = key;
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
  console.log("updateFirebaseLocation(" + key + "," + location + ")");
  return new RSVP.Promise(function(resolve, reject) {
    var newData = {};
    newData[key] = location.toString();


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
 */
var GeoQuery = function (queryCriteria) {
  //extend Promise...
};

GeoQuery.prototype.getInitialResults = function() {

};

GeoQuery.prototype.onKeyEntered = function(callback) {

};

GeoQuery.prototype.onKeyMoved = function(callback) {

};

GeoQuery.prototype.onKeyLeft = function(callback) {

};

GeoQuery.prototype.updateQueryCriteria = function (newCriteria) {

};

GeoQuery.prototype.cancel = function () {

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
 */
var GeoFire = function (ref) {
  this._ref = ref;
};

/**
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
 * @return a promise that is fulfilled with the location of the given key.
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
 * Creates a query object
 */
GeoFire.prototype.query = function(criteria) {

};
