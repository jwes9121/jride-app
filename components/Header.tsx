import React from "react";

type Props = {
  title?: string;
  className?: string;
  children?: React.ReactNode;
};

export default function Header({ title, className, children }: Props) {
  return (
    <header className={className ?? ""}>
      {title ? <h1 className="text-xl font-semibold">{title}</h1> : null}
      {children}
    </header>
  );
}
