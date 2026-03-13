import React, { createContext, useContext, ReactNode } from 'react';
import { useGamificationCore, getXpForLevel, getXpProgress } from '@/hooks/useGamificationCore';

type GamificationContextType = ReturnType<typeof useGamificationCore>;

const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const gamification = useGamificationCore();
  return (
    <GamificationContext.Provider value={gamification}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider');
  return ctx;
}

// Re-export utility functions for convenience
export { getXpForLevel, getXpProgress };
