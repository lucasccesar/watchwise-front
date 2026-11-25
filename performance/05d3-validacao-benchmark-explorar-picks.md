# Etapa 5D3 · Validação e benchmark de Explorar Picks

**Etapa concluída.** A comparação registrou 48 aberturas e 16 navegações internas válidas. A recomendação é manter a otimização pela redução de GETs, SQL e bytes. O benefício prático em H não foi demonstrado.

## Bloqueio inicial preservado

**Execução bloqueada na qualificação do ambiente.** O daemon Docker respondeu na versão 29.5.2. O container existente `watchwise-benchmark-postgres` estava parado (`exited`, código 255) e nenhuma porta 15433 estava em escuta. O código de saída registra o estado anterior, sem indicar por si só a causa da parada. A validação no PostgreSQL e a comparação A/B ficaram pendentes. A qualificação offline confirmou os quatro artefatos.

## Artefatos qualificados

| Par | Backend | Angular |
| --- | --- | --- |
| A | `8df059b69fa213e57f0510695d2acb6beab194b52622d9a3e40b200cff58f869` | `63e9d160acb3eefdc41793642fedb5329b798a888d1f5b7d09186d265590efd6` |
| B | `169952931b31c629ecc0256e0eec6fb0ebf0b0b07dffb73031d8a714083ec790` | `6556c71bd86d6e0c450c75e4b6052116a6d94ba36974fa041a2767693ab6d5c8` |

Os HEADs continuam em `7105887810a69aa51d017fad1bd4129ff65aeb4f` no backend e `c7685599062c129458809c64624b5e404133a6ad` no frontend. Os builds capturam as alterações locais registradas na 5D2. Recalculei o SHA-256 de cada entrada dos JARs. As 146 dependências são idênticas. O JAR A difere do JAR final da 5C12 apenas no POM embutido. B difere de A em oito classes de Picks e Templates. Os recursos e as classes das três otimizações do Feed são idênticos. O bundle B contém a chamada à nova rota de totais e o A mantém o contrato anterior. Isso qualifica os pares estaticamente. A compatibilidade em execução continua pendente. JAR A [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] · JAR B [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] · Build A [acervo local (browser)] · Build B [acervo local (browser)] · Inventário de diferenças [acervo local (backend-artifacts.json)] · Verificação dos bundles [acervo local (frontend-artifacts.json)] · Registro de compilação 5D2 [acervo local (05d2-otimizacao-totais-explorar-picks.md)]

## Ambiente e integridade

A configuração preservada do container aponta para `127.0.0.1:15433`, com 2 CPUs e 2 GiB. A inspeção não confirma a identidade do database ou o estado dos snapshots porque o PostgreSQL estava offline. Também não havia listeners nas portas originais 8081, 3000 e 5173 ou nas candidatas 8082, 18082 e 3001. A ausência de listeners nessas portas não certifica ausência de concorrência. A validação do JDBC do PID temporário, da persona sintética, das variáveis efetivas da JVM e do replay continua pendente. Pré-checagem [acervo local (environment.json)]

