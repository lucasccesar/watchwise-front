# 5L3 — Validação e benchmark do fundo de Notificações

**Manter provisoriamente.** Coleta oficial incompleta, com 36 aberturas e 12 paginações válidas. O total observado foi de 60 para 22 leituras SQL e de 21.938 para 16.648 bytes de JSON na abertura. H da abertura foi de 210,36 para 211,06 ms.

## Ambiente, integridade e equivalência

A usou o resumo da Home e B usou a rota dedicada. Os artefatos da 5L2 foram verificados antes e depois da execução, sem recompilação. O JAR A tem SHA-256 a9d20058a4a9fd9568e32b8b81d8415dc6d39074ed8f41b80f82308be378c23e e o B 38b865572646b83d5d2f5f2c8ef69d14b3a9b9af4d410224183acce97000e688. O Angular A tem hash de árvore 2e43c778ee819bfde2e9f799027ef826933d096019778dc85e43f5eb60c704f5 e o B dbca8c2a9f9c01e2456a6991454831b5d10a54fbdb80347a226baa1e8e2faa89. Relatório 5L2 [acervo local (05l2-otimizacao-fundo-notificacoes.md)] · Protocolo [acervo local (resume-protocol.json)]

O v4 foi usado exclusivamente em 127.0.0.1:15433, com replay histórico em 127.0.0.1:18091, API temporária em 8082 e proxy localhost:3001. O manifesto do replay conservou o hash aprovado. As JVMs de leitura receberam conexões somente leitura, seeds, migrations, workers e crons desabilitados. A persona sintética não tem episódios registrados nem itens na Watchlist, e os guards mantiveram a geração de snapshots em 2.093. A sessão assinada ficou em memória. Estado inicial [acervo local (initial.json)] · Guard final [acervo local (resume-execution-final.json)]

A primeira tentativa foi encerrada durante a qualificação, pois o auxiliar esperava só listas na página 2. Uma inspeção somente leitura confirmou 18 Picks e duas listas. A retomada verificou os links correspondentes e a igualdade integral do JSON, mantendo a tentativa anterior separada. Foram necessários dois logins normais porque a primeira sessão foi descartada com o executor. As sessões passaram de 40 → 42 e o limitador conservou 3 linhas, com hash alterado. Nenhuma outra tabela nem sequência mudou. Motivo inicial [acervo local (failure.json)] · Deltas iniciais [acervo local (operational.json)] · Deltas da retomada [acervo local (resume-operational.json)] · Guards de execução [acervo local (resume-guard.ndjson)]

A qualificação aprovada incluiu duas aberturas por versão e uma paginação por versão. Foram confirmadas 300 notificações, 100 não lidas, sete não lidas na primeira página, 20 cartões inicialmente e 40 após carregar mais. A identidade, a ordem, os links, os títulos, o estado de leitura e o contrato integral da lista foram equivalentes nas duas versões. B retornou somente o campo nulo esperado e não chamou o resumo completo. O skeleton pertence à lista, e o banner pôde atualizar separadamente. Os GETs esperados retornaram HTTP 200, sem erros locais de JavaScript.

O fundo personalizado foi validado separadamente pelas provas controladas da 5L2. O backend cobriu filme, série-pai, idioma preferido, ausência e indisponibilidade de metadados. O Angular verificou o caminho personalizado, o valor nulo, respostas tardias, falha e cancelamento. O caso integrado atual usou fundo padrão. O navegador bloqueou a CDN externa e o momento registrado é a seleção do src da imagem padrão no DOM, sem download ou confirmação de pixels. Provas 5L2 [acervo local (05l2-otimizacao-fundo-notificacoes.md)] · Equivalência e amostras [acervo local (resume-browser.ndjson)]

## SQL real e payload

