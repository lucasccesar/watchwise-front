# Etapa 5C8 · Validação das categorias de Picks no Feed

**Decisão recomendada · Manter provisoriamente.** Inconclusivo.

## Referências e ambiente

| JAR da 5C7 | SHA-256 |
| --- | --- |
| A | `599df884c615f4c9259d7cf64249a16bbac0b2deba33656b35340164c2b6962d` |
| B | `ecf5dafef8663ad307a8d2a5de3c800ff97035c6c0647bdc4dc8743be64c4e73` |

A preserva a projeção de previews. B acrescenta o lote único de categorias. A comparação por entradas da 5C7 confirmou dependências e recursos iguais, com as diferenças funcionais restritas às três classes editadas. O executor conferiu os hashes em cada partida. A API temporária usou 127.0.0.1:18082, com a porta 8082 já ocupada, e JDBC para watchwise_benchmark_exec_v4 em 127.0.0.1:15433. A conta sintética, o catálogo de replay em loopback, o pool e o destino foram verificados. Migrations, seeds, workers e crons configuráveis foram desativados. Relatório 5C7 [acervo local (05c7-otimizacao-categorias-picks.md)] · Atestação dos JARs [acervo local (verification.json)] · Ambiente [acervo local (environment.json)]

## Diagnóstico PostgreSQL e equivalência

| Métrica | A | B |
| --- | ---: | ---: |
| Execuções SQL de categorias | 2 | 1 |
| IDs de template distintos, derivados da composição | 20 | 20 |
| Ocorrências de linhas de categoria, derivadas | 40 | 20 |
| Consultas de leitura no GET | 28 | 27 |
| Colunas do preview de seguidos | 5 | 5 |
| Atividades | 20 | 20 |
| Previews | 65 | 65 |
| Bytes do JSON sem compressão | 60742 | 60742 |

A equivalência funcional foi confirmada. As duas aberturas retornaram HTTP 200. O hash estrutural integral preserva arrays e valores nulos, sem excluir campos. Os hashes da ordem das atividades e do preview também coincidiram. A primeira otimização permaneceu ativa com cinco colunas. As consultas de categorias e o total de leituras caíram em uma, sem escrita no GET ou consulta adicional observada.

O PostgreSQL registrou SELECTs de picks_template_categories com filtro picks_template_id IN, vinte placeholders por lote e ordem por template, grupo, posição e ID. A composição da 5C6 e o hash da página identificam os mesmos vinte templates. As contagens de linhas são derivadas da leitura agregada da 5C6 e da quantidade de lotes observada, pois o log não registra linhas devolvidas, valores vinculados ou linhas examinadas. O SQL foi capturado somente na sessão diagnóstica, com parâmetros omitidos. Categorias A [acervo local (SQL-A-categories.json)] · Categorias B [acervo local (SQL-B-categories.json)] · Preview A [acervo local (SQL-A.json)] · Preview B [acervo local (SQL-B.json)] · Composição 5C6 [acervo local (05c6-consultas-redundantes-categorias-picks.md)]

## Benchmark HTTP

Protocolo da 5C5, com ordens A/B, B/A, B/A e A/B, JVM nova e um socket persistente por bloco. O plano fixou 30 aquecimentos e seis medidas por bloco. O gate exige reutilização do socket, zero chamadas ao replay nos últimos 12 aquecimentos, CV final de até 15% e diferença de medianas entre janelas de seis de até o maior valor entre 5 ms e 10% da primeira janela. A primeira falha encerra a coleta. Instrumentação temporal, logging SQL e estatísticas Hibernate ficaram desligados nas medidas. Login, diagnóstico e guard ficaram fora das distribuições. PostgreSQL e replay mantiveram os caches entre blocos. [Protocolo 5C5](05c5-validacao-benchmark-projecao-preview.md)

Amostras válidas 0 de 0 medidas. Inválidas ou não qualificadas 0. Aquecimentos válidos 30. Pares completos 0 de 4. Motivo de parada registrado como `warmup-stability-gate-failed`.

| Métrica HTTP (ms, salvo CV) | A | B |
| --- | ---: | ---: |
| Mediana | não medido | não medido |
| Média | não medido | não medido |
| Mínimo | não medido | não medido |
| Máximo | não medido | não medido |
| IQR | não medido | não medido |
| CV (%) | não medido | não medido |
| p75 | não medido | não medido |
| p90 | não medido | não medido |
| Mediana TTFB | não medido | não medido |

Diferença agregada B − A de **não medido ms (não medido%)**. O critério de benefício exige redução de pelo menos 5 ms e 5%, com direção favorável nas duas ordens.

| Par | Ordem | Mediana A | Mediana B | Δ HTTP ms | Δ % | Δ TTFB ms |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |

Mediana das diferenças por par de não medido ms. Por ordem, A/B ficou em não medido ms e B/A em não medido ms. O pareamento usa miniblocos adjacentes, e p75 e p90 são exploratórios.

| Bloco | Janelas de aquecimento (ms) | CV final | Mediana medida | Gate |
| --- | ---: | ---: | ---: | --- |
| P1-A | 58,33 → 52,47 | 3,60% | não medido | interrompido |

A variação entre blocos inclui efeitos residuais de aquecimento, caches compartilhados e carga do host. O guard também pode aquecer o banco fora das janelas medidas. A comparação se limita à página qualificada e ao protocolo desta rodada. Amostras [acervo local (attempts.ndjson)] · Estatísticas [acervo local (statistics.json)] · Aquecimento [acervo local (warmup-gates.ndjson)]

## Interface e integridade

O primeiro bloco, P1-A, ultrapassou o limite de deriva por 0,0197 ms. A diferença entre as medianas foi 5,8523 ms e a tolerância era 5,8326 ms. A coleta encerrou após 30 aquecimentos, antes de aceitar qualquer amostra temporizada. As duas requisições diagnósticas ficam fora da comparação. Não houve reposição de bloco ou ajuste da tolerância.

Playwright dispensado porque a coleta HTTP não demonstrou benefício relevante e consistente pelo limiar predefinido. O ganho no frontend ficou sem medição. O método H permanece a referência.

O guard preservou os dados de negócio, snapshots, sequências e hashes do v3. A única sessão autorizada levou refresh_tokens de 24 a 25 e atualizou o limitador, com 3 linhas ao final. O launcher encerrou apenas as JVMs temporárias, liberou a porta e verificou os listeners protegidos.

Guard [acervo local (guard.ndjson)] · Estado final [acervo local (final.json)]

**Próxima investigação recomendada · Custo da resolução de metadados de mídia no Feed**, em etapa separada.
