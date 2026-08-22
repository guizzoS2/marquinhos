import { useState } from 'react';
import { AuthField, AuthScreen, AuthSubmit, AuthSwitchLink } from '../components/auth/AuthScreen';

const copy = {
  owner: {
    title: 'Cadastro bar',
    hint: 'Assinatura Stripe depois. Sem PIX. Cadastro na plataforma, não no painel operacional.',
    loginTo: '/login/bar',
  },
  freela: {
    title: 'Cadastro freela',
    hint: 'Cadastro na plataforma, não no Marquinho’s de um bar.',
    loginTo: '/login/freela',
  },
};

export function RoleSignupPage({ role }) {
  const [sent, setSent] = useState(false);
  const text = copy[role];
  const tone = role === 'owner' ? 'bar' : 'freela';

  function handleSubmit(event) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <AuthScreen title={text.title} hint={text.hint} tone={tone}>
      {sent ? (
        <p className="text-sm font-medium border-2 border-primary p-4">
          Cadastro recebido. Persistência e Stripe vêm na sequência.
        </p>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {role === 'owner' ? (
            <AuthField id="bar-name" label="Nome do bar" required autoComplete="organization" />
          ) : (
            <>
              <AuthField id="freela-name" label="Nome" required autoComplete="name" />
              <AuthField id="freela-role" label="Função" required placeholder="Barman, garçom, cozinha..." />
            </>
          )}
          <AuthField
            id={`${role}-signup-email`}
            label="E-mail"
            type="email"
            required
            autoComplete="email"
          />
          <AuthField
            id={`${role}-signup-password`}
            label="Senha"
            type="password"
            required
            autoComplete="new-password"
          />
          <AuthSubmit>Criar conta</AuthSubmit>
        </form>
      )}
      <AuthSwitchLink to={text.loginTo} prompt="Já tem conta?" action="Entrar" />
    </AuthScreen>
  );
}
