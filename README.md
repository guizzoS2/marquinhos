# FreelaNoLeste / Marquinho's

Monorepo dos **dois produtos**, um `main`, sem fork.

| Pacote | Papel |
| --- | --- |
| `apps/marquinhos` | Bar original (tenant com branding fixo). Painel operacional **implementado**. |
| `apps/freelanoleste` | Plataforma MT: landing, admin, cadastro de freela, marketplace (casca). |
| `apps/api` | API mock do painel. |
| `packages/dashboard` | Núcleo operacional compartilhado (extração módulo a módulo). |
| `packages/ui` | Tokens de tema (logo/cores) para white-label. |

Marquinho's original é o primeiro tenant (amarelo `#FFDB15`). Cliente da plataforma recebe o mesmo painel, com logo e cores dele.

Regras de negócio, MT e GitHub: [`docs/regras-negocio-multitenant.md`](docs/regras-negocio-multitenant.md).

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

### Marquinho's — login demo (modo local)

- E-mail: `fabio@marquinhos.local`
- Senha: `admin123`

Sem Firebase: `localStore`. Com Firebase: copie `apps/marquinhos/.env.example` → `.env` (**sem** `VITE_`).

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

### Rotas FreelaNoLeste

| Rota | Tela |
| --- | --- |
| `/` | Landing da plataforma |
| `/login` | Login (dono / freela / admin) |
| `/cadastro-freela` | Cadastro de freela |
| `/freelas` | Lista para donos |
| `/admin` | Painel da plataforma |

---

## Atores

- **Admin da plataforma** — tenants, assinaturas, splits
- **Dono do bar** — assina, opera o Marquinho's do tenant, contrata freelas
- **Freela** — cadastra-se na plataforma, recebe via Stripe, avalia o bar
