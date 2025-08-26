'use client';

import { useState, useEffect } from 'react';

export default function InlineCaptcha({ 
  onSolved, 
  onError,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  className = ""
}) {
  const [captchaData, setCaptchaData] = useState(null);
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Generate captcha when component mounts
  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = async () => {
    setIsLoading(true);
    setError('');
    setAnswer('');
    
    try {
      const response = await fetch(`${apiUrl}/generate-captcha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setCaptchaData(data.captcha);
      } else {
        setError(data.error || 'Error generating captcha');
        onError?.(data.error || 'Error generating captcha');
      }
    } catch (err) {
      setError('Connection error when generating captcha');
      onError?.('Connection error when generating captcha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!captchaData || !answer.trim()) {
      setError('Please enter an answer');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/verify-captcha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: captchaData.token,
          answer: answer.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Captcha resolvido com sucesso
        onSolved({
          token: captchaData.token,
          answer: answer.trim()
        });
      } else {
        setError(data.error || 'Incorrect answer');
        // Generate new captcha after error
        setTimeout(() => {
          generateCaptcha();
        }, 1500);
      }
    } catch (err) {
      setError('Connection error when verifying captcha');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRefresh = () => {
    generateCaptcha();
  };

  return (
    <div className={`border rounded-lg p-4 ${className}`} style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔒</span>
        <h3 className="font-mono font-bold text-sm" style={{color: 'var(--foreground)'}}>
          Security Verification
        </h3>
      </div>
      
      <p className="font-mono text-xs mb-4" style={{color: 'var(--muted-foreground)'}}>
        To continue, solve the math operation below:
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{borderColor: 'var(--accent)'}}></div>
          <span className="ml-2 font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            Loading captcha...
          </span>
        </div>
      ) : captchaData ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Captcha Question */}
          <div className="flex items-center justify-center py-6 rounded-lg" style={{backgroundColor: 'var(--muted)'}}>
            <div className="text-center">
              <div className="font-mono text-xl font-bold mb-2" style={{color: 'var(--foreground)'}}>
                {captchaData.question}
              </div>
              <div className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                Enter only the number answer
              </div>
            </div>
          </div>

          {/* Answer Field */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setError(''); // Clear error when user types
                }}
                placeholder="Your answer..."
                className="w-full px-3 py-2 rounded border font-mono text-sm text-center"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: error ? '#ef4444' : 'var(--border-color)',
                  color: 'var(--foreground)'
                }}
                disabled={isVerifying}
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9\-]*"
              />
            </div>
            
            {/* Verify Button */}
            <button
              type="submit"
              disabled={!answer.trim() || isVerifying}
              className="px-4 py-2 rounded font-mono text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--background)'
              }}
            >
              {isVerifying ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  Verifying...
                </div>
              ) : (
                'Verify'
              )}
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isVerifying}
              className="px-3 py-2 rounded border font-mono text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)'
              }}
              title="Generate new captcha"
            >
              🔄
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2 rounded text-sm font-mono text-center text-red-400 bg-red-900/20 border border-red-800">
              {error}
            </div>
          )}
        </form>
      ) : (
        <div className="text-center py-4">
          <button
            onClick={generateCaptcha}
            className="px-4 py-2 rounded font-mono text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--background)'
            }}
          >
            Load Captcha
          </button>
        </div>
      )}

      <div className="mt-3 text-xs text-center font-mono" style={{color: 'var(--muted-foreground)'}}>
        This verification is required starting from the 6th search to prevent automated usage
      </div>
    </div>
  );
}
