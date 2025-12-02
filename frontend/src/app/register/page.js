"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { ErrorMessage, InfoMessage } from '../components/Messages';
import FormInput from '../components/FormInput';
import ThemedButton from '../components/ThemedButton';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  const { signUpWithMagicLink, signInWithMagicLink, checkEmailExists } = useAuth();
  const router = useRouter();

  // Check rate limit using Supabase function
  const checkRateLimit = async (email) => {
    try {
      const { data, error } = await supabase.rpc('check_login_rate_limit', {
        p_email: email,
        p_attempt_type: 'signup',
        p_window_minutes: 3
      });
      
      if (error) {
        console.error('Rate limit check error:', error);
        // On error, allow the attempt (fail open for UX)
        return { allowed: true, seconds_remaining: 0 };
      }
      
      return data;
    } catch (err) {
      console.error('Rate limit check exception:', err);
      return { allowed: true, seconds_remaining: 0 };
    }
  };

  // Get user's IP address with fallback APIs
  const getIpAddress = async () => {
    const apis = [
      { url: 'https://api.ipify.org?format=json', parser: (data) => data.ip },
      { url: 'https://ipinfo.io/json', parser: (data) => data.ip },
      { url: 'https://api.ip.sb/ip', parser: (text) => text.trim(), isText: true }
    ];
    
    for (const api of apis) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(api.url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          if (api.isText) {
            const text = await response.text();
            return api.parser(text);
          }
          const data = await response.json();
          return api.parser(data);
        }
      } catch (err) {
        // Try next API
        continue;
      }
    }
    return null;
  };

  // Record signup attempt in Supabase
  const recordSignupAttempt = async (email, ipAddress) => {
    try {
      await supabase.rpc('record_login_attempt', {
        p_email: email,
        p_attempt_type: 'signup',
        p_ip_address: ipAddress,
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
      });
    } catch (err) {
      console.error('Failed to record signup attempt:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!acceptedTerms) {
      setError('You must accept the Terms & Conditions to create an account.');
      setLoading(false);
      return;
    }

    // Check rate limit from Supabase
    const rateLimit = await checkRateLimit(email);
    
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(rateLimit.seconds_remaining / 60);
      const seconds = rateLimit.seconds_remaining % 60;
      
      if (minutes > 0) {
        setError(`Please wait ${minutes} minute(s) and ${seconds} second(s) before trying again.`);
      } else {
        setError(`Please wait ${seconds} second(s) before trying again.`);
      }
      setLoading(false);
      return;
    }

    try {
      // Get IP address in parallel with the magic link request
      const [ipAddress, { data, error }] = await Promise.all([
        getIpAddress(),
        signUpWithMagicLink(email, username)
      ]);
      
      // Record the attempt regardless of outcome
      await recordSignupAttempt(email, ipAddress);
      
      if (error) {
        if (error.message.includes('Invalid email')) {
          setError('Please enter a valid email address.');
        } else if (error.message.includes('rate limit')) {
          setError('Too many requests. Please wait a moment before trying again.');
        } else if (error.message.includes('Signups not allowed')) {
          setError('Signups are currently disabled. Please try again later.');
        } else {
          // Mostrar mensagem genérica por segurança
          setMagicLinkSent(true);
          setMessage('Registration link sent! Check your email to complete the sign up.');
        }
      } else {
        setMagicLinkSent(true);
        setMessage('Registration link sent! Check your email to complete the sign up.');
      }
    } catch (err) {
      setError('Unexpected error during registration');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };




  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-mono font-bold" style={{color: 'var(--accent)'}}>
            Sign Up
          </h1>
          <p className="mt-2 font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            {magicLinkSent ? 'Check your email' : 'Create your account with magic link'}
          </p>
        </div>

        <div className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
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
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border cursor-pointer"
                  style={{
                    accentColor: 'var(--accent)',
                    borderColor: 'var(--border-color)'
                  }}
                  required
                />
                <label 
                  htmlFor="terms" 
                  className="text-sm font-mono cursor-pointer"
                  style={{color: 'var(--muted-foreground)'}}
                >
                  I agree to the{' '}
                  <Link 
                    href="/terms" 
                    target="_blank"
                    className="font-semibold hover:underline" 
                    style={{color: 'var(--accent)'}}
                  >
                    Terms & Conditions
                  </Link>
                </label>
              </div>

              {error && <ErrorMessage message={error} />}
              {message && <InfoMessage message={message} />}

              <ThemedButton
                type="submit"
                disabled={loading}
                variant="outline"
                className="w-full"
                style={{
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)'
                }}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
              </ThemedButton>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <h2 className="text-xl font-mono font-bold" style={{color: 'var(--accent)'}}>
                Registration Link Sent!
              </h2>
              <p className="text-sm font-mono" style={{color: 'var(--muted-foreground)'}}>
                We&apos;ve sent a secure registration link to <strong>{email}</strong>
              </p>
              <p className="text-sm font-mono" style={{color: 'var(--muted-foreground)'}}>
                Click the link in your email to complete your account creation. This link is valid for 15 minutes.
              </p>
              <p className="text-sm font-mono" style={{color: 'var(--accent)'}}>
                If you&apos;ve not received a registration link, please try again
              </p>
              
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
              Already have an account?{' '}
              <Link href="/login" className="font-semibold hover:underline" style={{color: 'var(--accent)'}}>
                Sign in
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
