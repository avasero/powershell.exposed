"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ErrorMessage, InfoMessage } from '../../components/Messages';
import ThemedButton from '../../components/ThemedButton';
import Link from 'next/link';

// Função para aplicar notify_user do localStorage
const applyPendingNotifyUser = async (user) => {
  console.log('🟣 applyPendingNotifyUser INICIADO na página de confirm');
  console.log('🟣 user.id:', user.id);
  console.log('🟣 user.email:', user.email);
  
  try {
    const pendingData = localStorage.getItem('pending_notify_user');
    console.log('🟣 pendingData do localStorage:', pendingData);
    
    if (!pendingData) {
      console.log('🟣 Nenhuma preferência pendente no localStorage');
      return;
    }
    
    const parsed = JSON.parse(pendingData);
    console.log('🟣 Dados parseados:', JSON.stringify(parsed, null, 2));
    
    // Verificar se o email corresponde e se não expirou (24 horas)
    const isExpired = Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000;
    const emailMatches = parsed.email?.toLowerCase() === user.email?.toLowerCase();
    
    console.log('🟣 Email do user:', user.email);
    console.log('🟣 Email no localStorage:', parsed.email);
    console.log('🟣 Email corresponde:', emailMatches);
    console.log('🟣 Expirado:', isExpired);
    
    if (isExpired) {
      console.log('🟣 Preferência expirada, removendo...');
      localStorage.removeItem('pending_notify_user');
      return;
    }
    
    if (!emailMatches) {
      console.log('🟣 Email não corresponde, ignorando...');
      return;
    }
    
    if (parsed.notify_user === true) {
      console.log('🟣 Atualizando notify_user para TRUE no banco...');
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ notify_user: true })
        .eq('id', user.id);
      
      console.log('🟣 Resultado do UPDATE:', { data, error });
      
      if (error) {
        console.error('❌ Erro ao atualizar notify_user:', error);
      } else {
        console.log('✅ notify_user atualizado com sucesso via localStorage na página confirm!');
      }
    }
    
    // Limpar o localStorage após processar
    localStorage.removeItem('pending_notify_user');
    console.log('🟣 localStorage limpo');
    
  } catch (error) {
    console.error('❌ Erro ao processar pending_notify_user:', error);
    localStorage.removeItem('pending_notify_user');
  }
};

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

        console.log('🔐 AUTH CONFIRM - Iniciando');
        console.log('🔐 token_hash:', token_hash ? 'presente' : 'ausente');
        console.log('🔐 type:', type);
        console.log('🔐 next:', next);

        if (!token_hash || !type) {
          throw new Error('Missing required parameters in URL');
        }

        // Magic link unificado - sempre pode ser login ou criação de conta
        setIsSignUp(type === 'signup' || type === 'magiclink');

        // Verificar o OTP/token
        console.log('🔐 Chamando verifyOtp...');
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type,
        });

        console.log('🔐 Resultado verifyOtp:');
        console.log('🔐 data:', JSON.stringify(data, null, 2));
        console.log('🔐 error:', error);

        if (error) {
          console.error('❌ Erro na verificação:', error);
          throw error;
        }

        if (data.user) {
          console.log('🔐 USER CONFIRMADO:');
          console.log('🔐 user.id:', data.user.id);
          console.log('🔐 user.email:', data.user.email);
          console.log('🔐 user.user_metadata:', JSON.stringify(data.user.user_metadata, null, 2));
          console.log('🔐 user.user_metadata.notify_user:', data.user.user_metadata?.notify_user);
          
          // APLICAR NOTIFY_USER DO LOCALSTORAGE IMEDIATAMENTE
          console.log('🔐 Chamando applyPendingNotifyUser...');
          await applyPendingNotifyUser(data.user);
          
          setSuccess(true);
          
          // Redirecionar mais rapidamente para melhor UX
          setTimeout(() => {
            // Redirecionar para a página especificada ou dashboard
            if (next === '/' || next === '/landing') {
              router.push('/');
            } else {
              router.push(next);
            }
          }, 1500); // Reduzido de 2000ms para 1500ms
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
                Welcome to powershell.exposed!
              </h1>
              <p className="font-mono text-sm mb-6" style={{color: 'var(--muted-foreground)'}}>
                Authentication successful! You are now logged in and can access all features.
              </p>
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
                  Sign Up Instead
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
