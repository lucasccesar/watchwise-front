# 6B.2B — Correção das falhas funcionais e contratuais

Foram corrigidos o filtro SQL da timeline do Diário, o acesso a associações Hibernate no detalhe de lista, a ordem de exclusão em listas importadas, a leitura de `rememberMe` ausente e a remoção de comentário no Episódio. Os testes Angular passaram. Os testes Java executáveis sem banco também passaram. Na validação integrada em PostgreSQL descartável, 236 de 239 testes passaram. Restam três asserções no Diário. A 6B.3 e a 6C não foram iniciadas.

[Diagnóstico 6B.1](06b1-diagnostico-falhas-testes.md) · [Validação 6B](06b-validacao-completa-candidato.md) · [Infraestrutura 6B.2A](06b2a-correcao-infraestrutura-testes.md)

## Classificação dos 100 resultados negativos da 6B.2A

| Casos | Grupo | Origem e encaminhamento |
|---:|---|---|
| 89 | `AuthControllerIntegrationTest` (28) e `UserControllerIntegrationTest` (61) | Divergência do contrato de login e OAuth. Os logs registraram `HttpMessageNotReadableException`. O teste de desserialização reproduziu a rejeição do booleano primitivo ausente, embora OpenAPI indique que o campo é opcional. Corrigido nos DTOs. Os 89 testes HTTP antes afetados passaram na reexecução. |
| 1 | `DiaryEntryControllerIntegrationTest`, filtro de nota fora do intervalo | Defeito produtivo confirmado. O overload paginado validava limites de `scoreFrom/scoreTo` e aceitava `score=11`. A validação compartilhada agora rejeita o valor antes da consulta. |
| 2 | `DiaryEntryControllerIntegrationTest`, progresso de séries | Causa ainda indeterminada. Exclusão de série concluída e hidratação do snapshot frio falharam em asserções distintas. Reexecutar com dados descartáveis e verificar fixtures, vigência e versão dos snapshots antes de alterar a regra. |
| 3 | `DiaryWatchCommandServiceIntegrationTest` | Mock incompleto. Os métodos default `loadPrepared` e `loadPreparedSeries` voltavam como `null` e impediam o cálculo dos passes. Os stubs agora chamam os métodos default, que delegam ao loader simulado já existente. |
| 1 | `FeedControllerIntegrationTest` | Mock divergente do caminho em uso. O assembler anterior estava simulado, mas o caminho com IDs conhecidos não estava. O teste agora fornece o cartão esperado nesse caminho e mantém as asserções de identidade e ordenação. |
| 3 | `PickDomainIntegrationTest` | Duas divergências de HTTP 502 esperado contra operações aceitas e um erro no cenário concorrente de edição de período. Determinar se a revalidação esperada ainda faz parte do contrato e reproduzir a concorrência com evidência de sincronização. Sem alteração nesta rodada. |
| 1 | `SummaryControllerIntegrationTest` | Fixture temporal incompatível. A entrada usava a data de execução e a requisição especificava outubro de 2026. A entrada do cenário agora tem data fixa no mês consultado. |
| **100** | **99 falhas e um erro** | Eram resultados revelados pela recuperação dos contextos. O histórico não estabelece que tenham sido introduzidos pela 6B.2A. |

Resultados anteriores por método [acervo local (affected-summary.json)]

## Alterações de produção

