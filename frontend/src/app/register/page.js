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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const { signUp } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    if (!email || !username || !password || !confirmPassword) {
      setError('All fields are required');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await signUp(email, password, username);
      
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('This email is already registered');
        } else if (error.message.includes('Password should be at least')) {
          setError('Password must be at least 6 characters');
        } else {
          setError(error.message);
        }
      } else {
        setMessage('Registration successful! Check your email to confirm your account.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
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
            Register
          </h1>
          <p className="mt-2 font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            Create your account
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
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
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

            <FormInput
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? <LoadingSpinner size="sm" /> : 'Sign Up'}
            </ThemedButton>
          </form>

          <div className="mt-6 text-center">
            <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold hover:underline" style={{color: 'var(--accent)'}}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
