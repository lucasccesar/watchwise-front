# Princípios de Design

Este documento é um complemento de **processo e heurísticas** ao sistema — não substitui o Guidelines.md nem o UI Kit Untitled UI, que continuam sendo a fonte de verdade para cores, tipografia, spacing e componentes exatos (ver `README.md`). Aqui ficam os princípios de como usar esse material: hierarquia, leitura, formulários, estados, dados e nomenclatura. Onde um princípio tensiona com algo já aprovado nos anexos originais, isso está marcado explicitamente — nada aqui reabre ou substitui uma decisão já tomada em `README.md`.

## Inspiração — Zander Whitehurst

Os dois blocos abaixo resumem princípios e práticas recorrentes que Zander Whitehurst promove publicamente (LinkedIn/Instagram/X) sobre UX/UI e design systems. Trazidos como referência de processo, não como fonte de tokens.

**Princípios centrais:**

- **Hierarquia visual intencional** — evitar layouts onde "tudo parece igual"; usar métricas-hero (destaque) e espaçamento para guiar a atenção, não caixas e bordas.
- **Espaço em branco como estrutura** — agrupar conteúdo com whitespace antes de adicionar superfícies/containers; bordas em excesso transformam layouts em "planilhas".
- **Tipografia legível e acessível** — tamanhos mínimos práticos (ex.: 12/13/15px para microtextos/corpo), line-height entre 140–160%, contraste adequado e fontes maiores para acessibilidade.
- **Sistema de 8pt para espaçamento** — múltiplos de 8 (e baseline de 4pt verticalmente) para consistência e alinhamento em grids e componentes.
- **Design de formulários centrado no usuário** — labels flutuantes que não desaparecem, alvos de toque generosos, cantos arredondados, continuidade espacial entre telas, animações de estado ativo, CTAs que evoluem conforme o progresso.
- **Tokens de design e naming consistente** — tokens como "API visual"; nomear componentes com base + propósito + tamanho + estado (ex. `Button/Primary/Large/Hover`) para escalabilidade.
- **Dados com contexto, não só números** — transformar números brutos em insights acionáveis; a UI deve mostrar o que importa e orientar a próxima ação.

**Boas práticas recorrentes:**

- Reduzir sobrecarga cognitiva: decisões óbvias, menos elementos decorativos, cor com intenção, estrutura sutil via espaçamento.
- Evitar modais de "Tem certeza?" e padrões que interrompem o fluxo; preferir prevenção de erros e feedback contínuo.
- Conteúdo antes da decoração: pensar a apresentação da informação antes de adicionar superfícies; hierarquia feita com espaço, não com caixas.
- Microinterações e feedback: estados ativos e animações que confirmam ações em tempo real, aumentando confiança.

As seções a seguir aplicam e detalham esses princípios (e outras práticas de mercado equivalentes) por tema, já relacionadas aos tokens e componentes deste sistema.

## Hierarquia visual e conteúdo

- Resolva hierarquia com **tamanho, peso, contraste e posição** — não com caixas e bordas. Defina níveis claros de importância (hero, seção, item, meta) e mantenha variações consistentes de tamanho/peso entre eles (ver mapeamento em Tipografia, abaixo).
- Use proximidade e espaçamento para criar grupos e separar seções, com os tokens já existentes neste sistema: `space-2` (8px) dentro de um grupo, `space-6` (24px) entre grupos relacionados, `space-12` (48px) entre blocos/seções principais. Evite telas onde tudo tem o mesmo espaçamento e vira um bloco único.
- Comece sempre pelo **conteúdo**: decida o que precisa ser visto e entendido antes de escolher superfícies, cards e sombras. Se um card (`surface-secondary` + `radius-md`) não melhora a compreensão, é ruído — prefira espaçamento a mais uma superfície a mais.

## Tipografia legível e sistemática

A escala tipográfica **não é nova** — é a mesma de `tokens.json` (Display/Text, extraída de Typography.pdf; Guidelines.md proíbe criar estilos fora dela). O que este princípio adiciona é o mapeamento de qual nível usar em cada contexto:

| Contexto | Nível |
|---|---|
| Título de página | `display-md` / `display-sm` |
| Título de seção | `display-xs` |
| Título de card | `text-lg` (600) |
| Corpo de texto | `text-md` |
| UI densa (labels, botões, células) | `text-sm` |
| Meta, legendas, timestamps | `text-xs` |

Line-height já está dentro da faixa recomendada (140–160%) em toda a escala de texto: `text-md` 24/16=150%, `text-sm` 20/14≈143%, `text-lg` 28/18≈156%, `text-xs` 18/12=150% — nenhum ajuste necessário. Para blocos de corpo de texto, limite a largura da coluna a ~50–75 caracteres (≈65ch) para conforto de leitura.

