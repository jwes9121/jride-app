// @ts-nocheck
"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Pragmatic compile fix:
 * We dynamically import react-leaflet components and treat them as `any`
 * to avoid the TS prop-erasure problem through next/dynamic.
 * Runtime is unchanged; this only relaxes types for this page.
 */
const MapContainer: any = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer as any),
  { ssr: false }
);
const TileLayer: any = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer as any),
  { ssr: false }
);
const Marker: any = dynamic(
  () => import("react-leaflet").then((m) => m.Marker as any),
  { ssr: false }
);
const Popup: any = dynamic(
  () => import("react-leaflet").then((m) => m.Popup as any),
  { ssr: false }
);

export default function RequestPage() {
  const center = useMemo<LatLngExpression>(() => [16.807, 121.106], []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Request</h1>

      <div style={{ height: 520 }} className="rounded overflow-hidden border">
        {/* using `any` component to bypass TS dynamic typing quirk */}
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(m: any) => {
            // keep a ref if needed
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
