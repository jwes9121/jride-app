"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

// Leaflet + react-leaflet types
import type { Map as LeafletMap } from "leaflet";
import type { MapContainerProps, TileLayerProps, MarkerProps, PopupProps } from "react-leaflet";

// Runtime CSS (keep)
import "leaflet/dist/leaflet.css";

// ---- Strongly-typed dynamic imports (SSR OFF) ----
const MapContainer = dynamic<MapContainerProps & React.RefAttributes<LeafletMap>>(
  () => import("react-leaflet").then((m) => m.MapContainer as any),
  { ssr: false }
);

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

// If marker icons don’t show up in Next, you can set the default icon here.
// (Optional) uncomment if you see missing marker images at runtime.
// import L from "leaflet";
// const defaultIcon = L.icon({
//   iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
//   iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
//   shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
// });
// L.Marker.prototype.options.icon = defaultIcon;

export default function RequestPage() {
  const center = useMemo<[number, number]>(() => [16.807, 121.106], []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Request</h1>

      <div style={{ height: 520 }} className="rounded overflow-hidden border">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(m) => {
            // console.log("Leaflet map created", m);
          }}
        >
          <TileLayer
            url={`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />
          <Marker position={center}>
            <Popup>Center</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