Uma sonda por operação e por versão em JVM diagnóstica própria, na sequência sessão, fundo e listagem. Os corpos JSON abaixo são sem compressão e os totais acumulam essas três operações. A instrumentação SQL foi desabilitada na coleta oficial. Foram 38 leituras a menos na abertura (63,33%) ou 35 a menos sem as consultas de catálogo (56 → 21). Os corpos JSON somados caíram 5.290 B (24,11%).

| Métrica da sonda | A | B | Diferença B − A |
| --- | ---: | ---: | ---: |
| Leituras SQL do fundo | 43 | 5 | -38 |
| Leituras SQL do fundo sem consultas ao catálogo PostgreSQL | 39 | 4 | -35 |
| Leituras SQL da listagem | 6 | 6 | 0 |
| Leituras SQL acumuladas | 60 | 22 | -38 |
| Bytes do fundo | 5.324 | 34 | -5.290 |
| Bytes da listagem | 15.515 | 15.515 | 0 |
| Bytes acumulados | 21.938 | 16.648 | -5.290 |
| Chamadas ao replay na abertura fria | 4 | 1 | -3 |
| GETs na abertura oficial | 3 | 3 | 0 |

Nas sondas, B deixou de consultar conjuntos da Home ligados a progresso, Watchlist/Calendário, Feed, agregados do Diário, cartões, companhias e indicador de notificações. Permaneceu a resolução dos metadados do filme necessário à escolha do fundo. O número de requisições ao replay mede cache misses externos à aplicação para este recorte. Resoluções atendidas em memória ficaram fora dessa contagem. O efeito em metadados aquecidos na navegação seguinte à Home não foi medido. SQL e replay brutos [acervo local (resume-sql.ndjson)]

## Medições oficiais

O executor usou o mesmo observe e as duas verificações de contagem de cartões do método histórico H. A marca foi registrada antes de esperar o fundo. A disponibilidade HTTP do fundo e a alteração do DOM são métricas auxiliares. Renderização final de pixels não foi observada. Foram mantidos contextos Chromium novos por abertura, mesmo proxy, login em memória e cache simétrico. Cada minibloco teve uma nova JVM. A estabilidade exigiu pelo menos 15 operações, com janelas de cinco e tolerância de 5 ms ou 10% da mediana anterior, o maior dos dois valores. Aquecimento aprovado (operações por minibloco) 1A 15, 1B 15, 2B 15, 2A 15, 3B 15, 3A 15. Foram 12 aquecimentos de navegador. Janelas de aquecimento [acervo local (resume-warm-windows.ndjson)]

| Métrica | A mediana / IQR | B mediana / IQR | Δ B − A | Δ % |
| --- | ---: | ---: | ---: | ---: |
| Fundo HTTP (ms) | 112,79 / 12,32 | 28,49 / 23,09 | -84,30 | -74,74% |
| Fundo TTFB (ms) | 76,20 / 9,85 | 12,67 / 0,91 | -63,53 | -83,37% |
| Listagem HTTP (ms) | 50,72 / 22,66 | 31,37 / 21,96 | -19,35 | -38,15% |
| Listagem TTFB (ms) | 14,17 / 1,92 | 15,04 / 2,20 | 0,87 | 6,14% |
| Disponibilidade do fundo, fim HTTP (ms) | 236,12 / 16,57 | 168,05 / 10,14 | -68,08 | -28,83% |
| Banner, inserção do src no DOM (ms) | 242,71 / 17,29 | 183,49 / 11,33 | -59,22 | -24,40% |
| Banner menos H (ms) | 28,75 / 8,99 | -27,33 / 13,02 | -56,08 | — |
| H abertura (ms) | 210,36 / 18,21 | 211,06 / 17,97 | 0,70 | 0,33% |
| H paginação (ms) | 64,14 / 7,89 | 62,71 / 4,37 | -1,43 | -2,23% |
| Listagem na paginação HTTP (ms) | 22,71 / 3,45 | 27,90 / 4,81 | 5,19 | 22,85% |

