# 6B — Validação completa do candidato de integração

**Decisão em 25/11/2026 — bloqueado para a 6C.** Os três artefatos foram compilados e a Watchlist reconciliada passou nos testes direcionados e de integração. A suíte completa registrou 39 falhas e 152 erros no backend e 48 falhas no Angular. Todos esses casos também ocorreram na referência anterior à integração sob as mesmas condições. A integração ainda carece de cobertura confiável em fluxos cujo contexto de teste falhou, de resolução das falhas reproduzíveis e de isolamento dos testes que dependem do provedor de mídia.

## 1. Identificação do candidato

| Repositório | Worktree da 6A.1 | HEAD |
|---|---|---|
| Backend | Candidato API [acervo local (6a1-api)] | `7105887810a69aa51d017fad1bd4129ff65aeb4f` |
| Frontend | Candidato Angular [acervo local (6a1-front)] | `baadc3b8b48eaf9da4bad236ef6b46c999cd13ab` |

Os dois candidatos continuaram com as alterações locais conciliadas da 6A.1. `git diff --check HEAD` passou e a lista de entradas em conflito estava vazia nos dois. O resultado de `git status` dos dois workspaces originais coincide com os registros da 6A.1, descontadas as entregas em Markdown. As referências para reprodução são cópias das fontes pré-integração materializadas dentro dos worktrees autorizados em saídas locais. A referência Angular usa o mesmo lockfile e dependências do candidato. No backend, a primeira tentativa de usar somente o commit base falhou na compilação pela diferença conhecida na assinatura de `DiaryEntryControllerTest`. A comparação foi feita com o estado local anterior à 6A.1, que já continha a correção daquela assinatura. [6A](06a-auditoria-final.md) · [6A.1](06a1-preparacao-candidato-integracao.md) · [5R1](05r1-avaliacao-continuidade-projeto.md)

## 2. Suíte backend e classificação

Java 21.0.8 e Maven instalado 3.9.12 em modo offline. O JAR local do Maven Wrapper estava ausente. A execução final usou Surefire sobre as fontes e testes compilados no candidato, sem filtro de classe. Os quatro testes de instrumentação foram executados em separado no perfil respectivo. Na referência pré-integração, esse mesmo spec foi separado da comparação para manter o conjunto de produto idêntico. Os tempos são de execução do Maven, sem interpretação como benchmark.

| Execução | Total | Aprovados | Falhas | Erros | Ignorados | Duração |
|---|---:|---:|---:|---:|---:|---:|
| Candidato, suíte de produto | 4.138 | 3.944 | 39 | 152 | 3 | 11 min 39 s |
| Referência pré-integração, suíte de produto | 4.138 | 3.944 | 39 | 152 | 3 | 11 min 05 s |
| Instrumentação no perfil de benchmark | 4 | 4 | 0 | 0 | 0 | 57,689 s com build |
| Qualificação integrada de conteúdo e Watchlist | 57 | 57 | 0 | 0 | 0 | 1 min 04 s |

A comparação por classe, método, tipo de resultado e grupo de causa encontrou **191 ocorrências reproduzidas** na referência. Nenhuma falha do candidato ficou exclusiva ou sem correspondente na referência. Isso identifica a relação com a integração, preservando as diferenças entre falhas de produto, configuração de testes e dependência externa. Log candidato [acervo local (backend-tests-isolated.log)] · Log referência [acervo local (backend-reference-isolated.log)] · Classificação por teste [acervo local (backend-failure-comparison.json)] · Qualificação de contrato [acervo local (backend-contract-qualification.log)]

