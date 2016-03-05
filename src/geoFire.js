/**
 * Creates a GeoFire instance.
 *
 * @constructor
 * @this {GeoFire}
 * @param {Firebase} firebaseRef A Firebase reference where the GeoFire data will be stored.
 */
var GeoFire = function(firebaseRef) {
  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Returns the Firebase instance used to create this GeoFire instance.
   *
   * @return {Firebase} The Firebase instance used to create this GeoFire instance.
   */
  this.ref = function() {
    return _firebaseRef;
  };

  /**
   * Adds the provided key - location pair(s) to Firebase. Returns an empty promise which is fulfilled when the write is complete.
   *
   * If any provided key already exists in this GeoFire, it will be overwritten with the new location value.
   *
   * @param {string|Object} keyOrLocations The key representing the location to add or a mapping of key - location pairs which
   * represent the locations to add.
   * @param {Array.<number>|undefined} location The [latitude, longitude] pair to add.
   * @return {Promise.<>} A promise that is fulfilled when the write is complete.
   */
  this.set = function(keyOrLocations, location) {
    var locations;
    if (typeof keyOrLocations === "string" && keyOrLocations.length !== 0) {
      // If this is a set for a single location, convert it into a object
      locations = {};
      locations[keyOrLocations] = location;
    } else if (typeof keyOrLocations === "object") {
      if (typeof location !== "undefined") {
        throw new Error("The location argument should not be used if you pass an object to set().");
      }
      locations = keyOrLocations;
    } else {
      throw new Error("keyOrLocations must be a string or a mapping of key - location pairs.");
    }

    var newData = {};

    Object.keys(locations).forEach(function(key) {
      validateKey(key);

      var location = locations[key];
      if (location === null) {
        // Setting location to null is valid since it will remove the key
        newData[key] = null;
      } else {
        validateLocation(location);

        var geohash = encodeGeohash(location);
        newData[key] = encodeGeoFireObject(location, geohash);
      }
    });

    return _firebaseRef.update(newData);
  };

  /**
   * Returns a promise fulfilled with the location corresponding to the provided key.
   *
   * If the provided key does not exist, the returned promise is fulfilled with null.
   *
   * @param {string} key The key of the location to retrieve.
   * @return {Promise.<Array.<number>>} A promise that is fulfilled with the location of the given key.
   */
  this.get = function(key) {
    validateKey(key);
    return _firebaseRef.child(key).once("value").then(function(dataSnapshot) {
      var snapshotVal = dataSnapshot.val();
      if (snapshotVal === null) {
        return null;
      } else {
        return decodeGeoFireObject(snapshotVal);
      }
    });
  };

  /**
   * Removes the provided key from this GeoFire. Returns an empty promise fulfilled when the key has been removed.
   *
   * If the provided key is not in this GeoFire, the promise will still successfully resolve.
   *
   * @param {string} key The key of the location to remove.
   * @return {Promise.<string>} A promise that is fulfilled after the inputted key is removed.
   */
  this.remove = function(key) {
    return this.set(key, null);
  };

  /**
   * Returns a new GeoQuery instance with the provided queryCriteria.
   *
   * @param {Object} queryCriteria The criteria which specifies the GeoQuery's center and radius.
   * @return {GeoQuery} A new GeoQuery object.
   */
  this.query = function(queryCriteria) {
    return new GeoQuery(_firebaseRef, queryCriteria);
  };

  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  if (Object.prototype.toString.call(firebaseRef) !== "[object Object]") {
    throw new Error("firebaseRef must be an instance of Firebase");
  }

  var _firebaseRef = firebaseRef;
};

/**
 * Static method which calculates the distance, in kilometers, between two locations,
 * via the Haversine formula. Note that this is approximate due to the fact that the
 * Earth's radius varies between 6356.752 km and 6378.137 km.
 *
 * @param {Array.<number>} location1 The [latitude, longitude] pair of the first location.
 * @param {Array.<number>} location2 The [latitude, longitude] pair of the second location.
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
