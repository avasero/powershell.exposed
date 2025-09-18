"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useDrawer } from "../contexts/DrawerContext";
import { useAnalysisDrawer } from "../contexts/AnalysisDrawerContext";
import HamburgerButton from "./HamburgerButton";
import SideDrawer from "./SideDrawer";
import ThemedButton from "./ThemedButton";

export default function Navbar() {
  const { user, signOut, isAuthenticated } = useAuth();
  const { openDrawer } = useDrawer();
  const { openAnalysisDrawer } = useAnalysisDrawer();
  const pathname = usePathname();
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <>
      <nav className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2 font-mono text-lg sm:text-xl font-bold" style={{color: 'var(--accent)'}}>
            <svg 
              viewBox="0 0 256 256" 
              xmlns="http://www.w3.org/2000/svg" 
              aria-label="powershell.exposed icon: ! >"
              className="w-6 h-6 sm:w-8 sm:h-8"
            >
              <defs>
                <mask id="cut3">
                  <rect x="24" y="24" width="208" height="208" rx="28" fill="white"/>
                  <line x1="86" y1="92" x2="86" y2="148" stroke="black" strokeWidth="20" strokeLinecap="round"/>
                  <circle cx="86" cy="170" r="10" fill="black"/>
                  <polyline points="120,100 172,128 120,156" fill="none"
                    stroke="black" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"/>
                </mask>
              </defs>
              <rect x="24" y="24" width="208" height="208" rx="28" fill="#1CC76D" mask="url(#cut3)"/>
            </svg>
            <span>powershell.exposed</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated() ? (
            <>
              <span className="font-mono text-sm" style={{color: 'var(--foreground)'}}>
                {user?.user_metadata?.username || user?.email}
              </span>
              <ThemedButton
                onClick={() => window.location.href = '/api-keys'}
                size="sm"
                variant="outline"
              >
                🔑 API Keys
              </ThemedButton>
              <ThemedButton
                onClick={handleLogout}
                size="sm"
              >
                Logout
              </ThemedButton>
            </>
          ) : (
            <>
              <ThemedButton
                onClick={() => window.location.href = '/'}
                size="sm"
              >
                Try Evaluation
              </ThemedButton>
              <ThemedButton
                onClick={() => window.location.href = '/login'}
                size="sm"
              >
                Login
              </ThemedButton>
              <ThemedButton
                onClick={() => window.location.href = '/register'}
                size="sm"
              >
                Sign Up
              </ThemedButton>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-2">
          {/* Botão de Análises - apenas na homepage para usuários autenticados */}
          {isAuthenticated() && pathname === '/' && (
            <ThemedButton
              onClick={openAnalysisDrawer}
              size="sm"
              className="p-2"
              aria-label="Open analyses"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </ThemedButton>
          )}
          
          {/* Botão Try Analysis para usuários não logados no mobile */}
          {!isAuthenticated() && (
            <ThemedButton
              onClick={() => window.location.href = '/'}
              size="sm"
              className="px-3 py-2 text-xs"
            >
              Try
            </ThemedButton>
          )}
          
          <HamburgerButton />
        </div>
      </nav>

      {/* Side Drawer for Mobile */}
      <SideDrawer />


    </>
  );
}
