"use client";
import React from "react";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";
import HamburgerButton from "./HamburgerButton";
import SideDrawer from "./SideDrawer";

export default function Navbar() {
  const { user, signOut, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

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
          
          {isAuthenticated() ? (
            <>
              <Link 
                href="/dashboard" 
                className="px-4 py-2 font-mono font-semibold rounded text-sm border transition-colors hover:opacity-80"
                style={{
                  backgroundColor: 'transparent', 
                  color: 'var(--accent)',
                  borderColor: 'var(--accent)'
                }}
              >
                Dashboard
              </Link>
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
                Registrar
              </Link>
            </>
          )}
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
