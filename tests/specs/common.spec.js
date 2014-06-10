/*************/
/*  GLOBALS  */
/*************/
// Override the default timeout interval for Jasmine
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;

// Get a reference to a random demo Firebase
var demoFirebaseUrl = "https://" + generateRandomString() + ".firebaseio-demo.com";
console.log(demoFirebaseUrl);

// Define examples of valid and invalid parameters
var validKeys = ["a", "loc1", "(e@Xi4t>*E2)hc<5oa1s6{B0d?u", Array(743).join("a")];
var invalidKeys = ["", 1, true, false, [], {}, [1, 2], {a: 1}, null, undefined, "loc.1", "loc$1", "[loc1", "loc1]", "loc#1", "a#i]$da[s", Array(744).join("a")];
var validLocations = [[0, 0], [-90, 180], [90, -180], [23, 74], [47.235124363, 127.2379654226]];
var invalidLocations = [[-91, 0], [91, 0], [0, 181], [0, -181], [[0, 0], 0], ["a", 0], [0, "a"], ["a", "a"], [null, 0], [null, null], [0, undefined], [undefined, undefined], "", "a", true, false, [], [1], {}, {a:1}, null, undefined];
var validGeohashes = ["4", "d62dtu", "000000000000"];
var invalidGeohashes = ["", "aaa", 1, true, false, [], [1], {}, {a:1}, null, undefined];
var validQueryCriterias = [{center: [0,0], radius: 1000}, {center: [1,-180], radius: 1.78}, {center: [22.22,-107.77], radius: 0}, {center: [0,0]}, {center: [1,-180]}, {center: [22.22,-107.77]}, {radius: 1000}, {radius: 1.78}, {radius: 0}];
var invalidQueryCriterias = [{}, {random: 100}, {center: [91,2], radius: 1000, random: "a"}, {center: [91,2], radius: 1000}, {center: [1,-181], radius: 1000}, {center: ["a",2], radius: 1000}, {center: [1,[1,2]], radius: 1000}, {center: [0,0], radius: -1}, {center: [null,2], radius: 1000}, {center: [1,undefined], radius: 1000}, {center: [1,2], radius: -10}, {center: [1,2], radius: "text"}, {center: [1,2], radius: [1,2]}, {center: [1,2], radius: null}, true, false, undefined, [], "a", 1];

// Create global variables to hold the Firebase and GeoFire variables
var firebaseRef, geoFire, geoQueries;

/**********************/
/*  HELPER FUNCTIONS  */
/**********************/
/* Helper function which runs before each Jasmine test has started */
function beforeEachHelper(done) {
  // Create a new firebase ref with a new context
  firebaseRef = new Firebase(demoFirebaseUrl, Firebase.Context());

  // Reset the Firebase
  firebaseRef.remove(function() {
    // Create a new firebase ref at a random node
    firebaseRef = firebaseRef.child(generateRandomString());

    // Create a new GeoFire
    geoFire = new GeoFire(firebaseRef);

    // Reset the GeoQueries
    geoQueries = [];

    done();
  });
}

/* Helper function which runs after each Jasmine test has completed */
function afterEachHelper(done) {
  // Cancel each outstanding GeoQuery
  geoQueries.forEach(function(geoQuery) {
    geoQuery.cancel();
  })

  // Wait for 50 milliseconds after each test to give enough time for old query events to expire
  wait(50).then(function() {
    done();
  });
}

/* Returns a random alphabetic string of variable length */
function generateRandomString() {
  return (Math.random() + 1).toString(36).substring(7);
}

/* Returns the current data in the Firebase */
function getFirebaseData() {
  return new RSVP.Promise(function(resolve, reject) {
    firebaseRef.once("value", function(dataSnapshot) {
      resolve(dataSnapshot.val());
    });
  });
};

/* Adds multiple keys to GeoFire in a single call */
function batchSet(keyLocationPairs) {
  var promises = keyLocationPairs.map(function(keyLocationPair) {
    return geoFire.set(keyLocationPair.key, keyLocationPair.location);
  });
  return RSVP.allSettled(promises);
};


/* Returns a promise which is fulfilled after the inputted number of milliseconds pass */
function wait(milliseconds) {
  return new RSVP.Promise(function(resolve, reject) {
    var timeout = window.setTimeout(function() {
      window.clearTimeout(timeout);
      resolve();
    }, milliseconds);
  });
};

/* Keeps track of all the current asynchronous tasks being run */
function Checklist(items, expect, done) {
  var eventsToComplete = items;

  /* Removes a task from the events list */
  this.x = function(item) {
    var index = eventsToComplete.indexOf(item);
    if (index === -1) {
      expect("Attempting to delete unexpected item '" + item + "' from Checklist").toBeFalsy();
    }
    else {
      eventsToComplete.splice(index, 1);
      if (eventsToComplete.length === 0) {
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
    return (eventsToComplete.length === 0);
  };
};