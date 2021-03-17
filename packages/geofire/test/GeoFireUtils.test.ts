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