| Evidência | Classificação e efeito |
|---|---|
| 83 erros de descoberta de múltiplas classes `@SpringBootConfiguration` | Preexistentes. `WatchwiseApiApplication` e `DemoDataSeedApplication` são descobertas no mesmo pacote. Afeta, entre outros, testes de Feed, Seguidores, Diário e Notificações. |
| Dois erros de registro duplicado de beans e 33 erros por limiar de contexto | Reproduzidos nos dois lados. O primeiro erro de contexto em Picks e Resumo aponta para colisão de configuração importada pelo teste, seguida de tentativas que o Spring deixa de reexecutar. |
| Sete erros SQL em testes de leitura do Diário | Preexistentes. PostgreSQL rejeita a referência ambígua a `series_tmdb_id` na execução das consultas. |
| Cinco `TmdbUnavailableException` nos testes de importação | Dependência externa indisponível no ambiente autorizado, reproduzida na referência. O endereço apontava para um destino local sem serviço. Nenhuma consulta ao TMDB real foi necessária. |
| Demais erros e 39 falhas de asserção | Reproduzidos na referência. Incluem stubs incompatíveis ou desnecessários em autenticação e progresso, DTOs com NPE em testes de listas, divergência de contagem e repartição de caches, expectativas de DTO/HTTP e erros de serviço. A relação por método está no JSON. |
| Três testes ignorados | Pressupostos de permissões POSIX e criação de links simbólicos no Windows em `ImportTemporaryFilesTest` e `PrivateImportFileStoreTest`. |

O perfil de teste usa PostgreSQL descartável via Testcontainers, sem reutilização. O fallback JDBC também aponta para Testcontainers. A execução aplicou as migrations de teste somente nesses containers. Variáveis herdadas da aplicação foram retiradas do processo, Compose desabilitado, segredos sintéticos fornecidos apenas ao processo, armazenamento de importação isolado e integração TMDB apontada para loopback sem serviço, com proxy externo de bloqueio na JVM. As portas JDBC registradas são dinâmicas e nenhuma corresponde a 15432 ou 15433.

A primeira execução isolada carregou o driver Testcontainers fixo do perfil de teste, que rejeita a URL JDBC PostgreSQL dinâmica fornecida por parte dos testes. A segunda corrigiu a seleção do driver, mas ainda carecia de parâmetros de aplicação requeridos para subir alguns contextos. A execução final usou `dev,test` com os destinos substituídos antes do início e driver deduzido a partir da URL de cada teste. Os erros dessas duas tentativas de configuração foram mantidos nos logs e ficam fora dos resultados finais. Nenhum arquivo de produção ou teste foi alterado. Primeira execução [acervo local (backend-tests.log)] · Segunda execução [acervo local (backend-tests-qualified.log)]

## 3. Suíte Angular

`npm.cmd test -- src --reporter=json`, com Node 24.17.0, npm 11.13.0 e UTC. A suíte de produto executou 208 testes em 36 arquivos, com 160 aprovados, 48 falhas em sete arquivos e zero skips. A janela registrada no JSON foi de 4,03 s. A referência pré-integração usou a mesma versão do runner e o mesmo lockfile e executou 182 testes em 32 arquivos, com 134 aprovados, as mesmas 48 falhas e zero skips. Todos os 48 casos repetiram a mesma assinatura inicial de erro. Não foi observada falha nova ou indeterminada no Angular. Vitest candidato [acervo local (vitest.json)] · Vitest referência [acervo local (vitest-pre-integracao.json)]

| Arquivo | Falhas | Causa observada |
|---|---:|---|
| `modal-focus.directive.spec.ts` | 5 | Provider `ModalScrollLockService` ausente no teste |
| `pick-episode-selection.spec.ts` | 2 | Provider `ToastNotificationsService` ausente no teste |
| `share-preview.component.spec.ts` | 7 | Provider `ToastNotificationsService` ausente no teste |
| `episode.component.spec.ts` | 13 | Provider `ToastNotificationsService` ausente no teste |
| `diary.component.spec.ts` | 18 | Provider `ContentApiService` ausente no teste |
| `trending.component.spec.ts` | 2 | Injeção de `ToastNotificationsService` fora do contexto Angular |
| `content-review-requests.spec.ts` | 1 | A asserção exige `expectedVersion: null` no PUT de nota de temporada. O serviço omite o campo na mesma condição nos dois lados. |

Passaram os 36 testes dirigidos aos caminhos da 6A.1 no contexto da suíte completa, incluindo sessão, Watchlist, ordenação e Perfil. Também passaram os specs de antecipação de Templates, Meus Picks, resumo do Diário e fundo de Notificações. As falhas de outros specs do Diário permanecem registradas separadamente.

