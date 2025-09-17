"use client"
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
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

// Função para criar nova sessão para usuário logado
const createUserSession = async (userId) => {
  try {
  
    
    // Limpar sessão anterior do storage primeiro
    clearSessionFromStorage();
    
    // Obter informações do usuário para criar sessão
    let ipAddress = null;
    let userAgent = 'Unknown';
    
    try {
      // Tentar obter IP do usuário
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
    
    const fetchPromise = fetch(`${apiUrl}/create-user-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
  try {
    console.log('🔍 Verificando se perfil existe para:', user.email);
    
    // Timeout de 10 segundos para operações do Supabase
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile check timeout')), 10000)
    );
    
    // Verificar se perfil já existe
    const fetchProfilePromise = supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
    const { data: existingProfile, error: fetchError } = await Promise.race([
      fetchProfilePromise,
      timeoutPromise
    ]);
    
    if (existingProfile) {
      console.log('✅ Perfil já existe');
      return;
    }
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar perfil:', fetchError);
      return;
    }
    
    // Criar perfil se não existe
    console.log('🔄 Criando perfil para usuário:', user.email);
    
    const profileData = {
      id: user.id,
      username: user.user_metadata?.username || user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.username || user.email,
      avatar_url: user.user_metadata?.avatar_url || null,
    };
    
    const insertProfilePromise = supabase
      .from('profiles')
      .insert(profileData);
    
    const { error: insertError } = await Promise.race([
      insertProfilePromise,
      timeoutPromise
    ]);
    
    if (insertError) {
      console.error('❌ Erro ao criar perfil:', insertError);
    } else {
      console.log('✅ Perfil criado com sucesso');
    }
    
  } catch (error) {
    console.error('❌ Erro ao garantir perfil:', error);
  }
};

// Função para migrar análises anônimas para usuário logado
const migrateAnonymousAnalyses = async (userId) => {
  try {
 
    
    const anonymousAnalyses = getAnonymousAnalyses();
   
    
    if (anonymousAnalyses.length === 0) {
     
      return;
    }

    // Migrar cada análise anônima
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    let migratedCount = 0;
    
    for (const analysis of anonymousAnalyses) {
      try {
        const response = await fetch(`${apiUrl}/analyze-pcre2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
    }
    
   
    
    // Limpar análises anônimas após migração bem-sucedida
    if (migratedCount > 0) {
      clearAnonymousAnalyses();
     
    }
    
  } catch (error) {
    console.error('❌ Erro ao migrar análises anônimas:', error);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Pages that don't need authentication
  const publicRoutes = useMemo(() => ['/login', '/register', '/signatures', '/landing', '/analysis', '/auth/confirm', '/history', '/'], []);

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
      console.warn('⚠️ Forçando parada do loading após timeout');
      setLoading(false);
    }, 15000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session) {
          console.log('✅ Usuário logado via magic link');
          setUser(session.user);
          
          // Executar operações em background sem bloquear o loading
          (async () => {
            try {
              // Garantir que o perfil existe (fallback caso o trigger não funcione)
              await ensureUserProfile(session.user);
              
              // Criar nova sessão para o usuário logado
              await createUserSession(session.user.id);
              
              // Migrar análises anônimas se existirem
              await migrateAnonymousAnalyses(session.user.id);
            } catch (error) {
              console.error('❌ Erro em operações pós-login:', error);
            }
          })();
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 Usuário deslogado');
          setUser(null);
        } else if (session) {
          console.log('🔄 Sessão existente encontrada');
          setUser(session.user);
        } else {
          console.log('❌ Nenhuma sessão encontrada');
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
      const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/analysis/') || pathname.startsWith('/auth/');
      const userIsAuthenticated = user !== null;

      

      if (!userIsAuthenticated && !isPublicRoute) {
        
        // User is not authenticated and trying to access protected route
        router.push('/landing');
      } else {
       
      }
    } else {
     
    }
  }, [user, loading, pathname, router, publicRoutes]);

  // Função para verificar se email já existe
  const checkEmailExists = async (email) => {
    try {
      // Tentar fazer signInWithOtp sem criar usuário para verificar se existe
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false // Não criar usuário, apenas verificar
        }
      });

      // Se não deu erro, significa que o email foi encontrado e email será enviado
      if (!error) {
        return { exists: true, error: null };
      }

      // Verificar tipos específicos de erro
      if (error.message.includes('Signup') || 
          error.message.includes('User not found') ||
          error.message.includes('Invalid login') ||
          error.message.includes('Email not found')) {
        return { exists: false, error: null };
      }

      // Para rate limit ou outros erros, retornar o erro mas não podemos determinar se existe
      if (error.message.includes('rate limit') || error.message.includes('too many')) {
        return { exists: null, error: error }; // null = não conseguimos determinar
      }

      // Outros erros - assumir que não existe
      return { exists: false, error: null };
    } catch (error) {
      return { exists: null, error: error };
    }
  };

  const signUpWithMagicLink = async (email, username) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            username: username,
            full_name: username
          },
          shouldCreateUser: true
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signInWithMagicLink = async (email) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false  // ← Login apenas para usuários existentes
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
      // Immediately set user to null for faster UI update
      setUser(null);
      
      // Redirect immediately
      router.push('/landing');
      
      // Then handle Supabase signout in background
      const { error } = await supabase.auth.signOut();
      if (error) {
        
        // Don't throw error here since user is already redirected
      }
      
      return { error: null };
    } catch (error) {
      console.error('SignOut error:', error);
      return { error };
    }
  };

  const isAuthenticated = () => {
    return user !== null;
  };

  // If loading, show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: 'var(--background)'}}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: 'var(--accent)'}}></div>
      </div>
    );
  }

  // If not authenticated and not on a public route, don't render anything (already redirected)
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/analysis/') || pathname.startsWith('/auth/');
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
