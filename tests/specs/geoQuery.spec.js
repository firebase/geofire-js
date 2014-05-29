describe("GeoQuery Tests:", function() {
  // Reset the Firebase before each test
  beforeEach(function(done) {
    resetFirebase().then(done);
  });

  describe("Constructor:", function() {
    it("Constructor stores query criteria", function() {
      console.log("!!!!!  GeoQuery Tests  !!!!!");

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      expect(gq.center()).toEqual([1,2]);
      expect(gq.radius()).toEqual(1000);
    });

    it("Constructor throws error on invalid query criteria", function() {
      var gf = new GeoFire(dataRef);

      expect(function() { gf.query({}) }).toThrow();
      expect(function() { gf.query({random: 100}) }).toThrow();
      expect(function() { gf.query({center: [1,2]}) }).toThrow();
      expect(function() { gf.query({radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [91,2], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [1,-181], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: ["text",2], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [1,[1,2]], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [null,2], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [1,undefined], radius: 1000}) }).toThrow();
      expect(function() { gf.query({center: [1,2], radius: -10}) }).toThrow();
      expect(function() { gf.query({center: [1,2], radius: "text"}) }).toThrow();
      expect(function() { gf.query({center: [1,2], radius: [1,2]}) }).toThrow();
      expect(function() { gf.query({center: [1,2], radius: null}) }).toThrow();
      expect(function() { gf.query({center: [1,2], radius: undefined}) }).toThrow();
    });
  });

  describe("updateCriteria():", function() {
    it("updateCriteria() updates query criteria", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      // TODO: change
      expect(gq.center()).toEqual([1,2]);
      expect(gq.radius()).toEqual(1000);

      gq.updateCriteria({center: [2,3], radius: 100});

      expect(gq.center()).toEqual([2,3]);
      expect(gq.radius()).toEqual(100);
    });

    it("updateCriteria() updates query criteria when given only center", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      // TODO: change
      expect(gq.center()).toEqual([1,2]);
      expect(gq.radius()).toEqual(1000);

      gq.updateCriteria({center: [2,3]});

      expect(gq.center()).toEqual([2,3]);
      expect(gq.radius()).toEqual(1000);
    });

    it("updateCriteria() updates query criteria when given only radius", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      // TODO: change
      expect(gq.center()).toEqual([1,2]);
      expect(gq.radius()).toEqual(1000);

      gq.updateCriteria({radius: 100});

      expect(gq.center()).toEqual([1,2]);
      expect(gq.radius()).toEqual(100);
    });

    it("updateCriteria() fires \"key_entered\" callback for locations which now belong to the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered", "loc4 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [90,90], radius: 1000});
      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        gq.updateCriteria({center: [1,2], radius: 1000});

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("updateCriteria() fires \"key_left\" callback for locations which no longer belong to the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 left", "loc4 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1, 2], radius: 1000});
      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        gq.updateCriteria({center: [90,90], radius: 1000});

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("updateCriteria() throws error on invalid query criteria", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      expect(function() { gf.updateCriteria({}) }).toThrow();
      expect(function() { gf.updateCriteria({random: 100}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [91,2], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,-181], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: ["text",2], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,[1,2]], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [null,2], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,undefined], radius: 1000}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,2], radius: -10}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,2], radius: "text"}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,2], radius: [1,2]}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,2], radius: null}) }).toThrow();
      expect(function() { gf.updateCriteria({center: [1,2], radius: undefined}) }).toThrow();
    });
  });

  describe("results():", function() {
    it("results() returns valid results when there are locations within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      batchSet(gf, [
        {key: "loc1", location: [1, 2]},
        {key: "loc2", location: [1, 3]},
        {key: "loc3", location: [1, 4]},
        {key: "loc4", location: [25, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1")

        return gq.results();
      }).then(function(results) {
        expect(results).toEqual([
          { key: "loc1", location: [1,2] },
          { key: "loc2", location: [1,3] },
          { key: "loc3", location: [1,4] }
        ]);

        cl.x("p2");
      });
    });

    it("results() returns empty results when there are no locations within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      batchSet(gf, [
        {key: "loc1", location: [1, 90]},
        {key: "loc2", location: [50, -1]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [25, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1")

        return gq.results();
      }).then(function(results) {
        expect(results).toEqual([]);

        cl.x("p2");
      });
    });
  });

  describe("on():", function() {
    it("on() throws error given invalid event type", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var setInvalidEventType = function() {
        gq.on("invalid_event", function() { });
      }

      expect(setInvalidEventType).toThrow();
    });

    it("on() throws error given invalid callback", function() {
      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      var setInvalidCallback = function() {
        gq.on("key_entered", "non-function");
      }

      expect(setInvalidCallback).toThrow();
    });
  });

  describe("\"key_moved\" event:", function() {
    it("\"key_moved\" callback does not fire for brand new locations within or outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("\"key_moved\" callback does not fire for locations outside of the GeoQuery which are moved somewhere else outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [1, 90]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [1, 91]},
          {key: "loc3", location: [-50, -50]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback does not fire for locations outside of the GeoQuery which are moved within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [1, 90]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [0, 0]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback fires for locations within the GeoQuery which are moved somewhere else within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [2, 2]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback properly fires when multiple keys are at the same location within the GeoQuery and only one of them moves somewhere else within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [0, 0]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [2, 2]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback properly fires when a location within the GeoQuery moves somehwere else within the GeoQuery that is already occupied by another key", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [2, 2]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [2, 2]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("multiple \"key_moved\" callbacks fire for locations within the GeoQuery which are moved somewhere else within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved1", "loc3 moved1", "loc1 moved2", "loc3 moved2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved1");
      });
      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved2");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [2, 2]},
          {key: "loc3", location: [-1, -1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback does not fire for locations within the GeoQuery which are moved somewhere outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, 1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [1, 90]},
          {key: "loc3", location: [-1, -90]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_moved\" callback fires for a location within the GeoQuery which is set to the same location", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved", "loc3 moved"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [1, -1]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [0, 0]},
          {key: "loc2", location: [55, 55]},
          {key: "loc3", location: [1, 1]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });
  });

  describe("\"key_entered\" event:", function() {
    it("\"key_entered\" callback fires when a location enters the GeoQuery before onKeyEntered() was called", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered", "loc4 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        gq.on("key_entered", function(key, location) {
          cl.x(key + " entered");
        });

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("\"key_entered\" callback fires when a location enters the GeoQuery after onKeyEntered() was called", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered", "loc4 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });

    it("\"key_entered\" callback properly fires when multiple keys are at the same location outside the GeoQuery and only one of them moves within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });

      batchSet(gf, [
        {key: "loc1", location: [50, 50]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [18, -121]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [2, 2]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_entered\" callback properly fires when a location outside the GeoQuery moves somewhere within the GeoQuery that is already occupied by another key", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 entered", "loc3 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });

      batchSet(gf, [
        {key: "loc1", location: [50, 50]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [0, 0]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [0, 0]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("multiple \"key_entered\" callbacks fire when a location enters the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered1", "loc4 entered1", "loc1 entered2", "loc4 entered2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered1");
      });
      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered2");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return wait(5);
      }).then(function() {
        cl.x("p2");
      });
    });
  });

  describe("\"key_left\" event:", function() {
    it("\"key_left\" callback fires when a location leaves the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 left", "loc4 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [25, 90]},
          {key: "loc4", location: [25, 5]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_left\" callback fires when a location within the GeoQuery is entirely removed from GeoFire", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [2, 3]}
      ]).then(function() {
        cl.x("p1");

        return gf.remove("loc1");
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_left\" callback properly fires when multiple keys are at the same location inside the GeoQuery and only one of them moves outside the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [0, 0]},
        {key: "loc3", location: [18, -121]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [20, -55]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("\"key_left\" callback properly fires when a location inside the GeoQuery moves somewhere outside the GeoQuery that is already occupied by another key", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });

      batchSet(gf, [
        {key: "loc1", location: [0, 0]},
        {key: "loc2", location: [50, 50]},
        {key: "loc3", location: [18, -121]}
      ]).then(function() {
        cl.x("p1");

        return gf.set("loc1", [18, -121]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });

    it("multiple \"key_left\" callbacks fire when a location leaves the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 left1", "loc4 left1", "loc1 left2", "loc4 left2"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_left", function(key, location) {
        cl.x(key + " left1");
      });
      gq.on("key_left", function(key, location) {
        cl.x(key + " left2");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [25, 90]},
          {key: "loc4", location: [25, 5]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3");
      });
    });
  });

  describe("\"key_*\" events combined:", function() {
    it ("\"key_*\" event callbacks fire when used all at the same time", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "loc1 entered", "loc4 entered", "loc1 moved", "loc4 left", "loc1 left", "loc5 entered"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });
      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });
      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [1, 1]},
          {key: "loc4", location: [25, 5]}
        ]);
      }).then(function() {
        cl.x("p2");

        return batchSet(gf, [
          {key: "loc1", location: [10, -100]},
          {key: "loc2", location: [50, -50]},
          {key: "loc5", location: [5, 5]}
        ]);
      }).then(function() {
        cl.x("p3");

        return wait(5);
      }).then(function() {
        cl.x("p4");
      });
    });
  });

  describe("Cancelling GeoQuery:", function() {
    it ("cancel() prevents GeoQuery from firing any more \"key_*\" event callbacks", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 entered", "loc4 entered", "loc1 moved", "loc4 left"], expect, done);

      var gf = new GeoFire(dataRef);
      var gq = gf.query({center: [1,2], radius: 1000});

      gq.on("key_entered", function(key, location) {
        cl.x(key + " entered");
      });
      gq.on("key_left", function(key, location) {
        cl.x(key + " left");
      });
      gq.on("key_moved", function(key, location) {
        cl.x(key + " moved");
      });

      batchSet(gf, [
        {key: "loc1", location: [2, 3]},
        {key: "loc2", location: [50, -7]},
        {key: "loc3", location: [16, -150]},
        {key: "loc4", location: [5, 5]},
        {key: "loc5", location: [67, 55]}
      ]).then(function() {
        cl.x("p1");

        return batchSet(gf, [
          {key: "loc1", location: [1, 1]},
          {key: "loc4", location: [25, 5]}
        ]);
      }).then(function() {
        cl.x("p2");

        return wait(5);
      }).then(function() {
        cl.x("p3")

        gq.cancel();

        return batchSet(gf, [
          {key: "loc1", location: [10, -100]},
          {key: "loc2", location: [50, -50]},
          {key: "loc5", location: [5, 5]}
        ]);
      }).then(function() {
        cl.x("p4");

        return wait(5);
      }).then(function() {
        cl.x("p5");
      });
    });
  });
});