import React from "react";

type AuthModalProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "grid",
        placeItems: "center"
      }}
      onClick={onClose}
    >
      <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
        <h3>Auth Modal (stub)</h3>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
