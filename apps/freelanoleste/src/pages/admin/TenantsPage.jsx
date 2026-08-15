import { useState } from 'react';
import { fetchTenants, updateTenantBranding } from '../../services/adminApi';
import { stripeStatusLabel } from '../../services/platformStore';
import { DataTable } from '../../components/admin/DataTable';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';

function tenantLoginPath(slug) {
  return `/t/${slug}/login`;
}

export function AdminTenantsPage() {
  const [tenants, setTenants] = useState(() => fetchTenants());
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ slug: '', primaryHex: '#FFDB15', logoDataUrl: '' });
  const [error, setError] = useState('');

  const editing = tenants.find((item) => item.id === editingId);

  function openEditor(tenant) {
    setEditingId(tenant.id);
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
      const next = updateTenantBranding(editingId, form);
      setTenants(next);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Tenants (bares)
        </h2>
        <p className="text-on-surface-variant text-sm">
          Isolamento por tenant. White-label (logo, HEX, slug) não mistura caixa nem estoque entre
          bares. Assinatura só via Stripe.
        </p>
      </section>

      <DataTable columns={['Bar', 'Slug / login', 'Stripe', 'Cor', 'Ações']}>
        {tenants.map((tenant) => (
          <tr key={tenant.id} className="bg-surface-container-lowest">
            <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap">{tenant.name}</td>
            <td className="px-4 md:px-6 py-4 text-on-surface-variant whitespace-nowrap">
              {tenantLoginPath(tenant.slug)}
            </td>
            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
              {stripeStatusLabel[tenant.stripeStatus] || tenant.stripeStatus}
            </td>
            <td className="px-4 md:px-6 py-4 font-medium whitespace-nowrap">
              {tenant.primaryHex}
            </td>
            <td className="px-4 md:px-6 py-4">
              <button
                type="button"
                className="min-h-11 min-w-11 px-3 rounded-full text-on-surface-variant hover:bg-surface-container"
                onClick={() => openEditor(tenant)}
                aria-label={`Configurar ${tenant.name}`}
              >
                <Icon name="palette" />
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      {editing ? (
        <form
          className="bg-surface-container-lowest rounded-2xl p-5 md:p-8 space-y-5 shadow-sm"
          onSubmit={handleSave}
        >
          <h3 className="font-headline font-bold text-xl">White-label — {editing.name}</h3>
          <p className="text-sm text-on-surface-variant">
            Stripe: {editing.stripeSubscriptionId} ·{' '}
            {stripeStatusLabel[editing.stripeStatus]}
          </p>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              Slug de acesso
            </span>
            <input
              required
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            />
            <span className="text-[11px] text-on-surface-variant pl-1">
              Login exclusivo do bar: {tenantLoginPath(form.slug || editing.slug)}
            </span>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              Cor primária (HEX)
            </span>
            <input
              required
              type="text"
              pattern="^#([0-9A-Fa-f]{6})$"
              value={form.primaryHex}
              onChange={(e) => setForm((prev) => ({ ...prev, primaryHex: e.target.value }))}
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            />
            <input
              type="color"
              value={form.primaryHex}
              onChange={(e) => setForm((prev) => ({ ...prev, primaryHex: e.target.value }))}
              className="h-11 w-11 rounded-lg border border-outline-variant"
              aria-label="Seletor de cor"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              Logo
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogo}
              className="block w-full text-sm text-on-surface-variant min-h-11 py-2"
            />
          </label>
          {form.logoDataUrl ? (
            <img
              src={form.logoDataUrl}
              alt={`Logo ${editing.name}`}
              className="h-16 w-16 rounded-lg object-cover bg-primary"
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
