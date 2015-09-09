"use strict";

var chai = require("chai");
var expect = chai.expect;
var GeoFire = require("../../dist/geofire.js");
var TH = require("../helpers.js");

chai.should();
chai.use(require('chai-as-promised'));

describe("GeoCallbackRegistration", function() {
  var geoFire;
  var geoQueries;
  var eventsFired;
  var firebaseRef;


  before(function() {
    firebaseRef = TH.getRandomFirebaseRef();
    geoFire = new GeoFire(firebaseRef);
  });


  beforeEach(function() {
    eventsFired = {
      key_entered: [],
      key_exited: [],
      key_moved: []
    };

    geoQueries = [];
  });


  afterEach(function(done) {
    geoQueries.forEach(function(geoQuery) {
      geoQuery.cancel();
    });

    firebaseRef.remove(done);
  });


  describe("Constructor", function() {
    it("Constructor throws error given non-function", function() {
      var createCallbackRegistration = function() {
        GeoCallbackRegistration("nonFunction");
      }

      expect(createCallbackRegistration).to.throw();
    });
  });


  describe("Cancelling event callbacks", function() {
    it("\"key_moved\" registrations can be cancelled", function() {
      geoQueries.push(geoFire.query({ center: [1,2], radius: 1000 }));

      var onKeyMovedRegistration = geoQueries[0].on("key_moved", function(key) {
        eventsFired.key_moved.push(key);
      });

      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        return geoFire.set("loc1", [2, 2]);
      }).then(function() {
        onKeyMovedRegistration.cancel();
        return geoFire.set("loc3", [1, 2]);
      }).then(function() {
        expect(eventsFired.key_moved).to.deep.equal(['loc1'])
      });
    });

    it("\"key_entered\" registrations can be cancelled", function() {
      geoQueries.push(geoFire.query({ center: [1,2], radius: 1000 }));

      var onKeyEnteredRegistration = geoQueries[0].on("key_entered", function(key) {
        eventsFired.key_entered.push(key);
      });

      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [80, 80]
      }).then(function() {
        onKeyEnteredRegistration.cancel();
        return geoFire.set("loc3", [1, 2]);
      }).then(function() {
        expect(eventsFired.key_entered).to.deep.equal(['loc1'])
      });
    });

    it("\"key_exited\" registrations can be cancelled", function() {
      geoQueries.push(geoFire.query({ center: [1,2], radius: 1000 }));

      var onKeyExitedRegistration = geoQueries[0].on("key_exited", function(key) {
        eventsFired.key_exited.push(key);
      });

      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        return geoFire.set("loc1", [80, 80]);
      }).then(function() {
        onKeyExitedRegistration.cancel();
        return geoFire.set("loc3", [-80, -80]);
      }).then(function() {
        expect(eventsFired.key_exited).to.deep.equal(['loc1'])
      });
    });

    it("Cancelling a \"key_moved\" registration does not cancel all \"key_moved\" callbacks", function() {
      geoQueries.push(geoFire.query({ center: [1,2], radius: 1000 }));

      eventsFired.key_moved = {
        one: [],
        two: []
      };

      var onKeyMovedRegistration1 = geoQueries[0].on("key_moved", function(key) {
        eventsFired.key_moved['one'].push(key);
      });
      var onKeyMovedRegistration2 = geoQueries[0].on("key_moved", function(key) {
        eventsFired.key_moved['two'].push(key);
      });

      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        return geoFire.set("loc1", [2, 2]);
      }).then(function() {
        onKeyMovedRegistration1.cancel();
        return geoFire.set("loc3", [1, 2]);
      }).then(function() {
        expect(eventsFired.key_moved).to.deep.equal({
          one: ['loc1'],
          two: ['loc1', 'loc3']
        });
      });
    });

    it("Cancelling a \"key_entered\" registration does not cancel all \"key_entered\" callbacks", function() {
      geoQueries.push(geoFire.query({ center: [1,2], radius: 1000 }));

      eventsFired.key_entered = {
        one: [],
        two: []
      };

      var onKeyEnteredRegistration1 = geoQueries[0].on("key_entered", function(key) {
        eventsFired.key_entered['one'].push(key);
      });
      var onKeyEnteredRegistration2 = geoQueries[0].on("key_entered", function(key) {
        eventsFired.key_entered['two'].push(key);
      });

      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [80, 80]
      }).then(function() {
        onKeyEnteredRegistration1.cancel();
        return geoFire.set("loc3", [1, 2]);
      }).then(function() {
        expect(eventsFired.key_entered).to.deep.equal({
          one: ['loc1'],
          two: ['loc1', 'loc3']
        });
      });
    });

    it("Cancelling a \"key_exited\" registration does not cancel all \"key_exited\" callbacks", function() {
      geoQueries.push(geoFire.query({ center: [1,2], radius: 1000 }));

      eventsFired.key_exited = {
        one: [],
        two: []
      };

      var onKeyExitedRegistration1 = geoQueries[0].on("key_exited", function(key) {
        eventsFired.key_exited['one'].push(key);
      });
      var onKeyExitedRegistration2 = geoQueries[0].on("key_exited", function(key) {
        eventsFired.key_exited['two'].push(key);
      });

      return geoFire.set({
        "loc1": [0, 0],
        "loc2": [50, -7],
        "loc3": [1, 1]
      }).then(function() {
        return geoFire.set("loc1", [80, 80]);
      }).then(function() {
      }).then(function() {
        onKeyExitedRegistration1.cancel();
        return geoFire.set("loc3", [-80, -80]);
      }).then(function() {
        expect(eventsFired.key_exited).to.deep.equal({
          one: ['loc1'],
          two: ['loc1', 'loc3']
        });
      });
    });

    it("Calling cancel on a GeoCallbackRegistration twice does not throw", function() {
      geoQueries.push(geoFire.query({ center: [1,2], radius: 1000 }));

      var onKeyExitedRegistration = geoQueries[0].on("key_exited", function() {});

      expect(function() { onKeyExitedRegistration.cancel() }).not.to.throw();
      expect(function() { onKeyExitedRegistration.cancel() }).not.to.throw();
    });
  });
});
