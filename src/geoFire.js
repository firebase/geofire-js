// TODO: Investigate the correct value for this
var g_GEOHASH_LENGTH = 12;

/**
 * Creates a GeoFire instance.
 *
 * @constructor
 * @this {GeoFire}
 * @param {object} firebaseRef A Firebase reference.
 */
var GeoFire = function(firebaseRef) {
  /*********************/
  /*  PRIVATE METHODS  */
  /*********************/
  /**
   * Helper functions to detect invalid inputs
   */
  function _validateKey(key) {
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
  }

  function _validateLocation(location) {
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

      if (error !== undefined) {
        reject("Error: Invalid location [" + location + "]: " + error);
      }
      else {
        resolve();
      }
    });
  }

  /**
   * Helper functions to write to Firebase
   */
  function _updateFirebaseIndex(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      // Setting location to null will remove key from the Firebase so there is nothing to do here
      if (location === null) {
        resolve();
      }

      _firebaseRef.child("indices/" + encodeGeohash(location, g_GEOHASH_LENGTH) + key).set(true, function(error) {
        if (error) {
          reject("Error: Firebase synchronization failed: " + error);
        }
        else {
          resolve();
        }
      });
    });
  }

  function _updateFirebaseLocation(key, location) {
    function _removeOldIndex() {
      return new RSVP.Promise(function(resolve, reject) {
        if (_allLocations[key] !== undefined) {
          _firebaseRef.child("indices/" + encodeGeohash(_allLocations[key].split(",").map(Number), g_GEOHASH_LENGTH) + key).remove(function(error) {
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
      });

      /*return new RSVP.Promise(function(resolve, reject) {
        firebaseRef.child("locations/" + key).once("value", function(locationsChildSnapshot) {
          if (locationsChildSnapshot.val()) {
            firebaseRef.child("indices/" + encodeGeohash(locationsChildSnapshot.val().split(",").map(Number), g_GEOHASH_LENGTH) + key).remove(function(error) {
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
        });
      });*/
    }

    function _updateLocation() {
      return new RSVP.Promise(function(resolve, reject) {
        _firebaseRef.child("locations/" + key).set(location ? location.toString() : null, function(error) {
          if (error) {
            reject("Error: Firebase synchronization failed: " + error);
          }
          else {
            resolve();
          }
        });
      });
    }

    return _removeOldIndex().then(function() {
      return _updateLocation();
    });
  }


  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Returns a promise after adding the key-location pair.
   *
   * @param {string} key The key of the location to add.
   * @param {array} location A latitude/longitude pair
   * @return {promise} A promise that is fulfilled when the write is complete.
   */
  this.set = function(key, location) {
    return RSVP.all([_validateKey(key), _validateLocation(location)]).then(function() {
      return _updateFirebaseLocation(key.toString(), location);
    }).then(function() {
      return _updateFirebaseIndex(key.toString(), location);
    });
  };

  /**
   * Returns a promise that is fulfilled with the location corresponding to the given key.
   * Note: If the key does not exist, null is returned.
   *
   * @param {string} key The key of the location to retrieve.
   * @return {promise} A promise that is fulfilled with the location of the given key.
   */
  this.get = function(key) {
    return _validateKey(key).then(function() {
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

  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
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
};
