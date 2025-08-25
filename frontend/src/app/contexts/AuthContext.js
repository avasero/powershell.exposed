"use client"
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Pages that don't need authentication
  const publicRoutes = ['/login', '/register', '/signatures', '/landing', '/analysis', '/'];

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
      const isPublicRoute = publicRoutes.includes(pathname);
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
