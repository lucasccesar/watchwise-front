# 5N2 — Benchmark acumulado de desempenho

**24/120 observações oficiais válidas.** 0 inválidas e 96 não executadas. As medições comparam os pacotes acumulados preservados. Os resultados por operação abaixo separam o efeito estrutural observado da atribuição temporal, limitada pelas diferenças de empacotamento do Angular.

A Watchlist foi a única faixa com medições oficiais. A abertura mostrou a combinação de **melhora em H**, menos tráfego e **piora do GET principal**. No filtro Action, H e GET pioraram pelos limiares práticos. O v4 confirmou reduções estruturais antes de parar no gate funcional, sem medições oficiais.

## Artefatos e atribuição

| Variante | Backend SHA-256 | Angular SHA-256 de árvore |
|---|---|---|
| A · anterior à primeira projeção do Feed | `f3ffba2d2c0ac016f5a69d50993d560155c8d75d4dea8f900f1d643e49489c72` | `63e9d160acb3eefdc41793642fedb5329b798a888d1f5b7d09186d265590efd6` |
| B · após a 5M3 | `962319a733f92055dfce43b0a4deaff36b241e8f5d1fee7c75c63d0e044c3be4` | `dbca8c2a9f9c01e2456a6991454831b5d10a54fbdb80347a226baa1e8e2faa89` |

Os pares usaram JAR e Angular da mesma variante. A 5N1 verificou 146 dependências Java idênticas e diferenças de classe compatíveis com os fluxos alterados, além do POM embutido. O Angular histórico teve diferenças de empacotamento entre distribuições, com causa não determinada. A execução compara os pacotes preservados. As diferenças de latência podem incluir efeitos dessa distribuição. SQL, requisições eliminadas e escopos de carregamento foram observados separadamente. Os artefatos foram verificados por hash sem recompilação. Origem dos artefatos e plano 5N1 [acervo local (05n1-balanco-planejamento-benchmark-acumulado.md)]

## Ambiente, sessões e snapshots

PostgreSQL isolado em `127.0.0.1:15433`, v4 para as personas sociais e Reviews, clone `watchwise_benchmark_watchlist_5i` para Watchlist. API temporária em `127.0.0.1:8082` e proxy de origem `http://localhost:3001`. Chromium 159.0.8154.6 com contexto novo por abertura e sessões em memória. Replay histórico em `127.0.0.1:18091`, catálogo de hash `1443edeb41d3cda1b9c66929dd065eb40e0b66196eabc6774d151746fc487642` e referência ausente validada com HTTP 404 local. O executor bloqueou rede externa do navegador, cron, migrations, seeds e workers, e usou transações por padrão somente leitura nas JVMs após os logins.

Watchlist 276/276 chaves FOUND, 0 vencidas, 68.268 s de vigência mínima na abertura. Dez itens com gêneros locais nulos e cobertura conferida no catálogo. A renovação não foi necessária. Pré-checagem do clone [acervo local (environment.json)]

v4 com 64 snapshots de lançamento, 64 vencidos no inventário global. Na lista de 48 títulos, 8 chaves coincidentes de lançamento, 8 datas disponíveis e 8 vencidas entre as coincidentes. O guard e as JVMs somente leitura testaram o caminho usado por cada recorte. Hierarquias completas de séries continuam fora da qualificação. Pré-checagem v4 [acervo local (environment.json)]

## Qualificação funcional e completude

O critério de H manteve os marcos dos executores anteriores. Os cartões, totais, filtros, notas, estados, menus e campos canônicos foram comparados fora da marca sempre que o roteiro histórico assim fazia. Os controles usam a abertura correspondente no mesmo contexto. Divergências de JSON mantêm caminho, hash e fase em arquivo separado quando observadas.

| Operação | Qualificação A/B | Oficiais válidas / planejadas | Inválidas | Pares completos | Classificação |
|---|---|---:|---:|---:|---|
| Feed social · Abertura | 3/3 | 0 / 16 | 0 | 0/4 | Cenário bloqueado |
| Meus Picks · Abertura | 3/0 | 0 / 16 | 0 | 0/4 | Cenário bloqueado |
| Detalhe de Pick · Clique aquecido | 1/0 | 0 / 8 | 0 | 0/4 | Cenário bloqueado |
| Reviews do diário · Abertura | 3/3 | 0 / 16 | 0 | 0/4 | Cenário bloqueado |
| Notificações · Abertura com fundo padrão | 3/3 | 0 / 16 | 0 | 0/4 | Cenário bloqueado |
| Detalhe de lista · Abertura por posição | 3/3 | 0 / 16 | 0 | 0/4 | Cenário bloqueado |
| Detalhe de lista · Página 2 por posição | 1/1 | 0 / 8 | 0 | 0/4 | Cenário bloqueado |
| Watchlist · Abertura aquecida | 3/3 | 16 / 16 | 0 | 4/4 | Regressão relevante |
| Watchlist · Filtro Action | 1/1 | 8 / 8 | 0 | 4/4 | Regressão relevante |

- **Feed social · Abertura** — `functional-divergence-reviews-home-contract`.
- **Meus Picks · Abertura** — `picks functional-divergence-picks`.
- **Detalhe de Pick · Clique aquecido** — `picks functional-divergence-picks`.
- **Reviews do diário · Abertura** — `functional-divergence-reviews-home-contract`.
- **Notificações · Abertura com fundo padrão** — `functional-divergence-reviews-home-contract`.
- **Detalhe de lista · Abertura por posição** — `functional-divergence-reviews-home-contract`.
- **Detalhe de lista · Página 2 por posição** — `functional-divergence-reviews-home-contract`.

