# Etapa 4B7 · Consolidação das baselines parciais

As quatro baselines reúnem **16 combinações, 480 amostras válidas, 48 aquecimentos descartados e zero tentativas inválidas**. Elas cobrem recortes de **10 das 39 telas elegíveis** e **9 dos 25 cenários adicionais**. A referência é cada roteiro no ambiente e modo em que foi medido.

A [matriz CSV](04b7-matriz-cobertura.csv) contém 80 registros: 16 combinações, 39 telas e 25 cenários adicionais. As referências por ID ligam as três visões.

## Auditoria dos dados brutos

Recalculei mediana, média, mínimo, máximo, p75, p90, p95, IQR, DP e CV da interface, além das contagens HTTP e das medianas de duração, TTFB e bytes publicadas. A comparação usou tolerância de 0,011 na unidade publicada para arredondamento. Os percentis usam interpolação linear no índice (n − 1) × p, em ordem crescente. O DP é amostral; p95 com 30 observações é exploratório. Valores atípicos válidos permanecem no conjunto.

| Etapa | Combinações | Válidas | Aquec. | Inválidas | HTTP 200 | Operações do guard | Fontes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4A | 3 | 90 | 9 | 0 | 600 | 265 | relatório [acervo local (04a-baseline-parcial.md)] · bruto [acervo local (raw.json)] · estatísticas [acervo local (statistics.json)] |
| 4B3 | 3 | 90 | 9 | 0 | 180 | 133 | relatório [acervo local (04b3-baseline-social-parcial.md)] · bruto [acervo local (retry-followers-pages_notifications-pages.json)] · estatísticas [acervo local (statistics.json)] |
| 4B6-A | 4 | 120 | 12 | 0 | 180 | 203 | relatório [acervo local (04b6a-baseline-seguindo-feed.md)] · bruto [acervo local (retry-following-pages_feed-pages.json)] · estatísticas [acervo local (statistics.json)] |
| 4B6-B | 6 | 180 | 18 | 0 | 690 | 305 | relatório [acervo local (04b6b-baseline-picks-templates.md)] · bruto [acervo local (retry-my-pick-detail_explore-picks_template-detail.json)] · estatísticas [acervo local (statistics.json)] |

A 4A inclui no total HTTP a preparação do roteiro interno de Templates. As três rodadas v4 excluem as preparações e pré-checagens desse total. As contagens de guard incluem login e preparações, além das verificações HTTP prévias quando executadas.

Não houve divergência nos campos auditados entre brutos, estatísticas e tabelas dos relatórios. Os arquivos históricos foram preservados.

## Ambientes e estado de referência

| Etapa | Clone e dataset | Frontend → API | Sessões / limitador iniciais | Snapshots | CPU instantânea / RAM livre |
| --- | --- | --- | --- | --- | --- |
| 4A | v3 · hybrid.1 + watchwise.b3.1 | localhost:5173 → 18083 | 2 / 2 | 446 temporadas e 64 lançamentos | 26% / 13,00 GiB |
| 4B3 | v4 · watchwise.exec-v4.social.1 | localhost:3000 → 8081 | 2 / 3 | 446 temporadas e 64 lançamentos | 37% / 9,48 GiB |
| 4B6-A | v4 · watchwise.exec-v4.social.1 | localhost:3000 → 8081 | 6 / 3 | 446 temporadas e 64 lançamentos | 68% / 10,81 GiB |
| 4B6-B | v4 · watchwise.exec-v4.social.1 | localhost:3000 → 8081 | 7 / 3 | 446 temporadas e 64 lançamentos | 39% / 9,81 GiB |

Frontend `c7685599062c129458809c64624b5e404133a6ad`, backend `7105887810a69aa51d017fad1bd4129ff65aeb4f` e build Angular `63e9d160acb3eefdc41793642fedb5329b798a888d1f5b7d09186d265590efd6`. Chromium 159.0.8154.6, Java 21.0.8, Node 24.17.0, Playwright 1.65.1 e PostgreSQL 16.14 sob 2 CPUs e 2 GiB. A geração de snapshots foi 2.093. CPU de pré-checagem é uma observação instantânea.

