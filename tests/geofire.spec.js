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
  console.log("***************************************");
  console.log("*** Reseting Firebase for next test ***");
  console.log("***************************************");
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
function Checklist(items, done) {
  var eventsToComplete = items;

  this.x = function(item) {
    var index = eventsToComplete.indexOf(item);
    if (index == -1) {
      // TODO: throwing this error is not enough to make some tests fail
      throw new Error("Attempting to remove unexpected item '" + item + "' from Checklist");
    }
    else {
      eventsToComplete.splice(index, 1);
      if (eventsToComplete.length == 0) {
        done();
      }
    }
  }
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
      var cl = new Checklist(["first promise", "second promise"], done);

      var gf = new GeoFire(dataRef);
      var p1 = gf.set("loc1", [1,2]);
      var p2 = gf.get("loc1");

      p1.then(function() {
        cl.x("first promise");
      });

      p2.then(function(loc) {
        expect(loc).toEqual([1,2]);
        cl.x("second promise");
      });
    });
  });

  describe("set()", function() {
    it("set() handles existing key", function(done) {
      var cl = new Checklist(["first promise", "second promise", "third promise", "fourth promise"], done);

      var gf = new GeoFire(dataRef);
      var p1 = gf.set("loc1", [1,2]);
      var p2 = gf.get("loc1");

      p1.then(function() {
        cl.x("first promise");
      });

      p2.then(function(loc) {
        expect(loc).toEqual([1,2]);
        cl.x("second promise");

        var p3 = gf.set("loc1", [2,3]);
        var p4 = gf.get("loc1");

        p3.then(function() {
          cl.x("third promise");
        });

        p4.then(function(loc) {
          expect(loc).toEqual([2,3]);
          cl.x("fourth promise");
        });
      });
    });

    it("set() throws error on invalid key" ,function(done) {
      var cl = new Checklist(["first promise", "second promise", "third promise"], done);

      var gf = new GeoFire(dataRef);
      var p1 = gf.set(100, [1,2]);
      var p2 = gf.set(true, [1,2]);
      var p3 = gf.set({"a": 1}, [1,2]);

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

    xit("set() throws error on invalid location" ,function(done) {
      var cl = new Checklist(["first promise", "second promise", "third promise", "fourth promise", "fifth promise", "sixth promise", "seventh promise"], done);

      var gf = new GeoFire(dataRef);
      var p1 = gf.set("loc1", [-91,0]);
      var p2 = gf.set("loc2", [91,0]);
      var p3 = gf.set("loc3", [0,181]);
      var p4 = gf.set("loc4", [0,-181]);
      var p5 = gf.set("loc5", ["text",0]);
      var p6 = gf.set("loc6", [0,"text"]);
      var p7 = gf.set("loc7", ["text", "text"]);

      p1.then(function() {
        console.log("womp womp");
        expect(true).toBeFalsy();
      }, function(error) {
        cl.x("first promise");
      });

      p2.then(function() {
        console.log("womp womp");
        expect(true).toBeFalsy();
      }, function(error) {
        cl.x("second promise");
      });

      p3.then(function() {
        console.log("womp womp");
        expect(true).toBeFalsy();
      }, function(error) {
        cl.x("third promise");
      });

      p4.then(function() {
        console.log("womp womp");
        expect(true).toBeFalsy();
      }, function(error) {
        cl.x("fourth promise");
      });

      p5.then(function() {
        console.log("womp womp");
        expect(true).toBeFalsy();
      }, function(error) {
        cl.x("fifth promise");
      });

      p6.then(function() {
        console.log("womp womp");
        expect(true).toBeFalsy();
      }, function(error) {
        cl.x("sixth promise");
      });

      p7.then(function() {
        console.log("womp womp");
        expect(true).toBeFalsy();
      }, function(error) {
        cl.x("seventh promise");
      });
    });
  });

  describe("get()", function() {
    it("get() handles an unknown key", function(done) {
      var cl = new Checklist(["first promise"], done);

      var gf = new GeoFire(dataRef);
      var p1 = gf.get("unknown");

      p1.then(function(loc) {
        expect(loc).toBeNull();
        cl.x("first promise");
      });
    });

    it("get() throws error on invalid key" ,function(done) {
      var cl = new Checklist(["first promise", "second promise", "third promise"], done);

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
      var cl = new Checklist(["set promises", "getResults promise"], done);

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
      var cl = new Checklist(["set promises", "getResults promise"], done);

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

  describe("onKey*() events", function() {
    xit("onKeyMoved() callback fires for each location added to the GeoQuery", function(done) {
      var cl = new Checklist(["batchSet promise", "loc1 moved", "loc2 moved", "loc3 moved"], done);

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
        cl.x("batchSet promise");
      });
    });

    it("onKeyEntered() callback fires for each location added to the GeoQuery before onKeyEntered() was called", function(done) {
      console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
      var cl = new Checklist(["batchSet promise", "loc1 entered", "loc4 entered"], done);

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
      var cl = new Checklist(["batchSet promise", "loc1 entered", "loc4 entered"], done);

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

    it("onKeyLeft() callbackfires when a location leaves the GeoQuery", function(done) {
      var cl = new Checklist(["batchSet1 promise", "batchSet2 promise", "loc1 entered", "loc4 entered", "loc1 left", "loc4 left"], done);

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