**Meus Picks.** O auxiliar introduziu a chave canônica templateId a partir do DTO integral, embora o contrato reduzido da 5F2 exclua esse campo do cartão e o roteamento use o ID do Pick. Os dez caminhos divergentes apontaram exclusivamente essa chave. Foi um erro de escopo do validador desta execução. A tentativa e o bloqueio permaneceram nos brutos. O clique só foi qualificado em A e ficou sem coleta bilateral. O auxiliar aplicável a uma retomada deve usar a projeção canônica já demonstrada na 5F3. Nenhuma medida histórica foi imputada à 5N2. Campos dos cartões na 5F2 [acervo local (05f2-otimizacao-projecao-meus-picks.md)] · [Validador e equivalência 5F3](05f3-validacao-benchmark-meus-picks.md) · Caminhos divergentes [acervo local (divergence.ndjson)]

Foram completos 8 de 36 pares por operação. Um mesmo par de JVMs pode servir a várias operações.

Por faixa, o plano fixou A/B, B/A, B/A e A/B, JVM e proxy próprios por minibloco. O gate de aquecimento usa de 15 a 30 ciclos e compara as duas medianas finais de cinco operações com tolerância de max(5 ms, 10% da mediana anterior). As sondas SQL ficaram separadas e o logging diagnóstico e estatísticas Hibernate ficaram desligados durante o Playwright. Os aquecimentos de navegador e as preparações da sessão ficaram fora de H.

| Faixa | Minibloco | Ciclos no último gate | Mediana anterior | Mediana da última janela | Tolerância | Gate |
|---|---|---:|---:|---:|---:|---|
| Watchlist | 1A | 20 | 242,36 | 218,38 | 24,24 | Aprovado |
| Watchlist | 1B | 20 | 146,23 | 135,83 | 14,62 | Aprovado |
| Watchlist | 2B | 20 | 147,40 | 134,52 | 14,74 | Aprovado |
| Watchlist | 2A | 15 | 262,93 | 239,46 | 26,29 | Aprovado |
| Watchlist | 3B | 20 | 143,96 | 143,72 | 14,40 | Aprovado |
| Watchlist | 3A | 20 | 244,31 | 232,05 | 24,43 | Aprovado |
| Watchlist | 4A | 15 | 265,03 | 243,35 | 26,50 | Aprovado |
| Watchlist | 4B | 20 | 142,55 | 130,80 | 14,26 | Aprovado |

**Interrupção do v4.** No aquecimento do minibloco 1A, dez ciclos foram concluídos. A tentativa seguinte detectou variação em `/qualifyingTopGenres/5/0`. O caminho é da projeção calculada pelo auxiliar para conferir os seis primeiros gêneros da Home legada, usada pelo resumo A de Reviews. As respostas canônicas não diferiram em outros caminhos registrados. A 5H3 só aceitava a permutação comprovada de empates quando o gráfico continuava igual. Os valores individuais da variante atual não foram retidos, o que impede confirmar esse requisito ou atribuir a mudança ao gráfico renderizado. A ocorrência foi dentro de A, antes da primeira amostra oficial, e não comprova regressão de B. A faixa parou conforme o gate. Os demais cenários do v4 aprovados na qualificação ficaram sem tempos oficiais. Eventos de aquecimento [acervo local (warm.ndjson)] · Caminho divergente [acervo local (divergence.ndjson)]

## Sondas estruturais

GETs e bytes da sonda abrangem as rotas descritas no bruto, incluindo sessão nas aberturas em que foi sondada. As leituras SQL são instruções executadas e atribuídas ao PID da JVM temporária. Os números de parâmetros nos lotes descrevem o tamanho dos conjuntos de entrada. Contagem de linhas físicas examinadas e de invocações Java que acertaram o cache ficam sem medição. Replay em sonda e em janela oficial aparecem separadamente.

| Operação | GETs A → B | Leituras SQL A → B | JSON (B) A → B | Replay A → B | Equivalência na sonda |
|---|---:|---:|---:|---:|---|
| Feed social · Abertura | 2 → 2 | 39 → 37 | 61.841 → 61.841 | 4 → 4 | Comparação canônica aprovada |
| Reviews do diário · Abertura | 3 → 3 | 47 → 34 | 33.630 → 29.289 | 15 → 15 | Comparação canônica aprovada |
| Notificações · Abertura com fundo padrão | 3 → 3 | 57 → 21 | 21.938 → 16.648 | 0 → 0 | Comparação canônica aprovada |
| Detalhe de lista · Abertura por posição | 3 → 3 | 49 → 49 | 40.718 → 40.718 | 48 → 48 | Comparação canônica aprovada |
| Detalhe de lista · Página 2 por posição | 1 → 1 | 30 → 29 | 23.708 → 23.708 | 0 → 0 | Comparação canônica aprovada |
| Watchlist · Abertura aquecida | 3 → 2 | 69 → 36 | 294.079 → 19.022 | 276 → 276 | Comparação canônica aprovada |
| Watchlist · Filtro Action | 1 → 1 | 13 → 13 | 13.588 → 13.588 | 0 → 0 | Comparação canônica aprovada |
| Histórico do Diário · Sonda complementar | 3 → 3 | 46 → 34 | 59.675 → 55.334 | 0 → 0 | Comparação canônica aprovada |
| Explorar Picks · Sonda complementar | 4 → 3 | 42 → 28 | 6.276 → 3.890 | 0 → 0 | Comparação canônica aprovada |

Detalhe de lista · Abertura por posição levou 33 → 15 séries aos agregados de notas. As hierarquias incompletas continuam limitando os estados reais de série.
Detalhe de lista · Página 2 por posição levou 33 → 18 séries aos agregados de notas. As hierarquias incompletas continuam limitando os estados reais de série.

