/*!
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

import * as firebase from 'firebase';

import { GeoFirestoreQuery } from './query';
import { decodeGeoFireObject, degreesToRadians, encodeGeoFireObject, encodeGeohash, validateLocation, validateKey } from '../tools/utils';

import { QueryCriteria, GeoFireObj } from '../interfaces';

/**
 * Creates a GeoFirestore instance.
 */
export class GeoFirestore {
  /**
   * @param _collectionRef A Firestore Collection reference where the GeoFirestore data will be stored.
   */
  constructor(private _collectionRef: firebase.firestore.CollectionReference) {
    if (Object.prototype.toString.call(this._collectionRef) !== '[object Object]') {
      throw new Error('collectionRef must be an instance of a Firestore Collection');
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
    return this._collectionRef.doc(key).get().then((documentSnapshot: firebase.firestore.DocumentSnapshot) => {
      const snapshotVal = <GeoFireObj>documentSnapshot.data();
      if (snapshotVal === null) {
        return null;
      } else {
        return decodeGeoFireObject(snapshotVal);
      }
    });
  };

  /**
   * Returns the Firestore Collection used to create this GeoFirestore instance.
   *
   * @returns The Firestore Collection used to create this GeoFirestore instance.
   */
  public ref(): firebase.firestore.CollectionReference {
    return this._collectionRef;
  };

  /**
   * Removes the provided key from this GeoFirestore. Returns an empty promise fulfilled when the key has been removed.
   *
   * If the provided key is not in this GeoFirestore, the promise will still successfully resolve.
   *
   * @param key The key of the location to remove.
   * @returns A promise that is fulfilled after the inputted key is removed.
   */
  public remove(key: string): Promise<string> {
    return this.set(key, null);
  };

  /**
   * Adds the provided key - location pair(s) to Firestore. Returns an empty promise which is fulfilled when the write is complete.
   *
   * If any provided key already exists in this GeoFirestore, it will be overwritten with the new location value.
   *
   * @param keyOrLocations The key representing the location to add or a mapping of key - location pairs which
   * represent the locations to add.
   * @param location The [latitude, longitude] pair to add.
   * @returns A promise that is fulfilled when the write is complete.
   */
  public set(keyOrLocations: string | any, location?: number[]): Promise<any> {
    const batch: firebase.firestore.WriteBatch = this._collectionRef.firestore.batch();
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

    Object.keys(locations).forEach((key) => {
      validateKey(key);

      const ref = this._collectionRef.doc(key);
      const location: number[] = locations[key];
      if (location === null) {
        batch.delete(ref);
      } else {
        validateLocation(location);

        const geohash: string = encodeGeohash(location);
        batch.set(ref, encodeGeoFireObject(location, geohash), { merge: true });
      }
    });

    return batch.commit();
  };

  /**
   * Returns a new GeoQuery instance with the provided queryCriteria.
   *
   * @param queryCriteria The criteria which specifies the GeoQuery's center and radius.
   * @return A new GeoFirestoreQuery object.
   */
  public query(queryCriteria: QueryCriteria): GeoFirestoreQuery {
    return new GeoFirestoreQuery(this._collectionRef, queryCriteria);
  };

  /********************/
  /*  STATIC METHODS  */
  /********************/
  /**
   * Static method which calculates the distance, in kilometers, between two locations,
   * via the Haversine formula. Note that this is approximate due to the fact that the
   * Earth's radius varies between 6356.752 km and 6378.137 km.
   *
   * @param location1 The [latitude, longitude] pair of the first location.
   * @param location2 The [latitude, longitude] pair of the second location.
   * @returns The distance, in kilometers, between the inputted locations.
   */
  static distance(location1: number[], location2: number[]) {
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
}