Os contextos eram novos, com cache HTTP desativado pelo roteamento, sessão em memória, rede externa bloqueada e caches Spring/PostgreSQL reutilizados. O replay S2-Q era local. No v3 usa-se a persona de Reviews B3 e no v4 a conta central sintética. No detalhe de Templates do v4, o GET guardado de opções confirma o estado aquecido, com zero chamadas ao replay na janela do navegador. Os hashes de negócio e snapshots se mantiveram estáveis.

## Referências por combinação

| Etapa / ID | Modo e operação | Critério útil | Aquec. / válidas | Mediana / p95 (ms) | CV | HTTP/amostra | Classificação |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4A · `reviews/cold` | Direta · Abertura + páginas 2 e 3 | 38 Reviews em 15 + 15 + 8, texto e IDs na ordem | 3 / 30 | 229,81 / 275,97 | 8,48% | open: 3; page-2: 1; page-3: 1 | Baseline parcial válida |
| 4A · `templates/cold` | Direta · Abertura RECENT + página 2 | 20 de 72 por página, RECENT, links e IDs disjuntos | 3 / 30 | 220,78 / 240,63 | 6,42% | open: 4; page-2: 1 | Baseline parcial válida |
| 4A · `templates/internal` | Interna + interação · Origem Explorar + abertura RECENT + página 2 | 5 recentes na origem e 20 de 72 por página no destino | 3 / 30 | 104,74 / 108,78 | 3,91% | prepare-source: 6; open: 3; page-2: 1 | Baseline parcial válida |
| 4B3 · `notifications-open` | Direta · Abertura | 20 de 300, estado lido/não lido no DOM | 3 / 30 | 205,40 / 232,80 | 5,96% | open: 3 | Baseline parcial válida |
| 4B3 · `followers-pagination` | Interação SPA · Página 1 → 2 | 20 novos perfis de 75, ordem e sem duplicatas | 3 / 30 | 59,27 / 68,59 | 9,40% | next: 1 | Baseline parcial válida |
| 4B3 · `followers-open` | Direta · Abertura | 20 de 75, ordem e identidade | 3 / 30 | 168,09 / 186,86 | 5,53% | open: 2 | Baseline parcial válida |
| 4B6-A · `following-open` | Direta · Abertura | 20 de 65 perfis aceitos, ordem do SQL e links | 3 / 30 | 169,65 / 191,72 | 6,37% | open: 2 | Baseline parcial válida |
| 4B6-A · `following-pagination` | Interação SPA · Página 1 → 2 | 20 novos de 65, ordem do SQL e sem sobreposição | 3 / 30 | 59,59 / 66,50 | 8,09% | next: 1 | Baseline parcial válida |
| 4B6-A · `feed-open` | Direta · Primeiro lote | 20 atividades visíveis, autores elegíveis, chaves e ordem | 3 / 30 | 270,76 / 288,44 | 6,45% | open: 2 | Baseline parcial válida |
| 4B6-A · `feed-load-more` | Interação SPA · Primeiro avanço de cursor | 20 novas, 40 acumuladas, sem duplicatas | 3 / 30 | 132,53 / 157,34 | 7,67% | load-more: 1 | Baseline parcial válida |
| 4B6-B · `my-picks-open` | Direta · Abertura | 10 de 48 Picks próprios, ordem e links | 3 / 30 | 233,56 / 250,44 | 4,35% | open: 3 | Baseline parcial válida |
| 4B6-B · `my-pick-detail` | Interna · Clique na lista de Meus Picks | ID e título do Pick selecionado, resposta renderizada | 3 / 30 | 133,80 / 149,72 | 5,71% | open-pick: 2 | Baseline parcial válida |
| 4B6-B · `explore-open` | Direta · Seção Recentes | 5 recentes distintos, ordem e links | 3 / 30 | 239,88 / 270,30 | 9,15% | open: 6 | Baseline parcial válida |
| 4B6-B · `explore-most-picked` | Interna · Explorar → catálogo Mais escolhidos | 20 de 72 no recorte, links e nova GET | 3 / 30 | 128,34 / 135,97 | 4,34% | see-all-most-picked: 3 | Baseline parcial válida |
| 4B6-B · `templates-open` | Direta · Abertura MOST_PICKED | 20 cartões e fixture de detalhe presente | 3 / 30 | 238,54 / 273,68 | 7,93% | open-catalog: 4 | Baseline parcial válida |
| 4B6-B · `template-detail` | Interna · Clique no catálogo MOST_PICKED | ID, título, 20 de 24 opções e 10 Picks da comunidade | 3 / 30 | 182,88 / 192,24 | 5,01% | open-template: 5 | Válida com limitações |

