# FreelaNoLeste e Marquinho's — regras de negócio e requisitos

A partir de agora o projeto se divide em **dois produtos**. Este documento registra as regras de negócio do multi-tenant e os requisitos definidos para a plataforma.

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

O que permanece igual: módulos (visão geral, fluxo de caixa, estoque, fornecedores, gestão de freelas, perfil).

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

- [ ] O projeto se divide em **dois**: Marquinho's e FreelaNoLeste
- [ ] FreelaNoLeste é **multi-tenant**
- [ ] Existe **painel admin** da plataforma
- [ ] Clientes (donos de bar) **pagam para ter acesso**
- [ ] Cada cliente recebe um **Marquinho's configurado**
- [ ] Configuração inclui **logo** do cliente
- [ ] Configuração inclui **cores** do cliente
- [ ] Existe **login de usuários freelas**
- [ ] Freelas **podem se cadastrar** para atuar na plataforma
- [ ] Donos de bar **têm acesso aos freelas**
- [ ] Existe **review de freela**
- [ ] Existe **review de bar**
- [ ] O dinheiro **passa pelo Stripe**
- [ ] Há **split** para a plataforma e para o freela
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

Não extrair `apps/marquinhos` inteiro de uma vez. Na primeira feature que os dois apps precisarem, o módulo sai para `packages/dashboard`. Até lá, `apps/marquinhos` **é** o produto básico.

---

## 13. O que este documento ainda não fecha

Pontos em aberto, para decisão posterior:

- preço e ciclo da assinatura do bar;
- percentual do split da plataforma;
- se o tenant é subdomínio, path ou domínio próprio;
- se o freela vê um app próprio ou só o marketplace;
- regras de cancelamento, reembolso e disputa;
- obrigatoriedade de review após cada diária;
- o que acontece com dados do tenant se a assinatura acabar.

Enquanto isso não for definido, vale o que está nas seções 1–12.
