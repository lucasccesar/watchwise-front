# 5M3 — Validação e benchmark de Detalhe de lista

**Manter.** A e B preservaram os DTOs integrais e a ordem dos cartões nos recortes qualificados. O lote de médias passou de 48 para 30 candidatos na primeira página e de 48 para 18 na segunda. A ordenação por nota manteve 48 candidatos. A segunda página passou de 30 para 29 leituras PostgreSQL na sonda. Coleta completa com 48 aberturas, 16 paginações e 16 ordenações válidas.

## Artefatos e ambiente

| Artefato | SHA-256 |
|---|---|
| JAR A [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | `38b865572646b83d5d2f5f2c8ef69d14b3a9b9af4d410224183acce97000e688` |
| JAR B [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | `962319a733f92055dfce43b0a4deaff36b241e8f5d1fee7c75c63d0e044c3be4` |
| Angular compartilhado [acervo local (browser)] | `dbca8c2a9f9c01e2456a6991454831b5d10a54fbdb80347a226baa1e8e2faa89` |
| Catálogo do replay | `1443edeb41d3cda1b9c66929dd065eb40e0b66196eabc6774d151746fc487642` |

A calcula médias antes da paginação. B calcula médias sobre a página nas ordenações que independem delas. A comparação por entrada da 5M2 isolou a diferença de JAR às três classes do leitor. O Angular é idêntico e as otimizações anteriores ficam preservadas. Os hashes dos JARs e do Angular foram verificados antes e depois da execução. Comparação dos JARs [acervo local (jar-comparison.json)]

PostgreSQL em `127.0.0.1:15433`, exclusivamente `watchwise_benchmark_exec_v4`. Proxy em `http://localhost:3001` e API temporária em `http://127.0.0.1:8082`. Chromium 159.0.8154.6. O backend apontou para o replay histórico em `127.0.0.1:18091`. As requisições do navegador foram limitadas à origem local. O diagnóstico registrou fontes externas bloqueadas pelo isolamento. Migrations, seeds e reconciliações permaneceram desabilitados. A persona sintética `wwhyb1001` foi confirmada em A e B após um único login normal. Protocolo registrado [acervo local (protocol.json)] · Autenticação [acervo local (authentication.json)]

## Equivalência funcional e estados

A lista pública da persona contém 48 cartões, 15 filmes e 33 séries. A paginação por posição preservou 30 e 18 cartões sem interseção. A e B preservaram IDs, ordem, notas, médias, campos nulos, total de itens, percentual assistido de 31,25% e duração de 4.186 minutos. A qualificação comparou duas aberturas e três interações por versão no Chromium e retornou 10 observações válidas. As ordenações crescente e decrescente por nota foram conferidas na interface, incluindo posição como desempate e nulos no fim. Os controles HTTP compararam também data de inclusão, duração e filtro de filmes, com 15 resultados nesse filtro. Em cada recorte os DTOs completos foram comparados pela estrutura e valores, com a ordem dos arrays preservada. Amostras [acervo local (browser.ndjson)] · Referências dos contratos [acervo local (contracts.ndjson)] · Controles HTTP [acervo local (contract-controls.ndjson)]

No replay integrado, o estado `UNKNOWN` das séries foi equivalente. A cobertura devolveu os metadados que permitem renderizar os cartões. As agendas incompletas limitam a verificação dos estados reais. Em evidência controlada da 5M2, agendas completas confirmaram `WATCHED` (2/2), `PARTIALLY_WATCHED` (1/2) e `UNWATCHED` (0/2), com preservação de elegibilidade, filtros e paginação. Agenda incompleta permaneceu `UNKNOWN`. A 5M2 aprovou 772 testes. Quatro falhas legadas foram reproduzidas com a implementação A e excluídas nominalmente daquela rodada. Os tempos deste relatório se limitam ao replay atual. Testes e registro da 5M2 [acervo local (05m2-otimizacao-medias-detalhe-lista.md)]

## Persistência observada

Uma sonda por recorte e versão, em JVM diagnóstica separada. As leituras foram contadas a partir de instruções registradas pelo PostgreSQL, filtradas pelos PIDs do pool da JVM temporária. A cardinalidade abaixo usa o número de parâmetros nos lotes de séries e filmes. O lote de séries foi confirmado tanto na consulta do proprietário quanto no agregado público. A consulta nativa de notas apareceu no mesmo grupo de enriquecimento. O registro disponível dessa instrução termina na primeira linha. Seu número de parâmetros, as linhas examinadas e as linhas retornadas ficam não medidos. Leituras adicionais com AVG da montagem de cartões são discriminadas na coluna seguinte. Sondas SQL [acervo local (sql.ndjson)]

| Operação | Versão | Elegíveis | Candidatos às médias (séries + filmes) | Leituras de médias do leitor | Leituras adicionais com AVG | Leituras SQL totais | Replay | Corpo HTTP (B) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Abertura | A | 48 | 48 (33 + 15) | 4 | 2 | 35 | 48 | 39.537 |
| Página 2 | A | 48 | 48 (33 + 15) | 4 | 1 | 30 | 0 | 23.708 |
| Ordem por nota | A | 48 | 48 (33 + 15) | 4 | 2 | 32 | 0 | 39.354 |
| Abertura | B | 48 | 30 (15 + 15) | 4 | 2 | 35 | 48 | 39.537 |
| Página 2 | B | 48 | 18 (18 + 0) | 3 | 1 | 29 | 0 | 23.708 |
| Ordem por nota | B | 48 | 48 (33 + 15) | 4 | 2 | 32 | 0 | 39.354 |

Em cada JVM diagnóstica fria, a primeira abertura fez 48 chamadas locais HTTP 200, 15 para filmes e 33 para séries. As duas sondas seguintes na mesma JVM registraram zero chamadas. A quantidade total de invocações Java de resolução de mídia ficou não medida. O corpo das respostas foi medido em bytes, sem incluir cabeçalhos. A medição browser e a sonda HTTP são registradas separadamente.

## Protocolo comparativo e aquecimento

Ordem A/B, B/A, B/A, A/B. Uma JVM por minibloco na mesma porta. Cada operação de aquecimento sequenciou três GETs de detalhe, para primeira página por posição, segunda página por posição e primeira página por nota. Foram comparadas as medianas das duas últimas janelas de cinco, a partir de 15 até 30 operações, com tolerância igual ao maior valor entre 5 ms e 10% da mediana anterior. A coleta usou a mesma sessão e um contexto novo por abertura, com dois aquecimentos de navegador por minibloco. H mede do início da ação até os links ordenados dos cartões estarem no DOM, incluindo a página ativa na paginação. Cada interação partiu de uma abertura medida e específica daquela jornada. SQL diagnóstico e estatísticas Hibernate ficaram fora da coleta. Janelas de aquecimento [acervo local (warm-windows.ndjson)]

| Minibloco | Operações de JVM | Mediana anterior (ms) | Última mediana (ms) | Tolerância (ms) | Estável |
|---|---:|---:|---:|---:|---|
| 1A | 15 | 241,48 | 225,16 | 24,15 | Sim |
| 1B | 20 | 205,40 | 211,05 | 20,54 | Sim |
| 2B | 20 | 210,51 | 204,64 | 21,05 | Sim |
| 2A | 15 | 239,58 | 223,93 | 23,96 | Sim |
| 3B | 15 | 218,61 | 209,54 | 21,86 | Sim |
| 3A | 15 | 232,27 | 226,95 | 23,23 | Sim |
| 4A | 15 | 229,96 | 217,08 | 23,00 | Sim |
| 4B | 15 | 225,17 | 211,26 | 22,52 | Sim |

A coleta usa GET /api/v1/lists/:id/view acompanhado por sessão e comentários na abertura. As interações medem apenas o GET de detalhe. Os tempos de rede do navegador incluem o proxy local. A quantidade de GETs cobre as chamadas da API.

Aquecimentos de navegador válidos 16/16. A coleta foi limitada ao protocolo registrado. Os quatro pares foram concluídos.

## Medições oficiais

| Operação | Válidas / planejadas | Inválidas |
|---|---:|---:|
| Abertura | 48 / 48 | 0 |
| Página 2 | 16 / 16 | 0 |
| Ordem por nota | 16 / 16 | 0 |

Tempos em ms. Δ corresponde a B − A. p90 é exploratório. Os totais de bytes abrangem os corpos das chamadas de API observadas e excluem cabeçalhos, arquivos estáticos e custos de transporte.

| Operação | Métrica | Mediana A | Mediana B | Δ | Δ % |
|---|---|---:|---:|---:|---:|
| Abertura | H | 353,50 | 356,76 | +3,26 | +0,92 |
| Abertura | GET de detalhe | 91,46 | 99,62 | +8,17 | +8,93 |
| Abertura | TTFB | 73,89 | 72,68 | -1,21 | -1,63 |
| Abertura | Corpo do GET | 39.596 | 39.596 | 0,00 | 0,00 |
| Abertura | GETs | 3 | 3 | 0,00 | 0,00 |
| Abertura | Replay | 0 | 0 | 0,00 | — |
| Abertura | Corpos HTTP somados | 40.800 | 40.800 | 0,00 | 0,00 |
| Página 2 | H | 121,45 | 124,34 | +2,90 | +2,38 |
| Página 2 | GET de detalhe | 66,27 | 64,54 | -1,73 | -2,60 |
| Página 2 | TTFB | 63,96 | 61,82 | -2,14 | -3,35 |
| Página 2 | Corpo do GET | 23.744 | 23.744 | 0,00 | 0,00 |
| Página 2 | GETs | 1 | 1 | 0,00 | 0,00 |
| Página 2 | Replay | 0 | 0 | 0,00 | — |
| Página 2 | Corpos HTTP somados | 23.744 | 23.744 | 0,00 | 0,00 |
| Ordem por nota | H | 139,40 | 144,78 | +5,38 | +3,86 |
| Ordem por nota | GET de detalhe | 66,58 | 68,78 | +2,20 | +3,30 |
| Ordem por nota | TTFB | 63,71 | 65,91 | +2,20 | +3,45 |
| Ordem por nota | Corpo do GET | 39.413 | 39.420 | +7,00 | +0,02 |
| Ordem por nota | GETs | 1 | 1 | 0,00 | 0,00 |
| Ordem por nota | Replay | 0 | 0 | 0,00 | — |
| Ordem por nota | Corpos HTTP somados | 39.413 | 39.420 | +7,00 | +0,02 |

| Operação | Métrica | Versão | n | Média | Mín. | Máx. | IQR | CV % | p90 |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| Abertura | H | A | 24 | 355,29 | 323,90 | 435,50 | 19,63 | 6,45 | 373,70 |
| Abertura | H | B | 24 | 358,08 | 319,76 | 394,02 | 24,45 | 5,90 | 390,33 |
| Abertura | GET de detalhe | A | 24 | 97,65 | 78,66 | 129,89 | 25,48 | 15,52 | 118,00 |
| Abertura | GET de detalhe | B | 24 | 97,78 | 73,86 | 131,68 | 26,30 | 17,03 | 118,86 |
| Abertura | TTFB | A | 24 | 75,58 | 67,16 | 111,16 | 9,50 | 11,98 | 80,64 |
| Abertura | TTFB | B | 24 | 76,52 | 62,34 | 120,51 | 10,03 | 19,18 | 95,09 |
| Página 2 | H | A | 8 | 127,07 | 113,69 | 158,22 | 10,15 | 11,17 | 142,16 |
| Página 2 | H | B | 8 | 123,57 | 112,43 | 135,13 | 7,91 | 6,40 | 132,03 |
| Página 2 | GET de detalhe | A | 8 | 69,93 | 65,60 | 95,19 | 0,65 | 14,63 | 76,11 |
| Página 2 | GET de detalhe | B | 8 | 65,04 | 60,11 | 69,37 | 4,94 | 5,08 | 68,87 |
| Página 2 | TTFB | A | 8 | 67,50 | 63,09 | 92,41 | 0,74 | 14,95 | 73,57 |
| Página 2 | TTFB | B | 8 | 62,52 | 57,72 | 66,83 | 4,75 | 5,16 | 66,35 |
| Ordem por nota | H | A | 8 | 140,14 | 130,85 | 152,77 | 2,31 | 4,36 | 145,55 |
| Ordem por nota | H | B | 8 | 144,14 | 130,60 | 158,91 | 12,50 | 6,79 | 154,81 |
| Ordem por nota | GET de detalhe | A | 8 | 67,43 | 63,05 | 74,93 | 2,31 | 5,28 | 71,26 |
| Ordem por nota | GET de detalhe | B | 8 | 69,78 | 62,79 | 78,34 | 5,14 | 7,83 | 77,44 |
| Ordem por nota | TTFB | A | 8 | 64,70 | 60,50 | 72,53 | 2,35 | 5,67 | 68,63 |
| Ordem por nota | TTFB | B | 8 | 67,13 | 60,16 | 75,35 | 5,11 | 8,03 | 74,70 |

| Operação | Métrica | Par 1 A/B | Par 2 B/A | Par 3 B/A | Par 4 A/B | Mediana dos pares | A/B | B/A |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Abertura | H | -10,54 | +19,57 | -14,52 | +12,66 | +1,06 | +1,06 | +2,53 |
| Abertura | GET de detalhe | -7,55 | +19,24 | -22,42 | +8,50 | +0,47 | +0,47 | -1,59 |
| Abertura | TTFB | -8,87 | +2,09 | +0,55 | -2,05 | -0,75 | -5,46 | +1,32 |
| Página 2 | H | +3,02 | -16,84 | -2,58 | +2,36 | -0,11 | +2,69 | -9,71 |
| Página 2 | GET de detalhe | -5,96 | -13,74 | -0,48 | +0,59 | -3,22 | -2,68 | -7,11 |
| Página 2 | TTFB | -5,91 | -14,04 | -0,57 | +0,58 | -3,24 | -2,67 | -7,31 |
| Ordem por nota | H | -7,70 | +15,41 | +6,27 | +2,06 | +4,16 | -2,82 | +10,84 |
| Ordem por nota | GET de detalhe | -2,77 | +3,15 | +5,03 | +3,99 | +3,57 | +0,61 | +4,09 |
| Ordem por nota | TTFB | -2,56 | +3,12 | +5,32 | +3,83 | +3,47 | +0,64 | +4,22 |

Os critérios operacionais exigem redução mínima de 5 ms e 5% para HTTP, ou 10 ms e 5% para H, com direção consistente nas ordens A/B e B/A. A abertura ficou abaixo de pelo menos uma das exigências de relevância prática no GET. Para H, o critério não foi atingido. São limiares de relevância prática. Paginação e ordenação funcionam como controles exploratórios. Estatísticas por versão, minibloco e par [acervo local (statistics.json)]

Na abertura, o GET subiu 8,17 ms (+8,93%) na mediana agregada, com sinais alternados entre os quatro pares. As medianas das diferenças ficaram em +0,47 ms na ordem A/B e −1,59 ms na ordem B/A. H subiu 3,26 ms (+0,92%), abaixo dos dois limiares e com diferenças de ambos os sinais entre os pares. Na paginação, o GET teve direção favorável nas duas ordens e redução agregada de 1,73 ms (2,60%). Na ordenação por nota, as mudanças agregadas de H e GET ficaram abaixo dos limiares e a direção de H variou entre as ordens.

A ordenação por nota variou em tamanho de corpo no navegador em ambas as versões. A mediana passou de 39.413 para 39.420 bytes. Os DTOs integrais permaneceram equivalentes e as sondas HTTP retornaram 39.354 bytes em A e B. A causa da variação dos bytes registrados no navegador não foi determinada.

## Custo acumulado e decisão

Por posição, o leitor B processou 30 candidatos na abertura e os 18 restantes na segunda página. Parte do trabalho saiu da abertura e passou a ser feita quando a segunda página foi solicitada. No percurso pelas duas páginas, o total do leitor caiu de 96 para 48 entradas de candidatos, oito para sete leituras de médias e 65 para 64 leituras SQL totais. Para quem abre somente a primeira página, o enriquecimento dos 18 itens fora do recorte foi eliminado. A seleção dos elegíveis e as resoluções necessárias aos estados permanecem globais. A ordenação por nota manteve o processamento global e suas 32 leituras na sonda.

| Jornada abertura + página 2 | n A/B | Mediana A (ms) | Mediana B (ms) | Δ (ms) | Δ % |
|---|---:|---:|---:|---:|---:|
| H | 8/8 | 480,28 | 486,19 | +5,91 | +1,23 |
| GET de detalhe | 8/8 | 161,79 | 161,87 | +0,08 | +0,05 |

Cada total foi calculado na jornada individual, somando apenas os intervalos medidos de abertura e paginação. O intervalo entre ações foi excluído. O replay local, o recorte de 48 itens, as agendas incompletas e a dispersão entre pares limitam a extrapolação temporal.

**Decisão: Manter.** A redução estrutural se repetiu nas duas páginas e a equivalência integrou a qualificação e todas as amostras oficiais. Os controles não mostraram piora que atingisse os limiares práticos com consistência nas duas ordens. Encerrar Detalhe de lista com a limitação das agendas documentada. A Etapa 5N fica pendente.

## Integridade e encerramento

Guard final aprovado. Os hashes de 52 tabelas não operacionais e as sequências do v4 coincidiram com a referência inicial. Isso inclui os snapshots. O login autorizado alterou `refresh_tokens` (43 → 44 linhas) e `shared_limiter_state` (3 → 3 linhas, com alteração de conteúdo). Os deltas operacionais foram registrados separadamente e conferidos durante a execução. v3 e o banco original ficaram fora das operações. O executor encerrou seus processos temporários e manteve PostgreSQL e replay local ativos. Guard por operação [acervo local (guard.ndjson)] · Deltas autorizados [acervo local (operational.json)] · Guard final [acervo local (execution-final.json)]

Os registros brutos da 5M3 foram preservados em `watchwise-api/target/benchmark-5m3`. A matriz consolidada acrescenta os três recortes desta etapa. [Matriz consolidada](04b7-matriz-cobertura.csv)