### Janelas complementares da 4A

Cada janela abaixo tem 30 observações pareadas com o roteiro da tabela. A preparação é separada dos cliques de paginação. Essas janelas não acrescentam amostras ao total do roteiro.

| Roteiro | Janela | Mediana / p95 (ms) | CV | HTTP/amostra |
| --- | --- | --- | --- | --- |
| Reviews direto | `page-2` | 71,84 / 79,94 | 8,32% | 1 |
| Reviews direto | `page-3` | 59,99 / 71,60 | 12,16% | 1 |
| Templates direto | `page-2` | 83,84 / 92,08 | 5,53% | 1 |
| Templates interno | `prepare-source` | 225,09 / 235,61 | 2,76% | 6 |
| Templates interno | `page-2` | 73,47 / 79,19 | 6,79% | 1 |

## Cobertura das 39 telas

D é abertura direta e I é navegação interna no inventário. O recorte determina as operações efetivamente medidas. O status histórico por rota está também no CSV.

| Tela e rota | Modos inventariados | Situação atual | Recorte e pendências |
| --- | --- | --- | --- |
| Login · `/login` | D/I | Qualificado historicamente, sem baseline | Formulário histórico qualificado; autenticação e ações externas ficam em roteiros próprios. |
| Cadastro · `/register` | D/I | Qualificado historicamente, sem baseline | Abertura qualificada no histórico; submissão fica fora. |
| Recuperação de senha · `/forgot-password` | D/I | Qualificado historicamente, sem baseline | Abertura qualificada no histórico; sem disparar e-mail. |
| Termos · `/terms` | D/I | Qualificado historicamente, sem baseline | Completo · texto e seção identificável. |
| Privacidade · `/privacy` | D/I | Qualificado historicamente, sem baseline | Completo · texto e seção identificável. |
| Diretrizes · `/community-guidelines` | D/I | Qualificado historicamente, sem baseline | Completo · texto e seção identificável. |
| Ajuda/contato · `/help-contact` | D/I | Qualificado historicamente, sem baseline | Completo · conteúdo e ação de contato visíveis, sem acionamento externo. |
| Início · `/home` | D/I | Pendente de configuração/validação | Resolver persona e cartão enriquecido no clone alvo. |
| Em alta · `/trending` | D/I | Bloqueado por catálogo no recorte controlado | Fixar catálogo e título representativos; separar recorte vazio. |
| Calendário · `/calendar` | D/I | Pendente de fixture | Fixar mês e evento; o teste histórico supõe abertura em novembro de 2026. |
| Detalhe filme · `/content/movie/:tmdbId` | D/I | Bloqueado por catálogo no recorte controlado | Configuração · metadados do ID e título visível. No modo interno, confirmar cartão de origem. |
| Detalhe série · `/content/series/:tmdbId` | D/I | Bloqueado por catálogo no recorte controlado | Configuração · série e temporada vinculada renderizadas. |
| Temporada · `/content/series/:tmdbId/season/:seasonNumber` | D/I | Bloqueado por catálogo no recorte controlado | Configuração · temporada e episódio coerentes com a série. |
| Episódio · `/content/series/:tmdbId/season/:seasonNumber/episode/:episodeNumber` | D/I | Bloqueado por catálogo no recorte controlado | Configuração · título e coordenadas corretas no painel. |
| Detalhe de review/registro · `/diary/entry/:entryId` | D/I | Pendente de fixture | Fixar registro, visibilidade, mídia e comentário. |
| Diário · `/diary` | D/I | Bloqueado por catálogo no recorte controlado | Qualificar catálogo, títulos e fallback como recortes distintos. |
| Reviews do diário · `/diary/reviews` | D/I | Baseline em recorte identificado | 4A: abertura direta, páginas 2 e 3 preenchidas; vazio e navegação interna fora da baseline. |
| Progresso · `/progress` | D | Bloqueado por mutação/reconciliação | Roster e runtimes insuficientes; reader pode reconciliar snapshots. Aguardar validação real isolada e autorizada. |
| Watchlist · `/watchlist` | D/I | Bloqueado por mutação/reconciliação | Validação aquecida histórica. Frio exige snapshots equivalentes por repetição e controle explícito das escritas; sem baseline. |
| Configurações · `/settings` | D/I | Qualificado historicamente, sem baseline | Abertura autenticada histórica; sem salvar. |
| Minhas listas · `/lists` | D/I | Pendente de configuração/validação | Confirmar lista da persona e corpus de capas. |
| Descobrir listas · `/lists/community` | D/I | Pendente de configuração/validação | Validar alvo público e capas no dataset de execução. |
| Criar lista · `/lists/create` | D/I | Qualificado historicamente, sem baseline | Formulário histórico qualificado; busca de mídia depende de catálogo e submissão fica fora. |
| Detalhe de lista · `/lists/:listId` | D/I | Pendente de configuração/validação | Resolver lista autorizada, itens e catálogo de capas. |
| Editar lista · `/lists/:listId/edit` | D/I | Pendente de fixture | Exige lista editável da persona; abrir sem salvar. |
| Progresso da lista · `/lists/:listId/progress` | D/I | Bloqueado por mutação/reconciliação | Gate de reconciliação pendente mesmo com fixture relacional de série não iniciada. |
| Perfil · `/users/:username` | D/I | Pendente de configuração/validação | Confirmar persona e resumo renderizado. |
| Seguidores · `/users/:username/followers` | D | Baseline em recorte identificado | Abertura direta e página 1 → 2 no próprio perfil; páginas 3–4 e navegação interna fora. |
| Seguindo · `/users/:username/following` | D | Baseline em recorte identificado | Abertura direta e página 1 → 2 no próprio perfil; páginas 3–4 e entrada por outra tela fora. |
| Feed social · `/social` | D/I | Baseline em recorte identificado | Abertura direta e primeiro incremento, 40 atividades visíveis. Terceiro lote, acesso interno e outros recortes de visibilidade fora. |
| Notificações · `/notifications` | D/I | Baseline em recorte identificado | Abertura direta no próprio perfil; filtros, interação paginada e navegação interna sem baseline. |
| Meus Picks · `/picks` | D/I | Baseline em recorte identificado | Abertura direta, 10 de 48; paginação visual sem baseline. |
| Explorar Picks · `/picks/explore` | D/I | Baseline em recorte identificado | Recentes direto e clique para o catálogo MOST_PICKED; semanal, entrada interna e busca visual fora. |
| Explorar templates · `/picks/templates` | D/I | Baseline em recorte identificado | 4A RECENT direto/interno e página 2; v4 MOST_PICKED direto e entrada a partir de Explorar; manter estados separados. |
| Detalhe template · `/picks/templates/:templateId` | D/I | Baseline em recorte identificado | Clique no catálogo aquecido; 20/24 opções e 10/37 Picks públicos. Abertura direta, cache frio e ordenação da comunidade fora. |
| Preencher Pick · `/picks/templates/:templateId/new` | D/I | Parcial | Categoria interativa; opções visíveis e fluxo sem publicação. |
| Criar template · `/picks/create` | D/I | Parcial | Abertura do primeiro passo, sem publicação. |
| Importar template · `/picks/import` | D/I | Parcial | Editor de abertura qualificado em parte; prévia local separada e sem submissão. |
| Detalhe Pick · `/picks/:pickId` | D/I | Baseline em recorte identificado | Clique na lista própria; abertura direta fora. |

