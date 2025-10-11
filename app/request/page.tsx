"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";

// Import the typed client wrapper (dynamic to keep SSR off)
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

export default function RequestPage() {
  const center = useMemo<LatLngExpression>(() => [16.807, 121.106], []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Request</h1>

      <div style={{ height: 520 }} className="rounded overflow-hidden border">
        <LeafletMap
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          markerAt={center}
          showPopupText="Center"
          whenCreated={(m) => {
            // optional: keep a ref to the Leaflet map instance
            // console.log("Leaflet map created", m);
          }}
        />
      </div>
    </div>
  );
}
