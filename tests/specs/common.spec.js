/*************/
/*  GLOBALS  */
/*************/
// Override the default timeout interval for Jasmine
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;

// Get a reference to the demo Firebase
var dataRef = new Firebase("https://geofiretest.firebaseio-demo.com");

/**********************/
/*  HELPER FUNCTIONS  */
/**********************/
/* Clears all Firebase event handlers and resets the Firebase; runs before each test to ensure there is no pollution between tests */
function resetFirebase() {
  console.log("***** Resetting Firebase *****");

  // Disable geoFire debugging
  GEOFIRE_DEBUG = false;

  return new RSVP.Promise(function(resolve, reject) {
     /*dataRef.child("indices").on("value", function(indicesChildSnapshot) {
      var geohashes = indicesChildSnapshot.val();
      for (var key in geohashes) {
        if (geohashes.hasOwnProperty(key)) {
          dataRef.child("indices/" + key).off();
        }
      }
      dataRef.child("indices").off();
      dataRef.child("locations").off("child_removed");
      dataRef.remove(function() {
        resolve();
      });
    });*/
    dataRef.child("indices").off("child_added");
    dataRef.child("locations").off("child_removed");
    dataRef.remove(function() {
      resolve();
    });
  });
};

/* Returns the current data in the Firebase */
function getFirebaseData() {
  return new RSVP.Promise(function(resolve, reject) {
    dataRef.once("value", function(dataSnapshot) {
      resolve(dataSnapshot.val());
    });
  });
};

/* Adds multiple keys to GeoFire in a single call */
function batchSet(geoFire, keyLocationPairs) {
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

  this.x = function(item) {
    var index = eventsToComplete.indexOf(item);
    if (index == -1) {
      expect("Attempting to delete unexpected item '" + item + "' from Checklist").toBeFalsy();
    }
    else {
      eventsToComplete.splice(index, 1);
      if (eventsToComplete.length == 0) {
        done();
      }
    }
  };

  this.isEmpty = function() {
    return (eventsToComplete.length == 0);
  };
};