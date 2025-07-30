"use client"
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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

  // Páginas que não precisam de autenticação
  const publicRoutes = ['/login', '/register'];

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } else {
          setUser(null);
          // Se não está autenticado e não está em uma rota pública, redireciona para login
          if (!publicRoutes.includes(pathname)) {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUser(null);
        localStorage.removeItem('user');
        if (!publicRoutes.includes(pathname)) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    router.push('/');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    router.push('/login');
  };

  const isAuthenticated = () => {
    return user !== null;
  };

  // Se está carregando, mostra loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: 'var(--background)'}}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: 'var(--accent)'}}></div>
      </div>
    );
  }

  // Se não está autenticado e não está em uma rota pública, não renderiza nada (já redirecionou)
  if (!isAuthenticated() && !publicRoutes.includes(pathname)) {
    return null;
  }

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
