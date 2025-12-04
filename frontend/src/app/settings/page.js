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
  const [notifyUser, setNotifyUser] = useState(false);
  const [updatingNotify, setUpdatingNotify] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
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
    setLoadingProfile(true);
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
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleNotifyToggle = async (e) => {
    const newValue = e.target.checked;
    const previousValue = notifyUser;
    
    setNotifyUser(newValue); // Optimistic update
    setUpdatingNotify(true);

    try {
      const { makeAuthenticatedRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedRequest('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ notify_user: newValue })
      });

      const data = await response.json();
      console.log('Update response:', data);

      if (!response.ok || !data.success) {
        // Revert on error
        setNotifyUser(previousValue);
        console.error('Failed to update notification setting:', data);
      }
    } catch (error) {
      setNotifyUser(previousValue);
      console.error('Error updating notification setting:', error);
    } finally {
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
                <h3 className="font-mono text-sm font-semibold text-white">Premium Notifications</h3>
                <p className="font-mono text-xs text-white/50">Receive updates about new premium features</p>
              </div>
              {loadingProfile ? (
                <div className="w-11 h-6 bg-white/10 animate-pulse rounded-full"></div>
              ) : (
                <label className={`relative inline-flex items-center ${updatingNotify ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifyUser}
                    onChange={handleNotifyToggle}
                    disabled={updatingNotify || loadingProfile}
                  />
                  <div className={`w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 ${updatingNotify ? 'opacity-50' : ''}`}></div>
                </label>
              )}
            </div>
          </div>
        </div>


        {/* API Key Management */}
        <div className="mb-6">
          <ApiKeyManager />
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="group relative p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-green-500/50 transition-all duration-200 cursor-default overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <h3 className="font-mono font-semibold text-white mb-2">
              Unlimited Analyses
            </h3>
            <p className="font-mono text-xs text-white/50">
              Run as many evaluations as you need
            </p>
          </div>

          <div className="group relative p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-green-500/50 transition-all duration-200 cursor-default overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <h3 className="font-mono font-semibold text-white mb-2">
              API Access
            </h3>
            <p className="font-mono text-xs text-white/50">
              Generate and manage API keys
            </p>
          </div>

          <div className="group relative p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-green-500/50 transition-all duration-200 cursor-default overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <h3 className="font-mono font-semibold text-white mb-2">
              History Saved
            </h3>
            <p className="font-mono text-xs text-white/50">
              All analyses automatically stored
            </p>
          </div>
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
            ← Return to PowerShell.exposed
          </Link>
        </div>
      </div>
    </div>
  );
}