- Feed social · Abertura teve 11 + 28 leituras em A e 11 + 26 em B, na ordem dos GETs da sonda. Os limites dos GETs foram identificados pela projeção de autenticação.
- Reviews do diário · Abertura teve 11 + 17 + 19 leituras em A e 11 + 17 + 6 em B, na ordem dos GETs da sonda. Os limites dos GETs foram identificados pela projeção de autenticação.
- Notificações · Abertura com fundo padrão teve 11 + 6 + 40 leituras em A e 11 + 6 + 4 em B, na ordem dos GETs da sonda. Os limites dos GETs foram identificados pela projeção de autenticação.
- Detalhe de lista · Abertura por posição teve 11 + 35 + 3 leituras em A e 11 + 35 + 3 em B, na ordem dos GETs da sonda. Os limites dos GETs foram identificados pela projeção de autenticação.
- Detalhe de lista · Página 2 por posição teve 30 leituras em A e 29 em B, na ordem dos GETs da sonda. Os limites dos GETs foram identificados pela projeção de autenticação.
- Watchlist · Abertura aquecida teve 11 + 25 + 33 leituras em A e 11 + 25 em B, na ordem dos GETs da sonda. Os limites dos GETs foram identificados pela projeção de autenticação.
- Watchlist · Filtro Action teve 13 leituras em A e 13 em B, na ordem dos GETs da sonda. Os limites dos GETs foram identificados pela projeção de autenticação.
- Histórico do Diário · Sonda complementar teve 11 + 18 + 17 leituras em A e 11 + 18 + 5 em B, na ordem dos GETs da sonda. Os limites dos GETs foram identificados pela projeção de autenticação.
- Explorar Picks · Sonda complementar teve 11 + 15 + 2 + 14 leituras em A e 11 + 3 + 14 em B, na ordem dos GETs da sonda. Os limites dos GETs foram identificados pela projeção de autenticação.
- Feed teve 3 → 2 consultas identificadas pelo nome da tabela de categorias.

## Resultados temporais

Medianas em ms para tempos. Os bytes de cada corpo HTTP são os observados pelo coletor do navegador, sem cabeçalhos. Resultados parciais são descritivos. Os contrastes usam somente pares completos. Os critérios práticos são 5 ms e 5% em HTTP e 10 ms e 5% em H, nas duas ordens, aplicados simetricamente. Eles orientam triagem.

| Operação | Métrica | A acumulado | B acumulado | B − A |
|---|---|---:|---:|---:|
| Watchlist · Abertura aquecida | H | 444,47 | 408,79 | -35,68 (-8,03%) |
| Watchlist · Abertura aquecida | GET principal | 129,68 | 142,22 | 12,54 (9,67%) |
| Watchlist · Abertura aquecida | TTFB principal | 100,31 | 107,48 | 7,18 (7,15%) |
| Watchlist · Abertura aquecida | GET auxiliar | 221,43 | — | — |
| Watchlist · Abertura aquecida | GETs | 3 | 2 | -1,00 (-33,33%) |
| Watchlist · Abertura aquecida | Corpos HTTP (B) | 294.508 | 19.069 | -275.439,00 (-93,53%) |
| Watchlist · Abertura aquecida | Chamadas ao replay | 0 | 0 | 0,00 |
| Watchlist · Filtro Action | H | 131,85 | 152,62 | 20,78 (15,76%) |
| Watchlist · Filtro Action | GET principal | 31,81 | 44,69 | 12,88 (40,51%) |
| Watchlist · Filtro Action | TTFB principal | 29,52 | 42,63 | 13,10 (44,37%) |
| Watchlist · Filtro Action | GETs | 1 | 1 | 0,00 (0,00%) |
| Watchlist · Filtro Action | Corpos HTTP (B) | 13.616 | 13.616 | 0,00 (0,00%) |
| Watchlist · Filtro Action | Chamadas ao replay | 0 | 0 | 0,00 |

| Operação | Métrica | IQR A / B (ms) | Δ par 1 AB | Δ par 2 BA | Δ par 3 BA | Δ par 4 AB | Mediana dos deltas AB / BA |
|---|---|---:|---:|---:|---:|---:|---:|
| Watchlist · Abertura aquecida | H | 28,86 / 21,79 | -48,72 | -21,83 | -26,40 | -28,07 | -38,40 / -24,11 |
| Watchlist · Abertura aquecida | GET principal | 21,39 / 13,40 | 3,44 | 15,50 | 14,69 | 21,16 | 12,30 / 15,09 |
| Watchlist · Abertura aquecida | GET auxiliar | 28,54 / — | — | — | — | — | — / — |
| Watchlist · Filtro Action | H | 4,47 / 6,66 | 22,38 | 3,39 | 32,97 | 19,95 | 21,17 / 18,18 |
| Watchlist · Filtro Action | GET principal | 2,82 / 1,74 | 7,93 | 12,65 | 16,40 | 12,63 | 10,28 / 14,53 |

| Operação | Métrica | Par 1 A/B (medianas A / B) | Par 2 B/A | Par 3 B/A | Par 4 A/B |
|---|---|---:|---:|---:|---:|
| Watchlist · Abertura aquecida | H | 444,47 / 395,75 | 442,09 / 420,27 | 441,08 / 414,69 | 437,35 / 409,28 |
| Watchlist · Abertura aquecida | GET principal | 122,80 / 126,24 | 129,68 / 145,18 | 129,54 / 144,23 | 119,18 / 140,34 |
| Watchlist · Filtro Action | H | 132,22 / 154,60 | 146,31 / 149,70 | 131,47 / 164,44 | 130,69 / 150,64 |
| Watchlist · Filtro Action | GET principal | 36,12 / 44,04 | 30,91 / 43,56 | 30,22 / 46,63 | 32,71 / 45,34 |

