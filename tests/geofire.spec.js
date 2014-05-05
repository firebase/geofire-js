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
  console.log("");
  console.log("********** Reseting Firebase for next test **********");
  var indicesPromise = new RSVP.Promise(function(resolve, reject) {
    dataRef.child("indices").on("value", function(dataSnapshot) {
      dataSnapshot.forEach(function(childSnapshot) {
        dataRef.child("indices/" + childSnapshot.name()).off();
      });
      dataRef.child("indices").off();
      resolve();
    });
  });

  var locationsPromise = new RSVP.Promise(function(resolve, reject) {
    dataRef.child("locations").on("value", function(dataSnapshot) {
      dataSnapshot.forEach(function(childSnapshot) {
        dataRef.child("locations/" + childSnapshot.name()).off();
      });
      dataRef.child("locations").off();
      resolve();
    });
  });

  return new RSVP.all([indicesPromise, locationsPromise]).then(function() {
      return new RSVP.Promise(function(resolve, reject) {
        dataRef.remove(resolve);
      });
  });
};

/* Keeps track of all the current async tasks being run */
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
/*  GEOFIRE TESTS  */
/*******************/
describe("GeoFire Tests", function() {
  // Reset the Firebase before each test
  beforeEach(function(done) {
    resetFirebase().then(done);
  });

  describe("Promises", function() {
    it("get() and set() return promises", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var p1 = gf.set("loc1", [0, 0]);
      var p2 = gf.get("loc1");

      p1.then(function() {
        cl.x("p1");
      });

      p2.then(function(location) {
        expect(location).toEqual([0, 0]);
        cl.x("p2");
      });
    });
  });

  describe("set()", function() {
    it("set() properly updates Firebase", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var p1 = gf.set("loc1", [0, 0]);

      p1.then(function() {
        cl.x("p1");

        new RSVP.Promise(function(resolve, reject) {
          dataRef.once("value", function(dataSnapshot) {
            expect(dataSnapshot.val()).toEqual({
              "indices": {
                "7zzzzzzzzzzz": "loc1"
              },
              "locations": {
                "loc1": "0,0"
              }
            });
            cl.x("p2");
          });
        });
      });
    });

    it("set() updates location given pre-existing key", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      var gf = new GeoFire(dataRef);
      var p1 = gf.set("loc1", [0, 0]);
      var p2 = gf.get("loc1");

      p1.then(function() {
        cl.x("p1");
      });

      p2.then(function(location) {
        expect(location).toEqual([0, 0]);
        cl.x("p2");

        var p3 = gf.set("loc1", [2, 3]);
        var p4 = gf.get("loc1");

        p3.then(function() {
          cl.x("p3");
        });

        p4.then(function(location) {
          expect(location).toEqual([2, 3]);
          cl.x("p4");

          new RSVP.Promise(function(resolve, reject) {
            dataRef.once("value", function(dataSnapshot) {
              expect(dataSnapshot.val()).toEqual({
                "indices": {
                  "s065kk0dc540": "loc1"
                },
                "locations": {
                  "loc1": "2,3"
                }
              });
              cl.x("p5");
            });
          });
        });
      });

      // TODO: validate that /indices/ and /locations/ are correct in Firebase
    });

    it("set() throws error on invalid key" ,function(done) {
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

    it("set() throws error on invalid location" ,function(done) {
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

  describe("get()", function() {
    it("get() returns null for non-existent keys", function(done) {
      var cl = new Checklist(["p1"], expect, done);

      var gf = new GeoFire(dataRef);

      var p1 = gf.get("loc1");

      p1.then(function(location) {
        expect(location).toBeNull();
        cl.x("p1");
      });
    });

    it("get() throws error on invalid key" ,function(done) {
      var cl = new Checklist(["first promise", "second promise", "third promise"], expect, done);

      var gf = new GeoFire(dataRef);
      var p1 = gf.get(100);
      var p2 = gf.get(true);
      var p3 = gf.get({"a": 1});

      p1.then(function() {
        expect(true).toBeFalsy();
      }, function(error) {
        cl.x("first promise");
      });

      p2.then(function() {
        expect(true).toBeFalsy();
      }, function(error) {
        cl.x("second promise");
      });

      p3.then(function() {
        expect(true).toBeFalsy();
      }, function(error) {
        cl.x("third promise");
      });
    });
  });

  describe("query()", function() {
    it("query() returns GeoQuery instance", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

      expect(gq instanceof GeoQuery).toBeTruthy();
    });
  });
});

/********************/
/*  GEOQUERY TESTS  */
/********************/
describe("GeoQuery Tests", function() {
  // Reset the Firebase before each test
  beforeEach(function(done) {
    resetFirebase().then(done);
  });

  describe("Constructor", function() {
    it("constructor stores query criteria", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

      expect(gq._type).toEqual("circle");
      expect(gq._center).toEqual([1,2]);
      expect(gq._radius).toEqual(1000);
    });

    it("constructor throws error on invalid query criteria", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});
    });
  });

  describe("updateQueryCriteria()", function() {
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

    it("updateQueryCriteria() throws error on invalid query criteria", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});
    });
  });

  describe("getResults()", function() {
    xit("getResults() returns valid, non-empty results", function(done) {
      var cl = new Checklist(["set promises", "getResults promise"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

      var p1 = gf.set("loc1", [1,2]);
      var p2 = gf.set("loc2", [1,3]);
      var p3 = gf.set("loc3", [1,4]);
      var p4 = gf.set("loc4", [25,5]);
      var p5 = gf.set("loc5", [67,55]);
      var setPromises = [p1, p2, p3, p4, p5];

      RSVP.all(setPromises).then(function() {
        cl.x("set promises")

        var p6 = gq.getResults();
        p6.then(function(initialResults) {
          expect(initialResults).toEqual(["loc1", "loc2", "loc3"]);
          cl.x("getResults promise");
        });
      }).catch(function(error){
        expect(true).toBeFalsy();
      });
    });

    xit("getResults() returns valid, emtpy results", function(done) {
      var cl = new Checklist(["set promises", "getResults promise"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

      var p1 = gf.set("loc1", [1,90]);
      var p2 = gf.set("loc2", [50,-7]);
      var p3 = gf.set("loc3", [16,-150]);
      var p4 = gf.set("loc4", [25,5]);
      var p5 = gf.set("loc5", [67,55]);
      var setPromises = [p1, p2, p3, p4, p5];

      RSVP.all(setPromises).then(function() {
        cl.x("set promises")

        var p6 = gq.getResults();
        p6.then(function(initialResults) {
          expect(initialResults).toEqual([]);
          cl.x("getResults promise");
        });
      }).catch(function(error){
        expect(true).toBeFalsy();
      });
    });
  });

  describe("onKeyMoved() event", function() {
    // TODO: should we fire or not fire for these locations?
    xit("onKeyMoved() callback fires for new locations which are within the GeoQuery", function(done) {
      var cl = new Checklist(["batchSet1", "loc1 moved", "loc3 moved"], expect, done);

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
        cl.x("batchSet1");
      });
    });

    it("onKeyMoved() callback does not fire for locations outside of the GeoQuery which are moved somewhere else outside of the GeoQuery", function(done) {
      var cl = new Checklist(["batchSet1", "batchSet2"], expect, done);

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
        cl.x("batchSet1");

        gf.batchSet([
          {key: "loc1", location: [1, 91]},
          {key: "loc3", location: [-50, -50]}
        ]).then(function() {
          cl.x("batchSet2");
        })
      });
    });

    it("onKeyMoved() callback fires for locations outside of the GeoQuery which are moved within the GeoQuery", function(done) {
      var cl = new Checklist(["batchSet1", "batchSet2", "loc1 moved", "loc3 moved"], expect, done);

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
        cl.x("batchSet1");

        gf.batchSet([
          {key: "loc1", location: [0, 0]},
          {key: "loc3", location: [-1, -1]}
        ]).then(function() {
          cl.x("batchSet2");
        })
      });
    });

    it("onKeyMoved() callback fires for locations within the GeoQuery which are moved somewhere else within the GeoQuery", function(done) {
      var cl = new Checklist(["batchSet1", "batchSet2", "loc1 moved", "loc1 moved", "loc3 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      gq.onKeyMoved(function(key, location) {
        console.log("Boooo: " + key)
        cl.x(key + " moved");
      });

      gf.batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("batchSet1");

        gf.batchSet([
          {key: "loc1", location: [2, 2]},
          {key: "loc3", location: [-1, -1]}
        ]).then(function() {
          cl.x("batchSet2");
        })
      });
    });

    // TODO: should we fire or not fire for these locations?
    xit("onKeyMoved() callback fires for a location within the GeoQuery which is updated to the same location", function(done) {
      var cl = new Checklist(["batchSet1", "batchSet2", "loc1 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});
      gq.onKeyMoved(function(key, location) {
        cl.x(key + " moved");
      });

      gf.batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]}
      ]).then(function() {
        cl.x("batchSet1");

        gf.batchSet([
          {key: "loc1", location: [0, 0]},
          {key: "loc3", location: [1, 1]}
        ]).then(function() {
          cl.x("batchSet2");
        })
      });
    });
  });

  describe("onKeyEntered() event", function() {
    it("onKeyEntered() callback fires for each location added to the GeoQuery before onKeyEntered() was called", function(done) {
      console.log("Does this test actually work??")
      var cl = new Checklist(["batchSet promise", "loc1 entered", "loc4 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({type: "circle", center: [1,2], radius: 1000});

      gf.batchSet([
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("batchSet promise");

        gq.onKeyEntered(function(key, location) {
          cl.x(key + " entered");
        });
      });
    });

    it("onKeyEntered() callback fires for each location added to the GeoQuery after onKeyEntered() was called", function(done) {
      var cl = new Checklist(["batchSet promise", "loc1 entered", "loc4 entered"], expect, done);

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
        cl.x("batchSet promise");
      });
    });
  });

  describe("onKeyLeft() event", function() {
    xit("onKeyLeft() callbackfires when a location leaves the GeoQuery", function(done) {
      var cl = new Checklist(["batchSet1 promise", "batchSet2 promise", "loc1 entered", "loc4 entered", "loc1 left", "loc4 left"], expect, done);

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
        cl.x("batchSet1 promise");
        gf.batchSet([
          {key: "loc1", location: [25, 90]},
          {key: "loc4", location: [25, 5]}
        ]).then(function() {
          cl.x("batchSet2 promise");
        })
      });
    });
  });
});