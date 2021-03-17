/* tslint:disable:no-import-side-effect no-namespace */
import { DataSnapshot } from '@firebase/database-types';
import { Geopoint, Geohash } from "geofire-common";

export interface Document {
  '.priority': Geohash;
  g: Geohash;
  l: Geopoint;
}
export type KeyCallback = (
  key?: string,
  location?: Geopoint,
  distanceFromCenter?: number
) => void;
export interface LocationTracked {
  location: Geopoint;
  distanceFromCenter: number;
  isInQuery: boolean;
  geohash: Geohash;
}
export type ReadyCallback = () => void;
export interface QueryCallbacks {
  ready: ReadyCallback[];
  key_entered: KeyCallback[];
  key_exited: KeyCallback[];
  key_moved: KeyCallback[];
}
