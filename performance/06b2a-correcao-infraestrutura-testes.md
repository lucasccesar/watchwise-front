# 6B.2A — Correção da infraestrutura de testes

As três colisões de configuração Spring deixaram de ocorrer no recorte afetado. Os 47 testes Angular antes bloqueados por injeção passaram a executar, com 38 aprovados e nove falhas reveladas. Os cinco cenários de importação que antes dependiam do TMDB passaram com fixtures locais. A 6C continua bloqueada pelas falhas remanescentes e pelas que a execução recuperada tornou visíveis.

[Diagnóstico 6B.1](06b1-diagnostico-falhas-testes.md) · [Validação 6B](06b-validacao-completa-candidato.md) · [Preparação 6A.1](06a1-preparacao-candidato-integracao.md)

## Resultados por grupo

| Grupo | Resultados negativos anteriores | Executados agora | Aprovados | Falhas ou erros no recorte final |
|---|---:|---:|---:|---|
| Descoberta Spring | 83 erros de inicialização por classe | 1.210 em 83 classes | 1.111 | 98 falhas e um erro em métodos que passaram a executar. A ambiguidade não reapareceu. |
| Picks e duplicação de `dataSource` | 2 erros | 2 | 2 | Zero |
| Resumo e registro duplicado de repositório | 33 erros | 33 | 32 | Uma falha de `watchCount`. O contexto carregou. |
| Controles Spring de configuração e Watchlist | 0 | 52 | 52 | Zero. Sete de `ProductionConfigurationTest` e 45 de `WatchlistEntryControllerIntegrationTest`. |
| Angular, seis specs corrigidos | 47 falhas de injeção | 48 | 39 | Nove falhas após montar os componentes. Um dos 39 já passava na 6B. |
| Controles Angular | 0 | 45 | 45 | Zero |
| Casos de importação selecionados | 5 erros de mídia | 5 | 5 | Zero |
| Demais testes nas duas classes de importação | 2 erros de persistência | 15 | 13 | Os mesmos dois erros de persistência em tombstones. |

O consolidado backend usa 89 classes e 1.317 casos únicos. São 1.215 aprovados, 99 falhas, três erros e zero skips. Para as duas classes de importação e o slice de opiniões, foram usados os XMLs das revalidações após o último ajuste. A rodada inicial dessas classes permanece disponível nos logs. O recorte Angular final teve 93 testes, 84 aprovados, nove falhas e zero skips. Nenhuma suíte completa foi executada. Consolidado backend [acervo local (affected-summary.json)] · Angular [acervo local (angular-affected.json)]

## Configuração Spring

A configuração explícita passou a ser `WatchwiseIntegrationTestApplication` para 35 classes de integração completa e para a base `PicksDomainIntegrationSupport`, que cobre outras nove classes antes bloqueadas. Os 39 slices passaram a selecionar `WatchwiseJpaTestApplication`, configuração de teste que registra o pacote da aplicação para auto-configuração do JPA e preserva `@DataJpaTest`. Perfis, propriedades dinâmicas e importações específicas continuam nos respectivos testes.

`PicksTotalsIntegrationTest` passou a usar o contexto herdado de Picks. Os fixtures de datasource de `ProductionConfigurationTest` ficaram como `@TestConfiguration`, com as importações explícitas já exercitadas pelos sete testes da classe. O Resumo passou a usar o contexto de integração compartilhado. Isso retira da sua varredura `PlatformImportTestApplication`, que registrava novamente os repositórios. A configuração de importação continua disponível a seus próprios testes.

A rodada de qualificação executou 135 casos com 133 aprovados. Feed e Resumo chegaram às asserções e tiveram uma falha cada. Na rodada ampliada, o slice `OpinionReadConsumersIntegrationTest` revelou uma dependência de enriquecimento que sua configuração não fornecia. O teste passou a prover um double de `TmdbVoteAverageBatchResolver`, mantendo os repositórios e as consultas reais. Os seis métodos desse slice passaram na revalidação. Qualificação Spring [acervo local (spring-smoke.log)] · Rodada dirigida [acervo local (affected-backend.log)] · Revalidação do slice de opiniões [acervo local (spring-opinion.log)]

**Arquivos backend.** Os contextos foram declarados nas 74 classes com anotação própria listadas no inventário de execução [acervo local (affected-summary.json)], que contém os nomes qualificados. As nove classes da ambiguidade que herdam `PicksDomainIntegrationSupport` recebem a alteração pela base. Além das 74 classes, mudaram `PicksDomainIntegrationSupport.java`, `PicksTotalsIntegrationTest.java`, `ProductionConfigurationTest.java` e `SummaryControllerIntegrationTest.java`. Foi criado `src/test/java/com/watchwise_test/WatchwiseJpaTestApplication.java`. `OpinionReadConsumersIntegrationTest.java` faz parte dos 39 slices e também recebeu o double.

## Injeção Angular

