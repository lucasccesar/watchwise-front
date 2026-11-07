# Auditoria do frontend Watchwise

**Data:** 2 de novembro de 2026<br>
**Escopo:** otimização de carregamento, consistência visual, aderência ao design system, comparação com protótipos e reutilização entre telas.

## Acompanhamento da revisão

- **CSRF:** a atribuição que apagava `XSRF-TOKEN` não está mais presente em `src/main.ts` nem no `HEAD` atual; não havia alteração adicional necessária nesta cópia.
- **Adiados conforme pedido:** `/explore`, as rotas de Games e a orientação de idioma no README do design system não foram alterados.
- **Calendar e Settings:** containers desktop alinhados a `content-width`; escala de títulos, tipografia, cores, superfícies e raios ajustados aos tokens. Calendar usa também a escala de título de tablet.
- **CSS inicial:** estilos de Home e Trending agora pertencem aos componentes; Picks carrega o CSS compartilhado nas páginas lazy.
- **Diálogos:** criada uma moldura compartilhada para overlay/superfície e aplicada aos diálogos de Home, Games, episódio, Picks, Settings e às três folhas de filtro do Profile. Overlays especiais fora desses fluxos ainda mantêm a implementação própria.
- **Profile:** as folhas de filtro repetidas foram padronizadas; as onze seções e seu estado continuam no `ProfileComponent`, então a divisão maior por seção continua pendente.
- **Progresso:** `ProgressComponent` é uma página autônoma sem rota/import; `/progress` carrega a aba `progress` do `ProfileComponent`. A primeira é código sem consumidor, enquanto a segunda é a implementação visível pela rota. Nenhuma das duas foi escolhida/removida nesta revisão.

## Como foi feita

Revisei as rotas, configurações Angular, componentes, templates e CSS em `src/`, os requisitos locais, o design system e os protótipos locais. O inventário encontrou 311 arquivos `.dc.html` nas referências de desktop, notebook, tablet e mobile. A comparação visual detalhada abaixo usa telas pareadas de Calendar e Settings; também confrontei o roteamento de Games e padrões compartilhados no restante do código.

Esta é uma análise estática de código e estilos. Não executei a aplicação com sessão real nem a suíte de testes; portanto, os pontos de fidelidade visual são comparações de estrutura e valores declarados, não uma medição por screenshot de todas as 311 exportações.

## Achados prioritários

### P1 — O bootstrap apaga o cookie CSRF da API

`src/main.ts:5` define `XSRF-TOKEN` como expirado com `Path=/api/v1` antes de iniciar o Angular. Isso apaga o cookie CSRF que a API disponibiliza nesse caminho e pode fazer operações protegidas falharem. A linha está em uma alteração local não commitada.

