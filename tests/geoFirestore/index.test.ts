import * as chai from 'chai';

import { GeoFirestore } from '../../src/geoFirestore';
import { GeoFirestoreQuery } from '../../src/geoFirestore/query';
import {
  afterEachHelperFirestore, beforeEachHelperFirestore, Checklist, failTestOnCaughtError, geoFirestore, geoFirestoreRef, getFirestoreData, geoFirestoreQueries,
  invalidFirebaseRefs, invalidKeys, invalidLocations, invalidQueryCriterias, validKeys, validLocations, validQueryCriterias
} from '../common';

const expect = chai.expect;

describe('GeoFirestore Tests:', () => {
  // Reset the Firestore before each test
  beforeEach((done) => {
    beforeEachHelperFirestore(done);
  });

  afterEach((done) => {
    afterEachHelperFirestore(done);
  });

  describe('Constructor:', () => {
    it('Constructor throws errors given invalid Firebase references', () => {
      invalidFirebaseRefs.forEach((invalidFirebaseRef) => {
        // @ts-ignore
        expect(() => new GeoFirestore(invalidFirebaseRef)).to.throw(null, 'collectionRef must be an instance of a Firestore Collection');
      });
    });

    it('Constructor does not throw errors given valid Firebase references', () => {
      expect(() => new GeoFirestore(geoFirestoreRef)).not.to.throw();
    });
  });

  describe('ref():', () => {
    it('ref() returns the Firebase reference used to create a GeoFire instance', () => {
      expect(geoFirestore.ref()).to.deep.equal(geoFirestoreRef);
    });
  });

  describe('Adding a single location via set():', () => {
    it('set() returns a promise', (done) => {

      const cl = new Checklist(['p1'], expect, done);

      geoFirestore.set('loc1', [0, 0]).then(() => {
        cl.x('p1');
      });
    });

    it('set() updates Firebase when adding new locations', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4'], expect, done);

      geoFirestore.set('loc1', [0, 0]).then(() => {
        cl.x('p1');

        return geoFirestore.set('loc2', [50, 50]);
      }).then(() => {
        cl.x('p2');

        return geoFirestore.set('loc3', [-90, -90]);
      }).then(() => {
        cl.x('p3');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' },
          'loc2': { '.priority': 'v0gs3y0zh7', 'l': [50, 50], 'g': 'v0gs3y0zh7' },
          'loc3': { '.priority': '1bpbpbpbpb', 'l': [-90, -90], 'g': '1bpbpbpbpb' }
        });

        cl.x('p4');
      }).catch((error) => {
        failTestOnCaughtError(error)
      });
    });

    it('set() handles decimal latitudes and longitudes', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4'], expect, done);

      geoFirestore.set('loc1', [0.254, 0]).then(() => {
        cl.x('p1');

        return geoFirestore.set('loc2', [50, 50.293403]);
      }).then(() => {
        cl.x('p2');

        return geoFirestore.set('loc3', [-82.614, -90.938]);
      }).then(() => {
        cl.x('p3');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': 'ebpcrypzxv', 'l': [0.254, 0], 'g': 'ebpcrypzxv' },
          'loc2': { '.priority': 'v0gu2qnx15', 'l': [50, 50.293403], 'g': 'v0gu2qnx15' },
          'loc3': { '.priority': '1cr648sfx4', 'l': [-82.614, -90.938], 'g': '1cr648sfx4' }
        });

        cl.x('p4');
      }).catch(failTestOnCaughtError);
    });

    it('set() updates Firebase when changing a pre-existing key', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5'], expect, done);

      geoFirestore.set('loc1', [0, 0]).then(() => {
        cl.x('p1');

        return geoFirestore.set('loc2', [50, 50]);
      }).then(() => {
        cl.x('p2');

        return geoFirestore.set('loc3', [-90, -90]);
      }).then(() => {
        cl.x('p3');

        return geoFirestore.set('loc1', [2, 3]);
      }).then(() => {
        cl.x('p4');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': 's065kk0dc5', 'l': [2, 3], 'g': 's065kk0dc5' },
          'loc2': { '.priority': 'v0gs3y0zh7', 'l': [50, 50], 'g': 'v0gs3y0zh7' },
          'loc3': { '.priority': '1bpbpbpbpb', 'l': [-90, -90], 'g': '1bpbpbpbpb' }
        });

        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('set() updates Firebase when changing a pre-existing key to the same location', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5'], expect, done);

      geoFirestore.set('loc1', [0, 0]).then(() => {
        cl.x('p1');

        return geoFirestore.set('loc2', [50, 50]);
      }).then(() => {
        cl.x('p2');

        return geoFirestore.set('loc3', [-90, -90]);
      }).then(() => {
        cl.x('p3');

        return geoFirestore.set('loc1', [0, 0]);
      }).then(() => {
        cl.x('p4');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' },
          'loc2': { '.priority': 'v0gs3y0zh7', 'l': [50, 50], 'g': 'v0gs3y0zh7' },
          'loc3': { '.priority': '1bpbpbpbpb', 'l': [-90, -90], 'g': '1bpbpbpbpb' }
        });

        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('set() handles multiple keys at the same location', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4'], expect, done);

      geoFirestore.set('loc1', [0, 0]).then(() => {
        cl.x('p1');

        return geoFirestore.set('loc2', [0, 0]);
      }).then(() => {
        cl.x('p2');

        return geoFirestore.set('loc3', [0, 0]);
      }).then(() => {
        cl.x('p3');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' },
          'loc2': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' },
          'loc3': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' }
        });

        cl.x('p4');
      }).catch(failTestOnCaughtError);
    });

    it('set() updates Firebase after complex operations', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'], expect, done);

      geoFirestore.set('loc:1', [0, 0]).then(() => {
        cl.x('p1');

        return geoFirestore.set('loc2', [50, 50]);
      }).then(() => {
        cl.x('p2');

        return geoFirestore.set('loc%!A72f()3', [-90, -90]);
      }).then(() => {
        cl.x('p3');

        return geoFirestore.remove('loc2');
      }).then(() => {
        cl.x('p4');

        return geoFirestore.set('loc2', [0.2358, -72.621]);
      }).then(() => {
        cl.x('p5');

        return geoFirestore.set('loc4', [87.6, -130]);
      }).then(() => {
        cl.x('p6');

        return geoFirestore.set('loc5', [5, 55.555]);
      }).then(() => {
        cl.x('p7');

        return geoFirestore.set('loc5', null);
      }).then(() => {
        cl.x('p8');

        return geoFirestore.set('loc:1', [87.6, -130]);
      }).then(() => {
        cl.x('p9');

        return geoFirestore.set('loc6', [-72.258, 0.953215]);
      }).then(() => {
        cl.x('p10');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc:1': { '.priority': 'cped3g0fur', 'l': [87.6, -130], 'g': 'cped3g0fur' },
          'loc2': { '.priority': 'd2h376zj8h', 'l': [0.2358, -72.621], 'g': 'd2h376zj8h' },
          'loc%!A72f()3': { '.priority': '1bpbpbpbpb', 'l': [-90, -90], 'g': '1bpbpbpbpb' },
          'loc4': { '.priority': 'cped3g0fur', 'l': [87.6, -130], 'g': 'cped3g0fur' },
          'loc6': { '.priority': 'h50svty4es', 'l': [-72.258, 0.953215], 'g': 'h50svty4es' }
        });

        cl.x('p11');
      }).catch(failTestOnCaughtError);
    });

    it('set() does not throw errors given valid keys', () => {
      validKeys.forEach((validKey) => {
        expect(() => {
          geoFirestore.set(validKey, [0, 0]);
        }).not.to.throw();
      });
    });

    it('set() throws errors given invalid keys', () => {
      invalidKeys.forEach((invalidKey) => {
        expect(() => {
          geoFirestore.set(invalidKey, [0, 0]);
        }).to.throw();
      });
    });

    it('set() does not throw errors given valid locations', () => {
      validLocations.forEach((validLocation) => {
        expect(() => {
          geoFirestore.set('loc', validLocation);
        }).not.to.throw();
      });
    });

    it('set() throws errors given invalid locations', () => {
      invalidLocations.forEach((invalidLocation) => {
        // Setting location to null is valid since it will remove the key
        if (invalidLocation !== null) {
          expect(() => {
            // @ts-ignore
            geoFirestore.set('loc', invalidLocation);
          }).to.throw(Error, /Invalid GeoFire location/);
        }
      });
    });
  });

  describe('Adding multiple locations via set():', () => {
    it('set() returns a promise', (done) => {

      const cl = new Checklist(['p1'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0]
      }).then(() => {
        cl.x('p1');
      });
    });

    it('set() updates Firebase when adding new locations', (done) => {
      const cl = new Checklist(['p1', 'p2'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, 50],
        'loc3': [-90, -90]
      }).then(() => {
        cl.x('p1');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' },
          'loc2': { '.priority': 'v0gs3y0zh7', 'l': [50, 50], 'g': 'v0gs3y0zh7' },
          'loc3': { '.priority': '1bpbpbpbpb', 'l': [-90, -90], 'g': '1bpbpbpbpb' }
        });

        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });

    it('set() handles decimal latitudes and longitudes', (done) => {
      const cl = new Checklist(['p1', 'p2'], expect, done);

      geoFirestore.set({
        'loc1': [0.254, 0],
        'loc2': [50, 50.293403],
        'loc3': [-82.614, -90.938]
      }).then(() => {
        cl.x('p1');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': 'ebpcrypzxv', 'l': [0.254, 0], 'g': 'ebpcrypzxv' },
          'loc2': { '.priority': 'v0gu2qnx15', 'l': [50, 50.293403], 'g': 'v0gu2qnx15' },
          'loc3': { '.priority': '1cr648sfx4', 'l': [-82.614, -90.938], 'g': '1cr648sfx4' }
        });

        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });

    it('set() updates Firebase when changing a pre-existing key', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, 50],
        'loc3': [-90, -90]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [2, 3]
        });
      }).then(() => {
        cl.x('p2');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': 's065kk0dc5', 'l': [2, 3], 'g': 's065kk0dc5' },
          'loc2': { '.priority': 'v0gs3y0zh7', 'l': [50, 50], 'g': 'v0gs3y0zh7' },
          'loc3': { '.priority': '1bpbpbpbpb', 'l': [-90, -90], 'g': '1bpbpbpbpb' }
        });

        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('set() updates Firebase when changing a pre-existing key to the same location', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, 50],
        'loc3': [-90, -90]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.set({
          'loc1': [0, 0]
        });
      }).then(() => {
        cl.x('p2');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' },
          'loc2': { '.priority': 'v0gs3y0zh7', 'l': [50, 50], 'g': 'v0gs3y0zh7' },
          'loc3': { '.priority': '1bpbpbpbpb', 'l': [-90, -90], 'g': '1bpbpbpbpb' }
        });

        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('set() handles multiple keys at the same location', (done) => {
      const cl = new Checklist(['p1', 'p2'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [0, 0],
        'loc3': [0, 0]
      }).then(() => {
        cl.x('p1');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' },
          'loc2': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' },
          'loc3': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' }
        });

        cl.x('p2');
      }).catch(failTestOnCaughtError);
    });

    it('set() updates Firebase after complex operations', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], expect, done);

      geoFirestore.set({
        'loc:1': [0, 0],
        'loc2': [50, 50],
        'loc%!A72f()3': [-90, -90]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.remove('loc2');
      }).then(() => {
        cl.x('p2');

        return geoFirestore.set({
          'loc2': [0.2358, -72.621],
          'loc4': [87.6, -130],
          'loc5': [5, 55.555]
        });
      }).then(() => {
        cl.x('p3');

        return geoFirestore.set({
          'loc5': null
        });
      }).then(() => {
        cl.x('p4');

        return geoFirestore.set({
          'loc:1': [87.6, -130],
          'loc6': [-72.258, 0.953215]
        });
      }).then(() => {
        cl.x('p5');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc:1': { '.priority': 'cped3g0fur', 'l': [87.6, -130], 'g': 'cped3g0fur' },
          'loc2': { '.priority': 'd2h376zj8h', 'l': [0.2358, -72.621], 'g': 'd2h376zj8h' },
          'loc%!A72f()3': { '.priority': '1bpbpbpbpb', 'l': [-90, -90], 'g': '1bpbpbpbpb' },
          'loc4': { '.priority': 'cped3g0fur', 'l': [87.6, -130], 'g': 'cped3g0fur' },
          'loc6': { '.priority': 'h50svty4es', 'l': [-72.258, 0.953215], 'g': 'h50svty4es' }
        });

        cl.x('p6');
      }).catch(failTestOnCaughtError);
    });

    it('set() does not throw errors given valid keys', () => {
      validKeys.forEach((validKey) => {
        expect(() => {
          const locations = {};
          locations[validKey] = [0, 0];
          geoFirestore.set(locations);
        }).not.to.throw();
      });
    });

    it('set() throws errors given invalid keys', () => {
      invalidKeys.forEach((invalidKey) => {
        if (invalidKey !== null && invalidKey !== undefined && typeof invalidKey !== 'boolean') {
          expect(() => {
            const locations = {};
            // @ts-ignore
            locations[invalidKey] = [0, 0];
            geoFirestore.set(locations);
          }).to.throw();
        }
      });
    });

    it('set() throws errors given a location argument in combination with an object', () => {
      expect(() => {
        geoFirestore.set({
          'loc': [0, 0]
        }, [0, 0]);
      }).to.throw();
    });

    it('set() does not throw errors given valid locations', () => {
      validLocations.forEach((validLocation) => {
        expect(() => {
          geoFirestore.set({
            'loc': validLocation
          });
        }).not.to.throw();
      });
    });

    it('set() throws errors given invalid locations', () => {
      invalidLocations.forEach((invalidLocation) => {
        // Setting location to null is valid since it will remove the key
        if (invalidLocation !== null) {
          expect(() => {
            geoFirestore.set({
              'loc': invalidLocation
            });
          }).to.throw(Error, /Invalid GeoFire location/);
        }
      });
    });
  });

  describe('Retrieving locations:', () => {
    it('get() returns a promise', (done) => {
      const cl = new Checklist(['p1'], expect, done);

      geoFirestore.get('loc1').then((ref) => {
        cl.x('p1');
      });
    });

    it('get() returns null for non-existent keys', (done) => {
      const cl = new Checklist(['p1'], expect, done);

      geoFirestore.get('loc1').then((location) => {
        expect(location).to.equal(null);

        cl.x('p1');
      });
    });

    it('get() retrieves locations given existing keys', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [50, 50],
        'loc3': [-90, -90]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.get('loc1');
      }).then((location) => {
        expect(location).to.deep.equal([0, 0]);
        cl.x('p2');

        return geoFirestore.get('loc2');
      }).then((location) => {
        expect(location).to.deep.equal([50, 50]);
        cl.x('p3');

        return geoFirestore.get('loc3');
      }).then((location) => {
        expect(location).to.deep.equal([-90, -90]);
        cl.x('p4');
      }).catch(failTestOnCaughtError);
    });

    it('get() does not throw errors given valid keys', () => {
      validKeys.forEach((validKey) => {
        expect(() => geoFirestore.get(validKey)).not.to.throw();
      });
    });

    it('get() throws errors given invalid keys', () => {
      invalidKeys.forEach((invalidKey) => {
        // @ts-ignore
        expect(() => geoFirestore.get(invalidKey)).to.throw();
      });
    });
  });

  describe('Removing locations:', () => {
    it('set() removes existing location given null', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [2, 3]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.get('loc1');
      }).then((location) => {
        expect(location).to.deep.equal([0, 0]);

        cl.x('p2');

        return geoFirestore.set('loc1', null);
      }).then(() => {
        cl.x('p3');

        return geoFirestore.get('loc1');
      }).then((location) => {
        expect(location).to.equal(null);

        cl.x('p4');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc2': { '.priority': 's065kk0dc5', 'l': [2, 3], 'g': 's065kk0dc5' }
        });

        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('set() does nothing given a non-existent location and null', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5'], expect, done);

      geoFirestore.set('loc1', [0, 0]).then(() => {
        cl.x('p1');

        return geoFirestore.get('loc1');
      }).then((location) => {
        expect(location).to.deep.equal([0, 0]);

        cl.x('p2');

        return geoFirestore.set('loc2', null);
      }).then(() => {
        cl.x('p3');

        return geoFirestore.get('loc2');
      }).then((location) => {
        expect(location).to.equal(null);

        cl.x('p4');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' }
        });

        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('set() removes existing location given null', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [2, 3]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.get('loc1');
      }).then((location) => {
        expect(location).to.deep.equal([0, 0]);

        cl.x('p2');

        return geoFirestore.set({
          'loc1': null,
          'loc3': [-90, -90]
        });
      }).then(() => {
        cl.x('p3');

        return geoFirestore.get('loc1');
      }).then((location) => {
        expect(location).to.equal(null);

        cl.x('p4');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc2': { '.priority': 's065kk0dc5', 'l': [2, 3], 'g': 's065kk0dc5' },
          'loc3': { '.priority': '1bpbpbpbpb', 'l': [-90, -90], 'g': '1bpbpbpbpb' }
        });

        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('set() does nothing given a non-existent location and null', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': null
      }).then(() => {
        cl.x('p1');

        return geoFirestore.get('loc1');
      }).then((location) => {
        expect(location).to.deep.equal([0, 0]);

        cl.x('p2');

        return geoFirestore.get('loc2');
      }).then((location) => {
        expect(location).to.equal(null);

        cl.x('p3');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' }
        });

        cl.x('p4');
      }).catch(failTestOnCaughtError);
    });

    it('remove() removes existing location', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5'], expect, done);

      geoFirestore.set({
        'loc:^%*1': [0, 0],
        'loc2': [2, 3]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.get('loc:^%*1');
      }).then((location) => {
        expect(location).to.deep.equal([0, 0]);

        cl.x('p2');

        return geoFirestore.remove('loc:^%*1');
      }).then(() => {
        cl.x('p3');

        return geoFirestore.get('loc:^%*1');
      }).then((location) => {
        expect(location).to.equal(null);

        cl.x('p4');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc2': { '.priority': 's065kk0dc5', 'l': [2, 3], 'g': 's065kk0dc5' }
        });

        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('remove() does nothing given a non-existent location', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3', 'p4', 'p5'], expect, done);

      geoFirestore.set('loc1', [0, 0]).then(() => {
        cl.x('p1');

        return geoFirestore.get('loc1');
      }).then((location) => {
        expect(location).to.deep.equal([0, 0]);

        cl.x('p2');

        return geoFirestore.remove('loc2');
      }).then(() => {
        cl.x('p3');

        return geoFirestore.get('loc2');
      }).then((location) => {
        expect(location).to.equal(null);

        cl.x('p4');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc1': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' }
        });

        cl.x('p5');
      }).catch(failTestOnCaughtError);
    });

    it('remove() only removes one key if multiple keys are at the same location', (done) => {
      const cl = new Checklist(['p1', 'p2', 'p3'], expect, done);

      geoFirestore.set({
        'loc1': [0, 0],
        'loc2': [2, 3],
        'loc3': [0, 0]
      }).then(() => {
        cl.x('p1');

        return geoFirestore.remove('loc1');
      }).then(() => {
        cl.x('p2');

        return getFirestoreData();
      }).then((firebaseData) => {
        expect(firebaseData).to.deep.equal({
          'loc2': { '.priority': 's065kk0dc5', 'l': [2, 3], 'g': 's065kk0dc5' },
          'loc3': { '.priority': '7zzzzzzzzz', 'l': [0, 0], 'g': '7zzzzzzzzz' }
        });

        cl.x('p3');
      }).catch(failTestOnCaughtError);
    });

    it('remove() does not throw errors given valid keys', () => {
      validKeys.forEach((validKey) => {
        expect(() => geoFirestore.remove(validKey)).not.to.throw();
      });
    });

    it('remove() throws errors given invalid keys', () => {
      invalidKeys.forEach((invalidKey) => {
        // @ts-ignore
        expect(() => geoFirestore.remove(invalidKey)).to.throw();
      });
    });
  });

  describe('query():', () => {
    it('query() returns GeoFireQuery instance', () => {
      geoFirestoreQueries.push(geoFirestore.query({ center: [1, 2], radius: 1000 }));

      expect(geoFirestoreQueries[0] instanceof GeoFirestoreQuery).to.be.ok;
    });

    it('query() does not throw errors given valid query criteria', () => {
      validQueryCriterias.forEach((validQueryCriteria) => {
        if (typeof validQueryCriteria.center !== 'undefined' && typeof validQueryCriteria.radius !== 'undefined') {
          expect(() => geoFirestore.query(validQueryCriteria)).not.to.throw();
        }
      });
    });

    it('query() throws errors given invalid query criteria', () => {
      invalidQueryCriterias.forEach((invalidQueryCriteria) => {
        // @ts-ignore
        expect(() => geoFirestore.query(invalidQueryCriteria)).to.throw();
      });
    });
  });
});
