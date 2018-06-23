export type ReadyCallback = () => void;
export type KeyCallback = (key?: string, location?: number[], distanceFromCenter?: number) => void;

export interface GeoQueryCallbacks {
  ready: ReadyCallback[];
  key_entered: KeyCallback[];
  key_exited: KeyCallback[];
  key_moved: KeyCallback[];
}