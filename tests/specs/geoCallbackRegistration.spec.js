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

      var onKeyMovedRegistration = gq.on("key_moved", function(key, location, distance) {
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

      var onKeyEnteredRegistration = gq.on("key_entered", function(key, location, distance) {
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

    it("\"key_exited\" registrations can be cancelled", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 exited"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var onKeyExitedRegistration = gq.on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
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
        onKeyExitedRegistration.cancel();
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

      var onKeyMovedRegistration1 = gq.on("key_moved", function(key, location, distance) {
        cl.x(key + " moved1");
      });
      var onKeyMovedRegistration2 = gq.on("key_moved", function(key, location, distance) {
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

      var onKeyEnteredRegistration1 = gq.on("key_entered", function(key, location, distance) {
        cl.x(key + " entered1");
      });
      var onKeyEnteredRegistration2 = gq.on("key_entered", function(key, location, distance) {
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

    it("Cancelling an \"key_exited\" registration does not cancel all \"key_exited\" callbacks", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 exited1", "loc1 exited2", "loc3 exited2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var onKeyExitedRegistration1 = gq.on("key_exited", function(key, location, distance) {
        cl.x(key + " exited1");
      });
      var onKeyExitedRegistration2 = gq.on("key_exited", function(key, location, distance) {
        cl.x(key + " exited2");
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
        onKeyExitedRegistration1.cancel();
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

      var onKeyExitedRegistration = gq.on("key_exited", function() {});

      expect(function() { onKeyExitedRegistration.cancel() }).not.toThrow();
      expect(function() { onKeyExitedRegistration.cancel() }).not.toThrow();
    });
  });
});