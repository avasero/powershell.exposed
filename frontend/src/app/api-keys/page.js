"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function ApiKeysPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to settings page since API keys are now managed there
    if (isAuthenticated()) {
      router.replace('/settings');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Show loading state while redirecting
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="text-6xl mb-4">⚙️</div>
        <h1 className="text-2xl sm:text-3xl font-mono font-bold" style={{color: 'var(--accent)'}}>
          Redirecting...
        </h1>
        <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
          API Key management has moved to Settings.
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{borderColor: 'var(--accent)'}}></div>
      </div>
    </div>
  );
}