As quatro rotas excluídas do denominador seguem o inventário. As 10 telas com algum recorte estatístico representam 25,6% das 39; isso não mede cobertura por modo. Inventário auditado [acervo local (03c-prontidao-baseline.md)] · [histórico de rotas](rotas.csv)

## Cobertura dos 25 cenários adicionais

Os 25 IDs tiveram validação histórica nos Grupos 1 e 2. Nove têm pelo menos uma janela em baseline, por vezes só a abertura. Os outros 16 têm validação histórica parcial ou completa em seu recorte, sem uma série estatística atual. Nenhum ID foi identificado como exclusivamente piloto metodológico sem baseline. Reviews preenchidas da 4A usam uma fixture diferente do cenário de Reviews vazias.

| Grupo / ID | Situação | Evidência e limite |
| --- | --- | --- |
| 1 · `diary-pages` | Validação parcial histórica; catálogo pendente | Parcial · 30 linhas por página, 2/3 e retorno, 4.662 com completions; catálogo. |
| 1 · `diary-sort` | Validação parcial histórica; catálogo pendente | Parcial · mais antigos na primeira página, chaves alteradas; catálogo. |
| 1 · `diary-filter` | Validação parcial histórica; catálogo pendente | Parcial · filtro filmes com vazio explícito; catálogo na abertura. |
| 1 · `reviews-empty` | Validação histórica; sem piloto ou baseline deste recorte | Completo para vazio · zero e mensagem; separar de Reviews populadas, bloqueadas. |
| 1 · `list-90-pages` | Validação parcial histórica; catálogo pendente | Parcial · três páginas de 30 e retorno, links/posições; catálogo. |
| 1 · `list-268-end` | Validação parcial histórica; catálogo pendente | Parcial · nove páginas, última com 28 e fim desabilitado; catálogo. |
| 1 · `list-268-sort` | Validação parcial histórica; catálogo pendente | Parcial · primeira página com posições decrescentes; catálogo. |
| 1 · `progress-pages` | Validação histórica; bloqueado para baseline atual | Parcial · 115 séries, páginas de seis, títulos e percentuais; catálogo e frescor. |
| 1 · `progress-sort` | Validação histórica; bloqueado para baseline atual | Parcial · ordenação por episódios restantes e mudança de ordem; catálogo e frescor. |
| 1 · `list-progress-90` | Validação histórica; bloqueado para baseline atual | Parcial · 90 séries (17 em andamento e 73 concluídas), expansão local da temporada; catálogo e frescor. |
| 1 · `watchlist-pages` | Validação histórica; bloqueado para baseline atual | Completo · 18 por página, páginas 2/3 e retorno, snapshots aquecidos. |
| 1 · `watchlist-end` | Validação histórica; bloqueado para baseline atual | Completo · 276 em 16 páginas, seis na última, unicidade e fim. |
| 1 · `watchlist-filter` | Validação histórica; bloqueado para baseline atual | Completo · 37 filmes e DOM compatível com página de 18. |
| 1 · `watchlist-sort` | Validação histórica; bloqueado para baseline atual | Completo · inversão de data de inclusão e alteração de ordem. |
| 2 · `feed-pages` | Baseline no recorte indicado | Abertura + primeiro avanço de cursor; terceiro lote histórico. |
| 2 · `followers-pages` | Baseline no recorte indicado | Abertura + página 2; páginas 3–4 históricas. |
| 2 · `following-pages` | Baseline no recorte indicado | Abertura + página 2; páginas 3–4 históricas. |
| 2 · `notifications-pages` | Baseline no recorte indicado | Só abertura. Acumulação de páginas é validação histórica. |
| 2 · `notifications-filter` | Validação histórica; sem piloto ou baseline deste recorte | Completo · todas/não lidas/lidas (300/100/200), 20 linhas de cada recorte. |
| 2 · `my-picks-pages` | Baseline no recorte indicado | Só primeira página. Próximas páginas não estão na baseline. |
| 2 · `my-pick-detail` | Baseline no recorte indicado | Clique da lista própria e resposta útil. |
| 2 · `explore-picks` | Baseline no recorte indicado | Recentes direto e navegação para Mais escolhidos. |
| 2 · `templates-pages` | Baseline no recorte indicado | 4A RECENT: abertura e página 2, página 3 fora. |
| 2 · `templates-filter` | Validação histórica; sem piloto ou baseline deste recorte | Completo · Oficiais vazio e busca por nome com um resultado; separar a troca de origem da busca se medir custo isolado. |
| 2 · `template-detail` | Baseline no recorte indicado | Clique no catálogo aquecido; ordenação comunitária fora. |

