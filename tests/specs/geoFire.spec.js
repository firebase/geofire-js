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