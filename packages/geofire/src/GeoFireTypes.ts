/* tslint:disable:no-import-side-effect no-namespace */
import { DataSnapshot } from '@firebase/database-types';
import { geopoint, geohash } from "geofire-common";

export interface Document {
  '.priority': geohash;
  g: geohash;
  l: geopoint;
}
export type KeyCallback = (
  key?: string,
  location?: geopoint,
  distanceFromCenter?: number
) => void;
export interface LocationTracked {
  location: geopoint;
  distanceFromCenter: number;
  isInQuery: boolean;
  geohash: geohash;
}
export type ReadyCallback = () => void;
export interface QueryCallbacks {
  ready: ReadyCallback[];
  key_entered: KeyCallback[];
  key_exited: KeyCallback[];
  key_moved: KeyCallback[];
}
