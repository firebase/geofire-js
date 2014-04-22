describe("GeoFire Tests", function() {

  function Checklist(items, doneCB) {
    var eventsToComplete = items ? items : ["default"];

    this.x = function(item) {
      var ind = eventsToComplete.indexOf(item);
      if(ind >= 0) {
        eventsToComplete.splice(ind, 1);
      }
      if(eventsToComplete.length == 0) {
        doneCB();
      }
    }
  }

  var ref = new Firebase('https://geofiretest.firebaseio-demo.com');

  it("get and set return promises", function(done) {
    var cl = new Checklist(["first promise", "second promise"], done);

    var gf = new GeoFire(ref);
    var p1 = gf.set("hello", [1,2]);
    var p2 = gf.get("hello");

    p1.then(function() {
      cl.x("first promise");
    });

    p2.then(function(loc) {
      expect(loc).toEqual([1,2]);
      cl.x("second promise");
    });
  })
});
