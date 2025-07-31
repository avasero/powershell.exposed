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
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please confirm your email before logging in');
        } else {
          setError(error.message);
        }
      } else if (data.user) {
        setMessage('Login successful!');
        router.push('/');
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
            Login
          </h1>
          <p className="mt-2 font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            Sign in to your account
          </p>
        </div>

        <div className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
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
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && <ErrorMessage message={error} />}
            {message && <InfoMessage message={message} />}

            <ThemedButton
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
            </ThemedButton>
          </form>

          <div className="mt-6 text-center">
            <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold hover:underline" style={{color: 'var(--accent)'}}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
