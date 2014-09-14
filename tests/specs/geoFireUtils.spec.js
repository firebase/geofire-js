describe("geoFireUtils Tests:", function() {
  describe("Parameter validation:", function() {
    it("validateKey() does not throw errors given valid keys", function() {
      validKeys.forEach(function(validKey) {
        expect(function() { validateKey(validKey); }).not.toThrow();
      });
    });

    it("validateKey() throws errors given invalid keys", function() {
      invalidKeys.forEach(function(invalidKey) {
        expect(function() { validateKey(invalidKey); }).toThrow();
      });
    });

    it("validateLocation() does not throw errors given valid locations", function() {
      validLocations.forEach(function(validLocation, i) {
        expect(function() { validateLocation(validLocation); }).not.toThrow();
      });
    });

    it("validateLocation() throws errors given invalid locations", function() {
      invalidLocations.forEach(function(invalidLocation, i) {
        expect(function() { validateLocation(invalidLocation); }).toThrow();
      });
    });

    it("validateGeohash() does not throw errors given valid geohashes", function() {
      validGeohashes.forEach(function(validGeohash, i) {
        expect(function() { validateGeohash(validGeohash); }).not.toThrow();
      });
    });

    it("validateGeohash() throws errors given invalid geohashes", function() {
      invalidGeohashes.forEach(function(invalidGeohash, i) {
        expect(function() { validateGeohash(invalidGeohash); }).toThrow();
      });
    });

    it("validateCriteria(criteria, true) does not throw errors given valid query criteria", function() {
      validQueryCriterias.forEach(function(validQueryCriteria) {
        if (typeof validQueryCriteria.center !== "undefined" && typeof validQueryCriteria.radius !== "undefined") {
          expect(function() { validateCriteria(validQueryCriteria, true); }).not.toThrow();
        }
      });
    });

    it("validateCriteria(criteria) does not throw errors given valid query criteria", function() {
      validQueryCriterias.forEach(function(validQueryCriteria) {
        expect(function() { validateCriteria(validQueryCriteria); }).not.toThrow();
      });
    });

    it("validateCriteria(criteria, true) throws errors given invalid query criteria", function() {
      invalidQueryCriterias.forEach(function(invalidQueryCriteria) {
        expect(function() { validateCriteria(invalidQueryCriteria, true); }).toThrow();
      });
      expect(function() { validateCriteria({center: [0, 0]}, true); }).toThrow();
      expect(function() { validateCriteria({radius: 1000}, true); }).toThrow();
    });

    it("validateCriteria(criteria) throws errors given invalid query criteria", function() {
      invalidQueryCriterias.forEach(function(invalidQueryCriteria) {
        expect(function() { validateCriteria(invalidQueryCriteria); }).toThrow();
      });
    });
  });

  describe("Distance calculations:", function() {
    it("degreesToRadians() converts degrees to radians", function() {
      expect(degreesToRadians(0)).toBeCloseTo(0);
      expect(degreesToRadians(45)).toBeCloseTo(0.7854, 4);
      expect(degreesToRadians(90)).toBeCloseTo(1.5708, 4);
      expect(degreesToRadians(135)).toBeCloseTo(2.3562, 4);
      expect(degreesToRadians(180)).toBeCloseTo(3.1416, 4);
      expect(degreesToRadians(225)).toBeCloseTo(3.9270, 4);
      expect(degreesToRadians(270)).toBeCloseTo(4.7124, 4);
      expect(degreesToRadians(315)).toBeCloseTo(5.4978, 4);
      expect(degreesToRadians(360)).toBeCloseTo(6.2832, 4);
      expect(degreesToRadians(-45)).toBeCloseTo(-0.7854, 4);
      expect(degreesToRadians(-90)).toBeCloseTo(-1.5708, 4);
    });

    it("degreesToRadians() throws errors given invalid inputs", function() {
      expect(function() { degreesToRadians(""); }).toThrow();
      expect(function() { degreesToRadians("a"); }).toThrow();
      expect(function() { degreesToRadians(true); }).toThrow();
      expect(function() { degreesToRadians(false); }).toThrow();
      expect(function() { degreesToRadians([1]); }).toThrow();
      expect(function() { degreesToRadians({}); }).toThrow();
      expect(function() { degreesToRadians(null); }).toThrow();
      expect(function() { degreesToRadians(undefined); }).toThrow();
    });

    it("dist() calculates the distance between locations", function() {
      expect(GeoFire.distance([90, 180], [90, 180])).toBeCloseTo(0, 0);
      expect(GeoFire.distance([-90, -180], [90, 180])).toBeCloseTo(20015, 0);
      expect(GeoFire.distance([-90, -180], [-90, 180])).toBeCloseTo(0, 0);
      expect(GeoFire.distance([-90, -180], [90, -180])).toBeCloseTo(20015, 0);
      expect(GeoFire.distance([37.7853074, -122.4054274], [78.216667, 15.55])).toBeCloseTo(6818, 0);
      expect(GeoFire.distance([38.98719, -77.250783], [29.3760648, 47.9818853])).toBeCloseTo(10531, 0);
      expect(GeoFire.distance([38.98719, -77.250783], [-54.933333, -67.616667])).toBeCloseTo(10484, 0);
      expect(GeoFire.distance([29.3760648, 47.9818853], [-54.933333, -67.616667])).toBeCloseTo(14250, 0);
      expect(GeoFire.distance([-54.933333, -67.616667], [-54, -67])).toBeCloseTo(111, 0);
    });

    it("dist() does not throw errors given valid locations", function() {
      validLocations.forEach(function(validLocation, i) {
        expect(function() { GeoFire.distance(validLocation, [0, 0]); }).not.toThrow();
        expect(function() { GeoFire.distance([0, 0], validLocation); }).not.toThrow();
      });
    });

    it("dist() throws errors given invalid locations", function() {
      invalidLocations.forEach(function(invalidLocation, i) {
        expect(function() { GeoFire.distance(invalidLocation, [0, 0]); }).toThrow();
        expect(function() { GeoFire.distance([0, 0], invalidLocation); }).toThrow();
      });
    });
  });

  describe("Geohashing:", function() {
    it("encodeGeohash() encodes locations to geohashes given no precision", function() {
      expect(encodeGeohash([-90, -180])).toBe("000000000000".slice(0, g_GEOHASH_PRECISION));
      expect(encodeGeohash([90, 180])).toBe("zzzzzzzzzzzz".slice(0, g_GEOHASH_PRECISION));
      expect(encodeGeohash([-90, 180])).toBe("pbpbpbpbpbpb".slice(0, g_GEOHASH_PRECISION));
      expect(encodeGeohash([90, -180])).toBe("bpbpbpbpbpbp".slice(0, g_GEOHASH_PRECISION));
      expect(encodeGeohash([37.7853074, -122.4054274])).toBe("9q8yywe56gcf".slice(0, g_GEOHASH_PRECISION));
      expect(encodeGeohash([38.98719, -77.250783])).toBe("dqcjf17sy6cp".slice(0, g_GEOHASH_PRECISION));
      expect(encodeGeohash([29.3760648, 47.9818853])).toBe("tj4p5gerfzqu".slice(0, g_GEOHASH_PRECISION));
      expect(encodeGeohash([78.216667, 15.55])).toBe("umghcygjj782".slice(0, g_GEOHASH_PRECISION));
      expect(encodeGeohash([-54.933333, -67.616667])).toBe("4qpzmren1kwb".slice(0, g_GEOHASH_PRECISION));
      expect(encodeGeohash([-54, -67])).toBe("4w2kg3s54y7h".slice(0, g_GEOHASH_PRECISION));
    });

    it("encodeGeohash() encodes locations to geohashes given a custom precision", function() {
      expect(encodeGeohash([-90, -180], 6)).toBe("000000");
      expect(encodeGeohash([90, 180], 20)).toBe("zzzzzzzzzzzzzzzzzzzz");
      expect(encodeGeohash([-90, 180], 1)).toBe("p");
      expect(encodeGeohash([90, -180], 5)).toBe("bpbpb");
      expect(encodeGeohash([37.7853074, -122.4054274], 8)).toBe("9q8yywe5");
      expect(encodeGeohash([38.98719, -77.250783], 18)).toBe("dqcjf17sy6cppp8vfn");
      expect(encodeGeohash([29.3760648, 47.9818853], 12)).toBe("tj4p5gerfzqu");
      expect(encodeGeohash([78.216667, 15.55], 1)).toBe("u");
      expect(encodeGeohash([-54.933333, -67.616667], 7)).toBe("4qpzmre");
      expect(encodeGeohash([-54, -67], 9)).toBe("4w2kg3s54");
    });

    it("encodeGeohash() does not throw errors given valid locations", function() {
      validLocations.forEach(function(validLocation, i) {
        expect(function() { encodeGeohash(validLocation); }).not.toThrow();
      });
    });

    it("encodeGeohash() throws errors given invalid locations", function() {
      invalidLocations.forEach(function(invalidLocation, i) {
        expect(function() { encodeGeohash(invalidLocation); }).toThrow();
      });
    });

    it("encodeGeohash() does not throw errors given valid precision", function() {
      var validPrecisions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, undefined];

      validPrecisions.forEach(function(validPrecision, i) {
        expect(function() { encodeGeohash([0, 0], validPrecision); }).not.toThrow();
      });
    });

    it("encodeGeohash() throws errors given invalid precision", function() {
      var invalidPrecisions = [0, -1, 1.5, 23, "", "a", true, false, [], {}, [1], {a:1}, null];

      invalidPrecisions.forEach(function(invalidPrecision, i) {
        expect(function() { encodeGeohash([0, 0], invalidPrecision); }).toThrow();
      });
    });
  });

  describe("Coordinate calculations:", function() {
    it("metersToLongtitudeDegrees calculates correctly", function() {
      expect(metersToLongitudeDegrees(1000, 0)).toBeCloseTo(0.008983, 5);
      expect(metersToLongitudeDegrees(111320, 0)).toBeCloseTo(1, 5);
      expect(metersToLongitudeDegrees(107550, 15)).toBeCloseTo(1, 5);
      expect(metersToLongitudeDegrees(96486, 30)).toBeCloseTo(1, 5);
      expect(metersToLongitudeDegrees(78847, 45)).toBeCloseTo(1, 5);
      expect(metersToLongitudeDegrees(55800, 60)).toBeCloseTo(1, 5);
      expect(metersToLongitudeDegrees(28902, 75)).toBeCloseTo(1, 5);
      expect(metersToLongitudeDegrees(0, 90)).toBeCloseTo(0, 5);
      expect(metersToLongitudeDegrees(1000, 90)).toBeCloseTo(360, 5);
      expect(metersToLongitudeDegrees(1000, 89.9999)).toBeCloseTo(360, 5);
      expect(metersToLongitudeDegrees(1000, 89.995)).toBeCloseTo(102.594208, 5);
    });

    it("wrapLongitude wraps correctly", function() {
      expect(wrapLongitude(0)).toBeCloseTo(0, 6);
      expect(wrapLongitude(180)).toBeCloseTo(180, 6);
      expect(wrapLongitude(-180)).toBeCloseTo(-180, 6);
      expect(wrapLongitude(182)).toBeCloseTo(-178, 6);
      expect(wrapLongitude(270)).toBeCloseTo(-90, 6);
      expect(wrapLongitude(360)).toBeCloseTo(0, 6);
      expect(wrapLongitude(540)).toBeCloseTo(-180, 6);
      expect(wrapLongitude(630)).toBeCloseTo(-90, 6);
      expect(wrapLongitude(720)).toBeCloseTo(0, 6);
      expect(wrapLongitude(810)).toBeCloseTo(90, 6);
      expect(wrapLongitude(-360)).toBeCloseTo(0, 6);
      expect(wrapLongitude(-182)).toBeCloseTo(178, 6);
      expect(wrapLongitude(-270)).toBeCloseTo(90, 6);
      expect(wrapLongitude(-360)).toBeCloseTo(0, 6);
      expect(wrapLongitude(-450)).toBeCloseTo(-90, 6);
      expect(wrapLongitude(-540)).toBeCloseTo(180, 6);
      expect(wrapLongitude(-630)).toBeCloseTo(90, 6);
      expect(wrapLongitude(1080)).toBeCloseTo(0, 6);
      expect(wrapLongitude(-1080)).toBeCloseTo(0, 6);
    });
  });

  describe("Bounding box bits:", function() {
    it("boundingBoxBits must return correct number of bits", function() {
      expect(boundingBoxBits([35,0], 1000)).toBe(28);
      expect(boundingBoxBits([35.645,0], 1000)).toBe(27);
      expect(boundingBoxBits([36,0], 1000)).toBe(27);
      expect(boundingBoxBits([0,0], 1000)).toBe(28);
      expect(boundingBoxBits([0,-180], 1000)).toBe(28);
      expect(boundingBoxBits([0,180], 1000)).toBe(28);
      expect(boundingBoxBits([0,0], 8000)).toBe(22);
      expect(boundingBoxBits([45,0], 1000)).toBe(27);
      expect(boundingBoxBits([75,0], 1000)).toBe(25);
      expect(boundingBoxBits([75,0], 2000)).toBe(23);
      expect(boundingBoxBits([90,0], 1000)).toBe(1);
      expect(boundingBoxBits([90,0], 2000)).toBe(1);
    });
  });

  describe("Geohash queries:", function() {
    it("Geohash queries must be of the right size", function() {
      expect(geohashQuery("64m9yn96mx",6)).toEqual(["60", "6h"]);
      expect(geohashQuery("64m9yn96mx",1)).toEqual(["0", "h"]);
      expect(geohashQuery("64m9yn96mx",10)).toEqual(["64", "65"]);
      expect(geohashQuery("6409yn96mx",11)).toEqual(["640", "64h"]);
      expect(geohashQuery("64m9yn96mx",11)).toEqual(["64h", "64~"]);
      expect(geohashQuery("6",10)).toEqual(["6", "6~"]);
      expect(geohashQuery("64z178",12)).toEqual(["64s", "64~"]);
      expect(geohashQuery("64z178",15)).toEqual(["64z", "64~"]);
    });

    it("Queries from geohashQueries must contain points in circle", function() {
      function inQuery(queries, hash) {
        for (var i = 0; i < queries.length; i++) {
          if (hash >= queries[i][0] && hash < queries[i][1]) {
            return true;
          }
        }
        return false;
      }
      for (var i = 0; i < 200; i++) {
        var centerLat = Math.pow(Math.random(),5)*160-80;
        var centerLong = Math.pow(Math.random(),5)*360-180;
        var radius = Math.random()*Math.random()*100000;
        var degreeRadius = metersToLongitudeDegrees(radius, centerLat);
        var queries = geohashQueries([centerLat, centerLong], radius);
        for (var j = 0; j < 1000; j++) {
          var pointLat = Math.max(-89.9, Math.min(89.9, centerLat + Math.random()*degreeRadius));
          var pointLong = wrapLongitude(centerLong + Math.random()*degreeRadius);
          if (GeoFire.distance([centerLat, centerLong], [pointLat, pointLong]) < radius/1000) {
            expect(inQuery(queries, encodeGeohash([pointLat, pointLong]))).toBe(true);
          }
        }
      }
    });
  });
});
