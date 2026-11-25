# 6B.3 — Revalidação completa do candidato de integração

**Decisão: bloqueado para a 6C.** O Angular e a instrumentação passaram integralmente, e os três builds foram concluídos. O backend aprovou 5.222 de 5.268 testes, com 43 resultados negativos e três ignorados. Nenhum dos 3.944 casos que passavam na 6B regrediu. O bloqueio decorre da importância dos cenários de Progresso de séries, consistência de Picks e importação de opiniões que continuam falhando.

A execução usou os worktrees da 6A.1, com os estados locais preservados, a partir de `71058878` no backend e `baadc3b` no frontend. A etapa não alterou fontes, testes, orçamentos CSS ou árvores originais. A instrumentação do executor ficou em `target/6b3/harness`, fora dos artefatos.

[6B](06b-validacao-completa-candidato.md) · [6B.1](06b1-diagnostico-falhas-testes.md) · [6B.2A](06b2a-correcao-infraestrutura-testes.md) · [6B.2B](06b2b-correcao-falhas-funcionais.md) · [6B.2C](06b2c-correcao-falhas-diario.md)

## Comparação das suítes

| Suíte | Etapa | Total | Aprovados | Falhas | Erros | Ignorados | Aprovação sobre o total | Duração |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Backend | 6B | 4.138 | 3.944 | 39 | 152 | 3 | 95,31% | 11 min 39 s |
| Backend | 6B.3 | 5.268 | 5.222 | 26 | 17 | 3 | 99,13% | 28 min 28 s |
| Angular | 6B | 208 | 160 | 48 | 0 | 0 | 76,92% | 4,03 s |
| Angular | 6B.3 | 208 | 208 | 0 | 0 | 0 | 100% | 5,10 s |
| Instrumentação | 6B | 4 | 4 | 0 | 0 | 0 | 100% | 57,689 s com build |
| Instrumentação | 6B.3 | 4 | 4 | 0 | 0 | 0 | 100% | 0,925 s nos testes, 1 min com build |

O backend rodou com Java 21 e Maven em modo offline, sem filtro de classes. O perfil `benchmark-observation` executou separadamente a classe de instrumentação. As durações refletem a execução das suítes e o aumento de cobertura.

O Surefire enumerou 1.210 métodos de 83 classes que a 6B havia registrado como 83 erros de bootstrap, além de três regressões adicionadas depois da 6B, uma de nota exata e duas de `rememberMe`. O aumento líquido foi de 1.130 resultados. Entre os métodos comparáveis, **17 falhas e 53 erros passaram** e os três skips do Windows se repetiram. Cinco resultados negativos adicionais na enumeração da suíte completa já haviam sido revelados na 6B.2A. Os skips são dos controles de armazenamento que exigem permissões POSIX ou symlinks disponíveis.

Log do backend [acervo local (backend-full.log)] · Surefire [acervo local (surefire-reports)] · Comparação por método [acervo local (backend-comparison.json)] · Instrumentação [acervo local (benchmark.log)] · Angular [acervo local (angular-candidate.json)]

## Correções confirmadas e falhas remanescentes

Não reapareceram a colisão de bootstrap Spring, o SQL ambíguo do Diário, os proxies sem sessão no Detalhe de lista nem os erros de tombstone nas classes afetadas. A classe `DiaryViewRepositoryTest` aprovou os sete testes, incluindo os três da 6B.2C. Passaram os 99 testes dos dois controllers de lista, os 20 testes de importação por writers e avulsa, os 112 testes HTTP das classes de autenticação e usuários, os 33 testes do controller de Resumo e os 45 testes integrados da Watchlist.

Dos **43 resultados negativos** do backend, **38** já constavam da 6B e da sua referência pré-integração no mesmo método. Os **cinco restantes** eram ocultos na 6B e já foram observados na 6B.2A. Nenhum resultado negativo é exclusivo da 6B.3. Nos cinco casos revelados, a origem anterior à correção do bootstrap permanece indeterminada.

| Grupo | Falhas | Erros | Evidência e classificação |
| --- | ---: | ---: | --- |
| Autenticação unitária e e-mail | 2 | 10 | Seis stubs de emissão de cookies ou tokens não acompanham as assinaturas usadas. Seis casos de confirmação de e-mail divergem no gate de disponibilidade do sender ou na expectativa de mensagem e limite. Preexistentes. |
| Cache | 4 | 0 | Os testes de inventário e rateio divergem da quantidade de caches registrados. Preexistentes. |
| Contratos de conteúdo | 5 | 0 | Specs de DTO divergem nos campos e facetas exatos de cartões e páginas. Preexistentes. A semântica pretendida ainda precisa ser confirmada com o contrato. |
| Detalhe de conteúdo | 4 | 2 | Dois HTTP 500 e dois NPEs vêm do double que não fornece o retorno de detalhes de episódio. Outros dois casos esperam três episódios recentes e recebem quatro. Preexistentes. |
| Progresso de séries | 2 | 2 | Dois erros unitários por stubs não usados são preexistentes. Duas divergências HTTP reveladas na 6B.2A se repetiram. Série concluída permanece na lista e o snapshot frio retorna `seasonProgress` vazio. A causa funcional desses dois casos continua indeterminada. |
| Pessoas | 3 | 1 | O double de enriquecimento devolve lista vazia em três testes. Outro espera página vazia para offset acima do limite, mas recebe `BadRequestException`. Preexistentes. |
| Picks | 2 | 1 | Os casos revelados na 6B.2A se repetiram. Criação e substituição de seleção esperavam rollback e 502, mas receberam 201 e 200. O caso concorrente expirou sem observar o lock em `picks_templates`. Ainda é preciso distinguir contrato, fixture e defeito produtivo. |
| Importação de opiniões | 0 | 1 | O fluxo de resumo seguido de nota produz uma contagem incompatível com `ImportJob.validateApplyProgress`. Preexistente. Ainda falta separar inconsistência da fixture de defeito no cálculo. |
| Normalização e valores padrão | 4 | 0 | Codec de imagem de Jogo, avatar em Busca, path do preview de Pick e flag de e-mail no mapper de usuário. Divergências preexistentes entre expectativas e os valores produzidos. |
| **Total** | **26** | **17** | |

