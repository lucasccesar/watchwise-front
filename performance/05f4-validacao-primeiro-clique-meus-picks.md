# Etapa 5F4 · Primeiro clique em Meus Picks

**Manter provisoriamente.** Houve transferência parcial para o detalhe e redução de trabalho na jornada.
A mediana de H do primeiro clique variou 131,42 ms (83,07%). A mediana da soma dos tempos H na mesma jornada variou -67,45 ms (-6,43%).

## Causa e condição inicial

Os quatro descartes na 5F3 têm a mesma chave: filme TMDB `1003596`, variante `card`, idioma `en-US`, todos com 200 no replay local. O registro do GET visual da listagem inclui essa mesma chave entre quatro filmes. O caminho visual antigo monta os previews das seleções em `PickPreviewAssembler` e `PickTargetPreviewAssembler`. `ContentCardAssembler`, por meio do resolver de metadados, chega a `TmdbClient.getCardMetadata`. A leitura MOVIE pede `/movie/{id}?language=en-US`, sem `append_to_response`, e transforma o resultado em título, pôster, data de lançamento, duração, gêneros, fundo e nota média no objeto de metadados do cartão. O cache `tmdbCardMetadataCache` é Caffeine em memória, indexado por chave do alvo e idioma. A rota resumida de B valida a seleção localmente sem esse enriquecimento. O detalhe completo ainda depende dos metadados visuais da resposta. No primeiro clique em B a chave é preenchida pelo detalhe, enquanto em A ela já foi preenchida pela listagem.
Essa diferença no ponto de resolução é esperada para a projeção. A equivalência do conteúdo foi checada separadamente. [5F3](05f3-validacao-benchmark-meus-picks.md) · Assembler [acervo local (PickTargetPreviewAssembler.java)] · Cliente TMDB [acervo local (TmdbClient.java)] · Cache local [acervo local (BudgetedCacheFactory.java)]

Usamos os quatro artefatos A/B da 5F3, com hashes registrados no protocolo. Cada minibloco iniciou uma JVM temporária nova na porta 18082 e um proxy no mesmo localhost:3001. A sessão da persona foi emitida uma vez em uma JVM separada, exclusiva para login, sem chamadas ao replay. Após o login essa JVM foi encerrada. Cada PID medido teve **zero chamadas ao replay antes da listagem**. O Chromium fez a primeira abertura em contexto novo, sem cache HTTP do navegador, e preservou o mesmo documento no clique. Migrations, seeds e jobs permaneceram desabilitados. Nenhum cache persistente, snapshot ou dado foi limpo. A condição é de cache de metadados em memória recém-iniciado, com o PostgreSQL e o replay persistindo entre blocos.

## Protocolo e equivalência

As ordens foram A/B, B/A, B/A e A/B. Cada bloco abriu a listagem, confirmou os mesmos dez cartões por H e clicou no mesmo Pick histórico. Quando a primeira jornada foi válida, a comparação auxiliar voltou à página e repetiu o clique, na mesma JVM e contexto. A soma de H foi calculada por jornada, excluindo o intervalo entre operações. As medições aquecidas não entram nas distribuições de primeiro clique. A espera por JSON e a checagem do DOM adicional ocorreram após H. Não houve instrumentação SQL ou tempos Hibernate nesta etapa.
Os critérios foram registrados antes da coleta. A primeira listagem A admitia as quatro chaves históricas com HTTP 200 e B nenhuma. O primeiro detalhe B admitia a chave do filme com HTTP 200 e A nenhuma. Toda operação posterior deveria ter zero chamadas. Qualquer evento improcedente, erro HTTP ou JavaScript, alteração dos campos e DOM qualificados na 5F3 ou divergência de integridade invalidava a jornada. As amostras descartadas da 5F3 não foram reclassificadas.
Foram observadas 8 primeiras jornadas, com 0 inválidas, e 8 jornadas posteriores, com 0 inválidas. A comparação em cada jornada válida manteve exatamente o Pick, os dez cartões, os contratos canônicos e o JSON e DOM do detalhe da referência.

## Medianas exploratórias

