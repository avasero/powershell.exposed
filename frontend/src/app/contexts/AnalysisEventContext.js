"use client";
import { createContext, useContext, useState, useCallback } from 'react';

const AnalysisEventContext = createContext();

export const AnalysisEventProvider = ({ children }) => {
  const [analysisCount, setAnalysisCount] = useState(0);

  // Função para notificar que uma nova análise foi feita
  const notifyNewAnalysis = useCallback(() => {
    console.log('🔄 Nova análise detectada, incrementando contador...');
    setAnalysisCount(prev => prev + 1);
  }, []);

  // Função para resetar o contador (útil para testes)
  const resetAnalysisCount = useCallback(() => {
    setAnalysisCount(0);
  }, []);

  return (
    <AnalysisEventContext.Provider value={{
      analysisCount,
      notifyNewAnalysis,
      resetAnalysisCount
    }}>
      {children}
    </AnalysisEventContext.Provider>
  );
};

export const useAnalysisEvent = () => {
  const context = useContext(AnalysisEventContext);
  if (!context) {
    throw new Error('useAnalysisEvent must be used within an AnalysisEventProvider');
  }
  return context;
};
