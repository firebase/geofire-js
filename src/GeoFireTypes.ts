/* tslint:disable:no-import-side-effect no-namespace */
import * as DatabaseTypes from '@firebase/database-types';

export namespace GeoFireTypes {
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
  export interface QueryCriteria {
    center?: number[];
    radius?: number;
  }
  export type QueryStateCallback = (
    a: firebase.DataSnapshot | null,
    b?: string
  ) => any;
  export interface QueryState {
    active: boolean;
    childAddedCallback: QueryStateCallback;
    childRemovedCallback: QueryStateCallback;
    childChangedCallback: QueryStateCallback;
    valueCallback: QueryStateCallback;
  }
  export namespace firebase {
    export type DataSnapshot = DatabaseTypes.DataSnapshot;
    export type Reference = DatabaseTypes.Reference;
    export type Query = DatabaseTypes.Query;
  }
}
