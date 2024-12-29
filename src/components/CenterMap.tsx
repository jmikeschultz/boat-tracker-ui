// src/components/CenterMap.tsx
import React from "react";
import { useMap } from "react-leaflet";
import { Position } from "../types";

interface CenterMapProps {
  position: Position;
}

export const CenterMap: React.FC<CenterMapProps> = ({ position }) => {
  const map = useMap();
  map.setView([position.latitude, position.longitude], map.getZoom());
  return null;
};

