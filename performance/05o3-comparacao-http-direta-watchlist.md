# 5O3 — Comparação HTTP direta dos JARs da 5I3 no filtro Action

**B — Ausência de regressão prática demonstrada.** Houve 48/48 observações válidas, 0 inválidas e 0 não executadas. O GET mediano passou de 36,38 para 34,81 ms. Δ B − A de -1,56 ms (-4,30%). O TTFB passou de 36,09 para 34,46 ms.

## Artefatos e ambiente

| Condição | Artefato preservado | SHA-256 |
|---|---|---|
| A | JAR A da 5I3 [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | 517c9f35df9df4ffe547f17f6a2c40434c694fa2fe7d83ec2720bbd781969901 |
| B | JAR B da 5I3 [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | a9d20058a4a9fd9568e32b8b81d8415dc6d39074ed8f41b80f82308be378c23e |

Os hashes coincidem com os registrados na 5I3. A precede a mudança da Watchlist, B contém a alteração da 5I2. As diferenças por entrada se concentram nas classes do assembler e da Watchlist, conforme o inventário preservado. O cliente HTTP/1.1 acessou diretamente o mesmo loopback da API em 127.0.0.1:8082. O protocolo usou uma única JVM temporária por vez, reiniciada a cada minibloco. Angular e proxy ficaram fora do caminho. Artefatos e versões [acervo local (05i2-otimizacao-generos-watchlist.md)] · Diff preservado [acervo local (jar-diff.json)]

Usou-se somente o clone watchwise_benchmark_watchlist_5i em 127.0.0.1:15433, com a persona sintética wwhyb1067. O replay histórico em 127.0.0.1:18091 passou pela conferência do catálogo e de 404 local para referência ausente. A pré-checagem encontrou 276 chaves FOUND de 276, zero vencidas e 62.997 s de vigência mínima. A renovação foi dispensada. Seeds, migrations, reconciliações e instrumentação temporal ficaram desativados. As conexões depois do login usaram transações por padrão somente leitura. A sessão normal ficou em memória, reutilizada nos dois JARs. Ambiente [acervo local (environment.json)] · Protocolo fixado [acervo local (protocol.json)]

## Equivalência funcional

O GET de /api/v1/users/{userId}/watchlist/view usou gênero Action, status ALL, ordenação DATE_ADDED DESC, página 1 e tamanho 18. A omitiu includeGenreOptions e B enviou includeGenreOptions=true, reproduzindo as chamadas originais da 5I3, sem alternar o parâmetro na mesma versão. O contraste mede os dois fluxos como usados naquela rodada. A seleção isolada do parâmetro já foi avaliada na 5O1.

Duas respostas 200 de cada JAR repetiram seu próprio hash. A e B devolveram 13 cartões, na mesma ordem, total 13, uma página e hasNext falso. Metadados, estados, agregados e envelope foram comparados integralmente após separar availableGenres. Os 20 gêneros coincidiram com a referência após ordenar em pt-BR. A ordem bruta dos gêneros difere conforme os contratos da 5I2. Os hashes integrais por versão permitem monitorar estabilidade sem eliminar a diferença intencional de contrato. Qualificação [acervo local (qualification.ndjson)] · Comparação canônica [acervo local (equivalence.json)] · Replay diagnóstico [acervo local (qualification-replay.ndjson)]

## Trabalho estrutural

| Evidência | Leituras A/B | Corpo A/B | Replay A/B |
|---|---:|---:|---:|
| 5I3 · sondas do filtro | 13 / 13 | 13.588 / 13.588 B | 0 / 0 |
| 5O1 · parâmetro false / true no JAR acumulado | 13 / 13 | 13.588 / 13.588 B | 0 / 0 |

As quatro sondas históricas retidas têm a mesma sequência textual de instruções. A seleção da coleção de 276 entradas precede o filtro que deixa 13 candidatos. O percurso inclui sessão, snapshots, resolução de conteúdo, estado do usuário e montagem dos 13 cartões. A 5O1 preservou nove ocorrências IN com 13 parâmetros por ocorrência. O log não retém valores de bind, tempos por instrução ou linhas físicas examinadas. Em B, o ramo de gêneros do DTO usa ordem de descoberta e fallback de metadados para gêneros locais nulos. Esse trabalho ocorre depois do caminho comum e não acrescentou instruções às sondas. Resoluções Java em memória não foram instrumentadas. Reutilizamos as sondas existentes porque já incluem o par da 5I3 e o contraste do parâmetro. SQL da 5I3 [acervo local (first-sql.ndjson)] · SQL da 5O1 [acervo local (sql.ndjson)] · Decomposição 5O2 [acervo local (05o2-diagnostico-regressao-filtro-watchlist.md)]

Na qualificação com JVMs recém-iniciadas, o replay recebeu 13 chamadas em A e 23 em B, todas com HTTP 200. Em B, as dez chamadas adicionais pediram cartões de séries. A diferença é compatível com o fallback de gêneros para as dez entradas sem gênero persistido, feito por WatchlistEntryServiceImpl.genreOptions → ContentCardAssembler.resolveGenres. Os números das sondas históricas acima refletem outra condição de cache. O diagnóstico atual e a janela oficial ficam separados.

## Medições diretas

Ordem AB, BA, BA, AB. Cada minibloco usa JVM nova e socket HTTP/1.1 persistente para o aquecimento final e seis GETs oficiais. Gate entre 15 e 30 operações, acréscimos de cinco, medianas das duas últimas janelas de cinco dentro do maior valor entre 5 ms e 10% da anterior, zero replay na janela final. O encerramento do bloco fecha seu cliente e JVM. SQL diagnóstico e tempos internos Hibernate ficaram fora das medições. O corpo foi medido sem cabeçalhos, com Accept-Encoding identity. TTFB vai do disparo ao callback de cabeçalhos. Recebimento é a diferença entre término do corpo e esse callback na mesma observação. A medição inclui loopback e cliente e não isola tempo interno do Spring Boot.  O aquecimento total registrou 52 chamadas ao replay em A e 92 em B. Nas medições oficiais válidas, a contagem foi zero. JVMs [acervo local (jvms.ndjson)] · Aquecimentos brutos [acervo local (warm.ndjson)] · Gates [acervo local (warm-gates.ndjson)] · Amostras oficiais e hashes [acervo local (official.ndjson)]

| Minibloco | Operações | Medianas anteriores → recentes (ms) | Tolerância (ms) | Gate |
|---|---:|---:|---:|---|
| 1A | 20 | 41,88 → 39,01 | 5,00 | Aprovado |
| 1B | 20 | 43,49 → 42,33 | 5,00 | Aprovado |
| 2B | 25 | 38,60 → 37,92 | 5,00 | Aprovado |
| 2A | 15 | 51,34 → 47,48 | 5,13 | Aprovado |
| 3B | 25 | 37,70 → 40,17 | 5,00 | Aprovado |
| 3A | 20 | 41,36 → 37,20 | 5,00 | Aprovado |
| 4A | 20 | 40,39 → 38,19 | 5,00 | Aprovado |
| 4B | 20 | 42,87 → 38,78 | 5,00 | Aprovado |

| Métrica | Mediana A → B | Δ B − A | Δ % | IQR A / B | DP A / B | CV A / B |
|---|---:|---:|---:|---:|---:|---:|
| HTTP total (ms) | 36,38 → 34,81 | -1,56 | -4,30 | 6,56 / 2,40 | 4,47 / 2,43 | 12,02 / 6,87 |
| TTFB (ms) | 36,09 → 34,46 | -1,63 | -4,51 | 6,48 / 2,36 | 4,43 / 2,42 | 12,05 / 6,92 |
| Recebimento do corpo (ms) | 0,40 → 0,37 | -0,03 | -7,55 | 0,07 / 0,05 | 0,08 / 0,05 | 19,25 / 13,28 |
| Corpo (bytes) | 13.588,00 → 13.588,00 | 0,00 | 0,00 | 0,00 / 0,00 | 0,00 / 0,00 | 0,00 / 0,00 |

| Par | HTTP mediano A / B | Δ HTTP | TTFB mediano A / B | Δ TTFB | Recebimento mediano A / B |
|---|---:|---:|---:|---:|---:|
| 1 AB | 33,91 / 35,69 | 1,78 | 33,53 / 35,36 | 1,83 | 0,38 / 0,36 |
| 2 BA | 42,49 / 34,44 | -8,05 | 42,00 / 34,05 | -7,95 | 0,44 / 0,39 |
| 3 BA | 36,01 / 34,20 | -1,81 | 35,66 / 33,87 | -1,79 | 0,41 / 0,36 |
| 4 AB | 34,59 / 35,19 | 0,60 | 34,27 / 34,83 | 0,56 | 0,34 / 0,36 |

Medianas dos deltas por ordem AB e BA. HTTP 1,19 e -4,93 ms. TTFB 1,19 e -4,87 ms. Recebimento 0,00 e -0,05 ms. O critério exige diferença agregada de pelo menos 5 ms e 5% com direção consistente entre as ordens. É um limiar prático, sem teste formal de significância. Estatísticas, dispersão e pares [acervo local (statistics.json)]

## Relação com as rodadas anteriores e continuidade

O GET do filtro piorou 8,16 ms na 5I3 e 12,88 ms na 5N2, em comparações com Chromium e proxy, com mudanças de pacote distintas. A 5N2 mostrou piora de H no filtro e melhora de H na abertura. A 5O1 usou um único JAR e não sustentou custo relevante do opt-in. Os deltas diretos desta rodada valem sob sua própria condição aquecida, sem conversão em efeito de H. As latências absolutas dos estudos têm escopos distintos. [5I3](05i3-validacao-benchmark-watchlist.md) · [5N2](05n2-benchmark-acumulado.md) · 5O1 [acervo local (05o1-isolamento-custo-generos-watchlist.md)]

Suspender a investigação da Watchlist até surgir evidência nova com hipótese específica. A comparação direta não confirmou regressão prática. A ausência de confirmação não implica igualdade exata, nem comprova que o proxy ou o navegador causaram o efeito anterior. A próxima prioridade recomendada é reavaliar Detalhe de lista, conforme a 5N3. Prioridades 5N3 [acervo local (05n3-avaliacao-estrategica-proximas-prioridades.md)]

Manter a Watchlist provisoriamente, preservando a melhora observada na abertura e o GET auxiliar eliminado. O resultado descreve o filtro Action, snapshots vigentes, cache aquecido, loopback e replay local. Tempos de SQL e de processamento Java isolados, cache frio, H e navegador estão fora da medição.

## Integridade e encerramento

A tentativa inicial foi interrompida por erro do executor ao separar os registros NDJSON históricos, antes de qualquer GET de qualificação do filtro ou amostra oficial. A correção ficou em um auxiliar separado. A sessão mantida em memória foi perdida no encerramento, então a retomada fez um segundo login normal autorizado. O primeiro acrescentou uma sessão (5 → 6), o segundo acrescentou outra (6 → 7). O fingerprint do limitador mudou nos dois logins, com quatro linhas. Falha inicial [acervo local (failure.json)] · Delta do primeiro login [acervo local (operational.ndjson)] · Guard inicial da primeira tentativa [acervo local (guard.ndjson)]

Guard final aprovado, 37 verificações registradas. Os fingerprints iniciais e finais de dados, snapshots e sequências foram equivalentes quando atestados pelo guard. A checagem final reteve 276 snapshots FOUND e 0 vencidos. Os hashes foram reconferidos e listeners preservados. Apenas as JVMs e clientes temporários foram encerrados. PostgreSQL e replay permanecem para reutilização. A próxima fase fica pendente.
- Sessões 6 → 7. Limitador 4 → 4 linhas, com delta de fingerprint registrado separadamente.

Guard [acervo local (guard.ndjson)] · Operacional [acervo local (operational.ndjson)] · Encerramento [acervo local (final.json)]