Grupo 1 [acervo local (03c-cenarios-carga-grupo-1.md)] · Grupo 2 [acervo local (03c-cenarios-carga-grupo-2.md)]

## Piloto e baseline

Variação descritiva igual a (mediana baseline − mediana piloto) / mediana piloto. A 4A usa a abertura em cada comparação. As demais usam a mesma operação.

| Etapa / combinação | Piloto (ms) | Baseline (ms) | Variação |
| --- | --- | --- | --- |
| 4A · Reviews direto | 250,56 | 229,81 | -8,28% |
| 4A · Templates direto | 211,80 | 220,78 | +4,24% |
| 4A · Templates interno | 106,19 | 104,74 | -1,37% |
| 4B3 · Notificações, abertura direta | 210,84 | 205,40 | -2,58% |
| 4B3 · Seguidores, paginação | 58,01 | 59,27 | +2,16% |
| 4B3 · Seguidores, abertura direta | 171,51 | 168,09 | -2,00% |
| 4B6-A · Seguindo, abertura direta | 175,79 | 169,65 | -3,49% |
| 4B6-A · Seguindo, paginação | 60,71 | 59,59 | -1,85% |
| 4B6-A · Feed, abertura direta | 273,99 | 270,76 | -1,18% |
| 4B6-A · Feed, carregamento incremental | 137,42 | 132,53 | -3,56% |
| 4B6-B · Meus Picks, abertura direta | 215,60 | 233,56 | +8,33% |
| 4B6-B · Meus Picks, detalhe pela lista | 126,11 | 133,80 | +6,10% |
| 4B6-B · Explorar, Recentes direto | 214,46 | 239,88 | +11,86% |
| 4B6-B · Explorar, Mais escolhidos interno | 117,80 | 128,34 | +8,95% |
| 4B6-B · Templates, catálogo direto | 222,31 | 238,54 | +7,30% |
| 4B6-B · Templates, detalhe pelo catálogo | 155,15 | 182,88 | +17,88% |

