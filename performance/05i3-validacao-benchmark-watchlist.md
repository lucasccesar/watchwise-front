# 5I3 — Validação e benchmark da Watchlist

## Resumo executivo

**Manter provisoriamente.** B preservou a equivalência funcional, eliminou o GET auxiliar e reduziu as leituras da abertura de 54 para 21. O conteúdo útil na abertura melhorou de 425,68 para 387,69 ms, redução de 38,00 ms (8,93%). O GET principal ficou 18,50 ms mais lento na abertura e também piorou nos controles exploratórios de filtro e paginação. O atraso no endpoint não gerou piora acima do limiar prático de H nas duas interações. Houve 80 observações oficiais válidas e zero inválidas, com integridade preservada.

## Ambiente, artefatos e testes de A

A comparação usou exclusivamente o clone `watchwise_benchmark_watchlist_5i` em `127.0.0.1:15433`, a persona sintética `wwhyb1067` e o replay local em `127.0.0.1:18091`. A API temporária ouviu em `127.0.0.1:8082`, e o Chromium 159.0.8154.6 acessou o proxy em `http://localhost:3001`. Cada navegação direta teve um contexto novo do navegador. As interações aproveitaram o contexto da própria abertura. Houve um login normal HTTP 200, identidade conferida por `/users/me` e HTTP 401 sem sessão. O token permaneceu em memória para reutilização entre os JARs. Migrations, seeds e jobs de reconciliação foram desabilitados. O browser só pôde alcançar a origem local por leitura. O catálogo do replay foi conferido pelo hash histórico e cobriu as 276 referências. Ambiente [acervo local (first-environment.json)] · Autenticação [acervo local (first-authentication.json)]

| Versão | JAR SHA-256 | Angular SHA-256 |
| --- | --- | --- |
| A | `517c9f35df9df4ffe547f17f6a2c40434c694fa2fe7d83ec2720bbd781969901` | `cfad6a997859d8f10393bbda816737a171bb4c04d37d8e42c0190d32b57f44a5` |
| B | `a9d20058a4a9fd9568e32b8b81d8415dc6d39074ed8f41b80f82308be378c23e` | `145f4efb3a41839ad60c4abc11bb2061deb4f6e951cd203e257b9cddafffdb39` |

Foram usados os builds Angular compilados sob as mesmas condições na 5I2. As verificações de hash e a comparação de classes e fontes da 5I2 sustentam que o par difere somente no fluxo de Watchlist e preserva as oito otimizações anteriores. A execução restrita dos dois testes Angular afetados nas fontes preservadas de A reproduziu as mesmas 20 falhas de providers, para `ToastNotificationsService` e `ContentApiService`. Os testes de Diário e Picks ficaram intocados. Artefatos e origem [acervo local (05i2-otimizacao-generos-watchlist.md)] · Falhas reproduzidas em A [acervo local (frontend-A-affected.log)]

## Snapshots e integridade inicial

O clone coincidiu com o guard final da 5I1. Havia 291 snapshots de lançamento globais, geração 2.596. As 276 chaves da persona tinham status `FOUND` e data disponível, com 37 filmes na região US e 239 séries sem recorte regional. Não havia ausentes nem vencidos. O menor prazo restante na pré-checagem era de aproximadamente 23 h e 22 min. A preparação não precisou renovar snapshots. O guard exige que esses registros e a sequência permaneçam estáveis inclusive durante o aquecimento e as sondas. Inventário inicial [acervo local (initial-inventory.json)]

## Equivalência funcional

