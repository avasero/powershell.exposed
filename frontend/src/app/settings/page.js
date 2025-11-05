"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import ApiKeyManager from '../components/ApiKeyManager';

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--background)'}}>
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
            Authentication Required
          </h2>
          <p className="font-mono text-sm mb-6" style={{color: 'var(--muted-foreground)'}}>
            Please log in to access your settings.
          </p>
          <Link href="/login">
            <button className="font-mono px-4 py-2 rounded border" style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
              borderColor: 'var(--accent)'
            }}>
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--background)', color: 'var(--foreground)'}}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 font-mono text-sm hover:underline"
              style={{color: 'var(--accent)'}}
            >
              ← Back to Home
            </Link>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
              Settings
            </h1>
            <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* User Info Section */}
        <div className="mb-8">
          <div className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
              Account Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-sm font-medium mb-1" style={{color: 'var(--foreground)'}}>
                  Username:
                </label>
                <div className="font-mono text-sm p-2 rounded border" style={{
                  backgroundColor: 'var(--muted)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--foreground)'
                }}>
                  {user?.user_metadata?.username || 'Not set'}
                </div>
              </div>
              <div>
                <label className="block font-mono text-sm font-medium mb-1" style={{color: 'var(--foreground)'}}>
                  Email:
                </label>
                <div className="font-mono text-sm p-2 rounded border" style={{
                  backgroundColor: 'var(--muted)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--foreground)'
                }}>
                  {user?.email || 'Not available'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Management Section */}
        <div className="mb-8">
          <ApiKeyManager />
        </div>

        {/* Additional Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Preferences Section */}
          <div className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
              Preferences
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-sm font-medium mb-2" style={{color: 'var(--foreground)'}}>
                  Theme:
                </label>
                <div className="font-mono text-sm p-2 rounded border" style={{
                  backgroundColor: 'var(--muted)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--muted-foreground)'
                }}>
                  Auto (follows system preference)
                </div>
              </div>
              <div>
                <label className="block font-mono text-sm font-medium mb-2" style={{color: 'var(--foreground)'}}>
                  Analysis History:
                </label>
                <div className="font-mono text-sm p-2 rounded border" style={{
                  backgroundColor: 'var(--muted)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--muted-foreground)'
                }}>
                  Saved automatically when logged in
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
              Security
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-sm font-medium mb-2" style={{color: 'var(--foreground)'}}>
                  Account Created:
                </label>
                <div className="font-mono text-sm p-2 rounded border" style={{
                  backgroundColor: 'var(--muted)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--foreground)'
                }}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
              <div>
                <label className="block font-mono text-sm font-medium mb-2" style={{color: 'var(--foreground)'}}>
                  Last Login:
                </label>
                <div className="font-mono text-sm p-2 rounded border" style={{
                  backgroundColor: 'var(--muted)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--foreground)'
                }}>
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Information */}
        <div className="mt-8">
          <div className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
              Usage Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded border" style={{
                backgroundColor: 'var(--muted)',
                borderColor: 'var(--border-color)'
              }}>
                <div className="text-2xl mb-2" style={{color: 'var(--accent)'}}>∞</div>
                <div className="font-mono text-sm" style={{color: 'var(--foreground)'}}>
                  Analyses Remaining
                </div>
                <div className="font-mono text-xs mt-1" style={{color: 'var(--muted-foreground)'}}>
                  Unlimited for registered users
                </div>
              </div>
              
              <div className="text-center p-4 rounded border" style={{
                backgroundColor: 'var(--muted)',
                borderColor: 'var(--border-color)'
              }}>
                <div className="text-2xl mb-2" style={{color: 'var(--accent)'}}>◆</div>
                <div className="font-mono text-sm" style={{color: 'var(--foreground)'}}>
                  API Access
                </div>
                <div className="font-mono text-xs mt-1" style={{color: 'var(--muted-foreground)'}}>
                  Manage your API keys above
                </div>
              </div>
              
              <div className="text-center p-4 rounded border" style={{
                backgroundColor: 'var(--muted)',
                borderColor: 'var(--border-color)'
              }}>
                <div className="text-2xl mb-2" style={{color: 'var(--accent)'}}>✓</div>
                <div className="font-mono text-sm" style={{color: 'var(--foreground)'}}>
                  History Saved
                </div>
                <div className="font-mono text-xs mt-1" style={{color: 'var(--muted-foreground)'}}>
                  All your analyses are stored
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 font-mono text-sm hover:underline"
            style={{color: 'var(--accent)'}}
          >
            ← Return to PowerShell.exposed
          </Link>
        </div>
      </div>
    </div>
  );
}