import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { useWallScene } from '../hooks/useWallScene';

const wallTone = {
  hero: 'bg-inverse-surface',
  bares: 'bg-tertiary',
  freelas: 'bg-secondary-dim',
};

function Flyer({ tone = 'paper', rotate = '-rotate-2', children }) {
  const tones = {
    paper: 'bg-surface-container-lowest text-on-surface border-on-surface',
    yellow: 'bg-primary text-on-primary border-on-surface',
    dark: 'bg-on-surface text-inverse-on-surface border-primary',
  };

  return (
    <article
      className={`border-4 shadow-2xl p-4 md:p-8 ${tones[tone]} ${rotate} motion-reduce:rotate-0`}
    >
      {children}
    </article>
  );
}

export function HomePage() {
  const { scene, heroRef, baresRef, freelasRef } = useWallScene();

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-0 pointer-events-none motion-reduce:transition-none transition-colors duration-700 ${wallTone[scene]}`}
      />

      <div className="relative z-10 flex flex-col gap-16 md:gap-24 px-4 md:px-8 py-12 md:py-20 max-w-5xl mx-auto">
        <section
          ref={heroRef}
          data-scene="hero"
          className="min-h-[70dvh] flex flex-col justify-center gap-6 md:gap-8"
        >
          <p className="font-headline font-extrabold text-primary text-sm tracking-widest uppercase -rotate-1 w-fit border-4 border-primary bg-on-surface px-4 py-2 min-h-11 inline-flex items-center shadow-2xl">
            Centro-Leste · Florianópolis
          </p>

          <Flyer tone="yellow" rotate="-rotate-2">
            <p className="text-xs font-bold uppercase tracking-widest mb-3">
              FreelaNoLeste
            </p>
            <h1 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              A ponte definitiva entre a noite de Floripa e quem faz ela acontecer.
            </h1>
            <p className="mt-4 text-sm md:text-base leading-relaxed max-w-xl">
              Bares do Centro-Leste encontram equipe. Freelas encontram trampo. Pagamento no
              Stripe. A parede da cidade, agora na plataforma.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/login/bar" className="w-full sm:w-auto">
                <Button variant="dark" className="w-full">
                  Sou Bar
                </Button>
              </Link>
              <Link to="/login/freela" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full">
                  Sou Freela
                </Button>
              </Link>
            </div>
          </Flyer>
        </section>

        <section
          ref={baresRef}
          data-scene="bares"
          className="min-h-[70dvh] flex flex-col justify-center gap-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
            <Flyer tone="paper" rotate="rotate-1">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="storefront" className="text-2xl" />
                <p className="text-xs font-bold uppercase tracking-widest">Para bares</p>
              </div>
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
                Não é só achar freela. É o painel da casa.
              </h2>
              <p className="mt-4 text-sm md:text-base leading-relaxed text-on-surface-variant">
                Assinatura Stripe libera o marketplace e um Marquinho&apos;s white-label: caixa,
                estoque e equipe no painel do seu tenant. Identidade do bar. Dados isolados.
              </p>
              <Link to="/login/bar" className="mt-6 inline-flex w-full sm:w-auto">
                <Button variant="dark" className="w-full">
                  Sou Bar
                </Button>
              </Link>
            </Flyer>

            <Flyer tone="dark" rotate="-rotate-2">
              <ul className="space-y-4 text-sm md:text-base">
                <li className="flex gap-3 min-h-11 items-center">
                  <Icon name="payments" />
                  <span>Assinatura e diária só no Stripe. Sem PIX por fora.</span>
                </li>
                <li className="flex gap-3 min-h-11 items-center">
                  <Icon name="group" />
                  <span>Vitrine de freelas, chat e proposta no mesmo lugar.</span>
                </li>
                <li className="flex gap-3 min-h-11 items-center">
                  <Icon name="inventory_2" />
                  <span>Caixa, estoque e equipe no painel operacional do tenant.</span>
                </li>
              </ul>
            </Flyer>
          </div>
        </section>

        <section
          ref={freelasRef}
          data-scene="freelas"
          className="min-h-[70dvh] flex flex-col justify-center gap-6 pb-16"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
            <Flyer tone="yellow" rotate="rotate-2">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="badge" className="text-2xl" />
                <p className="text-xs font-bold uppercase tracking-widest">Para freelas</p>
              </div>
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
                Os melhores trampos do Leste. Reputação que cola.
              </h2>
              <p className="mt-4 text-sm md:text-base leading-relaxed">
                Cadastro na plataforma, não no caixa de um bar. Diária com split Stripe. Review
                nos dois sentidos depois do trampo pago.
              </p>
              <Link to="/login/freela" className="mt-6 inline-flex w-full sm:w-auto">
                <Button variant="dark" className="w-full">
                  Sou Freela
                </Button>
              </Link>
            </Flyer>

            <Flyer tone="paper" rotate="-rotate-1">
              <ul className="space-y-4 text-sm md:text-base text-on-surface">
                <li className="flex gap-3 min-h-11 items-center">
                  <Icon name="location_on" />
                  <span>Turnos no Centro-Leste: balcão, salão, cozinha.</span>
                </li>
                <li className="flex gap-3 min-h-11 items-center">
                  <Icon name="account_balance" />
                  <span>Recebimento no Stripe Connect. Saque no Express.</span>
                </li>
                <li className="flex gap-3 min-h-11 items-center">
                  <Icon name="star" />
                  <span>Nota do bar e do freela só após serviço real.</span>
                </li>
              </ul>
            </Flyer>
          </div>
        </section>
      </div>
    </div>
  );
}
