var dataRef = new Firebase("https://geofiretest.firebaseio-demo.com");

// TODO: do we need to reset the firebase after every test to ensure correctness?
function resetFirebase() {
  return new RSVP.Promise(function(resolve, reject) {
    dataRef.remove(function() {
      resolve();
    });
  });
};

function Checklist(items, doneCB) {
  var eventsToComplete = items ? items : ["default"];

  this.x = function(item) {
    var ind = eventsToComplete.indexOf(item);
    if(ind >= 0) {
      eventsToComplete.splice(ind, 1);
    }
    if(eventsToComplete.length == 0) {
      doneCB();
    }
  }
};

describe("GeoFire Tests", function() {
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
  }, 1000);

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
  }, 1000);

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
  }, 1000);

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
  }, 1000);

  it("get() handles an unknown key", function(done) {
    var cl = new Checklist(["first promise"], done);

    var gf = new GeoFire(dataRef);
    var p1 = gf.get("unknown");

    p1.then(function(loc) {
      expect(loc).toBeNull();
      cl.x("first promise");
    });
  }, 1000);

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
  }, 1000);

  it("query() returns GeoQuery instance", function() {
    var gf = new GeoFire(dataRef);
    var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

    expect(gq instanceof GeoQuery).toBeTruthy();
  });
});

describe("GeoQuery Tests", function() {
  it("constructor stores query criteria", function() {
    var gf = new GeoFire(dataRef);
    var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

    expect(gq._type).toEqual("circle");
    expect(gq._center).toEqual([1,2]);
    expect(gq._radius).toEqual(1000);
  });

  xit("constructor throws error on invalid query criteria", function() {
    var gf = new GeoFire(dataRef);
    var gq = gf.query({type:"circle", center: [1,2], radius: 1000});
  });

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
  });

  it("getInitialResults() returns valid, non-empty results", function(done) {
    var cl = new Checklist(["set promises", "getInitialResults promise"], done);

    resetFirebase().then(function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

      var p1 = gf.set("loc1", [1,2]);
      var p2 = gf.set("loc2", [1,3]);
      var p3 = gf.set("loc3", [1,4]);
      var p4 = gf.set("loc4", [25,5]);
      var p5 = gf.set("loc5", [67,55]);
      var setPromises = [p1, p2, p3, p4, p5];

      RSVP.all(setPromises).then(function(posts) {
        cl.x("set promises")

        var p6 = gq.getInitialResults();
        p6.then(function(initialResults) {
          expect(initialResults).toEqual(["loc1", "loc2", "loc3"]);
          cl.x("getInitialResults promise");
        });
      }).catch(function(error){
        expect(true).toBeFalsy();
      });
    });
  }, 1000);

  it("getInitialResults() returns valid, emtpy results", function(done) {
    var cl = new Checklist(["set promises", "getInitialResults promise"], done);

    resetFirebase().then(function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({type:"circle", center: [1,2], radius: 1000});

      var p1 = gf.set("loc1", [1,90]);
      var p2 = gf.set("loc2", [50,-7]);
      var p3 = gf.set("loc3", [16,-150]);
      var p4 = gf.set("loc4", [25,5]);
      var p5 = gf.set("loc5", [67,55]);
      var setPromises = [p1, p2, p3, p4, p5];

      RSVP.all(setPromises).then(function(posts) {
        cl.x("set promises")

        var p6 = gq.getInitialResults();
        p6.then(function(initialResults) {
          expect(initialResults).toEqual([]);
          cl.x("getInitialResults promise");
        });
      }).catch(function(error){
        expect(true).toBeFalsy();
      });
    });
  }, 1000);
});