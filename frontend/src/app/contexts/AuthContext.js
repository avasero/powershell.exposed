"use client"
import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getAnonymousAnalyses, clearAnonymousAnalyses } from '../../utils/cookies';
import { clearSessionFromStorage, saveSessionFromBackend } from '../../utils/session';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


const createUserSession = async (userId) => {
  try {



    clearSessionFromStorage();


    let ipAddress = null;
    let userAgent = 'Unknown';

    try {

      const ipResponse = await fetch('https://ipapi.co/json/');
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      }
    } catch (e) {

    }

    if (typeof navigator !== 'undefined') {
      userAgent = navigator.userAgent;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Timeout de 10 segundos para não travar o loading
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 10000)
    );

    const { makeAuthenticatedRequest } = await import('../../lib/api');
    const fetchPromise = makeAuthenticatedRequest('/create-user-session', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent
      })
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    const data = await response.json();

    if (response.ok && data.session_id) {

      saveSessionFromBackend(data.session_id);
      return data.session_id;
    } else {
      console.error('❌ Erro ao criar sessão:', data);
    }
  } catch (error) {
    console.error('❌ Erro ao criar sessão para usuário:', error);
  }
};

// Função para garantir que o perfil do usuário existe
const ensureUserProfile = async (user) => {
  console.log('🔵 ensureUserProfile INICIADO');
  console.log('🔵 User ID:', user.id);
  console.log('🔵 User Email:', user.email);
  console.log('🔵 User Metadata COMPLETO:', JSON.stringify(user.user_metadata, null, 2));
  console.log('🔵 notify_user no metadata:', user.user_metadata?.notify_user);
  console.log('🔵 Tipo do notify_user:', typeof user.user_metadata?.notify_user);
  
  try {

    // Timeout de 10 segundos para operações do Supabase
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile check timeout')), 10000)
    );

    // Verificar se perfil já existe
    console.log('🔵 Buscando perfil existente...');
    const fetchProfilePromise = supabase
      .from('profiles')
      .select('id, notify_user, email')
      .eq('id', user.id)
      .single();

    const { data: existingProfile, error: fetchError } = await Promise.race([
      fetchProfilePromise,
      timeoutPromise
    ]);

    console.log('🔵 Resultado da busca:');
    console.log('🔵 existingProfile:', JSON.stringify(existingProfile, null, 2));
    console.log('🔵 fetchError:', fetchError);

    // Se o perfil existe, verificar se precisamos atualizar notify_user
    if (existingProfile) {
      console.log('🟡 Perfil JÁ EXISTE!');
      console.log('🟡 notify_user atual no banco:', existingProfile.notify_user);
      console.log('🟡 notify_user tipo no banco:', typeof existingProfile.notify_user);
      
      const notifyUserFromMetadata = user.user_metadata?.notify_user;
      console.log('🟡 notifyUserFromMetadata (raw):', notifyUserFromMetadata);
      console.log('🟡 notifyUserFromMetadata tipo:', typeof notifyUserFromMetadata);
      
      const shouldUpdate = notifyUserFromMetadata === true && existingProfile.notify_user !== true;
      console.log('🟡 Deve atualizar? notifyUserFromMetadata === true:', notifyUserFromMetadata === true);
      console.log('🟡 Deve atualizar? existingProfile.notify_user !== true:', existingProfile.notify_user !== true);
      console.log('🟡 Deve atualizar (final):', shouldUpdate);
      
      // Atualizar notify_user se o valor do metadata for true e o perfil tiver false
      if (shouldUpdate) {
        console.log('🟢 ATUALIZANDO notify_user para TRUE...');
        const updatePromise = supabase
          .from('profiles')
          .update({ notify_user: true })
          .eq('id', user.id);

        const { data: updateData, error: updateError } = await Promise.race([
          updatePromise,
          timeoutPromise
        ]);

        console.log('🟢 Resultado do UPDATE:');
        console.log('🟢 updateData:', updateData);
        console.log('🟢 updateError:', updateError);

        if (updateError) {
          console.error('❌ Erro ao atualizar notify_user:', updateError);
        } else {
          console.log('✅ notify_user ATUALIZADO COM SUCESSO!');
        }
      } else {
        console.log('🟡 NÃO vai atualizar - condições não atendidas');
      }
      return;
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar perfil:', fetchError);
      return;
    }

    // Criar perfil se não existe
    console.log('🟢 Perfil NÃO existe, criando novo...');

    const profileData = {
      id: user.id,
      username: user.user_metadata?.username || user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.username || user.email,
      avatar_url: user.user_metadata?.avatar_url || null,
      notify_user: user.user_metadata?.notify_user === true,
    };

    console.log('🟢 Dados do perfil a criar:', JSON.stringify(profileData, null, 2));

    const insertProfilePromise = supabase
      .from('profiles')
      .insert(profileData);

    const { data: insertData, error: insertError } = await Promise.race([
      insertProfilePromise,
      timeoutPromise
    ]);

    console.log('🟢 Resultado do INSERT:');
    console.log('🟢 insertData:', insertData);
    console.log('🟢 insertError:', insertError);

    if (insertError) {
      console.error('❌ Erro ao criar perfil:', insertError);
    } else {
      console.log('✅ Perfil CRIADO COM SUCESSO!');
    }

  } catch (error) {
    console.error('❌ Erro ao garantir perfil:', error);
  }
};

