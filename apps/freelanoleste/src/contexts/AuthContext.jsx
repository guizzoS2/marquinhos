import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { buildFreelaProfile, createFreelaProfile } from '../services/freelaApi';
import { nextId } from '../services/freelaStore';
import { ensureBarProfile } from '../services/ownerStore';
import { createTenant } from '../services/platformStore';
import {
  assertEmailAvailable,
  authenticate,
  readSession,
  registerFreelaAccount,
  registerOwnerAccount,
  writeSession,
} from '../services/session';

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

  const registerFreela = useCallback((payload) => {
    const id = payload.id || nextId('f');
    const profile = buildFreelaProfile({ ...payload, id });
    const account = registerFreelaAccount({
      email: profile.email,
      password: payload.password,
      name: profile.name,
      id,
    });
    createFreelaProfile({ ...profile, id: account.id, email: account.email });
    const session = {
      id: account.id,
      email: account.email,
      role: 'freela',
      name: account.name,
      tenantId: null,
    };
    writeSession(session);
    setUser(session);
    return session;
  }, []);

  const registerOwner = useCallback((payload) => {
    assertEmailAvailable(payload.email);
    if (!String(payload.ownerName || '').trim() || !payload.password) {
      throw new Error('Preencha nome do dono, e-mail e senha.');
    }
    const tenant = createTenant({
      name: payload.barName,
      slug: payload.slug,
      ownerEmail: payload.email,
    });
    const account = registerOwnerAccount({
      email: payload.email,
      password: payload.password,
      name: payload.ownerName,
      tenantId: tenant.id,
    });
    ensureBarProfile(tenant.id, tenant.name);
    const session = {
      id: null,
      email: account.email,
      role: 'owner',
      name: account.name,
      tenantId: account.tenantId,
    };
    writeSession(session);
    setUser(session);
    return session;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isFreela: user?.role === 'freela',
      isOwner: user?.role === 'owner',
      isStaff: user?.role === 'staff' || user?.role === 'employee',
      isEmployee: user?.role === 'employee' || user?.role === 'staff',
      isBar: user?.role === 'owner' || user?.role === 'staff' || user?.role === 'employee',
      login,
      logout,
      registerFreela,
      registerOwner,
    }),
    [user, login, logout, registerFreela, registerOwner]
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
