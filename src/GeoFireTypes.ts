/* tslint:disable:no-import-side-effect no-namespace */
import { DataSnapshot } from '@firebase/database-types';

export interface Document {
  '.priority': string;
  g: string;
  l: number[];
}
export type KeyCallback = (
  key?: string,
  location?: number[],
  distanceFromCenter?: number
) => void;
export interface LocationTracked {
  location: number[];
  distanceFromCenter: number;
  isInQuery: boolean;
  geohash: string;
}
export type ReadyCallback = () => void;
export interface QueryCallbacks {
  ready: ReadyCallback[];
  key_entered: KeyCallback[];
  key_exited: KeyCallback[];
  key_moved: KeyCallback[];
}
