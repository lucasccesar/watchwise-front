# 6A.1 — Preparação do candidato de integração

O candidato isolado reconcilia os três commits do frontend com o trabalho local e mantém as 13 otimizações. O JAR de produção contém zero classes de instrumentação. O JAR de benchmark contém as seis classes históricas. Passaram 101 testes direcionados do backend, quatro do perfil de instrumentação e 36 do frontend. A suíte completa e a verificação integrada em execução ficam para a 6B.

Referências da decisão e do inventário de origem. [6A](06a-auditoria-final.md) · [5R1](05r1-avaliacao-continuidade-projeto.md)

## 1. Candidato e alterações reconciliadas

| Repositório | Árvore original | Referência local de `origin/main` | Base do candidato |
|---|---|---|---|
| Frontend | `main` em `c7685599062c129458809c64624b5e404133a6ad` | `baadc3b8b48eaf9da4bad236ef6b46c999cd13ab`. Relação 0/3. O HEAD original é o ancestral comum. | Worktree frontend [acervo local (6a1-front)], em `baadc3b` |
| Backend | `main` em `7105887810a69aa51d017fad1bd4129ff65aeb4f` | Mesmo commit, relação 0/0 | Worktree backend [acervo local (6a1-api)], em `71058878` |

As referências remotas são as já armazenadas localmente. O frontend incorpora `f03af2a` (dados de Perfil e gêneros), `922f34a` (carregamento contínuo para ordenação) e `baadc3b` (documentação de contratos). As alterações rastreadas do workspace foram aplicadas aos candidatos com merge de três vias. Foram copiadas as fontes e os documentos de produto ainda não rastreados em `src/` e `docs/`. Os scripts, resultados e demais arquivos locais de benchmark continuam nos workspaces originais.

Os 12 caminhos sobrepostos foram revisados. Seis exigiram resolução textual. A conferência comparou 71 caminhos locais alterados em `src/` e `docs/` do frontend. As 11 diferenças encontradas ficaram nos caminhos sobrepostos. Os 58 caminhos correspondentes do backend mantiveram o conteúdo local, à parte de finais de linha. Os diffs dos candidatos passaram em `git diff --check HEAD` e não contêm entradas em conflito. As árvores originais foram conferidas contra os registros iniciais antes da criação deste relatório. Os candidatos estão em HEAD destacado, com alterações de integração locais e sem commits novos. A preparação por merge de três vias deixou parte das mudanças no índice do candidato. Para revisar ou transportar o candidato integral, considere o índice, o worktree e as novas fontes.

| Área | Arquivos e resolução |
|---|---|
| Listas | `lists-api.service.ts`, `list-detail.component.ts` e `list-detail.component.html`. Carregamento contínuo e edição por `ListOrderItem` preservados. A visualização comum mantém itens paginados, itens ocultáveis, ações e estado vazio filtrado. Os testes upstream de serviços e edição de ordem foram mantidos. |
| Perfil | `profile-api.service.ts` e `profile.component.ts`. Preservados dados de `episodeRatings`, contagens opcionais e preferência pelos títulos disponíveis de série e episódio. A aba Watchlist preserva carregamento, tratamento de erro e filtros. A troca de rota cancela a leitura em andamento e limpa as opções do perfil anterior. |
| Watchlist | `watchlist-api.service.ts`, `watchlist.component.ts` e as duas specs `watchlist-genres.spec.ts`. Revisados opt-in, seleção de gênero, paginação, estados vazios e cancelamento. |
| Interface e contratos | `messages.ts`, `styles.css`, `telas-reqs-definitivo.md` e `requisicoes-api-por-tela.md`. Preservados os ajustes de interface dos dois lados. A documentação registra o opt-in na página principal e no Perfil. |
| Backend | `pom.xml` foi a única mudança de implantação introduzida pela etapa. As fontes, testes e documentação local do produto foram carregados para o candidato. |

## 2. Contrato da Watchlist

A Watchlist principal e a aba do Perfil enviam `includeGenreOptions=true` no `GET /api/v1/users/{userId}/watchlist/view`. A mesma resposta retorna a página de itens e `availableGenres`, que descreve o conjunto global visível independentemente da página e dos filtros. O servidor mantém o opt-in desativado por padrão para outros consumidores e resolve gêneros faltantes pela rotina existente. O candidato conserva os parâmetros de tipo, gênero, status, ordenação, direção e paginação, assim como as regras de acesso do endpoint.

As duas telas usam as opções globais da resposta. Um filtro válido permanece selecionado mesmo quando a página filtrada está vazia. Se uma resposta informar explicitamente que a opção selecionada deixou de existir, a tela volta à primeira página sem o gênero e atualiza a consulta. Uma resposta legada sem a propriedade limpa o menu obsoleto e preserva o filtro selecionado. O GET auxiliar de gêneros e a varredura de páginas pelo navegador continuam eliminados. A compatibilidade foi conferida nos testes Angular de argumentos e estados e nos testes Spring de controller, serviço e assembler.

## 3. Separação da instrumentação

O Maven padrão exclui `common/performance` na compilação principal, na compilação dos testes e no empacotamento do JAR. A exclusão explícita no empacotamento protege a saída produtiva mesmo diante de classes residuais em `target/classes`. O perfil `benchmark-observation` usa uma saída própria em `target/benchmark-instrumented`, inclui as fontes e testes de instrumentação e preserva o opt-in de execução existente. Nenhuma dependência foi adicionada. Foram preservados os executores, as configurações existentes e os artefatos históricos.

O JAR produtivo apresentou **zero** classes do pacote. O JAR de benchmark apresentou **seis**.

