/**
 * GeoFire is an open-source library that allows you to store and query a set
 * of keys based on their geographic location. At its heart, GeoFire simply
 * stores locations with string keys. Its main benefit, however, is the
 * possibility of retrieving only those keys within a given geographic area -
 * all in realtime.
 *
 * GeoFire 0.0.0
 * https://github.com/firebase/geofire-js/
 * License: MIT
 */
import { GeoQuery, QueryCriteria } from './GeoQuery';
import { distanceBetween, geohashForLocation, validateLocation, validateKey } from 'geofire-common';
import { decodeGeoFireObject, encodeGeoFireObject } from './databaseUtils';

import * as GeoFireTypes from './GeoFireTypes';
import * as DatabaseTypes from '@firebase/database-types';

/**
 * Creates a GeoFire instance.
 */
export class GeoFire {
  /**
   * @param _firebaseRef A Firebase reference where the GeoFire data will be stored.
   */
  constructor(private _firebaseRef: DatabaseTypes.Reference) {
    if (Object.prototype.toString.call(this._firebaseRef) !== '[object Object]') {
      throw new Error('firebaseRef must be an instance of Firebase');
    }
  }

  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Returns a promise fulfilled with the location corresponding to the provided key.
   *
   * If the provided key does not exist, the returned promise is fulfilled with null.
   *
   * @param key The key of the location to retrieve.
   * @returns A promise that is fulfilled with the location of the given key.
   */
  public get(key: string): Promise<number[]> {
    validateKey(key);
    return this._firebaseRef.child(key).once('value').then((dataSnapshot: DatabaseTypes.DataSnapshot) => {
      const snapshotVal = dataSnapshot.val();
      if (snapshotVal === null) {
        return null;
      } else {
        return decodeGeoFireObject(snapshotVal);
      }
    });
  }

  /**
   * Returns the Firebase instance used to create this GeoFire instance.
   *
   * @returns The Firebase instance used to create this GeoFire instance.
   */
  public ref(): DatabaseTypes.Reference {
    return this._firebaseRef;
  }

  /**
   * Removes the provided key from this GeoFire. Returns an empty promise fulfilled when the key has been removed.
   *
   * If the provided key is not in this GeoFire, the promise will still successfully resolve.
   *
   * @param key The key of the location to remove.
   * @returns A promise that is fulfilled after the inputted key is removed.
   */
  public remove(key: string): Promise<string> {
    return this.set(key, null);
  }

  /**
   * Adds the provided key - location pair(s) to Firebase. Returns an empty promise which is fulfilled when the write is complete.
   *
   * If any provided key already exists in this GeoFire, it will be overwritten with the new location value.
   *
   * @param keyOrLocations The key representing the location to add or a mapping of key - location pairs which
   * represent the locations to add.
   * @param location The [latitude, longitude] pair to add.
   * @returns A promise that is fulfilled when the write is complete.
   */
  public set(keyOrLocations: string | any, location?: number[]): Promise<any> {
    let locations;
    if (typeof keyOrLocations === 'string' && keyOrLocations.length !== 0) {
      // If this is a set for a single location, convert it into a object
      locations = {};
      locations[keyOrLocations] = location;
    } else if (typeof keyOrLocations === 'object') {
      if (typeof location !== 'undefined') {
        throw new Error('The location argument should not be used if you pass an object to set().');
      }
      locations = keyOrLocations;
    } else {
      throw new Error('keyOrLocations must be a string or a mapping of key - location pairs.');
    }

    const newData = {};

    Object.keys(locations).forEach((key) => {
      validateKey(key);

      const location: number[] = locations[key];
      if (location === null) {
        // Setting location to null is valid since it will remove the key
        newData[key] = null;
      } else {
        validateLocation(location);

        const geohash: string = geohashForLocation(location);
        newData[key] = encodeGeoFireObject(location, geohash);
      }
    });

    return this._firebaseRef.update(newData);
  }

  /**
   * Returns a new GeoQuery instance with the provided queryCriteria.
   *
   * @param queryCriteria The criteria which specifies the GeoQuery's center and radius.
   * @return A new GeoQuery object.
   */
  public query(queryCriteria: QueryCriteria): GeoQuery {
    return new GeoQuery(this._firebaseRef, queryCriteria);
  }
}