| Recorte | Métrica | A | B | B − A | Diferença (%) |
| --- | --- | ---: | ---: | ---: | ---: |
| Primeiro | H da listagem (ms) | 899,81 | 691,37 | -208,44 | -23,16 |
| Primeiro | GET paginado (ms) | 301,86 | 112,69 | -189,17 | -62,67 |
| Primeiro | TTFB paginado (ms) | 263,52 | 92,03 | -171,49 | -65,08 |
| Primeiro | H do detalhe (ms) | 158,21 | 289,63 | 131,42 | 83,07 |
| Primeiro | GET do detalhe (ms) | 68,95 | 199,62 | 130,68 | 189,52 |
| Primeiro | TTFB do detalhe (ms) | 61,86 | 192,69 | 130,83 | 211,52 |
| Primeiro | Soma dos tempos H da mesma jornada (ms) | 1049,12 | 981,66 | -67,45 | -6,43 |
| Primeiro | Chamadas ao replay na listagem | 4,00 | 0,00 | -4,00 | -100,00 |
| Primeiro | Chamadas ao replay no detalhe | 0,00 | 1,00 | 1,00 | — |
| Primeiro | Chamadas ao replay na jornada | 4,00 | 1,00 | -3,00 | -75,00 |
| Primeiro | Bytes do JSON paginado | 22704,00 | 4561,00 | -18143,00 | -79,91 |
| Primeiro | Bytes dos corpos HTTP da listagem | 23884,00 | 5741,00 | -18143,00 | -75,96 |
| Primeiro | Bytes dos corpos HTTP do detalhe | 2364,00 | 2364,00 | 0,00 | 0,00 |
| Primeiro | Bytes dos corpos HTTP da jornada | 26248,00 | 8105,00 | -18143,00 | -69,12 |
| Posterior aquecido | H da listagem (ms) | 173,84 | 153,64 | -20,19 | -11,61 |
| Posterior aquecido | GET paginado (ms) | 58,28 | 37,51 | -20,77 | -35,64 |
| Posterior aquecido | TTFB paginado (ms) | 50,70 | 30,49 | -20,20 | -39,85 |
| Posterior aquecido | H do detalhe (ms) | 117,61 | 119,83 | 2,21 | 1,88 |
| Posterior aquecido | GET do detalhe (ms) | 40,36 | 47,34 | 6,98 | 17,28 |
| Posterior aquecido | TTFB do detalhe (ms) | 35,64 | 40,47 | 4,83 | 13,55 |
| Posterior aquecido | Soma dos tempos H da mesma jornada (ms) | 289,99 | 273,47 | -16,51 | -5,70 |
| Posterior aquecido | Chamadas ao replay na listagem | 0,00 | 0,00 | 0,00 | — |
| Posterior aquecido | Chamadas ao replay no detalhe | 0,00 | 0,00 | 0,00 | — |
| Posterior aquecido | Chamadas ao replay na jornada | 0,00 | 0,00 | 0,00 | — |
| Posterior aquecido | Bytes do JSON paginado | 22704,00 | 4561,00 | -18143,00 | -79,91 |
| Posterior aquecido | Bytes dos corpos HTTP da listagem | 23884,00 | 5741,00 | -18143,00 | -75,96 |
| Posterior aquecido | Bytes dos corpos HTTP do detalhe | 2364,00 | 2364,00 | 0,00 | 0,00 |
| Posterior aquecido | Bytes dos corpos HTTP da jornada | 26248,00 | 8105,00 | -18143,00 | -69,12 |

## Resultados por par

| Recorte | Par | Ordem | H lista A / B | H detalhe A / B | Δ detalhe (%) | H da jornada A / B | Δ jornada (%) | Replay total A / B |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Primeiro | 1 | A/B | 907,35 / 688,05 | 141,62 / 293,00 | 106,89 | 1048,97 / 981,05 | -6,47 | 4,00 / 1,00 |
| Primeiro | 2 | B/A | 882,87 / 712,22 | 162,93 / 291,68 | 79,02 | 1045,80 / 1003,90 | -4,01 | 4,00 / 1,00 |
| Primeiro | 3 | B/A | 892,27 / 694,69 | 156,99 / 287,59 | 83,19 | 1049,26 / 982,28 | -6,38 | 4,00 / 1,00 |
| Primeiro | 4 | A/B | 911,97 / 682,60 | 159,43 / 284,74 | 78,60 | 1071,40 / 967,34 | -9,71 | 4,00 / 1,00 |
| Posterior aquecido | 1 | A/B | 182,65 / 154,88 | 118,94 / 112,24 | -5,63 | 301,59 / 267,12 | -11,43 | 0,00 / 0,00 |
| Posterior aquecido | 2 | B/A | 171,93 / 153,31 | 117,82 / 118,53 | 0,60 | 289,75 / 271,84 | -6,18 | 0,00 / 0,00 |
| Posterior aquecido | 3 | B/A | 174,86 / 151,41 | 107,33 / 130,63 | 21,71 | 282,19 / 282,04 | -0,05 | 0,00 / 0,00 |
| Posterior aquecido | 4 | A/B | 172,81 / 153,98 | 117,41 / 121,12 | 3,16 | 290,22 / 275,10 | -5,21 | 0,00 / 0,00 |

Na ordem A/B, a mediana dos deltas pareados de H foi 138,34 ms no detalhe e -85,99 ms na jornada.
Na ordem B/A, a mediana dos deltas pareados de H foi 129,67 ms no detalhe e -54,44 ms na jornada.

Critérios exploratórios: preocupação de piora no primeiro clique em H (10 ms e 5%, consistentes nos pares) **sim**. No GET de detalhe (5 ms e 5%, consistentes nos pares) **sim**. Preocupação de piora na soma de H da jornada **não**. A amostra pequena descreve o comportamento local e não garante equivalência temporal.

O replay está no mesmo host, com atraso configurado zero. Seu tempo não estima latência externa, saturação, limites de requisição ou falhas do TMDB real. O experimento confirma onde a chamada ocorre e como muda o número de GETs ao replay. A projeção reduz trabalho e tráfego no percurso medido, mas ambientes com latência externa mais alta podem ampliar a penalidade no primeiro clique. Os dados de cada GET e cada jornada ficam nos brutos.

## Guards e encerramento

V3 preservado, snapshots, sequências e dados de negócio do v4 preservados. `17` registros do guard. Alterações operacionais permitidas: refresh_tokens, shared_limiter_state. Os processos temporários foram encerrados e suas portas liberadas. PostgreSQL e replay permanecem ativos. O estado dos processos originais foi preservado.

**Manter provisoriamente e deixar a decisão de encerramento em aberto.** O primeiro clique piorou nos quatro pares, mesmo com redução da jornada completa. O custo observado inclui a primeira execução do caminho de mídia em B, com inicialização e compilação da JVM. A rodada não isola quanto da diferença vem da chamada ao replay. O clique aquecido preservou o conteúdo e não mostrou piora consistente. O resultado não justifica reintroduzir todo o enriquecimento da listagem.

Protocolo prévio [acervo local (protocol.json)] · Jornadas brutas [acervo local (journeys.ndjson)] · Análise [acervo local (analysis.json)] · Guard [acervo local (guard.ndjson)] · Estado final [acervo local (final.json)] · [Matriz consolidada](04b7-matriz-cobertura.csv)