A distribuição por minibloco, média, mínimo, máximo, p75, p90 e CV estão nas estatísticas. Estatísticas por cenário, versão, minibloco e par [acervo local (statistics.json)]

**Watchlist.** H de abertura caiu de 444,46 para 408,79 ms (−35,67 ms, −8,03%). O GET principal subiu de 129,68 para 142,22 ms (+12,54 ms, +9,67%). O controle Action teve H de 131,84 → 152,62 ms (+20,77 ms) e GET de 31,81 → 44,69 ms (+12,88 ms). As direções apareceram nas duas ordens. O filtro teve 13 leituras, 13 cartões e o mesmo JSON de 13.588 B nos dois lados. No material preservado, a causa temporal específica do aumento do filtro segue indeterminada. A classificação de regressão registra a métrica que piorou acima do limiar e convive com o ganho de H na abertura.

## Custos deslocados e decisões provisórias

- **Templates** ficou fora da série por instabilidade das opções durante a coleta histórica da 5E3. Antecipação confirmada naquele estudo. A manutenção provisória permanece.
- **Meus Picks** teve o primeiro clique frio caracterizado na 5F4. O acumulado mede o controle depois de preparação equivalente de mídia. O recorte da jornada aquecida ficou sem evidência bilateral. A ressalva do primeiro clique permanece. [5F4](05f4-validacao-primeiro-clique-meus-picks.md)
- **Watchlist** preserva o menu e concentra os gêneros no GET principal. A sonda encontrou 33 leituras do GET auxiliar eliminado. Manter provisoriamente: a melhora de H na abertura coexiste com piora do GET principal e do filtro Action. Abertura com snapshots vencidos ou ausentes segue fora da série.
- **Notificações** continua mantida provisoriamente. O recorte com fundo padrão teve sonda bilateral e ficou sem tempos oficiais nesta etapa. A medida auxiliar indica seleção de src no DOM, sem medir pixels ou CDN. O fundo personalizado se apoia nos testes controlados da 5L2.
- **Reviews** migra trabalho do resumo para a listagem sob cache de mídia frio, conforme a 5H3. Os registros desta etapa indicam chamadas observadas ao replay local e o custo acumulado da sonda, fora do cronômetro. Detalhe de lista mantém enriquecimento global quando ordenado por nota. O recorte acumulado mediu ordem por posição.

## Integridade e encerramento

| Faixa | Guard final | Guards aprovados | Logins | Aquecimentos válidos de navegador | Motivo de interrupção |
|---|---|---:|---:|---:|---|
| Watchlist | Aprovado | 117 | 1 | 16 | — |
| v4 | Aprovado | 97 | 2 | 0 | functional-divergence-reviews-home-contract |

Os três logins autorizados acrescentaram duas sessões no v4 (44 → 46) e uma no clone Watchlist (3 → 4). O limitador mudou de fingerprint nos dois bancos, preservando suas três e quatro linhas, respectivamente. A validação final da Watchlist encontrou 276 chaves FOUND, zero vencidas e 67.382 s de vigência mínima. Validade final da Watchlist [acervo local (final-snapshot-validity.json)]

As únicas alterações persistentes observadas foram novas sessões em `refresh_tokens` e atualizações de `shared_limiter_state`. Os arquivos operacionais mantêm os fingerprints separados. Os snapshots não foram renovados. Os guards verificam as 52 tabelas não operacionais, suas sequências e os listeners iniciais e finais.

- Watchlist · Brutos Playwright [acervo local (browser.ndjson)] · Brutos SQL [acervo local (sql.ndjson)] · Guard [acervo local (guard.ndjson)] · Encerramento [acervo local (final.json)] · Deltas autorizados [acervo local (operational.ndjson)]
- v4 · Brutos Playwright [acervo local (browser.ndjson)] · Brutos SQL [acervo local (sql.ndjson)] · Guard [acervo local (guard.ndjson)] · Encerramento [acervo local (final.json)] · Deltas autorizados [acervo local (operational.ndjson)] · Divergências [acervo local (divergence.ndjson)] · Interrupção [acervo local (failure.json)]

## Conclusão

- **Cenário bloqueado** · Feed social (Abertura), Meus Picks (Abertura), Detalhe de Pick (Clique aquecido), Reviews do diário (Abertura), Notificações (Abertura com fundo padrão), Detalhe de lista (Abertura por posição), Detalhe de lista (Página 2 por posição).
- **Regressão relevante** · Watchlist (Abertura aquecida), Watchlist (Filtro Action).

As sondas observaram redução de leituras em Feed, Reviews, Notificações, página 2 de Detalhe de lista, Explorar Picks, Histórico do Diário e abertura da Watchlist. Na primeira página de Detalhe de lista, o lote de médias ficou menor com o mesmo total de instruções. A abertura da Watchlist foi o único cenário com melhora prática em H. O filtro Action, com SQL e payload equivalentes, teve piora prática de H e do GET nas duas ordens.

A decisão da etapa é preservar as otimizações e manter abertas as ressalvas de Watchlist e dos demais recortes provisórios. Uma eventual retomada depende de qualificação reproduzível dos gêneros da Home legada e do uso do contrato canônico correto de Meus Picks. As amostras válidas da Watchlist podem ser reaproveitadas. As doze otimizações permanecem em uso, com as ressalvas das quatro decisões provisórias registradas. Progresso e Progresso da lista seguem suspensos. A participação de cada mudança no tempo total depende do cenário e da distribuição Angular. A 5N3 fica pendente.

[CSV de resultados](05n2-resultados-acumulados.csv) · [Matriz consolidada](04b7-matriz-cobertura.csv)


## Fechamento da 5N2 após a retomada

**120/120 observações oficiais válidas no acumulado.** 96 válidas novas no v4, 0 inválidas e 0 não executadas no total. A Watchlist preserva as 24 observações e os quatro pares originais. Os resultados desta seção são o fechamento da etapa. As seções anteriores registram a primeira execução.