Foram abertas zero conexões PostgreSQL e iniciados zero processos de aplicação ou containers. O guard de v4 e a verificação dos hashes de v3 não rodaram. Não houve acesso ao banco original. Nenhum processo original foi iniciado, encerrado ou alterado. As portas temporárias estavam livres no momento da pré-checagem. Os hashes e os resultados históricos continuam disponíveis. O próximo pré-requisito é o container existente voltar ao estado saudável por ação do usuário ou com autorização explícita para iniciá-lo. O guard deve comparar o estado observado com a última atestação e parar diante de qualquer divergência. Guard v4 [acervo local (benchmark-exec-v4-state.ps1)] · Guard v3 [acervo local (benchmark-exec-v3-state.ps1)] · [Integridade histórica](05c12-benchmark-acumulado-otimizacoes-feed.md#integridade-e-encerramento)

## Persistência e diagnóstico SQL

A suíte compilada na 5D2 herda Testcontainers, inicialização de schema via Flyway e `TRUNCATE TABLE users, contents, picks_templates CASCADE` no preparo dos casos. Ela não foi executada. Quando o ambiente autorizado estiver disponível, a validação deve comparar para a mesma persona os dois `totalElements` paginados em A e B com `picksCount` e `templatesCount` em B, além dos números exibidos. Deve também conferir HTTP 401 sem sessão, ordenação, cartões, estado visual e disponibilidade das páginas para os consumidores legítimos. Os casos de borda que exigem alterar fixtures ficam limitados ao que os testes da 5D2 e o código demonstram. Suporte da suíte [acervo local (PicksDomainIntegrationSupport.java)] · Suíte de persistência [acervo local (PicksTotalsIntegrationTest.java)]

O filtro de instrumentação existente reconhece os endpoints paginados, mas sua lista de rotas não inclui `/users/me/picks/totals`. Ausência de eventos desse filtro em B não significa ausência de SQL. Usar o logger Hibernate já disponível em uma JVM diagnóstica descartável, em A e B, com requisições sequenciais e janelas delimitadas. Manter log de parâmetros desabilitado e preservar somente os formatos sanitizados, contagens e agregados. Separar a consulta de autenticação das contagens, seleção de cartões e enriquecimentos. Medir bytes do corpo e chamadas ao replay. Se a contagem de linhas por consulta ou cache de mídia não for observável, marcar a métrica como não medida. Limitar a até três chamadas por operação e versão, além do login. Executar essa sessão fora dos blocos temporizados. Filtro de observação [acervo local (BenchmarkRequestFilter.java)]

## Protocolo pré-registrado para retomada

1. Verificar identidade e snapshots do v4, hashes do v3 e atividade concorrente. Os scripts usam uma opção legada que prende `-RequireApi` a portas originais. Usar sua coleta somente leitura para fingerprints e atestar separadamente o socket JDBC do PID temporário, a base em `pg_stat_activity` e o proxy. Revalidar migrations, seeds, reconciliações e jobs desabilitados, bloqueio do TMDB real e replay local. Parar se falhar qualquer condição de integridade ou equivalência funcional.
2. Usar a mesma origem `http://localhost:3001` para A e B, com API temporária preferencialmente em `127.0.0.1:8082`, após reconfirmar as portas. Usar a mesma conta em memória, contexto Chromium novo, cache HTTP do navegador desativado no coletor histórico e o mesmo estado do replay. Reiniciar somente a JVM temporária entre minibloco e minibloco. Manter PostgreSQL e replay compartilhados na sequência balanceada, sem resets.
3. Aquecer cada JVM com 15 ciclos HTTP do fluxo de abertura. Cada ciclo começa com o GET de sessão e acompanha o conjunto de chamadas Angular pertinente ao par, incluindo os auxiliares do cabeçalho e as três ordenações. Usar a janela completa entre início e último corpo recebido, com concorrência equivalente e conexões reutilizáveis. A unidade é um ciclo do mesmo fluxo, que contém várias requisições. Comparar as medianas das duas últimas janelas de cinco ciclos, com tolerância de `max(5 ms, 10% da mediana anterior)`. Acrescentar cinco ciclos por vez até o máximo de 30. O gate também exige todas as respostas esperadas e zero chamadas ao replay na janela final. Esse tempo de aquecimento não constitui H.
4. Realizar quatro pares fixos `A/B, B/A, B/A, A/B`. Cada minibloco tem dois aquecimentos de navegador, seis tentativas de abertura medidas e duas navegações internas medidas após preparação equivalente. Usar o predicado H histórico, com cinco links de Recentes em ordem e 20 de 72 no clique para Mais escolhidos. Conferir os totais em coleta separada do cronômetro H para evitar mudar seu ponto final. Guard antes e depois, fora das janelas.
5. Se o aquecimento não qualificar o minibloco, registrar e seguir a ordem planejada. Sem reposição após falha para atingir uma meta de válidas. Invalidar tentativas com dados, cartões, autenticação, endpoints, HTTP, JavaScript ou identidade de versão divergentes. Terminar a rodada se houver mutação inesperada ou perda de isolamento. Estatísticas pareadas usam somente pares completos, com deriva, dispersão e consistência por ordem explícitas. Usar redução de pelo menos 10 ms e 5% em H como critério de relevância prática, acompanhada de consistência nas duas ordens. O clique interno é exploratório e uma série pequena não demonstra equivalência temporal. [Protocolo 5C12](05c12-benchmark-acumulado-otimizacoes-feed.md#protocolo) · Cenários e H históricos [acervo local (04b6b-baseline-picks-templates.md)]

## Resultados e decisão

| Medida 5D3 | A | B | Diferença |
| --- | --- | --- | --- |
| GETs de abertura e GETs dos totais | Não medida | Não medida | — |
| SQL dos totais e SQL total | Não medida | Não medida | — |
| Cartões e resoluções de mídia para os totais | Não medida | Não medida | — |
| Bytes do cabeçalho e da abertura | Não medida | Não medida | — |
| Mediana até ambos os totais | Não medida | Não medida | — |
| H de Recentes e H de Mais escolhidos | Não medida | Não medida | — |

Houve zero tentativas de navegador, zero amostras válidas ou inválidas e zero pares iniciados. As estatísticas por par e ordem e a verificação de regressão de Mais escolhidos ficaram pendentes. A referência histórica sem alteração confirmou 30 amostras válidas com seis GETs em Recentes e 30 com três GETs no clique. Esses valores não são resultados do par A/B da 5D3. Agregado dos resultados brutos 4B6-B [acervo local (historical-reference.json)] · [Matriz de cobertura com complemento](04b7-matriz-cobertura.csv)

**Manter provisoriamente.** A 5D2 demonstrou a redução no componente e no caminho de serviço em testes locais. Equivalência real, SQL, transferência, ganho em H e eventual regressão ainda precisam da execução no v4. Não há sinal suficiente para abrir agora uma intervenção de carregamento independente das seções. A espera adicional mediana de 0,48 ms da 5D1 sustenta reavaliar essa oportunidade apenas se aparecer efeito relevante na cauda ou em falhas. Após concluir Explorar Picks, a próxima candidata da matriz é **Notificações**, com foco no GET auxiliar de resumo da Home e na relação dele com o conteúdo útil. Diagnóstico 5D1 [acervo local (05d1-diagnostico-explorar-picks.md)] · [Prioridades 4B7](04b7-consolidacao-baselines.md#limitações-e-prioridades)

## Retomada autorizada · 24/11/2026

O container original foi identificado pelo projeto Compose `watchwise-benchmark`, imagem `postgres:16-alpine`, volume existente `watchwise-benchmark-pgdata`, mapeamento `127.0.0.1:15433:5432` e limites de 2 CPUs e 2 GiB. Com a porta livre, executei `docker start watchwise-benchmark-postgres`. O container ficou saudável, a conexão TCP abriu e o PostgreSQL confirmou `watchwise_benchmark_exec_v4` em sessão somente leitura.

Os guards antes e depois confirmaram igualdade integral de tabelas e sequências do v4 com o encerramento da 5C12 e do v3 com a referência histórica. A comparação com a referência anterior à 5C12 diverge apenas em `refresh_tokens` e `shared_limiter_state`. Essas duas tabelas já coincidem integralmente com o encerramento da 5C12. Evidências de integridade [acervo local (resume-20261124-070826)]

**Bloqueio atual.** O catálogo do replay mantém o hash esperado, mas o serviço local exigido pelo executor em `127.0.0.1:18091` não está em escuta. A API e o frontend originais também continuam sem listeners. A autorização de inicialização desta retomada cobre apenas o container PostgreSQL. O replay precisa ser restabelecido para qualificar os pares sem recorrer ao TMDB real. Nenhuma sessão HTTP, diagnóstico SQL da aplicação ou tentativa Playwright foi iniciada. O container PostgreSQL permanece em execução e a recomendação provisória da etapa permanece válida.

## Replay local restabelecido · 24/11/2026

Iniciei o script histórico `benchmark-fixtures/tmdb-replay.mjs` na porta livre `127.0.0.1:18091`, com atraso zero e o catálogo existente `target/benchmark-s2-q-v2-catalog.json` aberto para leitura. O SHA-256 confirmado foi `1443edeb41d3cda1b9c66929dd065eb40e0b66196eabc6774d151746fc487642`. O serviço registrou prontidão, retornou 404 para uma referência ausente e 422 para uma rota não suportada. O código responde localmente e não possui encaminhamento externo. Os guards voltaram a confirmar os hashes de tabelas e sequências de v4 e v3. Ambos os serviços permanecem ativos. Evidências da retomada do replay [acervo local (replay-20261124-071228)]

A qualificação dinâmica dos JARs e as medições continuam pendentes. O executor existente da 5C12 está parametrizado para Feed, lê o log histórico do replay e pressupõe APIs originais nas portas 8081 e 18083, que continuam sem listeners. A execução de Picks exige adaptar o executor auxiliar para os pares preservados, o log novo e a verificação dos PIDs temporários, mantendo as verificações de integridade. Não houve amostras A/B nesta retomada.

## Execução A/B · qualificação concluída

A adaptação do executor da 5C12 separa o servidor estático por variante, usa o log ativo do replay com offsets por operação e acompanha os PIDs temporários no guard. As verificações de prontidão do Chromium mantêm o H histórico de 4B6-B. A checagem adicional de totais ocorre depois da marca de H. A checagem de integridade e o diagnóstico SQL ficaram fora das janelas oficiais. Executor [acervo local (experiment.mjs)] · Execução [acervo local (20261124T101556199Z)]

| Diagnóstico do cabeçalho | A | B |
| --- | ---: | ---: |
| GETs | 2 | 1 |
| Leituras SQL incluindo sessão | 18 | 3 |
| Contagens explícitas | 1 | 2 |
| Cartões devolvidos | 1 | 0 |
| Bytes do JSON sem compressão | 2.422 | 36 |
| Totais exibidos | 48 escolhas e 0 modelos | 48 escolhas e 0 modelos |

Em B, o PostgreSQL executou uma projeção de três colunas para validar a sessão e duas contagens escalares. A contagem de Picks manteve a associação com o template e o predicado de bloqueios. A outra filtrou templates pelo criador. Não houve seleções de cartões ou enriquecimentos no novo endpoint. No diagnóstico da persona, nenhuma operação do cabeçalho fez chamadas ao replay. Isso mede o replay, sem inferir quantas resoluções internas acertaram o cache em A. Os endpoints paginados preservaram seus totais em B. As rotas protegidas verificadas devolveram HTTP 401 sem sessão. As duas aberturas de qualificação confirmaram os cinco cartões esperados em ordem, com seis GETs em A e cinco em B. Mais escolhidos confirmou os mesmos 20 de 72 cartões em ordem, com três GETs em A e dois em B. SQL A [acervo local (SQL-A.json)] · SQL B [acervo local (SQL-B.json)]

## Resultado da coleta balanceada

**Manter a otimização.** O recorte principal não demonstrou benefício pelo critério de relevância prática em H.
A diferença agregada de Recentes foi de 0,29 ms (0,14%) e a de Mais escolhidos foi de 2,36 ms. A comparação interna é exploratória.

| Recorte | Mediana da métrica | A | B | B − A |
| --- | --- | ---: | ---: | ---: |
| Recentes, abertura direta | GETs por operação | 6,00 | 5,00 | -1,00 |
| Recentes, abertura direta | GETs do cabeçalho | 2,00 | 1,00 | -1,00 |
| Recentes, abertura direta | Bytes nos corpos HTTP da operação | 9352,00 | 6954,00 | -2398,00 |
| Recentes, abertura direta | Bytes nos corpos HTTP do cabeçalho | 2445,00 | 47,00 | -2398,00 |
| Recentes, abertura direta | Janela das requisições dos totais (ms) | 52,23 | 49,78 | -2,45 |
| Recentes, abertura direta | Tempo até os totais renderizados observados (ms) | 211,50 | 212,23 | 0,74 |
| Recentes, abertura direta | Duração dos GETs do catálogo (ms) | 40,70 | 41,48 | 0,78 |
| Recentes, abertura direta | TTFB dos GETs do catálogo (ms) | 20,00 | 20,86 | 0,86 |
| Recentes, abertura direta | Tempo até conteúdo útil H (ms) | 210,12 | 210,41 | 0,29 |
| Mais escolhidos, navegação interna | GETs por operação | 3,00 | 2,00 | -1,00 |
| Mais escolhidos, navegação interna | GETs do cabeçalho | 2,00 | 1,00 | -1,00 |
| Mais escolhidos, navegação interna | Bytes nos corpos HTTP da operação | 13921,00 | 11523,00 | -2398,00 |
| Mais escolhidos, navegação interna | Bytes nos corpos HTTP do cabeçalho | 2445,00 | 47,00 | -2398,00 |
| Mais escolhidos, navegação interna | Janela das requisições dos totais (ms) | 27,05 | 11,93 | -15,12 |
| Mais escolhidos, navegação interna | Tempo até os totais renderizados observados (ms) | 111,29 | 113,55 | 2,26 |
| Mais escolhidos, navegação interna | Duração dos GETs do catálogo (ms) | 38,11 | 39,52 | 1,41 |
| Mais escolhidos, navegação interna | TTFB dos GETs do catálogo (ms) | 31,01 | 33,53 | 2,52 |
| Mais escolhidos, navegação interna | Tempo até conteúdo útil H (ms) | 109,91 | 112,28 | 2,36 |

A janela de rede dos totais vai do primeiro disparo ao último corpo concluído. O tempo até os totais renderizados é observado depois do predicado H, portanto pode incluir espera pelo catálogo. A coleta SQL diagnóstica contabiliza as operações do cabeçalho, sem uma contagem SQL total da abertura.

| Recorte | Versão | Válidas | Média | Mediana | Mín. | Máx. | IQR | CV (%) | p75 | p90 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Recentes, abertura direta | A | 24 | 214,29 | 210,12 | 203,99 | 272,17 | 7,02 | 6,74 | 213,90 | 227,51 |
| Recentes, abertura direta | B | 24 | 214,94 | 210,41 | 202,75 | 246,54 | 12,38 | 5,27 | 220,08 | 231,25 |
| Mais escolhidos, navegação interna | A | 8 | 110,54 | 109,91 | 103,73 | 118,18 | 7,14 | 4,97 | 113,76 | 117,86 |
| Mais escolhidos, navegação interna | B | 8 | 115,21 | 112,28 | 102,71 | 145,05 | 11,83 | 11,91 | 118,38 | 128,03 |

| Recorte | Par | Ordem | H A | H B | B − A | Completo |
| --- | ---: | --- | ---: | ---: | ---: | --- |
| Recentes, abertura direta | 1 | A/B | 208,38 | 209,69 | 1,31 | sim |
| Recentes, abertura direta | 2 | B/A | 212,13 | 216,27 | 4,14 | sim |
| Recentes, abertura direta | 3 | B/A | 208,96 | 209,70 | 0,75 | sim |
| Recentes, abertura direta | 4 | A/B | 212,60 | 209,43 | -3,17 | sim |
| Mais escolhidos, navegação interna | 1 | A/B | 112,59 | 123,88 | 11,29 | sim |
| Mais escolhidos, navegação interna | 2 | B/A | 112,41 | 106,22 | -6,19 | sim |
| Mais escolhidos, navegação interna | 3 | B/A | 106,22 | 116,59 | 10,37 | sim |
| Mais escolhidos, navegação interna | 4 | A/B | 110,96 | 114,16 | 3,20 | sim |

A mediana das diferenças entre pares completos foi 1,03 ms em Recentes e 6,78 ms em Mais escolhidos. As duas ordens não tiveram deltas favoráveis em todos os pares completos. O desdobramento por par mostra a deriva e a dispersão sem misturar preparações e aquecimentos às amostras medidas.
Foram descartadas 0 amostras inválidas entre as operações medidas registradas. Motivos e eventuais miniblocos sem qualificação ficam nos brutos. Nenhum bloco foi repetido para substituir falhas.

O guard final confirmou v3 preservado e somente tabelas operacionais autorizadas com diferença no v4. As sequências, snapshots e dados de negócio coincidem com a referência inicial. Os servidores temporários foram encerrados. PostgreSQL e replay permanecem em execução. A sugestão de próxima prioridade continua sendo Notificações. A liberação independente das seções não entra neste fechamento.

Dados brutos e análise [acervo local (20261124T101556199Z)]


Todos os oito miniblocos passaram no aquecimento. Ciclos até aprovação, na ordem de execução, foram 20, 15, 15, 20, 15, 20, 25 e 15. Os 96 registros do guard confirmaram somente alterações operacionais autorizadas em refresh_tokens e shared_limiter_state. Nas operações de navegador houve zero chamadas ao replay. Em Mais escolhidos, dois dos quatro pares tiveram aumento superior a 10 ms, com sinais mistos e dispersão maior em B. O recorte exploratório não estabelece equivalência temporal.
