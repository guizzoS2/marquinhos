const titles = {
  overview: 'Visão geral',
  cash: 'Fluxo de caixa',
  stock: 'Estoque',
  team: 'Equipe',
  market: 'Vitrine',
  chat: 'Chat',
  pay: 'Pagamentos',
  signup: 'Cadastro',
  hub: 'Hub',
  connect: 'Stripe',
  review: 'Review',
  history: 'Já rolou',
};

function Chrome({ title, children }) {
  return (
    <figure className="system-shot">
      <div className="system-shot-bar">
        <span className="system-dot" />
        <span className="system-dot" />
        <span className="system-dot" />
        <figcaption className="font-display text-[0.65rem] tracking-widest uppercase ml-1">
          {title}
        </figcaption>
      </div>
      <div className="p-2 space-y-1.5">{children}</div>
    </figure>
  );
}

function OverviewMock() {
  return (
    <Chrome title={titles.overview}>
      <div className="grid grid-cols-3 gap-1">
        {['Hoje', 'Semana', 'Sobra'].map((label) => (
          <div key={label} className="border-2 border-on-background p-1">
            <p className="font-display text-[0.55rem] tracking-widest uppercase">{label}</p>
            <p className="font-spray text-sm leading-none">R$</p>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1 h-12 px-1">
        {['h-1/2', 'h-3/4', 'h-1/2', 'h-full', 'h-3/5', 'h-4/5', 'h-3/5'].map((height, i) => (
          <span
            key={i}
            className={`flex-1 bg-primary border border-on-background ${height}`}
          />
        ))}
      </div>
    </Chrome>
  );
}

function CashMock() {
  return (
    <Chrome title={titles.cash}>
      {[
        ['Balcão', '+ 842'],
        ['Cerveja', '− 310'],
        ['Diária*', 'Stripe'],
      ].map(([label, value]) => (
        <div key={label} className="system-bar-row">
          <span>{label}</span>
          <span className="font-display">{value}</span>
        </div>
      ))}
      <p className="text-[0.55rem] leading-tight">* Diária de freela não entra no caixa.</p>
    </Chrome>
  );
}

function StockMock() {
  return (
    <Chrome title={titles.stock}>
      {[
        ['Pilsen 600', '24 un'],
        ['Gin', '4 un'],
        ['Gelo', '12 kg'],
      ].map(([name, qty]) => (
        <div key={name} className="system-bar-row">
          <span>{name}</span>
          <span className="system-chip">{qty}</span>
        </div>
      ))}
    </Chrome>
  );
}

function TeamMock() {
  return (
    <Chrome title={titles.team}>
      {['Caixa', 'Estoque', 'Salão'].map((role) => (
        <div key={role} className="system-bar-row">
          <span className="inline-flex items-center gap-1">
            <span className="system-chip">OK</span>
            {role}
          </span>
          <span>login</span>
        </div>
      ))}
    </Chrome>
  );
}

function MarketMock() {
  return (
    <Chrome title={titles.market}>
      <div className="border-2 border-on-background min-h-6 px-2 flex items-center text-[0.6rem]">
        Busca · nota · piso
      </div>
      <div className="grid grid-cols-2 gap-1">
        {['Balcão', 'Salão'].map((role) => (
          <div key={role} className="border-2 border-on-background p-1 space-y-1">
            <p className="font-display text-xs uppercase">{role}</p>
            <p className="text-[0.55rem]">★★★★☆</p>
            <span className="system-chip">Convidar</span>
          </div>
        ))}
      </div>
    </Chrome>
  );
}

function ChatMock() {
  return (
    <Chrome title={titles.chat}>
      <div className="flex justify-end">
        <p className="system-chip">Sexta · R$</p>
      </div>
      <div className="flex justify-start">
        <p className="system-chip">Contra</p>
      </div>
      <div className="flex justify-end">
        <p className="system-chip bg-primary text-on-primary">ACEITA</p>
      </div>
    </Chrome>
  );
}

function PayMock() {
  return (
    <Chrome title={titles.pay}>
      <p className="font-display text-sm uppercase tracking-wide">Assinatura</p>
      <span className="system-chip bg-primary text-on-primary">Ativa · Stripe</span>
      <div className="system-bar-row">
        <span>Diária</span>
        <span>split</span>
      </div>
      <div className="system-bar-row">
        <span>PIX</span>
        <span>não</span>
      </div>
    </Chrome>
  );
}

function SignupMock() {
  return (
    <Chrome title={titles.signup}>
      <div className="border-2 border-primary min-h-6 px-2 flex items-center text-[0.6rem] text-outline">
        Nome
      </div>
      <div className="border-2 border-primary min-h-6 px-2 flex items-center text-[0.6rem] text-outline">
        Função · piso
      </div>
      <span className="system-chip bg-primary text-on-primary">Entrar na parede</span>
    </Chrome>
  );
}

function HubMock() {
  return (
    <Chrome title={titles.hub}>
      <div className="grid grid-cols-3 gap-1">
        {['Saldo', 'Vagas', 'Chat'].map((label) => (
          <div key={label} className="border-2 border-primary p-1">
            <p className="font-display text-[0.55rem] tracking-widest uppercase text-primary">
              {label}
            </p>
            <p className="font-spray text-sm text-primary leading-none">·</p>
          </div>
        ))}
      </div>
      <div className="border-2 border-primary p-1">
        <p className="font-display text-xs uppercase">Convite · Sexta</p>
        <p className="text-[0.55rem] text-outline">Candidatar</p>
      </div>
    </Chrome>
  );
}

function ConnectMock() {
  return (
    <Chrome title={titles.connect}>
      <p className="font-display text-sm uppercase">Express</p>
      <div className="system-bar-row">
        <span>Conta</span>
        <span className="system-chip">ligada</span>
      </div>
      <div className="system-bar-row">
        <span>Saque</span>
        <span>Stripe</span>
      </div>
    </Chrome>
  );
}

function ReviewMock() {
  return (
    <Chrome title={titles.review}>
      <p className="font-display text-xs uppercase">Depois do trampo pago</p>
      <p className="text-primary text-sm leading-none">★★★★★</p>
      <div className="border-2 border-primary min-h-8 px-2 flex items-center text-[0.6rem] text-outline">
        Como foi a noite
      </div>
    </Chrome>
  );
}

function HistoryMock() {
  return (
    <Chrome title={titles.history}>
      {['Casa A', 'Casa B'].map((bar) => (
        <div key={bar} className="system-bar-row">
          <span>{bar}</span>
          <span className="text-primary">pago</span>
        </div>
      ))}
    </Chrome>
  );
}

const mocks = {
  overview: OverviewMock,
  cash: CashMock,
  stock: StockMock,
  team: TeamMock,
  market: MarketMock,
  chat: ChatMock,
  pay: PayMock,
  signup: SignupMock,
  hub: HubMock,
  connect: ConnectMock,
  review: ReviewMock,
  history: HistoryMock,
};

export function ScreenMock({ kind }) {
  const Mock = mocks[kind];
  if (!Mock) return null;
  return <Mock />;
}