### Ambiente e validadores

Os hashes cumulativos dos dois JARs e das duas árvores Angular foram conferidos pelo executor antes e depois da retomada. Os pares e o método H foram preservados. A distribuição Angular ainda limita a atribuição causal da latência às doze otimizações. A API temporária e o proxy usaram as mesmas portas da primeira execução. A faixa de retomada usou exclusivamente watchwise_benchmark_exec_v4 e o replay histórico local. Pré-checagem e artefatos [acervo local (environment.json)] · Critérios registrados antes da coleta [acervo local (protocol.json)]

O inventário somente leitura registrou 64 snapshots de lançamento vencidos de 64 no v4. A lista de 48 itens tinha 8 chaves com data, 8 vencidas. A qualificação e as JVMs de medição usaram transações somente leitura. Os guards verificaram os fingerprints dos snapshots. Os recortes aprovados funcionaram com o estado existente e o replay autorizado. Hierarquias completas seguem fora do escopo.

**Meus Picks.** A divergência anterior se restringiu aos dez caminhos em picksTemplate/templateId, uma chave derivada pelo validador anterior a partir do ID do template no DTO integral. Esse campo foi retirado intencionalmente do DTO B. O link usa o ID do Pick. A retomada aplicou a projeção da 5F3 nos campos do envelope, cartões, autoria, visibilidade, capas, chips, contagens e progresso. Comparou o DOM com a projeção da 5F3 depois da marca H, incluindo ações, links, paginação e estados visíveis. Meus Picks qualificou 3 aberturas A e 3 B. O controle usa o detalhe integral e os comentários, com identidade, respostas e metadados conferidos. Replay de preparação e oficial ficam em fases distintas. A limitação do primeiro clique frio da 5F4 permanece. Campos e contrato 5F2 [acervo local (05f2-otimizacao-projecao-meus-picks.md)] · [Controle 5F4](05f4-validacao-primeiro-clique-meus-picks.md)

**Reviews e controle da Home.** O bloqueio histórico apareceu no caminho derivado /qualifyingTopGenres/5/0. Os valores exatos daquela tentativa ficaram indisponíveis. Na retomada, a projeção separada reproduziu a ordem de inserção do componente da Home, episódios antes de filmes, e a seleção dos seis primeiros após ordenação estável pelo total. A consulta de gêneros de filmes ordena por contagem descendente e deixa os empates sem desempate. O controle exige igualdade integral dos demais campos e das contagens por gênero. A seleção no limite só pode variar entre gêneros empatados naquele total. A Home tem equivalência do contrato nesses casos. O controle documenta composição e ordem calculadas pelo algoritmo. A Home fica fora das jornadas de navegador da retomada. Reviews compara integralmente sua listagem, seus sete campos de resumo, a ordem dos cartões e a paginação exibida.

| A/B | Fase e origem | Classe | Sexto esperado | Sexto observado | Gêneros cuja presença mudou |
|---|---|---|---|---|---|
| A | qualification reviews-summary | identical | Comedy (2 no total, 2 de filmes e 0 de episódios) | Comedy (2 no total, 2 de filmes e 0 de episódios) | — |
| B | qualification legacy-home-B | identical | Comedy (2 no total, 2 de filmes e 0 de episódios) | Comedy (2 no total, 2 de filmes e 0 de episódios) | — |
| A | official reviews-summary | tied-membership-at-cutoff | Comedy (2 no total, 2 de filmes e 0 de episódios) | Romance (2 no total, 2 de filmes e 0 de episódios) | Comedy, Romance |

No controle separado, 3/3 variantes registradas preservaram os sete campos contra a referência da Home. Reviews qualificou 4 aberturas A e 4 B. Os gêneros na ordem recebida, as respectivas contagens, os campos de Reviews e os caminhos divergentes ficam no controle bruto. O executor também registrou os fingerprints de listagem e DOM.
A retomada observou troca de gêneros empatados na borda dos seis selecionados com contagens equivalentes. O conjunto empatado incluiu Romance, Comedy, Adventure. A assinatura histórica sozinha não identifica a combinação exata da primeira execução. A composição calculada pelo algoritmo do gráfico mudou, sem uma medição do DOM da Home. A lista e os sete campos de Reviews continuaram com seu próprio critério.
Caminhos da resposta bruta com ordem alterada nesta retomada: /genreCountsMoviesLast30Days/5/genre, /genreCountsMoviesLast30Days/6/genre, /genreCountsMoviesLast30Days/8/genre, /genreCountsMoviesLast30Days/10/genre.
Variações do controle da Home [acervo local (home-control.ndjson)]

### Consolidação temporal e estrutural

| Operação | Planejadas | Válidas | Inválidas | Não executadas | Pares | Equivalência na qualificação | Resultado |
|---|---:|---:|---:|---:|---:|---|---|
| Feed social · Abertura | 16 | 16 | 0 | 0 | 4/4 | Confirmada | Redução estrutural sem melhora temporal demonstrada |
| Meus Picks · Abertura | 16 | 16 | 0 | 0 | 4/4 | Confirmada | Redução estrutural sem melhora temporal demonstrada |
| Detalhe de Pick · Clique aquecido | 8 | 8 | 0 | 0 | 4/4 | Confirmada | Sem diferença temporal relevante demonstrada |
| Reviews do diário · Abertura | 16 | 16 | 0 | 0 | 4/4 | Confirmada | Melhora relevante |
| Notificações · Abertura com fundo padrão | 16 | 16 | 0 | 0 | 4/4 | Confirmada | Melhora relevante |
| Detalhe de lista · Abertura por posição | 16 | 16 | 0 | 0 | 4/4 | Confirmada | Regressão relevante |
| Detalhe de lista · Página 2 por posição | 8 | 8 | 0 | 0 | 4/4 | Confirmada | Regressão relevante |
| Watchlist · Abertura aquecida | 16 | 16 | 0 | 0 | 4/4 | Confirmada | Regressão relevante |
| Watchlist · Filtro Action | 8 | 8 | 0 | 0 | 4/4 | Confirmada | Regressão relevante |