| Grupo | Arquivos e mudança | Evidência e limite |
|---|---|---|
| SQL do Diário | `DiaryViewRepositoryImpl.java` usa o alias `t` para o filtro da timeline em consultas planas e agrupadas. A identidade da série continua `COALESCE(t.series_tmdb_id, t.tmdb_id)`. | O PostgreSQL 16.14 da 6B apontou a referência sem alias no escopo que também contém `contents`. O ajuste preserva valores, filtros e parâmetros, permissões, contagem, cursor e ordenação. A revalidação no PostgreSQL eliminou o erro SQL nas oito ocorrências históricas. |
| Nota exata no Diário | `DiaryEntryServiceImpl.java` aplica o intervalo de 1 a 10 aos fluxos com e sem conclusões que usam a validação compartilhada. | A regressão unitária verifica `score=11` e a ausência de consulta antes da rejeição. |
| Associações de lista | `UserListRepository.java`, `UserListItemRepository.java` e `UserListItemPageReaderImpl.java` carregam explicitamente o proprietário da lista e as referências de item utilizadas após a consulta. As associações continuam LAZY no mapeamento. | A causa das 15 ocorrências era o acesso a proxies já sem sessão. Os joins são para um único proprietário por lista, sem consultas individuais por cartão. Não foi habilitado Open Session in View nem ampliada a transação. Os cálculos de médias e o recorte paginado permanecem nos mesmos pontos. A validação integrada aprovou todos os casos do detalhe de lista. |
| Tombstones de importação | `UserListServiceImpl.java` reaproveita os itens da lista já obtidos sob lock e registra sua remoção antes da lista. Mantém marcação no ledger, remoção de referências externas, transação e compactação de ranks. | A exceção anterior mostra itens gerenciados referenciando a lista removida quando o Hibernate tenta fazer flush. A regressão unitária falhou antes do ajuste e passou com a ordem de remoção verificada. Os dois cenários de tombstone passaram com JPA e PostgreSQL. As fixtures locais de mídia da 6B.2A foram preservadas. |
| Login e OAuth | `LoginUserDTO.java` e `OAuthLoginDTO.java` normalizam `rememberMe` ausente para `false` e preservam o opt-in explícito. | O teste com Jackson reproduziu `Cannot map null into type boolean` antes da alteração. Após ela, o teste passou para ambos os DTOs. A geração de cookies, expiração e autenticação seguem com as regras existentes. |
| Remoção de comentário em Episódio | `episode.component.ts` envia string vazia ao editar um comentário apagado. A criação continua com o tratamento de campo opcional já usado. | O backend ignora `null` no PATCH e normaliza string vazia como remoção. A regressão mostrou o envio de `null` antes do ajuste e passou depois. A edição preserva a data carregada e o rewatch só envia a requisição após confirmação. |

## Correções de testes

- `diary.component.spec.ts` verifica a consulta paginada do Diário e a consulta de resenhas. Os testes verificam os parâmetros de data e ordenação, o retorno à primeira página e a apresentação da ordem da resposta. Aba, agrupamento e estado dos controles mantêm cobertura.
- `episode.component.spec.ts` usa a edição e o registro expostos pela interface atual. Mantém asserções sobre edição versus criação, remoção de comentário, data e rewatch explícito.
- `content-review-requests.spec.ts` verifica o corpo exato. Primeira nota envia apenas `score`. Versões zero e positiva seguem no corpo de atualização, conforme OpenAPI e o DTO nullable do backend.
- `UserListItemPageReaderImplTest.java` e `UserListServiceImplTest.java` espelham o fetch direcionado. Os quatro testes de limite, página além do fim e filtros passaram a fornecer o DTO que seus mocks omitiam, com as asserções existentes preservadas. O caso de exclusão passou a verificar a remoção dos itens próprios antes da lista.
- `DiaryEntryServiceImplTest.java` cobre a nota exata inválida no overload paginado. `AuthRememberMeContractTest.java` cobre a leitura do JSON de login e OAuth. Os fixtures de `DiaryWatchCommandServiceIntegrationTest`, `FeedControllerIntegrationTest` e `SummaryControllerIntegrationTest` foram corrigidos no escopo descrito na classificação.

## Validação direcionada

| Recorte | Resultado observado |
|---|---|
| Angular, Diário, resumo do Diário, Episódio e contrato de notas | **44 aprovados**, zero falhas. Os dez casos apontados no pedido passaram no recorte. |
| Detalhe de lista, leitor paginado e serviço | **153 aprovados**, zero falhas. Inclui verificação da ordem de exclusão e os controles de paginação e médias. |
| Login e OAuth, contrato Jackson | **2 aprovados**, zero falhas. |
| Diário, serviços de visão e entradas | **174 aprovados**, zero falhas. Inclui a regressão de nota fora da faixa. |
| PostgreSQL e MockMvc com persistência | **236 aprovados de 239**. Três falhas de asserção do Diário, detalhadas abaixo. |

Angular final [acervo local (contracts-validated.json)] · Angular antes da correção [acervo local (contracts-red.json)] · Exclusão antes da correção [acervo local (tombstone-red.log)] · Listas e contrato de autenticação [acervo local (unit-final.log)] · Serviços do Diário [acervo local (diary-final.log)]

### Revalidação dos controles sem banco

O recorte Angular ampliado aprovou **69 de 69 testes** em nove arquivos, incluindo os 44 casos do recorte inicial e controles de sessão, Watchlist, reordenação de lista e Meus Picks. No Java, 329 casos unitários passaram. O controle MockMvc da sessão também passou com os perfis de configuração usados na 6B e o datasource apontando para loopback sem serviço. A primeira tentativa desse controle com apenas o perfil test ficou sem propriedades de rate limit. A configuração foi corrigida no executor e o caso passou sem alteração de código ou uso de banco.