**Evite all-caps** em textos longos ou labels importantes; prefira sentence case (só a primeira palavra com inicial maiúscula). *Tensão com o já aprovado*: as telas de referência em *Watchwise Initial Pages.pdf* usam badges em caixa alta (`CONCLUÍDO`, `DROPPED`) — como esse protótipo já está aprovado e este sistema não o modifica, mantenha esse padrão onde ele já existe; aplique sentence case em telas e badges novos daqui em diante (o componente `Badge` deste sistema já usa sentence case nos exemplos, ex. "Concluído", "Dropado").

## Espaçamento, grids e layout

A escala de `spacing` já segue base 4px com múltiplos de 8 nos valores mais usados (`space-2`=8, `space-4`=16, `space-6`=24, `space-8`=32…) — compatível com a regra "8pt para espaçamento, 4pt para ajuste fino". Nunca use um valor fora da escala (nada de 11, 17 ou 23px "no olho").

Documente e reutilize os três níveis de espaçamento já mapeados acima (dentro de componente / entre componentes relacionados / entre seções) em qualquer tela nova, para manter ritmo visual e alinhamento ao grid do Untitled UI (`container-sm/md/lg/xl`, ver README).

Prefira **coluna única** para conteúdo e formulários — múltiplas colunas quebram o fluxo de leitura vertical e aumentam o esforço de relacionar campos. Em telas de dados (dashboards), alinhe cards a um grid com largura mínima/máxima definida, para evitar um "mosaico aleatório".

## Formulários centrados no usuário

- Peça só o que for necessário agora; use etapas ou perfis progressivos para coletar dados adicionais depois.
- **Labels sempre visíveis**, acima do campo (mobile/formulários curtos) ou à esquerda (desktop, formulários longos) — nunca use `placeholder` como substituto de label (já é a regra do componente `Inputs` deste sistema).
- Use *smart defaults* (preencher o óbvio) para encurtar o caminho até a conclusão.
- Agrupe campos relacionados em seções lógicas com cabeçalho (ex. "Dados pessoais", "Endereço", "Pagamento") e evite campos lado a lado, exceto quando o usuário já espera isso na mesma linha (data, hora).
- Valide em tempo real ou ao perder foco (não só no submit), com mensagens específicas ao lado/abaixo do campo — já é o padrão do estado `Error` do componente `Inputs` — em vez de banners genéricos no topo da página.
- Botões de formulário iniciam **ações** (Salvar, Enviar), não navegação; alinhe o botão de envio com os labels para minimizar movimento ocular.
- Use máscaras e formatação em tempo real para prevenir erro antes de validar (ex. campos de data, telefone, nota 0–10).

## Botões: hierarquia, tamanho e estados

- Um único botão `Primary` por tela/fluxo visível — já documentado no componente `Buttons`.
- Tamanhos mínimos de alvo: **mobile ≥ 44×44px**, **desktop 32–48px de altura** conforme o tamanho (sm/md/lg/xl), com padding interno de 12–24px horizontal para não parecer apertado (ver também *Tamanhos de alvo*, abaixo).
- Estados (default/hover/focus/pressed/disabled) não podem depender só de cor — reforce com borda, sombra (`shadow-xs`/`shadow-sm`) ou variação de fundo, para quem não percebe a diferença de matiz.
- Contraste acessível: texto sobre `primary` ≥ 4.5:1 (já verificado em README — 4.6:1) e o mesmo vale para variantes destrutivas (`error` sobre `surface` — 6.4:1, ver README).
- Se a área rola, o botão primário fica no topo do grupo de ações; se fixo no rodapé, fica no fim; ações destrutivas ficam visualmente afastadas das funcionais (nunca adjacentes sem espaço, ver `space-6` como separação mínima).
- Microcopy orientado à ação: "Salvar alterações", "Continuar para pagamento" — nunca "Clique aqui".
- Em fluxos multi-etapa, o rótulo do CTA evolui com o progresso (ex. "Revisar pedido" → "Pagar").

## Tamanhos de alvo e interação

- Toque: mínimo **48×48px** (ou 44×44px como piso aceitável); mouse/desktop: ~44–46×46px. Distância mínima de **8–16px** entre alvos adjacentes, para evitar cliques/toques acidentais.
- Todo elemento clicável precisa "parecer clicável": borda, preenchimento, cursor e um estado de hover/focus visível — nunca uma área clicável invisível.
- Em telas mobile ou densas, mantenha padding interno generoso (10–15px) dentro de inputs e botões — os previews de `Inputs` e `Buttons` deste sistema já usam 10–12px, dentro da faixa recomendada.

## Microinterações, estados e feedback