Na retomada, usaram-se os blocos A/B, B/A, B/A e A/B, JVM nova por minibloco, duas aberturas válidas planejadas por cenário e um controle por minibloco quando aplicável. A qualificação separada permitiu bloquear um cenário específico antes da coleta e qualificar os restantes. A regra de aquecimento de 15 a 30 ciclos, janelas de cinco e tolerância max(5 ms, 10%) ficou inalterada. Não houve reposição de amostras. A comparação temporal usa quatro pares completos para classificar relevância prática nas duas ordens. Os limiares são 5 ms e 5% para HTTP e 10 ms e 5% para H.

Aquecimento JVM no v4 registrou 135 ciclos completos e 80 aberturas de navegador válidas fora das distribuições. A retomada chegou ao encerramento dos blocos elegíveis. Gates de aquecimento [acervo local (warm-gates.ndjson)]

| Operação | Sonda GETs A → B | Leituras SQL A → B | JSON diagnóstico (B) A → B | Replay diagnóstico A → B |
|---|---:|---:|---:|---:|
| Feed social · Abertura | 2 → 2 | 39 → 37 | 61.841 → 61.841 | 4 → 4 |
| Meus Picks · Abertura | 3 → 3 | 29 → 20 | 23.884 → 5.741 | 4 → 0 |
| Reviews do diário · Abertura | 3 → 3 | 47 → 34 | 33.630 → 29.289 | 15 → 15 |
| Notificações · Abertura com fundo padrão | 3 → 3 | 57 → 21 | 21.938 → 16.648 | 0 → 0 |
| Detalhe de lista · Abertura por posição | 3 → 3 | 49 → 49 | 40.718 → 40.718 | 48 → 48 |
| Detalhe de lista · Página 2 por posição | 1 → 1 | 30 → 29 | 23.708 → 23.708 | 0 → 0 |
| Watchlist · Abertura aquecida | 3 → 2 | 69 → 36 | 294.079 → 19.022 | 276 → 276 |
| Watchlist · Filtro Action | 1 → 1 | 13 → 13 | 13.588 → 13.588 | 0 → 0 |
| Histórico do Diário · Sonda complementar | 3 → 3 | 46 → 34 | 59.675 → 55.334 | 0 → 0 |
| Explorar Picks · Sonda complementar | 4 → 3 | 42 → 28 | 6.276 → 3.890 | 0 → 0 |

As sondas concluídas na primeira rodada foram reaproveitadas. Na lista, o comparativo de cardinalidade permaneceu em 33 → 15 séries na primeira página e 33 → 18 na segunda. A única sonda elegível para execução na retomada era a listagem de Meus Picks, ausente da primeira rodada. Leituras de linhas físicas pelo PostgreSQL ficam sem medição. O total de bytes da sonda e o corpo capturado no navegador descrevem pontos diferentes.

