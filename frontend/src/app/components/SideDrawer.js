"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useDrawer } from "../contexts/DrawerContext";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";

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
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className={`drawer-backdrop absolute inset-0 bg-black bg-opacity-40 ${isDrawerOpen ? 'show' : ''}`}
        onClick={closeDrawer}
      />
      
      {/* Drawer */}
      <div 
        className={`drawer-container drawer-shadow absolute right-0 top-0 h-full w-72 max-w-[75vw] ${isDrawerOpen ? 'show' : ''}`}
        style={{ backgroundColor: 'var(--card-bg)', borderLeft: '1px solid var(--border-color)' }}
      >
        {/* Drawer Header */}
        <div className={`flex items-center justify-between p-4 border-b drawer-content-animate ${isDrawerOpen ? 'show' : ''}`} style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="font-mono text-lg font-bold" style={{ color: 'var(--accent)' }}>
            Menu
          </h2>
          <button
            onClick={closeDrawer}
            className="p-2 rounded-md hover:bg-opacity-10 transition-colors"
            style={{ color: 'var(--accent)', backgroundColor: 'transparent' }}
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

        {/* Drawer Content */}
        <div className={`flex flex-col p-4 space-y-4 drawer-content-animate ${isDrawerOpen ? 'show' : ''}`}>
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-2 rounded-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
            <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
              Theme
            </span>
            <ThemeToggle />
          </div>

          {/* Navigation Links */}
          <div className="space-y-2">
            {/* Removido o link do Dashboard */}
          </div>

          {/* Authentication Section */}
          {isAuthenticated() ? (
            <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="text-center p-3 rounded-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <span className="font-mono text-sm block mb-1" style={{ color: 'var(--foreground)' }}>
                  Logged in as:
                </span>
                <div className="font-mono text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                  {user?.user_metadata?.username || user?.email}
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 font-mono font-semibold rounded text-sm transition-all duration-200 hover:opacity-80 hover:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--accent)', 
                  color: 'var(--background)'
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
              <Link
                href="/login"
                onClick={handleLinkClick}
                className="block w-full px-4 py-3 font-mono font-semibold rounded text-sm border transition-all duration-200 hover:opacity-80 hover:scale-[0.98] text-center"
                style={{
                  backgroundColor: 'transparent', 
                  color: 'var(--accent)',
                  borderColor: 'var(--accent)'
                }}
              >
                Login
              </Link>
              <button
                onClick={handleRegisterClick}
                className="block w-full px-4 py-3 font-mono font-semibold rounded text-sm transition-all duration-200 hover:opacity-80 hover:scale-[0.98] text-center"
                style={{
                  backgroundColor: 'var(--accent)', 
                  color: 'var(--background)'
                }}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Registration Popup */}
      {showRegisterPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowRegisterPopup(false)}
          />
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', border: '1px solid' }}
          >
            <div className="text-center">
              <div className="mb-4">
                <svg 
                  className="w-12 h-12 mx-auto text-yellow-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <h3 
                className="text-lg font-mono font-semibold mb-2" 
                style={{ color: 'var(--foreground)' }}
              >
                Feature Not Available
              </h3>
              <p 
                className="text-sm font-mono mb-4" 
                style={{ color: 'var(--muted-foreground)' }}
              >
                Registration is temporarily disabled. This feature will be available soon.
              </p>
              <button
                onClick={() => setShowRegisterPopup(false)}
                className="px-4 py-2 font-mono font-semibold rounded text-sm transition-all duration-200 hover:opacity-80"
                style={{
                  backgroundColor: 'var(--accent)', 
                  color: 'var(--background)'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
