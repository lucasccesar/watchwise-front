# Etapa 5C11 · Validação dos IDs internos de mídia no Feed

**Melhoria estrutural confirmada. Recomendo manter a otimização.** A versão B eliminou o lote de resolução de IDs em `contents` para as quatro coordenadas da primeira página. O GET passou de 27 para 26 consultas de leitura, com JSON equivalente. A latência ficou fora desta etapa.

## Artefatos e ambiente

| Artefato da 5C10 | SHA-256 |
| --- | --- |
| A · Duas otimizações [acervo local (5c10-A-duas-otimizacoes.jar)] | `ecf5dafef8663ad307a8d2a5de3c800ff97035c6c0647bdc4dc8743be64c4e73` |
| B · Três otimizações [acervo local (5c10-B-ids-de-midia.jar)] | `4648efaea42daab8abee8e104ed0497918e159976954873dcbcdaf88fa6c295c` |

Os hashes foram verificados antes da execução. A atestação da 5C10 confirmou dependências e recursos iguais, com diferenças restritas às classes de resolução dos IDs e de montagem do Feed. Reutilizei o executor diagnóstico da 5C6, baseado na captura PostgreSQL da 5C5/5C8. As JVMs foram iniciadas separadamente em `127.0.0.1:18082`, pois 8082 estava ocupada. O pool foi confirmado exclusivamente no banco `watchwise_benchmark_exec_v4` em `127.0.0.1:15433`. Migrations, seeds e tarefas agendadas configuráveis ficaram desabilitados. A sessão foi criada uma vez e validada como a conta sintética central. Atestação 5C10 [acervo local (verification.json)] · Ambiente e configuração [acervo local (environment.json)]

Foi feito um GET diagnóstico por versão em `/api/v1/feed?size=20`, sem cursor, com ambas as JVMs recém-iniciadas e o mesmo replay local. Nenhum cache compartilhado foi limpo nem houve aquecimento artificial. Hits e misses por requisição ficaram sem medição. O reaproveitamento de UUIDs depende das referências do Feed e precede a resolução de metadados. Assim, a comparação estrutural é sustentada pela composição idêntica, pelas identidades presentes e pelo SQL observado. As etapas anteriores permanecem como contexto e não como amostras desta comparação. 5C9 [acervo local (05c9-diagnostico-metadados-midia-feed.md)] · [5C8](05c8-validacao-benchmark-categorias-picks.md) · [5C5](05c5-validacao-benchmark-projecao-preview.md) · [Baselines](04b7-consolidacao-baselines.md)

## Resultado PostgreSQL

| Métrica | A | B |
| --- | ---: | ---: |
| Referências de alvo ou contexto na página | 20 | 20 |
| Coordenadas distintas necessárias | 4 | 4 |
| Coordenadas com ID interno disponível | 4 | 4 |
| Conflitos identificados nas referências | 0 | 0 |
| IDs reutilizados, derivados do fluxo e do SQL | 0 | 4 |
| Coordenadas encaminhadas à resolução de IDs | 4 | 0 |
| Execuções do lote de resolução | 1 | 0 |
| Coordenadas consultadas no lote | 4 | 0 |
| Linhas retornadas pelo lote | 4 inferidas | 0, sem execução |
| Total de consultas de leitura | 27 | 26 |
| Consultas de categorias de Picks | 1 | 1 |
| Colunas selecionadas no preview de seguidos | 5 | 5 |
| HTTP / atividades / previews | 200 / 20 / 65 | 200 / 20 / 65 |
| Bytes do JSON sem compressão | 60.742 | 60.742 |
| Equivalência estrutural do JSON | confirmada | confirmada |

O SELECT de A recuperou as entidades `contents` por quatro pares `(type, tmdb_id)` unidos por OR. Essa assinatura identifica o método por coordenadas e distingue o lote de outras leituras de conteúdo. O log do servidor preservou os placeholders, sem valores de parâmetros. Os quatro UUIDs distintos foram recuperados no JSON e são compatíveis com quatro linhas pela chave única, sem medição direta de linhas devolvidas, examinadas ou entidades hidratadas. B não executou esse SELECT. A categoria continuou usando um lote com 20 parâmetros e a projeção de seguidos continuou selecionando `id, username, name, profile_picture, is_profile_public`. Não houve aumento de consultas nem escrita no GET. SQL A [acervo local (SQL-A.json)] · SQL B [acervo local (SQL-B.json)] · Comparação [acervo local (comparison.json)]

O hash canônico comparou todos os campos, preservando a ordem dos arrays, os valores nulos e a paginação. Coincidiram os hashes de ordem das atividades, do preview e da resposta integral, incluindo Picks, categorias e metadados de mídia. Esta página qualifica o caso de cobertura completa. Coordenadas compostas de episódios, conflitos e cobertura parcial permanecem cobertos pelos testes da 5C10, sem observação PostgreSQL nesta rodada. Os resultados não quantificam custo de CPU, tempo de hidratação ou ganho de velocidade.

## Integridade e próxima etapa

Os guards preservaram fingerprints dos dados de negócio, snapshots, sequências e hashes do v3. O login autorizado elevou `refresh_tokens` de 25 para 26 e atualizou o limitador, que permaneceu com três linhas. As duas leituras do Feed não causaram mutações detectadas. O executor encerrou as duas JVMs temporárias, liberou 18082 e verificou os listeners originais de 8081, 3000 e 5173. Os JARs e os resultados históricos foram preservados. Guard [acervo local (guard.ndjson)] · Estado final [acervo local (final.json)]

**Próxima ação recomendada · Comparação acumulada na 5C12.** Usar como original o JAR anterior à projeção [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)], SHA-256 `f3ffba2d2c0ac016f5a69d50993d560155c8d75d4dea8f900f1d643e49489c72`, e como final o JAR B acima. A inspeção por entrada dos JARs encontrou diferenças somente nas classes abrangidas pelas três otimizações e suas classes internas. Nenhum recurso ou dependência divergente foi detectado. Comparar as três consultas e o total de leituras com a mesma página, depois medir HTTP sem instrumentação diagnóstica. Medir conteúdo útil pelo método histórico H somente se a evidência HTTP justificar. Comparação acumulada dos artefatos [acervo local (cumulative-artifacts.json)]
