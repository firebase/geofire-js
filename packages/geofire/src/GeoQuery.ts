import { GeoCallbackRegistration } from './GeoCallbackRegistration';
import {
  distanceBetween, geohashForLocation, geohashQueryBounds, validateLocation
} from 'geofire-common';
import {
  decodeGeoFireObject, geoFireGetKey } from './databaseUtils';
import * as GeoFireTypes from './GeoFireTypes';
import * as DatabaseTypes from '@firebase/database-types';

export interface QueryCriteria {
  center?: number[];
  radius?: number;
}
export type QueryStateCallback = (
  a: DatabaseTypes.DataSnapshot | null,
  b?: string
) => any;
export interface QueryState {
  active: boolean;
  childAddedCallback: QueryStateCallback;
  childRemovedCallback: QueryStateCallback;
  childChangedCallback: QueryStateCallback;
  valueCallback: QueryStateCallback;
}
/**
 * Validates the inputted query criteria and throws an error if it is invalid.
 *
 * @param newQueryCriteria The criteria which specifies the query's center and/or radius.
 * @param requireCenterAndRadius The criteria which center and radius required.
 */
export function validateCriteria(newQueryCriteria: QueryCriteria, requireCenterAndRadius = false): void {
  if (typeof newQueryCriteria !== 'object') {
    throw new Error('query criteria must be an object');
  } else if (typeof newQueryCriteria.center === 'undefined' && typeof newQueryCriteria.radius === 'undefined') {
    throw new Error('radius and/or center must be specified');
  } else if (requireCenterAndRadius && (typeof newQueryCriteria.center === 'undefined' || typeof newQueryCriteria.radius === 'undefined')) {
    throw new Error('query criteria for a new query must contain both a center and a radius');
  }

  // Throw an error if there are any extraneous attributes
  const keys: string[] = Object.keys(newQueryCriteria);
  for (const key of keys) {
    if (key !== 'center' && key !== 'radius') {
      throw new Error('Unexpected attribute \'' + key + '\' found in query criteria');
    }
  }

  // Validate the 'center' attribute
  if (typeof newQueryCriteria.center !== 'undefined') {
    validateLocation(newQueryCriteria.center);
  }

  // Validate the 'radius' attribute
  if (typeof newQueryCriteria.radius !== 'undefined') {
    if (typeof newQueryCriteria.radius !== 'number' || isNaN(newQueryCriteria.radius)) {
      throw new Error('radius must be a number');
    } else if (newQueryCriteria.radius < 0) {
      throw new Error('radius must be greater than or equal to 0');
    }
  }
}

/**
 * Creates a GeoQuery instance.
 */
export class GeoQuery {
  // Event callbacks
  private _callbacks: GeoFireTypes.QueryCallbacks = { ready: [], key_entered: [], key_exited: [], key_moved: [] };
  // Variable to track when the query is cancelled
  private _cancelled = false;
  private _center: number[];
  // A dictionary of geohash queries which currently have an active callbacks
  private _currentGeohashesQueried: { [name: string]: QueryState } = {};
  // A dictionary of locations that a currently active in the queries
  // Note that not all of these are currently within this query
  private _locationsTracked: { [name: string]: GeoFireTypes.LocationTracked } = {};
  private _radius: number;

  // Variables used to keep track of when to fire the 'ready' event
  private _valueEventFired = false;
  private _outstandingGeohashReadyEvents: any;

  private _geohashCleanupScheduled = false;
  private _cleanUpCurrentGeohashesQueriedInterval: any;
  private _cleanUpCurrentGeohashesQueriedTimeout = null;