- Todo componente interativo tem estados bem definidos: default, hover, focus, pressed/active, disabled e, quando aplicável, loading — já é a estrutura usada em cada `README.md` de componente deste sistema.
- Feedback de erro/sucesso/progresso é imediato, específico e **próximo do elemento afetado** (ex. hint text do `Inputs`), com microcopy orientada à ação ("Preencha o CPF com 11 dígitos") em vez de mensagens genéricas.
- **Evite modais "Tem certeza?"** para ações comuns; priorize prevenção de erro (undo, estados reversíveis, confirmação inline) e feedback contínuo em vez de interromper o fluxo com diálogos bloqueantes. Reserve confirmação bloqueante para ações realmente destrutivas e irreversíveis (ex. excluir conta).
- Estados de carregamento devem se comunicar em texto além de visual (ex. "Salvando…"), não só um spinner.

## Acessibilidade como padrão

- HTML semântico antes de ARIA; todo campo tem label visível e associada programaticamente (`for`/`id`).
- Contraste adequado entre texto e fundo — já verificado para os pares principais deste sistema (ver README); nunca use cor sozinha para indicar estado (erro/sucesso/aviso já combinam cor + ícone/posição neste sistema, ver `Badge` e `Inputs`).
- Navegação e formulários totalmente operáveis via teclado, com ordem de foco lógica e foco **visível** (nunca remover o outline padrão sem substituir por um indicador com contraste ≥3:1).
- Campos obrigatórios marcados com texto claro ("Obrigatório"/"Opcional"), nunca só com cor ou um asterisco discreto.

## Dados, dashboards e contexto

- Destaque 1–3 métricas-hero que definem o estado atual, com contexto mínimo ("vs. semana passada", "meta atingida") — não uma tabela infinita sem interpretação. Reduza ênfase visual nas métricas secundárias.
- Números viram insight: "+12% vs. meta — acima do esperado" comunica mais que o número isolado.
- Títulos de card/seção descrevem o valor ("Gêneros mais assistidos", "Desde sempre"), não o tipo de dado genérico ("Tabela 1") — já é o padrão usado nas telas aprovadas do Watchwise.
- Sempre que houver dados, ofereça a próxima ação ao lado (filtrar, aprofundar, exportar) — evite telas que só exibem números sem indicar o que fazer a seguir.

## Tokens, nomenclatura e arquitetura

Este sistema já segue a ideia central de "nomear por propósito, não por aparência": os tokens de cor se chamam `text`, `surface`, `primary`, `error`, `success` — nunca `white`, `dark-blue` ou `red-400` diretamente no componente, mesmo quando o valor vem de um stop nomeado do Untitled UI (Colors.pdf). Isso equivale, na prática, a uma arquitetura de **3 camadas**:

1. **Primitivos** — os stops brutos do Untitled UI (Blue-600 `#2563EB`, Red-400 `#F87171`, etc., documentados em Colors.pdf). Não usados diretamente em componentes.
2. **Semânticos** (`tokens.json` deste sistema) — o que cada cor/espaçamento/raio *faz*: `primary`, `error-soft`, `radius-md`, `chart-1`. É a camada que os componentes consomem.
3. **Componente** — overrides específicos de um componente, quando necessário (nenhum neste sistema ainda; documentar aqui se surgir, ex. um token só do `Table`).

Para nomear componentes, variantes, estados e camadas de código/Figma que implementem este sistema, use o padrão **categoria + propósito + tamanho + estado** (ex. `Button/Primary/Large/Hover`, `Text/Body/Medium`) — os nomes de arquivo `components/<Componente>/` deste sistema já seguem a convenção do lado "categoria"; ao codificar variantes/estados dentro de um componente, mantenha essa mesma lógica em vez de nomes "poéticos" ou ambíguos. Documente cada token novo com uma nota de uso (já é exigido neste sistema) e trate renomear um token existente como *breaking change* — avise quem consome antes de renomear.

## Redução de sobrecarga cognitiva

- Prefira telas com uma coluna, poucas opções simultâneas e decisões óbvias.
- Evite: placeholder como instrução principal (some ao digitar), texto em caixa alta fora do já aprovado, labels ambíguos, carrossel de mensagens de erro — tudo isso força o usuário a relembrar contexto.
- Cor com intenção: os únicos tons funcionais deste sistema são `primary`, `accent`, `error`, `success`, `warning` — evite usar `chartb-1…6` (a paleta multicolorida de gráfico) fora do contexto de gráficos, para não virar "arco-íris sem semântica" na UI de produto.

## Navegação e fluxo

- Evite modais de confirmação para ações reversíveis (ver Microinterações, acima).
- Em fluxos de múltiplas etapas, mantenha continuidade espacial entre telas (elementos que persistem não devem "pular" de posição) e CTAs que evoluem com o progresso.
