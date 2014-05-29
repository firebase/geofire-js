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



/*******************/
/*  GeoFire TESTS  */
/*******************/
describe("GeoFire Tests:", function() {
  // Reset the Firebase before each test
  beforeEach(function(done) {
    resetFirebase().then(done);
  });

  describe("Adding locations:", function() {
    it("set() returns a promise", function(done) {
      console.log("!!!!!  GeoFire Tests  !!!!!");

      var cl = new Checklist(["p1"], expect, done);

      var gf = new GeoFire(dataRef);

      gf.set("loc1", [0, 0]).then(function() {
        cl.x("p1");
      });
    });

    it("set() updates Firebase when adding new locations", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [-90, -90]}
      ]).then(function() {
        cl.x("p1");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "indices": {
            "7zzzzzzzzzzzloc1": true,
            "v0gs3y0zh7w1loc2": true,
            "1bpbpbpbpbpbloc3": true
          },
          "locations": {
            "loc1": "0,0",
            "loc2": "50,50",
            "loc3": "-90,-90"
          }
        });

        cl.x("p2");
      });
    });

    it("set() updates Firebase when changing a pre-existing key", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      var gf = new GeoFire(dataRef);

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [-90, -90]}
      ]).then(function() {
        cl.x("p1");

        return gf.get("loc1");
      }).then(function(location) {
        cl.x("p2");

        return gf.set("loc1", [2, 3]);
      }).then(function() {
        cl.x("p3");

        return gf.get("loc1");
      }).then(function(location) {
        cl.x("p4");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "indices": {
            "s065kk0dc540loc1": true,
            "v0gs3y0zh7w1loc2": true,
            "1bpbpbpbpbpbloc3": true
          },
          "locations": {
            "loc1": "2,3",
            "loc2": "50,50",
            "loc3": "-90,-90"
          }
        });

        cl.x("p5");
      });
    });

    it("set() handles multiple keys at the same location", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [0, 0]},
        {key: "loc3", location: [0, 0]}
      ]).then(function() {
        cl.x("p1");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "indices": {
            "7zzzzzzzzzzzloc1": true,
            "7zzzzzzzzzzzloc2": true,
            "7zzzzzzzzzzzloc3": true
          },
          "locations": {
            "loc1": "0,0",
            "loc2": "0,0",
            "loc3": "0,0"
          }
        });

        cl.x("p2");
      });
    });

    it("set() throws errors on invalid keys" ,function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      var gf = new GeoFire(dataRef);

      var promises = {
        "p1": gf.set(true, [0, 0]),
        "p2": gf.set([0, 0], [0, 0]),
        "p3": gf.set({"a": 1}, [0, 0]),
        "p4": gf.set(null, [[0, 0], 0]),
        "p5": gf.set(undefined, [0, [0, 0]])
      };

      RSVP.hashSettled(promises).then(function(resultsHash) {
        for (var key in resultsHash) {
          expect(resultsHash[key].state).toEqual("rejected");
          cl.x(key);
        }
      });
    });

    it("set() throws errors on invalid locations" ,function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11", "p12", "p13", "p14", "p15"], expect, done);

      var gf = new GeoFire(dataRef);

      var promises = {
        "p1": gf.set("loc1", [-91, 0]),
        "p2": gf.set("loc2", [91, 0]),
        "p3": gf.set("loc3", [0, 181]),
        "p4": gf.set("loc4", [0, -181]),
        "p5": gf.set("loc5", [[0, 0], 0]),
        "p6": gf.set("loc6", [0, [0, 0]]),
        "p7": gf.set("loc7", ["text", 0]),
        "p8": gf.set("loc8", [0, "text"]),
        "p9": gf.set("loc9", ["text", "text"]),
        "p10": gf.set("loc10", [null, 0]),
        "p11": gf.set("loc11", [0, null]),
        "p12": gf.set("loc12", [null, null]),
        "p13": gf.set("loc13", [undefined, 0]),
        "p14": gf.set("loc14", [0, undefined]),
        "p15": gf.set("loc15", [undefined, undefined])
      };

      RSVP.hashSettled(promises).then(function(resultsHash) {
        for (var key in resultsHash) {
          expect(resultsHash[key].state).toEqual("rejected");
          cl.x(key);
        }
      });
    });
  });

  describe("Retrieving locations:", function() {
    it("get() returns a promise", function(done) {
      var cl = new Checklist(["p1"], expect, done);

      var gf = new GeoFire(dataRef);

      gf.get("loc1").then(function() {
        cl.x("p1");
      });
    });

    it("get() returns null for non-existent keys", function(done) {
      var cl = new Checklist(["p1"], expect, done);

      var gf = new GeoFire(dataRef);

      gf.get("loc1").then(function(location) {
        expect(location).toBeNull();

        cl.x("p1");
      });
    });

    it("get() retrieves locations given valid keys", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4"], expect, done);

      var gf = new GeoFire(dataRef);

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [-90, -90]}
      ]).then(function() {
        cl.x("p1");

        return gf.get("loc1");
      }).then(function(location) {
        expect(location).toEqual([0, 0]);
        cl.x("p2");

        return gf.get("loc2");
      }).then(function(location) {
        expect(location).toEqual([50, 50]);
        cl.x("p3");

        return gf.get("loc3");
      }).then(function(location) {
        expect(location).toEqual([-90, -90]);
        cl.x("p4");
      });
    });

    it("get() throws errors on invalid keys" ,function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      var gf = new GeoFire(dataRef);

      var promises = {
        "p1": gf.get(true),
        "p2": gf.get([1, 2]),
        "p3": gf.get({"a": 1}),
        "p4": gf.get(null),
        "p5": gf.get(undefined)
      };

      RSVP.hashSettled(promises).then(function(resultsHash) {
        for (var key in resultsHash) {
          expect(resultsHash[key].state).toEqual("rejected");
          cl.x(key);
        }
      });
    });
  });

  describe("Removing locations:", function() {
    it("set() removes existing location given null", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      var gf = new GeoFire(dataRef);

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [2, 3]}
      ]).then(function() {
        cl.x("p1");

        return gf.get("loc1");
      }).then(function(location) {
        expect(location).toEqual([0, 0]);

        cl.x("p2");

        return gf.set("loc1", null);
      }).then(function() {
        cl.x("p3");

        return gf.get("loc1");
      }).then(function(location) {
        expect(location).toBeNull();

        cl.x("p4");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "indices": {
            "s065kk0dc540loc2": true
          },
          "locations": {
            "loc2": "2,3"
          }
        });

        cl.x("p5");
      });
    });

    it("set() does nothing given a non-existent location and null", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      var gf = new GeoFire(dataRef);

      gf.set("loc1", [0, 0]).then(function() {
        cl.x("p1");

        return gf.get("loc1");
      }).then(function(location) {
        expect(location).toEqual([0, 0]);

        cl.x("p2");

        return gf.set("loc2", null);
      }).then(function() {
        cl.x("p3");

        return gf.get("loc2");
      }).then(function(location) {
        expect(location).toBeNull();

        cl.x("p4");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "indices": {
            "7zzzzzzzzzzzloc1": true
          },
          "locations": {
            "loc1": "0,0"
          }
        });

        cl.x("p5");
      });
    });

    it("remove() removes existing location", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      var gf = new GeoFire(dataRef);

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [2, 3]}
      ]).then(function() {
        cl.x("p1");

        return gf.get("loc1");
      }).then(function(location) {
        expect(location).toEqual([0, 0]);

        cl.x("p2");

        return gf.remove("loc1");
      }).then(function() {
        cl.x("p3");

        return gf.get("loc1");
      }).then(function(location) {
        expect(location).toBeNull();

        cl.x("p4");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "indices": {
            "s065kk0dc540loc2": true
          },
          "locations": {
            "loc2": "2,3"
          }
        });

        cl.x("p5");
      });
    });

    it("remove() does nothing given a non-existent location", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      var gf = new GeoFire(dataRef);

      gf.set("loc1", [0, 0]).then(function() {
        cl.x("p1");

        return gf.get("loc1");
      }).then(function(location) {
        expect(location).toEqual([0, 0]);

        cl.x("p2");

        return gf.remove("loc2");
      }).then(function() {
        cl.x("p3");

        return gf.get("loc2");
      }).then(function(location) {
        expect(location).toBeNull();

        cl.x("p4");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "indices": {
            "7zzzzzzzzzzzloc1": true
          },
          "locations": {
            "loc1": "0,0"
          }
        });

        cl.x("p5");
      });
    });
  });

  describe("query():", function() {
    it("query() returns GeoQuery instance", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      expect(gq instanceof GeoQuery).toBeTruthy();
    });
  });
});



