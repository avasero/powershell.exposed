"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { ErrorMessage, InfoMessage } from '../components/Messages';
import FormInput from '../components/FormInput';
import ThemedButton from '../components/ThemedButton';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showEmailExistsPrompt, setShowEmailExistsPrompt] = useState(false);
  
  const { signUpWithMagicLink, signInWithMagicLink, checkEmailExists } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setShowEmailExistsPrompt(false);

    try {
      // Primeiro, verificar se o email já existe
      const { exists, error: checkError } = await checkEmailExists(email);
      
      if (checkError) {
        // Se houve erro na verificação (rate limit, etc.), prosseguir com registro normal
        console.warn('Could not check email existence:', checkError.message);
        // Continuar com o fluxo normal de registro
      } else if (exists === true) {
        // Email já existe, mostrar prompt para login
        setShowEmailExistsPrompt(true);
        setLoading(false);
        return;
      }
      // Se exists === false ou null, prosseguir com registro

      // Email não existe, prosseguir com registro
      const { data, error } = await signUpWithMagicLink(email, username);
      
      if (error) {
        if (error.message.includes('Invalid email')) {
          setError('Please enter a valid email address.');
        } else {
          setError(error.message);
        }
      } else {
        setMagicLinkSent(true);
        setMessage('Magic link sent! Check your email to complete the registration.');
      }
    } catch (err) {
      setError('Unexpected error during registration');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginInstead = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    setShowEmailExistsPrompt(false);

    try {
      const { data, error } = await signInWithMagicLink(email);
      
      if (error) {
        setError(error.message);
      } else {
        setMagicLinkSent(true);
        setMessage('Login link sent! Check your email to sign in.');
      }
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
            Sign Up
          </h1>
          <p className="mt-2 font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            {magicLinkSent ? 'Check your email for the magic link' : 'Create your account with magic link'}
          </p>
        </div>

        <div className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
          {showEmailExistsPrompt ? (
            <div className="space-y-4 text-center">
              <div className="text-4xl mb-4">🤔</div>
              <h2 className="text-xl font-mono font-bold" style={{color: 'var(--accent)'}}>
                Email Already Exists
              </h2>
              <p className="text-sm font-mono" style={{color: 'var(--muted-foreground)'}}>
                An account with <strong>{email}</strong> already exists.
              </p>
              <p className="text-sm font-mono" style={{color: 'var(--muted-foreground)'}}>
                Would you like to log in instead?
              </p>
              
              {error && <ErrorMessage message={error} />}
              
              <div className="space-y-3">
                <ThemedButton
                  onClick={handleLoginInstead}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Send Login Link'}
                </ThemedButton>
                
                <ThemedButton
                  onClick={() => {
                    setShowEmailExistsPrompt(false);
                    setError('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Back to Form
                </ThemedButton>
              </div>
            </div>
          ) : !magicLinkSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />

              <FormInput
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                required
              />

              {error && <ErrorMessage message={error} />}
              {message && <InfoMessage message={message} />}

              <ThemedButton
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
              </ThemedButton>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-xl font-mono font-bold" style={{color: 'var(--accent)'}}>
                Magic Link Sent!
              </h2>
              <p className="text-sm font-mono" style={{color: 'var(--muted-foreground)'}}>
                We&apos;ve sent a secure registration link to <strong>{email}</strong>
              </p>
              <p className="text-sm font-mono" style={{color: 'var(--muted-foreground)'}}>
                Click the link in your email to complete your account creation.
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
            
            {/* Separador visual */}
            <div className="my-4 flex items-center">
              <div className="flex-1 border-t" style={{borderColor: 'var(--border-color)'}}></div>
              <span className="px-3 font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>or</span>
              <div className="flex-1 border-t" style={{borderColor: 'var(--border-color)'}}></div>
            </div>
            
            {/* Botão Try Analysis */}
            <Link href="/">
              <ThemedButton 
                variant="outline" 
                className="w-full"
                style={{
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)'
                }}
              >
                Try Analysis Without Account
              </ThemedButton>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
