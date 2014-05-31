/*************/
/*  GLOBALS  */
/*************/
// TODO: Investigate the correct value for this
var g_GEOHASH_LENGTH = 12;

/**
 * Creates a GeoFire instance.
 *
 * @constructor
 * @this {GeoFire}
 * @param {object} firebaseRef A Firebase reference where the GeoFire data will be stored.
 */
var GeoFire = function(firebaseRef) {
  /*********************/
  /*  PRIVATE METHODS  */
  /*********************/
  /**
   * Returns a promise that is fulfilled after the inputted key has been verified.
   *
   * @param {string/number} key A GeoFire key.
   * @return {promise} A promise that is fulfilled when the verification is complete.
   */
  function _validateKey(key) {
    return new RSVP.Promise(function(resolve, reject) {
      var error;

      if (typeof key !== "string" && typeof key !== "number") {
        error = "key must be a string or a number";
      }

      if (error !== undefined) {
        reject("Error: Invalid key \"" + key + "\": " + error);
      }
      else {
        resolve();
      }
    });
  }

  /**
   * Returns a promise that is fulfilled after the inputted location has been verified.
   *
   * @param {array} location A latitude/longitude pair.
   * @return {promise} A promise that is fulfilled when the verification is complete.
   */
  function _validateLocation(location) {
    return new RSVP.Promise(function(resolve, reject) {
      var error;

      // Setting location to null is valid since it will remove the location key from Firebase
      if (location === null) {
        resolve();
      }

      if (Object.prototype.toString.call(location) !== "[object Array]" || location.length !== 2) {
        error = "expected array of length 2, got " + location.length;
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
   * Returns a promise that is fulfilled after key's previous location has been removed from the /indices/
   * node in Firebase. If the key's previous location is the same as its new location, Firebase is not
   * updated.
   *
   * @param {string/number} key The key of the location to add.
   * @param {array} location A latitude/longitude pair.
   * @return {promise} A promise that is fulfilled when the write is over.
   */
  function _removePreviousIndex(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      _firebaseRef.child("locations/" + key).once("value", function(locationsChildSnapshot) {
        // If the key is not in GeoFire, there is no old index to remove
        var previousLocation = locationsChildSnapshot.val();
        if (previousLocation === null) {
          resolve(location !== null);
        }
        else {
          // If the location is not changing, there is no need to do anything
          previousLocation = previousLocation.split(",").map(Number);
          if (location !== null && location[0] === previousLocation[0] && location[1] === previousLocation[1]) {
            resolve(false);
          }

          // Otherwise, overwrite the previous index
          _firebaseRef.child("indices/" + encodeGeohash(previousLocation, g_GEOHASH_LENGTH) + key).remove(function(error) {
            if (error) {
              reject("Error: Firebase synchronization failed: " + error);
            }
            else {
              resolve(true);
            }
          });
        }
      }, function(error) {
        reject("Error: Firebase synchronization failed: " + error);
      });
    });
  }

  /**
   * Returns a promise that is fulfilled after key-location pair has been added to the /locations/ node
   * in Firebase.
   *
   * @param {string/number} key The key of the location to add.
   * @param {array} location A latitude/longitude pair.
   * @return {promise} A promise that is fulfilled when the write is over.
   */
  function _updateLocationsNode(key, location) {
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

  /**
   * Returns a promise that is fulfilled after key-location pair has been added to the /indices/ node
   * in Firebase. If the location is null, Firebase is not updated.
   *
   * @param {string/number} key The key of the location to add.
   * @param {array} location A latitude/longitude pair.
   * @return {promise} A promise that is fulfilled when the write is over.
   */
  function _updateIndicesNode(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      // If the new location is null, there is no need to update it
      if (location === null) {
        resolve();
      }
      else {
        _firebaseRef.child("indices/" + encodeGeohash(location, g_GEOHASH_LENGTH) + key).set(true, function(error) {
          if (error) {
            reject("Error: Firebase synchronization failed: " + error);
          }
          else {
            resolve();
          }
        });
      }
    });
  }

  /**
   * Returns a promise that is fulfilled with the location corresponding to the given key.
   * Note: If the key does not exist, null is returned.
   *
   * @param {string/number} key The key of the location to retrieve.
   * @return {promise} A promise that is fulfilled with the location of the given key.
   */
  function _getLocation(key) {
    return new RSVP.Promise(function(resolve, reject) {
      _firebaseRef.child("locations/" + key.toString()).once("value", function(dataSnapshot) {
        resolve(dataSnapshot.val() ? dataSnapshot.val().split(",").map(Number) : null);
      }, function(error) {
        reject("Error: Firebase synchronization failed: " + error);
      });
    });
  }


  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Returns a promise after adding the key-location pair.
   *
   * @param {string/number} key The key of the location to add.
   * @param {array} location A latitude/longitude pair.
   * @return {promise} A promise that is fulfilled when the write is complete.
   */
  this.set = function(key, location) {
    return new RSVP.all([_validateKey(key), _validateLocation(location)]).then(function() {
      return _removePreviousIndex(key, location);
    }).then(function(locationChanged) {
      // If the location has actually changed, update Firebase; otherwise, just return an empty promise
      if (locationChanged) {
        return new RSVP.all([_updateLocationsNode(key, location), _updateIndicesNode(key, location)]);
      }
      else {
        return new RSVP.Promise(function(resolve) { resolve(); });
      }
    });
  };

  /**
   * Returns a promise that is fulfilled with the location corresponding to the given key.
   * Note: If the key does not exist, null is returned.
   *
   * @param {string/number} key The key of the location to retrieve.
   * @return {promise} A promise that is fulfilled with the location of the given key.
   */
  this.get = function(key) {
    return _validateKey(key).then(function() {
      return _getLocation(key);
    });
  };

  /**
   * Returns a promise that is fulfilled after the location corresponding to the given key is removed.
   *
   * @param {string/number} key The key of the location to remove.
   * @return {promise} A promise that is fulfilled after the inputted key is removed.
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
  this.query = function(queryCriteria) {
    return new GeoQuery(_firebaseRef, queryCriteria);
  };

  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  // Private variables
  var _firebaseRef = firebaseRef;
};
