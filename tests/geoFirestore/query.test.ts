import * as chai from 'chai';

import {
  afterEachHelperFirestore, beforeEachHelperFirestore, Checklist, failTestOnCaughtError, geoFirestore, geoFirestoreQueries, invalidQueryCriterias, validQueryCriterias, wait
} from '../common';

const expect = chai.expect;

describe('GeoFirestoreQuery Tests:', () => {
  // Reset the Firestore before each test
  beforeEach((done) => {
    beforeEachHelperFirestore(done);
  });

  afterEach((done) => {
    afterEachHelperFirestore(done);
  });

  describe('Constructor:', () => {
    it('Constructor stores query criteria', () => {
      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      expect(geoFirestoreQueries[0].center()).to.deep.equal([1, 2]);
      expect(geoFirestoreQueries[0].radius()).to.equal(1000);
    });

    it('Constructor throws error on invalid query criteria', () => {
      expect(() => geoFirestore.query({})).to.throw();
      // @ts-ignore
      expect(() => geoFirestore.query({ random: 100 })).to.throw();
      expect(() => geoFirestore.query({ center: [1, 2] })).to.throw();
      expect(() => geoFirestore.query({ radius: 1000 })).to.throw();
      expect(() => geoFirestore.query({ center: [91, 2], radius: 1000 })).to.throw();
      expect(() => geoFirestore.query({ center: [1, -181], radius: 1000 })).to.throw();
      // @ts-ignore
      expect(() => geoFirestore.query({ center: ['text', 2], radius: 1000 })).to.throw();
      // @ts-ignore
      expect(() => geoFirestore.query({ center: [1, [1, 2]], radius: 1000 })).to.throw();
      // @ts-ignore
      expect(() => geoFirestore.query({ center: 1000, radius: 1000 })).to.throw();
      expect(() => geoFirestore.query({ center: null, radius: 1000 })).to.throw();
      expect(() => geoFirestore.query({ center: undefined, radius: 1000 })).to.throw();
      expect(() => geoFirestore.query({ center: [null, 2], radius: 1000 })).to.throw();
      expect(() => geoFirestore.query({ center: [1, undefined], radius: 1000 })).to.throw();
      expect(() => geoFirestore.query({ center: [1, 2], radius: -10 })).to.throw();
      // @ts-ignore
      expect(() => geoFirestore.query({ center: [1, 2], radius: 'text' })).to.throw();
      // @ts-ignore
      expect(() => geoFirestore.query({ center: [1, 2], radius: [1, 2] })).to.throw();
      expect(() => geoFirestore.query({ center: [1, 2], radius: null })).to.throw();
      expect(() => geoFirestore.query({ center: [1, 2], radius: undefined })).to.throw();
      // @ts-ignore
      expect(() => geoFirestore.query({ center: [1, 2], radius: 1000, other: 'throw' })).to.throw();
    });
  });

  describe('updateCriteria():', () => {
    it('updateCriteria() updates query criteria', () => {
      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      expect(geoFirestoreQueries[0].center()).to.deep.equal([1, 2]);
      expect(geoFirestoreQueries[0].radius()).to.equal(1000);

      geoFirestoreQueries[0].updateCriteria({ center: [2, 3], radius: 100 });

      expect(geoFirestoreQueries[0].center()).to.deep.equal([2, 3]);
      expect(geoFirestoreQueries[0].radius()).to.equal(100);
    });

    it('updateCriteria() updates query criteria when given only center', () => {
      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      expect(geoFirestoreQueries[0].center()).to.deep.equal([1, 2]);
      expect(geoFirestoreQueries[0].radius()).to.equal(1000);

      geoFirestoreQueries[0].updateCriteria({ center: [2, 3] });

      expect(geoFirestoreQueries[0].center()).to.deep.equal([2, 3]);
      expect(geoFirestoreQueries[0].radius()).to.equal(1000);
    });

    it('updateCriteria() updates query criteria when given only radius', () => {
      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      expect(geoFirestoreQueries[0].center()).to.deep.equal([1, 2]);
      expect(geoFirestoreQueries[0].radius()).to.equal(1000);

      geoFirestoreQueries[0].updateCriteria({ radius: 100 });

      expect(geoFirestoreQueries[0].center()).to.deep.equal([1, 2]);
      expect(geoFirestoreQueries[0].radius()).to.equal(100);
    });

    it('updateCriteria() fires \'key_entered\' callback for locations which now belong to the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'loc1 entered', 'loc4 entered'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [90, 90], radius: 1000 }));
      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        geoFirestoreQueries[0].updateCriteria({ center: [1, 2], radius: 1000 });

        return wait(100);
      }).then(() => {
        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });

    it('updateCriteria() fires \'key_entered\' callback for locations with complex keys which now belong to the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'loc:^:*1 entered', 'loc-+-+-4 entered'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [90, 90], radius: 1000 }));
      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });

      geoFirestore.set({
        'loc:^:*1': [2, 3],
        'loc:a:a:a:a:2': [50, -7],
        'loc%!@3': [16, -150],
        'loc-+-+-4': [5, 5],
        'loc:5': [67, 55]
      }).then(() => {
        cl.x('p1');

        geoFirestoreQueries[0].updateCriteria({ center: [1, 2], radius: 1000 });

        return wait(100);
      }).then(() => {
        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });

    it('updateCriteria() fires \'key_exited\' callback for locations which no longer belong to the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'loc1 exited', 'loc4 exited'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));
      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        geoFirestoreQueries[0].updateCriteria({ center: [90, 90], radius: 1000 });

        return wait(100);
      }).then(() => {
        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });

    it('updateCriteria() does not cause event callbacks to fire on the previous criteria', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'loc1 entered', 'loc4 entered', 'loc1 exited', 'loc4 exited', 'loc4 entered', 'loc5 entered'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));
      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });
      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [88, 88]
      }).then(() => {
        cl.x('p1');

        geoFirestoreQueries[0].updateCriteria({ center: [90, 90], radius: 1000 });

        return wait(100);
      }).then(() => {
        cl.x('p2');

        return geoFirestore.set({
          'loc2': [1, 1],
          'loc4': [89, 90]
        });
      }).then(() => {
        cl.x('p3');

        return wait(100);
      }).then(() => {
        cl.x('p4');
      }).catch(failTestOnCaughtError);
    });

    it('updateCriteria() does not cause \'key_moved\' callbacks to fire for keys in both the previous and updated queries', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'loc1 entered', 'loc4 entered', 'loc4 exited', 'loc2 entered'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));
      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });
      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });
      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [88, 88]
      }).then(() => {
        cl.x('p1');

        geoFirestoreQueries[0].updateCriteria({ center: [1, 1], radius: 1000 });

        return wait(100);
      }).then(() => {
        cl.x('p2');

        return geoFirestore.set({
          'loc2': [1, 1],
          'loc4': [89, 90]
        });
      }).then(() => {
        cl.x('p3');

        return wait(100);
      }).then(() => {
        cl.x('p4');
      }).catch(failTestOnCaughtError);
    });

    it('updateCriteria() does not cause \'key_exited\' callbacks to fire twice for keys in the previous query but not in the updated query and which were moved after the query was updated', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'loc1 entered', 'loc4 entered', 'loc1 exited', 'loc4 exited', 'loc4 entered', 'loc5 entered', 'loc5 moved'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));
      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });
      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });
      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });


      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [88, 88]
      }).then(() => {
        cl.x('p1');

        geoFirestoreQueries[0].updateCriteria({ center: [90, 90], radius: 1000 });

        return wait(100);
      }).then(() => {
        cl.x('p2');

        return geoFirestore.set({
          'loc2': [1, 1],
          'loc4': [89, 90]
        });
      }).then(() => {
        cl.x('p3');

        return wait(100);
      }).then(() => {
        cl.x('p4');

        return geoFirestore.set({
          'loc2': [0, 0],
          'loc5': [89, 89]
        });
      }).then(() => {
        cl.x('p5');

        return wait(100);
      }).then(() => {
        cl.x('p6');
      }).catch(failTestOnCaughtError);
    });

    it('updateCriteria() does not throw errors given valid query criteria', () => {
      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      validQueryCriterias.forEach((validQueryCriteria) => {
        expect(() => geoFirestoreQueries[0].updateCriteria(validQueryCriteria)).not.to.throw();
      });
    });

    it('updateCriteria() throws errors given invalid query criteria', () => {
      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      invalidQueryCriterias.forEach((invalidQueryCriteria) => {
        // @ts-ignore
        expect(() => geoFirestoreQueries[0].updateCriteria(invalidQueryCriteria)).to.throw();
      });
    });
  });

  describe('on():', () => {
    it('on() throws error given invalid event type', () => {
      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      const setInvalidEventType = () => {
        geoFirestoreQueries[0].on('invalid_event', () => { });
      }

      expect(setInvalidEventType).to.throw();
    });

    it('on() throws error given invalid callback', () => {
      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      const setInvalidCallback = () => {
        // @ts-ignore
        geoFirestoreQueries[0].on('key_entered', 'non-function');
      }

      expect(setInvalidCallback).to.throw();
    });
  });

  describe('\'ready\' event:', () => {
    it('\'ready\' event fires after all \'key_entered\' events have fired', (done) => {
      const cl = new Checklist(['p1', 'loc1 entered', 'loc2 entered', 'loc5 entered', 'loc6 entered', 'loc7 entered', 'loc10 entered', 'ready fired'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [1, 1],
        'loc3': [50, 50],
        'loc4': [14, 1],
        'loc5': [1, 2],
        'loc6': [1, 1],
        'loc7': [0, 0],
        'loc8': [-80, 44],
        'loc9': [1, -136],
        'loc10': [-2, -2]
      }).then(() => {
        cl.x('p1');

        geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

        geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
          cl.x(key + ' entered');
        });

        geoFirestoreQueries[0].on('ready', () => {
          expect(cl.length()).to.be.equal(1);
          cl.x('ready fired');
        });
      });
    });

    it('\'ready\' event fires immediately if the callback is added after the query is already ready', (done) => {
      const cl = new Checklist(['p1', 'loc1 entered', 'loc2 entered', 'loc5 entered', 'loc6 entered', 'loc7 entered', 'loc10 entered', 'ready1 fired', 'ready2 fired'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [1, 1],
        'loc3': [50, 50],
        'loc4': [14, 1],
        'loc5': [1, 2],
        'loc6': [1, 1],
        'loc7': [0, 0],
        'loc8': [-80, 44],
        'loc9': [1, -136],
        'loc10': [-2, -2]
      }).then(() => {
        cl.x('p1');

        geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

        geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
          cl.x(key + ' entered');
        });

        geoFirestoreQueries[0].on('ready', () => {
          expect(cl.length()).to.be.equal(2);
          cl.x('ready1 fired');
          geoFirestoreQueries[0].on('ready', () => {
            expect(cl.length()).to.be.equal(1);
            cl.x('ready2 fired');
          });
        });
      });
    });

    it('\'ready\' event fires after increasing the query radius, even if no new geohashes were queried', (done) => {
      const cl = new Checklist(['ready1 fired', 'ready2 fired'], expect, done);
      geoFirestoreQueries.push(geoFirestore.query({ center: [37.7851382, -122.405893], radius: 6 }));
      const onReadyCallbackRegistration1 = geoFirestoreQueries[0].on('ready', () => {
        cl.x('ready1 fired');
        onReadyCallbackRegistration1.cancel();
        geoFirestoreQueries[0].updateCriteria({
          radius: 7
        });
        geoFirestoreQueries[0].on('ready', () => {
          cl.x('ready2 fired');
        });
      });
    });

    it('updateCriteria() fires the \'ready\' event after all \'key_entered\' events have fired', (done) => {
      const cl = new Checklist(['p1', 'loc1 entered', 'loc2 entered', 'loc5 entered', 'loc3 entered', 'loc1 exited', 'loc2 exited', 'loc5 exited', 'ready1 fired', 'ready2 fired'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [1, 1],
        'loc3': [50, 50],
        'loc4': [14, 1],
        'loc5': [1, 2]
      }).then(() => {
        cl.x('p1');

        geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

        geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
          cl.x(key + ' entered');
        });

        geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
          cl.x(key + ' exited');
        });

        const onReadyCallbackRegistration1 = geoFirestoreQueries[0].on('ready', () => {
          expect(cl.length()).to.be.equal(6);
          cl.x('ready1 fired');

          onReadyCallbackRegistration1.cancel();

          geoFirestoreQueries[0].updateCriteria({
            center: [51, 51]
          });

          geoFirestoreQueries[0].on('ready', () => {
            expect(cl.length()).to.be.equal(1);
            cl.x('ready2 fired');
          });
        });
      });
    });
  });

  describe('\'key_moved\' event:', () => {
    it('\'key_moved\' callback does not fire for brand new locations within or outside of the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return wait(100);
      }).then(() => {
        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_moved\' callback does not fire for locations outside of the GeoFirestoreQuery which are moved somewhere else outside of the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [1, 90],
        'loc2': [50, -7],
        'loc3': [16, -150]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [1, 91],
          'loc3': [-50, -50]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_moved\' callback does not fire for locations outside of the GeoFirestoreQuery which are moved within the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [1, 90],
        'loc2': [50, -7],
        'loc3': [16, -150]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [0, 0],
          'loc3': [-1, -1]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_moved\' callback does not fire for locations within the GeoFirestoreQuery which are moved somewhere outside of the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [1, 90],
          'loc3': [-1, -90]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_moved\' callback does not fires for a location within the GeoFirestoreQuery which is set to the same location', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc3 moved'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [1, -1]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [0, 0],
          'loc2': [55, 55],
          'loc3': [1, 1]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_moved\' callback fires for locations within the GeoFirestoreQuery which are moved somewhere else within the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 moved', 'loc3 moved'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [2, 2],
          'loc3': [-1, -1]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_moved\' callback gets passed correct location parameter', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 moved to 2,2', 'loc3 moved to -1,-1'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved to ' + location);
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [2, 2],
          'loc3': [-1, -1]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_moved\' callback gets passed correct distance parameter', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 moved (111.19 km from center)', 'loc3 moved (400.90 km from center)'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved (' + distance.toFixed(2) + ' km from center)');
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [2, 2],
          'loc3': [-1, -1]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_moved\' callback properly fires when multiple keys are at the same location within the GeoFirestoreQuery and only one of them moves somewhere else within the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 moved', 'loc3 moved'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [0, 0],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [2, 2],
          'loc3': [-1, -1]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_moved\' callback properly fires when a location within the GeoFirestoreQuery moves somehwere else within the GeoFirestoreQuery that is already occupied by another key', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 moved', 'loc3 moved'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [2, 2],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [2, 2],
          'loc3': [-1, -1]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('multiple \'key_moved\' callbacks fire for locations within the GeoFirestoreQuery which are moved somewhere else within the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 moved1', 'loc3 moved1', 'loc1 moved2', 'loc3 moved2'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved1');
      });
      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved2');
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, -7],
        'loc3': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [2, 2],
          'loc3': [-1, -1]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });
  });

  describe('\'key_entered\' event:', () => {
    it('\'key_entered\' callback fires when a location enters the GeoFirestoreQuery before onKeyEntered() was called', (done) => {
      const cl = new Checklist(['p1', 'p2', 'loc1 entered', 'loc4 entered'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
          cl.x(key + ' entered');
        });

        return wait(100);
      }).then(() => {
        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_entered\' callback fires when a location enters the GeoFirestoreQuery after onKeyEntered() was called', (done) => {
      const cl = new Checklist(['p1', 'p2', 'loc1 entered', 'loc4 entered'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        return wait(100);
      }).then(() => {
        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_entered\' callback gets passed correct location parameter', (done) => {
      const cl = new Checklist(['p1', 'p2', 'loc1 entered at 2,3', 'loc4 entered at 5,5'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered at ' + location);
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        return wait(100);
      }).then(() => {
        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_entered\' callback gets passed correct distance parameter', (done) => {
      const cl = new Checklist(['p1', 'p2', 'loc1 entered (157.23 km from center)', 'loc4 entered (555.66 km from center)'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered (' + distance.toFixed(2) + ' km from center)');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        return wait(100);
      }).then(() => {
        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_entered\' callback properly fires when multiple keys are at the same location outside the GeoFirestoreQuery and only one of them moves within the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 entered'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });

      geoFirestore.set({
        'loc1': [50, 50],
        'loc2': [50, 50],
        'loc3': [18, -121]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set('loc1', [2, 2]);
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_entered\' callback properly fires when a location outside the GeoFirestoreQuery moves somewhere within the GeoFirestoreQuery that is already occupied by another key', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 entered', 'loc3 entered'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });

      geoFirestore.set({
        'loc1': [50, 50],
        'loc2': [50, 50],
        'loc3': [0, 0]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set('loc1', [0, 0]);
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('multiple \'key_entered\' callbacks fire when a location enters the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'loc1 entered1', 'loc4 entered1', 'loc1 entered2', 'loc4 entered2'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered1');
      });
      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered2');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        return wait(100);
      }).then(() => {
        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });
  });

  describe('\'key_exited\' event:', () => {
    it('\'key_exited\' callback fires when a location leaves the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 exited', 'loc4 exited'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [25, 90],
          'loc4': [25, 5]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_exited\' callback gets passed correct location parameter', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 exited to 25,90', 'loc4 exited to 25,5'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited to ' + location);
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [5, 2],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [25, 90],
          'loc2': [5, 5],
          'loc4': [25, 5]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_exited\' callback gets passed correct distance parameter', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 exited (9759.01 km from center)', 'loc4 exited (2688.06 km from center)'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited (' + distance.toFixed(2) + ' km from center)');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [5, 2],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [25, 90],
          'loc2': [5, 5],
          'loc4': [25, 5]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_exited\' callback gets passed null for location and distance parameters if the key is entirely removed from GeoFire', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 exited'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        expect(location).to.be.equal(null);
        expect(distance).to.be.equal(null);
        cl.x(key + ' exited');
      });

      geoFirestore.set('loc1', [2, 3]).then(() => {
        cl.x('p1');

        return geoFirestore.remove('loc1');
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_exited\' callback fires when a location within the GeoFirestoreQuery is entirely removed from GeoFire', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 exited'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [2, 3]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.remove('loc1');
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_exited\' callback properly fires when multiple keys are at the same location inside the GeoFirestoreQuery and only one of them moves outside the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 exited'], expect, done);
      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [0, 0],
        'loc3': [18, -121]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set('loc1', [20, -55]);
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('\'key_exited\' callback properly fires when a location inside the GeoFirestoreQuery moves somewhere outside the GeoFirestoreQuery that is already occupied by another key', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 exited'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, 50],
        'loc3': [18, -121]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set('loc1', [18, -121]);
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('multiple \'key_exited\' callbacks fire when a location leaves the GeoFirestoreQuery', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'loc1 exited1', 'loc4 exited1', 'loc1 exited2', 'loc4 exited2'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited1');
      });
      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited2');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [25, 90],
          'loc4': [25, 5]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });
  });

  describe('\'key_*\' events combined:', () => {
    it('\'key_*\' event callbacks fire when used all at the same time', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'loc1 entered', 'loc4 entered', 'loc1 moved', 'loc4 exited', 'loc1 exited', 'loc5 entered'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });
      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });
      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [1, 1],
          'loc4': [25, 5]
        });
      }).then(() => {
        cl.x('p2');

        return geoFirestore.set({
          'loc1': [10, -100],
          'loc2': [50, -50],
          'loc5': [5, 5]
        });
      }).then(() => {
        cl.x('p3');

        return wait(100);
      }).then(() => {
        cl.x('p4');
      }).catch(failTestOnCaughtError);
    });

    it('location moving between geohash queries triggers a key_moved', (done) => {
      const cl = new Checklist(['loc1 entered', 'loc2 entered', 'p1', 'loc1 moved', 'loc2 moved', 'p2'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [0, 0], radius: 1000 }));

      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });
      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });
      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [-1, -1],
        'loc2': [1, 1]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [1, 1],
          'loc2': [-1, -1]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).catch(failTestOnCaughtError);
    });
  });

  describe('Cancelling GeoFirestoreQuery:', () => {
    it('cancel() prevents GeoFirestoreQuery from firing any more \'key_*\' event callbacks', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5', 'loc1 entered', 'loc4 entered', 'loc1 moved', 'loc4 exited'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered');
      });
      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited');
      });
      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [1, 1],
          'loc4': [25, 5]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3')

        geoFirestoreQueries[0].cancel();

        return wait(1000);
      }).then(() => {
        geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
          cl.x(key + ' entered');
        });
        geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
          cl.x(key + ' exited');
        });
        geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
          cl.x(key + ' moved');
        });

        return geoFirestore.set({
          'loc1': [10, -100],
          'loc2': [50, -50],
          'loc5': [5, 5]
        });
      }).then(() => {
        cl.x('p4');

        return wait(100);
      }).then(() => {
        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('Calling cancel() on one GeoFirestoreQuery does not cancel other GeoQueries', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5', 'loc1 entered1', 'loc1 entered2', 'loc4 entered1', 'loc4 entered2', 'loc1 moved1', 'loc1 moved2', 'loc4 exited1', 'loc4 exited2', 'loc1 exited2', 'loc5 entered2'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));
      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered1');
      });
      geoFirestoreQueries[0].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited1');
      });
      geoFirestoreQueries[0].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved1');
      });

      geoFirestoreQueries[1].on('key_entered', (key, location, distance) => {
        cl.x(key + ' entered2');
      });
      geoFirestoreQueries[1].on('key_exited', (key, location, distance) => {
        cl.x(key + ' exited2');
      });
      geoFirestoreQueries[1].on('key_moved', (key, location, distance) => {
        cl.x(key + ' moved2');
      });

      geoFirestore.set({
        'loc1': [2, 3],
        'loc2': [50, -7],
        'loc3': [16, -150],
        'loc4': [5, 5],
        'loc5': [67, 55]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [1, 1],
          'loc4': [25, 5]
        });
      }).then(() => {
        cl.x('p2');

        return wait(100);
      }).then(() => {
        cl.x('p3')

        geoFirestoreQueries[0].cancel();

        return geoFirestore.set({
          'loc1': [10, -100],
          'loc2': [50, -50],
          'loc5': [1, 2]
        });
      }).then(() => {
        cl.x('p4');

        return wait(100);
      }).then(() => {
        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('Calling cancel() in the middle of firing \'key_entered\' events is allowed', (done) => {
      const cl = new Checklist(['p1', 'key entered', 'cancel query'], expect, done);

      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      geoFirestore.set({
        'loc1': [1, 2],
        'loc2': [1, 3],
        'loc3': [1, 4]
      }).then(() => {
        cl.x('p1');

        let numKeyEnteredEventsFired = 0;
        geoFirestoreQueries[0].on('key_entered', (key, location, distance) => {
          cl.x('key entered');
          numKeyEnteredEventsFired++;
          if (numKeyEnteredEventsFired === 1) {
            cl.x('cancel query');
            geoFirestoreQueries[0].cancel();
          }
        });
      }).catch(failTestOnCaughtError);
    });
  });
});
