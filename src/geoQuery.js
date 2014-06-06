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
   * Fires the "key_entered" callback for the provided key-location pair if the key has just entered this query.
   * Also attaches a callback to this key's value event which will fire the "key_moved" or "key_exited" events
   * when necessary.
   *
   * @param {string/number} key The key of the location to check.
   * @param {array} location The [latitude, longitude] pair of the location to check.
   */
  function _fireKeyEnteredCallbacks(key, location) {
    var distanceFromCenter = dist(location, _center);
    var wasAlreadyInQuery = (_locationsInQuery[key] !== undefined);
    var isNowInQuery = (distanceFromCenter <= _radius);

    if (!wasAlreadyInQuery && isNowInQuery) {
      // Add the location to the list of all locations in this query
      _locationsInQuery[key] = {
        location: location,
        distanceFromCenter: distanceFromCenter
      };

      // Fire the "key_entered" event if the provided key entered this query
      _callbacks.key_entered.forEach(function(callback) {
        callback(key, location, distanceFromCenter);
      });

      // When the key's location changes, check if the "key_moved" or "key_exited" events should fire
      _locationsInQuery[key].valueCallback = _firebaseRef.child("locations/" + key).on("value", function(locationsDataSnapshot) {
        // Check if the updated location has changed
        var updatedLocation = locationsDataSnapshot.val() ? locationsDataSnapshot.val().split(",").map(Number) : null;
        if (updatedLocation === null || updatedLocation[0] !== location[0] || updatedLocation[1] !== location[1]) {
          // If the updated location has changed, calculate if it is still in this query
          var updatedDistanceFromCenter = (updatedLocation === null) ? null : dist(updatedLocation, _center);
          var updatedIsNowInQuery = (updatedLocation === null) ? false : (updatedDistanceFromCenter <= _radius);

          // If the updated location is still in the query, fire the "key_moved" event and save the key's updated
          // location in the list of keys in this query
          if (updatedIsNowInQuery) {
            _callbacks.key_moved.forEach(function(callback) {
              callback(key, updatedLocation, updatedDistanceFromCenter);
            });

            _locationsInQuery[key].location = updatedLocation;
            _locationsInQuery[key].distanceFromCenter = updatedDistanceFromCenter;
          }

          // Otherwise, fire the "key_exited" event, cancel the key's value callback, and remove it from the list of
          // locations in this query
          else {
            _firebaseRef.child("locations/" + key).off("value", _locationsInQuery[key].valueCallback);

            _callbacks.key_exited.forEach(function(callback) {
              callback(key, updatedLocation, updatedDistanceFromCenter);
            });

            delete _locationsInQuery[key];
          }
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
   * Attaches listeners to Firebase which track when new keys are added near this query.
   */
  function _listenForNewGeohashes() {
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

    // For all of the geohashes that we are already currently querying, check if they are still
    // supposed to be queried. If so, don't re-query them. Otherwise, stop querying them and remove
    // them from the current geohashes queried dictionary.
    for (var startPrefix in _currentGeohashesQueried) {
      if (_currentGeohashesQueried.hasOwnProperty(startPrefix)) {
        var index = geohashesToQuery.indexOf(startPrefix)
        if (index === -1) {
          _firebaseRef.child("indices").off("child_added", _currentGeohashesQueried[startPrefix]);
          delete _currentGeohashesQueried[startPrefix];
        }
        else {
          geohashesToQuery.splice(index, 1);
        }
      }
    }

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

      /* jshint -W083 */
      // For every new matching geohash, determine if we should fire the "key_entered" event
      var childAddedCallback = firebaseQuery.on("child_added", function(indicesChildSnapshot) {
        if (!_valueEventFired) {
          _numChildAddedEventsToProcess++;
        }

        var key = indicesChildSnapshot.name().slice(g_GEOHASH_LENGTH);

        _firebaseRef.child("locations/" + key).once("value", function(locationsDataSnapshot) {
          var location = locationsDataSnapshot.val().split(",").map(Number);

          // Add this location to the all locations queried dictionary even if it is not added to the list
          // of locations within this query
          _allLocationsQueried[key] = location;

          // Fire the "key_entered" event if the location is actually within this query
          _fireKeyEnteredCallbacks(key, location);
        });
      });

      // Add the geohash to the current geohashes queried dictionary
      _currentGeohashesQueried[startPrefix] = childAddedCallback;

      // Once the current geohash to query is processed, see if it is the last one to be processed
      // and, if so, flip the corresponding variable.
      // The "value" event will fire after every "child_added" event fires.
      firebaseQuery.once("value", function() {
        numGeohashesToQueryProcessed++;
        _valueEventFired = (numGeohashesToQueryProcessed === geohashesToQuery.length);

        // It's possible that there are no more child added events to process and that the "ready"
        // event will therefore not get called. We should call the "ready" event in that case.
        if (_valueEventFired && _numChildAddedEventsToProcess === 0) {
          _callbacks.ready.forEach(function(callback) {
            callback();
          });
        }
      });
      /* jshint +W083 */
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
    // Save the new query criteria
    _saveCriteria(newQueryCriteria);

    // Loop through all of the locations in the query and fire the "key_exited" callbacks if necessary
    for (var key in _locationsInQuery) {
      if (_locationsInQuery.hasOwnProperty(key)) {
        var locationDict = _locationsInQuery[key];

        // Update the location's distance from the new center
        locationDict.distanceFromCenter = dist(locationDict.location, _center);

        var isNowInQuery = (locationDict.distanceFromCenter <= _radius);
        if (!isNowInQuery) {
          // Fire the "key_exited" callbacks if the provided key just moved out of this query
          /* jshint -W083 */
          _callbacks.key_exited.forEach(function(callback) {
            callback(key, locationDict.location, locationDict.distanceFromCenter);
          });
          /* jshint +W083 */

          _firebaseRef.child("locations/" + key).off("value", locationDict.valueCallback);

          // Remove the provided key from our list of locations currently within this query
          delete _locationsInQuery[key];
        }
      }
    }

    // Loop through all the locations which were queried and fire the "key_entered" callbacks if necessary
    for (key in _allLocationsQueried) {
      if (_allLocationsQueried.hasOwnProperty(key)) {
        _fireKeyEnteredCallbacks(key, _allLocationsQueried[key]);
      }
    }

    // Reset the variables which control when the "ready" event fires
    _valueEventFired = false;
    _numChildAddedEventsToProcess = 0;

    // Listen for new geohashes being added to GeoFire and fire the appropriate events
    _listenForNewGeohashes();
  };

  /**
   * Attaches a callback to this query which will be run when the provided eventType fires. Valid eventType
   * values are "ready", "key_entered", "key_exited", and "key_moved". The ready event callback is passed no
   * parameters. All other callbacks will be passed three parameters: (1) the location's key, (2) the location's
   * [latitude, longitude] pair, and (3) the distance, in kilometers, from the location to this query's center
   *
   * "ready" is used to signify that this query has loaded its initial state and is up-to-date with its corresponding
   * GeoFire instance. "ready" fires when this query has loaded all of the initial data from GeoFire and fired all
   * other events for that data. It also fires every time updateQuery() is called, after all other events have
   * fired for the updated query.
   *
   * "key_entered" fires when a key enters this query. This can happen when a key moves from a location outside of
   * this query to one inside of it or when a key is written to GeoFire for the first time and it falls within
   * this query.
   *
   * "key_exited" fires when a key moves from a location inside of this query to one outside of it. If the key was
   * entirely removed from GeoFire, both the location and distance passed to the callback will be null.
   *
   * "key_moved" fires when a key which is already in this query moves to another location inside of it.
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
          var locationDict = _locationsInQuery[key];
          callback(key, locationDict.location, locationDict.distanceFromCenter);
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
    //_firebaseRef.child("indices").off("child_added");
    for (var key in _currentGeohashesQueried) {
      if (_currentGeohashesQueried.hasOwnProperty(key)) {
        _firebaseRef.child("indices").off("child_added", _currentGeohashesQueried[key]);
      }
    }

    // Loop through all of the locations in the query and cancel their value change event callbacks
    for (var key in _locationsInQuery) {
      if (_locationsInQuery.hasOwnProperty(key)) {
        _firebaseRef.child("locations/" + key).off("value", _locationsInQuery[key].valueCallback);
      }
    }
    _locationsInQuery = [];
  };


  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  // Firebase reference of the GeoFire which created this query
  var _firebaseRef = firebaseRef;

  // Event callbacks
  var _callbacks = {
    ready: [],
    key_entered: [],
    key_exited: [],
    key_moved: []
  };

  // Variables used to keep track of when to fire the "ready" event
  var _valueEventFired = false;
  var _numChildAddedEventsToProcess = 0;

  // A dictionary of keys which are currently within this query
  var _locationsInQuery = {};

  // A dictionary of keys which were queried for the current criteria
  // Note that not all of these are currently within this query
  var _allLocationsQueried = {};

  // A dictionary of geohashes which currently have an active "child_added" event callback
  var _currentGeohashesQueried = {};

  // Query criteria
  var _center, _radius;

  // Verify and save the query criteria
  if (typeof queryCriteria.center === "undefined") {
    throw new Error("No \"center\" attribute specified for query criteria.");
  }
  if (typeof queryCriteria.radius === "undefined") {
    throw new Error("No \"radius\" attribute specified for query criteria.");
  }
  _saveCriteria(queryCriteria);

  // Listen for new geohashes being added to GeoFire and fire the appropriate events
  _listenForNewGeohashes();
};