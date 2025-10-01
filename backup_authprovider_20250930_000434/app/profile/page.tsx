"use client";
import React, { useState, useEffect } from 'react';
import Header from "@/components/Header";
import VerificationStatusBadge from "@/components/VerificationStatusBadge";
import BottomNavigation from "@/components/BottomNavigation";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("profile");

  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "verified" | "unverified" | "rejected"
  >("unverified");

  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Fetch verification status from API
  useEffect(() => {
    async function fetchStatus() {
      try {
        const token = localStorage.getItem("j-ride-token");
        if (!token) return;

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/user-status`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();
        if (data?.status) {
          setVerificationStatus(data.status);
        }
      } catch (err) {
        console.error("Failed to fetch verification status:", err);
      }
    }

    fetchStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Profile" />

      <div className="pt-20 px-4 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          {/* User Verification Status */}
          <div className="bg-white p-4 rounded-lg shadow border">
            <h2 className="text-lg font-bold mb-2">Verification Status</h2>
            <div className="flex items-center space-x-3">
              <VerificationStatusBadge
                status={verificationStatus}
                size="md"
                onClick={() => setShowVerificationModal(true)}
              />
            </div>

            {verificationStatus === "pending" && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <i className="ri-time-line text-blue-600 mt-0.5"></i>
                  <span className="text-sm text-blue-700">
                    Your verification is under review.
                  </span>
                </div>
              </div>
            )}

            {verificationStatus === "rejected" && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <i className="ri-close-circle-line text-red-600 mt-0.5"></i>
                  <span className="text-sm text-red-700">
                    Your verification was rejected. Please resubmit documents.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Example modal for re-verification */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Re-submit Verification</h2>
            <p className="text-sm text-gray-600">
              Upload your documents again for verification.
            </p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowVerificationModal(false)}
                className="px-4 py-2 rounded bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("Document upload flow goes here");
                  setShowVerificationModal(false);
                }}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





