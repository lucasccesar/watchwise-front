# 5J3 — Validação do resumo dedicado no Histórico do Diário

## Resultado

**Qualificação somente leitura concluída. Benchmark bloqueado pelas escritas operacionais do login.** A persona sintética `wwb3reviews1` já recebeu uma credencial exclusiva na 5H3. O arquivo protegido por DPAPI está presente e o fingerprint de usuários coincide com o estado aprovado. A sessão anterior foi usada em memória e nenhuma sessão atual foi disponibilizada. A credencial não foi aberta nem testada nesta etapa.

A autorização mínima para retomar é **um login normal de `wwb3reviews1` no `watchwise_benchmark_exec_v4` em `127.0.0.1:15433`**, permitindo somente a criação da sessão em `refresh_tokens` e a atualização de `shared_limiter_state`. A 5H3 observou esses deltas. A autorização de escrita operacional daquela rodada não foi aplicada ao v4 nesta etapa. Reutilizar a sessão em memória. Uma eventual renovação requer que a operação esteja igualmente autorizada. Nenhuma nova credencial ou base é necessária para o recorte confirmado. [Evidência da 5H3](05h3-validacao-benchmark-reviews-diario.md) · Persistência do refresh [acervo local (RefreshTokenServiceImpl.java)]

## Artefatos, ambiente e persona

| Artefato da 5J2 | SHA-256 confirmado |
| --- | --- |
| Angular A | `145f4efb3a41839ad60c4abc11bb2061deb4f6e951cd203e257b9cddafffdb39` |
| Angular B | `2e43c778ee819bfde2e9f799027ef826933d096019778dc85e43f5eb60c704f5` |
| JAR compartilhado | `a9d20058a4a9fd9568e32b8b81d8415dc6d39074ed8f41b80f82308be378c23e` |

Container saudável, bind original em 15433, replay em `127.0.0.1:18091` com processo e hash do catálogo confirmados. Portas 8082 e 3001 livres. Verificações feitas sob o lock do executor. Os artefatos e as dez otimizações estão preservados. Nenhuma JVM foi iniciada para aplicar as opções de isolamento, desativação de Flyway, SQL init, seeds, workers e crons previstas no executor de referência. Artefatos [acervo local (artifacts.json)] · Ambiente [acervo local (environment.json)] · Builds da 5J2 [acervo local (05j2-otimizacao-resumo-historico-diario.md)]

A leitura confirmou a persona privada e sintética, **38 registros de filme em 38 datas, 19 mídias cobertas pelo replay**, zero episódios, zero conclusões derivadas e Watchlist vazia. A massa comporta páginas de 30 e 8. A paginação ainda precisa de prova no endpoint. Das 19 referências, cinco têm snapshot regional de lançamento vencido e 14 não têm snapshot de lançamento. O v4 tem 64 snapshots de lançamento, 9.493 de calendário e geração 2.093.

A reconciliação da timeline consulta episódios antes de procurar séries candidatas. Essa conta não possui episódios. Os interesses do calendário da Home vêm da Watchlist e das séries em progresso, conjuntos vazios neste recorte. O resolvedor de metadados dos cartões e do fundo não exige preencher os snapshots de lançamento das mídias do Diário. O controle da Home da mesma persona passou no guard da 5H3. Essa combinação sustenta a viabilidade após autorização de login. A confirmação efetiva de ausência de escrita nos primeiros GETs continua obrigatória. Consulta agregada [acervo local (qualification.json)] · Diagnóstico 5J1 [acervo local (05j1-diagnostico-proxima-tela.md)]

## Equivalência, SQL e custos deslocados

A 5J2 comprovou por contrato e testes locais os seis totais, o fundo e o fluxo da timeline. B omite no resumo as operações de Feed, calendário, próximos episódios, agregados de 30 dias e enriquecimento dos cartões recentes. O `forkJoin` conserva a espera conjunta pelo resumo e pela página. A estabilidade autenticada, o JSON integral, ordem, DOM, filtros, paginação e controles independentes de Home e Reviews ainda não foram exercitados na 5J3.

A 5H3 mediu 19 para seis leituras, 4.586 para 206 bytes e deslocamento de três chamadas de replay para a listagem no recorte frio de Reviews. Isso contextualiza o trabalho eliminado e o possível aquecimento perdido na página inicial, próxima página ou primeiro detalhe do Histórico. Nenhum desses números foi usado como referência A da 5J3.

| Métrica | A | B | Diferença |
| --- | --- | --- | --- |
| Leituras SQL do resumo e acumuladas | Não medidas | Não medidas | — |
| Bytes do resumo, listagem e abertura | Não medidos | Não medidos | — |
| Replay por requisição e acumulado | Não medido | Não medido | — |
| Latência, TTFB e ordem de conclusão | Não medidos | Não medidos | — |
| H de abertura e paginação | Não medido | Não medido | — |
| GETs funcionais | Dois previstos | Dois previstos | Não medida |
| Equivalência autenticada | Pendente | Pendente | — |