- **4A.** Build e commits do piloto e baseline iguais. CPU de pré-checagem 28% → 26%; sessões iniciais 1 → 2. Piloto [acervo local (03c-piloto-baseline.md)]
- **4B3.** Build e commits do piloto e baseline iguais. CPU de pré-checagem 30% → 37%; sessões iniciais 1 → 2. Piloto [acervo local (04b2-piloto-social.md)]
- **4B6-A.** Build e commits do piloto e baseline iguais. CPU de pré-checagem 22% → 68%; sessões iniciais 4 → 6. Piloto [acervo local (04b5a-piloto-seguindo-feed.md)]
- **4B6-B.** Build e commits do piloto e baseline iguais. CPU de pré-checagem 38% → 39%; sessões iniciais 5 → 7. Piloto [acervo local (04b5b-piloto-picks-templates.md)]

### 4B5-B e 4B6-B por endpoint principal

| Combinação | Endpoint medido | Duração HTTP mediana piloto → baseline (ms) | TTFB mediano piloto → baseline (ms) |
| --- | --- | --- | --- |
| Meus Picks, abertura direta | `/api/v1/users/me/picks/view` | 49,14 → 74,75 | 27,88 → 25,74 |
| Meus Picks, detalhe pela lista | `/api/v1/picks/:id/view` | 32,35 → 33,23 | 24,84 → 24,21 |
| Explorar, Recentes direto | `/api/v1/picks-templates` | 43,09 → 64,45 | 21,05 → 20,66 |
| Explorar, Mais escolhidos interno | `/api/v1/picks-templates` | 40,84 → 42,78 | 31,53 → 30,94 |
| Templates, catálogo direto | `/api/v1/picks-templates` | 48,91 → 55,95 | 29,33 → 30,38 |
| Templates, detalhe pelo catálogo | `/api/v1/picks-templates/:id/categories/:id/options/view` | 14,79 → 16,59 | 12,84 → 14,19 |

