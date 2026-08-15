import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';

export function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-20 space-y-12">
      <section className="space-y-6">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Plataforma multi-tenant
        </p>
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight">
          FreelaNoLeste
        </h1>
        <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
          Bares assinam e recebem o próprio painel operacional (o Marquinho's white-label).
          Freelas se cadastram, recebem via Stripe com split, e as duas partes avaliam o serviço.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/login">
            <Button variant="dark">Sou dono de bar</Button>
          </Link>
          <Link to="/cadastro-freela">
            <Button>Quero ser freela</Button>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: 'storefront',
            title: 'Para o bar',
            text: 'Assinatura Stripe. Painel com logo e cores do estabelecimento.',
          },
          {
            icon: 'badge',
            title: 'Para o freela',
            text: 'Cadastro na plataforma, visível para os donos assinantes.',
          },
          {
            icon: 'payments',
            title: 'Pagamento',
            text: 'Diária no Stripe. Split para a plataforma e para o profissional.',
          },
        ].map((item) => (
          <article
            key={item.title}
            className="bg-surface-container-low rounded-2xl p-6 space-y-3"
          >
            <Icon name={item.icon} className="text-2xl" />
            <h2 className="font-headline font-bold text-xl">{item.title}</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">{item.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
