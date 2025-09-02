"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ErrorMessage, InfoMessage } from '../../components/Messages';
import ThemedButton from '../../components/ThemedButton';
import Link from 'next/link';

export default function ConfirmPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthConfirmation = async () => {
      try {
        // Extrair tokens dos parâmetros da URL
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const next = searchParams.get('next') || '/';

        console.log('🔐 Processando confirmação de auth:', { token_hash, type, next });

        if (!token_hash || !type) {
          throw new Error('Missing required parameters in URL');
        }

        // Magic link unificado - sempre pode ser login ou criação de conta
        setIsSignUp(type === 'signup' || type === 'magiclink');

        // Verificar o OTP/token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type,
        });

        if (error) {
          console.error('❌ Erro na verificação:', error);
          throw error;
        }

        if (data.user) {
          console.log('✅ Usuário autenticado com sucesso:', data.user.email);
          setSuccess(true);
          
          // Aguardar um pouco para mostrar a mensagem de sucesso
          setTimeout(() => {
            // Redirecionar para a página especificada ou dashboard
            if (next === '/' || next === '/landing') {
              router.push('/');
            } else {
              router.push(next);
            }
          }, 2000);
        } else {
          throw new Error('Authentication failed - no user returned');
        }

      } catch (err) {
        console.error('❌ Erro na confirmação:', err);
        
        // Mensagens de erro mais amigáveis
        if (err.message.includes('Token has expired')) {
          setError('This magic link has expired. Please request a new one.');
        } else if (err.message.includes('Invalid token')) {
          setError('This magic link is invalid. Please request a new one.');
        } else if (err.message.includes('Email link is invalid')) {
          setError('This magic link is invalid or has already been used. Please request a new one.');
        } else {
          setError(err.message || 'Authentication failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    // Só executar se temos os parâmetros necessários
    if (searchParams.get('token_hash') && searchParams.get('type')) {
      handleAuthConfirmation();
    } else {
      setLoading(false);
      setError('Invalid authentication link. Missing required parameters.');
    }
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md space-y-6 text-center">
          <LoadingSpinner />
          <h1 className="text-2xl font-mono font-bold" style={{color: 'var(--accent)'}}>
            Confirming your authentication...
          </h1>
          <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            Please wait while we verify your magic link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          {success ? (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl sm:text-3xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
                Welcome to PowerShell.exposed!
              </h1>
              <p className="font-mono text-sm mb-6" style={{color: 'var(--muted-foreground)'}}>
                You have been successfully authenticated and are now logged in.
              </p>
              <InfoMessage message="Redirecting you to the dashboard..." />
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl sm:text-3xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
                Authentication Failed
              </h1>
              <p className="font-mono text-sm mb-6" style={{color: 'var(--muted-foreground)'}}>
                There was a problem with your magic link.
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <ErrorMessage message={error} />
            
            <div className="mt-4 space-y-3">
              <Link href="/login">
                <ThemedButton className="w-full">
                  Try Login Again
                </ThemedButton>
              </Link>
              
              <Link href="/register">
                <ThemedButton 
                  variant="outline" 
                  className="w-full"
                  style={{
                    borderColor: 'var(--accent)',
                    color: 'var(--accent)'
                  }}
                >
                  Create New Account
                </ThemedButton>
              </Link>
              
              <Link href="/">
                <ThemedButton variant="outline" className="w-full">
                  Continue Without Account
                </ThemedButton>
              </Link>
            </div>
          </div>
        )}

        {success && (
          <div className="p-6 rounded-lg border" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <div className="text-center space-y-3">
              <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                If you&apos;re not redirected automatically, click below:
              </p>
              
              <Link href="/">
                <ThemedButton className="w-full">
                  Go to Dashboard
                </ThemedButton>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