No Recentes, a linha de catálogo agrega as três ordenações porque o coletor guarda o caminho sem query. As seis durações HTTP medianas aumentaram, enquanto o TTFB caiu em quatro dos seis recortes. A divergência de direção ajuda a priorizar a separação entre espera pela resposta, transferência e renderização, sem atribuir causa a uma dessas parcelas. O endpoint principal oferece um ponto de correlação e deixa chamadas auxiliares fora da comparação.

Na 4B6-B as seis medianas subiram juntas e o detalhe de Templates teve o maior aumento relativo. Build, commits, origem e política de catálogo reutilizado coincidem. O replay ficou sem chamadas nas janelas das duas fases. A 4B6-B teve uma série mais longa e um estado operacional inicial posterior; carga efetiva de CPU e caches não foram registrados continuamente. A direção comum justifica um teste pareado de ambiente antes de atribuir causa. Os resultados passaram pelos critérios de estabilidade e integridade de seus recortes.

A paginação de Seguindo teve CV de 29,67% e máximo de 114,68 ms no piloto. Na baseline ficou em 8,09% e 70,47 ms de máximo, sem recorrência daquela cauda. A mediana é utilizável no recorte validado; a cauda permanece exploratória.

## Limitações e prioridades

- **Guard.** As 906 operações registradas passaram. Hashing e estabilização ficam fora da janela de interface, mas podem alterar caches do PostgreSQL e o consumo de CPU. Esse efeito indireto ainda não foi isolado.
- **Watchlist e TMDB.** A primeira página fria de 18 itens fez 276 chamadas ao replay, incluindo 227 resoluções de snapshots antes da paginação. Foi uma validação específica, sem série estatística atual. Frio e aquecido exigem células separadas; o frio depende de cópia descartável autorizada e estado inicial reproduzível. Replay [acervo local (03c-tmdb-replay.md)]
- **Progresso e Progresso da lista.** Roster e runtimes permanecem parcialmente qualificados e a leitura pode reconciliar snapshots. A validação offline encontrou 157 divergências entre as 196 temporadas examinadas. Aguardar validação real isolada autorizada antes de executar. Gate da reconciliação [acervo local (03c-gate-reconciliacao.md)]
- **Templates.** O detalhe aquecido tem 24 opções na fixture e mostra 20. A apresentação integral permanece uma limitação funcional. Baseline do detalhe [acervo local (04b6b-baseline-picks-templates.md)]
- **Ambiente.** Para comparações de código, manter clone, dataset, origem, modo, identidade e estado do catálogo. A 4A e as rodadas v4 são referências distintas.

### Gargalos medidos e candidatos com baseline

As latências observadas localizam caminhos a decompor no backend. Nenhuma consulta SQL ou etapa Java foi demonstrada como causa. A prioridade usa volume comprovado e papel dos fluxos; faltam dados de frequência real de uso.

1. **Feed.** 270,76 ms até conteúdo útil na abertura e 132,53 ms no incremento. A abertura devolve cerca de 60,8 kB e TTFB mediano de 59,47 ms para 20 itens. Investigar seleção e ordenação das fontes, cursor e enriquecimento por lote. Há dois recortes estáveis para isolar Java, JDBC e crescimento da coleção. 4B6-A [acervo local (04b6a-baseline-seguindo-feed.md)]
2. **Explorar Picks e Templates.** Recentes faz seis GETs fixos por abertura e três chamadas ao caminho do catálogo com ordenações diferentes. O agrupamento omite a query. Instrumentar cada recorte para identificar trabalho repetido e dependências reais. O catálogo direto, com quatro GETs, oferece controle no mesmo clone. 4B6-B [acervo local (04b6b-baseline-picks-templates.md)]
3. **Notificações e resumo auxiliar.** A tela faz três GETs. O TTFB mediano do resumo da Home é 86,94 ms e o da lista 14,06 ms. O resumo alimenta o fundo visual e pode concluir depois dos cartões úteis. Correlacionar as duas janelas antes de atribuir latência. A fixture tem 300 notificações, 100 não lidas. 4B3 [acervo local (04b3-baseline-social-parcial.md)] · Diagnóstico [acervo local (04b2-piloto-social.md)]
4. **Controles simples.** Página 2 de Seguindo e Seguidores têm um GET por clique e ajudam a aferir overhead. Em seguida, investigar Meus Picks e o detalhe de Templates, com 48 Picks na conta e cinco GETs no detalhe aquecido. Reviews paginadas podem ser investigadas separadamente pelo recorte v3.

