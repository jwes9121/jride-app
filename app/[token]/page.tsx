"use client";

import React, { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  Polyline as LeafletPolyline,
  LatLngExpression,
} from "leaflet";

// Optional: fix default marker icon paths when bundling with Next
// (prevents missing marker icons in production)
const DefaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type PageProps = {
  params: { token: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function TrackTokenPage({ params }: PageProps) {
  const { token } = params;

  // Refs for map and layers
  const mapRef = useRef<LeafletMap | null>(null);
  const pickupMarkerRef = useRef<LeafletMarker | null>(null);
  const dropoffMarkerRef = useRef<LeafletMarker | null>(null);
  const driverMarkerRef = useRef<LeafletMarker | null>(null);
  const routeRef = useRef<LeafletPolyline | null>(null);

  // Example center (adjust to your area)
  const defaultCenter: LatLngExpression = [16.807, 121.106];
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Create the map once
    if (!mapRef.current) {
      const el = document.getElementById("track-map");
      if (!el) return;

      const map = L.map(el, {
        center: defaultCenter,
        zoom: 13,
      });
      mapRef.current = map;

      // Basemap
      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 20,
        }
      ).addTo(map);

      // Example markers (you can replace with real data pulled via the token)
      pickupMarkerRef.current = L.marker(defaultCenter).addTo(map);
      pickupMarkerRef.current.bindPopup("Pickup");

      const dropoff: LatLngExpression = [16.812, 121.113];
      dropoffMarkerRef.current = L.marker(dropoff).addTo(map);
      dropoffMarkerRef.current.bindPopup("Dropoff");

      // Example driver marker
      const driver: LatLngExpression = [16.81, 121.11];
      driverMarkerRef.current = L.marker(driver).addTo(map);
      driverMarkerRef.current.bindPopup(`Driver (token: ${token})`);

      // Optional: draw a simple route polyline
      routeRef.current = L.polyline([defaultCenter, dropoff], {
        weight: 4,
        opacity: 0.9,
      }).addTo(map);

      // Fit bounds around pickup & dropoff
      const bounds = L.latLngBounds([defaultCenter, dropoff]);
      map.fitBounds(bounds, { padding: [24, 24] });

      setReady(true);
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
      driverMarkerRef.current = null;
      routeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">
        Tracking token: <span className="font-mono">{token}</span>
      </h1>

      <div
        id="track-map"
        className="w-full rounded border"
        style={{ height: 520, overflow: "hidden" }}
      />

      {!ready && (
        <p className="text-sm text-gray-500">Loading map…</p>
      )}
    </main>
  );
}
