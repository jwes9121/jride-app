'use client';

import { useEffect, useRef, useState } from 'react';

export type LocationValue = {
  address: string;
  lat: number;
  lng: number;
};

type LocationInputProps = {
  placeholder: string;
  value: string;
  onChange: (loc: LocationValue) => void;
  label?: string;
  icon?: string;      // optional for your UI
  iconColor?: string; // optional for your UI
};

const STATIC_PLACES: Array<LocationValue & { tag?: string }> = [
  { address: 'Provincial Capitol, Lagawe', lat: 16.7800, lng: 121.1200, tag: 'landmark' },
  { address: 'Ifugao State University, Lagawe', lat: 16.7820, lng: 121.1180, tag: 'landmark' },
  { address: 'Lagawe Public Market', lat: 16.7790, lng: 121.1210, tag: 'market' },
];

export default function LocationInput({
  placeholder,
  value,
  onChange,
  label,
}: LocationInputProps) {
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<typeof STATIC_PLACES>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setInput(value), [value]);

  useEffect(() => {
    const clickAway = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', clickAway);
    return () => document.removeEventListener('mousedown', clickAway);
  }, []);

  const onInput = (v: string) => {
    setInput(v);
    if (!v) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    const f = STATIC_PLACES.filter(p => p.address.toLowerCase().includes(v.toLowerCase())).slice(0, 8);
    setFiltered(f);
    setOpen(f.length > 0);
  };

  const choose = (loc: LocationValue) => {
    setInput(loc.address);
    setOpen(false);
    onChange(loc);
  };

  return (
    <div ref={wrapRef} className="w-full">
      {label && <div className="text-sm font-medium mb-1">{label}</div>}
      <input
        value={input}
        onChange={(e) => onInput(e.target.value)}
        onFocus={() => filtered.length && setOpen(true)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && filtered.length > 0 && (
        <div className="mt-1 max-h-60 overflow-auto rounded-xl border border-gray-200 bg-white shadow">
          {filtered.map((p) => (
            <button
              key={p.address}
              className="w-full text-left px-4 py-3 hover:bg-gray-50"
              onClick={() => choose(p)}
            >
              <div className="font-medium">{p.address}</div>
              <div className="text-xs text-gray-500">{p.tag || 'place'}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