Coleta oficial de **0/48 aberturas, 0/16 paginações e 0/16 aquecimentos de navegador**. Não há amostras válidas ou inválidas, medianas, dispersão, efeitos por par nem comparação entre ordens. O diretório exclusivo guarda as evidências da qualificação e dos guards. Evidências 5J3 [acervo local (benchmark-5j3)]

## Retomada

1. Revalidar o guard e usar o JAR compartilhado, API e proxy temporários, replay local e configurações da 5H3. Emitir uma sessão fora das janelas medidas. Conferir a identidade e os únicos deltas operacionais autorizados antes de abrir as telas.
2. Qualificar até cinco aberturas por versão e três interações. Comparar os sete campos, timeline integral, IDs, DOM, página seguinte, filtros e vazio. Controlar Home e Reviews separadamente. Aceitar na Home somente permutações de gêneros empatados comprovadamente equivalentes segundo a 5H3. Reter divergências com caminhos JSON e sem segredos.
3. Separar sondas SQL das medições, com até três chamadas por operação e versão. Medir resumo e timeline, SQL, bytes, GETs e replay por requisição e acumulado. Fixar os deslocamentos aceitáveis de chamadas locais antes da coleta. Não executar comparação fria complementar.
4. Alternar os builds na mesma origem com a JVM compartilhada e contextos novos. Preservar H. Aquecer de 15 a 30 operações, janelas de cinco e tolerância do maior valor entre 5 ms e 10%. Rodar A/B, B/A, B/A e A/B, com dois aquecimentos de navegador, seis aberturas e duas paginações por minibloco. Interromper por mutação inesperada, instabilidade funcional ou aquecimento fora do limite. Aplicar os limiares práticos de HTTP e H nas duas ordens.

## Integridade e decisão

Guards inicial e final do v4 coincidiram nas **54 tabelas e uma sequência** e corresponderam à referência final da 5H3. A transação foi `REPEATABLE READ READ ONLY`, com timeout de 5 s por consulta e 1 s por lock. O v3, o original e o clone da Watchlist ficaram fora das consultas. Não houve login, escrita nem início de processos temporários. PostgreSQL e replay permaneceram ativos, com listeners inalterados. Guard inicial [acervo local (guard-before.json)] · Guard final [acervo local (guard-after.json)]

**Manter provisoriamente a implementação da 5J2**, com decisão de desempenho e encerramento do Histórico pendentes. Pela matriz, **Progresso** é o próximo candidato condicional: no recorte de 115 séries há trabalho sobre o conjunto antes da paginação de seis cartões. A hierarquia e a reconciliação ainda exigem qualificação isolada. Notificações permanece encerrada pela 5J1. Nenhuma execução de 5K foi iniciada. [Matriz](04b7-matriz-cobertura.csv) · Gate de reconciliação [acervo local (03c-gate-reconciliacao.md)]


---

## Retomada autorizada — resultado da execução

A autorização permitiu usar a credencial existente de `wwb3reviews1`. A primeira tentativa passou no login e na abertura, mas o seletor auxiliar de página 2 encontrou dois botões com rótulo igual. O guard de encerramento passou. O executor foi corrigido para selecionar apenas um controle. A retomada fez outro login normal porque a sessão anterior ficou somente na memória do processo encerrado. Os únicos deltas persistentes foram duas novas sessões, **36 → 37 → 38** linhas em `refresh_tokens`, e mudanças no fingerprint de `shared_limiter_state`. Ambas as execuções tiveram guard inicial e final. Após cada login, a JVM foi encerrada e as requisições seguintes usaram conexão com transações por padrão somente leitura. Primeira tentativa [acervo local (run1-failure.json)] · Operacional R1 [acervo local (run1-operational.json)] · Operacional R2 [acervo local (run2-operational.json)]

Na retomada, A e B coincidiram nos sete campos, no JSON integral da timeline, na identidade e ordem dos registros e na sequência de títulos e links no DOM. A página de 30 registros, a página de oito, o filtro de filmes e o vazio de episódios passaram. Foram duas aberturas diagnósticas por versão e três interações por versão, dez observações válidas. Os controles HTTP separados compararam o resumo e a página de Reviews e a Home entre os builds. A Home foi comparada com ordenação canônica dentro de empates de contagem, cuja equivalência de apresentação já havia sido qualificada no recorte da 5H3. Essa normalização não é uma nova observação da ordem original dos gêneros. Home e Reviews não tiveram DOM medido nesta etapa. O controle confirmou o comportamento dos endpoints, que usam o mesmo JAR. A timeline do Histórico foi comparada sem normalizar suas listas. Contratos [acervo local (run2-contracts.ndjson)] · Observações [acervo local (run2-browser.ndjson)]

### SQL e payload observados

| Medida | A | B | Diferença |
| --- | ---: | ---: | ---: |
| Leituras SQL do resumo | 17 | 5 | −12 |
| Leituras SQL da timeline | 18 | 18 | 0 |
| Leituras SQL acumuladas | 35 | 23 | −12 (−34,29%) |
| JSON do resumo | 4.586 B | 206 B | −4.380 B |
| JSON da timeline | 54.164 B | 54.164 B | 0 B |
| JSON acumulado | 58.750 B | 54.370 B | −4.380 B (−7,46%) |
| Replay por resumo e timeline aquecidos | 0 + 0 | 0 + 0 | 0 |

