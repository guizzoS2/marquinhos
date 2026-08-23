import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PosterCard } from '../components/street/PosterCard';
import { RoughButton } from '../components/street/RoughButton';
import { ScreenMock } from '../components/street/ScreenMock';
import { StatusStamp } from '../components/street/StatusStamp';

const barSteps = [
  {
    id: 'assina',
    kicker: '01 · Porta',
    title: 'Assina. Recebe a casa.',
    body: 'Stripe libera o painel do teu tenant. Logo, cor e nome da casa. Dados não vazam pro bar do lado.',
    shot: 'pay',
  },
  {
    id: 'ops',
    kicker: '02 · Operação',
    title: 'Visão geral do expediente.',
    body: 'Métrica do dia, gráfico da semana, o que mais saiu. O caixa da noite num relance.',
    shot: 'overview',
  },
  {
    id: 'caixa',
    kicker: '03 · Caixa',
    title: 'Entrada e saída da casa.',
    body: 'Fluxo interno do bar. Diária de freela da plataforma não entra aqui — vai no Stripe com split.',
    shot: 'cash',
  },
  {
    id: 'estoque',
    kicker: '04 · Estoque',
    title: 'Produto e fornecedor.',
    body: 'CRUD do teu tenant. Freela não vê estoque. Equipe com login no painel opera; vitrine é outra porta.',
    shot: 'stock',
  },
  {
    id: 'equipe',
    kicker: '05 · Equipe',
    title: 'Quem tem chave do painel.',
    body: 'Staff com permissão. Não é marketplace. Contratar gente da rua é na vitrine.',
    shot: 'team',
  },
  {
    id: 'vitrine',
    kicker: '06 · Contratar',
    title: 'Vitrine de quem circula.',
    body: 'Busca, nota, piso. Convite abre o chat. Freela não entra no caixa.',
    shot: 'market',
  },
  {
    id: 'chat',
    kicker: '07 · Acordo',
    title: 'Negocia. Aceita. Paga.',
    body: 'Contra-proposta no chat. ACEITA gera o split. Review só depois do trampo pago.',
    shot: 'chat',
  },
];

const freelaSteps = [
  {
    id: 'cadastro',
    kicker: '01 · Porta',
    title: 'Cadastra na plataforma.',
    body: 'Não no caixa de um bar. Um perfil, vários turnos. A parede te mostra pro Leste inteiro.',
    shot: 'signup',
  },
  {
    id: 'hub',
    kicker: '02 · Hub',
    title: 'Vaga e convite no mesmo lugar.',
    body: 'Saldo, chats abertos, trampo da semana. Street, sem sidebar de estoque.',
    shot: 'hub',
  },
  {
    id: 'connect',
    kicker: '03 · Receber',
    title: 'Stripe Express. Sem PIX.',
    body: 'Liga a conta. Diária cai com split plataforma + você. Saque no Express.',
    shot: 'connect',
  },
  {
    id: 'vagas',
    kicker: '04 · Trampo',
    title: 'Candidata ou aceita convite.',
    body: 'Bar assinante publica ou chama. Você manda valor. Sem combinado no zap.',
    shot: 'history',
  },
  {
    id: 'chat',
    kicker: '05 · Acordo',
    title: 'Chat. Contra. Fecha.',
    body: 'Mesma sala que o bar. Aceitou: o dinheiro passa no Stripe, não no PIX.',
    shot: 'chat',
  },
  {
    id: 'review',
    kicker: '06 · Nota',
    title: 'Você nota o bar. O bar te nota.',
    body: 'Review só depois de serviço e pagamento. Sem estrela de favor.',
    shot: 'review',
  },
  {
    id: 'reputacao',
    kicker: '07 · Parede',
    title: 'Histórico que cola.',
    body: 'Já rolou fica no perfil. Dono escolhe por nota. Você escolhe onde volta.',
    shot: 'history',
  },
];

function StepCard({ step, side, rotate }) {
  const variant = side === 'bar' ? 'paper' : 'yellow';
  return (
    <PosterCard variant={variant} rotate={rotate} className="space-y-3">
      <p className="font-display text-xs tracking-[0.28em] uppercase">
        {step.kicker}
      </p>
      <h3 className="font-display text-2xl md:text-3xl tracking-tight leading-none">
        {step.title}
      </h3>
      <ScreenMock kind={step.shot} />
      <p className="text-sm leading-relaxed">{step.body}</p>
    </PosterCard>
  );
}

