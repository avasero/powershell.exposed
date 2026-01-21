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

        {/* Navigation Section */}
        <div className={`flex flex-col p-4 drawer-content-animate ${isDrawerOpen ? 'show' : ''}`}>
          {/* Main Navigation Links */}
          <nav className="space-y-2 mb-4">
            <Link
              href="/indicators"
              onClick={handleLinkClick}
              className="flex items-center gap-3 w-full px-4 py-3 font-mono text-sm rounded border transition-all duration-200 hover:bg-green-500/10 bg-black/80 border-green-500/30 hover:border-green-500/50"
              style={{ color: 'var(--foreground)' }}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Indicators</span>
            </Link>

            <Link
              href="/evaluate"
              onClick={handleLinkClick}
              className="flex items-center gap-3 w-full px-4 py-3 font-mono text-sm rounded border transition-all duration-200 hover:bg-green-500/10 bg-black/80 border-green-500/30 hover:border-green-500/50"
              style={{ color: 'var(--foreground)' }}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Evaluation</span>
            </Link>

            {isAuthenticated() && (
              <Link
                href="/analyses"
                onClick={handleLinkClick}
                className="flex items-center gap-3 w-full px-4 py-3 font-mono text-sm rounded border transition-all duration-200 hover:bg-green-500/10 bg-black/80 border-green-500/30 hover:border-green-500/50"
                style={{ color: 'var(--foreground)' }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>My Analyses</span>
              </Link>
            )}
          </nav>

          {/* Divider */}
          <div className="border-t border-green-500/30 my-2"></div>

          {/* Account Section */}
          {isAuthenticated() ? (
            <div className="space-y-3 mt-2">
              {/* User Info Card */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center flex-shrink-0">
                    <span className="font-mono font-bold text-lg" style={{ color: 'var(--accent)' }}>
                      {(user?.user_metadata?.username || user?.email || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      Signed in as
                    </p>
                    <p className="font-mono text-sm font-semibold truncate" style={{ color: 'var(--accent)' }}>
                      {user?.user_metadata?.username || user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <Link
                href="/settings"
                onClick={handleLinkClick}
                className="flex items-center gap-3 w-full px-4 py-3 font-mono text-sm rounded border transition-all duration-200 hover:bg-green-500/10 bg-black/80 border-green-500/30 hover:border-green-500/50"
                style={{ color: 'var(--foreground)' }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 font-mono text-sm rounded border transition-all duration-200 hover:bg-red-500/10 bg-black/80 border-red-500/30 hover:border-red-500/50 text-left"
                style={{ color: '#f87171' }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              <Link
                href="/login"
                onClick={handleLinkClick}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 font-mono text-sm font-semibold rounded border transition-all duration-200 hover:bg-green-500/10 bg-black/80 border-green-500/30 hover:border-green-500/50"
                style={{ color: 'var(--accent)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Login</span>
              </Link>

              <Link
                href="/register"
                onClick={handleLinkClick}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 font-mono text-sm font-semibold rounded border-2 transition-all duration-200 hover:bg-green-500/20 bg-green-500/10 border-green-500/50 hover:border-green-500"
                style={{ color: 'var(--accent)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
