import * as firebase from 'firebase';

export type GeoQueryStateCallback = (a: firebase.database.DataSnapshot | null, b?: string) => any

export interface GeoQueryState {
  active: boolean;
  childAddedCallback: GeoQueryStateCallback;
  childRemovedCallback: GeoQueryStateCallback;
  childChangedCallback: GeoQueryStateCallback;
  valueCallback: GeoQueryStateCallback;
}