| Arquivo | Ajuste | Aprovados / executados |
|---|---|---:|
| `modal-focus.directive.spec.ts` | Provider de trava de rolagem com o contrato de aquisição e liberação | 5 / 5 |
| `pick-episode-selection.spec.ts` | Provider de notificações no contexto de criação e preenchimento | 2 / 2 |
| `share-preview.component.spec.ts` | Notificações e serviço de conteúdo no injector. Busca inesperada de imagens faz o teste falhar. | 7 / 7 |
| `episode.component.spec.ts` | Providers de DOM, renderização, rota, título, sanitização e notificações. Fixtures de episódios adjacentes com o tipo exigido pelo contrato. | 9 / 13 |
| `diary.component.spec.ts` | Providers de conteúdo, notificações e confirmação, com respostas de resumo e páginas usadas na inicialização | 13 / 18 |
| `trending.component.spec.ts` | Criação dentro de contexto de injeção e colaboradores na ordem do construtor | 3 / 3 |

Nenhuma asserção foi removida ou atenuada. Os quatro casos de Episódio revelados exercitam um método de salvamento ausente ou esperam escrita direta ao abrir o registro de visualização. Os cinco do Diário incluem expectativas de carregamento integral e de filtragem e ordenação local diante da leitura paginada. Essas divergências de comportamento e fixtures ficaram fora da correção de injeção. O teste de payload da primeira nota ficou fora deste recorte. Os controles de sessão, Watchlist, Perfil, ordenação e resumo do Diário passaram.

## Importação

`StandaloneCollectionImportIntegrationTest.java` e `ImportCollectionWritersIntegrationTest.java` passaram a fornecer um `TmdbClient` simulado. A nova `ImportMovieDetailsFixture.java` responde com detalhes do filme e datas regionais somente para os IDs sintéticos de cada cenário. O double também representa explicitamente indisponibilidade nas outras consultas de detalhes que antes operavam com o destino local bloqueado. As validações de ranks, páginas, duplicatas, mídia já assistida, tombstones e escrita de snapshots continuam exercitando os serviços existentes e PostgreSQL descartável. Os testes não usam TMDB real.

Todos os 14 testes da classe de writers passaram. Na classe standalone, quatro dos seis passaram, incluindo o cenário de mídia. Os dois erros restantes são `TransientPropertyValueException` no flush de exclusão em cenários de tombstone. Ambos já constavam da 6B e permaneceram fora deste escopo. Importação final [acervo local (import-stable.log)] · Rodada inicial dos cinco cenários [acervo local (import-five.log)]

## Grupos pendentes para a 6B.2B

| Pendência | Situação |
|---|---|
| SQL ambíguo no Diário e proxies Hibernate sem sessão | Oito e 15 ocorrências, respectivamente, no diagnóstico anterior. São caminhos produtivos confirmados no ambiente isolado. Permanecem sem correção. |
| Primeira nota | Uma divergência de contrato no teste Angular, preservada conforme a 6B.1. |
| Login e OAuth | 89 respostas HTTP 400 com `HttpMessageNotReadableException`, sendo 28 em Auth e 61 em User. Ocorrem em `/auth/login` e `/auth/oauth/google`. As fixtures omitem `rememberMe` em DTOs com booleano primitivo. A hipótese de falha no binding dessa ausência precisa de teste dirigido antes de escolher a correção ou alterar o contrato. |
| Outros casos Spring revelados | Três falhas no controller do Diário, três HTTP 500 com NPE no comando do Diário, um cartão Top 5 ausente no Feed, três casos de Picks e um total mensal no Resumo. O índice de execução registra os métodos. A fixture do Resumo usa um mês fixo enquanto a criação usa a data corrente. A causa final ainda deve ser confirmada. |
| Angular após injeção | Quatro casos de Episódio e cinco do Diário. Validar o contrato da interface e atualizar fixtures e asserções relevantes quando houver evidência. |
| Importação e demais grupos 6B.1 | Dois erros de flush em tombstones continuam reproduzíveis. Progresso de importação, mocks, DTOs, caches e outras expectativas do inventário anterior seguem pendentes fora do recorte executado. |

Na 6B.2B, começar com reproduções dirigidas para o SQL do Diário e a sessão Hibernate no detalhe de lista. Em paralelo conceitual, qualificar o contrato de entrada de login e OAuth com e sem `rememberMe` e separar os testes de UI que dependem de fluxos antigos. Registrar a origem de cada falha revelada antes de corrigir produção ou fixtures. Repetir as suítes completas somente depois de validar esses recortes.

## Preservação e isolamento

As mudanças de código desta etapa estão em 82 arquivos de teste do backend e seis specs Angular. Nenhuma alteração produtiva foi introduzida. Os 1.707 arquivos de classe de produção recompilados permaneceram idênticos, byte a byte, aos do JAR produtivo da 6A.1. Os hashes dos JARs históricos de produção e benchmark continuam iguais aos registrados. Os 13 ajustes de desempenho, os orçamentos CSS e as alterações paralelas foram preservados.

A execução Java usou Testcontainers sem reutilização, com portas dinâmicas e Compose desabilitado. Os logs registraram 101 portas temporárias distintas e zero usos das portas protegidas 15432 e 15433. O TMDB foi limitado a doubles ou ao destino de loopback sem serviço, com proxy externo bloqueado na JVM. As árvores originais foram conferidas contra os registros da 6A.1. Este relatório está no worktree frontend da 6A.1. A 6B.2B permanece pendente.
