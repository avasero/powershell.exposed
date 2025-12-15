"use client";
import { useState, useEffect } from 'react';
import ThemedButton from './ThemedButton';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 p-4 border bg-black/95 backdrop-blur-sm border-green-500/30 rounded-lg max-w-xs" style={{
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)'
    }}>
      <div className="flex flex-col gap-3">
        
        <div className="font-mono text-sm mb-3" style={{color: 'var(--foreground)'}}>
          We use cookies on this website.
        </div>

        
        <div className="flex flex-col gap-2">
          <ThemedButton
            onClick={handleAccept}
            size="sm"
            className="w-full"
            style={{
              borderColor: 'var(--accent)',
              color: 'var(--accent)'
            }}
          >
            Cool?
          </ThemedButton>
          <a href="/terms" className="font-mono text-xs text-center underline hover:no-underline" style={{color: 'var(--accent)'}}>
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}