# Etapa 5F3 · Validação e benchmark de Meus Picks

**Manter provisoriamente.** O GET paginado variou -12,06 ms (-24,33%) e H da abertura variou -2,31 ms (-1,08%).

## Artefatos e ambiente

| Artefato | SHA-256 |
| --- | --- |
| Backend A [acervo local (A.jar)] | `169952931b31c629ecc0256e0eec6fb0ebf0b0b07dffb73031d8a714083ec790` |
| Backend B [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | `be70712d61ef62fe108d71f8e877b03a18db482315a83a283cec0160b0d9bed8` |
| Angular A [acervo local (browser)] | `5c289425391ec98c6447c6b4c1aa0a8d7fecbcac01fbcb7e410fde915ea68c3f` |
| Angular B [acervo local (browser)] | `f54ff1ede314165c51695253a4cfd5d2c1c2cf6faae5185708d30a899adcc5b5` |

Os hashes foram verificados contra a 5F2. O inventário por entrada restringe o delta nos JARs a oito arquivos de classe da projeção e do repositório de Picks. A referência Angular A é a que encerrou a 5E3. Os pares preservam as cinco otimizações anteriores. Inventário de build [acervo local (artifacts.json)] · 5F2 [acervo local (05f2-otimizacao-projecao-meus-picks.md)]

PostgreSQL v4 em 127.0.0.1:15433, replay histórico em 127.0.0.1:18091 e miss local com HTTP 404. A API temporária usou 127.0.0.1:18082 e o proxy Angular http://localhost:3001. Chromium 159.0.8154.6, sessão sintética autenticada reutilizada em memória, contexto novo por amostra, service worker bloqueado, cache HTTP do navegador desabilitado e somente a origem local permitida. JDBC, PID e atividade do alvo foram verificados. As JVMs temporárias tinham migrations, seeds, jobs e integrações externas fora do replay desabilitados.

## Persistência, equivalência e SQL observado

A projeção canônica da página compara o envelope inteiro e a sequência dos cartões. Inclui ID, privacidade, data, nome e capa do modelo, nome, usuário e avatar do criador, contadores, progresso derivado e IDs e nomes dos chips na ordem. O DOM compara textos, links e fragmentos, imagens, atributos de progresso e paginação. As diferenças permitidas são os campos e enriquecimentos do contrato visual descartados pela 5F2. Os endpoints mantidos são comparados pelo JSON integral com chaves ordenadas, inclusive detalhe e comentários. A listagem legada em B foi confrontada com A.

| Versão e rota | Página | Leituras SQL | Contagens | Linhas HTTP | Corpo JSON (B) | Replay |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A `/users/me/picks/view` | 1 | 16 | 1 | 10 | 22704 | 4 |
| A `/users/me/picks/view` | 2 | 15 | 1 | 10 | 22640 | 0 |
| B `/users/me/picks/list` | 1 | 7 | 1 | 10 | 4561 | 0 |
| B `/users/me/picks/list` | 2 | 7 | 1 | 10 | 4553 | 0 |
| B `/users/me/picks/view` | 1 | 16 | 1 | 10 | 22704 | 4 |
| B `/users/me/picks/view` | 2 | 15 | 1 | 10 | 22640 | 0 |

Os dois JARs reproduziram as duas páginas de dez Picks e total 48 com igualdade canônica, e a rota visual de B preservou o JSON de A. Os GETs protegidos foram verificados com 401 sem sessão. Os filtros da persona e o desempate permaneceram equivalentes. Casos que requerem outros usuários ou alterações de dados permanecem cobertos pelos testes locais da 5F2.

Na página 1, as leituras passaram de **16 para 7** e o corpo não comprimido de **22704 para 4561 B**. A seleção paginada passou de 62 para dez colunas: ID do Pick, ID, título e capa do modelo, usuário, nome e avatar do criador, visibilidade, data e likes do Pick. A rota resumida manteve a contagem de página, um lote de seleções, um de categorias, um de opções fixas e a contagem de comentários dos Picks. A consulta de categorias que era repetida, o SELECT por coordenadas de mídia em contents, as consultas de curtida e os agregados destinados ao preview de template ficaram fora do novo caminho. A leitura da sessão continua. Os joins com referências de conteúdo nas seleções e opções permanecem para validar as respostas. O diagnóstico observou quatro GETs de filmes ao replay em A e zero em B na página 1. Isso é uma contagem de chamadas HTTP locais, sem contagem dinâmica de invocações Java. As linhas retornadas por SELECT do PostgreSQL não foram medidas.

## Qualificação e protocolo

A qualificação foi aprovada. Cinco aberturas consecutivas por versão reproduziram os mesmos campos funcionais e DOM. O clique nas duas versões preservou o detalhe, o JSON completo de suas respostas e o mesmo conteúdo renderizado.
- A: 5/5 aberturas válidas na qualificação. Bytes do JSON principal: 22704, 22704, 22704, 22704, 22704.
- B: 5/5 aberturas válidas na qualificação. Bytes do JSON principal: 4561, 4561, 4561, 4561, 4561.

O executor marca H antes das verificações adicionais de JSON e DOM. Cada ciclo de aquecimento executa a consulta de sessão e então dispara em paralelo a página de Picks e a de templates próprios. O gate exige 15 ciclos, estende de cinco em cinco até 30 e compara as medianas das duas últimas janelas de cinco com tolerância do maior valor entre 5 ms e 10% da janela anterior. Os ciclos da janela final devem passar sem chamadas ao replay. O diagnóstico SQL usa JVM separada dos blocos oficiais. A ordem foi A/B, B/A, B/A e A/B. Dois aquecimentos de navegador, seis aberturas e duas navegações planejadas por minibloco. Sem reposição. Divergência funcional interrompe a sequência imediatamente. Falhas de integridade deixam a execução bloqueada.
O aquecimento da JVM ficou em P1-A 15 ciclos, P1-B 15 ciclos, P2-B 20 ciclos, P2-A 20 ciclos, P3-B 20 ciclos, P3-A 15 ciclos, P4-A 15 ciclos, P4-B 15 ciclos; 16 aquecimentos de navegador válidos.
A primeira invocação de preparo parou por falta de importação da função de normalização. Ela não iniciou a qualificação no navegador. O encerramento passou nos guards. Após corrigir o auxiliar, foi executada uma única qualificação funcional de cinco aberturas por build. Registro do preparo [acervo local (failure.json)]

A divergência histórica de sete bytes continua sem causa determinada. Os tamanhos da qualificação acima pertencem à coleta atual. As medianas históricas de 233,56 ms (lista) e 133,80 ms (detalhe) são apenas contexto. 4B6-B [acervo local (04b6b-baseline-picks-templates.md)] · 5F1 [acervo local (05f1-diagnostico-meus-picks.md)] · [5E3](05e3-validacao-benchmark-templates.md)

## Resultados temporizados

| Recorte | Mediana | A | B | B − A | Diferença (%) |
| --- | --- | ---: | ---: | ---: | ---: |
| Lista | H (ms) | 213,12 | 210,81 | -2,31 | -1,08 |
| Lista | GET paginado (ms) | 49,59 | 37,53 | -12,06 | -24,33 |
| Lista | TTFB (ms) | 29,99 | 17,71 | -12,28 | -40,93 |
| Lista | Recebimento (ms) | 19,59 | 19,33 | -0,27 | -1,35 |
| Lista | JSON do GET (B) | 22704,00 | 4561,00 | -18143,00 | -79,91 |
| Lista | Corpo transferido do GET (B) | 22740,00 | 4561,00 | -18179,00 | -79,94 |
| Lista | JSONs da abertura (B) | 23884,00 | 5741,00 | -18143,00 | -75,96 |
| Lista | Corpos transferidos (B) | 23943,00 | 5764,00 | -18179,00 | -75,93 |
| Lista | GETs | 3,00 | 3,00 | 0,00 | 0,00 |
| Lista | Cartões | 10,00 | 10,00 | 0,00 | 0,00 |
| Detalhe | H (ms) | 123,91 | 126,59 | 2,69 | 2,17 |
| Detalhe | GET do detalhe (ms) | 37,00 | 39,39 | 2,39 | 6,47 |
| Detalhe | TTFB (ms) | 30,57 | 32,66 | 2,10 | 6,87 |
| Detalhe | GETs | 2,00 | 2,00 | 0,00 | 0,00 |

O recebimento é a diferença entre término do corpo e primeiro byte nos registros do Playwright. Bytes transferidos são os tamanhos de corpos medidos pelo navegador, sem cabeçalhos ou outros custos do transporte. Bytes de JSON são corpos decodificados. A redução de bytes e a variação de tempo são analisadas separadamente.

| Métrica | Versão | Válidas | Média | Mediana | Mín. | Máx. | IQR | CV (%) | p75 | p90 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Lista H | A | 24 | 218,25 | 213,12 | 200,22 | 249,74 | 19,38 | 6,01 | 229,26 | 235,29 |
| Lista H | B | 24 | 212,44 | 210,81 | 199,42 | 237,12 | 5,04 | 3,97 | 213,91 | 217,92 |
| Lista http | A | 24 | 58,14 | 49,59 | 44,45 | 97,38 | 31,93 | 28,70 | 77,97 | 82,11 |
| Lista http | B | 24 | 44,85 | 37,53 | 33,53 | 77,67 | 11,66 | 33,24 | 47,19 | 68,53 |
| Lista ttfb | A | 24 | 30,06 | 29,99 | 24,86 | 45,60 | 4,77 | 13,84 | 31,53 | 32,59 |
| Lista ttfb | B | 24 | 17,98 | 17,71 | 14,41 | 27,02 | 2,66 | 15,45 | 18,72 | 20,64 |

| Recorte | Par | Ordem | Válidas A/B | H A | H B | Δ H | GET A | GET B | Δ GET |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| list | 1 | A/B | 6/6 | 221,98 | 210,12 | -11,85 | 63,98 | 37,61 | -26,37 |
| list | 2 | B/A | 6/6 | 210,63 | 211,01 | 0,38 | 49,47 | 36,75 | -12,71 |
| list | 3 | B/A | 6/6 | 211,43 | 208,28 | -3,15 | 50,98 | 36,84 | -14,14 |
| list | 4 | A/B | 6/6 | 217,40 | 216,86 | -0,54 | 49,28 | 67,69 | 18,41 |
| detail | 1 | A/B | 2/1 | 123,78 | 127,92 | — | 37,93 | 39,85 | — |
| detail | 2 | B/A | 2/1 | 119,72 | 125,11 | — | 37,41 | 43,97 | — |
| detail | 3 | B/A | 2/1 | 127,31 | 130,12 | — | 37,60 | 38,94 | — |
| detail | 4 | A/B | 2/1 | 126,17 | 125,26 | — | 35,34 | 35,73 | — |

Listagem: 48 tentativas válidas, sem descartes. Mediana dos deltas dos pares completos: H -1,84 ms e GET -13,43 ms.

Detalhe: 16 tentativas e quatro inválidas. Nenhum par teve as duas medições válidas de cada versão. As medianas apresentadas para o detalhe são descritivas.

Ordem A/B na abertura: mediana dos deltas de H -6,19 ms e GET -3,98 ms.

Ordem B/A na abertura: mediana dos deltas de H -1,38 ms e GET -13,43 ms.

Benefício prático no GET paginado (5 ms e 5% mais consistência nas duas ordens): não demonstrado. Benefício prático em H (10 ms e 5% mais consistência nas duas ordens): não demonstrado. A consistência foi avaliada de forma conservadora: a direção deveria se manter em todos os pares completos das duas ordens. As diferenças intraordem permanecem visíveis na tabela. O controle de detalhe é exploratório e a amostra pequena não estabelece equivalência temporal.

As quatro primeiras navegações de detalhe em B (uma por JVM/minibloco) foram invalidadas por uma chamada ao replay local. Todas receberam HTTP 200 para o mesmo filme, que também aparece entre as quatro consultas de mídia do GET antigo na primeira página do diagnóstico. Os dois GETs da navegação responderam 200 e não houve erros capturados no navegador nessas tentativas. O resultado é compatível com a perda do aquecimento incidental pelo GET antigo. Os quatro cliques seguintes em B e os oito em A qualificaram no recorte aquecido, preservando o detalhe completo. A diferença no primeiro clique não foi misturada à distribuição e deixou os pares de detalhe incompletos. O estudo não estima seu impacto em cache frio.

## Integridade e decisão

V3 preservado, sequências e snapshots do v4 preservados, com 107 operações registradas. Diferenças operacionais no v4: refresh_tokens, shared_limiter_state. Os processos temporários foram encerrados e os serviços de PostgreSQL e replay ficaram ativos. Os processos originais permaneceram em seu estado inicial.

Manter a projeção provisoriamente pelo ganho estrutural confirmado na listagem. A ausência de regressão no primeiro clique permanece pendente por diferença de aquecimento. Não há evidência para otimizar comentários agora. Notificações é a próxima prioridade da matriz após fechar Meus Picks.

Dados brutos e diagnósticos [acervo local (20261124T124138402Z)] · Executor [acervo local (experiment.mjs)] · [Matriz consolidada](04b7-matriz-cobertura.csv)
