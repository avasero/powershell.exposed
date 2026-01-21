// eslint-disable-line react-hooks/exhaustive-deps
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IoClose } from "react-icons/io5";
import ThemedButton from "./components/ThemedButton";
import { useAuth } from "./contexts/AuthContext";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [authError, setAuthError] = useState(null);
  
  // Check for auth errors in URL hash (e.g., expired magic links)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('error=')) {
        const params = new URLSearchParams(hash.substring(1));
        const error = params.get('error');
        const errorCode = params.get('error_code');
        const errorDescription = params.get('error_description');

        if (error === 'access_denied' && (errorCode === 'otp_expired' || errorCode === 'otp_disabled')) {
          setAuthError(decodeURIComponent(errorDescription || 'Your login link has expired. Please request a new one.'));

          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }
  }, []);
  
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16 overflow-x-hidden">
      
      {authError && (
        <div className="fixed bottom-4 left-4  z-50">
          <div className="max-w-2xl mx-auto relative">
            <div className="text-xs sm:text-sm font-mono text-red-400 bg-red-900/20 border border-red-500/30 rounded p-2 pr-6">
              {authError}
            </div>
            <span
              onClick={() => setAuthError(null)}
              className="absolute top-1 right-1 p-0.5 text-red-400/30 hover:text-red-400/70 transition-colors cursor-pointer"
              role="button"
              aria-label="Dismiss"
            >
              <IoClose size={14} />
            </span>
          </div>
        </div>
      )}
      
      <div className="w-full max-w-4xl text-center space-y-6 sm:space-y-8 md:space-y-10">
       
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-mono font-bold break-words" style={{color: 'var(--accent)'}}>
            powershell.exposed
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-mono px-2" style={{color: 'var(--muted-foreground)'}}>
            Suspicious PowerShell Detection Engine
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 my-6 sm:my-8 md:my-12 px-2 sm:px-0">
          <div className="p-4 sm:p-5 md:p-6 rounded-lg border bg-black/80 border-green-500/30">
            <h3 className="font-mono font-semibold mb-2 text-sm sm:text-base" style={{color: 'var(--foreground)'}}>
              GitHub Repository
            </h3>
            <p className="font-mono text-xs sm:text-sm" style={{color: 'var(--muted-foreground)'}}>
              With over 80 pattern based indicators maintained by practitioners.
            </p>
          </div>

          <div className="p-4 sm:p-5 md:p-6 rounded-lg border bg-black/80 border-green-500/30">
            <h3 className="font-mono font-semibold mb-2 text-sm sm:text-base" style={{color: 'var(--foreground)'}}>
              Free Features
            </h3>
            <p className="font-mono text-xs sm:text-sm" style={{color: 'var(--muted-foreground)'}}>
              Pattern indicator matching with basic scoring and command decoding.
            </p>
          </div>

          <div className="p-4 sm:p-5 md:p-6 rounded-lg border bg-black/80 border-green-500/30 sm:col-span-2 lg:col-span-1">
            <h3 className="font-mono font-semibold mb-2 text-sm sm:text-base" style={{color: 'var(--foreground)'}}>
              Advanced Features
            </h3>
            <p className="font-mono text-xs sm:text-sm" style={{color: 'var(--muted-foreground)'}}>
              API access, command deobfuscation, anomaly indicators and more.
            </p>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <p className="text-base sm:text-lg font-mono px-2" style={{color: 'var(--foreground)'}}>
            Ready to start analyzing PowerShell commands?
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0">
            <Link href="/evaluate" className="w-full sm:w-auto">
              <ThemedButton 
                size="lg" 
                className="w-full sm:w-auto min-w-[200px]"
              >
                Start Analysis
              </ThemedButton>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}