/********************/
/*  GeoQuery TESTS  */
/********************/
describe("GeoQuery Tests:", function() {
  // Reset the Firebase before each test
  beforeEach(function(done) {
    resetFirebase().then(done);
  });

  describe("Constructor:", function() {
    it("Constructor stores query criteria", function() {
      console.log("!!!!!  GeoQuery Tests  !!!!!");

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      expect(gq.center()).toEqual([1,2]);
      expect(gq.radius()).toEqual(1000);
    });

    it("Constructor throws error on invalid query criteria", function() {
      var gf = new GeoFire(dataRef);

      expect(function() { gf.query({}) }).toThrow();
      expect(function() { gf.query({random: 100}) }).toThrow();
      expect(function() { gf.query({center: [1,2]}) }).toThrow();
      expect(function() { gf.query({radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [91,2], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [1,-181], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: ["text",2], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [1,[1,2]], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [null,2], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [1,undefined], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [1,2], radius: -10}) }).toThrow();
      expect(function() { gf.query({center: [1,2], radius: "text"}) }).toThrow();
      expect(function() { gf.query({center: [1,2], radius: [1,2]}) }).toThrow();
      expect(function() { gf.query({center: [1,2], radius: null}) }).toThrow();
      expect(function() { gf.query({center: [1,2], radius: undefined}) }).toThrow();
    });
  });

  describe("updateCriteria():", function() {
    it("updateCriteria() updates query criteria", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      // TODO: change
      expect(gq.center()).toEqual([1,2]);
      expect(gq.radius()).toEqual(1000);

      gq.updateCriteria({center: [2,3], radius: 100});

      expect(gq.center()).toEqual([2,3]);
      expect(gq.radius()).toEqual(100);
    });

    it("updateCriteria() updates query criteria when given only center", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      // TODO: change
      expect(gq.center()).toEqual([1,2]);
      expect(gq.radius()).toEqual(1000);

      gq.updateCriteria({center: [2,3]});

      expect(gq.center()).toEqual([2,3]);
      expect(gq.radius()).toEqual(1000);
    });

    it("updateCriteria() updates query criteria when given only radius", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      // TODO: change
      expect(gq.center()).toEqual([1,2]);
      expect(gq.radius()).toEqual(1000);

      gq.updateCriteria({radius: 100});

      expect(gq.center()).toEqual([1,2]);
      expect(gq.radius()).toEqual(100);
    });

    it("updateCriteria() fires \"key_entered\" callback for locations which now belong to the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered", "loc4 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [90,90], radius: 1000});
      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        gq.updateCriteria({center: [1,2], radius: 1000});

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("updateCriteria() fires \"key_left\" callback for locations which no longer belong to the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 left", "loc4 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1, 2], radius: 1000});
      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        gq.updateCriteria({center: [90,90], radius: 1000});

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("updateCriteria() throws error on invalid query criteria", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      expect(function() { gf.updateCriteria({}) }).toThrow();
      expect(function() { gf.updateCriteria({random: 100}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [91,2], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,-181], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: ["text",2], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,[1,2]], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [null,2], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,undefined], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,2], radius: -10}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,2], radius: "text"}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,2], radius: [1,2]}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,2], radius: null}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,2], radius: undefined}) }).toThrow();
    });
  });

  describe("results():", function() {
    it("results() returns valid results when there are locations within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      batchSet(gf, [
        {key: "loc1", location: [1, 2]},
        {key: "loc2", location: [1, 3]},
        {key: "loc3", location: [1, 4]},
        {key: "loc4", location: [25, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1")

        return gq.results();
      }).then(function(results) {
        expect(results).toEqual([
          { key: "loc1", location: [1,2] },
          { key: "loc2", location: [1,3] },
          { key: "loc3", location: [1,4] }
        ]);

        cl.x("p2");
      });
    });

    it("results() returns empty results when there are no locations within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      batchSet(gf, [
        {key: "loc1", location: [1, 90]},
        {key: "loc2", location: [50, -1]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [25, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1")

        return gq.results();
      }).then(function(results) {
        expect(results).toEqual([]);

        cl.x("p2");
      });
    });
  });

  describe("on():", function() {
    it("on() throws error given invalid event type", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var setInvalidEventType = function() {
        gq.on("invalid_event", function() { });
      }

      expect(setInvalidEventType).toThrow();
    });

    it("on() throws error given invalid callback", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var setInvalidCallback = function() {
        gq.on("key_entered", "non-function");
      }

      expect(setInvalidCallback).toThrow();
    });
  });

  describe("\"key_moved\" event:", function() {
    it("\"key_moved\" callback does not fire for brand new locations within or outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("\"key_moved\" callback does not fire for locations outside of the GeoQuery which are moved somewhere else outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [1, 90]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [1, 91]},
          {key: "loc3", location: [-50, -50]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback does not fire for locations outside of the GeoQuery which are moved within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [1, 90]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [0, 0]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback fires for locations within the GeoQuery which are moved somewhere else within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [2, 2]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback properly fires when multiple keys are at the same location within the GeoQuery and only one of them moves somewhere else within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [0, 0]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [2, 2]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback properly fires when a location within the GeoQuery moves somehwere else within the GeoQuery that is already occupied by another key", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [2, 2]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [2, 2]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("multiple \"key_moved\" callbacks fire for locations within the GeoQuery which are moved somewhere else within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved1", "loc3 moved1", "loc1 moved2", "loc3 moved2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved1");
      });
      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved2");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [2, 2]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback does not fire for locations within the GeoQuery which are moved somewhere outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [1, 90]},
          {key: "loc3", location: [-1, -90]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback fires for a location within the GeoQuery which is set to the same location", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, -1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [0, 0]},
          {key: "loc2", location: [55, 55]},
          {key: "loc3", location: [1, 1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });
  });

  describe("\"key_entered\" event:", function() {
    it("\"key_entered\" callback fires when a location enters the GeoQuery before onKeyEntered() was called", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered", "loc4 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        gq.on("key_entered", function(key, location) {
          cl.x(key + " entered");
        });

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("\"key_entered\" callback fires when a location enters the GeoQuery after onKeyEntered() was called", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered", "loc4 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("\"key_entered\" callback properly fires when multiple keys are at the same location outside the GeoQuery and only one of them moves within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });

      batchSet(gf, [
        {key: "loc1", location: [50, 50]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [18, -121]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [2, 2]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_entered\" callback properly fires when a location outside the GeoQuery moves somewhere within the GeoQuery that is already occupied by another key", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 entered", "loc3 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });

      batchSet(gf, [
        {key: "loc1", location: [50, 50]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [0, 0]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [0, 0]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("multiple \"key_entered\" callbacks fire when a location enters the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered1", "loc4 entered1", "loc1 entered2", "loc4 entered2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered1");
      });
      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered2");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });
  });

  describe("\"key_left\" event:", function() {
    it("\"key_left\" callback fires when a location leaves the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 left", "loc4 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [25, 90]},
          {key: "loc4", location: [25, 5]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_left\" callback fires when a location within the GeoQuery is entirely removed from GeoFire", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [2, 3]}
      ]).then(function() {
        cl.x("p1");

        return gf.remove("loc1");
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_left\" callback properly fires when multiple keys are at the same location inside the GeoQuery and only one of them moves outside the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [0, 0]},
        {key: "loc3", location: [18, -121]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [20, -55]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_left\" callback properly fires when a location inside the GeoQuery moves somewhere outside the GeoQuery that is already occupied by another key", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [18, -121]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [18, -121]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("multiple \"key_left\" callbacks fire when a location leaves the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 left1", "loc4 left1", "loc1 left2", "loc4 left2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_left", function(key, location) {
        cl.x(key + " left1");
      });
      gq.on("key_left", function(key, location) {
        cl.x(key + " left2");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [25, 90]},
          {key: "loc4", location: [25, 5]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });
  });

  describe("\"key_*\" events combined:", function() {
    it ("\"key_*\" event callbacks fire when used all at the same time", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "loc1 entered", "loc4 entered", "loc1 moved", "loc4 left", "loc1 left", "loc5 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });
      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });
      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [1, 1]},
          {key: "loc4", location: [25, 5]}
        ]);
      }).then(function() {
        cl.x("p2");

        return batchSet(gf, [
          {key: "loc1", location: [10, -100]},
          {key: "loc2", location: [50, -50]},
          {key: "loc5", location: [5, 5]}
        ]);
      }).then(function() {
        cl.x("p3");

        return wait(5);
      }).then(function() {
        cl.x("p4");
      });
    });
  });

  describe("Cancelling GeoQuery:", function() {
    it ("cancel() prevents GeoQuery from firing any more \"key_*\" event callbacks", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 entered", "loc4 entered", "loc1 moved", "loc4 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });
      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });
      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [1, 1]},
          {key: "loc4", location: [25, 5]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3")

        gq.cancel();

        return batchSet(gf, [
          {key: "loc1", location: [10, -100]},
          {key: "loc2", location: [50, -50]},
          {key: "loc5", location: [5, 5]}
        ]);
      }).then(function() {
        cl.x("p4");

        return wait(5);
      }).then(function() {
        cl.x("p5");
      });
    });
  });
});

