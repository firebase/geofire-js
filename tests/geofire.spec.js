/*************/
/*  GLOBALS  */
/*************/
// Override the default timeout interval for Jasmine
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;

// Add a batchSet() method to GeoFire to make it easier to test
GeoFire.prototype.batchSet = function (keyLocationPairs) {
  var promises = keyLocationPairs.map(function(keyLocationPair) {
    return this.set(keyLocationPair.key, keyLocationPair.location);
  }.bind(this));
  return RSVP.allSettled(promises);
};

// Get a reference to the demo Firebase
var dataRef = new Firebase("https://geofiretest.firebaseio-demo.com");

/**********************/
/*  HELPER FUNCTIONS  */
/**********************/
/* Clears all Firebase event handlers and resets the Firebase; runs before each test to ensure there is no pollution between tests */
function resetFirebase() {
  console.log("");
  console.log("********** Resetting Firebase **********");

  return new RSVP.Promise(function(resolve, reject) {
    dataRef.child("indices").off("child_added");
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
      console.log("!!!!!!!!!!!!!!!!!!!!!!!");
      console.log("!!!  GeoFire Tests  !!!");
      console.log("!!!!!!!!!!!!!!!!!!!!!!!");

      var cl = new Checklist(["p1"], expect, done);

      var gf = new GeoFire(dataRef);

      gf.set("loc1", [0, 0]).then(function() {
        cl.x("p1");
      });
    });

    it("set() updates Firebase when adding new locations", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);

      gf.batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [-90, -90]}
      ]).then(function() {
        cl.x("p1");

        return getFirebaseData();
      }).then(function(firebaseData) {
        console.log(firebaseData);
        expect(firebaseData).toEqual({
          "indices": {
            "7zzzzzzzzzzz": "loc1",
            "v0gs3y0zh7w1": "loc2",
            "1bpbpbpbpbpb": "loc3"
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

      gf.batchSet([
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
            "s065kk0dc540": "loc1",
            "v0gs3y0zh7w1": "loc2",
            "1bpbpbpbpbpb": "loc3"
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

    xit("set() handles multiple keys at the same location", function(done) {
      expect(true).toBeFalsy();
    });

    it("set() throws errors on invalid keys" ,function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "p6"], expect, done);

      var gf = new GeoFire(dataRef);

      var promises = {
        "p1": gf.set(100, [0, 0]),
        "p2": gf.set(true, [0, 0]),
        "p3": gf.set([0, 0], [0, 0]),
        "p4": gf.set({"a": 1}, [0, 0]),
        "p5": gf.set(null, [[0, 0], 0]),
        "p6": gf.set(undefined, [0, [0, 0]])
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

      gf.batchSet([
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
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "p6"], expect, done);

      var gf = new GeoFire(dataRef);

      var promises = {
        "p1": gf.get(100),
        "p2": gf.get(true),
        "p3": gf.get([1, 2]),
        "p4": gf.get({"a": 1}),
        "p5": gf.get(null),
        "p6": gf.get(undefined)
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

      gf.batchSet([
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
            "s065kk0dc540": "loc2"
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
            "7zzzzzzzzzzz": "loc1"
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

      gf.batchSet([
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
            "s065kk0dc540": "loc2"
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
            "7zzzzzzzzzzz": "loc1"
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
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

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
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!");
      console.log("!!!  GeoQuery Tests  !!!");
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!");

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

      expect(gq._type).toEqual("circle");
      expect(gq._center).toEqual([1,2]);
      expect(gq._radius).toEqual(1000);
    });

    xit("Constructor throws error on invalid query criteria", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"triangle", center: [1,2], radius: 1000});
    });
  });

  describe("updateQueryCriteria():", function() {
    it("updateQueryCriteria() updates query criteria", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

      expect(gq._type).toEqual("circle");
      expect(gq._center).toEqual([1,2]);
      expect(gq._radius).toEqual(1000);

      gq.updateQueryCriteria({type:"square", center: [2,3], radius: 100});

      expect(gq._type).toEqual("square");
      expect(gq._center).toEqual([2,3]);
      expect(gq._radius).toEqual(100);
    });

    xit("updateQueryCriteria() throws error on invalid query criteria", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

      gq.updateQueryCriteria({type:"triangle", center: [1,2], radius: 1000});
    });
  });

  describe("getResults():", function() {
    it("getResults() returns valid results when there are locations within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

      gf.batchSet([
        {key: "loc1", location: [1, 2]},
        {key: "loc2", location: [1, 3]},
        {key: "loc3", location: [1, 4]},
        {key: "loc4", location: [25, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1")

        return gq.getResults();
      }).then(function(results) {
        expect(results).toEqual({
          "loc1": [1,2],
          "loc2": [1,3],
          "loc3": [1,4]
        });

        cl.x("p2");
      });
    });

    it("getResults() returns empty results when there are no locations within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

      gf.batchSet([
        {key: "loc1", location: [1, 90]},
        {key: "loc2", location: [50, -1]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [25, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1")

        return gq.getResults();
      }).then(function(results) {
        expect(results).toEqual({});

        cl.x("p2");
      });
    });
  });

  describe("onKeyMoved() event:", function() {
    it("onKeyMoved() callback does not fire for brand new locations within or outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      gq.onKeyMoved(function(key, location) {
        cl.x(key + " moved");
      });

      gf.batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");
      });
    });

    it("onKeyMoved() callback does not fire for locations outside of the GeoQuery which are moved somewhere else outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      gq.onKeyMoved(function(key, location) {
        cl.x(key + " moved");
      });

      gf.batchSet([
        {key: "loc1", location: [1, 90]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]}
      ]).then(function() {
        cl.x("p1");

        return gf.batchSet([
          {key: "loc1", location: [1, 91]},
          {key: "loc3", location: [-50, -50]}
        ]);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("onKeyMoved() callback does not fire for locations outside of the GeoQuery which are moved within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      gq.onKeyMoved(function(key, location) {
        cl.x(key + " moved");
      });

      gf.batchSet([
        {key: "loc1", location: [1, 90]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]}
      ]).then(function() {
        cl.x("p1");

        return gf.batchSet([
          {key: "loc1", location: [0, 0]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("onKeyMoved() callback fires for locations within the GeoQuery which are moved somewhere else within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      gq.onKeyMoved(function(key, location) {
        cl.x(key + " moved");
      });

      gf.batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return gf.batchSet([
          {key: "loc1", location: [2, 2]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("onKeyMoved() callback does not fire for locations within the GeoQuery which are moved somewhere outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      gq.onKeyMoved(function(key, location) {
        cl.x(key + " moved");
      });

      gf.batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return gf.batchSet([
          {key: "loc1", location: [1, 90]},
          {key: "loc3", location: [-1, -90]}
        ]);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("onKeyMoved() callback fires for a location within the GeoQuery which is set to the same location", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      gq.onKeyMoved(function(key, location) {
        cl.x(key + " moved");
      });

      gf.batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, -1]}
      ]).then(function() {
        cl.x("p1");

        return gf.batchSet([
          {key: "loc1", location: [0, 0]},
          {key: "loc2", location: [55, 55]},
          {key: "loc3", location: [1, 1]}
        ]);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("onKeyMoved() callback throws error given non-function", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});

      var setOnKeyMovedToNonfunction = function() {
        gq.onKeyMoved("nonFunction");
      }

      expect(setOnKeyMovedToNonfunction).toThrow();
    });
  });

  describe("onKeyEntered() event:", function() {
    it("onKeyEntered() callback fires for each location added to the GeoQuery before onKeyEntered() was called", function(done) {
      var cl = new Checklist(["p1", "loc1 entered", "loc4 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});

      gf.batchSet([
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        gq.onKeyEntered(function(key, location) {
          cl.x(key + " entered");
        });
      });
    });

    it("onKeyEntered() callback fires for each location added to the GeoQuery after onKeyEntered() was called", function(done) {
      var cl = new Checklist(["p1", "loc1 entered", "loc4 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      gq.onKeyEntered(function(key, location) {
        cl.x(key + " entered");
      });

      gf.batchSet([
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");
      });
    });

    it("onKeyEntered() callback throws error given non-function", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});

      var setOnKeyEnteredToNonfunction = function() {
        gq.onKeyEntered("nonFunction");
      }

      expect(setOnKeyEnteredToNonfunction).toThrow();
    });
  });

  describe("onKeyLeft() event:", function() {
    it("onKeyLeft() callback fires when a location leaves the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered", "loc4 entered", "loc1 left", "loc4 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      gq.onKeyEntered(function(key, location) {
        cl.x(key + " entered");
      });

      gq.onKeyLeft(function(key, location) {
        cl.x(key + " left");
      });

      gf.batchSet([
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return gf.batchSet([
          {key: "loc1", location: [25, 90]},
          {key: "loc4", location: [25, 5]}
        ]);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("onKeyLeft() callback throws error given non-function", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});

      var setOnKeyLeftToNonfunction = function() {
        gq.onKeyLeft("nonFunction");
      }

      expect(setOnKeyLeftToNonfunction).toThrow();
    });
  });

  describe("Cancelling GeoQuery:", function() {
    xit ("cancel() prevents GeoQuery from firing any more onKey*() event callbacks", function(done) {
      expect(true).toBeFalsy();
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
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.log("!!!  GeoCallbackRegistration Tests  !!!");
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

      var createCallbackRegistration = function() {
        GeoCallbackRegistration("nonFunction");
      }

      expect(createCallbackRegistration).toThrow();
    });
  });

  describe("Cancelling event callbacks:", function() {
    it("onKeyMoved() can be cancelled", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      var onKeyMovedRegistration = gq.onKeyMoved(function(key, location) {
        cl.x(key + " moved");
      });

      gf.batchSet([
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

    it("onKeyEntered() can be cancelled", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "loc1 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      var onKeyEnteredRegistration = gq.onKeyEntered(function(key, location) {
        cl.x(key + " entered");
      });

      gf.batchSet([
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

    it("onKeyLeft() can be cancelled", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      var onKeyLeftRegistration = gq.onKeyLeft(function(key, location) {
        cl.x(key + " left");
      });

      gf.batchSet([
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
  });
});