Todas as 18 observações diagnósticas de navegador passaram, nove por versão. Cada lado fez duas aberturas diretas. A jornada funcional também qualificou a página 2 sem IDs repetidos da primeira, `Action` com 13 cartões, remoção do filtro, 37 filmes, 239 séries e a combinação vazia de `Western` com filmes. A coleção inteira permaneceu com 276 itens. Os 20 nomes e a ordem em `pt-BR` coincidiram no DOM. Em A, a referência foi a união dos gêneros dos 276 cartões do GET auxiliar. Em B, foi o `availableGenres` do GET principal. O campo `availableGenres` foi explicitamente excluído da comparação integral do envelope principal porque sua semântica de transporte foi alterada. Os nomes e ordem do menu foram validados à parte, e todos os demais campos foram comparados canonicamente, inclusive cards, estado de usuário, total, ordem, paginação e datas. A lista continha dez mídias de gênero local nulo, portanto o recorte inclui fallback de metadados.

O contrato legado usado pelo Perfil, sem o opt-in de B, recuperou os mesmos 276 cartões e produziu o mesmo menu nos dois JARs. A tela de Perfil não foi navegada no Chromium. A visibilidade foi verificada com a sessão sintética e resposta anônima 401. A política de acesso privada foi preservada pelo caminho de autorização compartilhado e pelos testes da 5I2, sem criar conta ou modificar privacidade para um teste adicional. A Watchlist não fornece busca textual. Contratos [acervo local (first-contracts.ndjson)] · Observações do navegador [acervo local (first-browser.ndjson)]

## SQL real e volume

As sondas SQL ocorreram em JVMs separadas, após preparação de cache e fora das janelas temporizadas. O executor coletou as instruções de sessão nos logs do PostgreSQL, separando a consulta principal e a auxiliar. O aquecimento antecedeu as sondas. Os valores são leituras executadas, sem tempos Hibernate.

| Operação | A · leituras | B · leituras | A · cartões retornados | B · cartões retornados | A · JSON | B · JSON |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| GET principal | 21 | 21 | 18 | 18 | 18.432 B | 18.432 B |
| GET auxiliar de gêneros | 33 | — | 276 | — | 275.054 B | — |
| Abertura acumulada | **54** | **21** | **294** | **18** | **293.486 B** | **18.432 B** |
| Filtro `Action` | 13 | 13 | 13 | 13 | 13.588 B | 13.588 B |
| Página 2 sem filtro | 21 | 21 | 18 | 18 | 18.420 B | 18.420 B |

A redução líquida observada foi de **33 leituras (61,11%)**, **276 cartões retornados (93,88%)** e **275.054 bytes de JSON de Watchlist (93,72%)** por abertura. O GET principal selecionou a coleção e os snapshots de filme/série em ambos os lados. A paginação e os totais são calculados sobre o conjunto em memória. O GET auxiliar duplicava seleção, snapshots e enriquecimento de cartões, incluindo estatísticas e estado do usuário. B não acrescentou leitura SQL dedicada aos gêneros. Os testes estruturais da 5I2 demonstram que o assembler auxiliar de 276 cartões sai do caminho, mas a contagem total de DTOs intermediários materializados pelo agregado do GET principal não foi instrumentada. Não houve novas resoluções **externas** nem chamadas ao replay nessas sondas. Eventuais resoluções atendidas pelo cache da JVM não foram contadas. Não houve geração ou renovação de snapshots. SQL bruto [acervo local (first-sql.ndjson)]

## Protocolo e resultados oficiais

Foram executados os quatro pares previstos, A/B, B/A, B/A e A/B. Cada minibloco usou JVM e proxy temporários próprios. A JVM realizou entre 15 e 25 operações até estabilizar pelas medianas das duas janelas de cinco, com tolerância de `max(5 ms, 10% da mediana anterior)` e zero chamadas ao replay na janela final. Os oito miniblocos usaram, na ordem, **20, 15, 20, 25, 25, 20, 20, 15** operações. O protocolo interromperia a coleta ao primeiro erro, divergência funcional, alteração de snapshot ou falha de estabilização. Houve 16 aquecimentos de navegador válidos e fora das distribuições oficiais.

