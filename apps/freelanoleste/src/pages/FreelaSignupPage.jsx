import { useState } from 'react';
import { Button } from '../components/Button';

export function FreelaSignupPage() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-headline text-3xl font-extrabold mb-2">Cadastro de freela</h1>
      <p className="text-on-surface-variant text-sm mb-8">
        O cadastro é na plataforma, não no Marquinho's de um bar. Depois o perfil fica visível
        para os donos assinantes.
      </p>
      {sent ? (
        <p className="text-sm font-medium bg-primary/20 rounded-2xl p-4">
          Cadastro recebido (rascunho). Persistência e Stripe Connect vêm na próxima etapa.
        </p>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              Nome
            </span>
            <input
              required
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              Função
            </span>
            <input
              required
              placeholder="Barman, garçom, cozinha..."
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              Contato
            </span>
            <input
              required
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            />
          </label>
          <Button type="submit" className="w-full">
            Criar perfil
          </Button>
        </form>
      )}
    </div>
  );
}
