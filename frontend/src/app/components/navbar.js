"use client";
import React from "react";
import Link from "next/link";
import { logoutUser } from "../../../utils/auth";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";
import HamburgerButton from "./HamburgerButton";
import SideDrawer from "./SideDrawer";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    try {
      await logoutUser();
      logout();
    } catch (e) {
      console.error("Erro ao deslogar");
      // Mesmo se houver erro na API, fazer logout local
      logout();
    }
  };

  const handleUserLogout = () => {
    handleLogout();
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
          {user && (
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
          )}
          {user && (
            <span className="font-mono text-sm truncate" style={{color: 'var(--foreground)'}}>
              {user.username || user.email}
            </span>
          )}
          {user && (
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
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <HamburgerButton />
        </div>
      </nav>

      {/* Side Drawer for Mobile */}
      <SideDrawer user={user} onLogout={handleUserLogout} />
    </>
  );
}
