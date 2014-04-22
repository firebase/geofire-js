describe("GeoFire Tests", function() {
  var dataRef = new Firebase("https://geofiretest.firebaseio-demo.com");
  var geo = new GeoFire(dataRef);

  function addLocation(key, location) {
    geo.set(key, location);
  }

  it("setting valid locations updates Firebase", function() {
    expect(addLocation("loc1", [50, 50])).not.toThrow();
  });

  it("setting invalid locations throws an error", function() {
    expect(addLocation("loc1", [100, 100])).toThrow();
  });
});
