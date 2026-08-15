const tenants = [
  { name: "Marquinho's", plan: 'Ativo', branding: 'Amarelo #FFDB15' },
  { name: 'Bar exemplo', plan: 'Aguardando Stripe', branding: 'Pendente' },
];

export function AdminPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-extrabold">Painel admin</h1>
        <p className="text-on-surface-variant mt-2">
          Tenants, assinatura, branding e splits. Dados ainda são mock.
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-outline-variant/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Tenant</th>
              <th className="px-6 py-4">Assinatura</th>
              <th className="px-6 py-4">Branding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {tenants.map((row) => (
              <tr key={row.name} className="bg-surface-container-lowest">
                <td className="px-6 py-4 font-bold">{row.name}</td>
                <td className="px-6 py-4">{row.plan}</td>
                <td className="px-6 py-4 text-on-surface-variant">{row.branding}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
