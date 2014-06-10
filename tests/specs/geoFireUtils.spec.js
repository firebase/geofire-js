describe("geoFireUtils Tests:", function() {
  var locations = [
    [[-90, -180], "000000000000"],
    [[90, 180], "zzzzzzzzzzzz"],
    [[-90, 180], "pbpbpbpbpbpb"],
    [[90, -180], "bpbpbpbpbpbp"],
    [[37.7853074, -122.4054274], "9q8yywe56gcf"],
    [[38.98719, -77.250783], "dqcjf17sy6cp"],
    [[29.3760648, 47.9818853], "tj4p5gerfzqu"],
    [[78.216667, 15.55], "umghcygjj782"],
    [[-54.933333, -67.616667], "4qpzmren1kwb"],
    [[-54, -67], "4w2kg3s54y7h"]
  ];

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
  });

  describe("Distance calculations:", function() {
    it("degreesToRadians() converts degrees to radians", function() {
      expect(degreesToRadians(0)).toEqual(0);
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
      expect(GeoFire.distance(locations[1][0], locations[1][0])).toEqual(0);
      expect(GeoFire.distance(locations[0][0], locations[1][0])).toBeCloseTo(20015, 0);
      expect(GeoFire.distance(locations[0][0], locations[2][0])).toEqual(0);
      expect(GeoFire.distance(locations[0][0], locations[3][0])).toBeCloseTo(20015, 0);
      expect(GeoFire.distance(locations[4][0], locations[7][0])).toBeCloseTo(6818, 0);
      expect(GeoFire.distance(locations[5][0], locations[6][0])).toBeCloseTo(10531, 0);
      expect(GeoFire.distance(locations[5][0], locations[8][0])).toBeCloseTo(10484, 0);
      expect(GeoFire.distance(locations[6][0], locations[8][0])).toBeCloseTo(14250, 0);
      expect(GeoFire.distance(locations[8][0], locations[9][0])).toBeCloseTo(111, 0);
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
      console.log("!!!!!  geoFireUtils Tests  !!!!!");
      expect(encodeGeohash([-90, -180])).toBe("000000000000");
      expect(encodeGeohash([90, 180])).toBe("zzzzzzzzzzzz");
      expect(encodeGeohash([-90, 180])).toBe("pbpbpbpbpbpb");
      expect(encodeGeohash([90, -180])).toBe("bpbpbpbpbpbp");
      expect(encodeGeohash([37.7853074, -122.4054274])).toBe("9q8yywe56gcf");
      expect(encodeGeohash([38.98719, -77.250783])).toBe("dqcjf17sy6cp");
      expect(encodeGeohash([29.3760648, 47.9818853])).toBe("tj4p5gerfzqu");
      expect(encodeGeohash([78.216667, 15.55])).toBe("umghcygjj782");
      expect(encodeGeohash([-54.933333, -67.616667])).toBe("4qpzmren1kwb");
      expect(encodeGeohash([-54, -67])).toBe("4w2kg3s54y7h");
    });

    it("encodeGeohash() encodes locations to geohashes given a custom precision", function() {
      console.log("!!!!!  geoFireUtils Tests  !!!!!");
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

  describe("Neighboring geohashes:", function() {
    it("neighborByDirection() returns the neighboring geohash in the specified direction", function() {
      var geohash = "000000000000";
      expect(neighborByDirection(geohash, "north")).toEqual("000000000001");
      expect(neighborByDirection(geohash, "south")).toEqual("pbpbpbpbpbp");
      expect(neighborByDirection(geohash, "east")).toEqual("000000000002");
      expect(neighborByDirection(geohash, "west")).toEqual("bpbpbpbpbpb");

      geohash = "d62dtu"
      expect(neighborByDirection(geohash, "north")).toEqual("d62dtv");
      expect(neighborByDirection(geohash, "south")).toEqual("d62dtg");
      expect(neighborByDirection(geohash, "east")).toEqual("d62dwh");
      expect(neighborByDirection(geohash, "west")).toEqual("d62dts");

      geohash = "5";
      expect(neighborByDirection(geohash, "north")).toEqual("7");
      expect(neighborByDirection(geohash, "south")).toEqual("");
      expect(neighborByDirection(geohash, "east")).toEqual("h");
      expect(neighborByDirection(geohash, "west")).toEqual("4");
    });

    it("neighborByDirection() does not throw errors given valid geohashes", function() {
      validGeohashes.forEach(function(validGeohash) {
        expect(function() { neighborByDirection(validGeohash, "north"); }).not.toThrow();
      });
    });

    it("neighborByDirection() throws errors given invalid geohashes", function() {
      invalidGeohashes.forEach(function(invalidGeohash) {
        expect(function() { neighborByDirection(invalidGeohash, "north"); }).toThrow();
      });
    });

    it("neighborByDirection() does not throw errors given valid directions", function() {
      var validDirections = ["north", "south", "east", "west"];

      validDirections.forEach(function(validDirection) {
        expect(function() { neighborByDirection("000", validDirection); }).not.toThrow();
      });
    });

    it("neighborByDirection() throws errors given invalid directions", function() {
      var invalidDirections = ["", "aaa", "nort", 1, true, false, [], [1], {}, {a:1}, null, undefined];

      invalidDirections.forEach(function(invalidDirection) {
        expect(function() { neighborByDirection("000", invalidDirection); }).toThrow();
      });
    });

    it("neighbors() returns the eight neighboring geohashes", function() {
      expect(neighbors("000000000000")).toEqual(["000000000001", "pbpbpbpbpbp", "000000000002", "bpbpbpbpbpb", "000000000003", "bpbpbpbpbpc", "0000000000", "pbpbpbpbpbn"]);
      expect(neighbors("01010101")).toEqual(["01010104", "01010100", "01010103", "cpcpcpc", "01010106", "cpcpcpf", "01010102", "cpcpcpb"]);
      expect(neighbors("d62dtu")).toEqual(["d62dtv", "d62dtg", "d62dwh", "d62dts", "d62dwj", "d62dtt", "d62dw5", "d62dte"]);
      expect(neighbors("zw3d9b")).toEqual(["zw3d9c", "zw3d3z", "zw3dd0", "zw3d98", "zw3dd1", "zw3d99", "zw3d6p", "zw3d3x"]);
      expect(neighbors("5")).toEqual(["7", "", "h", "4", "k", "6"]);
    });

    it("neighbors() does not throw errors given valid geohashes", function() {
      validGeohashes.forEach(function(validGeohash) {
        expect(function() { neighbors(validGeohash); }).not.toThrow();
      });
    });

    it("neighbors() throws errors given invalid geohashes", function() {
      invalidGeohashes.forEach(function(invalidGeohash) {
        expect(function() { neighbors(invalidGeohash); }).toThrow();
      });
    });
  });
});