| Operação | Métrica | Mediana A | Mediana B | B − A | Δ pares 1 / 2 / 3 / 4 | Δ por ordem AB / BA |
|---|---|---:|---:|---:|---:|---:|
| Feed social · Abertura | H | 278,26 | 277,44 | -0,82 (-0,29%) | 7,13 / -61,17 / 14,09 / -1,00 | 3,07 / -23,54 |
| Feed social · Abertura | GET principal | 81,51 | 83,70 | 2,19 (2,69%) | 2,71 / -3,28 / 4,79 / 0,32 | 1,52 / 0,76 |
| Feed social · Abertura | TTFB | 52,92 | 54,01 | 1,09 (2,06%) | 2,60 / -11,66 / 0,46 / 0,78 | 1,69 / -5,60 |
| Feed social · Abertura | GETs | 2 | 2 | 0,00 (0,00%) | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Feed social · Abertura | Corpos HTTP (B) | 61.956 | 61.963 | 7,00 (0,01%) | -3,50 / -7,00 / 24,50 / 7,00 | 1,75 / 8,75 |
| Feed social · Abertura | Replay | 0 | 0 | 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Meus Picks · Abertura | H | 250,38 | 248,41 | -1,97 (-0,79%) | -9,00 / -13,11 / 4,36 / 12,39 | 1,70 / -4,38 |
| Meus Picks · Abertura | GET principal | 79,09 | 56,11 | -22,99 (-29,06%) | -44,77 / 7,46 / -5,92 / -26,00 | -35,39 / 0,77 |
| Meus Picks · Abertura | TTFB | 24,67 | 15,76 | -8,91 (-36,13%) | -9,93 / -12,55 / -7,12 / -8,97 | -9,45 / -9,83 |
| Meus Picks · Abertura | GETs | 3 | 3 | 0,00 (0,00%) | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Meus Picks · Abertura | Corpos HTTP (B) | 23.943 | 5.764 | -18.179,00 (-75,93%) | -18.179,00 / -18.179,00 / -18.179,00 / -18.179,00 | -18.179,00 / -18.179,00 |
| Meus Picks · Abertura | Replay | 0 | 0 | 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Detalhe de Pick · Clique aquecido | H | 124,44 | 132,29 | 7,86 (6,31%) | 8,13 / -30,96 / 14,31 / 5,40 | 6,77 / -8,33 |
| Detalhe de Pick · Clique aquecido | GET principal | 30,88 | 33,89 | 3,02 (9,77%) | 2,74 / -1,17 / 2,87 / 3,18 | 2,96 / 0,85 |
| Detalhe de Pick · Clique aquecido | TTFB | 23,16 | 25,16 | 2,00 (8,65%) | 1,44 / -0,92 / 1,99 / 2,30 | 1,87 / 0,53 |
| Detalhe de Pick · Clique aquecido | GET auxiliar | 17,48 | 19,55 | 2,07 (11,82%) | 1,78 / -1,30 / 1,30 / 2,36 | 2,07 / 0,00 |
| Detalhe de Pick · Clique aquecido | GETs | 2 | 2 | 0,00 (0,00%) | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Detalhe de Pick · Clique aquecido | Corpos HTTP (B) | 2.387 | 2.387 | 0,00 (0,00%) | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Detalhe de Pick · Clique aquecido | Replay | 0 | 0 | 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Reviews do diário · Abertura | H | 277,33 | 283,93 | 6,61 (2,38%) | -3,60 / 9,42 / -1,21 / 20,38 | 8,39 / 4,11 |
| Reviews do diário · Abertura | GET principal | 67,01 | 69,43 | 2,42 (3,61%) | 2,78 / 4,59 / -13,86 / 17,22 | 10,00 / -4,63 |
| Reviews do diário · Abertura | TTFB | 31,86 | 34,79 | 2,93 (9,19%) | 3,73 / 3,18 / -2,89 / 3,93 | 3,83 / 0,14 |
| Reviews do diário · Abertura | GET auxiliar | 73,31 | 51,44 | -21,86 (-29,83%) | -23,57 / -22,17 / -35,41 / -9,78 | -16,68 / -28,79 |
| Reviews do diário · Abertura | GETs | 3 | 3 | 0,00 (0,00%) | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Reviews do diário · Abertura | Corpos HTTP (B) | 33.698 | 29.355 | -4.343,00 (-12,89%) | -4.332,50 / -4.343,00 / -4.339,50 / -4.350,00 | -4.341,25 / -4.341,25 |
| Reviews do diário · Abertura | Replay | 0 | 0 | 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Notificações · Abertura com fundo padrão | H | 230,33 | 226,03 | -4,30 (-1,87%) | -5,78 / -0,53 / 9,35 / -63,53 | -34,65 / 4,41 |
| Notificações · Abertura com fundo padrão | GET principal | 54,95 | 52,40 | -2,55 (-4,64%) | -2,01 / -15,00 / 13,37 / -12,78 | -7,40 / -0,82 |
| Notificações · Abertura com fundo padrão | TTFB | 12,27 | 12,59 | 0,31 (2,55%) | 0,51 / -1,55 / 1,73 / -0,74 | -0,12 / 0,09 |
| Notificações · Abertura com fundo padrão | GET auxiliar | 116,56 | 48,93 | -67,63 (-58,03%) | -64,04 / -83,05 / -52,37 / -95,11 | -79,58 / -67,71 |
| Notificações · Abertura com fundo padrão | Seleção do fundo | 253,11 | 184,13 | -68,99 (-27,26%) | -59,67 / -69,61 / -54,53 / -138,17 | -98,92 / -62,07 |
| Notificações · Abertura com fundo padrão | GETs | 3 | 3 | 0,00 (0,00%) | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Notificações · Abertura com fundo padrão | Corpos HTTP (B) | 21.991 | 16.699 | -5.292,00 (-24,06%) | -5.292,00 / -5.292,00 / -5.292,00 / -5.292,00 | -5.292,00 / -5.292,00 |
| Notificações · Abertura com fundo padrão | Replay | 0 | 0 | 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Detalhe de lista · Abertura por posição | H | 352,47 | 394,40 | 41,93 (11,90%) | 27,97 / 25,79 / 59,48 / 38,07 | 33,02 / 42,63 |
| Detalhe de lista · Abertura por posição | GET principal | 97,19 | 104,95 | 7,76 (7,99%) | 7,45 / 10,08 / 23,98 / 6,10 | 6,77 / 17,03 |
| Detalhe de lista · Abertura por posição | TTFB | 71,01 | 79,53 | 8,52 (12,00%) | -4,67 / 0,70 / 16,05 / 17,95 | 6,64 / 8,37 |
| Detalhe de lista · Abertura por posição | GET auxiliar | 31,79 | 33,81 | 2,02 (6,36%) | 12,30 / 10,66 / 14,74 / -10,67 | 0,81 / 12,70 |
| Detalhe de lista · Abertura por posição | GETs | 3 | 3 | 0,00 (0,00%) | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Detalhe de lista · Abertura por posição | Corpos HTTP (B) | 40.800 | 40.807 | 7,00 (0,02%) | 3,50 / 0,00 / -3,50 / 7,00 | 5,25 / -1,75 |
| Detalhe de lista · Abertura por posição | Replay | 0 | 0 | 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Detalhe de lista · Página 2 por posição | H | 116,45 | 128,54 | 12,09 (10,38%) | -2,31 / 15,12 / 17,88 / 22,56 | 10,13 / 16,50 |
| Detalhe de lista · Página 2 por posição | GET principal | 65,96 | 75,25 | 9,28 (14,07%) | 2,77 / 9,82 / 14,73 / 5,37 | 4,07 / 12,27 |
| Detalhe de lista · Página 2 por posição | TTFB | 63,53 | 72,47 | 8,94 (14,07%) | 2,47 / 10,00 / 14,21 / 5,42 | 3,94 / 12,11 |
| Detalhe de lista · Página 2 por posição | GETs | 1 | 1 | 0,00 (0,00%) | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Detalhe de lista · Página 2 por posição | Corpos HTTP (B) | 23.744 | 23.744 | 0,00 (0,00%) | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Detalhe de lista · Página 2 por posição | Replay | 0 | 0 | 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Watchlist · Abertura aquecida | H | 444,47 | 408,79 | -35,68 (-8,03%) | -48,72 / -21,83 / -26,40 / -28,07 | -38,40 / -24,11 |
| Watchlist · Abertura aquecida | GET principal | 129,68 | 142,22 | 12,54 (9,67%) | 3,44 / 15,50 / 14,69 / 21,16 | 12,30 / 15,09 |
| Watchlist · Abertura aquecida | TTFB | 100,31 | 107,48 | 7,18 (7,15%) | 4,29 / 8,66 / 15,08 / 18,22 | 11,26 / 11,87 |
| Watchlist · Abertura aquecida | GET auxiliar | 221,43 | — | — | — / — / — / — | — / — |
| Watchlist · Abertura aquecida | GETs | 3 | 2 | -1,00 (-33,33%) | -1,00 / -1,00 / -1,00 / -1,00 | -1,00 / -1,00 |
| Watchlist · Abertura aquecida | Corpos HTTP (B) | 294.508 | 19.069 | -275.439,00 (-93,53%) | -275.463,50 / -275.442,50 / -275.411,00 / -275.481,00 | -275.472,25 / -275.426,75 |
| Watchlist · Abertura aquecida | Replay | 0 | 0 | 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Watchlist · Filtro Action | H | 131,85 | 152,62 | 20,78 (15,76%) | 22,38 / 3,39 / 32,97 / 19,95 | 21,17 / 18,18 |
| Watchlist · Filtro Action | GET principal | 31,81 | 44,69 | 12,88 (40,51%) | 7,93 / 12,65 / 16,40 / 12,63 | 10,28 / 14,53 |
| Watchlist · Filtro Action | TTFB | 29,52 | 42,63 | 13,10 (44,37%) | 8,19 / 12,44 / 15,70 / 13,12 | 10,65 / 14,07 |
| Watchlist · Filtro Action | GETs | 1 | 1 | 0,00 (0,00%) | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Watchlist · Filtro Action | Corpos HTTP (B) | 13.616 | 13.616 | 0,00 (0,00%) | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Watchlist · Filtro Action | Replay | 0 | 0 | 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |

