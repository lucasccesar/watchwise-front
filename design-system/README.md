# Watchwise

Sistema de design construído **exclusivamente** a partir de três fontes anexadas, nesta ordem de prioridade:

1. **Guidelines.md** — cores, layout e restrições obrigatórias (fonte de verdade máxima).
2. **UI Kit Untitled UI** (PDFs de Foundations e Components) — tipografia, spacing, ícones e todas as variantes de componente permitidas.
3. **Watchwise Initial Pages.pdf** — o estilo visual já aprovado do produto (referência de composição real).

Nenhum componente, ícone, escala ou estilo tipográfico foi inventado a partir do zero. Onde os anexos não definiam um padrão, ou o definiam de forma conflitante, isso foi levantado explicitamente ao usuário como ponto em aberto; as decisões já tomadas estão registradas com sua origem (anexo, extração de pixel de tela aprovada, ou valor gerado e aprovado pelo usuário) — ver *Decisões confirmadas* e *Pontos em aberto* ao final deste documento.

Este sistema é **somente dark mode**: o Guidelines.md define apenas uma paleta escura e instrui explicitamente "Visual escuro (dark mode)... Evite cores extras além das definidas". Não existe tema claro nos anexos (ver Pontos em aberto).

Além de tokens e componentes, este sistema inclui uma seção de **[Princípios de Design](../principios-de-design.md)** — diretrizes de uso (hierarquia, tipografia, formulários, acessibilidade, feedback, tokens/nomenclatura, redução de sobrecarga cognitiva) que orientam *como* combinar o que está documentado aqui. É um complemento, não uma fonte de tokens/cores/componentes — essa fonte continua sendo exclusivamente Guidelines.md + Untitled UI + a tela aprovada.

## Fundamentos de conteúdo

- **Produto**: um app de acompanhamento/avaliação de filmes e séries (as telas aprovadas em *Watchwise Initial Pages.pdf* mostram listas de títulos, status "Concluído"/"Dropped", notas por estrelas e distribuição por gênero).
- **Tom**: interface direta, orientada a dados pessoais do usuário (contadores, progresso, avaliações). Sem exemplos de microcópia extensos nos anexos além dos rótulos de UI padrão do Untitled UI — não crie voz/tom além do que os componentes já trazem.
- **Idioma da interface**: todo texto dentro do produto (rótulos, conteúdo de exemplo, previews dos componentes) está em **inglês** — decisão explícita do usuário, atualizada em relação à versão anterior deste documento (que mantinha português, seguindo a tela aprovada em *Watchwise Initial Pages.pdf*). Os previews de todos os componentes deste sistema (`preview.html`, incluindo `lang="en"`) já refletem essa decisão. Esta documentação (README, notas de componente, Princípios de Design) permanece em português, por ser dirigida a você, não ao usuário final do produto.

## Fundamentos visuais

### Cor

Use **exatamente** os tokens de `tokens.json` — nenhuma cor fora desta lista: `text`, `surface`, `surface-secondary`, `primary`, `secondary`, `tertiary`, `accent`, `border` (paleta original do Guidelines.md) + `error`, `error-soft`, `success`, `success-soft`, `warning`, `warning-soft` (cores semânticas de estado, adicionadas com aprovação explícita do usuário — ver *Decisões confirmadas*). Pares de contraste texto/fundo verificados (WCAG 2, mínimo 4.5:1 para texto, 3:1 para elementos não textuais):

