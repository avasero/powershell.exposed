"use client";
import React, { createContext, useContext, useState } from 'react';

const AnalysisDrawerContext = createContext();

export const useAnalysisDrawer = () => {
  const context = useContext(AnalysisDrawerContext);
  if (!context) {
    throw new Error('useAnalysisDrawer must be used within an AnalysisDrawerProvider');
  }
  return context;
};

export const AnalysisDrawerProvider = ({ children }) => {
  const [isAnalysisDrawerOpen, setIsAnalysisDrawerOpen] = useState(false);

  const openAnalysisDrawer = () => setIsAnalysisDrawerOpen(true);
  const closeAnalysisDrawer = () => setIsAnalysisDrawerOpen(false);

  return (
    <AnalysisDrawerContext.Provider value={{
      isAnalysisDrawerOpen,
      openAnalysisDrawer,
      closeAnalysisDrawer
    }}>
      {children}
    </AnalysisDrawerContext.Provider>
  );
};
