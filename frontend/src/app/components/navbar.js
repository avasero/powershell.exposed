"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useDrawer } from "../contexts/DrawerContext";
import { useAnalysisDrawer } from "../contexts/AnalysisDrawerContext";
import ThemeToggle from "./ThemeToggle";
import HamburgerButton from "./HamburgerButton";
import SideDrawer from "./SideDrawer";

export default function Navbar() {
  const { user, signOut, isAuthenticated } = useAuth();
  const { openDrawer } = useDrawer();
  const { openAnalysisDrawer } = useAnalysisDrawer();
  const pathname = usePathname();
  const [showRegisterPopup, setShowRegisterPopup] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleRegisterClick = (e) => {
    e.preventDefault();
    setShowRegisterPopup(true);
  };

  return (
    <>
      <nav className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
        <div className="flex items-center">
          <Link href="/" className="font-mono text-lg sm:text-xl font-bold" style={{color: 'var(--accent)'}}>
            powershell.exposed
          </Link>
          <span className="font-mono text-sm ml-2" style={{color: 'var(--muted-foreground)'}}>
            by avasero
          </span>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <ThemeToggle />
          
          {isAuthenticated() ? (
            <>
              <span className="font-mono text-sm" style={{color: 'var(--foreground)'}}>
                {user?.user_metadata?.username || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 font-mono font-semibold rounded text-sm transition-colors hover:opacity-80"
                style={{
                  backgroundColor: 'var(--accent)', 
                  color: 'var(--background)'
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link 
                href="/"
                className="px-4 py-2 font-mono font-semibold rounded text-sm border transition-colors hover:opacity-80"
                style={{
                  backgroundColor: 'var(--accent)', 
                  color: 'var(--background)'
                }}
                onClick={() => {
                  console.log('🚀 NAVBAR: Botão "Try Analysis" clicado!');
                  console.log('  - Usuário autenticado:', isAuthenticated());
                  console.log('  - User object:', user);
                  console.log('  - Redirecionando para: /');
                }}
              >
                Try Analysis
              </Link>
              <Link 
                href="/login"
                className="px-4 py-2 font-mono font-semibold rounded text-sm border transition-colors hover:opacity-80"
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
                className="px-4 py-2 font-mono font-semibold rounded text-sm transition-colors hover:opacity-80"
                style={{
                  backgroundColor: 'var(--accent)', 
                  color: 'var(--background)'
                }}
              >
                Register
              </button>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-2">
          {/* Botão de Análises - apenas na homepage para usuários autenticados */}
          {isAuthenticated() && pathname === '/' && (
            <button
              onClick={openAnalysisDrawer}
              className="p-2 rounded-md transition-colors hover:opacity-80"
              style={{color: 'var(--accent)'}}
              aria-label="Open analyses"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          )}
          
          {/* Botão Try Analysis para usuários não logados no mobile */}
          {!isAuthenticated() && (
            <Link 
              href="/"
              className="px-3 py-2 font-mono font-semibold rounded text-xs transition-colors hover:opacity-80"
              style={{
                backgroundColor: 'var(--accent)', 
                color: 'var(--background)'
              }}
              onClick={() => {
                console.log('🚀 NAVBAR MOBILE: Botão "Try" clicado!');
                console.log('  - Usuário autenticado:', isAuthenticated());
                console.log('  - User object:', user);
                console.log('  - Redirecionando para: /');
              }}
            >
              Try
            </Link>
          )}
          
          <HamburgerButton />
        </div>
      </nav>

      {/* Side Drawer for Mobile */}
      <SideDrawer />

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
    </>
  );
}
