"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons in Next/Leaflet
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Dynamically import react-leaflet pieces with SSR disabled
const MapContainer = dynamic(
  () => import("react-leaflet").then(m => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker    = dynamic(() => import("react-leaflet").then(m => m.Marker),    { ssr: false });
const Popup     = dynamic(() => import("react-leaflet").then(m => m.Popup),     { ssr: false });

type Props = {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{ lat: number; lng: number; label?: string }>;
  height?: number | string;
};

export default function MapClient({
  center = [16.8133, 121.1187], // Ifugao-ish default
  zoom = 13,
  markers = [],
  height = 420,
}: Props) {
  const tiles = useMemo(
    () => "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    []
  );

  return (
    <div style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", borderRadius: 12 }}
      >
        <TileLayer url={tiles} attribution='&copy; OpenStreetMap contributors' />
        {markers.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]}>
            {m.label ? <Popup>{m.label}</Popup> : null}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
