import { GeoCallbackRegistration } from '../src';
import {
  afterEachHelper, beforeEachHelper, Checklist,
  failTestOnCaughtError, geoFire, geoQueries, wait
} from './common';

import * as chai from 'chai';

const expect = chai.expect;

describe('GeoFire GeoCallbackRegistration Tests:', () => {
  // Reset the Firebase before each test
  beforeEach((done) => {
    beforeEachHelper(done);
  });

  afterEach((done) => {
    afterEachHelper(done);
  });

  describe('Constructor:', () => {
    it('Constructor throws error given non-function', () => {
      const createCallbackRegistration = () => {
        // @ts-ignore 
        return new GeoCallbackRegistration('nonFunction');
      };

      expect(() => createCallbackRegistration()).to.throw(null, 'callback must be a function');
    });
  });

  describe('Cancelling event callbacks:', () => {
    it('\'key_moved\' registrations can be cancelled', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5', 'loc1 moved'], expect, done);

      geoQueries.push(geoFire.query({ center: [1, 2], radius: 1000 }));

      const onKeyMovedRegistration = geoQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFire.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFire.set('loc1', [2, 2]);
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        onKeyMovedRegistration.cancel();
        cl.x('p3');

        return geoFire.set('loc3', [1, 2]);
      }).then(() => {
        cl.x('p4');

        return wait(100);
      }).then(() => {
        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_entered\' registrations can be cancelled', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'loc1 entered'], expect, done);

      geoQueries.push(geoFire.query({ center: [1, 2], radius: 1000 }));

      const onKeyEnteredRegistration = geoQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });

      geoFire.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [80, 80]
      }).then(() => {
        cl.x('p1');

        return wait(100);
      }).then(() => {
        onKeyEnteredRegistration.cancel();
        cl.x('p2');

        return geoFire.set('loc3', [1, 2]);
      }).then(() => {
        cl.x('p3');

        return wait(100);
      }).then(() => {
        cl.x('p4');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_exited\' registrations can be cancelled', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5', 'loc1 exited'], expect, done);

      geoQueries.push(geoFire.query({ center: [1, 2], radius: 1000 }));

      const onKeyExitedRegistration = geoQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });

      geoFire.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFire.set('loc1', [80, 80]);
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        onKeyExitedRegistration.cancel();
        cl.x('p3');

        return geoFire.set('loc3', [-80, -80]);
      }).then(() => {
        cl.x('p4');

        return wait(100);
      }).then(() => {
        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('Cancelling a \'key_moved\' registration does not cancel all \'key_moved\' callbacks', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5', 'loc1 moved1', 'loc1 moved2', 'loc3 moved2'], expect, done);

      geoQueries.push(geoFire.query({ center: [1, 2], radius: 1000 }));

      const onKeyMovedRegistration1 = geoQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved1');
      });
      const onKeyMovedRegistration2 = geoQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved2');
      });

      geoFire.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFire.set('loc1', [2, 2]);
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        onKeyMovedRegistration1.cancel();
        cl.x('p3');

        return geoFire.set('loc3', [1, 2]);
      }).then(() => {
        cl.x('p4');

        return wait(100);
      }).then(() => {
        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('Cancelling a \'key_entered\' registration does not cancel all \'key_entered\' callbacks', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'loc1 entered1', 'loc1 entered2', 'loc3 entered2'], expect, done);

      geoQueries.push(geoFire.query({ center: [1, 2], radius: 1000 }));

      const onKeyEnteredRegistration1 = geoQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered1');
      });
      const onKeyEnteredRegistration2 = geoQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered2');
      });

      geoFire.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [80, 80]
      }).then(() => {
        cl.x('p1');

        return wait(100);
      }).then(() => {
        onKeyEnteredRegistration1.cancel();
        cl.x('p2');

        return geoFire.set('loc3', [1, 2]);
      }).then(() => {
        cl.x('p3');

        return wait(100);
      }).then(() => {
        cl.x('p4');
      }).catch(failTestOnCaughtError);
    });

    it('Cancelling a \'key_exited\' registration does not cancel all \'key_exited\' callbacks', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5', 'loc1 exited1', 'loc1 exited2', 'loc3 exited2'], expect, done);

      geoQueries.push(geoFire.query({ center: [1, 2], radius: 1000 }));

      const onKeyExitedRegistration1 = geoQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited1');
      });
      const onKeyExitedRegistration2 = geoQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited2');
      });

      geoFire.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFire.set('loc1', [80, 80]);
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        onKeyExitedRegistration1.cancel();
        cl.x('p3');

        return geoFire.set('loc3', [-80, -80]);
      }).then(() => {
        cl.x('p4');

        return wait(100);
      }).then(() => {
        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('Calling cancel on a GeoCallbackRegistration twice does not throw', () => {
      geoQueries.push(geoFire.query({ center: [1, 2], radius: 1000 }));

      const onKeyExitedRegistration = geoQueries[0].on('key_exited', () => { });

      expect(() => onKeyExitedRegistration.cancel()).not.throw();
      expect(() => onKeyExitedRegistration.cancel()).not.throw();
    });
  });
});
