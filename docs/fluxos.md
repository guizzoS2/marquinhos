# Fluxos e mapa de telas — FreelaNoLeste

O que cada view faz **hoje**. Regras: [`regras-negocio-multitenant.md`](regras-negocio-multitenant.md). Visual: [`design.md`](design.md).

App: `apps/freelanoleste` (`npm run dev:plataforma`, :5174). Auth e dinheiro são mock (`localStorage`).

---

## Portas de login

Três papéis, três URLs. Gateway `/login` só mostra Bar | Freela. Admin entra em `/login/admin` (sem botão no gateway).

| Rota | Quem | Depois do login |
| --- | --- | --- |
| `/login/bar` | `owner`, `staff` (`employee` seed quebrado) | `/bar` |
| `/login/freela` | `freela` | `/freela` |
| `/login/admin` | `admin` | `/admin` |

Cadastro que persiste: `/cadastro-bar`, `/cadastro-freela`.  
Cadastro stub (não usar): `/cadastro/bar`, `/cadastro/freela`.

Demo local:

| Conta | Senha | Destino |
| --- | --- | --- |
| `admin@freelanoleste.local` | `admin123` | Admin |
| `dono@bar.local` | `demo123` | Bar (tenant `marquinhos`) |
| `freela@freelanoleste.local` | `demo123` | Hub freela |
| `estoque@bar.local` | `demo123` | **Não usar** — role `employee`, cai em `/` |

Bar novo via `/cadastro-bar` nasce `incomplete`. Admin ativa em `/admin/tenants`. Enquanto isso o dono vê “Aguardando ativação”.

---

## Público (street)

| Rota | View | Faz |
| --- | --- | --- |
| `/` | `HomePage` | Landing. CTA real: `/cadastro-bar`, `/cadastro-freela` |
| `/login` | `AuthGatewayPage` | Split Bar \| Freela |
| `/pessoal` | `PessoalPage` | Showcase público (nome parcial). Clique → `/login` |
| `/freelas` | redirect | → `/pessoal` |

Freela **não** contrata daqui. Contratar = dono autenticado na vitrine.

---

## Admin (`RequireAdmin` + `AdminLayout`)

Sem caixa/estoque de tenant. Vê a camada da plataforma.

| Rota | View | Faz |
| --- | --- | --- |
| `/admin` | Visão | KPIs: tenants, assinaturas, freelas, inadimplência, noites, ACEITA na semana. Connect incompleto está errado (flag global) |
| `/admin/noites` | Noites | Todas as propostas/contratos. Filtro. Chat só leitura |
| `/admin/tenants` | Bares | Criar, branding (slug/hex/logo), ativar/bloquear mock |
| `/admin/usuarios` | Pessoas | Donos, staff+perms, freelas, tickets seed |
| `/admin/financeiro` | Financeiro | Faturas SaaS + linhas de split + um payout Express (não por freela) |

---

## Bar / dono (`RequireOwner` + `BarLayout` + `BarOpsProviders`)

Ops vêm de `@fnl/dashboard`. Marketplace é da plataforma.

### Operações

| Rota | Pacote | Faz |
| --- | --- | --- |
| `/bar` | Overview | Métricas, gráfico, mais vendidos, CTA estoque |
| `/bar/caixa` | CashFlow | Entradas/saídas, CSV. Diária aceita espelha aqui (bug ≥ R$ 1000) |
| `/bar/estoque` | Inventory | CRUD por `tenantId` |
| `/bar/fornecedores` | Suppliers | CRUD + compras |
| `/bar/equipe` | Team | Staff + permissões. **Não** é vitrine de freela |

### Contratar

| Rota | View | Faz | Estado |
| --- | --- | --- | --- |
| `/bar/vitrine` | Marketplace | Busca, filtro, convite → chat | **Crash** `requireBarStaff` |
| `/bar/propostas` | Proposals | Publica vaga, lista, review | **Crash** idem |
| `/bar/chat/:roomId` | Chat | Negociação, aceitar/recusar | Abre se o pack carregar |

Redirects: `/bar/freelas` → vitrine; `/bar/fluxo-caixa` → caixa.

### Conta

| Rota | View | Faz | Estado |
| --- | --- | --- | --- |
| `/bar/perfil` | Profile | Perfil público + reviews do bar | **Crash** |
| `/bar/pagamentos` | Payments | Status da sub, portal, diárias | **Crash** |

Tenant inativo: layout esconde Outlet. Staff: nav filtra `BAR_PERMISSIONS`; API **não**.

Páginas mortas (não roteadas): `pages/bar/{OpsOverview,CashFlow,Inventory,Suppliers,Team}Page.jsx`.

---

## Freela (`RequireFreela` + `StreetFrame`)

Um hub. Rotas antigas redirecionam.

| Rota | Faz |
| --- | --- |
| `/freela` | Hub: vagas, candidatura, histórico, review |
| `/freela?chat=:roomId` | Abre sheet de chat |
| `/freela?finance=open` | Abre modal financeiro / Connect |
| `/freela/connect` | Callback OAuth Express (hoje blob global + fallback `acct_express_demo`) |
| `/freela/vagas`, `/freela/perfil` | → `/freela` |
| `/freela/financeiro` | → `?finance=open` |
| `/freela/chat/:roomId` | → `?chat=` |

Sem caixa/estoque. Jobs só de tenant `stripeStatus === 'active'`.

Páginas mortas: `pages/freela/{Jobs,Profile,History,Chat,Finance}Page.jsx`.

---

## Fluxo bar ↔ freela (hoje)

```
Freela cadastra em /cadastro-freela
        ↓
Dono (assinatura ativa) abre /bar/vitrine
        ↓
Convite OU vaga pública → /bar/chat/:id  |  /freela?chat=
        ↓
Contra-proposta no chat
        ↓
ACEITA → tr_mock_* + linha admin + espelho no caixa + review destrava
```

O que a regra pede e o código **não** faz: Checkout/PaymentIntent, Connect por freela, split %, review só depois de serviço/pagamento real.

---

## Fluxo assinatura (hoje)

```
/cadastro-bar → tenant incomplete
        ↓
Dono vê “Aguardando ativação”
        ↓
Admin /admin/tenants → ativar (sub_mock_*)
        ↓
Painel /bar/* libera
```

Sem Stripe Checkout. Portal cai em URL de teste se a API local falhar.
