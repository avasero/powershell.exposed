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
  const [showRegisterPopup, setShowRegisterPopup] = useState(false);
  
  const { signIn } = useAuth();
  const router = useRouter();

  const handleRegisterClick = (e) => {
    e.preventDefault();
    setShowRegisterPopup(true);
  };

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
              Does not have an account?{' '}
              <button 
                onClick={handleRegisterClick}
                className="font-semibold hover:underline cursor-pointer" 
                style={{color: 'var(--accent)'}}
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Registration Popup */}
      {showRegisterPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowRegisterPopup(false)}
          />
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', border: '1px solid' }}
          >
            <div className="text-center">
              <div className="mb-4">
                <svg 
                  className="w-12 h-12 mx-auto text-yellow-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <h3 
                className="text-lg font-mono font-semibold mb-2" 
                style={{ color: 'var(--foreground)' }}
              >
                Feature Not Available
              </h3>
              <p 
                className="text-sm font-mono mb-4" 
                style={{ color: 'var(--muted-foreground)' }}
              >
                Registration is temporarily disabled. This feature will be available soon.
              </p>
              <button
                onClick={() => setShowRegisterPopup(false)}
                className="px-4 py-2 font-mono font-semibold rounded text-sm transition-all duration-200 hover:opacity-80"
                style={{
                  backgroundColor: 'var(--accent)', 
                  color: 'var(--background)'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
