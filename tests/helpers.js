'use strict';

/*************/
/*  GLOBALS  */
/*************/

var RSVP = require('rsvp');
var Firebase = require('firebase');
var GeoFire = require('../dist/geofire.js');

var chai = require("chai");
var expect = chai.expect;


var firebaseRef = new Firebase("https://geofire.firebaseio.com");


// Define examples of valid and invalid parameters

/**
 * Returns a random alphabetic string of the provided length.
 *
 * @param {number} length The desired length of the returned string.
 * @return {string} A random string of the provided length.
 *
 * @private
 */
function _generateRandomString(length) {
  var possibleCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var numPossibleCharacters = possibleCharacters.length;

  var text = "";
  for (var i = 0; i < length; i++) {
    text += possibleCharacters.charAt(Math.floor(Math.random() * numPossibleCharacters));
  }

  return text;
}


/**
 * Returns a random Firebase reference.
 *
 * @return {Firebase} A random Firebase reference.
 */
function getRandomFirebaseRef() {
  return firebaseRef.child(_generateRandomString(10));
}


/**
 * Returns the current data stored in the Firebase database location corresponding to the provided
 * GeoFire instance.
 *
 * @return {object} The current data stored in the Firebase database location corresponding to the
 * provided GeoFire instance.
 */
function getFirebaseData(geoFire) {
  return new RSVP.Promise(function(resolve, reject) {
    geoFire.ref().once("value", function(dataSnapshot) {
      resolve(dataSnapshot.exportVal());
    });
  });
};


/**
 * Returns a promise which is fulfilled after the inputted number of milliseconds pass.
 *
 * @param {number} milliseconds The number of milliseconds to wait until the promise is fulfilled.
 * @return {Promise<()>} An empty promise fulfilled after the provided number of milliseconds.
 */
function wait(milliseconds) {
  return new RSVP.Promise(function(resolve) {
    setTimeout(resolve, milliseconds);
  });
};

/**
 * Keeps track of all the current asynchronous tasks being run.
 *
 * @param {Array<string>} items An array of items to complete.
 * @param {done} The callback method to be invoked when the checklist is empty.
 */
function Checklist(items, done) {
  var eventsToComplete = items;

  /* Removes a task from the events list */
  this.x = function(item) {
    var index = eventsToComplete.indexOf(item);
    if (index === -1) {
      expect("Attempting to delete unexpected item '" + item + "' from Checklist").to.be.falsy;
    }
    else {
      eventsToComplete.splice(index, 1);
      if (this.isEmpty()) {
        done();
      }
    }
  };

  /* Returns the length of the events list */
  this.length = function() {
    return eventsToComplete.length;
  };

  /* Returns true if the events list is empty */
  this.isEmpty = function() {
    return (this.length() === 0);
  };
};


module.exports = {
  wait: wait,
  getRandomFirebaseRef: getRandomFirebaseRef,
  getFirebaseData: getFirebaseData,
  invalidFirebaseRefs: [null, undefined, NaN, true, false, [], 0, 5, "", "a", ["hi", 1]],
  validKeys: ["a", "loc1", "(e@Xi:4t>*E2)hc<5oa:1s6{B0d?u", Array(743).join("a")],
  invalidKeys: ["", true, false, null, undefined, {a: 1}, "loc.1", "loc$1", "[loc1", "loc1]", "loc#1", "loc/1", "a#i]$da[s", "te/nst", "te/rst", "te/u0000st", "te/u0015st", "te/007Fst", Array(800).join("a")],
  validLocations: [[0, 0], [-90, 180], [90, -180], [23, 74], [47.235124363, 127.2379654226]],
  invalidLocations: [[-91, 0], [91, 0], [0, 181], [0, -181], [[0, 0], 0], ["a", 0], [0, "a"], ["a", "a"], [NaN, 0], [0, NaN], [undefined, NaN], [null, 0], [null, null], [0, undefined], [undefined, undefined], "", "a", true, false, [], [1], {}, {a:1}, null, undefined, NaN],
  validGeohashes: ["4", "d62dtu", "000000000000"],
  invalidGeohashes: ["", "aaa", 1, true, false, [], [1], {}, {a:1}, null, undefined, NaN],
  validQueryCriterias: [{center: [0,0], radius: 1000}, {center: [1,-180], radius: 1.78}, {center: [22.22,-107.77], radius: 0}, {center: [0,0]}, {center: [1,-180]}, {center: [22.22,-107.77]}, {radius: 1000}, {radius: 1.78}, {radius: 0}],
  invalidQueryCriterias: [{}, {random: 100}, {center: [91,2], radius: 1000, random: "a"}, {center: [91,2], radius: 1000}, {center: [1,-181], radius: 1000}, {center: ["a",2], radius: 1000}, {center: [1,[1,2]], radius: 1000}, {center: [0,0], radius: -1}, {center: [null,2], radius: 1000}, {center: [1,undefined], radius: 1000}, {center: [NaN,0], radius: 1000}, {center: [1,2], radius: -10}, {center: [1,2], radius: "text"}, {center: [1,2], radius: [1,2]}, {center: [1,2], radius: null}, true, false, undefined, NaN, [], "a", 1]
};