  /**
   * @param _firebaseRef A Firebase reference where the GeoFire data will be stored.
   * @param queryCriteria The criteria which specifies the query's center and radius.
   */
  constructor(private _firebaseRef: DatabaseTypes.Reference, queryCriteria: QueryCriteria) {
    // Firebase reference of the GeoFire which created this query
    if (Object.prototype.toString.call(this._firebaseRef) !== '[object Object]') {
      throw new Error('firebaseRef must be an instance of Firebase');
    }

    // Every ten seconds, clean up the geohashes we are currently querying for. We keep these around
    // for a little while since it's likely that they will need to be re-queried shortly after they
    // move outside of the query's bounding box.
    this._cleanUpCurrentGeohashesQueriedInterval = setInterval(() => {
      if (this._geohashCleanupScheduled === false) {
        this._cleanUpCurrentGeohashesQueried();
      }
    }, 10000);

    // Validate and save the query criteria
    validateCriteria(queryCriteria, true);
    this._center = queryCriteria.center;
    this._radius = queryCriteria.radius;

    // Listen for new geohashes being added around this query and fire the appropriate events
    this._listenForNewGeohashes();
  }

  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Terminates this query so that it no longer sends location updates. All callbacks attached to this
   * query via on() will be cancelled. This query can no longer be used in the future.
   */
  public cancel(): void {
    // Mark this query as cancelled
    this._cancelled = true;

    // Cancel all callbacks in this query's callback list
    this._callbacks = { ready: [], key_entered: [], key_exited: [], key_moved: [] };

    // Turn off all Firebase listeners for the current geohashes being queried
    const keys: string[] = Object.keys(this._currentGeohashesQueried);
    keys.forEach((geohashQueryStr: string) => {
      const query: string[] = this._stringToQuery(geohashQueryStr);
      this._cancelGeohashQuery(query, this._currentGeohashesQueried[geohashQueryStr]);
      delete this._currentGeohashesQueried[geohashQueryStr];
    });

    // Delete any stored locations
    this._locationsTracked = {};

    // Turn off the current geohashes queried clean up interval
    clearInterval(this._cleanUpCurrentGeohashesQueriedInterval);
  }

  /**
   * Returns the location signifying the center of this query.
   *
   * @returns The [latitude, longitude] pair signifying the center of this query.
   */
  public center(): number[] {
    return this._center;
  }

  /**
   * Attaches a callback to this query which will be run when the provided eventType fires. Valid eventType
   * values are 'ready', 'key_entered', 'key_exited', and 'key_moved'. The ready event callback is passed no
   * parameters. All other callbacks will be passed three parameters: (1) the location's key, (2) the location's
   * [latitude, longitude] pair, and (3) the distance, in kilometers, from the location to this query's center
   *
   * 'ready' is used to signify that this query has loaded its initial state and is up-to-date with its corresponding
   * GeoFire instance. 'ready' fires when this query has loaded all of the initial data from GeoFire and fired all
   * other events for that data. It also fires every time updateCriteria() is called, after all other events have
   * fired for the updated query.
   *
   * 'key_entered' fires when a key enters this query. This can happen when a key moves from a location outside of
   * this query to one inside of it or when a key is written to GeoFire for the first time and it falls within
   * this query.
   *
   * 'key_exited' fires when a key moves from a location inside of this query to one outside of it. If the key was
   * entirely removed from GeoFire, both the location and distance passed to the callback will be null.
   *
   * 'key_moved' fires when a key which is already in this query moves to another location inside of it.
   *
   * Returns a GeoCallbackRegistration which can be used to cancel the callback. You can add as many callbacks
   * as you would like for the same eventType by repeatedly calling on(). Each one will get called when its
   * corresponding eventType fires. Each callback must be cancelled individually.
   *
   * @param eventType The event type for which to attach the callback. One of 'ready', 'key_entered',
   * 'key_exited', or 'key_moved'.
   * @param callback Callback function to be called when an event of type eventType fires.
   * @returns A callback registration which can be used to cancel the provided callback.
   */
  public on(eventType: string, callback: Function): GeoCallbackRegistration {
    // Validate the inputs
    if (['ready', 'key_entered', 'key_exited', 'key_moved'].indexOf(eventType) === -1) {
      throw new Error('event type must be \'ready\', \'key_entered\', \'key_exited\', or \'key_moved\'');
    }
    if (typeof callback !== 'function') {
      throw new Error('callback must be a function');
    }

    // Add the callback to this query's callbacks list
    this._callbacks[eventType].push(callback);

    // If this is a 'key_entered' callback, fire it for every location already within this query
    if (eventType === 'key_entered') {
      const keys: string[] = Object.keys(this._locationsTracked);
      keys.forEach((key: string) => {
        const locationDict = this._locationsTracked[key];
        if (typeof locationDict !== 'undefined' && locationDict.isInQuery) {
          callback(key, locationDict.location, locationDict.distanceFromCenter);
        }
      });
    }

    // If this is a 'ready' callback, fire it if this query is already ready
    if (eventType === 'ready' && this._valueEventFired) {
      callback();
    }

    // Return an event registration which can be used to cancel the callback
    return new GeoCallbackRegistration(() => {
      this._callbacks[eventType].splice(this._callbacks[eventType].indexOf(callback), 1);
    });
  }

