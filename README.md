# FreelaNoLeste / Marquinho's

Monorepo dos **dois produtos**, um `main`, sem fork.

| Pacote | Papel |
| --- | --- |
| `apps/marquinhos` | Bar original (tenant com branding fixo). Painel operacional **implementado**. |
| `apps/freelanoleste` | Plataforma MT: landing, admin, marketplace, painel do bar (`@fnl/dashboard`), hub freela. |
| `apps/api` | API mock do painel. |
| `packages/dashboard` | Núcleo operacional **em uso** no `/bar/*` da plataforma. |
| `packages/ui` | Tokens de tema (logo/cores) para white-label. |

Marquinho's original é o primeiro tenant (amarelo `#FFDB15`). Cliente da plataforma recebe o mesmo painel, com logo e cores dele.

Docs: [`regras`](docs/regras-negocio-multitenant.md) · [`fluxos`](docs/fluxos.md) · [`design`](docs/design.md).

```
apps/marquinhos          produto básico (hoje o código vive aqui)
apps/freelanoleste       plataforma
apps/api
packages/dashboard       destino das extrações compartilhadas
packages/ui              tema injetável
```

- Feature de caixa/estoque/fornecedores → núcleo (`apps/marquinhos` agora, `packages/dashboard` depois) → os dois produtos.
- Stripe, reviews, cadastro de freela, admin MT → só `apps/freelanoleste`.

---

## Rodar

Na raiz:

```bash
npm install
npm run dev:marquinhos    # :5173
npm run dev:plataforma    # :5174
npm run dev:api           # :3333 mock
```

### Firebase (obrigatório)

Login, cadastro, perfil e dados operacionais usam **Firebase Auth + Firestore**. Sem `FIREBASE_*` o app não sobe no modo local.

Os dois apps apontam para o **mesmo projeto**. Copie:

- `apps/marquinhos/.env.example` → `apps/marquinhos/.env`
- `apps/freelanoleste/.env.example` → `apps/freelanoleste/.env`

Prefixo `FIREBASE_` (Vite também aceita `VITE_FIREBASE_*`). Seed inicial:

```bash
SEED_OWNER_PASSWORD=... SEED_ADMIN_PASSWORD=... node scripts/seed-firebase.mjs
```

Contas do seed: dono `fabiosilsantos71@gmail.com` · admin/freela `guilvieira409@gmail.com`.

### Vercel — projeto Marquinho's

Root Directory = raiz do repo (vazio / `.`). **Não** apontar para `apps/marquinhos`.

| Campo | Valor |
| --- | --- |
| Framework Preset | Vite |
| Build Command | `npm run build -w @fnl/marquinhos` |
| Output Directory | `apps/marquinhos/dist` |
| Install Command | default (`npm install`) |

SPA: `vercel.json` na raiz reescreve rotas para `index.html`.

Firebase no deploy: Settings → Environment Variables com as chaves de `apps/marquinhos/.env.example` **e** `apps/freelanoleste/.env.example`. Sem isso a tela bloqueia. Crie o usuário no Firebase Auth (e-mail/senha) ou rode o seed.

### Rotas Marquinho's

| Rota | Tela |
| --- | --- |
| `/login` | Login |
| `/` | Visão geral |
| `/fluxo-caixa` | Fluxo de caixa |
| `/estoque` | Estoque |
| `/fornecedores` | Fornecedores |
| `/freelancers` | Equipe do bar |
| `/perfil` | Perfil |

### FreelaNoLeste — contas (`:5174`)

| E-mail | Papel | Login |
| --- | --- | --- |
| `fabiosilsantos71@gmail.com` | Dono Marquinho's | `/login/bar` |
| `guilvieira409@gmail.com` | Freela | `/login/freela` |
| `guilvieira409@gmail.com` | Admin plataforma | `/login/admin` |

Sem seeds locais. Cadastro em `/cadastro-bar` e `/cadastro-freela` (grava Auth + `users/{uid}` + stores `fnl/*`).

### Rotas FreelaNoLeste

| Rota | Tela |
| --- | --- |
| `/` | Landing |
| `/sistema` | Como o sistema funciona (Bar \| Freela) |
| `/login` | Gateway Bar \| Freela |
| `/login/bar` `/login/freela` `/login/admin` | Login por papel |
| `/cadastro-bar` `/cadastro-freela` | Cadastro real |
| `/pessoal` | Showcase público (`/freelas` redireciona) |
| `/admin` `/admin/noites` `/admin/tenants` `/admin/usuarios` `/admin/financeiro` | Admin |
| `/bar` `/bar/caixa` `/bar/estoque` `/bar/fornecedores` `/bar/equipe` | Ops (`@fnl/dashboard`) |
| `/bar/vitrine` `/bar/propostas` `/bar/chat/:id` | Contratar |
| `/bar/perfil` `/bar/pagamentos` | Conta do bar |
| `/freela` | Hub (vagas, chat `?chat=`, finance `?finance=open`) |

---

## Atores

- **Admin da plataforma** — tenants, assinaturas, splits
- **Dono do bar** — assina, opera o Marquinho's do tenant, contrata freelas
- **Freela** — cadastra-se na plataforma, recebe via Stripe, avalia o bar
