"use client";
import React from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import HamburgerButton from "./HamburgerButton";
import SideDrawer from "./SideDrawer";

export default function Navbar() {
  return (
    <>
      <nav className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
        <div className="flex items-center">
          <Link href="/" className="font-mono text-lg sm:text-xl font-bold" style={{color: 'var(--accent)'}}>
            powershell.exposed
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <ThemeToggle />
          <Link 
            href="/signatures" 
            className="px-4 py-2 font-mono font-semibold rounded text-sm border transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'transparent', 
              color: 'var(--accent)',
              borderColor: 'var(--accent)'
            }}
          >
            Signatures
          </Link>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <HamburgerButton />
        </div>
      </nav>

      {/* Side Drawer for Mobile */}
      <SideDrawer />
    </>
  );
}