Angular ampliado [acervo local (controls-final.json)] · Java unitário e tentativa inicial do controle [acervo local (controls-final.log)] · Controle de sessão qualificado [acervo local (session-qualified.log)]


## Validação integrada após autorização

| Grupo | Executados | Aprovados | Falhas | Resultado |
|---|---:|---:|---:|---|
| Diário | 20 | 17 | 3 | A ambiguidade SQL não reapareceu. Seis dos oito casos antes bloqueados pelo SQL passaram. Dois chegaram a asserções distintas e a falha de cronologia já conhecida se repetiu. Passaram o filtro de nota inválida, os seis comandos do Diário e os testes do alvo de avaliação e do fluxo de conclusão de temporada. Log [acervo local (diary.log)] |
| Detalhe de lista | 99 | 99 | 0 | Passaram os 15 casos que antes falhavam com proxies Hibernate e os controles de privacidade, paginação, ordenação e médias. O GET legado e o detalhe visual foram exercitados. Log [acervo local (lists.log)] |
| Tombstones e importação | 6 | 6 | 0 | Os dois erros de exclusão e reimportação não reapareceram. As fixtures locais de mídia continuaram em uso. Log [acervo local (tombstones.log)] |
| Autenticação HTTP e usuários | 112 | 112 | 0 | Foram recuperados os 89 casos anteriormente afetados pelo binding de login e OAuth. Log [acervo local (auth.log)] |
| Controles de Feed e Resumo | 2 | 2 | 0 | Passaram o cartão da atividade Top 5 e o ranking mensal com metadados de cartão indisponíveis. Log [acervo local (controls.log)] |
| **Total** | **239** | **236** | **3** | Zero erros e zero testes ignorados. |

Os **69 testes Angular e 330 testes Java sem banco** continuam como evidências anteriores. A coleta desta rodada executou apenas os recortes de integração.

### Falhas remanescentes no recorte

- `shouldGroupBeforePagingAndKeepMovieInterruptions` completou as verificações de contagem e agrupamento no repositório. A chamada HTTP agrupada respondeu 200 e o teste parou ao exigir `totalElements`. Esse modo retorna `CursorPageResponseDTO`, com `hasNext` e `nextCursor`. Atualizar o teste para percorrer o cursor e conferir a mesma sequência de grupos e interrupções. Preservar as contagens exatas no teste do repositório.
- `shouldRecoverOnlySameDayEpisodesForFilteredSeasonCompletions` passou nas asserções filtradas e encontrou dois episódios onde a asserção do primeiro grupo sem filtro espera um. Determinar qual data e quais membros foram incluídos antes de decidir entre fixture e produção.
- `shouldPageEpisodeWithItsSeasonAndSeriesConclusionsByAnchorChronology` voltou a encontrar `PERSISTED_ENTRY` antes da conclusão esperada. Conferir vigência e revisão das projeções, ordenação por âncora e paginação antes de alterar a regra.

### Isolamento e encerramento

Uma verificação temporária no registro do datasource checou a imagem `postgres:16-alpine`, o rótulo exclusivo da execução, a porta publicada dinamicamente, o nome aleatório do banco e a identidade retornada por uma consulta somente leitura. Cada conexão Flyway nos logs coincide com um destino verificado em linha anterior. Foram **12 bancos descartáveis**, todos com PostgreSQL 16 e 104 migrations. O fallback do datasource apontava para loopback na porta 1. Compose e reutilização estavam desligados, e o TMDB permaneceu limitado aos doubles ou ao destino local sem serviço. As portas 15432 e 15433 ficaram fora da validação.

A conferência final encontrou zero containers com o rótulo da execução e confirmou a remoção dos quatro volumes anônimos observados durante a coleta. A configuração de verificação temporária foi removida do código e os 12 arquivos de teste foram restaurados byte a byte ao estado anterior à coleta. Relatórios Surefire [acervo local (surefire-reports)]

## Recomendação para a 6B.3

Resolver as três divergências do Diário em testes dirigidos e registrar a classificação dos grupos já pendentes de progresso de séries e Picks. A próxima execução completa deve usar o candidato preservado e o mesmo isolamento de datasource. A 6B.3 e a 6C permanecem pendentes.

Os worktrees da 6A.1 preservam as correções da 6B.2A, o trabalho paralelo e as 13 otimizações. Os estados Git das árvores originais conferem com os registros anteriores. Esta rodada não alterou código de produção, artefatos históricos, bancos protegidos, containers preexistentes ou orçamentos CSS. Nenhuma suíte completa, benchmark, commit, push ou deploy foi executado.
