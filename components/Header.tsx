// components/Header.tsx
import * as React from "react";

/**
 * Header component that accepts a `title` prop (for pages that call <Header title="..." />)
 * and optionally renders children underneath the title.
 */
type HeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export default function Header({ title, children }: HeaderProps) {
  return (
    <header className="mb-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      {children ? <div className="mt-2">{children}</div> : null}
    </header>
  );
}
