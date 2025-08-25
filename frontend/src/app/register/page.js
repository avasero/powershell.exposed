"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemedButton from '../components/ThemedButton';

export default function RegisterPage() {
  const router = useRouter();

  // Automatically redirect to landing page after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/landing');
    }, 5000); // Redirect after 5 seconds

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mb-6">
            <svg 
              className="w-16 h-16 mx-auto text-yellow-500" 
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
          <h1 className="text-2xl sm:text-3xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
            Registration Not Available
          </h1>
          <p className="mt-2 font-mono text-sm mb-6" style={{color: 'var(--muted-foreground)'}}>
            Registration is temporarily disabled. This feature will be available soon.
          </p>
        </div>

        <div className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
          <div className="text-center space-y-4">
            <p className="font-mono text-sm" style={{color: 'var(--foreground)'}}>
              You will be redirected to the landing page in a few seconds, or you can go there manually.
            </p>
            
            <div className="space-y-3">
              <Link href="/landing">
                <ThemedButton className="w-full">
                  Go to Landing Page
                </ThemedButton>
              </Link>
              
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
              
              <Link href="/login">
                <ThemedButton variant="outline" className="w-full">
                  Login Instead
                </ThemedButton>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
