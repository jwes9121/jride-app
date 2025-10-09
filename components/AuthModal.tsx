import React from "react";

type Props = {
  open?: boolean;
  onClose?: () => void;
  title?: string;
  children?: React.ReactNode;
};

export default function AuthModal({ open, onClose, title, children }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{title ?? "Sign in"}</h2>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="text-sm text-gray-700">{children ?? "…"}</div>
      </div>
    </div>
  );
}