## Angular e avisos CSS

A comparação oficial usou `npm.cmd test -- src --reporter=json`, Node 24.17.0 e UTC, como na 6B. Os 208 testes em 36 arquivos passaram em 5,10 s na janela do JSON. Dos 48 resultados negativos históricos, 45 passaram com o mesmo identificador. Três casos do Diário foram reformulados na 6B.2B para cobrir a carga da primeira página e a ordenação da resposta do servidor. Os cenários equivalentes passaram. Uma descoberta inicial sem `src` também incluiu 32 arquivos da referência arquivada em `.angular/cache/6b-reference-pre-integracao`. Seu resultado de 390 testes, com 48 falhas da cópia histórica, ficou separado.

O build de produção terminou em 16,905 s. Os oito avisos CSS são literalmente iguais aos da 6B, com o mesmo limite de 25 kB. Início 41,48 kB, Watchlist 30,08 kB, Configurações 29,16 kB, Detalhe de lista 47,33 kB, Jogo 25,59 kB, prévia de compartilhamento 34,91 kB, Diário 32,58 kB e Perfil 116,03 kB. Os budgets foram preservados. O build contém 88 arquivos, como na 6B. Os bytes diferem em parte da saída, que incorpora as alterações produtivas posteriores. A impressão da árvore é o SHA-256 do manifesto UTF-8, em ordem ordinal, com hash e caminho relativo por arquivo e linhas LF.

## Builds e preservação das otimizações

| Artefato | Duração | SHA-256 |
| --- | --- | --- |
| JAR de produção [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | 31,380 s | `34f1b8701eb071db344ef5cfc7d5d292cd1af4740c511f8aae436339dc289bf5` |
| JAR de benchmark [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | 1 min, com testes | `1b4775d86035dccfcacbde66369e6722b5a1bc968cac5f8437047017fe61f210` |
| Angular de produção [acervo local (browser)] | 16,905 s | `87f3d04a8fd977a6ef6724e02a982cdf7faa9d86a611daab9cfec14fe3bcc800` |

O JAR produtivo contém **zero** classes de `common/performance`. O de benchmark contém **seis**. São `BenchmarkObservationConfiguration`, `BenchmarkRequestFilter` e as quatro classes internas previstas. As 1.966 entradas comuns de `BOOT-INF` são idênticas em bytes. O guard do executor está fora de ambos. A configuração empacotada preserva os perfis de aplicação existentes. Não foram encontrados opt-in ativo de observação ou destinos de banco e replay do benchmark nos recursos de aplicação.

A comparação do JAR produtivo com o da 6B localizou diferenças nas classes de Diário, autenticação e listas, coerentes com as correções da 6B.2B. O diff não mostrou remoção de classes empacotadas. A verificação do código e dos testes correspondentes ao inventário da 6A confirma a presença das 13 otimizações: as três do Feed, totais de Explorar Picks, antecipação em Templates, projeção de Meus Picks, Seguidores e Seguindo, resumo de resenhas, gêneros da Watchlist, reaproveitamento do resumo no Histórico do Diário, fundo de Notificações, médias no Detalhe de lista e restauração leve da sessão. Permanecem as oito manutenções definitivas e as cinco provisórias da 5R1. A etapa não mediu desempenho.

Inspeção dos JARs [acervo local (artifact-inspection.json)] · Build do backend [acervo local (backend-build.log)] · Build Angular [acervo local (angular-build.log)] · Manifesto do Angular [acervo local (angular-tree.sha256)]

## Isolamento

Foram confirmados **127 PostgreSQL descartáveis na suíte completa e um na qualificação do guard**, todos com `postgres:16-alpine`, rótulo exclusivo e portas dinâmicas em loopback. Antes de entregar cada conexão para Flyway ou para os testes, o executor validou o container registrado, o host, a porta e o database efetivos e confirmou por consulta o nome do banco, a versão 16 e o usuário interno. Todos os 128 destinos observados no Flyway tinham confirmação anterior. O fallback de teste também usou Testcontainers. As portas 15432 e 15433 foram vetadas antes de abrir uma conexão.

A checagem final registrou zero containers e zero volumes remanescentes, dos 128 volumes anônimos observados. O guard recusou 457 reconexões de pools Hikari em segundo plano a containers já encerrados. Não registrou bloqueios em outras threads. As chamadas de mídia usaram doubles ou o destino local sem serviço, com proxy de saída local bloqueado. Nenhum recurso Docker preexistente foi modificado. Verificação do isolamento [acervo local (isolation-verification.json)]

## Recomendação para a 6C

Manter o candidato preservado e tratar primeiro os cinco cenários revelados de Progresso e Picks e a invariante de importação de opiniões. A validação deve esclarecer o comportamento esperado e cobrir consistência, rollback e concorrência antes de liberar a integração funcional. Os contratos públicos divergentes e os stubs legados também devem ser triados com as evidências por método. A 6C permanece pendente.
