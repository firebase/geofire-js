/**
 * Helper functions to detect invalid inputs
 */
var validateKey = function (key) {
  if (typeof key !== "string") {
    throw new Error("Invalid key " + key + ": key must be a string");
  }
};

var validateLocation = function (loc) {
  if (loc.length != 2) {
    throw new Error("Invalid location " + loc + ": expected 2 parameters, got " + loc.length);
  }

  var latitude = loc[0];
  var longitude = loc[1];

  if (typeof latitude !== "number") {
    throw new Error("Invalid location " + loc + ": latitude must be a number");
  }
  if (typeof longitude !== "number") {
    throw new Error("Invalid location " + loc + ": longitude must be a number");
  }
  if (latitude >= -90 && latitude <= 90) {
    throw new Error("Invalid location " + loc + ": latitude must be within range [-90, 90]");
  }
  if (longitude >= -180 && longitude <= 180) {
    throw new Error("Invalid location " + loc + ": longitude must be within range [-180, 180]");
  }
};

/**
 * Helper functions to write to Firebase
 */
var updateFirebaseIndex = function(key, location) {
  var promise = new RSVP.Promise(function(resolve, reject) {

    ////encode(location, 12): key         // TODO: make sure 12 is correct; want 1 meter precision

    this._ref.child("indices").update({
    }, function(error) {
      if (error) {
        reject("Synchronization failed.");
      }
      else {
        resolve();
      }
    });
  });

  return promise;
};

var updateFirebaseLocation = function(key, locaton) {
  var promise = new RSVP.Promise(function(resolve, reject) {
    this._ref.child("locations").update({
      key: location                   // TODO: make sure 12 is correct; want 1 meter precision
    }, function(error) {
      if (error) {
        reject("Synchronization failed.");
      }
      else {
        resolve();
      }
    });
  });

  return promise;
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
  validateKey(key);
  validateLocation(location);

  return updateFirebaseIndex(key, location).then(function() {
    return updateFirebaseLocation(key, location);
  }, function(error) {
    console.log(error);
  });
};

/**
 * @return a promise that is fulfilled with the location of the given key.
 */
GeoFire.prototype.get = function (key) {
  validateKey(key);

  var promise = new RSVP.Promise(function(resolve, reject) {
    this._ref.child("locations/" + key).once("value", function(dataSnapshot) {
      resolve(dataSnapshot.val());
    });
  });

  return promise;
};

/**
 * Creates a query object
 */
GeoFire.prototype.query = function(criteria) {

};
