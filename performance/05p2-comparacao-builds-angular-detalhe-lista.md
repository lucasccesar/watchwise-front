# 5P2 — Comparação isolada dos builds Angular em Detalhe de lista

**Situação: execução bloqueada na qualificação do ambiente.** O container PostgreSQL existente está parado e o replay histórico não tem listener. A validação ficou na conferência offline. Nenhuma combinação cruzada foi executada e nenhuma das 64 observações oficiais foi coletada. A conclusão de desempenho permanece inconclusiva.

## Artefatos e compatibilidade

| Artefato | SHA-256 confirmado |
|---|---|
| Angular A da 5N2 [acervo local (4b6b-5c12-browser)] | `63e9d160acb3eefdc41793642fedb5329b798a888d1f5b7d09186d265590efd6` |
| Angular B da 5N2 [acervo local (browser)] | `dbca8c2a9f9c01e2456a6991454831b5d10a54fbdb80347a226baa1e8e2faa89` |
| JAR B compartilhado [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | `962319a733f92055dfce43b0a4deaff36b241e8f5d1fee7c75c63d0e044c3be4` |

Os hashes coincidem com os relatórios preservados. O JAR B contém as doze otimizações cumulativas. Os dois builds diferem na entrada principal e no chunk da rota. A versão do frontend abrange diferenças de código e empacotamento. Os fluxos históricos usaram GETs de sessão, detalhe paginado e comentários com os mesmos parâmetros, e hashes semânticos correspondentes do detalhe. O cruzamento Angular A com JAR B ainda requer confirmação em execução, inclusive para a sessão e o conteúdo renderizado. Pré-checagem [acervo local (offline.json)] · 5P1 [acervo local (05p1-diagnostico-regressao-detalhe-lista.md)] · [5N2](05n2-benchmark-acumulado.md)

## Ambiente e guards

- O Docker respondeu. O container `watchwise-benchmark-postgres` está em `exited`. A inspeção confirmou imagem `postgres:16-alpine`, projeto `watchwise-benchmark`, volume `watchwise-benchmark-pgdata`, mapeamento `127.0.0.1:15433:5432`, 2 CPUs e 2 GiB.
- As portas 15433, 18091, 8082 e 3001 estavam livres. O lock de benchmarks estava disponível. O catálogo local do replay manteve SHA-256 `1443edeb41d3cda1b9c66929dd065eb40e0b66196eabc6774d151746fc487642`. O script existente lê o catálogo e responde no loopback. A ausência de listener impediu o teste de 404 local agora.
- A identidade atual de `watchwise_benchmark_exec_v4`, os 48 itens, o inventário dos snapshots, a cobertura operacional do replay e os guards inicial e final estão pendentes. Os registros históricos qualificaram a persona `wwhyb1001`, lista pública de 15 filmes e 33 séries, com 30/18 cartões e estados `UNKNOWN` para as séries. A 5M2 verificou agendas completas separadamente. Não houve login, acesso a bancos, execução dos processos auxiliares de aplicação ou alterações operacionais.

A inicialização do container e do replay existentes está pendente de autorização. Ela é necessária porque os dois serviços estavam parados e o pedido exige preservar o estado inicial dos processos. A autorização de login já consta da 5P2. Evidência da inspeção [acervo local (offline.json)]

## Protocolo preparado e resultados pendentes

O executor histórico de Detalhe de lista foi adaptado em diretório exclusivo da 5P2. A retomada deve validar o banco e o replay, executar o guard, autenticar uma vez, reaproveitar a sessão e manter uma JVM compartilhada com transações somente leitura durante toda a comparação. O servidor estático alterna o build na mesma origem e porta e mantém o mesmo proxy. Os contextos novos de navegador impedem reuso de assets, mantendo a política histórica.

A qualificação planejada usa uma abertura e uma paginação por build. O executor exige HTTP 200, os mesmos cartões, DTOs, ordem, totais e comentários históricos, e confirma os links renderizados e a página ativa. A JVM usa de 15 a 30 ciclos sequenciais da primeira e da segunda página, com as duas últimas janelas de cinco dentro de `max(5 ms, 10%)` e zero replay nessas janelas. A coleta para na primeira falha relevante, sem reposição. O código foi conferido sintaticamente. A execução permanece pendente. Executor [acervo local (run.mjs)] · Resumo estatístico preparado [acervo local (statistics.mjs)]

| Cenário | Oficial previsto | Válidas | Inválidas | Pares completos |
|---|---:|---:|---:|---:|
| Abertura direta | 48 | 0 | 0 | 0/4 |
| Página 2 por posição | 16 | 0 | 0 | 0/4 |

Ainda não há medianas, intervalos por tentativa, dispersão, TTFB ou diferenças por ordem da 5P2. Após a coleta, a decomposição segue a 5P1. A diferença entre `responseEnd` e TTFB inclui espera antes da requisição e recebimento, sem isolar transferência pura. Entre o fim da resposta e H ficam juntos callbacks, parse e confirmação da prontidão no DOM. A 5M3 e a 5N2 são referência de contexto e preservam suas condições originais. Decomposição histórica [acervo local (05p1-decomposicao-detalhe-lista.json)] · [5M3](05m3-validacao-benchmark-detalhe-lista.md)

## Continuidade

**C — resultado inconclusivo por bloqueio operacional.** Manter a alteração das médias. O contraste ainda é o recomendado pela 5P1 e deve ficar restrito à abertura e à paginação de controle. A decisão sobre a continuidade do ciclo fica pendente até a execução da 5P2.


## Retomada autorizada

**B — Regressão prática da abertura não reproduzida.** A autorização posterior permitiu iniciar somente o container existente e o replay histórico. O registro acima preserva a situação anterior à retomada.

O container original manteve o volume, a imagem, os limites e o mapeamento. O replay serviu o catálogo com hash 1443edeb41d3cda1b9c66929dd065eb40e0b66196eabc6774d151746fc487642 e respondeu 404 local à referência ausente. A JVM de login foi encerrada antes da JVM compartilhada 20352, que usou o JAR B e transações JDBC somente leitura. A sessão foi reutilizada. Angular A e B foram alternados no mesmo servidor estático e proxy, com um contexto novo de Chromium por abertura. Os dois builds e o JAR foram conferidos pelos mesmos fingerprints.

O guard identificou o v4 e os snapshots da lista tinham 48 chaves, 8 com snapshot e 8 vencidos. O cenário mantém 15 filmes e 33 séries, com estados UNKNOWN para séries. Os contratos integrais de detalhe coincidiram com a referência histórica nas duas páginas. Comentários, persona, parâmetros, 30/18 cartões, ordem dos links no DOM e página ativa foram verificados. Ambiente [acervo local (environment.json)] · Brutos [acervo local (browser.ndjson)]

O aquecimento compartilhado executou 20 ciclos, com medianas finais 141,44 → 140,06 ms e tolerância 14,14 ms. As duas últimas janelas ficaram sem replay. A série balanceada alternou AB, BA, BA, AB, com dois aquecimentos de navegador por minibloco. A API permaneceu na mesma JVM. SQL diagnóstico e estatísticas Hibernate ficaram desativados. Protocolo [acervo local (protocol.json)] · Aquecimento [acervo local (warm-windows.ndjson)]

### Abertura direta

24 válidas em A e 24 em B, 0 inválidas e 0 pendentes.

| Métrica | Mediana A → B | Δ B − A | Δ % | IQR A / B | DP A / B | Δ por par 1 / 2 / 3 / 4 | Δ AB / BA |
|---|---:|---:|---:|---:|---:|---:|---:|
| Antes do GET | 153,09 → 163,99 | 10,90 | 7,12 | 20,78 / 9,42 | 13,00 / 12,71 | 2,76 / 10,34 / -18,23 / 23,07 | 12,91 / -3,95 |
| Janela do GET (callbacks) | 67,59 → 66,98 | -0,62 | -0,91 | 6,31 / 4,68 | 7,53 / 3,84 | -3,62 / -3,29 / 1,85 / -0,28 | -1,95 / -0,72 |
| GET (navegador) | 89,82 → 96,53 | 6,71 | 7,47 | 22,47 / 8,94 | 16,18 / 11,81 | 3,89 / 11,13 / -20,67 / 21,87 | 12,88 / -4,77 |
| TTFB | 63,71 → 62,56 | -1,15 | -1,80 | 4,89 / 4,41 | 7,08 / 3,68 | -3,34 / -3,49 / 1,17 / -0,61 | -1,97 / -1,16 |
| Resíduo responseEnd − TTFB | 14,32 → 34,84 | 20,52 | 143,30 | 24,49 / 8,44 | 12,96 / 11,17 | 11,36 / 20,35 / -23,65 / 23,56 | 17,46 / -1,65 |
| Fim observado da resposta até H | 108,04 → 106,56 | -1,49 | -1,37 | 8,62 / 4,90 | 10,30 / 5,04 | -5,02 / -3,95 / 0,48 / 1,29 | -1,86 / -1,74 |
| H | 331,53 → 337,27 | 5,75 | 1,73 | 27,81 / 10,84 | 25,62 / 16,85 | -15,26 / -3,21 / -13,51 / 21,28 | 3,01 / -8,36 |
| Bytes do GET principal | 39.596,00 → 39.596,00 | 0,00 | 0,00 | 7,00 / 7,00 | 5,83 / 5,65 | -7,00 / 3,50 / 0,00 / 0,00 | -3,50 / 1,75 |
| Bytes dos GETs | 40.800,00 → 40.800,00 | 0,00 | 0,00 | 7,00 / 7,00 | 5,83 / 5,65 | -7,00 / 3,50 / 0,00 / 0,00 | -3,50 / 1,75 |
| GETs | 3,00 → 3,00 | 0,00 | 0,00 | 0,00 / 0,00 | 0,00 / 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |

| Par | Ordem | H A / B | GET A / B | TTFB A / B |
|---|---|---:|---:|---:|
| 1 | AB | 352,96 / 337,70 | 95,41 / 99,31 | 69,47 / 66,13 |
| 2 | BA | 335,58 / 332,37 | 85,39 / 96,52 | 65,59 / 62,10 |
| 3 | BA | 327,66 / 314,16 | 94,56 / 73,89 | 61,38 / 62,56 |
| 4 | AB | 323,41 / 344,68 | 73,98 / 95,85 | 61,08 / 60,47 |

### Segunda página

8 válidas em A e 8 em B, 0 inválidas e 0 pendentes.

| Métrica | Mediana A → B | Δ B − A | Δ % | IQR A / B | DP A / B | Δ por par 1 / 2 / 3 / 4 | Δ AB / BA |
|---|---:|---:|---:|---:|---:|---:|---:|
| Antes do GET | 23,11 → 18,45 | -4,67 | -20,19 | 4,92 / 6,94 | 3,90 / 5,06 | -4,34 / -3,99 / -4,01 / 0,97 | -1,69 / -4,00 |
| Janela do GET (callbacks) | 60,37 → 59,39 | -0,99 | -1,63 | 9,44 / 4,33 | 14,66 / 4,03 | -13,83 / -0,99 / 2,34 / -13,13 | -13,48 / 0,68 |
| GET (navegador) | 59,44 → 58,57 | -0,87 | -1,47 | 3,22 / 3,37 | 13,29 / 3,78 | -14,30 / -1,26 / 1,99 / -2,12 | -8,21 / 0,37 |
| TTFB | 56,69 → 56,22 | -0,47 | -0,83 | 3,09 / 3,29 | 13,33 / 3,75 | -14,14 / -1,08 / 2,23 / -1,94 | -8,04 / 0,57 |
| Resíduo responseEnd − TTFB | 2,43 → 2,24 | -0,18 | -7,52 | 0,47 / 0,14 | 0,27 / 0,09 | -0,16 / -0,18 / -0,24 / -0,18 | -0,17 / -0,21 |
| Fim observado da resposta até H | 27,35 → 27,11 | -0,24 | -0,88 | 3,32 / 3,81 | 7,72 / 5,26 | -3,44 / -0,38 / 4,81 / 11,25 | 3,91 / 2,22 |
| H | 113,17 → 110,83 | -2,34 | -2,07 | 8,61 / 11,06 | 15,64 / 7,15 | -21,61 / -5,35 / 3,14 / -0,91 | -11,26 / -1,10 |
| Bytes do GET principal | 23.744,00 → 23.744,00 | 0,00 | 0,00 | 0,00 / 0,00 | 0,00 / 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| Bytes dos GETs | 23.744,00 → 23.744,00 | 0,00 | 0,00 | 0,00 / 0,00 | 0,00 / 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| GETs | 1,00 → 1,00 | 0,00 | 0,00 | 0,00 / 0,00 | 0,00 / 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |

| Par | Ordem | H A / B | GET A / B | TTFB A / B |
|---|---|---:|---:|---:|
| 1 | AB | 135,44 / 113,83 | 79,04 / 64,73 | 76,61 / 62,47 |
| 2 | BA | 113,40 / 108,05 | 59,83 / 58,57 | 57,30 / 56,22 |
| 3 | BA | 105,95 / 109,09 | 57,05 / 59,04 | 54,59 / 56,82 |
| 4 | AB | 107,92 / 107,01 | 57,89 / 55,77 | 55,50 / 53,56 |

### Interpretação

A comparação por ordem não reproduziu a direção da piora pré-GET e não reproduziu a direção da piora após a resposta na abertura. O TTFB da página 2 não mostrou piora nas duas ordens. O GET da abertura ficou abaixo do critério prático de regressão. A página 2 permanece um controle exploratório. Os limiares exigem 5 ms e 5% para HTTP e 10 ms e 5% para H, com direção consistente nas duas ordens.

Os intervalos foram formados dentro de cada amostra. O resíduo responseEnd − TTFB inclui tempo anterior a requestStart e recebimento do corpo. Os brutos não separam transferência pura, processamento Angular, pintura e confirmação do predicado. O TTFB inclui o trajeto pelo navegador e pelo proxy. Os deltas valem para este contraste. Na 5N2, JAR e frontend estavam acoplados. Na 5M3, apenas o leitor de médias divergia. A versão Angular desta etapa também inclui diferenças de código, além de empacotamento. Decomposição e estatísticas por tentativa e minibloco [acervo local (statistics.json)]

### Integridade e decisão

Guard final aprovado, 28 registros de verificação. O login autorizado alterou refresh_tokens de 48 para 49 e shared_limiter_state de 3 para 3 linhas, com fingerprints registrados separadamente. Tabelas de negócio, snapshots, sequências e artefatos foram preservados conforme o guard. PostgreSQL e replay continuam ativos. Guards [acervo local (guard.ndjson)] · Delta operacional [acervo local (operational.json)] · Encerramento [acervo local (execution-final.json)]

Manter a otimização das médias e suspender o ciclo específico de Detalhe de lista. Gargalos compartilhados são a próxima prioridade da 5Q.
