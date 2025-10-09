import React from "react";

type Item = { label: string; href?: string; onClick?: () => void };

type Props = {
  items?: Item[];
  className?: string;
};

export default function BottomNavigation({ items = [], className }: Props) {
  return (
    <nav
      className={
        className ??
        "fixed bottom-0 left-0 right-0 bg-white/90 border-t border-gray-200 px-4 py-2 flex gap-4 justify-center"
      }
    >
      {items.map((it, i) =>
        it.href ? (
          <a key={i} href={it.href} className="text-sm hover:underline">
            {it.label}
          </a>
        ) : (
          <button key={i} onClick={it.onClick} className="text-sm underline">
            {it.label}
          </button>
        )
      )}
    </nav>
  );
}
