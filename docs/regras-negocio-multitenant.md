# FreelaNoLeste e Marquinho's — regras de negócio e requisitos

A partir de agora o projeto se divide em **dois produtos**. Este documento registra as regras de negócio do multi-tenant e os requisitos definidos para a plataforma.

Telas e fluxos: [`fluxos.md`](fluxos.md). Visual: [`design.md`](design.md).

---

## 1. Os dois produtos

### Marquinho's

Sistema operacional do bar: visão geral, fluxo de caixa, estoque, fornecedores, freelancers e perfil.

Continua existindo como produto próprio (o bar Marquinho's) e como **instância white-label** que cada cliente da plataforma recebe.

### FreelaNoLeste

Plataforma **multi-tenant** (SaaS) que:

- vende acesso a donos de bar;
- entrega a cada cliente um Marquinho's configurado (logo, cores e identidade);
- conecta bares e freelancers;
- processa pagamentos via Stripe, com split entre plataforma e freelancer.

FreelaNoLeste é o produto comercial. Marquinho's é o painel que o cliente usa depois de assinar.

---

## 2. Atores

| Ator | Quem é | O que faz |
| --- | --- | --- |
| **Admin da plataforma** | Dono do FreelaNoLeste | Painel administrativo: tenants, assinaturas, usuários, splits, suporte |
| **Cliente / dono do bar** | Estabelecimento que paga para usar | Acessa o próprio Marquinho's; contrata e avalia freelas; recebe avaliações do bar |
| **Freelancer (freela)** | Profissional autônomo | Cadastra-se, aparece para os bares, recebe pagamentos via Stripe, avalia o bar |

Três papéis distintos, com login e permissões separados.

---

## 3. Multi-tenant

Cada bar pagante é um **tenant** isolado.

Regras:

1. Dados de um bar não vazam para outro (caixa, estoque, fornecedores, equipe, logo, cores).
2. O cliente não usa o Marquinho's original: usa **o Marquinho's daquele tenant**.
3. A plataforma (FreelaNoLeste) vê a camada acima: tenants, pagamentos, cadastro de freelas, reputação.
4. Freelas não entram no painel operacional do bar (caixa/estoque). Entram no fluxo de cadastro, disponibilidade, contratação e pagamento.

---

## 4. White-label do Marquinho's

Quando o cliente assina, recebe um Marquinho's configurado para ele.

Requisitos de identidade:

- logo do estabelecimento;
- paleta de cores do estabelecimento;
- nome / marca do bar no lugar da identidade Marquinho's.

O que permanece igual: módulos operacionais (visão geral, fluxo de caixa, estoque, fornecedores, equipe do bar, perfil).

Contratação de freela **não** é módulo operacional. Vive na plataforma: vitrine, propostas, chat, pagamentos Stripe. Equipe (`/bar/equipe`) = funcionários com login no painel. Vitrine (`/bar/vitrine`) = marketplace de freelas.

O que muda por tenant: branding e dados.

---

## 5. Monetização — donos de bar

Os clientes **pagam para ter acesso** ao sistema.

Regras:

1. Acesso ao Marquinho's do tenant depende de assinatura ativa.
2. Sem pagamento válido, o tenant não opera (login de dono bloqueado ou restrito).
3. O pagamento da assinatura é feito **pelo Stripe**.
4. O admin da plataforma gerencia planos, status (ativo, atrasado, cancelado) e tenants.

O valor e a periodicidade do plano ainda não foram definidos neste documento.

---

## 6. Cadastro e login de freelas

Além do login de dono de bar, existe **login de usuário freelancer**.

Regras:

1. O freela se cadastra na plataforma FreelaNoLeste (não no Marquinho's de um bar específico).
2. Após o cadastro, fica visível para os donos de bar que são clientes da plataforma.
3. Donos de bar têm acesso à base de freelas (busca, perfil, histórico, reviews).
4. O dono usa o Marquinho's do tenant para operar o bar e, pela plataforma, para encontrar/contratar freelas.

---

## 7. Relação bar ↔ freela

Fluxo esperado:

1. Freela se cadastra na plataforma.
2. Dono do bar (assinante) consulta os freelas.
3. Há contratação / agendamento de diária ou turno.
4. O pagamento da diária **não é combinado por fora**: passa pelo Stripe.
5. Depois do serviço, as duas partes avaliam.

O painel do bar continua podendo registrar diária e despesa no fluxo de caixa, mas o dinheiro da relação com o freela da plataforma passa pelo Stripe com split.

---

## 8. Reviews

Reviews são **bidirecionais**.

- **Review de freela:** o dono do bar avalia o profissional (após o serviço).
- **Review de bar:** o freela avalia o estabelecimento.

Regras:

1. Review só depois de uma relação real (serviço/pagamento concluído), para evitar nota sem contrato.
2. Reviews ficam no perfil público do freela e do bar dentro da plataforma.
3. Donos de bar usam reviews para escolher profissional.
4. Freelas usam reviews para escolher onde trabalhar.

Critérios de nota (estrelas, tags, comentário) ainda não foram detalhados; o requisito mínimo é existir review nos dois sentidos.

---

## 9. Pagamentos e split (Stripe)

Todo o dinheiro relevante passa pelo **Stripe**.

Dois fluxos:

### 9.1 Assinatura do bar (SaaS)

O cliente paga a plataforma para ter o Marquinho's. Recebedor: FreelaNoLeste.

### 9.2 Pagamento do freela (marketplace)

Quando o bar paga o profissional:

1. O pagamento é feito no Stripe.
2. Há **split**:
   - parte para a **plataforma** (taxa FreelaNoLeste);
   - parte para o **freela**.
3. O freela precisa estar apto a receber no Stripe (conta conectada).
4. O bar paga pela plataforma; não transfere PIX/dinheiro direto para o freela nesse fluxo.

A alíquota do split ainda não foi definida neste documento. A regra de negócio é: **sempre split plataforma + freela**, via Stripe.

---

## 10. Painel administrativo

O admin do FreelaNoLeste precisa de um painel próprio, separado do Marquinho's dos clientes.

Escopo mínimo:

- listar e gerenciar tenants (bares);
- status de assinatura Stripe;
- usuários (donos e freelas);
- branding por tenant (logo, cores);
- acompanhar pagamentos e splits;
- suporte / bloqueio de acesso.

---

## 11. Requisitos colocados (checklist)

Requisitos explícitos desta etapa:

- [x] O projeto se divide em **dois**: Marquinho's e FreelaNoLeste
- [x] FreelaNoLeste é **multi-tenant** (cliente; stores por `tenantId`)
- [x] Existe **painel admin** da plataforma
- [ ] Clientes (donos de bar) **pagam para ter acesso** — mock: admin ativa
- [x] Cada cliente recebe um **painel operacional** (`@fnl/dashboard`)
- [x] Configuração inclui **logo** do cliente
- [x] Configuração inclui **cores** do cliente (`--tenant-primary`)
- [x] Existe **login de usuários freelas**
- [x] Freelas **podem se cadastrar** para atuar na plataforma
- [x] Donos de bar **têm acesso aos freelas** (vitrine — hoje quebrada, ver §14)
- [x] Existe **review de freela** (UI; gate errado, ver §8/§14)
- [x] Existe **review de bar**
- [ ] O dinheiro **passa pelo Stripe** — mock `tr_mock_*` / Connect demo
- [ ] Há **split** para a plataforma e para o freela — taxa `null`
- [ ] O **pagamento** (assinatura e diária) é feito pelo Stripe
- [x] Um **repo só** (monorepo): sem fork e sem branch eterna por produto

---

## 12. Repositório e GitHub (monorepo)

Os produtos são diferentes. O **painel operacional** (caixa, estoque, fornecedores, equipe) é o mesmo núcleo. Por isso a regra de Git não é “dois repositórios” nem “duas branches”.

### O que vale

- **Um repositório**, um `main`.
- Apps separados, pacote compartilhado do painel.
- Feature de caixa/estoque nasce no núcleo e os dois produtos recebem. Feature de Stripe/reviews/admin nasce só na plataforma.

### O que não vale

| Abordagem | Por quê não |
| --- | --- |
| Branch `marquinhos` / `freela` | Merge infinito; os produtos nunca divergem limpo |
| Fork FreelaNoLeste ← Marquinho's | “Puxar pro Marquinho's” vira cherry-pick eterno |
| Dois repos copiando `client` | Duplica o produto básico; o diff não volta |

Dois repos só entram na conversa quando houver times/deploys separados **e** o dashboard já extraído como pacote.

### Layout

```
apps/marquinhos          bar original (1 tenant, logo/cores fixos)
apps/freelanoleste       plataforma (admin, assinatura, marketplace, reviews, Stripe)
apps/api                 API mock do painel
packages/dashboard       produto básico compartilhado (módulos operacionais)
packages/ui              tokens de tema (logo, cores) injetáveis por tenant
```

### Como “puxar alteração pro Marquinho's”

1. Se a mudança é do **painel operacional**, ela entra em `packages/dashboard` (hoje o código ainda vive em `apps/marquinhos` até a extração módulo a módulo).
2. PR no `main`. Os apps sobem juntos.
3. O que é só da plataforma (Stripe, cadastro de freela, reviews, admin MT) **não** vai para o app Marquinho's — fica em `apps/freelanoleste`.

Marquinho's original = tenant especial: mesmo dashboard, branding travado, sem marketplace se assim for configurado.

### Extração do núcleo

Não extrair `apps/marquinhos` inteiro de uma vez. Os módulos operacionais da plataforma **já saíram** para `packages/dashboard` (visão, caixa, estoque, fornecedores, equipe). Marquinho's original continua o tenant com branding travado. Feature nova de ops nasce no pacote.

---

## 13. O que este documento ainda não fecha

Pontos em aberto, para decisão posterior:

- preço e ciclo da assinatura do bar;
- percentual do split da plataforma (hoje `platformFee` vai `null`; líquido = bruto);
- se o tenant é subdomínio, path ou domínio próprio;
- regras de cancelamento, reembolso e disputa;
- obrigatoriedade de review após cada diária;
- o que acontece com dados do tenant se a assinatura acabar.

**Fechado no código:** o freela tem app próprio — hub em `/freela` (não só vitrine pública).

Enquanto o resto não for definido, vale o que está nas seções 1–12. O mapa de telas e o que é mock está em [`fluxos.md`](fluxos.md). Visual: [`design.md`](design.md).

---

## 14. Implementação atual (mock local)

A plataforma em `apps/freelanoleste` é **casca + stores em `localStorage`**. Isolamento de tenant existe no cliente (`tenantId` nas chaves). Não é isolamento de produção.

| Peça | Hoje | Regra (1–12) |
| --- | --- | --- |
| Login | Portas separadas `/login/bar`, `/login/freela`, `/login/admin` | ✓ §2 |
| Cadastro real | `/cadastro-bar`, `/cadastro-freela` | ✓ §6 |
| Cadastro stub | `/cadastro/bar`, `/cadastro/freela` — só “enviado”, não persiste | viola §6 |
| Assinatura | Admin ativa/bloqueia (`sub_mock_*`). Sem Checkout | intent §5; não Stripe |
| Diária | Aceitar no chat cria `tr_mock_*`, espelha caixa, destrava review | viola §7–9 (accept ≠ pago) |
| Split | Linha no admin; taxa `null` | viola §9 até % existir |
| Connect | Um blob global `freelaStore.stripe` para todos os freelas | viola §9.2 |
| Review | Formulário após `ACEITA`, sem data de serviço nem PI | viola §8 |
| White-label | Logo + `--tenant-primary` no painel do bar. Default `#FFDB15` | §4; default ainda Marquinho's |
| Ops do bar | `@fnl/dashboard` montado em `/bar/*` | extraído; em uso |
| Staff | Login no `/login/bar`; permissões só escondem nav | UI ≠ API |

Bugs conhecidos da revisão (não corrigidos nesta atualização de docs):

1. `requireBarStaff()` em `ownerApi.js` **não existe** — `/bar/vitrine`, `/bar/propostas`, `/bar/perfil`, `/bar/pagamentos` quebram no load.
2. `reaisToCents` trata inteiro ≥ 1000 como centavos — diária de R$ 1000 vira R$ 10 no caixa.
3. Seed `estoque@bar.local` (`employee`) não ganha permissões; login cai em `/`.
4. APIs de contratar/pagar aceitam qualquer sessão de bar (staff incluso).

---

## 15. Staff e papéis no painel do bar

Além dos três atores da §2, o tenant tem **funcionário**:

| Role | Porta | O que vê |
| --- | --- | --- |
| `owner` | `/login/bar` | Tudo do tenant |
| `staff` | `/login/bar` | Telas em `BAR_PERMISSIONS` (Equipe) |
| `employee` | seed quebrado | Sem perms; não usar |

Chaves: `overview`, `caixa`, `estoque`, `fornecedores`, `equipe`, `vitrine`, `propostas`, `perfil`, `pagamentos`. Chat herda `propostas`. Default de staff novo: visão + caixa + estoque.

Regra de produto: contratar/pagar/avaliar freela é do **dono**, salvo permissão explícita. Hoje a API não aplica isso.

---

## 16. Extração do dashboard

`packages/dashboard` **já é** o núcleo operacional da plataforma (`/bar`, `/bar/caixa`, `/bar/estoque`, `/bar/fornecedores`, `/bar/equipe`). `apps/marquinhos` continua o primeiro tenant (amarelo travado). Não copiar o app. Feature nova de caixa/estoque nasce no pacote.