function StackStep({ step, side, index }) {
  const rotate = index % 2 === 0 ? '-rotate-1' : 'rotate-1';
  return (
    <li className="flex items-center gap-2 pl-8 pr-4 py-6">
      <span className="system-node" />
      <span className="system-arm" />
      <div className="flex-1 min-w-0">
        <StepCard step={step} side={side} rotate={rotate} />
      </div>
    </li>
  );
}

function DualStep({ bar, freela, index }) {
  const barRotate = index % 2 === 0 ? '-rotate-1' : 'rotate-1';
  const freelaRotate = index % 2 === 0 ? 'rotate-1' : '-rotate-1';

  return (
    <li className="relative grid grid-cols-2">
      <div className="system-bar bg-primary text-on-primary flex items-center pl-4 pr-6 py-10">
        <div className="flex-1 min-w-0">
          <StepCard step={bar} side="bar" rotate={barRotate} />
        </div>
        <span className="system-arm" />
        <span className="system-node" />
      </div>
      <div className="system-freela bg-inverse-surface text-inverse-on-surface flex items-center pl-6 pr-4 py-10">
        <span className="system-node" />
        <span className="system-arm" />
        <div className="flex-1 min-w-0">
          <StepCard step={freela} side="freela" rotate={freelaRotate} />
        </div>
      </div>
    </li>
  );
}

function FocusStep({ step, side, index }) {
  const left = index % 2 === 0;
  const rotate = left ? '-rotate-1' : 'rotate-1';

  return (
    <li className="relative grid grid-cols-1 md:grid-cols-2 items-center py-6 md:py-10">
      <div
        className={`flex items-center gap-2 md:gap-0 pl-8 md:px-6 ${
          left ? 'md:col-start-1' : 'md:col-start-2'
        }`}
      >
        {!left ? <span className="system-node hidden md:block" /> : null}
        {!left ? <span className="system-arm hidden md:block" /> : null}
        <span className="system-node md:hidden" />
        <span className="system-arm md:hidden" />
        <div className="flex-1 min-w-0">
          <StepCard step={step} side={side} rotate={rotate} />
        </div>
        {left ? <span className="system-arm hidden md:block" /> : null}
        {left ? <span className="system-node hidden md:block" /> : null}
      </div>
    </li>
  );
}

function SideHead({ side, onFocus }) {
  const isBar = side === 'bar';
  return (
    <header className="px-4 md:px-8 py-8 md:py-14 flex flex-col items-center gap-3">
      <p className="font-display text-sm tracking-[0.35em] uppercase">
        {isBar ? 'Operação' : 'Profissional'}
      </p>
      <button
        type="button"
        onClick={onFocus}
        className={`font-spray text-5xl md:text-7xl min-h-11 min-w-11 px-3 -rotate-1 motion-reduce:rotate-0 ${
          isBar ? 'text-on-primary' : 'text-inverse-on-surface'
        }`}
      >
        {isBar ? 'Bar' : 'Freela'}
      </button>
      <p className={`text-xs md:text-sm text-center max-w-sm ${isBar ? '' : 'text-outline'}`}>
        Clica no nome pra ver só esse lado.
      </p>
    </header>
  );
}