A coleta teve **48 aberturas, 16 aplicações de `Action` e 16 avanços à página 2**, sem instrumentação SQL ou tempos Hibernate. Em cada minibloco, as duas primeiras aberturas antecederam os filtros e as duas seguintes antecederam as paginações. As interações são controles exploratórios condicionados às respectivas aberturas. O coletor histórico `observe` cronometrou da ação até o conteúdo útil. A prontidão exigiu o primeiro título esperado visível e as 20 opções do filtro disponíveis no menu, com a mesma abertura de menu por Playwright em A e B. A marca separada de título do executor foi consultada após a espera pelas respostas esperadas. Ela não permite decompor a renderização do cartão independentemente do auxiliar em A e ficou fora da conclusão de latência. Protocolo registrado [acervo local (first-protocol.json)] · Aquecimento bruto [acervo local (first-warmup.ndjson)] · Amostras [acervo local (first-browser.ndjson)]

### Distribuições em milissegundos

| Cenário e métrica | Versão | n | Mediana | Média | Mín. | Máx. | IQR | p75 | p90 | B − A na mediana |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Abertura · H | A | 24 | 425,68 | 421,66 | 387,68 | 454,19 | 40,65 | 442,00 | 447,91 | — |
| Abertura · H | B | 24 | 387,69 | 385,96 | 340,27 | 458,58 | 19,83 | 393,14 | 408,41 | -38,00 (-8,93%) |
| Abertura · GET principal | A | 24 | 114,30 | 118,91 | 101,06 | 135,94 | 23,13 | 130,78 | 133,91 | — |
| Abertura · GET principal | B | 24 | 132,80 | 130,22 | 104,99 | 175,11 | 19,04 | 136,20 | 144,05 | 18,50 (16,19%) |
| Abertura · GET auxiliar | A | 24 | 216,90 | 211,93 | 182,87 | 240,87 | 32,11 | 226,15 | 237,04 | — |
| Abertura · TTFB principal | A | 24 | 98,86 | 98,80 | 90,81 | 105,66 | 5,70 | 102,00 | 102,91 | — |
| Abertura · TTFB principal | B | 24 | 104,13 | 105,31 | 96,05 | 132,90 | 5,01 | 106,36 | 112,73 | 5,27 (5,33%) |
| Abertura · TTFB auxiliar | A | 24 | 184,03 | 189,35 | 170,65 | 229,08 | 18,66 | 196,34 | 218,79 | — |
| Filtro · H | A | 8 | 133,42 | 136,40 | 130,97 | 144,46 | 8,15 | 141,05 | 143,76 | — |
| Filtro · H | B | 8 | 140,06 | 142,02 | 125,63 | 157,89 | 7,79 | 146,23 | 154,36 | 6,63 (4,97%) |
| Filtro · GET principal | A | 8 | 31,42 | 32,14 | 30,62 | 35,74 | 1,78 | 32,75 | 34,26 | — |
| Filtro · GET principal | B | 8 | 39,58 | 39,98 | 35,69 | 45,40 | 6,92 | 43,25 | 44,42 | 8,16 (25,97%) |
| Filtro · TTFB principal | A | 8 | 29,36 | 30,06 | 28,57 | 33,69 | 1,79 | 30,67 | 32,13 | — |
| Filtro · TTFB principal | B | 8 | 37,24 | 37,74 | 33,64 | 43,21 | 6,83 | 40,96 | 42,28 | 7,88 (26,85%) |
| Página 2 · H | A | 8 | 218,80 | 219,30 | 211,48 | 225,39 | 8,33 | 224,54 | 225,26 | — |
| Página 2 · H | B | 8 | 221,66 | 222,35 | 209,53 | 240,17 | 18,10 | 228,74 | 239,81 | 2,86 (1,31%) |
| Página 2 · GET principal | A | 8 | 95,05 | 94,77 | 90,30 | 99,05 | 4,53 | 96,90 | 98,26 | — |
| Página 2 · GET principal | B | 8 | 102,99 | 103,88 | 96,73 | 111,10 | 6,03 | 107,37 | 110,05 | 7,93 (8,35%) |
| Página 2 · TTFB principal | A | 8 | 92,85 | 92,61 | 88,10 | 96,98 | 4,61 | 94,77 | 96,20 | — |
| Página 2 · TTFB principal | B | 8 | 100,72 | 101,66 | 94,59 | 108,90 | 6,08 | 105,19 | 107,78 | 7,87 (8,48%) |

