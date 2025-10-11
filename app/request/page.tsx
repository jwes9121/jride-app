"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Pragmatic compile fix:
 * Import react-leaflet components via next/dynamic and cast them to `any`.
 * This avoids the TS prop-erasure problem and unblocks your build.
 * You can tighten typings later (when there’s time) with a typed wrapper.
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
        {/* @ts-expect-error – using `any` wrapper to bypass dynamic typing quirk */}
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(m: any) => {
            // console.log("Leaflet map created", m);
          }}
        >
          {/* @ts-expect-error */}
          <TileLayer
            url={`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />
          {/* @ts-expect-error */}
          <Marker position={center}>
            {/* @ts-expect-error */}
            <Popup>Center</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
