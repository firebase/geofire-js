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
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [-90, -90]}
      ]).then(function() {
        cl.x("p1");

        return geoFire.set("loc1", [2, 3]);
      }).then(function() {
        cl.x("p2");

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

        cl.x("p3");
      });
    });

    it("set() updates Firebase when changing a pre-existing key to the same location", function(done) {
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [-90, -90]}
      ]).then(function() {
        cl.x("p1");

        return geoFire.set("loc1", [0, 0]);
      }).then(function() {
        cl.x("p2");

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

        cl.x("p3");
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

    it("set() does not throw errors given valid keys", function() {
      var validKeys = ["a", "loc1", "(e@Xi4t>*E2)hc<5oa1s/6{B0d?u", Array(743).join("a")];

      validKeys.forEach(function(validKey) {
        expect(function() { geoFire.set(validKey, [0, 0]).catch(function(error) { console.log(error) }); }).not.toThrow();
      });
    });

    it("set() throws errors given invalid keys", function() {
      var invalidKeys = ["", 1, true, [1, 2], {a: 1}, null, undefined, "loc.1", "loc$1", "[loc1", "loc1]", "loc#1", "a#i]$da[s", Array(744).join("a")];

      invalidKeys.forEach(function(invalidKey) {
        expect(function() { geoFire.set(invalidKey, [0, 0]); }).toThrow();
      });
    });

    it("set() does not throw errors given valid locations", function() {
      var validLocations = [[0, 0], [-90, 180], [90, -180], [23, 74], [47.235124363, 127.2379654226]];

      validLocations.forEach(function(validLocation, i) {
        expect(function() { geoFire.set("loc" + i, validLocation); }).not.toThrow();
      });
    });

    it("set() throws errors given invalid locations", function() {
      var invalidLocations = [[-91, 0], [91, 0], [0, 181], [0, -181], [[0, 0], 0], [0, [0, 0]], ["a", 0], [0, "a"], ["a", "a"], [null, 0], [0, null], [null, null], [undefined, 0], [0, undefined], [undefined, undefined]];

      invalidLocations.forEach(function(invalidLocation, i) {
        expect(function() { geoFire.set("loc" + i, invalidLocation); }).toThrow();
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

    it("get() does not throw errors given valid keys", function() {
      var validKeys = ["a", "loc1", "(e@Xi4t>*E2)hc<5oa1s/6{B0d?u", Array(743).join("a")];

      validKeys.forEach(function(validKey) {
        expect(function() { geoFire.get(validKey); }).not.toThrow();
      });
    });

    it("get() throws errors given invalid keys", function() {
      var invalidKeys = ["", 1, true, [1, 2], {a: 1}, null, undefined, "loc.1", "loc$1", "[loc1", "loc1]", "loc#1", "a#i]$da[s", Array(744).join("a")];

      invalidKeys.forEach(function(invalidKey) {
        expect(function() { geoFire.get(invalidKey); }).toThrow();
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