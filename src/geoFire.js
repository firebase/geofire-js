/*************/
/*  GLOBALS  */
/*************/
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
   * Returns a promise that is fulfilled after the provided key's previous location has been removed
   * from the /indices/ node in Firebase.
   *
   * If the provided key's previous location is the same as its new location, Firebase is not updated.
   *
   * @param {string} key The key of the location to add.
   * @param {array} location The provided key's new [latitude, longitude] pair.
   * @return {RSVP.Promise} A promise that is fulfilled when the write is over.
   */
  function _removePreviousIndex(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      _firebaseRef.child("l/" + key).once("value", function(locationsChildSnapshot) {
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
          else {
            _firebaseRef.child("i/" + encodeGeohash(previousLocation, g_GEOHASH_PRECISION) + key).remove(function(error) {
              if (error) {
                reject("Error: Firebase synchronization failed: " + error);
              }
              else {
                resolve(true);
              }
            });
          }
        }
      }, function(error) {
        reject("Error: Firebase synchronization failed: " + error);
      });
    });
  }

  /**
   * Returns a promise that is fulfilled after the provided key-location pair has been added to the
   * /locations/ node in Firebase.
   *
   * @param {string} key The key of the location to add.
   * @param {array} location The provided key's new [latitude, longitude] pair.
   * @return {RSVP.Promise} A promise that is fulfilled when the write is over.
   */
  function _updateLocationsNode(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      _firebaseRef.child("l/" + key).set(location ? location.toString() : null, function(error) {
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
   * Returns a promise that is fulfilled after provided key-location pair has been added to the
   * /indices/ node in Firebase.
   *
   * If the provided location is null, Firebase is not updated.
   *
   * @param {string} key The key of the location to add.
   * @param {array} location The provided key's new [latitude, longitude] pair.
   * @return {RSVP.Promise} A promise that is fulfilled when the write is over.
   */
  function _updateIndicesNode(key, location) {
    return new RSVP.Promise(function(resolve, reject) {
      // If the new location is null, there is no need to update it
      if (location === null) {
        resolve();
      }
      else {
        _firebaseRef.child("i/" + encodeGeohash(location, g_GEOHASH_PRECISION) + key).set(true, function(error) {
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
   * Returns a promise fulfilled with the location corresponding to the provided key.
   *
   * If the key does not exist, the returned promise is fulfilled with null.
   *
   * @param {string} key The key whose location should be retrieved.
   * @return {RSVP.Promise} A promise that is fulfilled with the location of the provided key.
   */
  function _getLocation(key) {
    return new RSVP.Promise(function(resolve, reject) {
      _firebaseRef.child("l/" + key).once("value", function(dataSnapshot) {
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
   * Adds the provided key - location pair to Firebase. Returns an empty promise which is fulfilled when the write is complete.
   *
   * If the provided key already exists in this GeoFire, it will be overwritten with the new location value.
   *
   * @param {string} key The key representing the location to add.
   * @param {array} location The [latitude, longitude] pair to add.
   * @return {RSVP.Promise} A promise that is fulfilled when the write is complete.
   */
  this.set = function(key, location) {
    validateKey(key);
    if (location !== null) {
      // Setting location to null is valid since it will remove the key
      validateLocation(location);
    }

    return _removePreviousIndex(key, location).then(function(locationChanged) {
      // If the location has actually changed, update Firebase; otherwise, just return an empty promise
      if (locationChanged === true) {
        return new RSVP.all([_updateLocationsNode(key, location), _updateIndicesNode(key, location)]);
      }
      else {
        return new RSVP.Promise(function(resolve) { resolve(); });
      }
    });
  };

  /**
   * Returns a promise fulfilled with the location corresponding to the provided key.
   *
   * If the provided key does not exist, the returned promise is fulfilled with null.
   *
   * @param {string} key The key of the location to retrieve.
   * @return {RSVP.Promise} A promise that is fulfilled with the location of the given key.
   */
  this.get = function(key) {
    validateKey(key);

    return _getLocation(key);
  };

  /**
   * Removes the provided key from this GeoFire. Returns an empty promise fulfilled when the key has been removed.
   *
   * If the provided key is not in this GeoFire, the promise will still successfully resolve.
   *
   * @param {string} key The key of the location to remove.
   * @return {RSVP.Promise} A promise that is fulfilled after the inputted key is removed.
   */
  this.remove = function(key) {
    return this.set(key, null);
  };

  /**
   * Returns a new GeoQuery instance with the provided queryCriteria.
   *
   * @param {object} queryCriteria The criteria which specifies the GeoQuery's center and radius.
   * @return {GeoQuery} A new GeoQuery object.
   */
  this.query = function(queryCriteria) {
    return new GeoQuery(_firebaseRef, queryCriteria);
  };

  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  var _firebaseRef = firebaseRef;
};

/**
 * Static method which calculates the distance, in kilometers, between two locations,
 * via the Haversine formula. Note that this is approximate due to the fact that the
 * Earth's radius varies between 6356.752 km and 6378.137 km.
 *
 * @param {array} location1 The [latitude, longitude] pair of the first location.
 * @param {array} location2 The [latitude, longitude] pair of the second location.
 * @return {number} The distance, in kilometers, between the inputted locations.
 */
GeoFire.distance = function(location1, location2) {
  validateLocation(location1);
  validateLocation(location2);

  var radius = 6371; // Earth's radius in kilometers
  var latDelta = degreesToRadians(location2[0] - location1[0]);
  var lonDelta = degreesToRadians(location2[1] - location1[1]);

  var a = (Math.sin(latDelta / 2) * Math.sin(latDelta / 2)) +
          (Math.cos(degreesToRadians(location1[0])) * Math.cos(degreesToRadians(location2[0])) *
          Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2));

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radius * c;
};
