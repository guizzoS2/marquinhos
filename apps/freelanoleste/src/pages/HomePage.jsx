import { PosterCard } from '../components/street/PosterCard';
import { RoughButton } from '../components/street/RoughButton';
import { StatusStamp } from '../components/street/StatusStamp';

export function HomePage() {
  return (
    <div className="flex flex-col gap-16 md:gap-24 px-4 md:px-8 py-12 md:py-20 max-w-5xl mx-auto overflow-x-hidden">
      <section className="min-h-[70dvh] flex flex-col justify-center gap-6 md:gap-8">
        <p className="font-spray text-primary text-4xl md:text-6xl -rotate-2 motion-reduce:rotate-0 w-fit">
          FreelaNoLeste
        </p>
        <StatusStamp>NO LESTE</StatusStamp>
        <PosterCard variant="ink" rotate="-rotate-1">
          <p className="font-display text-xl md:text-2xl tracking-wide uppercase mb-3">
            Centro-Leste · Floripa
          </p>
          <h1 className="font-display text-3xl md:text-5xl tracking-tight leading-none">
            Bar precisa de gente. Freela precisa de trampo.
          </h1>
          <p className="mt-4 text-sm md:text-base leading-relaxed max-w-xl text-outline">
            A parede da noite, agora na plataforma. Stripe no trampo. Review só depois do serviço
            pago.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <RoughButton to="/cadastro-bar" className="w-full sm:w-auto">
              Sou bar
            </RoughButton>
            <RoughButton to="/cadastro-freela" variant="ghost" className="w-full sm:w-auto">
              Sou freela
            </RoughButton>
            <RoughButton to="/sistema" variant="ink" className="w-full sm:w-auto">
              O sistema
            </RoughButton>
          </div>
        </PosterCard>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
        <PosterCard variant="paper" rotate="rotate-1">
          <p className="font-display text-sm tracking-widest uppercase mb-3">Para o bar</p>
          <h2 className="font-display text-2xl md:text-4xl tracking-tight leading-none">
            Painel da casa. Marketplace no mesmo login.
          </h2>
          <p className="mt-4 text-sm md:text-base leading-relaxed text-on-surface-variant">
            Assina na plataforma. Recebe o painel white-label do teu tenant: caixa, estoque,
            equipe. Identidade do bar. Dados isolados.
          </p>
          <RoughButton to="/cadastro-bar" variant="ink" className="mt-6 w-full sm:w-auto">
            Sou bar
          </RoughButton>
        </PosterCard>

        <PosterCard variant="yellow" rotate="-rotate-2">
          <ul className="space-y-4 text-sm md:text-base">
            <li className="min-h-11 flex items-center">
              Assinatura e diária só no Stripe. Sem PIX por fora.
            </li>
            <li className="min-h-11 flex items-center">
              Vitrine de freelas, chat e proposta no mesmo lugar.
            </li>
            <li className="min-h-11 flex items-center">
              Caixa, estoque e equipe no painel do tenant. Freela não entra.
            </li>
          </ul>
        </PosterCard>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start pb-16">
        <PosterCard variant="yellow" rotate="rotate-2">
          <p className="font-display text-sm tracking-widest uppercase mb-3">Para o freela</p>
          <h2 className="font-display text-2xl md:text-4xl tracking-tight leading-none">
            Trampo do Leste. Reputação que cola.
          </h2>
          <p className="mt-4 text-sm md:text-base leading-relaxed">
            Cadastro na plataforma, não no caixa de um bar. Diária com split Stripe. Review nos
            dois sentidos depois do trampo pago.
          </p>
          <RoughButton to="/cadastro-freela" variant="ink" className="mt-6 w-full sm:w-auto">
            Sou freela
          </RoughButton>
        </PosterCard>

        <PosterCard variant="ink" rotate="-rotate-1">
          <ul className="space-y-4 text-sm md:text-base">
            <li className="min-h-11 flex items-center">
              Turnos no Centro-Leste: balcão, salão, cozinha.
            </li>
            <li className="min-h-11 flex items-center">
              Recebimento no Stripe Connect. Saque no Express.
            </li>
            <li className="min-h-11 flex items-center">
              Nota do bar e do freela só após serviço real.
            </li>
          </ul>
        </PosterCard>
      </section>
    </div>
  );
}