As estatísticas preservam, por operação, os pares e as medianas por minibloco, IQR, CV, mínimo, máximo e percentis exploratórios. Dados de aquecimento, qualificação e sondas ficaram fora das distribuições oficiais. Estatísticas consolidadas [acervo local (consolidated-statistics.json)]

No clique com mídia aquecida, H acumulado da mesma jornada ficou em 364,99 → 386,39 ms, excluindo o intervalo entre as ações. As preparações do clique ficam fora das distribuições. O comportamento frio permanece descrito separadamente na 5F4.

No v4, os GETs auxiliares de Reviews e Notificações melhoraram acima dos limiares práticos, sem melhora relevante de H. Feed e Meus Picks mantiveram a redução estrutural sem melhora temporal consistente nas duas ordens. O controle aquecido de Meus Picks não atingiu os limiares de piora. A abertura e a página 2 de Detalhe de lista foram mais lentas tanto em H quanto no GET principal, apesar dos lotes de médias menores. Os sinais justificam revisão na 5N3, com a atribuição limitada à comparação dos pacotes preservados. O par específico da 5M3 respondeu a uma pergunta diferente, com Angular compartilhado. [Validação isolada da 5M3](05m3-validacao-benchmark-detalhe-lista.md)

### Watchlist e prioridades para a 5N3

A abertura melhorou nas duas comparações. Na 5I3, H passou de 425,68 para 387,69 ms, com GET principal de 114,30 para 132,80 ms e sondas das rotas da Watchlist de 54 para 21 leituras e 293.486 para 18.432 B. Na 5N2, H passou de 444,47 para 408,79 ms, com GET principal de 129,68 para 142,22 ms. A sonda da 5N2 incluiu a sessão e registrou 69 → 36 leituras e 294.079 → 19.022 B. Não comparar diretamente as duas contagens de SQL com escopos distintos.

O filtro Action é a questão prioritária para avaliação na 5N3. Na 5N2, H passou de 131,85 para 152,62 ms, com piora nas duas ordens e SQL e JSON estáveis na sonda. A recomendação continua **manter provisoriamente** devido à redução de trabalho na abertura, ao GET principal mais lento e à regressão do filtro. A diferença de empacotamento Angular impede atribuição exclusiva das diferenças temporais. O recorte de snapshots frios segue sem comparação controlada. [Watchlist 5I3](05i3-validacao-benchmark-watchlist.md)

### Integridade e encerramento definitivo

Guard final da retomada aprovado, com 425 verificações registradas e 2 logins normais. Os fingerprints de negócio, credenciais, snapshots e sequências ficaram preservados quando atestados pelo guard. Os deltas operacionais deste turno foram registrados em separado.
- login wwhyb1001 · sessões 46 → 47, limitador 3 → 3 linhas, com alteração de fingerprint.
- login wwb3reviews1 · sessões 47 → 48, limitador 3 → 3 linhas, com alteração de fingerprint.

Brutos Playwright [acervo local (browser.ndjson)] · Sonda Meus Picks [acervo local (sql.ndjson)] · Deltas de autenticação [acervo local (operational.ndjson)] · Guard final [acervo local (final.json)]

O PostgreSQL e o replay permaneceram disponíveis. Os processos temporários foram encerrados e os artefatos preservados. A referência do CSV antes da retomada foi guardada junto aos brutos. A 5N2 fica encerrada com as evidências obtidas. As decisões da 5N3 devem usar a cobertura efetiva, incluindo as limitações desta rodada. [CSV consolidado](05n2-resultados-acumulados.csv) · [Matriz consolidada](04b7-matriz-cobertura.csv)
