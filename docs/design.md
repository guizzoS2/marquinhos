# Design — FreelaNoLeste

Sistema visual **em uso**. O Stitch “Fluid Concierge” (`stitch_dashboard_principal/.../DESIGN.md`) **não** vale para as telas da plataforma. Não copiar glass, no-line, Manrope editorial ou primary `#0058bb`.

Tokens de cor/fonte white-label: `packages/ui/tailwind.preset.js`. Atmosfera: `apps/freelanoleste/src/index.css`. Mobile: `.cursor/rules/ui-responsivo.mdc`.

---

## Dois skins

| Superfície | Skin | Onde |
| --- | --- | --- |
| Público + freela | **Street / poster** | `Home`, login, cadastro, `/pessoal`, `/freela` |
| Admin + bar | **`bar-panel`** | `/admin/*`, `/bar/*` (inclui `@fnl/dashboard`) |
| Chat / alguns sheets | MD3 leftover | `NegotiationChat`, `FreelaSheet`, `FreelaModal` — costura visual; não expandir |

Não misturar street no ops sem necessidade. Chat ainda usa `surface` / `rounded-2xl` dentro dos dois shells.

---

## Street (público + freela)

Canvas preto. Cartaz amarelo. Sem sidebar.

| Token | Valor |
| --- | --- |
| Fundo | `--ink` `#111111` |
| Papel | `--paper` `#ffffff` |
| Spray / CTA | `--hot` / `--spray` `#ffdb15` |
| Muted | `#5c5c5c` |
| Display | Bebas Neue (`.font-display`) |
| Spray wordmark | Rubik Spray Paint (`.font-spray`) |
| Corpo | Space Mono |

Peças: `StreetFrame`, `StreetNav`, `PosterCard` (ink / paper / yellow), `RoughButton`, `StatusStamp`, `.sticker`, `.street-input`.

Regras:

- Borda 2–3px + sombra dura (`6px 6px 0 #000`). Sem radius “SaaS”.
- Alvo de toque ≥ 44px (`min-h-11`).
- Rotação leve (`-rotate-1`) some em `motion-reduce`.
- Grain + scanline só no street; não pintar `body` global.

---

## Bar-panel (admin + bar)

Canvas branco. Volume ~40% do street. Identidade do tenant no spray.

| Token | Valor |
| --- | --- |
| Papel | `--paper` `#ffffff` |
| Folha | `--sheet` `#f7f4ee` |
| Ink | `#111111` |
| Spray | `var(--tenant-primary, #ffdb15)` |
| Display | Bebas Neue |
| Destaque | Rubik Spray Paint |
| Dados | Space Mono |

Peças: fita `.bar-tape`, grain leve, nav `.bar-sticker` / `.bar-sticker-on`, métricas `.bar-strip`, tabelas `.bar-table`, campo `.bar-field`, CTA `.bar-cta`.

Layout: sidebar 256px → drawer no `<768px`. Header sticky 64px. `main` `p-4` / `p-8`. Chat do bar: `h-dvh`, sem padding do main.

White-label: `BarLayout` seta `--tenant-primary` a partir do tenant. Default ainda `#FFDB15` (Marquinho's). Logo no aside. Admin **não** usa branding de tenant — wordmark FreelaNoLeste.

---

## Dashboard (`@fnl/dashboard`)

Mesmo `bar-*`. Componentes: `Button`, `Icon`, `Card`, `MetricCard`, `AppModal`, toasts. FAB de venda no overview — no mobile não pode tapar CTA (`pb` no conteúdo).

Preset `@fnl/ui`: `primary` = `var(--color-primary, #FFDB15)`. Marquinho's original trava o amarelo. Tenant injeta hex; sem fork de CSS.

---

## Tipografia (o que o CSS faz)

| Uso | Fonte |
| --- | --- |
| `h1–h3` globais | Manrope (quase invisível; skins sobrescrevem) |
| Street / bar títulos | Bebas Neue |
| Wordmark / número destaque | Rubik Spray Paint |
| Corpo street / bar | Space Mono |
| Formulário MD3 leftover | Inter / Manrope (`font-headline`) |

Não introduzir a escala Stitch (`display-lg` 3.5rem, “Fluid Concierge”).

---

## Mobile (obrigatório)

- Coluna `<768px` quando a row estoura.
- Sem overflow-x. Sem `zoom` CSS. Desktop: `html { font-size: 90% }` ≥768px.
- Sidebar vira drawer. Tabela: `overflow-x-auto`. Grid: `grid-cols-1` no mobile.
- Ação só-hover precisa de equivalente no toque.
- Sem style inline e sem cor nova fora do preset / tokens acima.

---

## O que não fazer

- Copiar DESIGN.md do Stitch (no-line, glass, `#0058bb`, pour-gauge).
- Hardcode de logo/amarelo Marquinho's em tenant novo (default atual é dívida).
- Levar street (scanline, poster 3px) para o caixa/estoque.
- Inventar classe de cor no JSX.
