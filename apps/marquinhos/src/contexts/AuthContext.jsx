import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  loginWithEmail,
  logoutUser,
  saveProfile,
  subscribeAuth,
} from '../services/authService';
import { ensureDashboardSeed, getUserProfile } from '../services/firestoreService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeAuth(async (nextUser) => {
      if (!active) return;
      if (nextUser) {
        await ensureDashboardSeed();
        const profile = (await getUserProfile(nextUser.uid)) || nextUser;
        setUser({
          ...nextUser,
          ...profile,
          role: profile.barRole || profile.role || nextUser.role,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function login(credentials) {
    const nextUser = await loginWithEmail(credentials);
    setUser(nextUser);
    return nextUser;
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  async function updateProfile(data) {
    if (!user?.uid) {
      throw new Error('Usuário não autenticado.');
    }
    const next = await saveProfile(user.uid, data);
    setUser((prev) => ({ ...prev, ...next }));
    return next;
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isStock: user?.role === 'stock',
      login,
      logout,
      updateProfile,
    }),
    [user, loading]
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
