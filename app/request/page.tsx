"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// Leaflet types
import type { Map as LeafletMap, LatLngExpression } from "leaflet";
// React-Leaflet prop types
import type {
  MapContainerProps,
  TileLayerProps,
  MarkerProps,
  PopupProps,
} from "react-leaflet";

// Runtime Leaflet & CSS (keep these)
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ---- Fix: strongly type the dynamic imports so TS knows their props ----
const MapContainer = dynamic<
  MapContainerProps & React.RefAttributes<LeafletMap>
>(() => import("react-leaflet").then((m) => m.MapContainer as any), {
  ssr: false,
});

const TileLayer = dynamic<TileLayerProps>(
  () => import("react-leaflet").then((m) => m.TileLayer as any),
  { ssr: false }
);

const Marker = dynamic<MarkerProps>(
  () => import("react-leaflet").then((m) => m.Marker as any),
  { ssr: false }
);

const Popup = dynamic<PopupProps>(
  () => import("react-leaflet").then((m) => m.Popup as any),
  { ssr: false }
);

// Optional: default icon fix for Leaflet when bundling (prevents missing marker icons)
const defaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

export default function RequestPage() {
  // example state
  const [zoom] = useState(13);
  const center = useMemo<LatLngExpression>(() => [16.807, 121.106], []);

  // any other effects you have…
  useEffect(() => {
    // do something on mount
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Request</h1>

      <div style={{ height: 520 }} className="rounded overflow-hidden border">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(m) => {
            // you can keep a ref to the Leaflet map if you need to
            // console.log("Leaflet map created", m);
          }}
        >
          <TileLayer
            url={`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />

          <Marker position={center as [number, number]}>
            <Popup>Center</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
