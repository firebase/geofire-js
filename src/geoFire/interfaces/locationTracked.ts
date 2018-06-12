export interface LocationTracked {
  location: number[];
  distanceFromCenter: number;
  isInQuery: boolean;
  geohash: string;
}