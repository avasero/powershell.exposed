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
  
  const { signUpWithMagicLink, signInWithMagicLink, checkEmailExists } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Tentar registrar diretamente - se email já existir, Supabase retornará erro específico
      const { data, error } = await signUpWithMagicLink(email, username);
      
      if (error) {
        if (error.message.includes('Invalid email')) {
          setError('Please enter a valid email address.');
        } else if (error.message.includes('User already registered') || 
                   error.message.includes('already registered') ||
                   error.message.includes('already exists')) {
          // Email já existe - mostrar mensagem de sucesso sem revelar que existe
          // Por razões de segurança, não enviamos nenhum email
          console.log('Email already exists, showing success message without sending any email');
          setMagicLinkSent(false);
          setMessage('Registration link sent! Check your email to complete the registration.');
        } else {
          setError(error.message);
        }
      } else {
        setMagicLinkSent(true);
        setMessage('Registration link sent! Check your email to complete the registration.');
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
              <div className="text-6xl mb-4">📧</div>
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
