"use client";
import { useAuth } from '../contexts/AuthContext';
import ApiKeyManager from '../components/ApiKeyManager';

export default function ApiKeysPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold" style={{color: 'var(--accent)'}}>
            Authentication Required
          </h1>
          <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            Please log in to manage your API Keys.
          </p>
          <div className="space-y-3">
            <a href="/login" className="block">
              <button 
                className="w-full px-4 py-2 rounded font-mono font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-foreground)'
                }}
              >
                Sign In
              </button>
            </a>
            <a href="/register" className="block">
              <button 
                className="w-full px-4 py-2 rounded font-mono font-medium border transition-colors"
                style={{
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)',
                  backgroundColor: 'transparent'
                }}
              >
                Create Account
              </button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl">
        <ApiKeyManager />
      </div>
    </div>
  );
}
