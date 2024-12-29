// src/types/index.ts
export interface Position {
  latitude: number;
  longitude: number;
  timestamp: number;   // Changed from string to number
  time_zone: string;
  speed: number;
}

export interface Config {
  default_zoom: number;
}