export function SistemaPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('lado');
  const focus = raw === 'bar' || raw === 'freela' ? raw : null;

  function setFocus(next) {
    const nextParams = new URLSearchParams(params);
    if (!next) nextParams.delete('lado');
    else nextParams.set('lado', next);
    setParams(nextParams, { replace: true });
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [focus]);

  useEffect(() => {
    if (!focus) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') setFocus(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus]);

  const steps = focus === 'freela' ? freelaSteps : barSteps;
  const dual = !focus;

  return (
    <div
      className={`system-page ${dual ? 'system-dual' : ''} ${
        focus === 'freela' ? 'system-freela' : focus === 'bar' ? 'system-bar' : ''
      }`}
      data-focus={focus || 'split'}
    >
      <span className="system-spine" aria-hidden="true" />

      {dual ? (
        <>
          <div className="md:hidden">
            <section className="system-bar relative bg-primary text-on-primary">
              <span className="system-rail" aria-hidden="true" />
              <SideHead side="bar" onFocus={() => setFocus('bar')} />
              <div className="px-4 pb-2 flex justify-center">
                <StatusStamp className="stamp-ink">Painel</StatusStamp>
              </div>
              <ol>
                {barSteps.map((step, index) => (
                  <StackStep key={step.id} step={step} side="bar" index={index} />
                ))}
              </ol>
              <div className="px-4 py-10 flex flex-col items-center">
                <RoughButton to="/cadastro-bar" variant="ink" className="w-full max-w-sm">
                  Sou bar
                </RoughButton>
              </div>
            </section>
            <section className="system-freela relative bg-inverse-surface text-inverse-on-surface">
              <span className="system-rail" aria-hidden="true" />
              <SideHead side="freela" onFocus={() => setFocus('freela')} />
              <div className="px-4 pb-2 flex justify-center">
                <StatusStamp>No Leste</StatusStamp>
              </div>
              <ol>
                {freelaSteps.map((step, index) => (
                  <StackStep key={step.id} step={step} side="freela" index={index} />
                ))}
              </ol>
              <div className="px-4 py-10 flex flex-col items-center">
                <RoughButton to="/cadastro-freela" className="w-full max-w-sm">
                  Sou freela
                </RoughButton>
              </div>
            </section>
          </div>

          <div className="hidden md:block">
            <div className="grid grid-cols-2">
              <section className="system-bar bg-primary text-on-primary">
                <SideHead side="bar" onFocus={() => setFocus('bar')} />
                <div className="px-8 pb-2 flex justify-center">
                  <StatusStamp className="stamp-ink">Painel</StatusStamp>
                </div>
              </section>
              <section className="system-freela bg-inverse-surface text-inverse-on-surface">
                <SideHead side="freela" onFocus={() => setFocus('freela')} />
                <div className="px-8 pb-2 flex justify-center">
                  <StatusStamp>No Leste</StatusStamp>
                </div>
              </section>
            </div>

            <ol>
              {barSteps.map((bar, index) => (
                <DualStep key={bar.id} bar={bar} freela={freelaSteps[index]} index={index} />
              ))}
            </ol>

            <div className="grid grid-cols-2">
              <div className="system-bar bg-primary px-8 py-16 flex flex-col items-center">
                <RoughButton to="/cadastro-bar" variant="ink" className="w-full max-w-sm">
                  Sou bar
                </RoughButton>
              </div>
              <div className="system-freela bg-inverse-surface px-8 py-16 flex flex-col items-center">
                <RoughButton to="/cadastro-freela" className="w-full max-w-sm">
                  Sou freela
                </RoughButton>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div
          className={
            focus === 'bar'
              ? 'bg-primary text-on-primary'
              : 'bg-inverse-surface text-inverse-on-surface'
          }
        >
          <span className="system-rail md:hidden" aria-hidden="true" />
          <div className="flex justify-end px-4 md:px-8 pt-3">
            <button
              type="button"
              aria-label="Voltar à visão dos dois lados"
              onClick={() => setFocus(null)}
              className={`sticker min-h-11 min-w-11 ${focus === 'bar' ? 'sticker-ink' : ''}`}
            >
              <Icon name="close" />
            </button>
          </div>
          <header className="px-4 md:px-8 pt-2 pb-10 md:pb-16 flex flex-col items-center gap-4">
            <StatusStamp className={focus === 'bar' ? 'stamp-ink' : ''}>
              {focus === 'bar' ? 'Painel' : 'No Leste'}
            </StatusStamp>
            <h1 className="font-spray text-5xl md:text-8xl -rotate-1 motion-reduce:rotate-0">
              {focus === 'bar' ? 'Bar' : 'Freela'}
            </h1>
            <p
              className={`text-sm md:text-base text-center max-w-lg ${
                focus === 'freela' ? 'text-outline' : ''
              }`}
            >
              {focus === 'bar'
                ? 'Do Stripe ao review. Caixa e estoque no tenant. Freela só na vitrine.'
                : 'Da parede ao saque. Sem caixa de bar. Split no Express.'}
            </p>
          </header>

          <ol>
            {steps.map((step, index) => (
              <FocusStep key={step.id} step={step} side={focus} index={index} />
            ))}
          </ol>

          <div className="px-4 md:px-8 py-10 md:py-16 flex flex-col items-center">
            <RoughButton
              to={focus === 'bar' ? '/cadastro-bar' : '/cadastro-freela'}
              variant={focus === 'bar' ? 'ink' : 'cta'}
              className="w-full max-w-sm"
            >
              {focus === 'bar' ? 'Sou bar' : 'Sou freela'}
            </RoughButton>
          </div>
        </div>
      )}
    </div>
  );
}
