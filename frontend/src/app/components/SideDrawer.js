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
            {isAuthenticated() && (
              <Link 
                href="/dashboard" 
                onClick={handleLinkClick}
                className="block w-full px-4 py-3 font-mono font-semibold rounded text-sm border transition-all duration-200 hover:opacity-80 hover:scale-[0.98] text-center"
                style={{
                  backgroundColor: 'transparent', 
                  color: 'var(--accent)',
                  borderColor: 'var(--accent)'
                }}
              >
                Dashboard
              </Link>
            )}
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
              <Link
                href="/register"
                onClick={handleLinkClick}
                className="block w-full px-4 py-3 font-mono font-semibold rounded text-sm transition-all duration-200 hover:opacity-80 hover:scale-[0.98] text-center"
                style={{
                  backgroundColor: 'var(--accent)', 
                  color: 'var(--background)'
                }}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
