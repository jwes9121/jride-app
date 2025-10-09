import React, { PropsWithChildren } from "react";

export default function Header({ children }: PropsWithChildren) {
  return (
    <header style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 600 }}>
      {children ?? "Header (stub)"}
    </header>
  );
}