  /**
   * Returns the radius of this query, in kilometers.
   *
   * @returns The radius of this query, in kilometers.
   */
  public radius(): number {
    return this._radius;
  }

  /**
   * Updates the criteria for this query.
   *
   * @param newQueryCriteria The criteria which specifies the query's center and radius.
   */
  public updateCriteria(newQueryCriteria: QueryCriteria): void {
    // Validate and save the new query criteria
    validateCriteria(newQueryCriteria);
    this._center = newQueryCriteria.center || this._center;
    this._radius = newQueryCriteria.radius || this._radius;

    // Loop through all of the locations in the query, update their distance from the center of the
    // query, and fire any appropriate events
    const keys: string[] = Object.keys(this._locationsTracked);
    for (const key of keys) {
      // If the query was cancelled while going through this loop, stop updating locations and stop
      // firing events
      if (this._cancelled === true) {
        break;
      }
      // Get the cached information for this location
      const locationDict = this._locationsTracked[key];
      // Save if the location was already in the query
      const wasAlreadyInQuery = locationDict.isInQuery;
      // Update the location's distance to the new query center
      locationDict.distanceFromCenter = distanceBetween(locationDict.location, this._center);
      // Determine if the location is now in this query
      locationDict.isInQuery = (locationDict.distanceFromCenter <= this._radius);
      // If the location just left the query, fire the 'key_exited' callbacks
      // Else if the location just entered the query, fire the 'key_entered' callbacks
      if (wasAlreadyInQuery && !locationDict.isInQuery) {
        this._fireCallbacksForKey('key_exited', key, locationDict.location, locationDict.distanceFromCenter);
      } else if (!wasAlreadyInQuery && locationDict.isInQuery) {
        this._fireCallbacksForKey('key_entered', key, locationDict.location, locationDict.distanceFromCenter);
      }
    }

    // Reset the variables which control when the 'ready' event fires
    this._valueEventFired = false;

    // Listen for new geohashes being added to GeoFire and fire the appropriate events
    this._listenForNewGeohashes();
  }


  /*********************/
  /*  PRIVATE METHODS  */
  /*********************/
  /**
   * Turns off all callbacks for the provide geohash query.
   *
   * @param query The geohash query.
   * @param queryState An object storing the current state of the query.
   */
  private _cancelGeohashQuery(query: string[], queryState: QueryState): void {
    const queryRef = this._firebaseRef.orderByChild('g').startAt(query[0]).endAt(query[1]);
    queryRef.off('child_added', queryState.childAddedCallback);
    queryRef.off('child_removed', queryState.childRemovedCallback);
    queryRef.off('child_changed', queryState.childChangedCallback);
    queryRef.off('value', queryState.valueCallback);
  }

