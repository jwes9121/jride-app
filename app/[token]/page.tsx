import type { Metadata } from "next";
import MapClient from "../components/MapClient"; // app/[token] -> ../components

export const metadata: Metadata = { title: "Session · JRide" };

export default function TokenPage({ params }: { params: { token: string } }) {
  return (
    <div className="min-h-screen bg-gray-50" style={{ padding: "1rem" }}>
      <h1 className="text-xl mb-3">Session: {params.token}</h1>
      <MapClient />
    </div>
  );
}
