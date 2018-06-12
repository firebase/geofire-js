import * as firebase from 'firebase';

export interface GeoQueryState {
  active: boolean;
  childAddedCallback: (a: firebase.database.DataSnapshot, b?: string) => any;
  childRemovedCallback: (a: firebase.database.DataSnapshot, b?: string) => any;
  childChangedCallback: (a: firebase.database.DataSnapshot, b?: string) => any;
  valueCallback: (a: firebase.database.DataSnapshot, b?: string) => any;
}