Isso contradiz [AGENTS.md:86-87](../AGENTS.md#L86-L87), que manda preservar CSRF e resolver a incompatibilidade do caminho junto ao repositório da API. Remova a exclusão do bootstrap e coordene o caminho do cookie e sua limpeza com a API; mantenha a configuração `XSRF-TOKEN`/`X-XSRF-TOKEN` do `HttpClient`.

### P1 — `/explore` não existe e a configuração impede indexação

`src/app/app.routes.ts:520` registra que `/explore` continua sem rota; a rota curinga termina em Not Found. Além disso, `src/index.html:12` aplica `noindex, nofollow` ao documento inteiro. `angular.json:56-59` configura apenas a entrada de browser, sem configuração de SSR/pré-renderização.

O estado atual não atende à página pública e rastreável descrita em [AGENTS.md:76](../AGENTS.md#L76). Crie a rota pública com conteúdo real e pré-renderização, e faça o controle de robots por rota para manter `noindex` nas páginas autenticadas.

### P1 — Todas as rotas de Games redirecionam para Início

Em `src/app/app.routes.ts:321-338`, `/games`, `/games/ranking`, `/games/day/:challengeDate` e `/games/play/:gameType` redirecionam para `/home`. Os componentes `GamesComponent`, `GameRankingComponent` e `GamePlayComponent` existem, assim como as referências desktop e responsivas, por exemplo `watchwise-prototype/telas/project/Games.dc.html` e `watchwise-prototype/mobile/project/Games-Mobile.dc.html`.

As telas implementadas ficam inalcançáveis pelo router. Conecte as rotas aos componentes existentes e preserve a proteção de sessão definida para a área autenticada.

## Consistência com protótipo e design system

### P2 — Calendar e Settings usam conteúdo mais largo que o padrão aprovado

O design system define `content-width: 70%` e margens laterais simétricas de 15% em [design-system/tokens.json:91-92](../design-system/tokens.json#L91-L92). Os protótipos desktop seguem essa regra: Calendar em `watchwise-prototype/telas/project/Calendar.dc.html:66,79` e Settings em `watchwise-prototype/telas/project/Settings.dc.html:61,66`.

No app, Calendar usa `width: min(1334px, calc(100% - 64px))` em `src/app/features/calendar/pages/calendar/calendar.component.css:8`. A 1280 px isso dá 1216 px (95% da tela; 32 px de margem por lado), contra 896 px (70%) pela referência. Settings usa 1120 px (87,5%) a 1280 px por `src/app/features/settings/pages/settings/settings.component.css:4,151-153`, contra os mesmos 896 px da regra aprovada. O conteúdo resultante fica sensivelmente mais largo e altera a composição dos grids em desktop.

Use os tokens `content-width` e `content-margin` para os containers principais e mantenha os ajustes mobile conforme as referências específicas de cada breakpoint.

### P2 — Calendar e Settings saem da escala tipográfica e cromática

O H1 do Calendar em `src/app/features/calendar/pages/calendar/calendar.component.css:4` usa `#fff`, peso 700, `line-height: 1.12` e `letter-spacing: -.035em`. O protótipo `Calendar.dc.html:62` e o token `display-2xl` definem `#F2F7FA`, 72/90 px, peso 600 e `-.02em` (`design-system/tokens.json:47`). A diferença é direta em cor, peso e espaçamento de linha.

Settings também cria valores sem token: H1 de 38 px/peso 740 em `settings.component.css:6`; campos com 13 px, peso 450, borda `#3b3f47` e superfície `#191b20` em `:49-50`; várias legendas usam 10–11 px em `:41,53,87`. A escala documentada define tamanhos de texto de 12 a 20 px e pesos de 400, 500, 600 e 700 (`design-system/tokens.json:47-63`).

Mapeie cor, tipografia, espaçamento e raio para os tokens semânticos. Onde uma exceção visual for necessária, registre-a no design system antes de repeti-la em outros componentes.

### P2 — Direção de idioma contraditória no README visual

`design-system/README.md:19` ainda manda manter a interface em inglês, mas a decisão mais recente em [AGENTS.md:16](../AGENTS.md#L16) e [AGENTS.md:107](../AGENTS.md#L107) estabelece `pt-BR` como idioma inicial e pede para não copiar a copy inglesa dos protótipos. O catálogo do app já seleciona `messageCatalog['pt-BR']`, então o risco principal está em mudanças futuras guiadas pelo README antigo.

Atualize essa orientação no README do design system quando o arquivo de referência puder ser alterado; preserve strings localizáveis e `pt-BR` como padrão.

## Otimização e reutilização

### P2 — CSS exclusivo de páginas entra no stylesheet global inicial

`src/styles.css:1-6` importa globalmente CSS de autenticação, layout autenticado, Home, busca, Trending e Picks. Home e Trending não declaram `styleUrl` em seus componentes, então seus estilos são incluídos no CSS global configurado em `angular.json:56-68`, mesmo quando a rota carregada não precisa dessas telas.

Os seis imports somam **104.228 bytes em arquivos CSS antes da minificação**. Só Home (53.481 bytes), Trending (16.679) e os estilos comuns de Picks (2.036) representam **72.196 bytes de estilos específicos de área** no conjunto global. Isso aumenta o CSS inicial e permite que seletores dessas áreas vazem para outras telas.

Mova o CSS de Home e Trending para os componentes correspondentes e carregue os estilos compartilhados de Picks dentro da feature lazy. Mantenha globais apenas tokens, reset e estilos realmente comuns ao app.

### P2 — Profile concentra várias telas em um único componente muito grande

`ProfileComponent` mantém onze seções em `profile.component.ts:21,37-50`; seu HTML tem 884 linhas, seu TypeScript 1.475 e `profile.component.css` tem 6.393 linhas/132.888 bytes. Home também reúne 828 linhas de template, 1.241 de TypeScript e 2.626 de CSS. O CSS do Profile só é necessário após abrir a feature lazy, então o problema principal aqui é custo de manutenção e de evolução visual, não o primeiro carregamento da landing.

Separe as seções do perfil em componentes próximos ao domínio e extraia padrões reais (cabeçalho, estados, cartões e grids) para `shared` ou para a própria feature. Isso reduz a chance de uma mudança em uma aba alterar outra sem intenção e facilita conferir cada vista contra sua referência.

### P2 — Diálogos repetem estrutura e estilos entre features

Há templates com diálogos em 16 arquivos HTML e regras próprias de modal/dialog em 11 folhas CSS. Exemplos: `movie.component.html`/`.css`, `episode.component.html`/`.css`, `list-detail.component.html`/`.css`, `settings.component.html`/`.css`, `pick-create.component.html`/`.css` e `share-preview.component.html`/`.css`. Cada área declara combinações próprias de backdrop, superfície, borda, raio, sombra, padding e botões. Existe uma diretiva compartilhada de foco, mas não uma base visual reutilizável.

Extraia uma moldura compartilhada de diálogo para atributos recorrentes de apresentação e interação; deixe cabeçalhos, campos e ações específicos dentro de cada feature. Assim, ajustes de overlay, foco e espaçamento não precisam ser copiados em várias telas.

### P3 — Há uma implementação de Progresso sem consumidor

`src/app/features/progress/pages/progress/progress.component.ts:31` define uma página autônoma de Progresso, mas não há import ou rota para `ProgressComponent`. A rota `/progress` em `src/app/app.routes.ts:231-243` carrega `ProfileComponent` na seção `progress`, que já implementa esse domínio (`profile.component.ts:21,37-50`). A referência desktop também mantém `Progress-u3kp.dc.html`.

Escolha uma implementação canônica: reutilize `ProgressComponent` como conteúdo da seção do perfil, ou remova a implementação sem consumidor se a tela atual for a fonte aprovada. Isso evita corrigir duas versões da mesma experiência.

## Resumo de triagem

1. Remover a exclusão do cookie CSRF do bootstrap e alinhar o caminho com a API.
2. Implementar `/explore` com pré-renderização e metadados por rota.
3. Conectar as rotas de Games aos componentes já existentes.
4. Corrigir as larguras de Calendar/Settings e trazer tipografia e cores de volta aos tokens.
5. Tirar CSS de página do stylesheet global; depois reduzir a concentração no Profile e padronizar a moldura de diálogos.

O relatório descreve o working tree encontrado, incluindo a alteração local não commitada em `src/main.ts`. Nenhum código do app, protótipo ou design system foi alterado nesta auditoria.
