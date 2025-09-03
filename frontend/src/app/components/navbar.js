"use client";
import React from "react";
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
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error logging out:", error);
    }
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
          
          {/* Link para Histórico */}
          <Link 
            href="/history"
            className={`px-3 py-2 font-mono text-sm rounded transition-colors hover:opacity-80 ${
              pathname === '/history' ? 'font-bold' : ''
            }`}
            style={{
              color: pathname === '/history' ? 'var(--accent)' : 'var(--muted-foreground)',
              backgroundColor: pathname === '/history' ? 'var(--muted)' : 'transparent'
            }}
          >
            History
          </Link>
          
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
                  
                }}
              >
                Try Evaluation
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
              <Link 
                href="/register"
                className="px-4 py-2 font-mono font-semibold rounded text-sm transition-colors hover:opacity-80"
                style={{
                  backgroundColor: 'var(--accent)', 
                  color: 'var(--background)'
                }}
              >
                Sign Up
              </Link>
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


    </>
  );
}
