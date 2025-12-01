// eslint-disable-line react-hooks/exhaustive-deps
"use client";
import { FaUserCircle } from "react-icons/fa";
import React, { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useDrawer } from "../contexts/DrawerContext";
import { useAnalysisDrawer } from "../contexts/AnalysisDrawerContext";
import HamburgerButton from "./HamburgerButton";
import SideDrawer from "./SideDrawer";
import ThemedButton from "./ThemedButton";
import Image from "next/image";

export default function Navbar() {
  const { user, signOut, isAuthenticated } = useAuth();
  const { openDrawer } = useDrawer();
  const { openAnalysisDrawer } = useAnalysisDrawer();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const timeoutRef = useRef(null);
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 300);
  };

  return (
    <>
      <nav className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b bg-black/80 border-green-500/30">
        <div className="flex items-center">
          <Link href={isAuthenticated() ? "/evaluate" : "/"} className="flex items-center space-x-2 font-mono text-lg sm:text-xl font-bold" style={{ color: 'var(--accent)' }}>
            <svg
              viewBox="0 0 256 256"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="powershell.exposed icon: ! >"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
            >
              <defs>
                <mask id="cut3">
                  <rect x="24" y="24" width="208" height="208" rx="28" fill="white" />
                  <line x1="86" y1="92" x2="86" y2="148" stroke="black" strokeWidth="20" strokeLinecap="round" />
                  <circle cx="86" cy="170" r="10" fill="black" />
                  <polyline points="120,100 172,128 120,156" fill="none"
                    stroke="black" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
                </mask>
              </defs>
              <rect x="24" y="24" width="208" height="208" rx="28" fill="#1CC76D" mask="url(#cut3)" />
            </svg>
            <span>powershell.exposed</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        {!(pathname === '/' && !isAuthenticated()) && (
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated() && (
              <div
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <FaUserCircle
                  className="inline mb-1 mr-1 w-8 h-8 cursor-pointer"
                  style={{ color: 'var(--foreground)' }}
                />

                {/* Dropdown Menu */}
                <div
                  className={`absolute right-0 mt-2 w-48 bg-black border border-green-500/30 rounded-md shadow-lg transition-all duration-200 z-50 ${isDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                    }`}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <a
                    href="/settings"
                    className="block px-4 py-2 text-sm font-mono hover:bg-green-500/10 transition-colors"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Settings
                  </a>
                  <Link
                    href="/indicators"
                    className="block px-4 py-2 text-sm font-mono hover:bg-green-500/10 transition-colors"
                  >
                    Indicators
                  </Link>
                  <Link
                    href="/history"
                    className="block px-4 py-2 text-sm font-mono hover:bg-green-500/10 transition-colors"
                  >
                    History
                  </Link>
                  <a
                    onClick={handleLogout}
                    className="block px-4 py-2 text-sm font-mono hover:bg-green-500/10 cursor-pointer transition-colors"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Logout
                  </a>
                </div>
              </div>
            )}
            {!isAuthenticated() && (
              <>
                <ThemedButton
                  onClick={() => { window.location.href = '/evaluate' }}
                  className="w-full sm:w-auto"
                >
                  Evaluate Command
                </ThemedButton>
                <a
                  href="/evaluate"
                  className="font-mono text-sm underline hover:text-green-400"
                >
                </a>
                <Link
                  href="/indicators"
                  className="font-mono text-sm underline hover:text-green-400"
                >
                  Indicators
                </Link>
                <a
                  href="/login"
                  className="font-mono text-sm underline hover:text-green-400"
                >
                  Login
                </a>
              </>
            )}
          </div>
        )}

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-2">
          {/* Botão de Análises - apenas na homepage para usuários autenticados */}
          {isAuthenticated() && pathname === '/' && (
            <a
              onClick={openAnalysisDrawer}
              size="sm"
              className="p-2"
              aria-label="Open analyses"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </a>
          )}
          <HamburgerButton />
        </div>
      </nav>

      {/* Side Drawer for Mobile */}
      <SideDrawer />


    </>
  );
}