// Função para migrar análises anônimas para usuário logado
const migrateAnonymousAnalyses = async (userId) => {
  try {
    // TEMPORARIAMENTE DESABILITADO para evitar rate limit no login
    return;

    const anonymousAnalyses = getAnonymousAnalyses();

    if (anonymousAnalyses.length === 0) {
      return;
    }

    // Migrar apenas as primeiras 3 análises para não estourar rate limit
    const analysesToMigrate = anonymousAnalyses.slice(0, 3);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    let migratedCount = 0;

    for (const analysis of analysesToMigrate) {
      try {
        const { makeAuthenticatedRequest } = await import('../../lib/api');
        const response = await makeAuthenticatedRequest('/evaluate', {
          method: 'POST',
          body: JSON.stringify({
            command: analysis.command,
            user_id: userId,
            search_type: 'MIGRATION',
            // Preservar dados da análise original
            ip_address: analysis.ip_address,
            country: analysis.country,
            city: analysis.city,
            region: analysis.region,
            timezone: analysis.timezone
          })
        });

        if (response.ok) {
          migratedCount++;
        } else {
          console.error(`❌ Erro ao migrar análise: ${analysis.command.substring(0, 50)}...`);
        }
      } catch (error) {
        console.error(`❌ Erro ao migrar análise individual:`, error);
      }

      // Delay de 200ms entre migrações para não sobrecarregar rate limit
      if (analysesToMigrate.indexOf(analysis) < analysesToMigrate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }



    // Limpar análises anônimas após migração bem-sucedida
    if (migratedCount > 0) {
      clearAnonymousAnalyses();

    }

  } catch (error) {
    console.error('❌ Erro ao migrar análises anônimas:', error);
  }
};

// Função para verificar e aplicar preferência de notify_user do localStorage
const checkAndApplyPendingNotifyUser = async (user) => {
  console.log('🟣 checkAndApplyPendingNotifyUser INICIADO');
  
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
        console.log('✅ notify_user atualizado com sucesso via localStorage!');
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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const sessionCreatedRef = useRef(false);

  // Pages that don't need authentication - ADICIONAR /evaluate AQUI
  const publicRoutes = useMemo(() => [
    '/login',
    '/register',
    '/signatures',
    '/landing',
    '/analysis',
    '/auth/confirm',
    '/history',
    '/terms',
    '/indicators',
    '/',
    '/evaluate',
    '/info/scoring'
  ], []);

  useEffect(() => {

    // Get initial session with timeout
    const getInitialSession = async () => {

      try {
        // Timeout de 10 segundos para sessão inicial
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout')), 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);

        if (error) {
          console.error('❌ AUTHCONTEXT: Erro ao buscar sessão:', error);
        } else if (session) {

          setUser(session.user);
        } else {

        }
      } catch (error) {
        console.error('❌ AUTHCONTEXT: Timeout ou erro na sessão inicial:', error);
      }

      setLoading(false);
    };

    getInitialSession();

    // Forçar loading a parar após 15 segundos como fallback absoluto
    const forceStopLoading = setTimeout(() => {
      setLoading(false);
    }, 15000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔴 onAuthStateChange DISPARADO');
        console.log('🔴 event:', event);
        console.log('🔴 session presente:', !!session);
        
        if (session) {
          console.log('🔴 session.user.id:', session.user.id);
          console.log('🔴 session.user.email:', session.user.email);
          console.log('🔴 session.user.user_metadata:', JSON.stringify(session.user.user_metadata, null, 2));
          console.log('🔴 notify_user no session:', session.user.user_metadata?.notify_user);
        }
        
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);

          // Executar operações em background sem bloquear o loading
          (async () => {
            try {
              console.log('🔴 Chamando ensureUserProfile...');
              // Garantir que o perfil existe (fallback caso o trigger não funcione)
              await ensureUserProfile(session.user);
              
              // Verificar e aplicar preferência de notify_user do localStorage
              console.log('🔴 Chamando checkAndApplyPendingNotifyUser...');
              await checkAndApplyPendingNotifyUser(session.user);

              // Criar nova sessão para o usuário logado APENAS SE AINDA NÃO FOI CRIADA
              if (!sessionCreatedRef.current) {
                sessionCreatedRef.current = true;
                await createUserSession(session.user.id);

                // Migrar análises anônimas se existirem
                await migrateAnonymousAnalyses(session.user.id);
              }
            } catch (error) {
              console.error('❌ Erro em operações pós-login:', error);
              sessionCreatedRef.current = false; // Reset em caso de erro para tentar novamente
            }
          })();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          sessionCreatedRef.current = false;
        } else if (session) {
          setUser(session.user);
        } else {
          setUser(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
      clearTimeout(forceStopLoading);
    };
  }, []);

  // Redirect logic
  useEffect(() => {
    if (!loading) {
      // Verificar rotas públicas incluindo rotas dinâmicas
      const isPublicRoute = publicRoutes.includes(pathname) ||
        pathname.startsWith('/analysis/') ||
        pathname.startsWith('/auth/') ||
        pathname.startsWith('/indicators/') ||
        pathname.startsWith('/info/');
      const userIsAuthenticated = user !== null;

      if (!userIsAuthenticated && !isPublicRoute) {
        // User is not authenticated and trying to access protected route
        router.push('/');
      }

      // Redirect logged-in users from landing page to analysis
      if (userIsAuthenticated && pathname === '/') {
        router.push('/evaluate');
      }
    }
  }, [user, loading, pathname, router, publicRoutes]);

  // Função desabilitada - não verificamos mais se email existe para evitar envio de emails
  const checkEmailExists = async (email) => {
    // Por razões de segurança, sempre retornamos que não conseguimos verificar
    // Isso força o signup a sempre tentar criar a conta, e o Supabase lida com duplicatas
    return { exists: null, error: null };
  };

  const signUpWithMagicLink = async (email, username, notifyUser = false) => {
    console.log('🔷 signUpWithMagicLink CHAMADO');
    console.log('🔷 email:', email);
    console.log('🔷 username:', username);
    console.log('🔷 notifyUser:', notifyUser);
    console.log('🔷 notifyUser tipo:', typeof notifyUser);
    
    try {
      const options = {
        email,
        options: {
          data: {
            username: username,
            full_name: username,
            notify_user: notifyUser
          },
          shouldCreateUser: true
        }
      };
      
      console.log('🔷 Options para signInWithOtp:', JSON.stringify(options, null, 2));
      
      const { data, error } = await supabase.auth.signInWithOtp(options);

      console.log('🔷 Resultado signInWithOtp:');
      console.log('🔷 data:', JSON.stringify(data, null, 2));
      console.log('🔷 error:', error);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('🔷 ERRO em signUpWithMagicLink:', error);
      return { data: null, error };
    }
  };

  const signInWithMagicLink = async (email) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Manter signUp e signIn para compatibilidade, mas deprecados
  const signUp = async (email, password, username) => {
    // Redirecionar para magic link
    return await signUpWithMagicLink(email, username);
  };

  const signIn = async (email, password) => {
    // Redirecionar para magic link
    return await signInWithMagicLink(email);
  };

  const signOut = async () => {
    try {
      // First, sign out from Supabase (this will trigger onAuthStateChange)
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }

      // Clear local state
      setUser(null);

      // Clear any local storage data
      clearSessionFromStorage();

      // Redirect to home page
      router.push('/');

      return { error: null };
    } catch (error) {
      console.error('SignOut error:', error);
      return { error };
    }
  };

  const isAuthenticated = useCallback(() => {
    return user !== null;
  }, [user]);

  // If loading, show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  // If not authenticated and not on a public route, don't render anything (already redirected)
  const isPublicRoute = publicRoutes.includes(pathname) ||
    pathname.startsWith('/analysis/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/indicators/') ||
    pathname.startsWith('/info/');
  if (!isAuthenticated() && !isPublicRoute) {
    return null;
  }

  const value = {
    user,
    signUp, // Compatibilidade - redireciona para magic link
    signIn, // Compatibilidade - redireciona para magic link
    signUpWithMagicLink,
    signInWithMagicLink,
    checkEmailExists, // Nova função para verificar se email existe
    signOut,
    isAuthenticated,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
