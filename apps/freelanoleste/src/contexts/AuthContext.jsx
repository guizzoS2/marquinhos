import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { bootAuthenticatedCloud, ensureTenantOpsCloud } from '../services/boot';
import { flushCloudWrites } from '../services/cloud';
import { buildFreelaProfile, createFreelaProfile } from '../services/freelaApi';
import { nextId } from '../services/freelaStore';
import { ensureBarProfile } from '../services/ownerStore';
import { createTenant, loadPlatformStore, slugifyTenant } from '../services/platformStore';
import {
  assertEmailAvailable,
  authenticate,
  logoutSession,
  registerFreelaAccount,
  registerOwnerAccount,
  subscribeSession,
  writeSession,
} from '../services/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeSession((session) => {
      setUser(session);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async ({ email, password, role }) => {
    const session = await authenticate({ email, password, role });
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await logoutSession();
  }, []);

  const registerFreela = useCallback(async (payload) => {
    const id = payload.id || nextId('f');
    const profile = buildFreelaProfile({ ...payload, id });
    const account = await registerFreelaAccount({
      email: profile.email,
      password: payload.password,
      name: profile.name,
      id,
    });
    createFreelaProfile({ ...profile, id: account.id, email: account.email });
    await flushCloudWrites();
    await bootAuthenticatedCloud();
    const session = {
      uid: account.uid,
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

  const registerOwner = useCallback(async (payload) => {
    await assertEmailAvailable(payload.email);
    if (!String(payload.ownerName || '').trim() || !payload.password) {
      throw new Error('Preencha nome do dono, e-mail e senha.');
    }
    const slug = slugifyTenant(payload.slug || payload.barName);
    if (!slug) {
      throw new Error('Informe um slug.');
    }
    if (loadPlatformStore().tenants.some((item) => item.id === slug || item.slug === slug)) {
      throw new Error('Slug já em uso.');
    }
    const account = await registerOwnerAccount({
      email: payload.email,
      password: payload.password,
      name: payload.ownerName,
      tenantId: slug,
    });
    const tenant = createTenant({
      name: payload.barName,
      slug,
      ownerEmail: payload.email,
    });
    ensureBarProfile(tenant.id, tenant.name);
    ensureTenantOpsCloud(tenant.id);
    await flushCloudWrites();
    await bootAuthenticatedCloud();
    const session = {
      uid: account.uid,
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
      loading,
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
    [user, loading, login, logout, registerFreela, registerOwner]
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
