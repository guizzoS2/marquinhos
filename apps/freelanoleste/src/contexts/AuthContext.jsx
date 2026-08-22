import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { authenticate, readSession, writeSession } from '../services/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession());

  const login = useCallback(({ email, password, role }) => {
    const session = authenticate({ email, password, role });
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isFreela: user?.role === 'freela',
      isOwner: user?.role === 'owner',
      isEmployee: user?.role === 'employee',
      login,
      logout,
    }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
