/**
 * Creates a GeoQuery instance.
 *
 * @constructor
 * @this {GeoQuery}
 * @param {object} firebaseRef A Firebase reference.
 * @param {object} queryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
 */
var GeoQuery = function (firebaseRef, queryCriteria) {
  /*********************/
  /*  PRIVATE METHODS  */
  /*********************/
  /**
   * Overwrites this GeoQuery's current query criteria with the inputted one.
   *
   * @param {object} newQueryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
   */
  function _saveCriteria(newQueryCriteria) {
    // Throw an error if there are any extraneous attributes
    for (var key in newQueryCriteria) {
      if (newQueryCriteria.hasOwnProperty(key)) {
        if (key !== "center" && key !== "radius") {
          throw new Error("Unexpected \"" + key + "\" attribute found in query criteria.");
        }
      }
    }

    // Validate the "center" attribute
    if (typeof newQueryCriteria.center !== "undefined") {
      if (!(newQueryCriteria.center instanceof Array) || newQueryCriteria.center.length !== 2) {
        throw new Error("Invalid \"center\" attribute specified for query criteria. Expected array of length 2, got " + newQueryCriteria._center.length);
      }
      else {
        var latitude = newQueryCriteria.center[0];
        var longitude = newQueryCriteria.center[1];

        if (typeof latitude !== "number") {
          throw new Error("Invalid \"center\" attribute specified for query criteria. Latitude must be a number.");
        }
        else if (latitude < -90 || latitude > 90) {
          throw new Error("Invalid \"center\" attribute specified for query criteria. Latitude must be within the range [-90, 90].");
        }
        else if (typeof longitude !== "number") {
          throw new Error("Invalid \"center\" attribute specified for query criteria. Longitude must be a number.");
        }
        else if (longitude < -180 || longitude > 180) {
          throw new Error("Invalid \"center\" attribute specified for query criteria. Longitude must be within the range [-180, 180].");
        }
      }
    }

    // Validate the "radius" attribute
    if (typeof newQueryCriteria.radius !== "undefined") {
      if (typeof newQueryCriteria.radius !== "number") {
        throw new Error("Invalid \"radius\" attribute specified for query criteria. Radius must be a number.");
      }
      else if (newQueryCriteria.radius < 0) {
        throw new Error("Invalid \"radius\" attribute specified for query criteria. Radius must be greater than or equal to 0.");
      }
    }

    // Save the query criteria
    _center = newQueryCriteria.center || _center;
    _centerHash = encodeGeohash(_center, g_GEOHASH_LENGTH);
    _radius = newQueryCriteria.radius || _radius;
  }


  function _fireCallbacks(locationKey, location) {
    var distanceFromCenter = dist(location, _center);
    var wasAlreadyInQuery = (_locationsInQuery[locationKey] !== undefined);
    var isNowInQuery = (distanceFromCenter <= _radius);
    if (!wasAlreadyInQuery && isNowInQuery) {
      _callbacks.key_entered.forEach(function(callback) {
        callback(locationKey, location, distanceFromCenter);
      });

      // Add the current location key to our list of location keys within this GeoQuery
      _locationsInQuery[locationKey] = location;
    }
    else if (wasAlreadyInQuery && !isNowInQuery) {
      _callbacks.key_exited.forEach(function(callback) {
        callback(locationKey, location, distanceFromCenter);
      });

      // Remove the current location key from our list of location keys within this GeoQuery
      delete _locationsInQuery[locationKey];
    }
    else if (wasAlreadyInQuery) {
      _callbacks.key_moved.forEach(function(callback) {
        callback(locationKey, location, distanceFromCenter);
      });

      // Update the current location's location
      _locationsInQuery[locationKey] = location;
    }
  }

  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Returns a promise fulfilled with the locations inside of this GeoQuery.
   *
   * @return {promise} A promise that is fulfilled with an array of locations which are inside of this
   *                   GeoQuery. The array takes the form of { key1: location1, key2: location2, ... }.
   */
  this.results = function() {
    return new RSVP.Promise(function(resolve) {
      var results = [];
      for (var key in _locationsInQuery) {
        if (_locationsInQuery.hasOwnProperty(key)) {
          results.push({
            key: key,
            location: _locationsInQuery[key]
            // TODO: add distance
          });
        }
      }
      resolve(results);
    });
  };

  /**
   * Attaches a callback to this GeoQuery for a given event type.
   *
   * @param {string} eventType The event type for which to attach the callback. One of "key_entered", "key_exited", or "key_moved".
   * @param {function} callback Callback function to be called when an event of type eventType fires.
   * @return {GeoCallbackRegistration} A callback registration which can be used to cancel the provided callback.
   */
  this.on = function(eventType, callback) {
    if (["key_entered", "key_exited", "key_moved"].indexOf(eventType) === -1) {
      throw new Error("Event type must be \"key_entered\", \"key_exited\", or \"key_moved\"");
    }
    if (typeof callback !== "function") {
      throw new Error("Event callback must be a function.");
    }

    // Add the callback to this GeoQuery's callbacks list
    _callbacks[eventType].push(callback);

    // Fire the "key_entered" callback for every location already within our GeoQuery
    if (eventType === "key_entered") {
      for (var key in _locationsInQuery) {
        if (_locationsInQuery.hasOwnProperty(key)) {
          callback(key, _locationsInQuery[key], dist(_locationsInQuery[key], _center));
        }
      }
    }

    // Return an event registration which can be used to cancel the callback
    return new GeoCallbackRegistration(function() {
      _callbacks[eventType].splice(_callbacks[eventType].indexOf(callback), 1);
    });
  };

  /**
   * Terminates this GeoQuery so that it no longer sends location updates.
   */
  this.cancel = function () {
    _callbacks = {
      key_entered: [],
      key_exited: [],
      key_moved: []
    };

    // TODO: only cancel this particular instance of the callback; add test for this
    _firebaseRef.child("indices").off("child_added");
    _firebaseRef.child("locations").off("child_removed");
  };

  /**
   * Updates this GeoQuery's query criteria.
   *
   * @param {object} newQueryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
   */
  this.updateCriteria = function(newQueryCriteria) {
    _saveCriteria(newQueryCriteria);

    // Loop through all of the locations and fire the "key_entered" or "key_exited" callbacks if necessary
    for (var key in _allLocations) {
      if (_allLocations.hasOwnProperty(key)) {
        _fireCallbacks(key, _allLocations[key]);
      }
    }
  };

  /**
   * Returns this GeoQuery's center.
   *
   * @return {array} The [latitude, longitude] pair signifying the center of this GeoQuery.
   */
  this.center = function() {
    return _center;
  };

  /**
   * Returns this GeoQuery's radius.
   *
   * @return {integer} The radius of this GeoQuery.
   */
  this.radius = function() {
    return _radius;
  };

  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  if (typeof queryCriteria.center === "undefined") {
    throw new Error("No \"center\" attribute specified for query criteria.");
  }
  if (typeof queryCriteria.radius === "undefined") {
    throw new Error("No \"radius\" attribute specified for query criteria.");
  }

  var _firebaseRef = firebaseRef;
  var _callbacks = {
    key_entered: [],
    key_exited: [],
    key_moved: []
  };
  var _locationsInQuery = {};
  var _allLocations = {};

  var _center, _radius, _centerHash;
  _saveCriteria(queryCriteria);

  // Fire any key events for new or existing indices
  _firebaseRef.child("indices").on("child_added", function(indicesChildSnapshot) {
    var childName = indicesChildSnapshot.name();
    var locationKey = childName.slice(g_GEOHASH_LENGTH);

    _firebaseRef.child("locations/" + locationKey).once("value", function(locationsDataSnapshot) {
      var location = locationsDataSnapshot.val().split(",").map(Number);

      _allLocations[locationKey] = location;

      _fireCallbacks(locationKey, location);
    });
  });

  // Fire the "key_exited" event if a location in the query is removed entirely from geoFire
  _firebaseRef.child("locations").on("child_removed", function(locationsChildSnapshot) {
    var locationKey = locationsChildSnapshot.name();
    if (_locationsInQuery[locationKey] !== undefined) {
      var distanceFromCenter = dist(_locationsInQuery[locationKey], _center);
      _callbacks.key_exited.forEach(function(callback) {
        callback(locationKey, _allLocations[locationKey], distanceFromCenter);
      });
      delete _allLocations[locationKey];
    }
  });
};