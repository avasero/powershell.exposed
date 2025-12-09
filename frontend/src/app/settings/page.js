"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import ApiKeyManager from '../components/ApiKeyManager';

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [notifyUser, setNotifyUser] = useState(null); // null = not loaded yet
  const [updatingNotify, setUpdatingNotify] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    // Only fetch once per mount
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchUserPlan();
      fetchUserProfile();
    }
  }, [isAuthenticated]);

  const fetchUserPlan = async () => {
    try {
      const { makeAuthenticatedRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedRequest('/user/plan', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.plan) {
          setPlan(data.plan);
        }
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
    } finally {
      setLoadingPlan(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { makeAuthenticatedRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedRequest('/user/profile', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          setNotifyUser(data.profile.notify_user === true);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setNotifyUser(false); // Default to false on error
    }
  };

  const handleNotifyToggle = async (subscribe) => {
    setUpdatingNotify(true);

    try {
      const { makeAuthenticatedRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedRequest('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ notify_user: subscribe })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Reload the page to fetch fresh state from DB
        window.location.reload();
      } else {
        console.error('Failed to update notification setting:', data);
        setUpdatingNotify(false);
      }
    } catch (error) {
      console.error('Error updating notification setting:', error);
      setUpdatingNotify(false);
    }
  };

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center p-8 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm max-w-md">
          <h2 className="text-xl font-mono font-bold mb-4" style={{ color: 'var(--accent)' }}>
            Authentication Required
          </h2>
          <p className="font-mono text-sm mb-6 text-white/70">
            Please log in to access your settings.
          </p>
          <Link href="/login">
            <button className="font-mono px-6 py-3 rounded-lg border transition-all hover:scale-105" style={{
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
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-sm hover:underline mb-6 text-white/70 hover:text-green-400 transition-colors"
          >
            ← Back to Home
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-mono font-bold mb-3 bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="font-mono text-sm text-white/50">
              Manage your account and preferences
            </p>
          </div>
        </div>

        {/* Account Overview Card */}
        <div className="mb-6 p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-green-500/50 transition-all duration-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-2xl font-bold text-black">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div>
              <p className="font-mono text-sm text-white/50">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-4 rounded-lg border border-white/10 bg-black/30">
              <div className="text-xs font-mono uppercase tracking-wider text-white/40 mb-1">
                Account Created
              </div>
              <div className="font-mono text-sm text-white/90">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-white/10 bg-black/30">
              <div className="text-xs font-mono uppercase tracking-wider text-white/40 mb-1">
                Last Login
              </div>
              <div className="font-mono text-sm text-white/90">
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Unknown'}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-white/10 bg-black/30">
              <div className="text-xs font-mono uppercase tracking-wider text-white/40 mb-1">
                Current Plan
              </div>
              <div className="flex items-center gap-2">
                {loadingPlan ? (
                  <div className="h-5 w-20 bg-white/10 animate-pulse rounded"></div>
                ) : (
                  <span className="font-mono text-sm font-bold text-green-400 uppercase">
                    {plan?.plan_name || 'Free'}
                  </span>
                )}
              </div>
            </div>
          </div>


          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-mono text-sm font-semibold text-white">Email updates</h3>
                <p className="font-mono text-xs text-white/50">Stay ahead of new features, coverage improvements, and important product changes.</p>
              </div>
              {notifyUser === null ? (
                <div className="w-32 h-9 bg-white/10 animate-pulse rounded-lg"></div>
              ) : notifyUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600/20 border border-green-500/30">
                    <span className="text-green-400 text-sm">✓</span>
                    <span className="font-mono text-xs text-green-400">Subscribed</span>
                  </div>
                  <button
                    onClick={() => handleNotifyToggle(false)}
                    disabled={updatingNotify}
                    className={`px-3 py-2 rounded-lg border font-mono text-xs transition-all ${
                      updatingNotify 
                        ? 'bg-white/5 border-white/20 text-white/50 cursor-wait' 
                        : 'bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20 hover:border-red-500/50'
                    }`}
                  >
                    {updatingNotify ? 'Updating...' : 'Unsubscribe'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleNotifyToggle(true)}
                  disabled={updatingNotify}
                  className={`px-4 py-2 rounded-lg border font-mono text-xs transition-all ${
                    updatingNotify 
                      ? 'bg-white/5 border-white/20 text-white/50 cursor-wait' 
                      : 'bg-green-600/10 border-green-500/50 text-green-400 hover:bg-green-600/20 hover:border-green-500'
                  }`}
                >
                  {updatingNotify ? 'Subscribing...' : 'Notify Me'}
                </button>
              )}
            </div>
          </div>
        </div>


        {/* API Key Management */}
        <div className="mb-6">
          <ApiKeyManager />
        </div>

        {/* Quick Actions */}
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm mb-6">
          <h3 className="font-mono font-bold text-lg mb-4 text-white">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              href="/history"
              className="p-4 rounded-lg border border-white/10 bg-black/30 hover:bg-white/10 hover:border-green-500/50 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm font-semibold text-white mb-1">
                    View History
                  </div>
                  <div className="font-mono text-xs text-white/50">
                    Access all your analyses
                  </div>
                </div>
                <span className="text-white/30 group-hover:text-green-400 transition-colors">→</span>
              </div>
            </Link>

            <Link
              href="/evaluate"
              className="p-4 rounded-lg border border-white/10 bg-black/30 hover:bg-white/10 hover:border-green-500/50 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm font-semibold text-white mb-1">
                    New Analysis
                  </div>
                  <div className="font-mono text-xs text-white/50">
                    Evaluate a command
                  </div>
                </div>
                <span className="text-white/30 group-hover:text-green-400 transition-colors">→</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-sm text-white/50 hover:text-green-400 transition-colors"
          >
            ← Return to powershell.exposed
          </Link>
        </div>
      </div>
    </div>
  );
}
