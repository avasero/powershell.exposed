"use client";
import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Hardcoded to dark theme, no state or toggle
  useEffect(() => {
    const root = document.documentElement;
    // Apply dark theme variables
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
  }, []);

  // No toggle function
  return (
    <ThemeContext.Provider value={{}}>
      {children}
    </ThemeContext.Provider>
  );
};
