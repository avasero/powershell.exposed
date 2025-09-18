"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Update CSS variables and save to localStorage
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.style.setProperty('--primary-green', '#2D8A2F');
      root.style.setProperty('--primary-purple', '#5B2C87');
      root.style.setProperty('--primary-black', '#FFFFFF');
      root.style.setProperty('--primary-white', '#000000');
      root.style.setProperty('--primary-blue', '#16A34A');
      root.style.setProperty('--background', '#F8F9FA');
      root.style.setProperty('--foreground', '#212529');
      root.style.setProperty('--accent', '#2D8A2F');
      root.style.setProperty('--secondary', '#5B2C87');
      root.style.setProperty('--border-color', '#DEE2E6');
      root.style.setProperty('--card-bg', '#FFFFFF');
      root.style.setProperty('--muted', '#F1F3F4');
      root.style.setProperty('--muted-foreground', '#6C757D');
      root.style.setProperty('--warning', '#D97706');
    } else {
      root.style.setProperty('--primary-green', '#20e073');
      root.style.setProperty('--primary-purple', '#703FEC');
      root.style.setProperty('--primary-black', '#000000');
      root.style.setProperty('--primary-white', '#FFFFFF');
      root.style.setProperty('--primary-blue', '#22C55E');
      root.style.setProperty('--background', '#000000');
      root.style.setProperty('--foreground', '#FFFFFF');
      root.style.setProperty('--accent', '#20e073');
      root.style.setProperty('--secondary', '#703FEC');
      root.style.setProperty('--border-color', '#20e073');
      root.style.setProperty('--card-bg', '#000000');
      root.style.setProperty('--muted', '#1A1A1A');
      root.style.setProperty('--muted-foreground', '#9CA3AF');
      root.style.setProperty('--warning', '#EAB308');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
