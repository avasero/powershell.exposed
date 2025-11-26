"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useDrawer } from "../contexts/DrawerContext";
import { useAuth } from "../contexts/AuthContext";

export default function SideDrawer() {
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const { user, signOut, isAuthenticated } = useAuth();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRegisterPopup, setShowRegisterPopup] = useState(false);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDrawerOpen && !event.target.closest('.drawer-container')) {
        closeDrawer();
      }
    };

    if (isDrawerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent body scroll when drawer is open
      setIsAnimating(true);
    } else {
      document.body.style.overflow = 'unset';
      setIsAnimating(false);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isDrawerOpen, closeDrawer]);

  const handleLinkClick = () => {
    closeDrawer();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      closeDrawer();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleRegisterClick = (e) => {
    e.preventDefault();
    setShowRegisterPopup(true);
  };

  if (!isDrawerOpen && !isAnimating) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden pointer-events-none">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-backdrop-animate {
          animation: fadeIn 0.3s ease-in-out;
        }
        .drawer-slide-animate {
          animation: slideInRight 0.3s ease-in-out;
        }
      `}</style>

      <div
        className={`drawer-backdrop drawer-backdrop-animate absolute inset-0 bg-black transition-opacity duration-300 pointer-events-auto ${isDrawerOpen ? 'bg-opacity-40' : 'bg-opacity-0'}`}
        onClick={closeDrawer}
      />

      <div
        className={`drawer-container drawer-slide-animate drawer-shadow absolute right-0 top-0 h-full w-72 max-w-[75vw] bg-black border-green-500/30 hover:border-green-500/50 transition-all pointer-events-auto ${isDrawerOpen ? 'show' : ''}`}
        style={{ borderLeft: '1px solid rgba(34, 197, 94, 0.3)' }}
      >
        <div className={`flex items-center justify-between p-4 border-b drawer-content-animate border-green-500/30 ${isDrawerOpen ? 'show' : ''}`}>
          <h2 className="font-mono text-lg font-bold" style={{ color: 'var(--accent)' }}>
            Menu
          </h2>
          <button
            onClick={closeDrawer}
            className="p-2 rounded-md hover:bg-opacity-10 transition-all bg-black/80 border border-green-500/30 hover:border-green-500/50 cursor-pointer"
            style={{ color: 'var(--accent)' }}
            aria-label="Close menu"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className={`flex flex-col p-4 space-y-3 drawer-content-animate ${isDrawerOpen ? 'show' : ''}`}>
          <div className="">
            <Link
              href="/indicators"
              onClick={handleLinkClick}
              className="font-mono text-sm underline hover:text-green-400 cursor-pointer"
            >
              <div className="flex items-center justify-center space-x-2 pb-2">
                <span>PowerShell Indicators</span>
              </div>
            </Link>

            <Link
              href="/evaluate"
              onClick={handleLinkClick}
              className="font-mono text-sm underline hover:text-green-400 cursor-pointer"

            >
              <div className="flex items-center justify-center space-x-2">
                <span>Evaluate command</span>
              </div>
            </Link>

            {isAuthenticated() && (
              <a
                href="/analyses"
                onClick={handleLinkClick}
                className="block w-full px-4 py-3 font-mono font-semibold rounded text-sm border transition-all duration-200 hover:opacity-80 text-center bg-black/80 border-green-500/30 hover:border-green-500/50 cursor-pointer"
                style={{
                  color: 'var(--accent)'
                }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Analyses</span>
                </div>
              </a>
            )}
          </div>

          {isAuthenticated() ? (
            <div className="border-t pt-4 space-y-3 border-green-500/30">
              <div className="text-center p-3 rounded-md bg-black/80 border border-green-500/30 hover:border-green-500/50 transition-all cursor-pointer">
                <span className="font-mono text-sm block mb-1" style={{ color: 'var(--foreground)' }}>
                  Logged in as:
                </span>
                <div className="font-mono text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                  {user?.email}
                </div>
              </div>

              <a
                href="/settings"
                onClick={handleLinkClick}
                className="block w-full px-4 py-3 font-mono font-semibold rounded text-sm border transition-all duration-200 hover:opacity-80 text-center bg-black/80 border-green-500/30 hover:border-green-500/50 cursor-pointer"
                style={{
                  color: 'var(--accent)'
                }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </div>
              </a>

              <a
                onClick={handleLogout}
                className="block w-full px-4 py-3 font-mono font-semibold rounded text-sm border transition-all duration-200 hover:opacity-80 text-center bg-black/80 border-green-500/30 hover:border-green-500/50 cursor-pointer"
                style={{
                  color: 'var(--accent)'
                }}
              >
                Logout
              </a>
            </div>
          ) : (
            <div className="items-center flex flex-col border-t pt-4 space-y-3 border-green-500/30">
              <a
                href="/login"
                onClick={handleLinkClick}
                className="font-mono text-sm underline hover:text-green-400 cursor-pointer"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Login</span>
                </div>
              </a>
              <a
                href="/register"
                className="font-mono text-sm underline hover:text-green-400 cursor-pointer"
              >
                Register
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
