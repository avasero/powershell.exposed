"use client";
import React from "react";
import { useDrawer } from "../contexts/DrawerContext";

export default function HamburgerButton() {
  const { toggleDrawer } = useDrawer();

  return (
    <button
      onClick={toggleDrawer}
      className="p-2 rounded-md md:hidden bg-black/80 border border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer"
      style={{ color: 'var(--accent)' }}
      aria-label="Toggle menu"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>
  );
}