| Par | Ordem | H abertura A → B | Δ | GET principal abertura A → B | Δ | H filtro A → B | Δ | H página 2 A → B | Δ |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | AB | 401,47 → 389,20 | -12,27 (-3,06%) | 111,05 → 133,48 | 22,43 (20,20%) | 132,14 → 134,83 | 2,69 (2,03%) | 218,35 → 224,60 | 6,25 (2,86%) |
| 2 | BA | 424,98 → 376,96 | -48,02 (-11,30%) | 118,42 → 123,97 | 5,55 (4,68%) | 137,76 → 137,85 | 0,09 (0,07%) | 218,00 → 217,64 | -0,36 (-0,16%) |
| 3 | BA | 432,41 → 377,45 | -54,96 (-12,71%) | 122,06 → 128,93 | 6,87 (5,62%) | 136,70 → 146,73 | 10,03 (7,33%) | 221,57 → 232,16 | 10,59 (4,78%) |
| 4 | AB | 432,08 → 387,69 | -44,39 (-10,27%) | 127,76 → 134,85 | 7,08 (5,54%) | 139,00 → 148,70 | 9,70 (6,98%) | 219,30 → 214,99 | -4,31 (-1,97%) |

| Comparação de ordem | Mediana dos deltas A/B | Mediana dos deltas B/A |
| --- | ---: | ---: |
| Abertura · H | -28,33 | -51,49 |
| Abertura · GET principal | 14,76 | 6,21 |
| Filtro · H | 6,19 | 5,06 |
| Filtro · GET principal | 7,42 | 8,25 |
| Página 2 · H | 0,97 | 5,12 |
| Página 2 · GET principal | 9,44 | 8,78 |

As medianas A e B em cada par correspondem aos respectivos miniblocos. O JSON estatístico [acervo local (first-statistics.json)] conserva as medianas por minibloco e as diferenças por par também para GETs e TTFB do filtro e da paginação. Os limiares práticos foram 5 ms e 5% no HTTP, e 10 ms e 5% em H, com a mesma direção nas duas ordens. São critérios operacionais, sem inferência de significância estatística.

### Consolidação

| Métrica | A | B | B − A |
| --- | ---: | ---: | ---: |
| GETs de Watchlist / API na abertura | 2 / 3 | 1 / 2 | −1 / −1 |
| Cartões retornados na abertura | 294 | 18 | −276 |
| Leituras SQL acumuladas dos GETs de Watchlist | 54 | 21 | −33 |
| Bytes de JSON dos GETs de Watchlist | 293.486 | 18.432 | −275.054 |
| Bytes de corpo dos GETs da API segundo `request.sizes()` | 294.498 | 19.069 | -275.429 |
| Resoluções externas de mídia após aquecimento | 0 | 0 | 0 |
| Chamadas ao replay nas amostras oficiais | 0 | 0 | 0 |
| Alterações de snapshots | 0 | 0 | 0 |
| Latência mediana do GET principal na abertura | 114,30 ms | 132,80 ms | +18,50 ms |
| Conteúdo útil · abertura | 425,68 ms | 387,69 ms | -38,00 ms |
| Conteúdo útil · filtro | 133,42 ms | 140,06 ms | +6,63 ms |
| Conteúdo útil · página 2 | 218,80 ms | 221,66 ms | +2,86 ms |
| Gêneros disponíveis | 20 | 20 | 0 |
| Equivalência funcional | Aprovada | Aprovada | Mesmos cartões, gêneros, filtros e paginação |

