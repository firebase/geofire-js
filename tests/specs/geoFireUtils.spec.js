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

  it("encodeGeohash() properly encodes locations to geohashes", function() {
    console.log("!!!!!  geoFireUtils Tests  !!!!!");
    for(var i = 0; i < locations.length; i++) {
      expect(encodeGeohash(locations[i][0])).toBe(locations[i][1])
    }
  });

  it("encodeGeohash() throws errors on invalid locations", function() {
    expect(function() { encodeGeohash([91, 0]) }).toThrow();
    expect(function() { encodeGeohash([-91, 0]) }).toThrow();
    expect(function() { encodeGeohash([0, 181]) }).toThrow();
    expect(function() { encodeGeohash([0, -181]) }).toThrow();
  });

  it("dist() properly returns the distance between geohashes", function() {
    expect(dist(locations[1][0], locations[1][0])).toEqual(0);
    expect(dist(locations[0][0], locations[1][0])).toBeCloseTo(20015, 0);
    expect(dist(locations[0][0], locations[2][0])).toEqual(0);
    expect(dist(locations[0][0], locations[3][0])).toBeCloseTo(20015, 0);
    expect(dist(locations[4][0], locations[7][0])).toBeCloseTo(6818, 0);
    expect(dist(locations[5][0], locations[6][0])).toBeCloseTo(10531, 0);
    expect(dist(locations[5][0], locations[8][0])).toBeCloseTo(10484, 0);
    expect(dist(locations[6][0], locations[8][0])).toBeCloseTo(14250, 0);
    expect(dist(locations[8][0], locations[9][0])).toBeCloseTo(111, 0);
  });

  it("deg2rad() properly converts degrees to radians", function() {
    expect(deg2rad(0)).toEqual(0);
    expect(deg2rad(45)).toBeCloseTo(0.7854, 4);
    expect(deg2rad(90)).toBeCloseTo(1.5708, 4);
    expect(deg2rad(135)).toBeCloseTo(2.3562, 4);
    expect(deg2rad(180)).toBeCloseTo(3.1416, 4);
    expect(deg2rad(225)).toBeCloseTo(3.9270, 4);
    expect(deg2rad(270)).toBeCloseTo(4.7124, 4);
    expect(deg2rad(315)).toBeCloseTo(5.4978, 4);
    expect(deg2rad(360)).toBeCloseTo(6.2832, 4);
  });
});