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
import Image from "next/image";

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
      <nav className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b bg-black/80 border-green-500/30">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2 font-mono text-lg sm:text-xl font-bold" style={{color: 'var(--accent)'}}>
            <svg 
              version="1.0" 
              xmlns="http://www.w3.org/2000/svg"
              width="32" 
              height="32" 
              viewBox="0 0 1024 1024"
              preserveAspectRatio="xMidYMid meet"
            >
              <rect width="100%" height="100%" fill="#00FF66"/>
              <g transform="translate(0,1024) scale(0.1,-0.1)" fill="#000000" stroke="none">
                <path d="M1620 6120 l0 -2320 755 0 755 0 0 2320 0 2320 -755 0 -755 0 0 -2320z"/>
                <path d="M4481 7947 c-30 -40 -128 -169 -217 -287 -89 -118 -184 -240 -210 -271 -145 -167 -204 -241 -204 -256 0 -5 66 -48 148 -97 277 -167 577 -349 727 -441 201 -123 751 -462 795 -490 19 -12 67 -41 105 -65 39 -24 86 -53 105 -66 19 -12 125 -77 235 -144 110 -67 227 -139 260 -160 219 -137 669 -415 817 -504 38 -23 68 -44 68 -47 0 -3 -35 -27 -77 -54 -43 -26 -107 -67 -143 -90 -36 -23 -108 -68 -160 -99 -52 -32 -160 -98 -240 -148 -80 -49 -194 -120 -255 -157 -60 -37 -180 -110 -265 -163 -85 -52 -267 -164 -405 -248 -454 -277 -720 -442 -747 -461 -15 -10 -29 -19 -32 -19 -3 0 -55 -32 -117 -70 -61 -39 -113 -70 -115 -70 -2 0 -35 -20 -72 -44 -53 -34 -387 -239 -600 -368 -19 -12 -29 -24 -25 -31 4 -7 79 -99 166 -206 87 -106 213 -266 280 -355 67 -88 141 -186 167 -216 25 -31 58 -72 74 -93 16 -20 34 -37 39 -37 12 0 530 322 1547 962 118 74 334 209 480 300 612 381 1607 1003 1630 1019 14 9 115 72 225 140 110 68 203 128 207 133 4 6 7 179 5 385 l-2 374 -75 45 c-41 25 -131 80 -200 122 -179 111 -520 319 -1230 750 -124 76 -274 168 -335 205 -60 37 -200 123 -310 190 -110 67 -291 178 -403 246 -251 154 -224 138 -394 240 -199 120 -634 384 -748 454 -150 91 -439 265 -442 265 -2 -1 -28 -33 -57 -73z"/>
                <path d="M1620 2700 l0 -660 753 2 752 3 3 658 2 657 -755 0 -755 0 0 -660z"/>
              </g>
            </svg>
            <span>powershell.exposed</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated() && (
            <span className="font-mono text-sm" style={{color: 'var(--foreground)'}}>
              {user?.user_metadata?.username || user?.email}
            </span>
          )}
          
          <Link
            href="/indicators"
            className="font-mono text-sm underline hover:text-green-400"
          >
            Indicators
          </Link>
          
          {isAuthenticated() ? (
            <>
              <a
                onClick={handleLogout}
                className="font-mono text-sm underline hover:text-green-400 cursor-pointer"
              >
                Logout
              </a>
              <a
                href="/settings"
                className="font-mono text-sm underline hover:text-green-400"
              >
                Settings
              </a>
            </>
          ) : (
            <>
              <a
              href="/evaluate"
              className="font-mono text-sm underline hover:text-green-400"
              >
                Evaluate Command
              </a>
              <a
                href="/login"
                className="font-mono text-sm underline hover:text-green-400"
              >
                Login
              </a>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-2">
          {/* Botão de Análises - apenas na homepage para usuários autenticados */}
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

      {/* Side Drawer for Mobile */}
      <SideDrawer />


    </>
  );
}
