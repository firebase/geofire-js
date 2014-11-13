describe("GeoQuery Tests:", function() {
  // Reset the Firebase before each test
  beforeEach(function(done) {
    beforeEachHelper(done);
  });

  afterEach(function(done) {
    afterEachHelper(done);
  });

  describe("Constructor:", function() {
    it("Constructor stores query criteria", function() {
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      expect(geoQueries[0].center()).toEqual([1,2]);
      expect(geoQueries[0].radius()).toEqual(1000);
    });

    it("Constructor throws error on invalid query criteria", function() {
      expect(function() { geoFire.query({}) }).toThrow();
      expect(function() { geoFire.query({random: 100}) }).toThrow();
      expect(function() { geoFire.query({center: [1,2]}) }).toThrow();
      expect(function() { geoFire.query({radius: 1000}) }).toThrow();
      expect(function() { geoFire.query({center: [91,2], radius: 1000}) }).toThrow();
      expect(function() { geoFire.query({center: [1,-181], radius: 1000}) }).toThrow();
      expect(function() { geoFire.query({center: ["text",2], radius: 1000}) }).toThrow();
      expect(function() { geoFire.query({center: [1,[1,2]], radius: 1000}) }).toThrow();
      expect(function() { geoFire.query({center: 1000, radius: 1000}) }).toThrow();
      expect(function() { geoFire.query({center: null, radius: 1000}) }).toThrow();
      expect(function() { geoFire.query({center: undefined, radius: 1000}) }).toThrow();
      expect(function() { geoFire.query({center: [null,2], radius: 1000}) }).toThrow();
      expect(function() { geoFire.query({center: [1,undefined], radius: 1000}) }).toThrow();
      expect(function() { geoFire.query({center: [1,2], radius: -10}) }).toThrow();
      expect(function() { geoFire.query({center: [1,2], radius: "text"}) }).toThrow();
      expect(function() { geoFire.query({center: [1,2], radius: [1,2]}) }).toThrow();
      expect(function() { geoFire.query({center: [1,2], radius: null}) }).toThrow();
      expect(function() { geoFire.query({center: [1,2], radius: undefined}) }).toThrow();
      expect(function() { geoFire.query({center: [1,2], radius: 1000, other: "throw"}) }).toThrow();
    });
  });

  describe("updateCriteria():", function() {
    it("updateCriteria() updates query criteria", function() {
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      expect(geoQueries[0].center()).toEqual([1,2]);
      expect(geoQueries[0].radius()).toEqual(1000);

      geoQueries[0].updateCriteria({center: [2,3], radius: 100});

      expect(geoQueries[0].center()).toEqual([2,3]);
      expect(geoQueries[0].radius()).toEqual(100);
    });

    it("updateCriteria() updates query criteria when given only center", function() {
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      expect(geoQueries[0].center()).toEqual([1,2]);
      expect(geoQueries[0].radius()).toEqual(1000);

      geoQueries[0].updateCriteria({center: [2,3]});

      expect(geoQueries[0].center()).toEqual([2,3]);
      expect(geoQueries[0].radius()).toEqual(1000);
    });

    it("updateCriteria() updates query criteria when given only radius", function() {
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      expect(geoQueries[0].center()).toEqual([1,2]);
      expect(geoQueries[0].radius()).toEqual(1000);

      geoQueries[0].updateCriteria({radius: 100});

      expect(geoQueries[0].center()).toEqual([1,2]);
      expect(geoQueries[0].radius()).toEqual(100);
    });

    it("updateCriteria() fires \"key_entered\" callback for locations which now belong to the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered", "loc4 entered"], expect, done);

      geoQueries.push(geoFire.query({center: [90,90], radius: 1000}));
      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        geoQueries[0].updateCriteria({center: [1,2], radius: 1000});

        return wait(100);
      }).then(function() {
        cl.x("p2");
      }).catch(failTestOnCaughtError);
    });

    it("updateCriteria() fires \"key_entered\" callback for locations with complex keys which now belong to the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc:^:*1 entered", "loc-+-+-4 entered"], expect, done);

      geoQueries.push(geoFire.query({center: [90,90], radius: 1000}));
      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });

      geoFire.set({
        "loc:^:*1": [2, 3],
        "loc:a:a:a:a:2": [50, -7],
        "loc%!@3": [16, -150],
        "loc-+-+-4": [5, 5],
        "loc:5": [67, 55]
      }).then(function() {
        cl.x("p1");

        geoQueries[0].updateCriteria({center: [1,2], radius: 1000});

        return wait(100);
      }).then(function() {
        cl.x("p2");
      }).catch(failTestOnCaughtError);
    });

    it("updateCriteria() fires \"key_exited\" callback for locations which no longer belong to the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 exited", "loc4 exited"], expect, done);

      geoQueries.push(geoFire.query({center: [1, 2], radius: 1000}));
      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        geoQueries[0].updateCriteria({center: [90,90], radius: 1000});

        return wait(100);
      }).then(function() {
        cl.x("p2");
      }).catch(failTestOnCaughtError);
    });

    it("updateCriteria() does not cause event callbacks to fire on the previous criteria", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "loc1 entered", "loc4 entered", "loc1 exited", "loc4 exited", "loc4 entered", "loc5 entered"], expect, done);

      geoQueries.push(geoFire.query({center: [1, 2], radius: 1000}));
      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });
      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [88, 88]
      }).then(function() {
        cl.x("p1");

        geoQueries[0].updateCriteria({center: [90, 90], radius: 1000});

        return wait(100);
      }).then(function() {
        cl.x("p2");

        return geoFire.set({
          "loc2": [1, 1],
          "loc4": [89, 90]
        });
      }).then(function() {
        cl.x("p3");

        return wait(100);
      }).then(function() {
        cl.x("p4");
      }).catch(failTestOnCaughtError);
    });

    it("updateCriteria() does not cause \"key_moved\" callbacks to fire for keys in both the previous and updated queries", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "loc1 entered", "loc4 entered", "loc4 exited", "loc2 entered"], expect, done);

      geoQueries.push(geoFire.query({center: [1, 2], radius: 1000}));
      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });
      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });
      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [88, 88]
      }).then(function() {
        cl.x("p1");

        geoQueries[0].updateCriteria({center: [1, 1], radius: 1000});

        return wait(100);
      }).then(function() {
        cl.x("p2");

        return geoFire.set({
          "loc2": [1, 1],
          "loc4": [89, 90]
        });
      }).then(function() {
        cl.x("p3");

        return wait(100);
      }).then(function() {
        cl.x("p4");
      }).catch(failTestOnCaughtError);
    });

    it("updateCriteria() does not cause \"key_exited\" callbacks to fire twice for keys in the previous query but not in the updated query and which were moved after the query was updated", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "p6", "loc1 entered", "loc4 entered", "loc1 exited", "loc4 exited", "loc4 entered", "loc5 entered", "loc5 moved"], expect, done);

      geoQueries.push(geoFire.query({center: [1, 2], radius: 1000}));
      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });
      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });
      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });


      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [88, 88]
      }).then(function() {
        cl.x("p1");

        geoQueries[0].updateCriteria({center: [90, 90], radius: 1000});

        return wait(100);
      }).then(function() {
        cl.x("p2");

        return geoFire.set({
          "loc2": [1, 1],
          "loc4": [89, 90]
        });
      }).then(function() {
        cl.x("p3");

        return wait(100);
      }).then(function() {
        cl.x("p4");

        return geoFire.set({
          "loc2": [0, 0],
          "loc5": [89, 89]
        });
      }).then(function() {
        cl.x("p5");

        return wait(100);
      }).then(function() {
        cl.x("p6");
      }).catch(failTestOnCaughtError);
    });

    it("updateCriteria() does not throw errors given valid query criteria", function() {
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      validQueryCriterias.forEach(function(validQueryCriteria) {
        expect(function() { geoQueries[0].updateCriteria(validQueryCriteria); }).not.toThrow();
      });
    });

    it("updateCriteria() throws errors given invalid query criteria", function() {
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      invalidQueryCriterias.forEach(function(invalidQueryCriteria) {
        expect(function() { geoQueries[0].updateCriteria(invalidQueryCriteria); }).toThrow();
      });
    });
  });

  describe("on():", function() {
    it("on() throws error given invalid event type", function() {
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      var setInvalidEventType = function() {
        geoQueries[0].on("invalid_event", function() { });
      }

      expect(setInvalidEventType).toThrow();
    });

    it("on() throws error given invalid callback", function() {
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      var setInvalidCallback = function() {
        geoQueries[0].on("key_entered", "non-function");
      }

      expect(setInvalidCallback).toThrow();
    });
  });

  describe("\"ready\" event:", function() {
    it("\"ready\" event fires after all \"key_entered\" events have fired", function(done) {
      var cl = new Checklist(["p1", "loc1 entered", "loc2 entered", "loc5 entered", "loc6 entered", "loc7 entered", "loc10 entered", "ready fired"], expect, done);

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [1, 1],
        "loc3": [50, 50],
        "loc4": [14, 1],
        "loc5": [1, 2],
        "loc6": [1, 1],
        "loc7": [0, 0],
        "loc8": [-80, 44],
        "loc9": [1, -136],
        "loc10": [-2, -2]
      }).then(function() {
        cl.x("p1");

        geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

        geoQueries[0].on("key_entered", function(key, location, distance) {
          cl.x(key + " entered");
        });

        geoQueries[0].on("ready", function() {
          expect(cl.length()).toBe(1);
          cl.x("ready fired");
        });
      });
    });

    it("\"ready\" event fires immediately if the callback is added after the query is already ready", function(done) {
      var cl = new Checklist(["p1", "loc1 entered", "loc2 entered", "loc5 entered", "loc6 entered", "loc7 entered", "loc10 entered", "ready1 fired", "ready2 fired"], expect, done);

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [1, 1],
        "loc3": [50, 50],
        "loc4": [14, 1],
        "loc5": [1, 2],
        "loc6": [1, 1],
        "loc7": [0, 0],
        "loc8": [-80, 44],
        "loc9": [1, -136],
        "loc10": [-2, -2]
      }).then(function() {
        cl.x("p1");

        geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

        geoQueries[0].on("key_entered", function(key, location, distance) {
          cl.x(key + " entered");
        });

        geoQueries[0].on("ready", function() {
          expect(cl.length()).toBe(2);
          cl.x("ready1 fired");
          geoQueries[0].on("ready", function() {
            expect(cl.length()).toBe(1);
            cl.x("ready2 fired");
          });
        });
      });
    });

    it("\"ready\" event fires after increasing the query radius, even if no new geohashes were queried", function(done) {
      var cl = new Checklist(["ready1 fired","ready2 fired"], expect, done);
      geoQueries.push(geoFire.query({center: [37.7851382,-122.405893], radius: 6}));
      var onReadyCallbackRegistration1 = geoQueries[0].on("ready", function() {
        cl.x("ready1 fired");
        onReadyCallbackRegistration1.cancel();
        geoQueries[0].updateCriteria({
          radius: 7
        });
        geoQueries[0].on("ready", function() {
          cl.x("ready2 fired");
        });
      });
    });

    it("updateCriteria() fires the \"ready\" event after all \"key_entered\" events have fired", function(done) {
      var cl = new Checklist(["p1", "loc1 entered", "loc2 entered", "loc5 entered", "loc3 entered", "loc1 exited", "loc2 exited", "loc5 exited", "ready1 fired", "ready2 fired"], expect, done);

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [1, 1],
        "loc3": [50, 50],
        "loc4": [14, 1],
        "loc5": [1, 2]
      }).then(function() {
        cl.x("p1");

        geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

        geoQueries[0].on("key_entered", function(key, location, distance) {
          cl.x(key + " entered");
        });

        geoQueries[0].on("key_exited", function(key, location, distance) {
          cl.x(key + " exited");
        });

        var onReadyCallbackRegistration1 = geoQueries[0].on("ready", function() {
          expect(cl.length()).toBe(6);
          cl.x("ready1 fired");

          onReadyCallbackRegistration1.cancel();

          geoQueries[0].updateCriteria({
            center: [51, 51]
          });

          geoQueries[0].on("ready", function() {
            expect(cl.length()).toBe(1);
            cl.x("ready2 fired");
          });
        });
      });
    });
  });

  describe("\"key_moved\" event:", function() {
    it("\"key_moved\" callback does not fire for brand new locations within or outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return wait(100);
      }).then(function() {
        cl.x("p2");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_moved\" callback does not fire for locations outside of the GeoQuery which are moved somewhere else outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [1, 90],
        "loc2": [50, -7],
        "loc3": [16, -150]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [1, 91],
          "loc3": [-50, -50]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_moved\" callback does not fire for locations outside of the GeoQuery which are moved within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [1, 90],
        "loc2": [50, -7],
        "loc3": [16, -150]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [0, 0],
          "loc3": [-1, -1]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_moved\" callback does not fire for locations within the GeoQuery which are moved somewhere outside of the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [1, 90],
          "loc3": [-1, -90]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_moved\" callback does not fires for a location within the GeoQuery which is set to the same location", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc3 moved"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, -1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [0, 0],
          "loc2": [55, 55],
          "loc3": [1, 1]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_moved\" callback fires for locations within the GeoQuery which are moved somewhere else within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved", "loc3 moved"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [2, 2],
          "loc3": [-1, -1]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_moved\" callback gets passed correct location parameter", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved to 2,2", "loc3 moved to -1,-1"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved to " + location);
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [2, 2],
          "loc3": [-1, -1]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_moved\" callback gets passed correct distance parameter", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved (111.19 km from center)", "loc3 moved (400.90 km from center)"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved (" + distance.toFixed(2) + " km from center)");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [2, 2],
          "loc3": [-1, -1]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_moved\" callback properly fires when multiple keys are at the same location within the GeoQuery and only one of them moves somewhere else within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved", "loc3 moved"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [0, 0],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [2, 2],
          "loc3": [-1, -1]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_moved\" callback properly fires when a location within the GeoQuery moves somehwere else within the GeoQuery that is already occupied by another key", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved", "loc3 moved"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [2, 2],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [2, 2],
          "loc3": [-1, -1]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("multiple \"key_moved\" callbacks fire for locations within the GeoQuery which are moved somewhere else within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 moved1", "loc3 moved1", "loc1 moved2", "loc3 moved2"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved1");
      });
      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved2");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [2, 2],
          "loc3": [-1, -1]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });
  });

  describe("\"key_entered\" event:", function() {
    it("\"key_entered\" callback fires when a location enters the GeoQuery before onKeyEntered() was called", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered", "loc4 entered"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        geoQueries[0].on("key_entered", function(key, location, distance) {
          cl.x(key + " entered");
        });

        return wait(100);
      }).then(function() {
        cl.x("p2");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_entered\" callback fires when a location enters the GeoQuery after onKeyEntered() was called", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered", "loc4 entered"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        return wait(100);
      }).then(function() {
        cl.x("p2");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_entered\" callback gets passed correct location parameter", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered at 2,3", "loc4 entered at 5,5"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered at " + location);
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        return wait(100);
      }).then(function() {
        cl.x("p2");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_entered\" callback gets passed correct distance parameter", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered (157.23 km from center)", "loc4 entered (555.66 km from center)"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered (" + distance.toFixed(2) + " km from center)");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        return wait(100);
      }).then(function() {
        cl.x("p2");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_entered\" callback properly fires when multiple keys are at the same location outside the GeoQuery and only one of them moves within the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 entered"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });

      geoFire.set({
        "loc1": [50, 50],
        "loc2": [50, 50],
        "loc3": [18, -121]
      }).then(function() {
        cl.x("p1");

        return geoFire.set("loc1", [2, 2]);
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_entered\" callback properly fires when a location outside the GeoQuery moves somewhere within the GeoQuery that is already occupied by another key", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 entered", "loc3 entered"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });

      geoFire.set({
        "loc1": [50, 50],
        "loc2": [50, 50],
        "loc3": [0, 0]
      }).then(function() {
        cl.x("p1");

        return geoFire.set("loc1", [0, 0]);
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("multiple \"key_entered\" callbacks fire when a location enters the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "loc1 entered1", "loc4 entered1", "loc1 entered2", "loc4 entered2"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered1");
      });
      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered2");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        return wait(100);
      }).then(function() {
        cl.x("p2");
      }).catch(failTestOnCaughtError);
    });
  });

  describe("\"key_exited\" event:", function() {
    it("\"key_exited\" callback fires when a location leaves the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 exited", "loc4 exited"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [25, 90],
          "loc4": [25, 5]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_exited\" callback gets passed correct location parameter", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 exited to 25,90", "loc4 exited to 25,5"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited to " + location);
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [5, 2],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [25, 90],
          "loc2": [5, 5],
          "loc4": [25, 5]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_exited\" callback gets passed correct distance parameter", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 exited (9759.01 km from center)", "loc4 exited (2688.06 km from center)"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited (" + distance.toFixed(2) + " km from center)");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [5, 2],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [25, 90],
          "loc2": [5, 5],
          "loc4": [25, 5]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_exited\" callback gets passed null for location and distance parameters if the key is entirely removed from GeoFire", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 exited"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_exited", function(key, location, distance) {
        expect(location).toBeNull();
        expect(distance).toBeNull();
        cl.x(key + " exited");
      });

      geoFire.set("loc1", [2, 3]).then(function() {
        cl.x("p1");

        return geoFire.remove("loc1");
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_exited\" callback fires when a location within the GeoQuery is entirely removed from GeoFire", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 exited"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [2, 3]
      }).then(function() {
        cl.x("p1");

        return geoFire.remove("loc1");
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_exited\" callback properly fires when multiple keys are at the same location inside the GeoQuery and only one of them moves outside the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 exited"], expect, done);
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [0, 0],
        "loc3": [18, -121]
      }).then(function() {
        cl.x("p1");

        return geoFire.set("loc1", [20, -55]);
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("\"key_exited\" callback properly fires when a location inside the GeoQuery moves somewhere outside the GeoQuery that is already occupied by another key", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 exited"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });

      geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, 50],
        "loc3": [18, -121]
      }).then(function() {
        cl.x("p1");

        return geoFire.set("loc1", [18, -121]);
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });

    it("multiple \"key_exited\" callbacks fire when a location leaves the GeoQuery", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "loc1 exited1", "loc4 exited1", "loc1 exited2", "loc4 exited2"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited1");
      });
      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited2");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [25, 90],
          "loc4": [25, 5]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3");
      }).catch(failTestOnCaughtError);
    });
  });

  describe("\"key_*\" events combined:", function() {
    it ("\"key_*\" event callbacks fire when used all at the same time", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "loc1 entered", "loc4 entered", "loc1 moved", "loc4 exited", "loc1 exited", "loc5 entered"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });
      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });
      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [1, 1],
          "loc4": [25, 5]
        });
      }).then(function() {
        cl.x("p2");

        return geoFire.set({
          "loc1": [10, -100],
          "loc2": [50, -50],
          "loc5": [5, 5]
        });
      }).then(function() {
        cl.x("p3");

        return wait(100);
      }).then(function() {
        cl.x("p4");
      }).catch(failTestOnCaughtError);
    });

    it ("location moving between geohash queries triggers a key_moved", function(done) {
      var cl = new Checklist(["loc1 entered", "loc2 entered", "p1", "loc1 moved", "loc2 moved", "p2"], expect, done);

      geoQueries.push(geoFire.query({center: [0,0], radius: 1000}));

      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });
      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });
      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [-1, -1],
        "loc2": [1, 1]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [1, 1],
          "loc2": [-1, -1]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).catch(failTestOnCaughtError);
    });
  });

  describe("Cancelling GeoQuery:", function() {
    it ("cancel() prevents GeoQuery from firing any more \"key_*\" event callbacks", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 entered", "loc4 entered", "loc1 moved", "loc4 exited"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered");
      });
      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited");
      });
      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [1, 1],
          "loc4": [25, 5]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3")

        geoQueries[0].cancel();

        return wait(1000);
      }).then(function() {
        geoQueries[0].on("key_entered", function(key, location, distance) {
          cl.x(key + " entered");
        });
        geoQueries[0].on("key_exited", function(key, location, distance) {
          cl.x(key + " exited");
        });
        geoQueries[0].on("key_moved", function(key, location, distance) {
          cl.x(key + " moved");
        });

        return geoFire.set({
          "loc1": [10, -100],
          "loc2": [50, -50],
          "loc5": [5, 5]
        });
      }).then(function() {
        cl.x("p4");

        return wait(100);
      }).then(function() {
        cl.x("p5");
      }).catch(failTestOnCaughtError);
    });

    it("Calling cancel() on one GeoQuery does not cancel other GeoQueries", function(done) {
      var cl = new Checklist(["p1", "p2", "p3", "p4", "p5", "loc1 entered1", "loc1 entered2", "loc4 entered1", "loc4 entered2", "loc1 moved1", "loc1 moved2", "loc4 exited1", "loc4 exited2", "loc1 exited2", "loc5 entered2"], expect, done);

      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));
      geoQueries.push(geoFire.query({center: [1,2], radius: 1000}));

      geoQueries[0].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered1");
      });
      geoQueries[0].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited1");
      });
      geoQueries[0].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved1");
      });

      geoQueries[1].on("key_entered", function(key, location, distance) {
        cl.x(key + " entered2");
      });
      geoQueries[1].on("key_exited", function(key, location, distance) {
        cl.x(key + " exited2");
      });
      geoQueries[1].on("key_moved", function(key, location, distance) {
        cl.x(key + " moved2");
      });

      geoFire.set({
        "loc1": [2, 3],
        "loc2": [50, -7],
        "loc3": [16, -150],
        "loc4": [5, 5],
        "loc5": [67, 55]
      }).then(function() {
        cl.x("p1");

        return geoFire.set({
          "loc1": [1, 1],
          "loc4": [25, 5]
        });
      }).then(function() {
        cl.x("p2");

        return wait(100);
      }).then(function() {
        cl.x("p3")

        geoQueries[0].cancel();

        return geoFire.set({
          "loc1": [10, -100],
          "loc2": [50, -50],
          "loc5": [1, 2]
        });
      }).then(function() {
        cl.x("p4");

        return wait(100);
      }).then(function() {
        cl.x("p5");
      }).catch(failTestOnCaughtError);
    });
  });
});