  /**
   * Callback for child added events.
   *
   * @param locationDataSnapshot A snapshot of the data stored for this location.
   */
  private _childAddedCallback(locationDataSnapshot: DatabaseTypes.DataSnapshot): void {
    this._updateLocation(geoFireGetKey(locationDataSnapshot), decodeGeoFireObject(locationDataSnapshot.val()));
  }

  /**
   * Callback for child changed events
   *
   * @param locationDataSnapshot A snapshot of the data stored for this location.
   */
  private _childChangedCallback(locationDataSnapshot: DatabaseTypes.DataSnapshot): void {
    this._updateLocation(geoFireGetKey(locationDataSnapshot), decodeGeoFireObject(locationDataSnapshot.val()));
  }

  /**
   * Callback for child removed events
   *
   * @param locationDataSnapshot A snapshot of the data stored for this location.
   */
  private _childRemovedCallback(locationDataSnapshot: DatabaseTypes.DataSnapshot): void {
    const key: string = geoFireGetKey(locationDataSnapshot);
    if (key in this._locationsTracked) {
      this._firebaseRef.child(key).once('value', (snapshot: DatabaseTypes.DataSnapshot) => {
        const location: number[] = (snapshot.val() === null) ? null : decodeGeoFireObject(snapshot.val());
        const geohash: string = (location !== null) ? geohashForLocation(location) : null;
        // Only notify observers if key is not part of any other geohash query or this actually might not be
        // a key exited event, but a key moved or entered event. These events will be triggered by updates
        // to a different query
        if (!this._geohashInSomeQuery(geohash)) {
          this._removeLocation(key, location);
        }
      });
    }
  }

  /**
   * Removes unnecessary Firebase queries which are currently being queried.
   */
  private _cleanUpCurrentGeohashesQueried(): void {
    let keys: string[] = Object.keys(this._currentGeohashesQueried);
    keys.forEach((geohashQueryStr: string) => {
      const queryState: any = this._currentGeohashesQueried[geohashQueryStr];
      if (queryState.active === false) {
        const query = this._stringToQuery(geohashQueryStr);
        // Delete the geohash since it should no longer be queried
        this._cancelGeohashQuery(query, queryState);
        delete this._currentGeohashesQueried[geohashQueryStr];
      }
    });

    // Delete each location which should no longer be queried
    keys = Object.keys(this._locationsTracked);
    keys.forEach((key: string) => {
      if (!this._geohashInSomeQuery(this._locationsTracked[key].geohash)) {
        if (this._locationsTracked[key].isInQuery) {
          throw new Error('Internal State error, trying to remove location that is still in query');
        }
        delete this._locationsTracked[key];
      }
    });

    // Specify that this is done cleaning up the current geohashes queried
    this._geohashCleanupScheduled = false;

    // Cancel any outstanding scheduled cleanup
    if (this._cleanUpCurrentGeohashesQueriedTimeout !== null) {
      clearTimeout(this._cleanUpCurrentGeohashesQueriedTimeout);
      this._cleanUpCurrentGeohashesQueriedTimeout = null;
    }
  }

  /**
   * Fires each callback for the provided eventType, passing it provided key's data.
   *
   * @param eventType The event type whose callbacks to fire. One of 'key_entered', 'key_exited', or 'key_moved'.
   * @param key The key of the location for which to fire the callbacks.
   * @param location The location as [latitude, longitude] pair
   * @param distanceFromCenter The distance from the center or null.
   */
  private _fireCallbacksForKey(eventType: string, key: string, location?: number[], distanceFromCenter?: number): void {
    this._callbacks[eventType].forEach((callback) => {
      if (typeof location === 'undefined' || location === null) {
        callback(key, null, null);
      } else {
        callback(key, location, distanceFromCenter);
      }
    });
  }

  /**
   * Fires each callback for the 'ready' event.
   */
  private _fireReadyEventCallbacks(): void {
    this._callbacks.ready.forEach((callback) => {
      callback();
    });
  }