/***********************************/
/*  GeoCallbackRegistration TESTS  */
/***********************************/
describe("GeoCallbackRegistration Tests:", function() {
  // Reset the Firebase before each test
  beforeEach(function(done) {
    resetFirebase().then(done);
  });

  describe("Constructor:", function() {
    it("Constructor throws error given non-function", function() {
      console.log("!!!!!  GeoCallbackRegistration Tests  !!!!!");

      var createCallbackRegistration = function() {
        GeoCallbackRegistration("nonFunction");
      }

      expect(createCallbackRegistration).toThrow();
    });
  });

  describe("Cancelling event callbacks:", function() {
    it("\"key_moved\" registrations can be cancelled", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var onKeyMovedRegistration = gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [2, 2]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        onKeyMovedRegistration.cancel();
        cl.x("p3");

        return gf.set("loc3", [1, 2]);
      }).then(function() {
        cl.x("p4");

        return wait(5);
      }).then(function() {
        cl.x("p5");
      });
    });

    it("\"key_entered\" registrations can be cancelled", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "loc1 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var onKeyEnteredRegistration = gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [80, 80]}
      ]).then(function() {
        cl.x("p1");

        return wait(5);
      }).then(function() {
        onKeyEnteredRegistration.cancel();
        cl.x("p2");

        return gf.set("loc3", [1, 2]);
      }).then(function() {
        cl.x("p3");

        return wait(5);
      }).then(function() {
        cl.x("p4");
      });
    });

    it("\"key_left\" registrations can be cancelled", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var onKeyLeftRegistration = gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [80, 80]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        onKeyLeftRegistration.cancel();
        cl.x("p3");

        return gf.set("loc3", [-80, -80]);
      }).then(function() {
        cl.x("p4");

        return wait(5);
      }).then(function() {
        cl.x("p5");
      });
    });

    it("Cancelling a \"key_moved\" registration does not cancel all \"key_moved\" callbacks", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 moved1", "loc1 moved2", "loc3 moved2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var onKeyMovedRegistration1 = gq.on("key_moved", function(key, location) {
        cl.x(key + " moved1");
      });
      var onKeyMovedRegistration2 = gq.on("key_moved", function(key, location) {
        cl.x(key + " moved2");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [2, 2]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        onKeyMovedRegistration1.cancel();
        cl.x("p3");

        return gf.set("loc3", [1, 2]);
      }).then(function() {
        cl.x("p4");

        return wait(5);
      }).then(function() {
        cl.x("p5");
      });
    });

    it("Cancelling an \"key_entered\" registration does not cancel all \"key_entered\" callbacks", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "loc1 entered1", "loc1 entered2", "loc3 entered2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var onKeyEnteredRegistration1 = gq.on("key_entered", function(key, location) {
        cl.x(key + " entered1");
      });
      var onKeyEnteredRegistration2 = gq.on("key_entered", function(key, location) {
        cl.x(key + " entered2");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [80, 80]}
      ]).then(function() {
        cl.x("p1");

        return wait(5);
      }).then(function() {
        onKeyEnteredRegistration1.cancel();
        cl.x("p2");

        return gf.set("loc3", [1, 2]);
      }).then(function() {
        cl.x("p3");

        return wait(5);
      }).then(function() {
        cl.x("p4");
      });
    });

    it("Cancelling an \"key_left\" registration does not cancel all \"key_left\" callbacks", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 left1", "loc1 left2", "loc3 left2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var onKeyLeftRegistration1 = gq.on("key_left", function(key, location) {
        cl.x(key + " left1");
      });
      var onKeyLeftRegistration2 = gq.on("key_left", function(key, location) {
        cl.x(key + " left2");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [80, 80]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        onKeyLeftRegistration1.cancel();
        cl.x("p3");

        return gf.set("loc3", [-80, -80]);
      }).then(function() {
        cl.x("p4");

        return wait(5);
      }).then(function() {
        cl.x("p5");
      });
    });

    it("Calling cancel on a GeoCallbackRegistration twice does not throw", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var onKeyLeftRegistration = gq.on("key_left", function() {});

      expect(function() { onKeyLeftRegistration.cancel() }).not.toThrow();
      expect(function() { onKeyLeftRegistration.cancel() }).not.toThrow();
    });
  });
});