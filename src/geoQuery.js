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
      if (Object.prototype.toString.call(newQueryCriteria.center) !== "[object Array]" || newQueryCriteria.center.length !== 2) {
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
    _radius = newQueryCriteria.radius || _radius;
  }


  // TODO: function description/comment
  function _fireKeyEnteredAndMovedCallbacks(key, location) {
    var distanceFromCenter = dist(location, _center);
    var wasAlreadyInQuery = (_locationsInQuery[key] !== undefined);
    var isNowInQuery = (distanceFromCenter <= _radius);

    if (isNowInQuery) {
      if (wasAlreadyInQuery) {
        _callbacks.key_moved.forEach(function(callback) {
          callback(key, location, distanceFromCenter);
        });

        // Update the current location's location
        _locationsInQuery[key] = location;
      }
      else {
        _callbacks.key_entered.forEach(function(callback) {
          callback(key, location, distanceFromCenter);
        });

        // Add the current location key to our list of location keys within this GeoQuery
        _locationsInQuery[key] = location;
      }

      // When the key's location changes, check if the "key_exited" event should fire
      var keyExitedCallback = _firebaseRef.child("locations/" + key).on("value", function(locationsDataSnapshot) {
        var updatedLocation = locationsDataSnapshot.val() ? locationsDataSnapshot.val().split(",").map(Number) : null;
        if (updatedLocation === null || updatedLocation[0] !== location[0] || updatedLocation[1] !== location[1]) {
          _firebaseRef.child("locations/" + key).off("value", keyExitedCallback);
          _fireKeyExitedCallbacks(key, updatedLocation);
        }
      });
    }

    if (_numChildAddedEventsToProcess > 0) {
      _numChildAddedEventsToProcess--;
      if (_valueEventFired && _numChildAddedEventsToProcess === 0) {
        _callbacks.ready.forEach(function(callback) {
          callback();
        });
      }
    }
  }

  // TODO: function description/comment
  function _fireKeyExitedCallbacks(key, location) {
    var wasAlreadyInQuery = (_locationsInQuery[key] !== undefined);
    var distanceFromCenter = (location === null) ? null : dist(location, _center);
    var isNowInQuery = (location === null) ? false : (distanceFromCenter <= _radius);

    if (wasAlreadyInQuery && !isNowInQuery) {
      _callbacks.key_exited.forEach(function(callback) {
        callback(key, location, distanceFromCenter);
      });

      // Remove the current location key from our list of location keys within this GeoQuery
      delete _locationsInQuery[key];
    }
  }

  /**
     * Find all data points within the specified radius, in kilometers,
     * from the point with the specified geohash.
     * The matching points are passed to the callback function in distance sorted order.
     * If the setAlert flag is set, the callback function is called each time the search results change i.e.
     * if the set of data points that are within the radius changes.
     */
  function _listenForKeys() {
    // An approximation of the bounding box dimension per hash length.
    var boundingBoxShortestEdgeByHashLength = [
      null,
      5003.771699005143,
      625.4714623756429,
      156.36786559391072,
      19.54598319923884,
      4.88649579980971,
      0.6108119749762138
    ];
    var zoomLevel = 6;
    while (_radius > boundingBoxShortestEdgeByHashLength[zoomLevel]) {
      zoomLevel -= 1;
    }

    // Reduce the length of the query center's hash
    var centerHash = encodeGeohash(_center, g_GEOHASH_LENGTH).substring(0, zoomLevel);

    // TODO: Be smarter about this, and only zoom out if actually optimal.
    // Get the neighboring geohashes to query
    var neighborGeohashes = neighbors(centerHash);

    // Make sure we also query the center geohash
    neighborGeohashes.push(centerHash);

    // Remove any duplicate or empty neighboring geohashes
    neighborGeohashes = neighborGeohashes.filter(function(item, i){
      return (item.length > 0 && neighborGeohashes.indexOf(item) === i);
    });

    var numNeighborGeohashesProcessed = 0;

    // Listen for added and removed geohashes which have the same prefix as the neighboring geohashes
    for (var i = 0, numNeighbors = neighborGeohashes.length; i < numNeighbors; ++i) {
      // Set the start prefix as a subset of the current neighbor's geohash
      var startPrefix = neighborGeohashes[i].substring(0, zoomLevel);

      // Set the end prefix as the start prefix plus a ~ to put it last in alphabetical order
      var endPrefix = startPrefix + "~";

      // Query firebase for any matching geohashes
      var firebaseQuery = _firebaseRef.child("indices").startAt(null, startPrefix).endAt(null, endPrefix);

      var childAddedCallback = firebaseQuery.on("child_added", function(indicesChildSnapshot) {
        if (!_valueEventFired) {
          _numChildAddedEventsToProcess++;
        }
        var key = indicesChildSnapshot.name().slice(g_GEOHASH_LENGTH);

        _firebaseRef.child("locations/" + key).once("value", function(locationsDataSnapshot) {
          var location = locationsDataSnapshot.val().split(",").map(Number);
          _fireKeyEnteredAndMovedCallbacks(key, location, "child_added");
        });
      });
      _firebaseChildAddedCallbacks.push(childAddedCallback);

      firebaseQuery.once("value", function(dataSnapshot) {
        numNeighborGeohashesProcessed++;
        if (numNeighborGeohashesProcessed === neighborGeohashes.length) {
          _valueEventFired = true;
        }
      });
    }
  }

  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Attaches a callback to this GeoQuery for a given event type.
   *
   * @param {string} eventType The event type for which to attach the callback. One of "ready", "key_entered", "key_exited", or "key_moved".
   * @param {function} callback Callback function to be called when an event of type eventType fires.
   * @return {GeoCallbackRegistration} A callback registration which can be used to cancel the provided callback.
   */
  this.on = function(eventType, callback) {
    if (["ready", "key_entered", "key_exited", "key_moved"].indexOf(eventType) === -1) {
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

    if (eventType === "ready") {
      if (_valueEventFired) {
        callback();
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
      ready: [],
      key_entered: [],
      key_exited: [],
      key_moved: []
    };

    // Turn off all Firebase listeners for this query
    _firebaseChildAddedCallbacks.forEach(function(childAddedCallback) {
      _firebaseRef.child("indices").off("child_added", childAddedCallback);
    });
    _firebaseChildAddedCallbacks = [];
  };

  /**
   * Updates this GeoQuery's query criteria.
   *
   * @param {object} newQueryCriteria The criteria which specifies the GeoQuery's type, center, and radius.
   */
  this.updateCriteria = function(newQueryCriteria) {
    _valueEventFired = false;
    _numChildAddedEventsToProcess = 0;

    _saveCriteria(newQueryCriteria);

    // Turn off all Firebase listeners for the previous query criteria
    _firebaseChildAddedCallbacks.forEach(function(childAddedCallback) {
      _firebaseRef.child("indices").off("child_added", childAddedCallback);
    });
    _firebaseChildAddedCallbacks = [];

    // Loop through all of the locations in the query and fire the "key_exited" callbacks if necessary
    for (var key in _locationsInQuery) {
      if (_locationsInQuery.hasOwnProperty(key)) {
        _fireKeyExitedCallbacks(key, _locationsInQuery[key]);
      }
    }

    // Listen for keys being added and removed from GeoFire and fire the appropriate event callbacks
    _listenForKeys();
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
  // Private variables
  var _firebaseRef = firebaseRef;
  var _callbacks = {
    ready: [],
    key_entered: [],
    key_exited: [],
    key_moved: []
  };
  _valueEventFired = false;
  _numChildAddedEventsToProcess = 0;
  var _firebaseChildAddedCallbacks = [];
  var _locationsInQuery = {};
  var _center, _radius;

  // Verify the query criteria
  if (typeof queryCriteria.center === "undefined") {
    throw new Error("No \"center\" attribute specified for query criteria.");
  }
  if (typeof queryCriteria.radius === "undefined") {
    throw new Error("No \"radius\" attribute specified for query criteria.");
  }
  _saveCriteria(queryCriteria);

  // Listen for keys being added and removed from GeoFire and fire the appropriate event callbacks
  _listenForKeys();
};