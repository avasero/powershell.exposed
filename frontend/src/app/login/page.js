"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { ErrorMessage, InfoMessage } from '../components/Messages';
import FormInput from '../components/FormInput';
import ThemedButton from '../components/ThemedButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  const { signInWithMagicLink } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Rate limiting: Check if last login attempt was less than 3 minutes ago
    const lastLoginAttempt = localStorage.getItem('lastLoginAttempt');
    const now = Date.now();
    const threeMinutes = 3 * 60 * 1000; // 3 minutes in milliseconds

    if (lastLoginAttempt && (now - parseInt(lastLoginAttempt)) < threeMinutes) {
      const remainingTime = Math.ceil((threeMinutes - (now - parseInt(lastLoginAttempt))) / 1000 / 60);
      setError(`Please wait ${remainingTime} minute(s) before trying to login again.`);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await signInWithMagicLink(email);
      
      if (error) {
        if (error.message.includes('Invalid email')) {
          setError('Please enter a valid email address.');
        } else if (error.message.includes('rate limit')) {
          setError('Too many requests. Please wait a moment before trying again.');
        } else {
          // For security reasons, don't reveal if email exists or not
          setMagicLinkSent(true);
          setMessage('Login link sent! Check your email to complete the login.');
        }
      } else {
        setMagicLinkSent(true);
        setMessage('Login link sent! Check your email to complete the login.');
      }

      // Store the timestamp of this login attempt
      localStorage.setItem('lastLoginAttempt', now.toString());
    } catch (err) {
      setError('Unexpected error during login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-mono font-bold" style={{color: 'var(--accent)'}}>
            Login
          </h1>
          <p className="mt-2 font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            {magicLinkSent ? 'Check your email' : 'Enter your email to receive a login link'}
          </p>
        </div>

        <div className="p-6 rounded-lg border bg-black/80 border-green-500/30">
          {!magicLinkSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />

              {error && <ErrorMessage message={error} />}
              {message && <InfoMessage message={message} />}

              <ThemedButton
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full"
                style={{
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)'
                }}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Login'}
              </ThemedButton>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              
              <h2 className="text-xl font-mono font-bold" style={{color: 'var(--accent)'}}>
                Login Link Sent!
              </h2>
              <p className="text-sm font-mono" style={{color: 'var(--muted-foreground)'}}>
                We&apos;ve sent a secure login link to <strong>{email}</strong>
              </p>
              <p className="text-sm font-mono" style={{color: 'var(--muted-foreground)'}}>
                Click the link in your email to complete the login process. This link is valid for 15 minutes.
              </p>
              <p className="text-sm font-mono" style={{color: 'var(--accent)'}}>
                If you&apos;ve not received a login link you probably have not signed up yet
              </p>
              
              {message && <InfoMessage message={message} />}
              
              <div className="pt-4">
                <ThemedButton
                  onClick={() => {
                    setMagicLinkSent(false);
                    setMessage('');
                    setError('');
                  }}
                  variant="outline"
                  className="w-full"
                  style={{
                    borderColor: 'var(--accent)',
                    color: 'var(--accent)'
                  }}
                >
                  Send Another Link
                </ThemedButton>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold hover:underline" style={{color: 'var(--accent)'}}>
                Sign up
              </Link>
            </p>
            
          
            <div className="my-4 flex items-center">
              <div className="flex-1 border-t" style={{borderColor: 'var(--border-color)'}}></div>
              <span className="px-3 font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>or</span>
              <div className="flex-1 border-t" style={{borderColor: 'var(--border-color)'}}></div>
            </div>
            
          
            <Link href="/">
              <ThemedButton 
                variant="outline" 
                className="w-full"
              >
                Evaluate Command Without Account
              </ThemedButton>
            </Link>
          </div>
        </div>
      </div>


    </div>
  );
}
