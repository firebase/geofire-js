import * as chai from 'chai';

import { GeoFire } from '../src/GeoFire'; 
import {
  boundingBoxBits, degreesToRadians, distanceBetween, geohashForLocation, geohashQuery, 
  geohashQueryBounds,  GEOHASH_PRECISION, metersToLongitudeDegrees, validateGeohash, validateKey, 
  validateLocation, wrapLongitude
} from 'geofire-common';
import { validateCriteria } from '../src/GeoQuery';
import {
  invalidGeohashes, invalidKeys, invalidLocations, invalidQueryCriterias,
  validGeohashes, validKeys, validLocations, validQueryCriterias
} from './common';

describe('QueryCriteria Tests:', () => {
  describe('Parameter validation:', () => {
     it('validateCriteria(criteria, true) does not throw errors given valid query criteria', () => {
      validQueryCriterias.forEach((validQueryCriteria) => {
        if (typeof validQueryCriteria.center !== 'undefined' && typeof validQueryCriteria.radius !== 'undefined') {
          expect(() => validateCriteria(validQueryCriteria, true)).not.to.throw();
        }
      });
    });

    it('validateCriteria(criteria) does not throw errors given valid query criteria', () => {
      validQueryCriterias.forEach((validQueryCriteria) => {
        expect(() => validateCriteria(validQueryCriteria)).not.to.throw();
      });
    });

    it('validateCriteria(criteria, true) throws errors given invalid query criteria', () => {
      invalidQueryCriterias.forEach((invalidQueryCriteria) => {
        // @ts-ignore
        expect(() => validateCriteria(invalidQueryCriteria, true)).to.throw();
      });
      expect(() => validateCriteria({ center: [0, 0] }, true)).to.throw();
      expect(() => validateCriteria({ radius: 1000 }, true)).to.throw();
    });

    it('validateCriteria(criteria) throws errors given invalid query criteria', () => {
      invalidQueryCriterias.forEach((invalidQueryCriteria) => {
        // @ts-ignore
        expect(() => validateCriteria(invalidQueryCriteria)).to.throw();
      });
    });
  });
});

const expect = chai.expect;
describe('Geohash queries:', () => {
  it('Geohash queries must be of the right size', () => {
    expect(geohashQuery('64m9yn96mx', 6)).to.be.deep.equal(['60', '6h']);
    expect(geohashQuery('64m9yn96mx', 1)).to.be.deep.equal(['0', 'h']);
    expect(geohashQuery('64m9yn96mx', 10)).to.be.deep.equal(['64', '65']);
    expect(geohashQuery('6409yn96mx', 11)).to.be.deep.equal(['640', '64h']);
    expect(geohashQuery('64m9yn96mx', 11)).to.be.deep.equal(['64h', '64~']);
    expect(geohashQuery('6', 10)).to.be.deep.equal(['6', '6~']);
    expect(geohashQuery('64z178', 12)).to.be.deep.equal(['64s', '64~']);
    expect(geohashQuery('64z178', 15)).to.be.deep.equal(['64z', '64~']);
  });

  it('Query bounds from geohashQueryBounds must contain points in circle', () => {
    function inQuery(queries, hash) {
      for (let i = 0; i < queries.length; i++) {
        if (hash >= queries[i][0] && hash < queries[i][1]) {
          return true;
        }
      }
      return false;
    }
    for (let i = 0; i < 200; i++) {
      const centerLat = Math.pow(Math.random(), 5) * 160 - 80;
      const centerLong = Math.pow(Math.random(), 5) * 360 - 180;
      const radius = Math.random() * Math.random() * 100000;
      const degreeRadius = metersToLongitudeDegrees(radius, centerLat);
      const queries = geohashQueryBounds([centerLat, centerLong], radius);
      for (let j = 0; j < 1000; j++) {
        const pointLat = Math.max(-89.9, Math.min(89.9, centerLat + Math.random() * degreeRadius));
        const pointLong = wrapLongitude(centerLong + Math.random() * degreeRadius);
        if (distanceBetween([centerLat, centerLong], [pointLat, pointLong]) < radius / 1000) {
          expect(inQuery(queries, geohashForLocation([pointLat, pointLong]))).to.be.equal(true);
        }
      }
    }
  });
});
