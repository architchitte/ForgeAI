import React, { createContext, ReactNode, useContext } from 'react';
import { useRepositoryLikes } from '../hooks/useRepositoryLikes';

type LikesContextValue = ReturnType<typeof useRepositoryLikes>;

const LikesContext = createContext<LikesContextValue | undefined>(undefined);

/**
 * One shared like store for the signed-in app, so the feed cards and the
 * project detail view show the same count / liked state and an in-flight
 * toggle on one screen is respected by the other.
 */
export const LikesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value = useRepositoryLikes();
  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>;
};

export const useLikes = (): LikesContextValue => {
  const ctx = useContext(LikesContext);
  if (!ctx) throw new Error('useLikes must be used within a LikesProvider');
  return ctx;
};