  /**
   * Checks if this geohash is currently part of any of the geohash queries.
   *
   * @param geohash The geohash.
   * @returns Returns true if the geohash is part of any of the current geohash queries.
   */
  private _geohashInSomeQuery(geohash: string): boolean {
    const keys: string[] = Object.keys(this._currentGeohashesQueried);
    for (const queryStr of keys) {
      if (queryStr in this._currentGeohashesQueried) {
        const query = this._stringToQuery(queryStr);
        if (geohash >= query[0] && geohash <= query[1]) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Called once all geohash queries have received all child added events and fires the ready
   * event if necessary.
   */
  private _geohashQueryReadyCallback(queryStr?: string): void {
    const index: number = this._outstandingGeohashReadyEvents.indexOf(queryStr);
    if (index > -1) {
      this._outstandingGeohashReadyEvents.splice(index, 1);
    }
    this._valueEventFired = (this._outstandingGeohashReadyEvents.length === 0);

    // If all queries have been processed, fire the ready event
    if (this._valueEventFired) {
      this._fireReadyEventCallbacks();
    }
  }

  /**
   * Attaches listeners to Firebase which track when new geohashes are added within this query's
   * bounding box.
   */
  private _listenForNewGeohashes(): void {
    // Get the list of geohashes to query
    let geohashesToQuery: string[] = geohashQueryBounds(this._center, this._radius * 1000).map(this._queryToString);

    // Filter out duplicate geohashes
    geohashesToQuery = geohashesToQuery.filter((geohash: string, i: number) => geohashesToQuery.indexOf(geohash) === i);

    // For all of the geohashes that we are already currently querying, check if they are still
    // supposed to be queried. If so, don't re-query them. Otherwise, mark them to be un-queried
    // next time we clean up the current geohashes queried dictionary.
    const keys: string[] = Object.keys(this._currentGeohashesQueried);
    keys.forEach((geohashQueryStr: string) => {
      const index: number = geohashesToQuery.indexOf(geohashQueryStr);
      if (index === -1) {
        this._currentGeohashesQueried[geohashQueryStr].active = false;
      } else {
        this._currentGeohashesQueried[geohashQueryStr].active = true;
        geohashesToQuery.splice(index, 1);
      }
    });

    // If we are not already cleaning up the current geohashes queried and we have more than 25 of them,
    // kick off a timeout to clean them up so we don't create an infinite number of unneeded queries.
    if (this._geohashCleanupScheduled === false && Object.keys(this._currentGeohashesQueried).length > 25) {
      this._geohashCleanupScheduled = true;
      this._cleanUpCurrentGeohashesQueriedTimeout = setTimeout(() => {
        this._cleanUpCurrentGeohashesQueried();
      }, 10);
    }

    // Keep track of which geohashes have been processed so we know when to fire the 'ready' event
    this._outstandingGeohashReadyEvents = geohashesToQuery.slice();

    // Loop through each geohash to query for and listen for new geohashes which have the same prefix.
    // For every match, attach a value callback which will fire the appropriate events.
    // Once every geohash to query is processed, fire the 'ready' event.
    geohashesToQuery.forEach((toQueryStr: string) => {
      // decode the geohash query string
      const query: string[] = this._stringToQuery(toQueryStr);

      // Create the Firebase query
      const firebaseQuery: DatabaseTypes.Query = this._firebaseRef.orderByChild('g').startAt(query[0]).endAt(query[1]);

      // For every new matching geohash, determine if we should fire the 'key_entered' event
      const childAddedCallback = firebaseQuery.on('child_added', (a) => this._childAddedCallback(a));
      const childRemovedCallback = firebaseQuery.on('child_removed', (a) => this._childRemovedCallback(a));
      const childChangedCallback = firebaseQuery.on('child_changed', (a) => this._childChangedCallback(a));

      // Once the current geohash to query is processed, see if it is the last one to be processed
      // and, if so, mark the value event as fired.
      // Note that Firebase fires the 'value' event after every 'child_added' event fires.
      const valueCallback = firebaseQuery.on('value', () => {
        firebaseQuery.off('value', valueCallback);
        this._geohashQueryReadyCallback(toQueryStr);
      });

      // Add the geohash query to the current geohashes queried dictionary and save its state
      this._currentGeohashesQueried[toQueryStr] = {
        active: true,
        childAddedCallback,
        childRemovedCallback,
        childChangedCallback,
        valueCallback
      };
    });
    // Based upon the algorithm to calculate geohashes, it's possible that no 'new'
    // geohashes were queried even if the client updates the radius of the query.
    // This results in no 'READY' event being fired after the .updateCriteria() call.
    // Check to see if this is the case, and trigger the 'READY' event.
    if (geohashesToQuery.length === 0) {
      this._geohashQueryReadyCallback();
    }
  }

  /**
   * Encodes a query as a string for easier indexing and equality.
   *
   * @param query The query to encode.
   * @returns The encoded query as string.
   */
  private _queryToString(query: string[]): string {
    if (query.length !== 2) {
      throw new Error('Not a valid geohash query: ' + query);
    }
    return query[0] + ':' + query[1];
  }

  /**
   * Removes the location from the local state and fires any events if necessary.
   *
   * @param key The key to be removed.
   * @param currentLocation The current location as [latitude, longitude] pair or null if removed.
   */
  private _removeLocation(key: string, currentLocation?: number[]): void {
    const locationDict = this._locationsTracked[key];
    delete this._locationsTracked[key];
    if (typeof locationDict !== 'undefined' && locationDict.isInQuery) {
      const distanceFromCenter: number = (currentLocation) ? distanceBetween(currentLocation, this._center) : null;
      this._fireCallbacksForKey('key_exited', key, currentLocation, distanceFromCenter);
    }
  }

  /**
   * Decodes a query string to a query
   *
   * @param str The encoded query.
   * @returns The decoded query as a [start, end] pair.
   */
  private _stringToQuery(str: string): string[] {
    const decoded: string[] = str.split(':');
    if (decoded.length !== 2) {
      throw new Error('Invalid internal state! Not a valid geohash query: ' + str);
    }
    return decoded;
  }

  /**
   * Callback for any updates to locations. Will update the information about a key and fire any necessary
   * events every time the key's location changes.
   *
   * When a key is removed from GeoFire or the query, this function will be called with null and performs
   * any necessary cleanup.
   *
   * @param key The key of the geofire location.
   * @param location The location as [latitude, longitude] pair.
   */
  private _updateLocation(key: string, location?: number[]): void {
    validateLocation(location);
    // Get the key and location
    let distanceFromCenter: number, isInQuery;
    const wasInQuery: boolean = (key in this._locationsTracked) ? this._locationsTracked[key].isInQuery : false;
    const oldLocation: number[] = (key in this._locationsTracked) ? this._locationsTracked[key].location : null;

    // Determine if the location is within this query
    distanceFromCenter = distanceBetween(location, this._center);
    isInQuery = (distanceFromCenter <= this._radius);

    // Add this location to the locations queried dictionary even if it is not within this query
    this._locationsTracked[key] = {
      location,
      distanceFromCenter,
      isInQuery,
      geohash: geohashForLocation(location)
    };

    // Fire the 'key_entered' event if the provided key has entered this query
    if (isInQuery && !wasInQuery) {
      this._fireCallbacksForKey('key_entered', key, location, distanceFromCenter);
    } else if (isInQuery && oldLocation !== null && (location[0] !== oldLocation[0] || location[1] !== oldLocation[1])) {
      this._fireCallbacksForKey('key_moved', key, location, distanceFromCenter);
    } else if (!isInQuery && wasInQuery) {
      this._fireCallbacksForKey('key_exited', key, location, distanceFromCenter);
    }
  }
}
