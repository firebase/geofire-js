describe("GeoFire Tests:", function() {
  // Reset the Firebase before each test
  beforeEach(function(done) {
    beforeEachHelper(done);
  });

  afterEach(function(done) {
    afterEachHelper(done);
  });

  describe("Constructor:", function() {
    it("Constructor throws errors given invalid Firebase references", function() {
      invalidFirebaseRefs.forEach(function(invalidFirebaseRef) {
        expect(function() { new GeoFire(invalidFirebaseRef); }).toThrow();
      });
    });

    it("Constructor does not throw errors given valid Firebase references", function() {
      expect(function() { new GeoFire(firebaseRef); }).not.toThrow();
    });
  });

  describe("ref():", function() {
    it("ref() returns the Firebase reference used to create a GeoFire instance", function() {
      expect(geoFire.ref()).toBe(firebaseRef);
    });
  });

  describe("Adding locations:", function() {
    it("set() returns a promise", function(done) {

      var cl = new Checklist(["p1"], expect, done);

      geoFire.set("loc1", [0, 0]).then(function() {
        cl.x("p1");
      }).catch(failTestOnCaughtError);
    });

    it("set() can add optional data to index", function(done) {
      var cl = new Checklist(["p1","p2"], expect, done);
      batchSetWithData([
        {key: "loc1", location: [0,0], data: {'name': 'Test 1'}},
        {key: "loc2", location: [50,50], data: {'name': 'Test 2'}}
      ]).then(function() {
        cl.x("p1");
        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "loc1": { "l": [0, 0], "g": "7zzzzzzzzz", "d": {'name': 'Test 1'}},
          "loc2": { "l": [50, 50], "g": "v0gs3y0zh7", "d": {'name': 'Test 2'} }
        });
        cl.x("p2");
      }).catch(failTestOnCaughtError);
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
          "loc1": { "l": [0, 0], "g": "7zzzzzzzzz" },
          "loc2": { "l": [50, 50], "g": "v0gs3y0zh7" },
          "loc3": { "l": [-90, -90], "g": "1bpbpbpbpb" }
        });

        cl.x("p2");
      }).catch(failTestOnCaughtError);
    });

    it("set() handles decimal latitudes and longitudes", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      batchSet([
        {key: "loc1", location: [0.254, 0]},
        {key: "loc2", location: [50, 50.293403]},
        {key: "loc3", location: [-82.614, -90.938]}
      ]).then(function() {
        cl.x("p1");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "loc1": { "l": [0.254, 0], "g": "ebpcrypzxv" },
          "loc2": { "l": [50, 50.293403], "g": "v0gu2qnx15" },
          "loc3": { "l": [-82.614, -90.938], "g": "1cr648sfx4" }
        });

        cl.x("p2");
      }).catch(failTestOnCaughtError);
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
          "loc1": { "l": [2, 3], "g": "s065kk0dc5" },
          "loc2": { "l": [50, 50], "g": "v0gs3y0zh7" },
          "loc3": { "l": [-90, -90], "g": "1bpbpbpbpb" }
        });

        cl.x("p3");
      }).catch(failTestOnCaughtError);
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
          "loc1": { "l": [0, 0], "g": "7zzzzzzzzz" },
          "loc2": { "l": [50, 50], "g": "v0gs3y0zh7" },
          "loc3": { "l": [-90, -90], "g": "1bpbpbpbpb" }
        });

        cl.x("p3");
      }).catch(failTestOnCaughtError);
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
          "loc1": { "l": [0, 0], "g": "7zzzzzzzzz" },
          "loc2": { "l": [0, 0], "g": "7zzzzzzzzz" },
          "loc3": { "l": [0, 0], "g": "7zzzzzzzzz" }
        });

        cl.x("p2");
      }).catch(failTestOnCaughtError);
    });

    it("set() updates Firebase after complex operations", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "p6"], expect, done);

      batchSet([
        {key: "loc:1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc%!A72f()3", location: [-90, -90]}
      ]).then(function() {
        cl.x("p1");

        return geoFire.remove("loc2");
      }).then(function() {
        cl.x("p2");

        return batchSet([
          {key: "loc2", location: [0.2358, -72.621]},
          {key: "loc4", location: [87.6, -130]},
          {key: "loc5", location: [5, 55.555]}
        ]);
      }).then(function() {
        cl.x("p3");

        return geoFire.set("loc5", null);
      }).then(function() {
        cl.x("p4");

        return batchSet([
          {key: "loc:1", location: [87.6, -130]},
          {key: "loc6", location: [-72.258, 0.953215]}
        ]);
      }).then(function() {
        cl.x("p5");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "loc:1": { "l": [87.6, -130], "g": "cped3g0fur" },
          "loc2": { "l": [0.2358, -72.621], "g": "d2h376zj8h" },
          "loc%!A72f()3": { "l": [-90, -90], "g": "1bpbpbpbpb" },
          "loc4": { "l": [87.6, -130], "g": "cped3g0fur" },
          "loc6": { "l": [-72.258, 0.953215], "g": "h50svty4es" }
        });

        cl.x("p6");
      }).catch(failTestOnCaughtError);
    });

    it("set() does not throw errors given valid keys", function() {
      validKeys.forEach(function(validKey) {
        expect(function() { geoFire.set(validKey, [0, 0]); }).not.toThrow();
      });
    });

    it("set() throws errors given invalid keys", function() {
      invalidKeys.forEach(function(invalidKey) {
        expect(function() { geoFire.set(invalidKey, [0, 0]); }).toThrow();
      });
    });

    it("set() does not throw errors given valid locations", function() {
      validLocations.forEach(function(validLocation, i) {
        expect(function() { geoFire.set("loc" + i, validLocation); }).not.toThrow();
      });
    });

    it("set() throws errors given invalid locations", function() {
      invalidLocations.forEach(function(invalidLocation, i) {
        // Setting location to null is valid since it will remove the key
        if (invalidLocation !== null) {
          expect(function() { geoFire.set("loc" + i, invalidLocation); }).toThrow();
        }
      });
    });
  });

  describe("Retrieving locations:", function() {
    it("get() returns a promise", function(done) {
      var cl = new Checklist(["p1"], expect, done);

      geoFire.get("loc1").then(function() {
        cl.x("p1");
      }).catch(failTestOnCaughtError);
    });

    it("get() returns null for non-existent keys", function(done) {
      var cl = new Checklist(["p1"], expect, done);

      geoFire.get("loc1").then(function(location) {
        expect(location).toBeNull();

        cl.x("p1");
      }).catch(failTestOnCaughtError);
    });

    it("get() retrieves locations given existing keys", function(done) {
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
      }).catch(failTestOnCaughtError);
    });

    it("get() does not throw errors given valid keys", function() {
      validKeys.forEach(function(validKey) {
        expect(function() { geoFire.get(validKey); }).not.toThrow();
      });
    });

    it("get() throws errors given invalid keys", function() {
      invalidKeys.forEach(function(invalidKey) {
        expect(function() { geoFire.get(invalidKey); }).toThrow();
      });
    });
  });

  describe("Retrieving full data:", function() {
    it("getWithData() returns a promise", function(done) {
      var cl = new Checklist(["p1"], expect, done);

      geoFire.getWithData("loc1").then(function() {
        cl.x("p1");
      }).catch(failTestOnCaughtError);
    });

    it("getWithData() returns null for non-existent keys", function(done) {
      var cl = new Checklist(["p1"], expect, done);

      geoFire.getWithData("loc1").then(function(location) {
        expect(location).toBeNull();

        cl.x("p1");
      }).catch(failTestOnCaughtError);
    });

    it("getWithData() retrieves key, location, and data given existing keys", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4"], expect, done);

      batchSetWithData([
        {key: "loc1", location: [0, 0], data: {name: 'Test 1'}},
        {key: "loc2", location: [50, 50], data: {name: 'Test 2'}},
        {key: "loc3", location: [-90, -90], data: {name: 'Test 3'}}
      ]).then(function() {
        cl.x("p1");
        return geoFire.getWithData("loc1");
      }).then(function(data) {
        expect(data).toEqual({'key': "loc1", 'location': [0, 0], 'data': {'name': 'Test 1'}});
        cl.x("p2");

        return geoFire.getWithData("loc2");
      }).then(function(data) {
        expect(data).toEqual({'key': "loc2", 'location': [50, 50], 'data': {'name': 'Test 2'}});
        cl.x("p3");

        return geoFire.getWithData("loc3");
      }).then(function(data) {
        expect(data).toEqual({'key': "loc3", 'location': [-90, -90], 'data': {'name': 'Test 3'}});
        cl.x("p4");
      }).catch(failTestOnCaughtError);
    });

    it("getWithData() does not throw errors given valid keys", function() {
      validKeys.forEach(function(validKey) {
        expect(function() { geoFire.getWithData(validKey); }).not.toThrow();
      });
    });

    it("getWithData() throws errors given invalid keys", function() {
      invalidKeys.forEach(function(invalidKey) {
        expect(function() { geoFire.getWithData(invalidKey); }).toThrow();
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
          "loc2": { "l": [2, 3], "g": "s065kk0dc5" }
        });

        cl.x("p5");
      }).catch(failTestOnCaughtError);
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
          "loc1": { "l": [0, 0], "g": "7zzzzzzzzz" }
        });

        cl.x("p5");
      }).catch(failTestOnCaughtError);
    });

    it("remove() removes existing location", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5"], expect, done);

      batchSet([
        {key: "loc:^%*1", location: [0, 0]},
        {key: "loc2", location: [2, 3]}
      ]).then(function() {
        cl.x("p1");

        return geoFire.get("loc:^%*1");
      }).then(function(location) {
        expect(location).toEqual([0, 0]);

        cl.x("p2");

        return geoFire.remove("loc:^%*1");
      }).then(function() {
        cl.x("p3");

        return geoFire.get("loc:^%*1");
      }).then(function(location) {
        expect(location).toBeNull();

        cl.x("p4");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "loc2": { "l": [2, 3], "g": "s065kk0dc5" }
        });

        cl.x("p5");
      }).catch(failTestOnCaughtError);
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
          "loc1": { "l": [0, 0], "g": "7zzzzzzzzz" }
        });

        cl.x("p5");
      }).catch(failTestOnCaughtError);
    });

    it("remove() only removes one key if multiple keys are at the same location", function(done) {
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      batchSet([
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [2, 3]},
        {key: "loc3", location: [0, 0]}
      ]).then(function() {
        cl.x("p1");

        return geoFire.remove("loc1");
      }).then(function() {
        cl.x("p2");

        return getFirebaseData();
      }).then(function(firebaseData) {
        expect(firebaseData).toEqual({
          "loc2": { "l": [2, 3], "g": "s065kk0dc5" },
          "loc3": { "l": [0, 0], "g": "7zzzzzzzzz" }
        });

        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("remove() does not throw errors given valid keys", function() {
      validKeys.forEach(function(validKey) {
        expect(function() { geoFire.remove(validKey); }).not.toThrow();
      });
    });

    it("remove() throws errors given invalid keys", function() {
      invalidKeys.forEach(function(invalidKey) {
        expect(function() { geoFire.remove(invalidKey); }).toThrow();
      });
    });
  });

  describe("query():", function() {
    it("query() returns GeoQuery instance", function() {
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      expect(geoQueries[0] instanceof GeoQuery).toBeTruthy();
    });

    it("query() does not throw errors given valid query criteria", function() {
      validQueryCriterias.forEach(function(validQueryCriteria) {
        if (typeof validQueryCriteria.center !== "undefined" && typeof validQueryCriteria.radius !== "undefined") {
          expect(function() { geoFire.query(validQueryCriteria); }).not.toThrow();
        }
      });
    });

    it("query() throws errors given invalid query criteria", function() {
      invalidQueryCriterias.forEach(function(invalidQueryCriteria) {
        expect(function() { geoFire.query(invalidQueryCriteria); }).toThrow();
      });
    });
  });
});