Uma sonda por perna e versão após aquecimento, em JVM diagnóstica, com instruções observadas no PostgreSQL. Os totais acumulados excluem o GET da sessão. O resumo A consultou candidatos de próximos episódios, interesses do calendário, relações para Feed, agregados do período, cartões recentes, companhias e indicador de notificações. Essas consultas estão ausentes em B. O calendário não precisou carregar agendas para essa persona sem interesses. Resoluções internas de mídia atendidas em memória não foram contadas. A comparação aquecida verifica ausência de novas chamadas ao replay. O deslocamento de custo com JVM fria e o primeiro clique em detalhes ficaram fora do experimento. SQL efetivo [acervo local (run2-sql.ndjson)]

### Protocolo oficial

A mesma JVM serviu todos os miniblocos oficiais. As outras JVMs foram reservadas à emissão da sessão, qualificação e observação SQL. Tanto a JVM de qualificação quanto a oficial estabilizaram em 15 operações. Cada operação de aquecimento retomada exercitou timeline e os dois resumos com o mesmo conjunto de requisições. Houve 16 aquecimentos de navegador. Cada minibloco usou contexto novo por abertura e duas paginações no contexto de suas aberturas. A ordem foi A/B, B/A, B/A e A/B. H usou o coletor histórico e a presença de um título visível. A paginação confirmou também o indicador da página 2. Os validadores de contrato rodaram fora do instante cronometrado. Medidas sem logging SQL diagnóstico ou tempos Hibernate. Protocolo [acervo local (run2-protocol.json)] · Aquecimento [acervo local (run2-warm.ndjson)]

### Resultados oficiais

**48 aberturas e 16 paginações válidas, zero inválidas na coleta oficial.** A falha diagnóstica de seletor ficou separada.

| Métrica (ms) | A mediana / média / IQR | B mediana / média / IQR | Δ B − A |
| --- | ---: | ---: | ---: |
| H abertura | 320,60 / 329,78 / 17,38 | 334,20 / 334,62 / 18,41 | 13,61 (4,24%) |
| Resumo | 76,82 / 76,74 / 7,47 | 54,73 / 54,17 / 3,68 | -22,09 (-28,76%) |
| TTFB resumo | 43,08 / 44,03 / 6,46 | 17,22 / 17,25 / 1,96 | -25,86 (-60,03%) |
| Timeline | 87,30 / 87,93 / 6,72 | 92,79 / 92,47 / 5,77 | 5,49 (6,29%) |
| TTFB timeline | 50,99 / 54,16 / 9,59 | 53,74 / 54,54 / 6,14 | 2,74 (5,38%) |
| H página 2 | 88,34 / 90,38 / 7,11 | 95,92 / 94,59 / 3,15 | 7,59 (8,59%) |
| GET página 2 | 49,15 / 49,64 / 5,61 | 50,59 / 49,72 / 5,88 | 1,44 (2,93%) |

| Par e ordem | Δ H abertura | Δ GET resumo | Δ GET timeline | Δ H página 2 |
| --- | ---: | ---: | ---: | ---: |
| 1 · AB | -0,52 | -24,49 | 0,30 | 2,81 |
| 2 · BA | 16,77 | -21,58 | 10,37 | 0,40 |
| 3 · BA | 26,13 | -22,06 | 6,75 | 8,79 |
| 4 · AB | 3,90 | -25,20 | -1,62 | 4,85 |

O resumo melhorou nas duas ordens, com medianas das diferenças por par de −24,84 ms em A/B e −21,82 ms em B/A. A timeline terminou por último em todas as 24 aberturas de cada versão. H subiu 13,61 ms (4,24%) na abertura e 7,59 ms na paginação. Nenhum atingiu simultaneamente 10 ms e 5%. A direção da diferença do GET da timeline variou entre as ordens. O efeito sobre H não pode ser atribuído causalmente ao Angular ou ao backend a partir destes dados. Foram dois GETs funcionais na abertura e um na paginação, sem chamadas ao replay na coleta oficial. A distribuição completa inclui mínimos, máximos, p75, p90 e diferenças por ordem. Dados brutos [acervo local (run2-browser.ndjson)] · Estatísticas [acervo local (run2-statistics.json)]

**Manter a otimização e encerrar o ciclo do Histórico.** A redução de trabalho e o benefício HTTP foram comprovados. Não houve aceleração até conteúdo útil. A próxima prioridade é Progresso, condicionada à qualificação isolada da hierarquia e da reconciliação. A 5K não foi iniciada.

O guard final preservou as tabelas de negócio, credenciais, demais contas e snapshots. Somente os deltas de login foram permitidos. Os artefatos foram conferidos no encerramento. PostgreSQL e replay continuam ativos e o clone de Watchlist ficou fora da operação. Guard final [acervo local (run2-execution-final.json)] · Guards por operação [acervo local (run2-guard.ndjson)]
