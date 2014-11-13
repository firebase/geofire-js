describe("GeoCallbackRegistration Tests:", function() {
  // Reset the Firebase before each test
  beforeEach(function(done) {
    beforeEachHelper(done);
  });

  afterEach(function(done) {
    afterEachHelper(done);
  });

  describe("Constructor:", function() {
    it("Constructor throws error given non-function", function() {
      var createCallbackRegistration = function() {
        GeoCallbackRegistration("nonFunction");
      }

      expect(createCallbackRegistration).toThrow();
    });
  });

  describe("Cancelling event callbacks:", function() {
    it("\"key_moved\" registrations can be cancelled", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 moved"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      var onKeyMovedRegistration = geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set("loc1", [2, 2]);
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        onKeyMovedRegistration.cancel();
        cl.x("p3");

        return geoFire.set("loc3", [1, 2]);
      }).then(function() {
        cl.x("p4");

        return wait(100);
      }).then(function() {
        cl.x("p5");
      }).catch(failTestOnCaughtError);;
    });

    it("\"key_entered\" registrations can be cancelled", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "loc1 entered"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      var onKeyEnteredRegistration = geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [80, 80]
      }).then(function() {
        cl.x("p1");

        return wait(100);
      }).then(function() {
        onKeyEnteredRegistration.cancel();
        cl.x("p2");

        return geoFire.set("loc3", [1, 2]);
      }).then(function() {
        cl.x("p3");

        return wait(100);
      }).then(function() {
        cl.x("p4");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_exited\" registrations can be cancelled", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 exited"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      var onKeyExitedRegistration = geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set("loc1", [80, 80]);
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        onKeyExitedRegistration.cancel();
        cl.x("p3");

        return geoFire.set("loc3", [-80, -80]);
      }).then(function() {
        cl.x("p4");

        return wait(100);
      }).then(function() {
        cl.x("p5");
      }).catch(failTestOnCaughtError);
    });

    it("Cancelling a \"key_moved\" registration does not cancel all \"key_moved\" callbacks", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 moved1", "loc1 moved2", "loc3 moved2"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      var onKeyMovedRegistration1 = geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved1");
      });
      var onKeyMovedRegistration2 = geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved2");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set("loc1", [2, 2]);
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        onKeyMovedRegistration1.cancel();
        cl.x("p3");

        return geoFire.set("loc3", [1, 2]);
      }).then(function() {
        cl.x("p4");

        return wait(100);
      }).then(function() {
        cl.x("p5");
      }).catch(failTestOnCaughtError);
    });

    it("Cancelling a \"key_entered\" registration does not cancel all \"key_entered\" callbacks", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "loc1 entered1", "loc1 entered2", "loc3 entered2"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      var onKeyEnteredRegistration1 = geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered1");
      });
      var onKeyEnteredRegistration2 = geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered2");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [80, 80]
      }).then(function() {
        cl.x("p1");

        return wait(100);
      }).then(function() {
        onKeyEnteredRegistration1.cancel();
        cl.x("p2");

        return geoFire.set("loc3", [1, 2]);
      }).then(function() {
        cl.x("p3");

        return wait(100);
      }).then(function() {
        cl.x("p4");
      }).catch(failTestOnCaughtError);
    });

    it("Cancelling a \"key_exited\" registration does not cancel all \"key_exited\" callbacks", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 exited1", "loc1 exited2", "loc3 exited2"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      var onKeyExitedRegistration1 = geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited1");
      });
      var onKeyExitedRegistration2 = geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited2");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set("loc1", [80, 80]);
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        onKeyExitedRegistration1.cancel();
        cl.x("p3");

        return geoFire.set("loc3", [-80, -80]);
      }).then(function() {
        cl.x("p4");

        return wait(100);
      }).then(function() {
        cl.x("p5");
      }).catch(failTestOnCaughtError);
    });

    it("Calling cancel on a GeoCallbackRegistration twice does not throw", function() {
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      var onKeyExitedRegistration = geoQueries[0].on("key_exited", function() {});

      expect(function() { onKeyExitedRegistration.cancel() }).not.toThrow();
      expect(function() { onKeyExitedRegistration.cancel() }).not.toThrow();
    });
  });
});
