import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from "react-leaflet";
import { Position } from "../types";
import { LatLngBounds, LatLng } from "leaflet";
import { formatTimestamp } from '../utils/time';

// Default center and zoom for the map
const DEFAULT_CENTER: [number, number] = [48.7559, -122.5137];
const DEFAULT_ZOOM = 15;

// Helper component to handle map view updates
const MapController: React.FC<{ positions: Position[] }> = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = new LatLngBounds(
        positions.map((pos) => new LatLng(pos.latitude, pos.longitude))
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [positions, map]);
  return null;
};

interface BoatMapProps {
  positions: Position[];
}

export const BoatMap: React.FC<BoatMapProps> = ({ positions }) => {
  const initialCenter =
    positions.length > 0
      ? ([positions[positions.length - 1].latitude, positions[positions.length - 1].longitude] as [number, number])
      : DEFAULT_CENTER;
  const initialZoom = positions.length > 0 ? 13 : DEFAULT_ZOOM;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ height: "calc(100vh - 60px)", width: "100%" }}
    >
      <MapController positions={positions} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      {positions.length > 0 && (
        <>
          <Polyline
            positions={positions.map((pos) => [pos.latitude, pos.longitude])}
            color="blue"
          />
          {positions.map((pos, idx) => (
            <Marker
              key={idx}
              position={[pos.latitude, pos.longitude]}
            >
              <Popup>
                <div>
                  <strong>Latitude:</strong> {pos.latitude.toFixed(6)} <br />
                  <strong>Longitude:</strong> {pos.longitude.toFixed(6)} <br />
                  <strong>Time:</strong> {formatTimestamp(pos.gmt_timestamp, pos.tz_offset)} <br />
                  <strong>Speed:</strong> {pos.speed?.toFixed(1) || '0.0'} kts
                </div>
              </Popup>
            </Marker>
          ))}
        </>
      )}
    </MapContainer>
  );
};
