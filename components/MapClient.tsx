"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// SSR-safe dynamic imports
const MapContainer = dynamic(
  () => import("react-leaflet").then(m => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then(m => m.TileLayer),
  { ssr: false }
);

type Props = {
  center?: [number, number];
  zoom?: number;
  height?: number | string;
};

export default function MapClient({
  center = [16.8133, 121.1187],
  zoom = 13,
  height = 420,
}: Props) {
  return (
    <div style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%", borderRadius: 12 }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
      </MapContainer>
    </div>
  );
}