### Riscos técnicos e problemas funcionais

- **Riscos identificados.** Amplificação de catálogo na Watchlist fria, escritas de reconciliação em Progresso, escala e privacidade do Feed fora da persona, catálogo faltante em Diário/Listas e seção semanal sensível à data. Ordem temporal no navegador é hipótese de dependência, a conferir no backend.
- **Problema funcional.** A apresentação das quatro opções adicionais em Templates exige decisão funcional própria e nova qualificação do roteiro após eventual mudança autorizada.

## Plano mínimo de instrumentação

O POM declara Spring Web, Spring Data JPA e driver PostgreSQL. A configuração dev habilita a saída de SQL. A inspeção dirigida do POM, recursos e Compose não encontrou configuração explícita de Actuator/Micrometer, interceptador JDBC ou pg_stat_statements. Isso não prova ausência transitiva ou em runtime. O coletor Playwright, replay e guard já oferecem métricas de fronteira e integridade. Logs SQL por si só não atribuem tempo e contagem a cada requisição. Dependências do backend [acervo local (pom.xml)] · Configuração dev [acervo local (application-dev-config.properties)]

1. **HTTP de baixa cardinalidade.** Conferir primeiro o que já está no classpath e na configuração efetiva. Correlacionar a janela Playwright a um ID opaco; registrar rota normalizada, status e duração do servidor. Usar método e rota em métricas agregadas e manter ID efêmero apenas no log de diagnóstico. Introduzir Actuator/Micrometer somente se simplificarem a coleta, com exposição local.
2. **JDBC e Java.** Em perfil isolado, medir contagem e tempo por requisição, fingerprints mais lentas, aquisição de conexão, transações e repetições. Preferir um único interceptador depois de verificar os mecanismos existentes. Propagar o contexto às tarefas assíncronas pertinentes. Evitar SQL bruto, binds, tokens, cookies e IDs pessoais. Tempo Java residual é estimativa; operações sobrepostas exigem análise da linha do tempo.
3. **PostgreSQL, replay e cache.** Capturar deltas de estatísticas isoladas por bloco, hits e misses, chamadas externas/replay e duração. Verificar primeiro se pg_stat_statements está habilitado quando houver acesso expressamente autorizado. Se indisponível, começar pelo JDBC; ativação de extensão ou mudança de configuração exige avaliação separada. Distinguir conexões do guard. Deltas globais não correlacionam sozinhos SQL e HTTP.
4. **Overhead.** Comparar blocos alternados com instrumentação ligada e desligada no mesmo build e estado, preservando guard e cache. Usar um controle de um GET e registrar CPU, memória, tempo e volume de logs. Reduzir amostragem se a captura alterar a distribuição. Investigar o efeito do guard em experimento aprovado fora da baseline, mantendo a proteção na referência.

## Ordem proposta

1. Homologar a coleta mínima em ambiente autorizado e aferir overhead na paginação de Seguindo/Seguidores. Instrumentar Feed, Explorar e Notificações, correlacionando com as referências v4.
2. Independentemente das pendências de catálogo, qualificar aberturas estáticas, formulários sem submissão, Configurações, filtros de Notificações e páginas adicionais de conexões no ambiente final.
3. Resolver dependências de catálogo para Home enriquecida, Diário, Listas e detalhes. Fixar o recorte do Calendário e do semanal de Explorar Picks. Qualificar catálogo e fallback como variantes separadas.
4. Retomar Watchlist em células quente e fria, com estado de snapshots reponível em cópia autorizada. Tratar Progresso numa validação isolada de roster, runtimes e reconciliação antes do piloto.
5. Depois de estabelecer uma causa, alterar uma variável por vez e repetir as combinações relevantes. Fixar build identificado, persona, volume/visibilidade, origem e proxy, navegador, sessão, snapshots, cache, ordem, prontidão e guard. Separar preparação, abertura, interação, HTTP e servidor.

A baseline das 39 telas permanece pendente. Esta etapa consolidou evidências locais sem executar navegador, serviços, banco, benchmarks ou instrumentação.