Na abertura, o fundo terminou antes da listagem em 0/18 amostras A e 18/18 B. O src do banner foi selecionado antes de H em 0/18 A e 18/18 B. Houve 0 chamadas ao replay nas aberturas A e 0 em B. Os corpos HTTP da abertura Playwright tiveram mediana 21.991 B em A e 16.699 B em B. O tamanho de corpo informado pelo coletor e o tamanho do JSON bruto da sonda são observações distintas.

| Diferença de medianas B − A (ms) | 1 A/B | 2 B/A | 3 B/A | 4 A/B | Mediana dos pares | Ordem A/B | Ordem B/A |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Fundo HTTP (ms) | -78,74 | -71,83 | -86,67 | — | -78,74 | -78,74 | -79,25 |
| Listagem HTTP (ms) | -9,11 | -8,46 | -21,01 | — | -9,11 | -9,11 | -14,74 |
| Disponibilidade do fundo, fim HTTP (ms) | -66,88 | -60,47 | -73,21 | — | -66,88 | -66,88 | -66,84 |
| Banner, inserção do src no DOM (ms) | -57,57 | -56,23 | -64,70 | — | -57,57 | -57,57 | -60,46 |
| H abertura (ms) | 1,05 | 10,21 | -6,26 | — | 1,05 | 1,05 | 1,98 |
| H paginação (ms) | 6,27 | -10,36 | 1,22 | — | 1,22 | 6,27 | -4,57 |
| Listagem na paginação HTTP (ms) | 5,24 | -3,30 | 3,61 | — | 3,61 | 5,24 | 0,16 |

As duas últimas colunas são medianas dos deltas por par para cada ordem. O detalhe contém média, desvio-padrão, extremos e p90 exploratório. A aprovação prática de HTTP requer 5 ms e 5% e a de H requer 10 ms e 5%, com o mesmo sentido nas duas ordens. Não se trata de teste formal. Estatísticas completas [acervo local (statistics.json)] · Amostras brutas [acervo local (resume-browser.ndjson)]

## Decisão

A coleta parou antes da primeira abertura do par 4. Em 4A, a última comparação passou de 116,47 para 104,50 ms, diferença de 11,97 ms acima de 11,65 ms de tolerância. As janelas anteriores também não passaram. O máximo de 30 operações foi atingido e 4B não começou. Ficaram 36/48 aberturas e 12/16 paginações oficiais válidas, 12/16 aquecimentos de navegador e zero amostras oficiais inválidas. A primeira tentativa de qualificação teve uma paginação inválida por erro no validador. Interrupção [acervo local (resume-failure.json)] Tentativa inicial [acervo local (browser.ndjson)] Nos três pares coletados, o fundo e a listagem tiveram quedas de latência HTTP na abertura que excederam 5 ms e 5% nas medianas agregadas, com o mesmo sentido nos três pares. A ordenação incompleta limita a conclusão, pois há um par A/B e dois B/A. A listagem teve TTFB ligeiramente maior e H de abertura variou +0,70 ms, abaixo do critério prático. Na paginação, a latência HTTP mediana subiu 5,19 ms, com sinais mistos por par e amostra exploratória de seis por versão. H da paginação variou −1,43 ms. A redução de trabalho e a antecipação do banner sustentam manter provisoriamente a alteração. O ganho de H permanece sem demonstração. O experimento não isola efeito causal de concorrência.

A próxima oportunidade sugerida pela matriz continua sendo Detalhe de lista. A qualificação de itens e capas depende de etapa posterior. Progresso e Progresso da lista permanecem suspensos pela cobertura de hierarquias e pela reconciliação de snapshots. Nenhuma implementação posterior foi iniciada. [Matriz consolidada](04b7-matriz-cobertura.csv)

Os processos temporários foram encerrados. PostgreSQL, replay e clones descartáveis foram preservados. Nenhum código de produção ou artefato A/B foi modificado.
