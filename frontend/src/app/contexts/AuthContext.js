"use client"
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
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
    console.log('🔄 Criando nova sessão para usuário:', userId);
    
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
      console.log('Não foi possível obter IP para criar sessão');
    }
    
    if (typeof navigator !== 'undefined') {
      userAgent = navigator.userAgent;
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/create-user-session`, {
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

    const data = await response.json();
    
    if (response.ok && data.session_id) {
      console.log('✅ Nova sessão criada para usuário:', data.session_id);
      saveSessionFromBackend(data.session_id);
      return data.session_id;
    } else {
      console.error('❌ Erro ao criar sessão:', data);
    }
  } catch (error) {
    console.error('❌ Erro ao criar sessão para usuário:', error);
  }
};

// Função para migrar análises anônimas para usuário logado
const migrateAnonymousAnalyses = async (userId) => {
  try {
    console.log('🔄 Migrando análises anônimas para usuário:', userId);
    
    const anonymousAnalyses = getAnonymousAnalyses();
    console.log('📊 Análises anônimas encontradas:', anonymousAnalyses.length);
    
    if (anonymousAnalyses.length === 0) {
      console.log('ℹ️ Nenhuma análise anônima para migrar');
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
          console.log(`✅ Análise migrada: ${analysis.command.substring(0, 50)}...`);
        } else {
          console.error(`❌ Erro ao migrar análise: ${analysis.command.substring(0, 50)}...`);
        }
      } catch (error) {
        console.error(`❌ Erro ao migrar análise individual:`, error);
      }
    }
    
    console.log(`✅ Migração concluída: ${migratedCount}/${anonymousAnalyses.length} análises migradas`);
    
    // Limpar análises anônimas após migração bem-sucedida
    if (migratedCount > 0) {
      clearAnonymousAnalyses();
      console.log('🧹 Análises anônimas limpas após migração');
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
  const publicRoutes = useMemo(() => ['/login', '/register', '/signatures', '/landing', '/analysis', '/'], []);

  useEffect(() => {
    console.log('🚀 AUTHCONTEXT: Inicializando sessão...');
    // Get initial session
    const getInitialSession = async () => {
      console.log('🔍 AUTHCONTEXT: Buscando sessão inicial...');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ AUTHCONTEXT: Erro ao buscar sessão:', error);
      } else if (session) {
        console.log('✅ AUTHCONTEXT: Sessão encontrada:', session.user);
        setUser(session.user);
      } else {
        console.log('ℹ️ AUTHCONTEXT: Nenhuma sessão encontrada');
      }
      console.log('🏁 AUTHCONTEXT: Finalizando carregamento inicial');
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AUTHCONTEXT: Mudança de estado de autenticação:', event);
        console.log('  - Evento:', event);
        console.log('  - Session:', session);
        
        if (session) {
          console.log('✅ AUTHCONTEXT: Usuário autenticado:', session.user);
          setUser(session.user);
        } else {
          console.log('ℹ️ AUTHCONTEXT: Usuário deslogado');
          setUser(null);
        }
        console.log('🏁 AUTHCONTEXT: Finalizando carregamento após mudança');
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // Redirect logic
  useEffect(() => {
    console.log('🔄 AUTHCONTEXT: useEffect executado');
    console.log('  - loading:', loading);
    console.log('  - pathname:', pathname);
    console.log('  - user:', user);
    
    if (!loading) {
      // Check for exact matches and dynamic routes
      const isPublicRoute = publicRoutes.includes(pathname) || 
                           pathname.startsWith('/analysis/'); // Allow all analysis routes including /analysis/[id]
      const userIsAuthenticated = user !== null;

      console.log('🔍 AUTHCONTEXT: Verificação de acesso');
      console.log('  - pathname:', pathname);
      console.log('  - pathname type:', typeof pathname);
      console.log('  - pathname length:', pathname?.length);
      console.log('  - publicRoutes:', publicRoutes);
      console.log('  - isPublicRoute:', isPublicRoute);
      console.log('  - userIsAuthenticated:', userIsAuthenticated);
      console.log('  - user:', user);
      console.log('  - publicRoutes.includes("/"):', publicRoutes.includes('/'));
      console.log('  - publicRoutes.includes(pathname):', publicRoutes.includes(pathname));
      console.log('  - pathname.startsWith("/analysis/"):', pathname.startsWith('/analysis/'));

      if (!userIsAuthenticated && !isPublicRoute) {
        console.log('❌ AUTHCONTEXT: Redirecionando para /landing');
        console.log('  - Motivo: rota não é pública e usuário não autenticado');
        console.log('  - Rota atual:', pathname);
        console.log('  - Rotas públicas:', publicRoutes);
        // User is not authenticated and trying to access protected route
        router.push('/landing');
      } else {
        console.log('✅ AUTHCONTEXT: Acesso permitido');
        console.log('  - Motivo: rota pública OU usuário autenticado');
        console.log('  - Rota pública:', isPublicRoute);
        console.log('  - Usuário autenticado:', userIsAuthenticated);
      }
    } else {
      console.log('⏳ AUTHCONTEXT: Ainda carregando, aguardando...');
    }
  }, [user, loading, pathname, router, publicRoutes]);

  const signUp = async (email, password, username) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            full_name: username
          }
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      // Quando usuário faz login, criar nova sessão e migrar análises anônimas
      if (data.user) {
        console.log('✅ Login bem-sucedido, criando nova sessão para usuário:', data.user.id);
        
        // Criar nova sessão para o usuário logado
        await createUserSession(data.user.id);
        
        // Migrar análises anônimas se existirem
        await migrateAnonymousAnalyses(data.user.id);
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
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
        console.error('Supabase signout error:', error);
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
  const isPublicRoute = publicRoutes.includes(pathname);
  if (!isAuthenticated() && !isPublicRoute) {
    return null;
  }

  const value = {
    user,
    signUp,
    signIn,
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