Os GETs totais de API incluem a checagem da sessão em `/users/me`. A métrica de corpo de `request.sizes()` também a inclui e não representa o tráfego de transporte inteiro com cabeçalhos e recursos estáticos. A contagem de SQL acima cobre exclusivamente os GETs de Watchlist. A etapa não instrumentou resoluções de mídia atendidas por cache nem o número total de cartões intermediários de cada GET.

## Caminho crítico e custos deslocados

O auxiliar A foi o último GET de Watchlist a terminar em **24 de 24** aberturas. A mediana do último término de Watchlist desde o começo da observação passou de **336,90 para 250,89 ms**. A diferença entre esse término e a validação de H foi maior em B, de **90,18 para 135,83 ms**. Essa janela inclui a espera pelo DOM, a interação para conferir o menu e o agendamento do navegador. Ela não permite atribuir todo o intervalo a processamento Angular. O GET principal isolado piorou, mas a eliminação do auxiliar antecipou a conclusão do conjunto de respostas necessário às opções. As duas chamadas de A eram concorrentes.

O GET principal da abertura teve piora de **18,50 ms (16,19%)**, na mesma direção nas duas ordens. Filtro e paginação também mostraram piora de HTTP acima do limiar, de **8,16 ms (25,97%)** e **7,93 ms (8,35%)**. O TTFB acompanhou a direção da piora. Nos controles, H variou **+6,63 ms** e **+2,86 ms**, abaixo do limiar prático de conteúdo útil. As leituras, os bytes e a atividade do replay desses controles ficaram iguais. O cálculo de gêneros em B pode adicionar trabalho ao GET principal, inclusive consultas a metadados em memória para os gêneros locais nulos. A evidência confirma SQL e replay estáveis e uma piora do endpoint, mas não consegue isolar essa hipótese de custo Java, proxy e variação temporal.

Não houve deslocamento de chamadas externas para o filtro ou a segunda página no recorte aquecido. O primeiro clique de detalhe não foi medido. A 5F4 mostrou por que aquecimento incidental deve ser avaliado separadamente quando cache frio afeta o clique. Em Watchlist o GET principal ainda resolve snapshots para toda a coleção, e os casos ausentes ou vencidos podem produzir escritas independentemente da remoção do auxiliar. Nesta etapa não houve comparação fria. Uma comparação futura desse tipo exigiria autorização para estados isolados equivalentes entre A e B e para as gravações naturais esperadas. Os tempos do replay local não representam a latência do TMDB real. [Precedente de primeiro clique](05f4-validacao-primeiro-clique-meus-picks.md) · Análise estrutural [acervo local (05i2-otimizacao-generos-watchlist.md)]

## Guards, decisão e próxima prioridade

Os guards do v3 e v4 coincidiram antes e depois. O clone manteve os fingerprints dos dados de negócio, os 276 itens, 291 snapshots globais, as 276 chaves vigentes e a geração 2.596. O menor prazo de validade restante ao final era superior a 23 horas. As mudanças operacionais foram uma sessão sintética adicional no clone e a atualização do limitador de login. Não houve mudança de credenciais, catálogo do replay ou artefatos. Os listeners originais foram preservados, os processos temporários encerrados e as portas 8082 e 3001 liberadas. PostgreSQL e replay permaneceram ativos. Guard operacional [acervo local (first-guards.ndjson)] · Encerramento [acervo local (first-final.json)]

**Manter provisoriamente** pela equivalência, redução líquida de trabalho e melhora prática de H na abertura. A piora consistente do GET principal impede encerrar Watchlist sem ressalva. O próximo candidato da matriz é **Notificações**, com abertura histórica de 205,40 ms e uma oportunidade documentada de examinar o custo do resumo auxiliar da Home. Nenhuma intervenção adicional foi iniciada. [Matriz consolidada](04b7-matriz-cobertura.csv) · [Prioridades históricas](04b7-consolidacao-baselines.md)
