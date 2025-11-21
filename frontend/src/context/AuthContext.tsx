/**
 * Authentication context provider.
 */

'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/types/profile';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component.
 *
 * TODO:
 * - Implement authentication state management
 * - Handle login/logout
 * - Persist auth token
 * - Fetch current user on mount
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Check for existing auth token
    // TODO: Fetch current user if token exists
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // TODO: Call login API
    // TODO: Store auth token
    // TODO: Set user state
  };

  const logout = () => {
    // TODO: Clear auth token
    // TODO: Clear user state
  };

  const register = async (userData: any) => {
    // TODO: Call register API
    // TODO: Auto-login after registration
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
