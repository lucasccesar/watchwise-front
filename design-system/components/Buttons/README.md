# Buttons

Ações principais, secundárias e terciárias da interface, mapeadas 1:1 às variantes do Buttons.pdf (Untitled UI), com a cor de marca (roxo) substituída por `primary`.

## Hierarquia e variantes

- **Primary** — fundo `primary` (#2563EB), texto `text`. Uma por tela/seção; a ação principal.
- **Secondary color** — fundo `surface`, borda `border`, texto `primary`. Ação secundária que ainda remete à marca.
- **Secondary gray** — fundo `surface`, borda `border`, texto `text`. Ação secundária neutra.
- **Tertiary color** — sem fundo/borda, texto `primary`. Ação de baixa ênfase relacionada à marca.
- **Tertiary gray** — sem fundo/borda, texto `tertiary`. Ação de baixa ênfase neutra.
- **Link color** / **Link gray** — como texto corrido, sublinhado no hover; `primary` ou `tertiary`.
- **Destructive** (equivalente vermelho de cada variante acima, para ações irreversíveis) — usa o token `error`: Primary destructive = fundo `error`, texto `text`; Secondary/Tertiary/Link destructive = texto `error`, mesma estrutura de fundo/borda das variantes correspondentes.

## Tamanhos

sm, md, lg, xl — conforme Buttons.pdf. Altura e padding crescem proporcionalmente à escala de `spacing`; texto em `text-sm` (sm/md) ou `text-md` (lg/xl), peso 600.

> Alvo de toque (ver *Princípios de Design → Tamanhos de alvo e interação*): mire ≥44×44px (idealmente 48×48px) de área clicável em `md`/`lg`, mesmo quando o rótulo visual for menor — os previews deste componente já usam padding de 10–12px, compatível com essa faixa.

## Formatos

- Retângulo com cantos levemente arredondados — `radius-md`.
- Pill (`rounded-full`), usada nos exemplos do kit para botões de destaque isolados.
- Icon-only, quadrado ou circular, mesma altura dos tamanhos acima, para ações compactas (ex. próximo/anterior, fechar).

## Estados

Default, hover (leve escurecimento/clareamento do fundo), focus (anel de foco visível, 2px, cor `primary` ou `accent` — não especificado exatamente; recomenda-se `primary` por já ser aprovado), disabled (opacidade reduzida, sem interação).

## Sign-in social

Buttons.pdf inclui botões de login social (Google, Facebook, Apple, X, Figma, Dribbble) em variante preenchida com a cor da marca do provedor e variante outline neutra (`secondary gray`), além de badges de loja de app (Google Play, App Store, Galaxy Store, AppGallery, F-Droid) em light/dark. Use apenas se o Watchwise tiver login social — não visto nas telas aprovadas.

## Uso

- Uma única ação `Primary` por contexto visível.
- Ações destrutivas (excluir, remover) usam `Secondary destructive` (texto `error`) quando exigem confirmação prévia, e `Primary destructive` (fundo `error`) apenas quando a própria ação já é a primária da tela (ex. dentro de um modal de confirmação).
- Nunca crie uma nova cor de botão fora dos tokens deste sistema.
