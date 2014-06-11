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
   * Fires each callback for the provided eventType, passing it provided key's data.
   *
   * @param {string} eventType The event type whose callbacks to fire. One of "key_entered", "key_exited", or "key_moved".
   * @param {string} key The key of the location for which to fire the callbacks.
   */
  function _fireCallbacksForKey(eventType, key) {
    var locationDict = _locationsQueried[key];
    _callbacks[eventType].forEach(function(callback) {
      callback(key, locationDict.location, locationDict.distanceFromCenter);
    });
  }

  /**
   * Fires each callback for the "ready" event.
   */
  function _fireReadyEventCallbacks() {
    _callbacks.ready.forEach(function(callback) {
      callback();
    });
  }

  /**
   * Attaches a value callback for the provided key which will update the information about the key
   * every time its location changes. It also fires any necessary events when the key's location
   * changes.
   *
   * When the provided key is removed from GeoFire, this value callback will remove itself and delete
   * the globally stored information about the key.
   *
   * @param {string} key The key for which to attach the value callback.
   */
  function _attachValueCallback(indicesChildSnapshot) {
    // If the below "value" event has not fired yet, we should wait to the the "ready" event until
    // this child added event is completely processed
    if (_valueEventFired === false) {
      _numChildAddedEventsToProcess++;
    }

    // Get the key from the child snapshot's name, which has the form "<geohash><key>"
    var key = indicesChildSnapshot.name().slice(g_GEOHASH_PRECISION);

    // If the key is not already being queried, attach a "value" callback to it
    if (typeof _locationsQueried[key] === "undefined") {
      var locationValueCallback = _firebaseRef.child("l/" + key).on("value", function(locationsDataSnapshot) {
        // Get the key's current location
        var location = locationsDataSnapshot.val() ? locationsDataSnapshot.val().split(",").map(Number) : null;

        // If this is the first time we are receiving the location for this key, check if we should fire the
        // "key_entered" event
        if (typeof _locationsQueried[key] === "undefined" || _locationsQueried[key].isInQuery === false) {
          if (location === null) {
            _firebaseRef.child("l/" + key).off("value", _locationsQueried[key].valueCallback);
            delete _locationsQueried[key];
          }
          else {
            // Determine if the location was and is now within this query
            var distanceFromCenter = GeoFire.distance(location, _center);
            var isInQuery = (distanceFromCenter <= _radius);

            // Add this location to the all locations queried dictionary even if it is not added to the list of
            // locations within this query
            _locationsQueried[key] = {
              location: location,
              distanceFromCenter: distanceFromCenter,
              isInQuery: isInQuery,
              valueCallback: locationValueCallback
            };

            // Fire the "key_entered" event if the provided key has entered this query
            if (isInQuery) {
              _fireCallbacksForKey("key_entered", key);
            }

            // Fire the "key_ready" event if we have processed all the "child_added" events and the "value" event has fired
            if (_numChildAddedEventsToProcess > 0) {
              _numChildAddedEventsToProcess--;
              if (_valueEventFired && _numChildAddedEventsToProcess === 0) {
                _fireReadyEventCallbacks();
              }
            }

            // TODO: should I do this?
            //if (!_locationsQueried[key].isInQuery) {
            //  _firebaseRef.child("l/" + key).off("value", _locationsQueried[key].valueCallback);
            //}
          }
        }

        // Otherwise,
        else {
          if (location === null || location[0] !== _locationsQueried[key].location[0] || location[1] !== _locationsQueried[key].location[1]) {
            // If the updated location has changed, calculate if it is still in this query
            _locationsQueried[key].location = location;
            _locationsQueried[key].distanceFromCenter = (location === null) ? null : GeoFire.distance(location, _center);
            _locationsQueried[key].isInQuery = (location === null) ? false : (_locationsQueried[key].distanceFromCenter <= _radius);

            // If the updated location is still in the query, fire the "key_moved" event and save the key's updated
            // location in the list of keys in this query
            if (_locationsQueried[key].isInQuery) {
              _fireCallbacksForKey("key_moved", key);
            }

            // Otherwise, fire the "key_exited" event, cancel the key's value callback, and remove it from the list of
            // locations in this query
            else {
              _fireCallbacksForKey("key_exited", key);

              if (location === null) {
                _firebaseRef.child("l/" + key).off("value", _locationsQueried[key].valueCallback);
                delete _locationsQueried[key];
              }
            }
          }
        }
      });
    }
  }

  /**
   * Attaches listeners to Firebase which track when new keys are added near this query.
   */
  function _listenForNewGeohashes() {
    // Determine a zoom level at which to find neighboring geohashes
    var zoomLevel = 6;
    while (_radius > g_BOUNDING_BOX_SHORTEST_EDGE_BY_GEOHASH_LENGTH[zoomLevel]) {
      zoomLevel -= 1;
    }

    // Get the geohash for this query's center at the determined zoom level
    var centerHash = encodeGeohash(_center, g_GEOHASH_PRECISION).substring(0, zoomLevel);

    // Get the list of geohashes to query
    var geohashesToQuery = neighbors(centerHash);
    geohashesToQuery.push(centerHash);

    // Filter out empty and duplicate geohashes
    geohashesToQuery = geohashesToQuery.filter(function(geohash, i){
      return (geohash !== "" && geohashesToQuery.indexOf(geohash) === i);
    });

    // For all of the geohashes that we are already currently querying, check if they are still
    // supposed to be queried. If so, don't re-query them. Otherwise, mark them to be un-queried
    // next time we clean up the current geohashes queried dictionary.
    for (var geohashStartPrefix in _currentGeohashesQueried) {
      if (_currentGeohashesQueried.hasOwnProperty(geohashStartPrefix)) {
        var index = geohashesToQuery.indexOf(geohashStartPrefix);
        if (index === -1) {
          _currentGeohashesQueried[geohashStartPrefix] = false;
        }
        else {
          _currentGeohashesQueried[geohashStartPrefix] = true;
          geohashesToQuery.splice(index, 1);
        }
      }
    }

    // Keep track of how many geohashes have been processed so we know when to fire the "ready" event
    var numGeohashesToQueryProcessed = 0;

    // Loop through each geohash to query for and listen for new geohashes which have the same prefix.
    // For every match, attach a value callback which will fire the appropriate events.
    // Once every geohash to query is processed, fire the "ready" event.
    for (var i = 0, numGeohashesToQuery = geohashesToQuery.length; i < numGeohashesToQuery; ++i) {
      // Set the start prefix as a subset of the current geohash
      var startPrefix = geohashesToQuery[i].substring(0, zoomLevel);

      // Set the end prefix as the start prefix plus ~ to put it last in alphabetical order
      var endPrefix = startPrefix + "~";

      // Create the Firebase query
      var firebaseQuery = _firebaseRef.child("i").startAt(null, startPrefix).endAt(null, endPrefix);

      // Add the geohash start prefix to the current geohashes queried dictionary and mark it as not
      // to be un-queried
      _currentGeohashesQueried[startPrefix] = true;

      // For every new matching geohash, determine if we should fire the "key_entered" event
      firebaseQuery.on("child_added", _attachValueCallback);

      // Once the current geohash to query is processed, see if it is the last one to be processed
      // and, if so, mark the value event as fired.
      // Note that Firebase fires the "value" event after every "child_added" event fires.
      /* jshint -W083 */
      firebaseQuery.once("value", function() {
        numGeohashesToQueryProcessed++;
        _valueEventFired = (numGeohashesToQueryProcessed === geohashesToQuery.length);

        // It's possible that there are no more child added events to process and that the "ready"
        // event will therefore not get called. We should call the "ready" event in that case.
        if (_valueEventFired && _numChildAddedEventsToProcess === 0) {
          _fireReadyEventCallbacks();
        }
      });
      /* jshint +W083 */
    }
  }

  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Returns the location signifying the center of this query.
   *
   * @return {array} The [latitude, longitude] pair signifying the center of this query.
   */
  this.center = function() {
    return _center;
  };

  /**
   * Returns the radius of this query, in kilometers.
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
    //console.group("updateCriteria()");
    //console.time("TOTAL updateCriteria()");
    // Save the new query criteria
    //console.time("_saveCriteria()");
    // Validate and save the new query criteria
    validateCriteria(newQueryCriteria);
    _center = newQueryCriteria.center || _center;
    _radius = newQueryCriteria.radius || _radius;
    //console.timeEnd("_saveCriteria()");

    //console.time("Fire \"key_exited\" and \"key_entered\"");
    // Loop through all of the locations in the query, update their distance from the center of the
    // query, and fire any appropriate events
    for (var key in _locationsQueried) {
      if (_locationsQueried.hasOwnProperty(key)) {
        // Get the cached information for this location
        var locationDict = _locationsQueried[key];

        // Save if the location was already in the query
        var wasAlreadyInQuery = locationDict.isInQuery;

        // Update the location's distance to the new query center
        locationDict.distanceFromCenter = GeoFire.distance(locationDict.location, _center);

        // Determine if the location is now in this query
        locationDict.isInQuery = (locationDict.distanceFromCenter <= _radius);

        // If the location just left the query, fire the "key_exited" callbacks
        if (wasAlreadyInQuery && !locationDict.isInQuery) {
          _fireCallbacksForKey("key_exited", key);

          // TODO: do I need to do this?
          //_firebaseRef.child("l/" + key).off("value", locationDict.valueCallback);
        }

        // If the location just entered the query, fire the "key_entered" callbacks
        else if (!wasAlreadyInQuery && locationDict.isInQuery) {
          _fireCallbacksForKey("key_entered", key);
        }
      }
    }
    //console.timeEnd("Fire \"key_exited\" and \"key_entered\"");

    // Reset the variables which control when the "ready" event fires
    //console.time("_listenForNewGeohashes()");
    _valueEventFired = false;
    _numChildAddedEventsToProcess = 0;

    // Listen for new geohashes being added to GeoFire and fire the appropriate events
    _listenForNewGeohashes();
    //console.timeEnd("_listenForNewGeohashes()");

    //console.timeEnd("TOTAL updateCriteria()");
    //console.groupEnd("updateCriteria()");
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
      for (var key in _locationsQueried) {
        if (_locationsQueried.hasOwnProperty(key)) {
          var locationDict = _locationsQueried[key];
          if (locationDict.isInQuery) {
            callback(key, locationDict.location, locationDict.distanceFromCenter);
          }
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

    // Turn off all Firebase listeners for the current geohashes being queried
    for (var geohashStartPrefix in _currentGeohashesQueried) {
      if (_currentGeohashesQueried.hasOwnProperty(geohashStartPrefix)) {
        _firebaseRef.child("i").off("child_added", _attachValueCallback);
        delete _currentGeohashesQueried[geohashStartPrefix];
      }
    }

    // Loop through all of the locations in the query and cancel their value change event callbacks
    for (var key in _locationsQueried) {
      if (_locationsQueried.hasOwnProperty(key)) {
        _firebaseRef.child("l/" + key).off("value", _locationsQueried[key].valueCallback);
        delete _locationsQueried[key];
      }
    }
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

  // A dictionary of keys which were queried for the current criteria
  // Note that not all of these are currently within this query
  var _locationsQueried = {};

  // A dictionary of geohashes which currently have an active "child_added" event callback
  var _currentGeohashesQueried = {};

  // Every ten seconds, clean up the geohashes we are currently querying for. We keep these around
  // for a little while since it's likely that they will need to be re-queried shortly after they
  // move outside of the query's bounding box.
  setInterval(function() {
    for (var geohashStartPrefix in _currentGeohashesQueried) {
      if (_currentGeohashesQueried.hasOwnProperty(geohashStartPrefix)) {
        if (_currentGeohashesQueried[geohashStartPrefix] === false) {
          _firebaseRef.child("i").off("child_added", _attachValueCallback);
          delete _currentGeohashesQueried[geohashStartPrefix];

          // TODO: cancel all _locationsQueried[key] listeners with that start prefix?
          //_firebaseRef.child("i").off("child_added");
        }
      }
    }
  }, 10000);

  // Validate and save the query criteria
  validateCriteria(queryCriteria, /* requireCenterAndRadius */ true);
  var _center = queryCriteria.center;
  var _radius = queryCriteria.radius;

  // Listen for new geohashes being added around this query and fire the appropriate events
  _listenForNewGeohashes();
};