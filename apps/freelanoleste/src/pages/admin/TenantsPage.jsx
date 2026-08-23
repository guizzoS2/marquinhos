import { useEffect, useState } from 'react';
import {
  activateTenant,
  blockTenant,
  createTenantAsAdmin,
  fetchTenants,
  updateTenantBranding,
} from '../../services/adminApi';
import { slugifyTenant, stripeStatusLabel, subscribePlatformStore } from '../../services/platformStore';
import { subscribeFreelaStore } from '../../services/freelaStore';
import { subscribeTenantOpsStore } from '../../services/tenantOpsApi';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';

const emptyCreate = {
  barName: '',
  slug: '',
  ownerName: '',
  ownerEmail: '',
  password: '',
};

export function AdminTenantsPage() {
  const [tenants, setTenants] = useState(() => fetchTenants());
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ slug: '', primaryHex: '#FFDB15', logoDataUrl: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const refresh = () => setTenants(fetchTenants());
    refresh();
    const offPlatform = subscribePlatformStore(refresh);
    const offFreela = subscribeFreelaStore(refresh);
    const offOps = subscribeTenantOpsStore(refresh);
    return () => {
      offPlatform();
      offFreela();
      offOps();
    };
  }, []);

  const editing = tenants.find((item) => item.id === editingId);

  function openEditor(tenant) {
    setEditingId(tenant.id);
    setCreating(false);
    setForm({
      slug: tenant.slug,
      primaryHex: tenant.primaryHex || '#FFDB15',
      logoDataUrl: tenant.logoDataUrl || '',
    });
    setError('');
  }

  function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, logoDataUrl: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  }

  function handleSave(event) {
    event.preventDefault();
    try {
      updateTenantBranding(editingId, form);
      setTenants(fetchTenants());
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleActivate(tenantId) {
    try {
      setTenants(activateTenant(tenantId));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  function handleBlock(tenantId) {
    try {
      setTenants(blockTenant(tenantId));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    try {
      await createTenantAsAdmin(createForm);
      setTenants(fetchTenants());
      setCreateForm(emptyCreate);
      setSlugTouched(false);
      setCreating(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-display text-4xl uppercase tracking-wide">Bares</h2>
          <p className="text-sm text-[var(--muted)]">
            Isolamento por tenant. /cadastro-bar continua público (fila incomplete). Bloquear
            cancela a assinatura mock.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditingId(null);
            setError('');
          }}
        >
          Novo bar
        </Button>
      </section>

      {error && !editing && !creating ? (
        <p className="text-sm text-error font-medium">{error}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="bar-table">
          <thead>
            <tr>
              <th>Bar</th>
              <th>Slug</th>
              <th>Stripe</th>
              <th>Vagas</th>
              <th>Staff</th>
              <th>Cor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td>
                  <p>{tenant.name}</p>
                  <p className="text-xs text-[var(--muted)]">{tenant.ownerEmail}</p>
                </td>
                <td>{tenant.slug}</td>
                <td>{stripeStatusLabel[tenant.stripeStatus] || tenant.stripeStatus}</td>
                <td>
                  {tenant.openJobs} abertas
                  <span className="block text-xs text-[var(--muted)]">{tenant.jobCount} no total</span>
                </td>
                <td>{tenant.staffCount}</td>
                <td>{tenant.primaryHex || '—'}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    {tenant.stripeStatus === 'active' ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs px-3"
                        onClick={() => handleBlock(tenant.id)}
                      >
                        Bloquear
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="text-xs px-3"
                        onClick={() => handleActivate(tenant.id)}
                      >
                        Ativar
                      </Button>
                    )}
                    <button
                      type="button"
                      className="min-h-11 min-w-11 px-3 bar-sticker"
                      onClick={() => openEditor(tenant)}
                      aria-label={`Configurar ${tenant.name}`}
                    >
                      <Icon name="palette" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating ? (
        <form className="bar-block space-y-5" onSubmit={handleCreate}>
          <h3 className="font-display text-2xl uppercase">Novo bar</h3>
          <p className="text-sm text-[var(--muted)]">
            Começa incomplete. Login do dono em /login/bar. Não opera caixa deste tenant.
          </p>
          <label className="block space-y-2">
            <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              Nome do bar
            </span>
            <input
              required
              value={createForm.barName}
              onChange={(event) => {
                const barName = event.target.value;
                setCreateForm((prev) => ({
                  ...prev,
                  barName,
                  slug: slugTouched ? prev.slug : slugifyTenant(barName),
                }));
              }}
              className="bar-field w-full min-h-11 px-3 py-3"
            />
          </label>
          <label className="block space-y-2">
            <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              Slug
            </span>
            <input
              required
              value={createForm.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setCreateForm((prev) => ({ ...prev, slug: slugifyTenant(event.target.value) }));
              }}
              className="bar-field w-full min-h-11 px-3 py-3"
            />
          </label>
          <label className="block space-y-2">
            <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              Nome do dono
            </span>
            <input
              required
              value={createForm.ownerName}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, ownerName: event.target.value }))
              }
              className="bar-field w-full min-h-11 px-3 py-3"
            />
          </label>
          <label className="block space-y-2">
            <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              E-mail do dono
            </span>
            <input
              required
              type="email"
              value={createForm.ownerEmail}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, ownerEmail: event.target.value }))
              }
              className="bar-field w-full min-h-11 px-3 py-3"
            />
          </label>
          <label className="block space-y-2">
            <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              Senha
            </span>
            <input
              required
              type="password"
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="bar-field w-full min-h-11 px-3 py-3"
            />
          </label>
          {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreating(false);
                setError('');
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">Criar bar</Button>
          </div>
        </form>
      ) : null}

      {editing ? (
        <form className="bar-block space-y-5" onSubmit={handleSave}>
          <h3 className="font-display text-2xl uppercase">White-label — {editing.name}</h3>
          <p className="text-sm text-[var(--muted)]">
            Stripe: {editing.stripeSubscriptionId || '—'} · {stripeStatusLabel[editing.stripeStatus]}
          </p>
          <label className="block space-y-2">
            <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              Slug
            </span>
            <input
              required
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              className="bar-field w-full min-h-11 px-3 py-3"
            />
            <span className="text-[11px] text-[var(--muted)]">Login do bar continua em /login/bar</span>
          </label>
          <label className="block space-y-2">
            <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              Cor primária (HEX)
            </span>
            <input
              required
              type="text"
              pattern="^#([0-9A-Fa-f]{6})$"
              value={form.primaryHex}
              onChange={(e) => setForm((prev) => ({ ...prev, primaryHex: e.target.value }))}
              className="bar-field w-full min-h-11 px-3 py-3"
            />
            <input
              type="color"
              value={form.primaryHex}
              onChange={(e) => setForm((prev) => ({ ...prev, primaryHex: e.target.value }))}
              className="h-11 w-11 border-2 border-[var(--ink)]"
              aria-label="Seletor de cor"
            />
          </label>
          <label className="block space-y-2">
            <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              Logo
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogo}
              className="bar-field w-full min-h-11 px-3 py-3"
            />
          </label>
          {form.logoDataUrl ? (
            <img
              src={form.logoDataUrl}
              alt={`Logo ${editing.name}`}
              className="h-16 w-16 object-cover border-2 border-[var(--ink)] bg-[var(--spray)]"
            />
          ) : null}
          {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar white-label</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