| Par | Contraste | Resultado |
|---|---|---|
| `text` (#F2F7FA) sobre `surface` (#181818) | ≈ 16.7:1 | Passa (texto e não-texto) |
| `text` (#F2F7FA) sobre `surface-secondary` (#1C1C1C) | ≈ 15.9:1 | Passa |
| `text` (#F2F7FA) sobre `primary` (#2563EB) | ≈ 4.6:1 | Passa (texto) |
| `text` (#F2F7FA) sobre `secondary` (#30343B) | ≈ 12.6:1 | Passa |
| `accent` (#F59E0B) sobre `surface` (#181818) | ≈ 8.4:1 | Passa |
| `error` (#F87171) sobre `surface` / `surface-secondary` / `error-soft` | 6.4:1 / 6.2:1 / 5.8:1 | Passa em todos |
| `success` (#22C55E) sobre `surface` / `success-soft` | 7.8:1 / 6.5:1 | Passa |
| `warning` (#EAB308) sobre `surface` / `warning-soft` | 9.3:1 / 7.6:1 | Passa |

O par `text` sobre `primary` fica próximo do limite (4.5:1) — evite reduzir o peso da fonte abaixo de `text-sm` (14px/400) em botões primários; prefira `text-sm`/600 ou superior, como já é o padrão do Untitled UI para labels de botão.

Untitled UI usa roxo (`Brand` scale) como cor primária padrão do kit — **este sistema substitui o roxo por `primary` (#2563EB) em todo componente** que no PDF original aparece na cor de marca (botões primários, links, itens selecionados, foco). Componentes cuja variante já é neutra (cinza) usam `secondary`/`tertiary`/`border` conforme o token mais próximo do valor mostrado no PDF.

### Tipografia

Fonte única: **Inter** (`type.families.sans`), carregada como Google Font — nenhum arquivo de fonte veio anexado, então não há binário para hospedar como asset; use `@import`/`<link>` do Google Fonts com os pesos 400, 500, 600 e 700 (pesos usados nos estilos de `tokens.json`).

Duas escalas, conforme Typography.pdf: **Display** (títulos, `display-2xl` a `display-xs`) e **Text** (corpo/UI, `text-xl` a `text-xs`). Não crie tamanhos fora dessa escala. Para UI densa (labels, botões, células de tabela) use `text-sm`; para corpo de texto, `text-md`.

> Nota de legibilidade (ver *Princípios de Design*): evite CAIXA ALTA em textos correntes/rótulos novos — reduz a velocidade de leitura. As telas já aprovadas de *Watchwise Initial Pages.pdf* que usam caixa alta (ex. alguns badges) permanecem como estão, por não modificarmos protótipos existentes; novos usos devem preferir sentence case.

### Spacing e layout

Escala de espaçamento em `tokens.json` (`space-1` a `space-64`, de 4px a 256px), extraída de Spacing.pdf. Não crie valores fora da escala.

Regra obrigatória de layout do Guidelines.md, aplicada a todas as telas via os tokens `content-width` (70%) e `content-margin` (15% de cada lado):

```
|←15%→|←――――――――― 70% ―――――――――→|←15%→|
        conteúdo principal centralizado
```

Em telas maiores, o conteúdo **não** deve esticar até as bordas — mantenha a proporção 70/15/15 mesmo acima dos containers `container-xl` (1280px) do Untitled UI.

### Cantos e elevação

O Guidelines.md pede "botões com cantos levemente arredondados" (qualitativo) e o Effect Styles.pdf nomeia uma escala de sombras (`shadow-xs` a `shadow-3xl`) sem expor os valores exatos de offset/blur/cor nas páginas anexadas. Nenhum dos dois tinha valor numérico nos anexos — com aprovação explícita do usuário, `tokens.json` inclui uma escala **gerada** de cada um (`radius-none…full`, `shadow-xs…3xl`, ambas marcadas com `note` explicando a origem). Use `radius-md` (8px) como padrão de botões/inputs/cards — é a aplicação do "levemente arredondado" do Guidelines.md — e `radius-full` para pills/avatares/toggles. Sombras são sutis por padrão (pensadas para o fundo escuro `surface`); prefira `shadow-md`/`shadow-lg` em painéis flutuantes (Dropdown Menu, Select, Tooltip) e reserve `border` para separar superfícies estáticas.

### Gráficos (Charts)

Duas paletas de gráfico, para dois usos diferentes:

- **`chart-1` a `chart-6`** — escala monocromática derivada do padrão documentado em Charts.pdf (séries categóricas do Untitled UI em tons da cor de marca, do mais escuro ao mais claro), aplicada aos stops exatos do azul (Colors.pdf, Blue-900 → Blue-200). Use como padrão para gráficos de série única ou onde não há uma paleta aprovada mais específica.
- **`chartb-1` a `chartb-6`** — paleta **qualitativa** (uma cor por categoria), extraída por amostragem de pixel exata do gráfico "Gêneros Mais Assistidos" em *Watchwise Initial Pages.pdf*: Drama `#2563EB` (=`primary`), Thriller `#10B981`, Sci-Fi `#8B5CF6`, Comedy `#F59E0B` (=`accent`), Action `#EF4444`, Crime `#F97316`. Use exatamente esta sequência ao reproduzir esse padrão de distribuição por categoria (gênero, ou qualquer breakdown categórico semelhante) — é o que já está aprovado e em produção na tela de referência. Thriller e Sci-Fi usam tons (Emerald/Violet) que não estão entre as escalas nomeadas em Colors.pdf (que documenta Green e Purple) — mantidos exatamente como capturados da tela aprovada, sem substituição.

## Iconografia

Use exclusivamente os ícones do conjunto outline do Untitled UI (Icons.pdf) — não crie ícones novos. O conjunto é de linha (stroke), traço uniforme, grade quadrada (24px como tamanho de referência mais comum nos componentes). Ícones sociais/de marca (redes sociais, bandeiras, meios de pagamento, navegadores) também constam no mesmo arquivo, para uso em contextos específicos (ex. botões de login social).

Este README não cataloga cada glifo individualmente (o PDF não nomeia os ícones) — ao implementar uma tela, escolha o ícone do conjunto outline do Untitled UI mais próximo semanticamente do necessário; nunca desenhe um novo.

## Componentes

Cada componente documentado abaixo segue **exatamente** as variantes, estados e composições mostrados nos PDFs correspondentes do Untitled UI, com a cor de marca (roxo) substituída pelos tokens deste sistema. Onde o PDF mostra uma variante em cinza/neutro, ela permanece mapeada a `secondary`/`tertiary`/`border`. Consulte o índice gerado abaixo (`## Index`) e o `README.md` de cada componente para a lista completa de variantes.

Componentes com aplicabilidade condicionada ao escopo do produto (marcados abaixo) foram documentados porque estão nos PDFs, mas podem não ser necessários no Watchwise — confirmar no momento de implementar a tela correspondente:

- **Footer**: os PDFs mostram um rodapé de site institucional/marketing (colunas de links, newsletter, CTA). Se o Watchwise for só um app logado, este componente provavelmente não se aplica — pedir confirmação.
- **Header/Navigation**: os PDFs (Header.pdf) documentam uma barra de navegação de marketing com mega-menu. A barra superior do app já aparece pronta e aprovada em *Watchwise Initial Pages.pdf* (logo, busca, ações, avatar) — use a referência aprovada para o header do produto e o Header.pdf apenas como fonte dos átomos de item de menu (estados default/hover/selecionado).
- **Messaging**: chat/mensageria (bolhas, composer) documentado no kit; inclua somente se o produto tiver uma feature de conversa/comentários — não visto nas páginas aprovadas do Watchwise.

Os PDFs de "páginas completas" do Untitled UI (404, About, Blog Posts, Blogs, Dashboards, Informational pages, Login, Settings pages, Getting Started) foram tratados apenas como **contexto/referência** de composição — por definição de escopo desta entrega — e não foram desmembrados em componentes formais deste sistema.

## Decisões confirmadas pelo usuário

Pontos que tinham sido levantados como lacuna dos anexos e já foram resolvidos por decisão explícita do usuário (não são mais bloqueantes):

1. **Fundo principal (`surface`)**: dos dois valores conflitantes do Guidelines.md, `#181818` foi confirmado como definitivo (`#191716` descartado).
2. **Cores semânticas (erro/sucesso/aviso)**: não existiam no Guidelines.md; adicionadas usando os stops exatos das escalas Red/Green/Yellow do Untitled UI (Colors.pdf) — `error`/`error-soft`, `success`/`success-soft`, `warning`/`warning-soft`. Exceção aprovada à regra "evite cores extras" do Guidelines.md, restrita a estes estados funcionais (não usar para decoração).
3. **Raio de borda e sombras**: não havia valores numéricos nos anexos; geradas as escalas `radius-none…full` e `shadow-xs…3xl` em `tokens.json`, marcadas com `note` explicando que foram geradas (não extraídas).
4. **Paleta de gráfico categórica**: a paleta multicolorida vista no gráfico "Gêneros Mais Assistidos" da tela aprovada foi capturada por amostragem de pixel exata e preservada como `chartb-1`…`chartb-6` (ver seção Gráficos), ao lado da escala monocromática derivada `chart-1`…`chart-6` — nenhuma das duas substitui a outra, use a que fizer sentido para o gráfico em questão.
5. **Footer, Header de marketing e Messaging**: usuário confirmou que a aplicabilidade real ao escopo do Watchwise permanece por confirmar no momento da implementação de cada tela — a documentação abaixo fica disponível para quando/se forem necessários.

## Pontos em aberto — ainda pedem confirmação

1. **Tema claro**: não existe nos anexos. Se o produto precisar de light mode no futuro, será necessário um novo levantamento de cores (fora do escopo desta entrega, que é "preservar dark mode").
2. **Ícones individuais**: o conjunto está definido (outline, Untitled UI), mas nenhum glifo específico foi nomeado/mapeado por uso — escolha no momento da implementação, dentro do conjunto.

## Protótipos existentes

Este sistema não modifica nenhum protótipo existente do Watchwise; é uma documentação de tokens e componentes para uso em implementações futuras.
