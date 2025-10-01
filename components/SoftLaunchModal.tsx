'use client';

import { useState, useEffect } from 'react';

interface SoftLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeedback: () => void;
}

export default function SoftLaunchModal({ isOpen, onClose, onFeedback }: SoftLaunchModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleContinue = () => {
    if (dontShowAgain) {
      localStorage.setItem('j-ride-soft-launch-dismissed', 'true');
    }
    onClose();
  };

  const handleFeedback = () => {
    if (dontShowAgain) {
      localStorage.setItem('j-ride-soft-launch-dismissed', 'true');
    }
    onFeedback();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <i className="ri-tools-line text-2xl text-orange-600"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            🚧 JRide is in Soft Launch 🚧
          </h3>
        </div>

        {/* Message Content */}
        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-gray-800 leading-relaxed">
              Thank you for trying JRide! 🙏
            </p>
            <p className="text-gray-800 leading-relaxed mt-3">
              We are currently in our testing phase, so you may notice some errors or issues. Don't worry — we're fixing them as quickly as possible before our official launch.
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="ri-heart-line text-purple-600"></i>
              </div>
              <div>
                <p className="text-gray-800 font-medium">
                  Your feedback and reviews are very valuable and will help us improve JRide for everyone. 💙
                </p>
                <p className="text-gray-700 mt-2">
                  Thank you for your patience and support!
                </p>
              </div>
            </div>
          </div>

          {/* Testing Phase Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start space-x-2">
              <i className="ri-information-line text-yellow-600 mt-0.5"></i>
              <div>
                <p className="text-sm font-medium text-yellow-800 mb-2">What to expect during testing:</p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• Some features may be temporarily unavailable</li>
                  <li>• Minor bugs or glitches may occur</li>
                  <li>• We're actively monitoring and fixing issues</li>
                  <li>• Your experience helps us improve the app</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Don't Show Again Checkbox */}
        <div className="mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                dontShowAgain ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
              }`}>
                {dontShowAgain && (
                  <i className="ri-check-line text-white text-sm"></i>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-600">Don't show this message again</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg"
          >
            ✅ Continue
          </button>
          
          <button
            onClick={handleFeedback}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            📝 Send Feedback
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Your support means everything to us! 🚀
          </p>
        </div>
      </div>
    </div>
  );
}
