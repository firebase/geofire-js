/* tslint:disable:max-line-length */
import * as chai from 'chai';
import * as firebase from 'firebase';

import { GeoFire, GeoQuery } from '../src';


/*************/
/*  GLOBALS  */
/*************/
const expect = chai.expect;
// Define examples of valid and invalid parameters
export const invalidFirebaseRefs = [null, undefined, NaN, true, false, [], 0, 5, '', 'a', ['hi', 1]];
export const validKeys = ['a', 'loc1', '(e@Xi:4t>*E2)hc<5oa:1s6{B0d?u', Array(700).join('a')];
export const invalidKeys = ['', true, false, null, undefined, { a: 1 }, 'loc.1', 'loc$1', '[loc1', 'loc1]', 'loc#1', 'loc/1', 'a#i]$da[s', 'te/nst', 'te/rst', 'te/u0000st', 'te/u0015st', 'te/007Fst', Array(800).join('a')];
export const validLocations = [[0, 0], [-90, 180], [90, -180], [23, 74], [47.235124363, 127.2379654226]];
export const invalidLocations = [[-91, 0], [91, 0], [0, 181], [0, -181], [[0, 0], 0], ['a', 0], [0, 'a'], ['a', 'a'], [NaN, 0], [0, NaN], [undefined, NaN], [null, 0], [null, null], [0, undefined], [undefined, undefined], '', 'a', true, false, [], [1], {}, { a: 1 }, null, undefined, NaN];
export const validGeohashes = ['4', 'd62dtu', '000000000000'];
export const invalidGeohashes = ['', 'aaa', 1, true, false, [], [1], {}, { a: 1 }, null, undefined, NaN];
export const validQueryCriterias = [{ center: [0, 0], radius: 1000 }, { center: [1, -180], radius: 1.78 }, { center: [22.22, -107.77], radius: 0 }, { center: [0, 0] }, { center: [1, -180] }, { center: [22.22, -107.77] }, { radius: 1000 }, { radius: 1.78 }, { radius: 0 }];
export const invalidQueryCriterias = [{}, { random: 100 }, { center: [91, 2], radius: 1000, random: 'a' }, { center: [91, 2], radius: 1000 }, { center: [1, -181], radius: 1000 }, { center: ['a', 2], radius: 1000 }, { center: [1, [1, 2]], radius: 1000 }, { center: [0, 0], radius: -1 }, { center: [null, 2], radius: 1000 }, { center: [1, undefined], radius: 1000 }, { center: [NaN, 0], radius: 1000 }, { center: [1, 2], radius: -10 }, { center: [1, 2], radius: 'text' }, { center: [1, 2], radius: [1, 2] }, { center: [1, 2], radius: null }, true, false, undefined, NaN, [], 'a', 1];

// Create global constiables to hold the Firebase and GeoFire constiables
export let geoFireRef: firebase.database.Reference,
  geoFire: GeoFire,
  geoQueries: GeoQuery[] = [];

// Initialize Firebase
const config = {
  apiKey: 'AIzaSyCR4ND2xwX3kU1IxTn0youF5OlI3x6MFZs',
  databaseURL: 'https://geofire-gh-tests.firebaseio.com',
  projectId: 'geofire-gh-tests'
};
firebase.initializeApp(config);

/**********************/
/*  HELPER FUNCTIONS  */
/**********************/
/* Helper functions which runs before each Jasmine test has started */
export function beforeEachHelper(done) {
  // Create a new Firebase database ref at a random node
  geoFireRef = firebase.database().ref().push();
  // Create a new GeoFire instance
  geoFire = new GeoFire(geoFireRef);

  // Reset the GeoFireQueries
  geoQueries = [];

  done();
}

/* Helper functions which runs after each Jasmine test has completed */
export function afterEachHelper(done) {
  // Cancel each outstanding GeoQuery
  geoQueries.forEach((geoQuery) => {
    geoQuery.cancel();
  });

  geoFireRef.remove().then(() => {
    // Wait for 50 milliseconds after each test to give enough time for old query events to expire
    return wait(50);
  }).then(done);
}

/* Returns a random alphabetic string of constiable length */
export function generateRandomString() {
  const possibleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const numPossibleCharacters = possibleCharacters.length;

  let text = '';
  for (let i = 0; i < 10; i++) {
    text += possibleCharacters.charAt(Math.floor(Math.random() * numPossibleCharacters));
  }

  return text;
}

/* Returns the current data in the Firebase */
export function getFirebaseData() {
  return geoFireRef.once('value').then((dataSnapshot: firebase.database.DataSnapshot) => {
    return dataSnapshot.exportVal();
  });
}

/* Returns a promise which is fulfilled after the inputted number of milliseconds pass */
export function wait(milliseconds) {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      window.clearTimeout(timeout);
      resolve();
    }, milliseconds);
  });
}

/* Keeps track of all the current asynchronous tasks being run */
export function Checklist(items, expect, done) {
  const eventsToComplete = items;

  /* Removes a task from the events list */
  this.x = function (item) {
    const index = eventsToComplete.indexOf(item);
    if (index === -1) {
      expect('Attempting to delete unexpected item \'' + item + '\' from Checklist').to.not.be.ok();
    }
    else {
      eventsToComplete.splice(index, 1);
      if (this.isEmpty()) {
        done();
      }
    }
  };

  /* Returns the length of the events list */
  this.length = () => {
    return eventsToComplete.length;
  };

  /* Returns true if the events list is empty */
  this.isEmpty = () => {
    return (this.length() === 0);
  };
}

/* Common error handler for use in .catch() statements of promises. This will
 * cause the test to fail, outputting the details of the exception. Otherwise, tests
 * tend to fail due to the Jasmine ASYNC timeout and provide no details of what actually
 * went wrong.
 **/
export function failTestOnCaughtError(error) {
  expect(error).to.throw();
}
