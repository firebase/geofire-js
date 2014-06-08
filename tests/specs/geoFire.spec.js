describe("GeoFire Tests:", function() {
  // Reset the Firebase before each test
  beforeEach(function(done) {
    beforeEachHelper(done);
  });

  afterEach(function(done) {
    afterEachHelper(done);
  });

  describe("Adding locations:", function() {
    it("set() returns a promise", function(done) {
      console.log("!!!!!  GeoFire Tests  !!!!!");

      var cl = new Checklist(["p1"], expect, done);

      geoFire.set("loc1", [0, 0]).then(function() {
        cl.x("p1");
      });
    });

    it("set() updates Firebase when adding new locations", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [-90, -90]}
      ]).then(function() {
        cl.x("p1");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          i: {
            "7zzzzzzzzzzzloc1": true,
            "v0gs3y0zh7w1loc2": true,
            "1bpbpbpbpbpbloc3": true
          },
          l: {
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

      batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [-90, -90]}
      ]).then(function() {
        cl.x("p1");

        return geoFire.get("loc1");
      }).then(function(location) {
        cl.x("p2");

        return geoFire.set("loc1", [2, 3]);
      }).then(function() {
        cl.x("p3");

        return geoFire.get("loc1");
      }).then(function(location) {
        cl.x("p4");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          i: {
            "s065kk0dc540loc1": true,
            "v0gs3y0zh7w1loc2": true,
            "1bpbpbpbpbpbloc3": true
          },
          l: {
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

      batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [0, 0]},
        {key: "loc3", location: [0, 0]}
      ]).then(function() {
        cl.x("p1");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          i: {
            "7zzzzzzzzzzzloc1": true,
            "7zzzzzzzzzzzloc2": true,
            "7zzzzzzzzzzzloc3": true
          },
          l: {
            "loc1": "0,0",
            "loc2": "0,0",
            "loc3": "0,0"
          }
        });

        cl.x("p2");
      });
    });

    it("set() throws errors on invalid keys" ,function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "p6"], expect, done);

      var promises = {
        "p1": geoFire.set(1, [0, 0]),
        "p2": geoFire.set(true, [0, 0]),
        "p3": geoFire.set([0, 0], [0, 0]),
        "p4": geoFire.set({"a": 1}, [0, 0]),
        "p5": geoFire.set(null, [[0, 0], 0]),
        "p6": geoFire.set(undefined, [0, [0, 0]])
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

      var promises = {
        "p1": geoFire.set("loc1", [-91, 0]),
        "p2": geoFire.set("loc2", [91, 0]),
        "p3": geoFire.set("loc3", [0, 181]),
        "p4": geoFire.set("loc4", [0, -181]),
        "p5": geoFire.set("loc5", [[0, 0], 0]),
        "p6": geoFire.set("loc6", [0, [0, 0]]),
        "p7": geoFire.set("loc7", ["text", 0]),
        "p8": geoFire.set("loc8", [0, "text"]),
        "p9": geoFire.set("loc9", ["text", "text"]),
        "p10": geoFire.set("loc10", [null, 0]),
        "p11": geoFire.set("loc11", [0, null]),
        "p12": geoFire.set("loc12", [null, null]),
        "p13": geoFire.set("loc13", [undefined, 0]),
        "p14": geoFire.set("loc14", [0, undefined]),
        "p15": geoFire.set("loc15", [undefined, undefined])
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

      geoFire.get("loc1").then(function() {
        cl.x("p1");
      });
    });

    it("get() returns null for non-existent keys", function(done) {
      var cl = new Checklist(["p1"], expect, done);

      geoFire.get("loc1").then(function(location) {
        expect(location).toBeNull();

        cl.x("p1");
      });
    });

    it("get() retrieves locations given valid keys", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4"], expect, done);

      batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [-90, -90]}
      ]).then(function() {
        cl.x("p1");

        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).toEqual([0, 0]);
        cl.x("p2");

        return geoFire.get("loc2");
      }).then(function(location) {
        expect(location).toEqual([50, 50]);
        cl.x("p3");

        return geoFire.get("loc3");
      }).then(function(location) {
        expect(location).toEqual([-90, -90]);
        cl.x("p4");
      });
    });

    it("get() throws errors on invalid keys" ,function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "p6"], expect, done);

      var promises = {
        "p1": geoFire.get(1),
        "p2": geoFire.get(true),
        "p3": geoFire.get([1, 2]),
        "p4": geoFire.get({"a": 1}),
        "p5": geoFire.get(null),
        "p6": geoFire.get(undefined)
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

      batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [2, 3]}
      ]).then(function() {
        cl.x("p1");

        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).toEqual([0, 0]);

        cl.x("p2");

        return geoFire.set("loc1", null);
      }).then(function() {
        cl.x("p3");

        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).toBeNull();

        cl.x("p4");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          i: {
            "s065kk0dc540loc2": true
          },
          l: {
            "loc2": "2,3"
          }
        });

        cl.x("p5");
      });
    });

    it("set() does nothing given a non-existent location and null", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      geoFire.set("loc1", [0, 0]).then(function() {
        cl.x("p1");

        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).toEqual([0, 0]);

        cl.x("p2");

        return geoFire.set("loc2", null);
      }).then(function() {
        cl.x("p3");

        return geoFire.get("loc2");
      }).then(function(location) {
        expect(location).toBeNull();

        cl.x("p4");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          i: {
            "7zzzzzzzzzzzloc1": true
          },
          l: {
            "loc1": "0,0"
          }
        });

        cl.x("p5");
      });
    });

    it("remove() removes existing location", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [2, 3]}
      ]).then(function() {
        cl.x("p1");

        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).toEqual([0, 0]);

        cl.x("p2");

        return geoFire.remove("loc1");
      }).then(function() {
        cl.x("p3");

        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).toBeNull();

        cl.x("p4");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          i: {
            "s065kk0dc540loc2": true
          },
          l: {
            "loc2": "2,3"
          }
        });

        cl.x("p5");
      });
    });

    it("remove() does nothing given a non-existent location", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      geoFire.set("loc1", [0, 0]).then(function() {
        cl.x("p1");

        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).toEqual([0, 0]);

        cl.x("p2");

        return geoFire.remove("loc2");
      }).then(function() {
        cl.x("p3");

        return geoFire.get("loc2");
      }).then(function(location) {
        expect(location).toBeNull();

        cl.x("p4");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          i: {
            "7zzzzzzzzzzzloc1": true
          },
          l: {
            "loc1": "0,0"
          }
        });

        cl.x("p5");
      });
    });
  });

  describe("query():", function() {
    it("query() returns GeoQuery instance", function() {
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      expect(geoQueries[0] instanceof GeoQuery).toBeTruthy();
    });
  });
});