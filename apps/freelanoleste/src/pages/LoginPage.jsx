import { useState } from 'react';
import { Button } from '../components/Button';

const roles = [
  { id: 'owner', label: 'Dono do bar' },
  { id: 'freela', label: 'Freela' },
  { id: 'admin', label: 'Admin da plataforma' },
];

export function LoginPage() {
  const [role, setRole] = useState('owner');

  function handleSubmit(event) {
    event.preventDefault();
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-headline text-3xl font-extrabold mb-2">Entrar</h1>
      <p className="text-on-surface-variant text-sm mb-8">
        Três papéis, três logins. Stripe e auth ainda não estão ligados.
      </p>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex gap-2 p-1 bg-surface-container-low rounded-2xl">
          {roles.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRole(item.id)}
              className={
                role === item.id
                  ? 'flex-1 px-3 py-2 min-h-11 rounded-xl bg-primary text-on-primary text-xs font-semibold'
                  : 'flex-1 px-3 py-2 min-h-11 rounded-xl text-on-surface-variant text-xs font-medium'
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            E-mail
          </span>
          <input
            required
            type="email"
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Senha
          </span>
          <input
            required
            type="password"
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <Button type="submit" className="w-full" variant="dark">
          Continuar
        </Button>
      </form>
    </div>
  );
}