- `BenchmarkObservationConfiguration.class`
- `BenchmarkRequestFilter.class`
- `BenchmarkRequestFilter$Measurement.class`
- `BenchmarkRequestFilter$Scope.class`
- `BenchmarkRequestFilter$SqlEvents.class`
- `BenchmarkRequestFilter$SqlEvents$Execution.class`

As outras **1.965 entradas de arquivo** em `BOOT-INF/` têm nomes e bytes idênticos nos dois JARs. As **1.707 classes de aplicação fora da instrumentação** têm os mesmos nomes e bytes do JAR B histórico da 5Q2. O SHA-256 desse JAR histórico foi reconfirmado. Referência da 5Q2 [acervo local (05q2-otimizacao-restauracao-sessao.md)]

## 4. Testes direcionados e artefatos

| Execução | Resultado |
|---|---|
| Backend de produção com Maven 3.9.12 e Java 21. `mvn.cmd -B -o '-Dtest=WatchlistEntryControllerTest,WatchlistEntryServiceImplTest,ContentCardAssemblerTest,UserSessionSecurityTest,UserListItemPageReaderImplTest' package` | 101 aprovados, zero falhas, erros ou skips. Log [acervo local (6a1-api-production.log)] |
| Backend de benchmark. `mvn.cmd -B -o -Pbenchmark-observation '-Dtest=BenchmarkRequestFilterTest' package` | Quatro aprovados, zero falhas, erros ou skips. Log [acervo local (6a1-api-benchmark.log)] |
| Vitest com os specs de Watchlist, edição de ordem da Lista e Minhas listas, resumo de episódios no Perfil e sessão | 36 aprovados em sete arquivos. Log [acervo local (6a1-front-tests.log)] |
| Angular. `npm.cmd run build -- --configuration production` com Node 24.17.0 e npm 11.13.0 | Build aprovado com oito avisos de orçamento CSS já observados. Log [acervo local (6a1-front-build.log)] |

Os testes Spring selecionados usam testes unitários ou MockMvc com dependências isoladas. Esta etapa usou builds e testes locais, sem banco, migrações, seeds, TMDB real, benchmark ou início de servidor.

| Artefato | SHA-256 |
|---|---|
| JAR de produção [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | `2b1b339daf6da74b609f70633dfea67b674b453b9bb071a55ef401b4409374d6` |
| JAR de benchmark [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | `9ddd6a1b4284cacc1479d02d8c3cd5880f764ae2ee24f3e5acb570f3d933b857` |
| Angular de produção [acervo local (browser)] | `c5fb2110f3d2105c8b9debddd97ec4bae9c472a5c2da2a366bee862bbcac14cb` |

O hash Angular segue a convenção usada pelo executor histórico, com 88 arquivos ordenados e o caminho relativo combinado ao SHA-256 de cada arquivo. Para futuros builds diagnósticos, usar `-Pbenchmark-observation` e apontar o executor ao JAR da saída do perfil. Os caminhos históricos continuam disponíveis para reproduções.

## 5. Preservação das 13 otimizações

A conferência combina a comparação das classes do backend com o JAR B da 5Q2, a comparação das fontes Angular locais com as fontes do candidato e a validação dirigida dos caminhos reconciliados. As decisões e ressalvas continuam limitadas ao escopo avaliado nos relatórios históricos. [Mapa de arquivos e evidências da 6A](06a-auditoria-final.md) · [Decisões da 5R1](05r1-avaliacao-continuidade-projeto.md)

| Nº | Implementação preservada | Decisão e ressalva |
|---|---|---|
| 1 | Projeção dedicada de previews no Feed | Manter |
| 2 | Unificação de consultas de categorias de Picks no Feed | Manter |
| 3 | Reutilização de IDs internos de mídia no Feed | Manter |
| 4 | Consolidação dos totais de Explorar Picks | Manter |
| 5 | Antecipação das opções de Templates | Provisória. Sobreposição confirmada, impacto em H inconclusivo e instabilidade de conteúdo na 5E3. |
| 6 | Projeção leve de Meus Picks | Provisória. Parte da resolução passa ao primeiro clique frio, com redução do trabalho acumulado na jornada avaliada. |
| 7 | Projeção paginada de Seguidores e Seguindo | Manter |
| 8 | Resumo dedicado das resenhas do Diário | Manter |
| 9 | Gêneros globais no GET paginado da Watchlist | Provisória. Ganho na abertura, efeito histórico no filtro não reproduzido em HTTP direto aquecido e cenário frio fora do recorte. |
| 10 | Reutilização do resumo no Histórico do Diário | Manter |
| 11 | Leitura dedicada do fundo de Notificações | Provisória. Fundo personalizado validado em testes controlados, com validação integrada pendente. |
| 12 | Médias após o recorte no Detalhe de lista | Manter |
| 13 | Restauração leve da sessão | Provisória. Redução estrutural e HTTP confirmada. Ganho prático em H demonstrado somente em Notificações. |

## 6. Impedimentos remanescentes e recomendação para a 6B

Os dois impedimentos da 6A foram tratados no candidato. A evidência de compatibilidade desta etapa vem do contrato e dos testes direcionados de cada lado. A suíte completa, os testes integrados de persistência e a confirmação dos casos históricos de mocks e providers continuam pendentes. Os avisos CSS devem ser registrados no build final.

Na 6B, executar a suíte completa a partir desses dois worktrees. Antes dos testes Spring, revisar variáveis herdadas e assegurar que a configuração de teste aponte exclusivamente a um banco descartável autorizado, com dependências externas isoladas. Usar `mvnw.cmd -B test` e `npm.cmd test -- src` para a execução inicial. Comparar falhas com a referência equivalente antes de classificá-las como preexistentes. Recompilar nas saídas isoladas, verificar a separação dos JARs e registrar a validação integrada de Watchlist, Perfil e ordenação de listas antes da integração definitiva.
