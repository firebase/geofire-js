"use strict";

var chai = require("chai");
var expect = chai.expect;
var GeoFire = require("../../dist/geofire.js");
var TH = require("../helpers.js");

chai.should();
chai.use(require('chai-as-promised'));

describe("GeoFire", function() {
  var geoFire;
  var firebaseRef;


  before(function() {
    firebaseRef = TH.getRandomFirebaseRef();
    geoFire = new GeoFire(firebaseRef);
  });


  afterEach(function(done) {
    firebaseRef.remove(done);
  });


  describe("Constructor", function() {
    it("Constructor throws errors given invalid Firebase references", function() {
      TH.invalidFirebaseRefs.forEach(function(invalidFirebaseRef) {
        expect(function() {
          new GeoFire(invalidFirebaseRef);
        }).to.throw();
      });
    });

    it("Constructor does not throw errors given valid Firebase references", function() {
      expect(function() {
        new GeoFire(firebaseRef);
      }).not.to.throw();
    });
  });


  describe("ref()", function() {
    it("returns the Firebase reference used to create a GeoFire instance", function() {
      expect(geoFire.ref()).to.equal(firebaseRef);
    });
  });


  describe("Adding a single location via set()", function() {
    it("returns a promise", function() {
      return geoFire.set("loc1", [0, 0]);
    });

    it("updates Firebase when adding new locations", function() {
      return geoFire.set("loc1", [0, 0]).then(function() {
        return geoFire.set("loc2", [50, 50]);
      }).then(function() {
        return geoFire.set("loc3", [-90, -90]);
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" },
          "loc2": { ".priority": "v0gs3y0zh7", "l": { "0": 50, "1": 50 }, "g": "v0gs3y0zh7" },
          "loc3": { ".priority": "1bpbpbpbpb", "l": { "0": -90, "1": -90 }, "g": "1bpbpbpbpb" }
        });
      });
    });

    it("handles decimal latitudes and longitudes", function() {
      return geoFire.set("loc1", [0.254, 0]).then(function() {
        return geoFire.set("loc2", [50, 50.293403]);
      }).then(function() {
        return geoFire.set("loc3", [-82.614, -90.938]);
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "ebpcrypzxv", "l": { "0": 0.254, "1": 0 }, "g": "ebpcrypzxv" },
          "loc2": { ".priority": "v0gu2qnx15", "l": { "0": 50, "1": 50.293403 }, "g": "v0gu2qnx15" },
          "loc3": { ".priority": "1cr648sfx4", "l": { "0": -82.614, "1": -90.938 }, "g": "1cr648sfx4" }
        });
      });
    });

    it("updates Firebase when changing a pre-existing key", function() {
      return geoFire.set("loc1", [0, 0]).then(function() {
        return geoFire.set("loc2", [50, 50]);
      }).then(function() {
        return geoFire.set("loc3", [-90, -90]);
      }).then(function() {
        return geoFire.set("loc1", [2, 3]);
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "s065kk0dc5", "l": { "0": 2, "1": 3 }, "g": "s065kk0dc5" },
          "loc2": { ".priority": "v0gs3y0zh7", "l": { "0": 50, "1": 50 }, "g": "v0gs3y0zh7" },
          "loc3": { ".priority": "1bpbpbpbpb", "l": { "0": -90, "1": -90 }, "g": "1bpbpbpbpb" }
        });
      });
    });

    it("updates Firebase when changing a pre-existing key to the same location", function() {
      return geoFire.set("loc1", [0, 0]).then(function() {
        return geoFire.set("loc2", [50, 50]);
      }).then(function() {
        return geoFire.set("loc3", [-90, -90]);
      }).then(function() {
        return geoFire.set("loc1", [0, 0]);
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" },
          "loc2": { ".priority": "v0gs3y0zh7", "l": { "0": 50, "1": 50 }, "g": "v0gs3y0zh7" },
          "loc3": { ".priority": "1bpbpbpbpb", "l": { "0": -90, "1": -90 }, "g": "1bpbpbpbpb" }
        });
      });
    });

    it("handles multiple keys at the same location", function() {
      return geoFire.set("loc1", [0, 0]).then(function() {
        return geoFire.set("loc2", [0, 0]);
      }).then(function() {
        return geoFire.set("loc3", [0, 0]);
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" },
          "loc2": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" },
          "loc3": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" }
        });
      });
    });

    it("updates Firebase after complex operations", function() {
      return geoFire.set("loc:1", [0, 0]).then(function() {
        return geoFire.set("loc2", [50, 50]);
      }).then(function() {
        return geoFire.set("loc%!A72f()3", [-90, -90]);
      }).then(function() {
        return geoFire.remove("loc2");
      }).then(function() {
        return geoFire.set("loc2", [0.2358, -72.621]);
      }).then(function() {
        return geoFire.set("loc4", [87.6, -130]);
      }).then(function() {
        return geoFire.set("loc5", [5, 55.555]);
      }).then(function() {
        return geoFire.set("loc5", null);
      }).then(function() {
        return geoFire.set("loc:1", [87.6, -130]);
      }).then(function() {
        return geoFire.set("loc6", [-72.258, 0.953215]);
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc:1": { ".priority": "cped3g0fur", "l": { "0": 87.6, "1": -130 }, "g": "cped3g0fur" },
          "loc2": { ".priority": "d2h376zj8h", "l": { "0": 0.2358, "1": -72.621 }, "g": "d2h376zj8h" },
          "loc%!A72f()3": { ".priority": "1bpbpbpbpb", "l": { "0": -90, "1": -90 }, "g": "1bpbpbpbpb" },
          "loc4": { ".priority": "cped3g0fur", "l": { "0": 87.6, "1": -130 }, "g": "cped3g0fur" },
          "loc6": { ".priority": "h50svty4es", "l": { "0": -72.258, "1": 0.953215 }, "g": "h50svty4es" }
        });
      });
    });

    it("does not throw errors given valid keys", function() {
      TH.validKeys.forEach(function(validKey) {
        expect(function() {
          geoFire.set(validKey, [0, 0]);
        }).not.to.throw();
      });
    });

    it("throws errors given invalid keys", function() {
      TH.invalidKeys.forEach(function(invalidKey) {
        expect(function() {
          geoFire.set(invalidKey, [0, 0]);
        }).to.throw();
      });
    });

    it("does not throw errors given valid locations", function() {
      TH.validLocations.forEach(function(validLocation, i) {
        expect(function() {
          geoFire.set("loc", validLocation);
        }).not.to.throw();
      });
    });

    it("throws errors given invalid locations", function() {
      TH.invalidLocations.forEach(function(invalidLocation, i) {
        // Setting location to null is valid since it will remove the key
        if (invalidLocation !== null) {
          expect(function() {
            geoFire.set("loc", invalidLocation);
          }).to.throw();
        }
      });
    });
  });


  describe("Adding multiple locations via set()", function() {
    it("returns a promise", function() {
      return geoFire.set({
        "loc1": [0, 0]
      });
    });

    it("updates Firebase when adding new locations", function() {
      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, 50],
        "loc3": [-90, -90]
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" },
          "loc2": { ".priority": "v0gs3y0zh7", "l": { "0": 50, "1": 50 }, "g": "v0gs3y0zh7" },
          "loc3": { ".priority": "1bpbpbpbpb", "l": { "0": -90, "1": -90 }, "g": "1bpbpbpbpb" }
        });
      });
    });

    it("handles decimal latitudes and longitudes", function() {
      return geoFire.set({
        "loc1": [0.254, 0],
        "loc2": [50, 50.293403],
        "loc3": [-82.614, -90.938]
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "ebpcrypzxv", "l": { "0": 0.254, "1": 0 }, "g": "ebpcrypzxv" },
          "loc2": { ".priority": "v0gu2qnx15", "l": { "0": 50, "1": 50.293403 }, "g": "v0gu2qnx15" },
          "loc3": { ".priority": "1cr648sfx4", "l": { "0": -82.614, "1": -90.938 }, "g": "1cr648sfx4" }
        });
      });
    });

    it("updates Firebase when changing a pre-existing key", function() {
      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, 50],
        "loc3": [-90, -90]
      }).then(function() {
        return geoFire.set({
          "loc1": [2, 3]
        });
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "s065kk0dc5", "l": { "0": 2, "1": 3 }, "g": "s065kk0dc5" },
          "loc2": { ".priority": "v0gs3y0zh7", "l": { "0": 50, "1": 50 }, "g": "v0gs3y0zh7" },
          "loc3": { ".priority": "1bpbpbpbpb", "l": { "0": -90, "1": -90 }, "g": "1bpbpbpbpb" }
        });
      });
    });

    it("updates Firebase when changing a pre-existing key to the same location", function() {
      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, 50],
        "loc3": [-90, -90]
      }).then(function() {
        return geoFire.set({
          "loc1": [0, 0]
        });
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" },
          "loc2": { ".priority": "v0gs3y0zh7", "l": { "0": 50, "1": 50 }, "g": "v0gs3y0zh7" },
          "loc3": { ".priority": "1bpbpbpbpb", "l": { "0": -90, "1": -90 }, "g": "1bpbpbpbpb" }
        });
      });
    });

    it("handles multiple keys at the same location", function() {
      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [0, 0],
        "loc3": [0, 0]
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" },
          "loc2": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" },
          "loc3": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" }
        });
      });
    });

    it("updates Firebase after complex operations", function() {
      return geoFire.set({
        "loc:1": [0, 0],
        "loc2": [50, 50],
        "loc%!A72f()3": [-90, -90]
      }).then(function() {
        return geoFire.remove("loc2");
      }).then(function() {
        return geoFire.set({
          "loc2": [0.2358, -72.621],
          "loc4": [87.6, -130],
          "loc5": [5, 55.555]
        });
      }).then(function() {
        return geoFire.set({
          "loc5": null
        });
      }).then(function() {
        return geoFire.set({
          "loc:1": [87.6, -130],
          "loc6": [-72.258, 0.953215]
        });
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc:1": { ".priority": "cped3g0fur", "l": { "0": 87.6, "1": -130 }, "g": "cped3g0fur" },
          "loc2": { ".priority": "d2h376zj8h", "l": { "0": 0.2358, "1": -72.621 }, "g": "d2h376zj8h" },
          "loc%!A72f()3": { ".priority": "1bpbpbpbpb", "l": { "0": -90, "1": -90 }, "g": "1bpbpbpbpb" },
          "loc4": { ".priority": "cped3g0fur", "l": { "0": 87.6, "1": -130 }, "g": "cped3g0fur" },
          "loc6": { ".priority": "h50svty4es", "l": { "0": -72.258, "1": 0.953215 }, "g": "h50svty4es" }
        });
      });
    });

    it("does not throw errors given valid keys", function() {
      TH.validKeys.forEach(function(validKey) {
        expect(function() {
          var locations = {};
          locations[validKey] = [0, 0];
          geoFire.set(locations);
        }).not.to.throw();
      });
    });

    it("throws errors given invalid keys", function() {
      TH.invalidKeys.forEach(function(invalidKey) {
        if (invalidKey !== null && invalidKey !== undefined && typeof invalidKey !== "boolean") {
          expect(function() {
              var locations = {};
              locations[invalidKey] = [0, 0];
              geoFire.set(locations);
          }).to.throw();
        }
      });
    });

    it("throws errors given a location argument in combination with an object", function() {
      expect(function() {
        geoFire.set({
          "loc": [0, 0]
        }, [0, 0]);
      }).to.throw();
    });

    it("does not throw errors given valid locations", function() {
      TH.validLocations.forEach(function(validLocation, i) {
        expect(function() {
          geoFire.set({
            "loc": validLocation
          });
        }).not.to.throw();
      });
    });

    it("throws errors given invalid locations", function() {
      TH.invalidLocations.forEach(function(invalidLocation, i) {
        // Setting location to null is valid since it will remove the key
        if (invalidLocation !== null) {
          expect(function() {
            geoFire.set({
              "loc": invalidLocation
            });
          }).to.throw();
        }
      });
    });
  });


  describe("Retrieving locations", function() {
    it("returns a promise", function() {
      return geoFire.get("loc1");
    });

    it("returns null for non-existent keys", function() {
      return geoFire.get("loc1")
        .should.eventually.be.null;
    });

    it("retrieves locations given existing keys", function() {
      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, 50],
        "loc3": [-90, -90]
      }).then(function() {
        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).to.deep.equal([0, 0]);
        return geoFire.get("loc2");
      }).then(function(location) {
        expect(location).to.deep.equal([50, 50]);
        return geoFire.get("loc3");
      }).then(function(location) {
        expect(location).to.deep.equal([-90, -90]);
      });
    });

    it("does not throw errors given valid keys", function() {
      TH.validKeys.forEach(function(validKey) {
        expect(function() { geoFire.get(validKey); }).not.to.throw();
      });
    });

    it("throws errors given invalid keys", function() {
      TH.invalidKeys.forEach(function(invalidKey) {
        expect(function() { geoFire.get(invalidKey); }).to.throw();
      });
    });
  });


  describe("Removing locations", function() {
    it("removes existing location given null", function() {
      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [2, 3]
      }).then(function() {
        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).to.deep.equal([0, 0]);
        return geoFire.set("loc1", null);
      }).then(function() {
        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).to.be.null;
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc2": { ".priority": "s065kk0dc5", "l": { "0": 2, "1": 3 }, "g": "s065kk0dc5" }
        });
      });
    });

    it("does nothing given a non-existent location and null", function() {
      return geoFire.set("loc1", [0, 0]).then(function() {
        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).to.deep.equal([0, 0]);
        return geoFire.set("loc2", null);
      }).then(function() {
        return geoFire.get("loc2");
      }).then(function(location) {
        expect(location).to.be.null;
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" }
        });
      });
    });

    it("removes existing location given null", function() {
      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [2, 3]
      }).then(function() {
        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).to.deep.equal([0, 0]);
        return geoFire.set({
          "loc1": null,
          "loc3": [-90, -90]
        });
      }).then(function() {
        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).to.be.null;
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc2": { ".priority": "s065kk0dc5", "l": { "0": 2, "1": 3 }, "g": "s065kk0dc5" },
          "loc3": { ".priority": "1bpbpbpbpb", "l": { "0": -90, "1": -90 }, "g": "1bpbpbpbpb" }
        });
      });
    });

    it("does nothing given a non-existent location and null", function() {
      return geoFire.set({
        "loc1": [0, 0],
        "loc2": null
      }).then(function() {
        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).to.deep.equal([0, 0]);
        return geoFire.get("loc2");
      }).then(function(location) {
        expect(location).to.be.null;
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" }
        });
      });
    });

    it("removes existing location", function() {
      return geoFire.set({
        "loc:^%*1": [0, 0],
        "loc2": [2, 3]
      }).then(function() {
        return geoFire.get("loc:^%*1");
      }).then(function(location) {
        expect(location).to.deep.equal([0, 0]);
        return geoFire.remove("loc:^%*1");
      }).then(function() {
        return geoFire.get("loc:^%*1");
      }).then(function(location) {
        expect(location).to.be.null;
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc2": { ".priority": "s065kk0dc5", "l": { "0": 2, "1": 3 }, "g": "s065kk0dc5" }
        });
      });
    });

    it("does nothing given a non-existent location", function() {
      return geoFire.set("loc1", [0, 0]).then(function() {
        return geoFire.get("loc1");
      }).then(function(location) {
        expect(location).to.deep.equal([0, 0]);
        return geoFire.remove("loc2");
      }).then(function() {
        return geoFire.get("loc2");
      }).then(function(location) {
        expect(location).to.be.null;
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc1": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" }
        });
      });
    });

    it("only removes one key if multiple keys are at the same location", function() {
      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [2, 3],
        "loc3": [0, 0]
      }).then(function() {
        return geoFire.remove("loc1");
      }).then(function() {
        return TH.getFirebaseData(geoFire);
      }).then(function(firebaseData) {
        expect(firebaseData).to.deep.equal({
          "loc2": { ".priority": "s065kk0dc5", "l": { "0": 2, "1": 3 }, "g": "s065kk0dc5" },
          "loc3": { ".priority": "7zzzzzzzzz", "l": { "0": 0, "1": 0 }, "g": "7zzzzzzzzz" }
        });
      });
    });

    it("does not throw errors given valid keys", function() {
      TH.validKeys.forEach(function(validKey) {
        expect(function() { geoFire.remove(validKey); }).not.to.throw();
      });
    });

    it("throws errors given invalid keys", function() {
      TH.invalidKeys.forEach(function(invalidKey) {
        expect(function() { geoFire.remove(invalidKey); }).to.throw();
      });
    });
  });


  describe("query()", function() {
    it("does not throw errors given valid query criteria", function() {
      TH.validQueryCriterias.forEach(function(validQueryCriteria) {
        if (typeof validQueryCriteria.center !== "undefined" && typeof validQueryCriteria.radius !== "undefined") {
          expect(function() { geoFire.query(validQueryCriteria); }).not.to.throw();
        }
      });
    });

    it("throws errors given invalid query criteria", function() {
      TH.invalidQueryCriterias.forEach(function(invalidQueryCriteria) {
        expect(function() { geoFire.query(invalidQueryCriteria); }).to.throw();
      });
    });
  });
});
