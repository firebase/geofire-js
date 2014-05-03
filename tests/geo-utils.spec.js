/*********************/
/*  GEO-UTILS TESTS  */
/*********************/
describe("geo-utils Tests", function() {
  describe("Geohashing", function() {
    var locations = [
      [[-90, -180], "000000000000"],
      [[90, 180], "zzzzzzzzzzzz"],
      [[-90, 180], "pbpbpbpbpbpb"],
      [[90, -180], "bpbpbpbpbpbp"],
      [[37.7853074, -122.4054274], "9q8yywe56gcf"],
      [[38.98719, -77.250783], "dqcjf17sy6cp"],
      [[29.3760648, 47.9818853], "tj4p5gerfzqu"],
      [[78.216667, 15.55], "umghcygjj782"],
      [[-54.933333, -67.616667], "4qpzmren1kwb"]
    ];

    it("encodeGeohash() properly encodes locations to geohashes", function() {
      for(var i = 0; i < locations.length; i++) {
        expect(encodeGeohash(locations[i][0])).toBe(locations[i][1])
      }
    });

    it("decodeGeohash() properly decodes geohashes to locations", function() {
      for(var i = 0; i < locations.length; i++) {
        var decodedHash = decodeGeohash(locations[i][1]);
        var targetLatLon = locations[i][0];;

        expect(decodedHash[0]).toBeCloseTo(targetLatLon[0],.001);
        expect(decodedHash[1]).toBeCloseTo(targetLatLon[1],.001);
      }
    });

    it("neighborGeohash() properly returns the neighbord geohash", function() {
      var locations = [
        ["gbz", "east", "u0b"]
      ];

      for(var i = 0; i < locations.length; i++) {
        expect(neighborGeohash(locations[i][0], locations[i][1])).toBe(locations[i][2])
      }
    })
  });


});
