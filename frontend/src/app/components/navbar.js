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


        {!(pathname === '/' && !isAuthenticated()) && (
          <div className="hidden md:flex items-center flex-1 justify-between">
            {isAuthenticated() ? (
              <>

                <div className="flex items-center space-x-6 ml-10">
                  <Link
                    href="/evaluate"
                    className="font-mono text-sm hover:text-green-400 transition-colors"
                    style={{ color: pathname === '/evaluate' ? 'var(--accent)' : 'var(--foreground)' }}
                  >
                    Evaluation
                  </Link>
                  <Link
                    href="/indicators"
                    className="font-mono text-sm hover:text-green-400 transition-colors"
                    style={{ color: pathname === '/indicators' ? 'var(--accent)' : 'var(--foreground)' }}
                  >
                    Community
                  </Link>
                  <Link
                    href="/history"
                    className="font-mono text-sm hover:text-green-400 transition-colors"
                    style={{ color: pathname === '/history' ? 'var(--accent)' : 'var(--foreground)' }}
                  >
                    History
                  </Link>
                  <Link
                    href="/pricing"
                    className="font-mono text-sm hover:text-green-400 transition-colors"
                    style={{ color: pathname === '/pricing' ? 'var(--accent)' : 'var(--foreground)' }}
                  >
                    Tiers
                  </Link>
                  <Link
                    href="/about"
                    className="font-mono text-sm hover:text-green-400 transition-colors"
                    style={{ color: pathname === '/about' ? 'var(--accent)' : 'var(--foreground)' }}
                  >
                    About
                  </Link>
                </div>


                <div
                  className="relative"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <FaUserCircle
                      className="w-6 h-6"
                      style={{ color: 'var(--foreground)' }}
                    />
                    <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                      {user?.user_metadata?.username || user?.email?.split('@')[0] || 'User'}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>


                  <div
                    className={`absolute right-0 mt-2 w-48 bg-black border border-green-500/30 rounded-md shadow-lg transition-all duration-200 z-50 ${isDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                      }`}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <a
                      href="/settings"
                      className="flex items-center space-x-3 px-4 py-2 text-sm font-mono hover:bg-green-500/10 transition-colors"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Settings</span>
                    </a>
                    <a
                      href="mailto:hi@powershell.exposed"
                      className="flex items-center space-x-3 px-4 py-2 text-sm font-mono hover:bg-green-500/10 transition-colors"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Support</span>
                    </a>
                    <a
                      onClick={handleLogout}
                      className="flex items-center space-x-3 px-4 py-2 text-sm font-mono hover:bg-green-500/10 cursor-pointer transition-colors"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <>

                <div className="flex items-center space-x-6 ml-10">
                  <Link
                    href="/evaluate"
                    className="font-mono text-sm hover:text-green-400 transition-colors"
                    style={{ color: pathname === '/evaluate' ? 'var(--accent)' : 'var(--foreground)' }}
                  >
                    Evaluation
                  </Link>
                  <Link
                    href="/indicators"
                    className="font-mono text-sm hover:text-green-400 transition-colors"
                    style={{ color: pathname === '/indicators' ? 'var(--accent)' : 'var(--foreground)' }}
                  >
                      Community
                  </Link>
                  <Link
                    href="/pricing"
                    className="font-mono text-sm hover:text-green-400 transition-colors"
                    style={{ color: pathname === '/pricing' ? 'var(--accent)' : 'var(--foreground)' }}
                  >
                    Tiers
                  </Link>
                  <Link
                    href="/about"
                    className="font-mono text-sm hover:text-green-400 transition-colors"
                    style={{ color: pathname === '/about' ? 'var(--accent)' : 'var(--foreground)' }}
                  >
                    About
                  </Link>
                </div>


                <Link href="/login">
                  <ThemedButton
                    size="sm"
                    className="font-mono text-sm hover:text-green-400 transition-colors"
                  >
                    Login
                  </ThemedButton>
                </Link>
              </>
            )}
          </div>
        )}


        <div className="md:hidden flex items-center space-x-2">

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


      <SideDrawer />


    </>
  );
}
