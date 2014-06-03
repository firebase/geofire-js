/**
 * Creates a GeoQuery instance.
 *
 * @constructor
 * @this {GeoQuery}
 * @param {object} firebaseRef A Firebase reference.
 * @param {object} queryCriteria The criteria which specifies the query's center and radius.
 */
var GeoQuery = function (firebaseRef, queryCriteria) {
  /*********************/
  /*  PRIVATE METHODS  */
  /*********************/
  /**
   * Overwrites this query's current query criteria with the inputted one.
   *
   * @param {object} newQueryCriteria The criteria which specifies the query's center and radius.
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


  /**
   * Fires the "key_entered" and "key_moved" callbacks for the provided key-location pair if necessary.
   *
   * @param {string/number} key The key of the location to check.
   * @param {array} location The [latitude, longitude] pair of the location to check.
   */
  function _fireKeyEnteredAndMovedCallbacks(key, location) {
    var distanceFromCenter = dist(location, _center);
    var wasAlreadyInQuery = (_locationsInQuery[key] !== undefined);
    var isNowInQuery = (distanceFromCenter <= _radius);

    if (isNowInQuery) {
      // Fire either the "key_moved" or "key_entered" callbacks if the provided key is currently within our query
      if (wasAlreadyInQuery) {
        _callbacks.key_moved.forEach(function(callback) {
          callback(key, location, distanceFromCenter);
        });
      }
      else {
        _callbacks.key_entered.forEach(function(callback) {
          callback(key, location, distanceFromCenter);
        });
      }

      // Keep track of all locations currently within this query
      _locationsInQuery[key] = location;

      // When the key's location changes, check if the "key_exited" event should fire
      var keyExitedCallback = _firebaseRef.child("locations/" + key).on("value", function(locationsDataSnapshot) {
        var updatedLocation = locationsDataSnapshot.val() ? locationsDataSnapshot.val().split(",").map(Number) : null;
        if (updatedLocation === null || updatedLocation[0] !== location[0] || updatedLocation[1] !== location[1]) {
          _firebaseRef.child("locations/" + key).off("value", keyExitedCallback);
          _fireKeyExitedCallbacks(key, updatedLocation);
        }
      });
    }

    // Fire the "key_ready" callbacks if we have processed all the "child_added" events and our value event has fired
    if (_numChildAddedEventsToProcess > 0) {
      _numChildAddedEventsToProcess--;
      if (_valueEventFired && _numChildAddedEventsToProcess === 0) {
        _callbacks.ready.forEach(function(callback) {
          callback();
        });
      }
    }
  }

  /**
   * Fires the "key_exited" callbacks for the provided key-location pair if necessary.
   *
   * @param {string/number} key The key of the location to check.
   * @param {array} location The [latitude, longitude] pair of the location to check.
   */
  function _fireKeyExitedCallbacks(key, location) {
    var wasAlreadyInQuery = (_locationsInQuery[key] !== undefined);
    var distanceFromCenter = (location === null) ? null : dist(location, _center);
    var isNowInQuery = (location === null) ? false : (distanceFromCenter <= _radius);

    if (wasAlreadyInQuery && !isNowInQuery) {
      // Fire the "key_exited" callbacks if the provided key just moved out of this query
      _callbacks.key_exited.forEach(function(callback) {
        callback(key, location, distanceFromCenter);
      });

      // Remove the provided key from our list of locations currently within this query
      delete _locationsInQuery[key];
    }
  }

  /**
   * Attaches listeners to Firebase which track when new keys are added near this query.
   */
  function _listenForKeys() {
    // Approximate the bounding box dimensions depending on hash length
    var boundingBoxShortestEdgeByHashLength = [
      null,
      5003.771699005143,
      625.4714623756429,
      156.36786559391072,
      19.54598319923884,
      4.88649579980971,
      0.6108119749762138
    ];

    // Determine a zoom level at which to find neighboring geohashes
    var zoomLevel = 6;
    while (_radius > boundingBoxShortestEdgeByHashLength[zoomLevel]) {
      zoomLevel -= 1;
    }

    // Get the geohash for this query's center at the determined zoom level
    var centerHash = encodeGeohash(_center, g_GEOHASH_LENGTH).substring(0, zoomLevel);

    // TODO: Be smarter about this, and only zoom out if actually optimal.
    // Get the list of geohashes to query
    var geohashesToQuery = neighbors(centerHash);
    geohashesToQuery.push(centerHash);

    // Filter out any duplicate or empty geohashes from our query list
    geohashesToQuery = geohashesToQuery.filter(function(item, i){
      return (item.length > 0 && geohashesToQuery.indexOf(item) === i);
    });

    // Keep track of how many geohashes have been processed so we know when to fire the "ready" event
    var numGeohashesToQueryProcessed = 0;

    // Loop through each geohash to query for and listen for new geohashes which have the same prefix.
    // For every match, determine if we should fire the "key_entered" or "key_moved" events.
    // Once every geohash to query is processed, fire the "ready" event.
    for (var i = 0, numGeohashesToQuery = geohashesToQuery.length; i < numGeohashesToQuery; ++i) {
      // Set the start prefix as a subset of the current geohash
      var startPrefix = geohashesToQuery[i].substring(0, zoomLevel);

      // Set the end prefix as the start prefix plus a ~ to put it last in alphabetical order
      var endPrefix = startPrefix + "~";

      // Create the Firebase query
      var firebaseQuery = _firebaseRef.child("indices").startAt(null, startPrefix).endAt(null, endPrefix);

      // For every new matching geohash, determine if we should fire the "key_entered" or "key_moved" events.
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

      // Once the current geohash to query is processed, see if it is the last one to be processed
      // and, if so, flip the corresponding variable.
      // The "value" event will fire after every "child_added" event fires.
      firebaseQuery.once("value", function(dataSnapshot) {
        numGeohashesToQueryProcessed++;
        _valueEventFired = (numGeohashesToQueryProcessed === geohashesToQuery.length);
      });
    }
  }

  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   Returns the location signifying the center of this query.
   *
   * @return {array} The [latitude, longitude] pair signifying the center of this query.
   */
  this.center = function() {
    return _center;
  };

  /**
   Returns the radius of this query, in kilometers.
   *
   * @return {integer} The radius of this query, in kilometers.
   */
  this.radius = function() {
    return _radius;
  };

  /**
   * Updates the criteria for this query.
   *
   * @param {object} newQueryCriteria The criteria which specifies the query's center and radius.
   */
  this.updateCriteria = function(newQueryCriteria) {
    // Reset the variables which control when the "ready" event fires
    _valueEventFired = false;
    _numChildAddedEventsToProcess = 0;

    // Save the new query criteria
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

    // Listen for keys being added to GeoFire and fire the appropriate events
    _listenForKeys();
  };

  /**
   * Attaches a callback to this query which will be run when the provided eventType fires. Valid eventType
   * values are ready, key_entered, key_exited, and key_moved. The ready event callback is passed no parameters.
   * All other callbacks will be passed three parameters: (1) the location's key, (2) the location's
   * [latitude, longitude] pair, and (3) the distance, in kilometers, from the location to this query's center
   *
   * ready is used to signify that this query has loaded its initial state and is up-to-date with its corresponding
   * GeoFire instance. ready fires when this query has loaded all of the initial data from GeoFire and fired all
   * other events for that data. It also fires every time updateQuery() is called, after all other events have
   * fired for the updated query.
   *
   * key_entered fires when a key enters this query. This can happen when a key moves from a location outside of
   * this query to one inside of it or when a key is written to GeoFire for the first time and it falls within
   * this query.
   *
   * key_exited fires when a key moves from a location inside of this query to one outside of it. If the key was
   * entirely removed from GeoFire, both the location and distance passed to the callback will be null.
   *
   * key_moved fires when a key which is already in this query moves to another location inside of it.
   *
   * Returns a GeoCallbackRegistration which can be used to cancel the callback. You can add as many callbacks
   * as you would like for the same eventType by repeatedly calling on(). Each one will get called when its
   * corresponding eventType fires. Each callback must be cancelled individually.
   *
   * @param {string} eventType The event type for which to attach the callback. One of "ready", "key_entered",
   * "key_exited", or "key_moved".
   * @param {function} callback Callback function to be called when an event of type eventType fires.
   * @return {GeoCallbackRegistration} A callback registration which can be used to cancel the provided callback.
   */
  this.on = function(eventType, callback) {
    // Validate the inputs
    if (["ready", "key_entered", "key_exited", "key_moved"].indexOf(eventType) === -1) {
      throw new Error("Event type must be \"key_entered\", \"key_exited\", or \"key_moved\"");
    }
    if (typeof callback !== "function") {
      throw new Error("Event callback must be a function.");
    }

    // Add the callback to this query's callbacks list
    _callbacks[eventType].push(callback);

    // If this is a "key_entered" callback, fire it for every location already within this query
    if (eventType === "key_entered") {
      for (var key in _locationsInQuery) {
        if (_locationsInQuery.hasOwnProperty(key)) {
          callback(key, _locationsInQuery[key], dist(_locationsInQuery[key], _center));
        }
      }
    }

    // If this is a "ready" callback, fire it if this query is already ready
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
   * Terminates this query so that it no longer sends location updates. All callbacks attached to this
   * query via on() will be cancelled. This query can no longer be used in the future.
   */
  this.cancel = function () {
    // Cancel all callbacks in this query's callback list
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

  // Verify and save the query criteria
  if (typeof queryCriteria.center === "undefined") {
    throw new Error("No \"center\" attribute specified for query criteria.");
  }
  if (typeof queryCriteria.radius === "undefined") {
    throw new Error("No \"radius\" attribute specified for query criteria.");
  }
  _saveCriteria(queryCriteria);

  // Listen for keys being added to GeoFire and fire the appropriate events
  _listenForKeys();
};