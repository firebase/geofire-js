describe("GeoFire Tests", function() {
  var dataRef = new Firebase("https://geofiretest.firebaseio-demo.com");

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

  it("get and set return promises", function(done) {
    var cl = new Checklist(["first promise", "second promise"], done);

    var gf = new GeoFire(dataRef);
    var p1 = gf.set("hello", [1,2]);
    var p2 = gf.get("hello");

    p1.then(function() {
      cl.x("first promise");
    });

    p2.then(function(loc) {
      expect(loc).toEqual([1,2]);
      cl.x("second promise");
    });
  }, 1000);

  it("set throws error on invalid key" ,function(done) {
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

  xit("set throws error on invalid location" ,function(done) {
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
