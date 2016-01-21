/**
 * Creates a GeoQuery instance.
 *
 * @constructor
 * @this {GeoQuery}
 * @param {Firebase} firebaseRef A Firebase reference.
 * @param {Object} queryCriteria The criteria which specifies the query's center and radius.
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
   * @param {?Array.<number>} location The location as [latitude, longitude] pair
   * @param {?double} distanceFromCenter The distance from the center or null.
   */
  function _fireCallbacksForKey(eventType, key, location, distanceFromCenter) {
    _callbacks[eventType].forEach(function(callback) {
      if (typeof location === "undefined" || location === null) {
        callback(key, null, null);
      }
      else {
        callback(key, location, distanceFromCenter);
      }
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
   * Decodes a query string to a query
   *
   * @param {string} str The encoded query.
   * @return {Array.<string>} The decoded query as a [start, end] pair.
   */
  function _stringToQuery(string) {
    var decoded = string.split(":");
    if (decoded.length !== 2) {
      throw new Error("Invalid internal state! Not a valid geohash query: " + string);
    }
    return decoded;
  }

  /**
   * Encodes a query as a string for easier indexing and equality.
   *
   * @param {Array.<string>} query The query to encode.
   * @param {string} The encoded query as string.
   */
  function _queryToString(query) {
    if (query.length !== 2) {
      throw new Error("Not a valid geohash query: " + query);
    }
    return query[0]+":"+query[1];
  }

  /**
   * Turns off all callbacks for the provide geohash query.
   *
   * @param {Array.<string>} query The geohash query.
   * @param {Object} queryState An object storing the current state of the query.
   */
  function _cancelGeohashQuery(query, queryState) {
    var queryRef = _firebaseRef.orderByChild("g").startAt(query[0]).endAt(query[1]);
    queryRef.off("child_added", queryState.childAddedCallback);
    queryRef.off("child_removed", queryState.childRemovedCallback);
    queryRef.off("child_changed", queryState.childChangedCallback);
    queryRef.off("value", queryState.valueCallback);
  }

  /**
   * Removes unnecessary Firebase queries which are currently being queried.
   */
  function _cleanUpCurrentGeohashesQueried() {
    var keys = Object.keys(_currentGeohashesQueried);
    var numKeys = keys.length;
    for (var i = 0; i < numKeys; ++i) {
      var geohashQueryStr = keys[i];
      var queryState = _currentGeohashesQueried[geohashQueryStr];
      if (queryState.active === false) {
        var query = _stringToQuery(geohashQueryStr);
        // Delete the geohash since it should no longer be queried
        _cancelGeohashQuery(query, queryState);
        delete _currentGeohashesQueried[geohashQueryStr];
      }
    }

    // Delete each location which should no longer be queried
    keys = Object.keys(_locationsTracked);
    numKeys = keys.length;
    for (i = 0; i < numKeys; ++i) {
      var key = keys[i];
      if (!_geohashInSomeQuery(_locationsTracked[key].geohash)) {
        if (_locationsTracked[key].isInQuery) {
          throw new Error("Internal State error, trying to remove location that is still in query");
        }
        delete _locationsTracked[key];
      }
    }

    // Specify that this is done cleaning up the current geohashes queried
    _geohashCleanupScheduled = false;

    // Cancel any outstanding scheduled cleanup
    if (_cleanUpCurrentGeohashesQueriedTimeout !== null) {
      clearTimeout(_cleanUpCurrentGeohashesQueriedTimeout);
      _cleanUpCurrentGeohashesQueriedTimeout = null;
    }
  }

  /**
   * Callback for any updates to locations. Will update the information about a key and fire any necessary
   * events every time the key's location changes.
   *
   * When a key is removed from GeoFire or the query, this function will be called with null and performs
   * any necessary cleanup.
   *
   * @param {string} key The key of the geofire location.
   * @param {?Array.<number>} location The location as [latitude, longitude] pair.
   */
  function _updateLocation(key, location) {
    validateLocation(location);
    // Get the key and location
    var distanceFromCenter, isInQuery;
    var wasInQuery = (_locationsTracked.hasOwnProperty(key)) ? _locationsTracked[key].isInQuery : false;
    var oldLocation = (_locationsTracked.hasOwnProperty(key)) ? _locationsTracked[key].location : null;

    // Determine if the location is within this query
    distanceFromCenter = GeoFire.distance(location, _center);
    isInQuery = (distanceFromCenter <= _radius);

    // Add this location to the locations queried dictionary even if it is not within this query
    _locationsTracked[key] = {
      location: location,
      distanceFromCenter: distanceFromCenter,
      isInQuery: isInQuery,
      geohash: encodeGeohash(location, g_GEOHASH_PRECISION)
    };

    // Fire the "key_entered" event if the provided key has entered this query
    if (isInQuery && !wasInQuery) {
      _fireCallbacksForKey("key_entered", key, location, distanceFromCenter);
    } else if (isInQuery && oldLocation !== null && (location[0] !== oldLocation[0] || location[1] !== oldLocation[1])) {
      _fireCallbacksForKey("key_moved", key, location, distanceFromCenter);
    } else if (!isInQuery && wasInQuery) {
      _fireCallbacksForKey("key_exited", key, location, distanceFromCenter);
    }
  }

  /**
   * Checks if this geohash is currently part of any of the geohash queries.
   *
   * @param {string} geohash The geohash.
   * @param {boolean} Returns true if the geohash is part of any of the current geohash queries.
   */
  function _geohashInSomeQuery(geohash) {
    var keys = Object.keys(_currentGeohashesQueried);
    var numKeys = keys.length;
    for (var i = 0; i < numKeys; ++i) {
      var queryStr = keys[i];
      if (_currentGeohashesQueried.hasOwnProperty(queryStr)) {
        var query = _stringToQuery(queryStr);
        if (geohash >= query[0] && geohash <= query[1]) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Removes the location from the local state and fires any events if necessary.
   *
   * @param {string} key The key to be removed.
   * @param {?Array.<number>} currentLocation The current location as [latitude, longitude] pair
   * or null if removed.
   */
  function _removeLocation(key, currentLocation) {
    var locationDict = _locationsTracked[key];
    delete _locationsTracked[key];
    if (typeof locationDict !== "undefined" && locationDict.isInQuery) {
      var distanceFromCenter = (currentLocation) ? GeoFire.distance(currentLocation, _center) : null;
      _fireCallbacksForKey("key_exited", key, currentLocation, distanceFromCenter);
    }
  }

  /**
   * Callback for child added events.
   *
   * @param {Firebase DataSnapshot} locationDataSnapshot A snapshot of the data stored for this location.
   */
  function _childAddedCallback(locationDataSnapshot) {
    _updateLocation(locationDataSnapshot.key(), decodeGeoFireObject(locationDataSnapshot.val()));
  }

  /**
   * Callback for child changed events
   *
   * @param {Firebase DataSnapshot} locationDataSnapshot A snapshot of the data stored for this location.
   */
  function _childChangedCallback(locationDataSnapshot) {
    _updateLocation(locationDataSnapshot.key(), decodeGeoFireObject(locationDataSnapshot.val()));
  }

  /**
   * Callback for child removed events
   *
   * @param {Firebase DataSnapshot} locationDataSnapshot A snapshot of the data stored for this location.
   */
  function _childRemovedCallback(locationDataSnapshot) {
    var key = locationDataSnapshot.key();
    if (_locationsTracked.hasOwnProperty(key)) {
      _firebaseRef.child(key).once("value", function(snapshot) {
        var location = snapshot.val() === null ? null : decodeGeoFireObject(snapshot.val());
        var geohash = (location !== null) ? encodeGeohash(location) : null;
        // Only notify observers if key is not part of any other geohash query or this actually might not be
        // a key exited event, but a key moved or entered event. These events will be triggered by updates
        // to a different query
        if (!_geohashInSomeQuery(geohash)) {
          _removeLocation(key, location);
        }
      });
    }
  }

  /**
   * Called once all geohash queries have received all child added events and fires the ready
   * event if necessary.
   */
  function _geohashQueryReadyCallback(queryStr) {
    var index = _outstandingGeohashReadyEvents.indexOf(queryStr);
    if (index > -1) {
      _outstandingGeohashReadyEvents.splice(index, 1);
    }
    _valueEventFired = (_outstandingGeohashReadyEvents.length === 0);

    // If all queries have been processed, fire the ready event
    if (_valueEventFired) {
      _fireReadyEventCallbacks();
    }
  }

  /**
   * Attaches listeners to Firebase which track when new geohashes are added within this query's
   * bounding box.
   */
  function _listenForNewGeohashes() {
    // Get the list of geohashes to query
    var geohashesToQuery = geohashQueries(_center, _radius*1000).map(_queryToString);

    // Filter out duplicate geohashes
    geohashesToQuery = geohashesToQuery.filter(function(geohash, i){
      return geohashesToQuery.indexOf(geohash) === i;
    });

    // For all of the geohashes that we are already currently querying, check if they are still
    // supposed to be queried. If so, don't re-query them. Otherwise, mark them to be un-queried
    // next time we clean up the current geohashes queried dictionary.
    var keys = Object.keys(_currentGeohashesQueried);
    var numKeys = keys.length;
    for (var i = 0; i < numKeys; ++i) {
      var geohashQueryStr = keys[i];
      var index = geohashesToQuery.indexOf(geohashQueryStr);
      if (index === -1) {
        _currentGeohashesQueried[geohashQueryStr].active = false;
      }
      else {
        _currentGeohashesQueried[geohashQueryStr].active = true;
        geohashesToQuery.splice(index, 1);
      }
    }

    // If we are not already cleaning up the current geohashes queried and we have more than 25 of them,
    // kick off a timeout to clean them up so we don't create an infinite number of unneeded queries.
    if (_geohashCleanupScheduled === false && Object.keys(_currentGeohashesQueried).length > 25) {
      _geohashCleanupScheduled = true;
      _cleanUpCurrentGeohashesQueriedTimeout = setTimeout(_cleanUpCurrentGeohashesQueried, 10);
    }

    // Keep track of which geohashes have been processed so we know when to fire the "ready" event
    _outstandingGeohashReadyEvents = geohashesToQuery.slice();

    // Loop through each geohash to query for and listen for new geohashes which have the same prefix.
    // For every match, attach a value callback which will fire the appropriate events.
    // Once every geohash to query is processed, fire the "ready" event.
    geohashesToQuery.forEach(function(toQueryStr) {
      // decode the geohash query string
      var query = _stringToQuery(toQueryStr);

      // Create the Firebase query
      var firebaseQuery = _firebaseRef.orderByChild("g").startAt(query[0]).endAt(query[1]);

      // For every new matching geohash, determine if we should fire the "key_entered" event
      var childAddedCallback = firebaseQuery.on("child_added", _childAddedCallback);
      var childRemovedCallback = firebaseQuery.on("child_removed", _childRemovedCallback);
      var childChangedCallback = firebaseQuery.on("child_changed", _childChangedCallback);

      // Once the current geohash to query is processed, see if it is the last one to be processed
      // and, if so, mark the value event as fired.
      // Note that Firebase fires the "value" event after every "child_added" event fires.
      var valueCallback = firebaseQuery.on("value", function() {
        firebaseQuery.off("value", valueCallback);
        _geohashQueryReadyCallback(toQueryStr);
      });

      // Add the geohash query to the current geohashes queried dictionary and save its state
      _currentGeohashesQueried[toQueryStr] = {
        active: true,
        childAddedCallback: childAddedCallback,
        childRemovedCallback: childRemovedCallback,
        childChangedCallback: childChangedCallback,
        valueCallback: valueCallback
      };
    });
    // Based upon the algorithm to calculate geohashes, it's possible that no "new"
    // geohashes were queried even if the client updates the radius of the query.
    // This results in no "READY" event being fired after the .updateQuery() call.
    // Check to see if this is the case, and trigger the "READY" event.
    if(geohashesToQuery.length === 0) {
      _geohashQueryReadyCallback();
    }
  }

  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Returns the location signifying the center of this query.
   *
   * @return {Array.<number>} The [latitude, longitude] pair signifying the center of this query.
   */
  this.center = function() {
    return _center;
  };

  /**
   * Returns the radius of this query, in kilometers.
   *
   * @return {number} The radius of this query, in kilometers.
   */
  this.radius = function() {
    return _radius;
  };

  /**
   * Updates the criteria for this query.
   *
   * @param {Object} newQueryCriteria The criteria which specifies the query's center and radius.
   */
  this.updateCriteria = function(newQueryCriteria) {
    // Validate and save the new query criteria
    validateCriteria(newQueryCriteria);
    _center = newQueryCriteria.center || _center;
    _radius = newQueryCriteria.radius || _radius;

    // Loop through all of the locations in the query, update their distance from the center of the
    // query, and fire any appropriate events
    var keys = Object.keys(_locationsTracked);
    var numKeys = keys.length;
    for (var i = 0; i < numKeys; ++i) {
      var key = keys[i];

      // Get the cached information for this location
      var locationDict = _locationsTracked[key];

      // Save if the location was already in the query
      var wasAlreadyInQuery = locationDict.isInQuery;

      // Update the location's distance to the new query center
      locationDict.distanceFromCenter = GeoFire.distance(locationDict.location, _center);

      // Determine if the location is now in this query
      locationDict.isInQuery = (locationDict.distanceFromCenter <= _radius);

      // If the location just left the query, fire the "key_exited" callbacks
      if (wasAlreadyInQuery && !locationDict.isInQuery) {
        _fireCallbacksForKey("key_exited", key, locationDict.location, locationDict.distanceFromCenter);
      }

      // If the location just entered the query, fire the "key_entered" callbacks
      else if (!wasAlreadyInQuery && locationDict.isInQuery) {
        _fireCallbacksForKey("key_entered", key, locationDict.location, locationDict.distanceFromCenter);
      }
    }

    // Reset the variables which control when the "ready" event fires
    _valueEventFired = false;

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
   * @callback callback Callback function to be called when an event of type eventType fires.
   * @return {GeoCallbackRegistration} A callback registration which can be used to cancel the provided callback.
   */
  this.on = function(eventType, callback) {
    // Validate the inputs
    if (["ready", "key_entered", "key_exited", "key_moved"].indexOf(eventType) === -1) {
      throw new Error("event type must be \"ready\", \"key_entered\", \"key_exited\", or \"key_moved\"");
    }
    if (typeof callback !== "function") {
      throw new Error("callback must be a function");
    }

    // Add the callback to this query's callbacks list
    _callbacks[eventType].push(callback);

    // If this is a "key_entered" callback, fire it for every location already within this query
    if (eventType === "key_entered") {
      var keys = Object.keys(_locationsTracked);
      var numKeys = keys.length;
      for (var i = 0; i < numKeys; ++i) {
        var key = keys[i];
        var locationDict = _locationsTracked[key];
        if (typeof locationDict !== "undefined" && locationDict.isInQuery) {
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

    // Turn off all Firebase listeners for the current geohashes being queried
    var keys = Object.keys(_currentGeohashesQueried);
    var numKeys = keys.length;
    for (var i = 0; i < numKeys; ++i) {
      var geohashQueryStr = keys[i];
      var query = _stringToQuery(geohashQueryStr);
      _cancelGeohashQuery(query, _currentGeohashesQueried[geohashQueryStr]);
      delete _currentGeohashesQueried[geohashQueryStr];
    }

    // Delete any stored locations
    _locationsTracked = {};

    // Turn off the current geohashes queried clean up interval
    clearInterval(_cleanUpCurrentGeohashesQueriedInterval);
  };


  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  // Firebase reference of the GeoFire which created this query
  if (Object.prototype.toString.call(firebaseRef) !== "[object Object]") {
    throw new Error("firebaseRef must be an instance of Firebase");
  }
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
  var _outstandingGeohashReadyEvents;

  // A dictionary of locations that a currently active in the queries
  // Note that not all of these are currently within this query
  var _locationsTracked = {};

  // A dictionary of geohash queries which currently have an active callbacks
  var _currentGeohashesQueried = {};

  // Every ten seconds, clean up the geohashes we are currently querying for. We keep these around
  // for a little while since it's likely that they will need to be re-queried shortly after they
  // move outside of the query's bounding box.
  var _geohashCleanupScheduled = false;
  var _cleanUpCurrentGeohashesQueriedTimeout = null;
  var _cleanUpCurrentGeohashesQueriedInterval = setInterval(function() {
      if (_geohashCleanupScheduled === false) {
        _cleanUpCurrentGeohashesQueried();
      }
    }, 10000);

  // Validate and save the query criteria
  validateCriteria(queryCriteria, /* requireCenterAndRadius */ true);
  var _center = queryCriteria.center;
  var _radius = queryCriteria.radius;

  // Listen for new geohashes being added around this query and fire the appropriate events
  _listenForNewGeohashes();
};