## 4. Builds, instrumentação e contratos

| Artefato | Resultado e SHA-256 |
|---|---|
| JAR de produção [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | Compilado. `3b0578d9ace23047031fe26697dcffd9dfd235ba7694a1136054c15f6487701c`. Log [acervo local (backend-build.log)] |
| JAR de benchmark [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | Compilado com `-Pbenchmark-observation`. `58665e1f0af60cb94dab3f8bda2665ad83dbb430bebf965b3f76d77222766177`. Log [acervo local (benchmark-build.log)] |
| Angular de produção [acervo local (browser)] | Compilado em 15,06 s. SHA-256 da árvore de 88 arquivos `c5fb2110f3d2105c8b9debddd97ec4bae9c472a5c2da2a366bee862bbcac14cb`, igual ao da 6A.1. Log [acervo local (build.log)] |

Os JARs possuem `WatchwiseApiApplication` como classe de entrada. O produtivo contém zero classes em `common/performance`. O de benchmark contém `BenchmarkObservationConfiguration`, `BenchmarkRequestFilter` e as quatro classes internas esperadas. As outras 1.965 entradas de `BOOT-INF/`, incluindo as propriedades e dependências empacotadas, são idênticas em bytes entre os dois builds e em relação à produção da 6A.1. Os hashes dos dois JARs originais da 6A.1 continuam iguais aos registrados. Nenhuma propriedade experimental de benchmark foi incorporada aos recursos. A configuração `dev` preexistente continua no pacote e requer seleção explícita de perfil no ambiente de produção. O executável de seed preexistente também continua no código e é relevante para a ambiguidade dos testes.

O GET paginado da Watchlist passou nos 45 testes de integração do controller, incluindo o retorno dos gêneros. Os specs Angular validam o opt-in `includeGenreOptions=true`, a paginação, filtros e a ausência do GET auxiliar. O fluxo do Perfil e da ordenação de listas passou no Angular. As 13 otimizações permanecem presentes, conforme a identidade dos builds de aplicação com a 6A.1 e o inventário da 5R1. Essa verificação comprova preservação do código. A cobertura integrada fica limitada pelos erros da suíte descritos acima. [Inventário 6A.1](06a1-preparacao-candidato-integracao.md#5-preservação-das-13-otimizações)

## 5. Avisos CSS

Os oito avisos têm os mesmos arquivos, limite de 25 kB e tamanhos dos builds 5Q2 A/B e 6A.1. São preexistentes e nenhum orçamento foi alterado.

| Componente | Tamanho informado |
|---|---:|
| Início | 41,48 kB |
| Watchlist | 30,08 kB |
| Configurações | 29,16 kB |
| Detalhe de lista | 47,33 kB |
| Jogo | 25,59 kB |
| Prévia de compartilhamento | 34,91 kB |
| Diário | 32,58 kB |
| Perfil | 116,03 kB |

Log 5Q2 A [acervo local (build-A.log)] · Log 5Q2 B [acervo local (build-B.log)] · Log 6B [acervo local (build.log)]

## 6. Impedimentos e recomendação para a 6C

Os três builds, o contrato reconciliado da Watchlist e a separação da instrumentação foram aprovados nos respectivos recortes. A suíte completa continua vermelha. A ambiguidade de bootstrap bloqueia testes de integração, os erros no Diário afetam cobertura de persistência, e parte dos fluxos de importação depende de um provedor externo indisponível na configuração isolada. Corrigir ou tratar formalmente esses impedimentos em escopo próprio e repetir a validação antes da 6C. Os avisos CSS e as cinco ressalvas de manutenção da 5R1 seguem documentados.

As árvores originais e os worktrees foram preservados. Os logs e builds novos estão em saídas isoladas ignoradas pelo Git. Os testes usaram Testcontainers sem reutilização e nenhum banco original ou de benchmark. Nenhum benchmark, seed desses ambientes, acesso ao TMDB real, commit, push ou deploy foi executado.
