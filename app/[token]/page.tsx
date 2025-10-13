import type { Metadata } from "next";
import MapClient from "@/components/MapClient";

export const metadata: Metadata = { title: "Session · JRide" };

type Params = { params: { token: string } };

export default function TokenPage({ params }: Params) {
  // you can fetch by params.token on the server here if needed
  return (
    <div className="min-h-screen bg-gray-50" style={{ padding: "1rem" }}>
      <h1 className="text-xl mb-3">Session: {params.token}</h1>
      <MapClient />
    </div>
  );
}
