import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { createTenantOpsApi, DashboardProviders } from '@fnl/dashboard';
import { useAuth } from '../../contexts/AuthContext';
import { fetchOwnerAccess } from '../../services/ownerApi';
import { disableStaffAccess, inviteStaffAccount, updateStaffAccess } from '../../services/session';

export function BarOpsProviders() {
  const { user, isOwner } = useAuth();
  const access = useMemo(() => {
    try {
      return fetchOwnerAccess();
    } catch {
      return { tenantId: user?.tenantId, tenantName: user?.name || '' };
    }
  }, [user?.tenantId, user?.name]);

  const api = useMemo(() => {
    if (!access.tenantId) return null;
    const base = createTenantOpsApi(access.tenantId);
    return {
      ...base,
      async updateStaff(staffId, payload) {
        const updated = await base.updateStaff(staffId, payload);
        if (updated?.uid) {
          await updateStaffAccess({
            uid: updated.uid,
            name: updated.name,
            title: updated.title,
            permissions: updated.permissions,
          });
        }
        return updated;
      },
      async inviteStaff(staffId, payload) {
        const current = await base.fetchStaff();
        const person = (current.people || []).find((item) => String(item.id) === String(staffId));
        if (!person) throw new Error('Funcionário não encontrado.');
        const account = await inviteStaffAccount({
          email: payload.email,
          name: person.name,
          title: person.title,
          tenantId: access.tenantId,
          permissions: payload.permissions,
          uid: person.uid,
        });
        const saved = await base.inviteStaff(staffId, {
          email: payload.email,
          permissions: payload.permissions,
          uid: account.uid,
          accountStatus: account.emailed ? 'invited' : 'pending',
        });
        if (!account.emailed) {
          const error = new Error(account.message || 'Não foi possível enviar o e-mail.');
          error.staff = saved;
          throw error;
        }
        return saved;
      },
      async saveStaffAccess(staffId, payload) {
        const current = await base.fetchStaff();
        const person = (current.people || []).find((item) => String(item.id) === String(staffId));
        if (!person?.uid) throw new Error('Esta pessoa ainda não tem conta.');
        await updateStaffAccess({
          uid: person.uid,
          name: person.name,
          title: person.title,
          permissions: payload.permissions,
        });
        return base.saveStaffAccess(staffId, payload);
      },
      async removeStaff(staffId) {
        const current = await base.fetchStaff();
        const person = (current.people || []).find((item) => String(item.id) === String(staffId));
        if (person?.uid) await disableStaffAccess(person.uid);
        return base.removeStaff(staffId);
      },
    };
  }, [access.tenantId]);

  if (!access.tenantId) return <Outlet />;

  return (
    <DashboardProviders
      api={api}
      tenantId={access.tenantId}
      tenantName={access.tenantName}
      canManageStaff={isOwner}
    >
      <Outlet />
    </DashboardProviders>
  );
}
