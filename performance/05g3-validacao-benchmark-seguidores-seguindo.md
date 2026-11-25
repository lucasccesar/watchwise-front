# Etapa 5G3 · Validação e benchmark integrado de Seguidores e Seguindo

**Manter a projeção e encerrar o ciclo das duas telas.** O PostgreSQL passou de 27 para sete colunas na leitura paginada, com o mesmo JSON e o mesmo número de consultas. As 96 observações oficiais foram válidas. Os quatro cenários ficaram abaixo dos limiares práticos de ganho, sem evidência de regressão relevante.

## Artefatos e ambiente

| Artefato | SHA-256 |
| --- | --- |
| JAR A [acervo local (A.jar)] | `be70712d61ef62fe108d71f8e877b03a18db482315a83a283cec0160b0d9bed8` |
| JAR B [acervo local (B.jar)] | `59357e0116bbe61111d2dde69f64a508bc626c9d8e944abef059301c9aac9b6a` |
| Angular comum [acervo local (browser)] | `f54ff1ede314165c51695253a4cfd5d2c1c2cf6faae5185708d30a899adcc5b5` |

Os hashes foram confirmados no início e no encerramento. A comparação da 5G2 registrou duas classes de produção alteradas e um POM interno com diretórios de empacotamento diferentes. Os artefatos preservam as seis otimizações anteriores. 5G2 [acervo local (05g2-otimizacao-projecao-seguidores-seguindo.md)]

O PostgreSQL 16 isolado estava saudável em `127.0.0.1:15433`, com 2 CPUs e 2 GiB, e o replay histórico já respondia em `127.0.0.1:18091`. Foram confirmados o catálogo local, o código que encerra misses com 404 e o binding da API temporária a `watchwise_benchmark_exec_v4`. O proxy serviu o Angular em `http://localhost:3001` com upstream `127.0.0.1:8082`. Nenhum dos serviços originais precisou ser iniciado. O executor manteve Flyway, inicialização SQL, seeds e jobs de reconciliação fora da execução, e bloqueou no Chromium a rede externa e as escritas. A primeira tentativa do auxiliar parou ainda na consulta somente leitura de preparação, por interpolação vazia do UUID na busca de terceiros. A correção ocorreu antes de iniciar JVM, autenticar ou coletar amostras.

## PostgreSQL e equivalência

Os dois JARs produziram HTTP 200 e o mesmo JSON integral nas páginas 1, 2 e 4 das duas rotas. A igualdade compara todos os valores e chaves, preservando ordem de arrays, IDs, nomes, usuários, descrições, visibilidade, timestamps, avatares nulos, totais e envelope. Os totais foram 75 em Seguidores e 65 em Seguindo. As duas primeiras páginas tinham 20 perfis; as últimas, 15 e 5, respectivamente. O corpo JSON sem compressão teve 4.441 B em ambas as versões nas páginas 1 e 2. As páginas finais tiveram 3.344 B em Seguidores e 1.167 B em Seguindo, também iguais em A e B.

Nos dois sentidos, a conta sintética obteve HTTP 200 em um perfil público de terceiro, com um seguidor e cinco seguidos. O perfil privado sem vínculo deu 403 e a chamada sem sessão deu 401. O recorte sintético consultado não ofereceu alvo bloqueado ou alvo privado com vínculo aceito para a persona. O SQL confirmou o lote de bloqueios nas páginas próprias com conteúdo e as leituras de privacidade no perfil privado. A resposta mascarada de uma contraparte bloqueada e o acesso privado com vínculo aceito permanecem cobertos pelos testes da 5G2, sem comprovação pelo v4 nesta rodada.

O SQL real foi atribuído ao PID PostgreSQL da JVM de diagnóstico, com parâmetros omitidos no log. A consulta paginada A selecionou **27 colunas**, dos vínculos e usuários. B selecionou **sete**, sem coluna extra, em todos os diagnósticos. No SQL B aparecem `id`, `username`, `name`, `description`, `profile_picture`, `is_profile_public` e `created_at` do usuário. A consulta junta o mesmo lado do vínculo e ordena por `followers.created_at DESC, followers.id DESC`. O filtro `ACCEPTED` permanece. A contagem explícita de B usa os mesmos predicados.

As leituras contabilizadas por GET foram **5, 5 e 4** nas páginas 1, 2 e 4, em ambas as versões e sentidos. Foram observados a checagem da sessão, a leitura do alvo, a seleção da página, o lote de bloqueios e, quando necessário, a contagem. O count foi executado nas páginas completas e dispensado na última página parcial. A checagem de privacidade do alvo de terceiro apareceu como leitura própria, separada do lote. Não houve GET ao replay nas páginas próprias de diagnóstico. A construção direta do DTO e as sete colunas comprovam a eliminação estrutural da leitura integral das entidades da página. A contagem de objetos materializados na JVM e de linhas físicas lidas pelo plano não foi medida. SQL e respostas [acervo local (sql.ndjson)] · Acessos [acervo local (access.ndjson)]

## Qualificação e coleta

Foram qualificadas 12 jornadas, três por tela e por JAR, com 24 observações fora da série oficial. Os links renderizados na ordem da resposta preservaram a condição histórica de H. Fora do relógio de H, o executor também comparou o JSON completo, nomes, textos, avatares, links, botão de deixar de seguir e controles de página. A abertura esperava dois GETs, incluindo a sessão, e a página 2 esperava um único GET. Não houve duplicação nos casos qualificados. Cada jornada usou contexto novo Chromium 159.0.8154.6 com sessão em memória, cache HTTP desabilitado pelo roteamento e a mesma origem, proxy e build.

O aquecimento da JVM alternou as duas rotas na página 1. O gate comparou as medianas das duas últimas janelas de cinco, com tolerância do maior valor entre 5 ms e 10% da mediana anterior, de 15 a até 30 operações. Houve quatro pares A/B, B/A, B/A e A/B. Os pares ímpares começaram por Seguidores e os pares pares por Seguindo. Cada minibloco teve um aquecimento de navegador e três jornadas programadas por tela. Os diagnósticos SQL ficaram em JVMs separadas. Abertura e paginação compartilham a mesma jornada e são analisadas em células distintas. Falhas de aquecimento excluem o bloco, amostras inválidas ficam registradas sem reposição e divergência funcional ou de integridade interrompe a série.

Os oito miniblocos passaram após 15 operações HTTP de aquecimento cada. Foram válidas 16 jornadas de aquecimento no navegador e 48 jornadas oficiais, com 24 observações por cenário, 12 por JAR. Houve zero invalidações, pares incompletos, GETs duplicados e erros de API ou JavaScript nas janelas oficiais. A paginação do próprio perfil manteve um GET por clique. Protocolo prévio [acervo local (protocol.json)] · Qualificação [acervo local (qualification.json)]

## Resultados oficiais

Medianas de tempo em ms. Nas linhas de SQL e bytes, os valores são das páginas 1, 2 e 4.

### Seguidores

| Métrica | A | B | B − A |
| --- | ---: | ---: | ---: |
| Colunas da consulta paginada | 27 | 7 | -20 |
| Consultas de leitura por página | 5 / 5 / 4 | 5 / 5 / 4 | 0 |
| Bytes JSON por página | 4441 / 4441 / 3344 | 4441 / 4441 / 3344 | 0 |
| Hidratação materializada | Sem medição direta | Sem medição direta | B usa construtor de DTO |
| Abertura · GET | 48,13 | 45,43 | -2,70 (-5,61%) |
| Abertura · TTFB | 16,48 | 14,93 | -1,55 (-9,38%) |
| Abertura · H | 196,21 | 193,18 | -3,03 (-1,54%) |
| Abertura · GETs | 2,00 | 2,00 | 0,00 (0,00%) |
| Paginação · GET | 22,14 | 20,44 | -1,71 (-7,70%) |
| Paginação · TTFB | 17,79 | 16,23 | -1,56 (-8,77%) |
| Paginação · H | 63,55 | 63,30 | -0,25 (-0,39%) |
| Paginação · GETs | 1,00 | 1,00 | 0,00 (0,00%) |
| Equivalência funcional | Referência A | JSON e DOM equivalentes | — |

### Seguindo

| Métrica | A | B | B − A |
| --- | ---: | ---: | ---: |
| Colunas da consulta paginada | 27 | 7 | -20 |
| Consultas de leitura por página | 5 / 5 / 4 | 5 / 5 / 4 | 0 |
| Bytes JSON por página | 4441 / 4441 / 1167 | 4441 / 4441 / 1167 | 0 |
| Hidratação materializada | Sem medição direta | Sem medição direta | B usa construtor de DTO |
| Abertura · GET | 47,83 | 46,02 | -1,80 (-3,76%) |
| Abertura · TTFB | 16,20 | 14,98 | -1,22 (-7,53%) |
| Abertura · H | 195,43 | 197,30 | 1,87 (0,96%) |
| Abertura · GETs | 2,00 | 2,00 | 0,00 (0,00%) |
| Paginação · GET | 21,39 | 20,75 | -0,64 (-3,01%) |
| Paginação · TTFB | 17,34 | 16,45 | -0,89 (-5,10%) |
| Paginação · H | 67,59 | 64,95 | -2,64 (-3,91%) |
| Paginação · GETs | 1,00 | 1,00 | 0,00 (0,00%) |
| Equivalência funcional | Referência A | JSON e DOM equivalentes | — |

## Distribuições e pareamento

| Cenário | Métrica | Versão | n | Mediana | Média | Mín–máx | IQR | p75 | p90 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Seguidores · abertura | H | A | 12 | 196,21 | 194,66 | 185,35–200,70 | 5,69 | 197,26 | 199,31 |
| Seguidores · abertura | H | B | 12 | 193,18 | 192,51 | 177,09–205,55 | 9,81 | 197,64 | 202,68 |
| Seguidores · abertura | http | A | 12 | 48,13 | 46,09 | 28,10–50,13 | 2,91 | 49,12 | 49,36 |
| Seguidores · abertura | http | B | 12 | 45,43 | 40,06 | 21,76–51,23 | 20,04 | 48,16 | 50,02 |
| Seguidores · abertura | ttfb | A | 12 | 16,48 | 16,23 | 13,58–18,42 | 1,26 | 16,97 | 17,84 |
| Seguidores · abertura | ttfb | B | 12 | 14,93 | 15,01 | 13,28–17,98 | 1,80 | 15,78 | 16,31 |
| Seguidores · paginação | H | A | 12 | 63,55 | 65,20 | 54,50–78,60 | 11,00 | 70,87 | 75,61 |
| Seguidores · paginação | H | B | 12 | 63,30 | 64,23 | 55,65–72,20 | 4,82 | 67,23 | 69,80 |
| Seguidores · paginação | http | A | 12 | 22,14 | 22,11 | 20,44–24,68 | 1,51 | 22,72 | 23,32 |
| Seguidores · paginação | http | B | 12 | 20,44 | 20,72 | 18,88–23,65 | 1,42 | 21,48 | 21,81 |
| Seguidores · paginação | ttfb | A | 12 | 17,79 | 17,77 | 16,07–20,10 | 1,52 | 18,48 | 18,88 |
| Seguidores · paginação | ttfb | B | 12 | 16,23 | 16,52 | 15,02–19,34 | 0,54 | 16,57 | 17,56 |
| Seguindo · abertura | H | A | 12 | 195,43 | 193,53 | 176,42–200,10 | 4,92 | 197,21 | 199,06 |
| Seguindo · abertura | H | B | 12 | 197,30 | 195,93 | 175,84–216,74 | 9,38 | 201,44 | 207,32 |
| Seguindo · abertura | http | A | 12 | 47,83 | 45,20 | 22,72–51,45 | 4,06 | 48,62 | 48,93 |
| Seguindo · abertura | http | B | 12 | 46,02 | 43,09 | 22,93–51,55 | 3,12 | 47,48 | 51,29 |
| Seguindo · abertura | ttfb | A | 12 | 16,20 | 15,83 | 13,13–18,23 | 2,55 | 16,91 | 17,80 |
| Seguindo · abertura | ttfb | B | 12 | 14,98 | 14,98 | 13,35–16,16 | 1,70 | 15,96 | 16,14 |
| Seguindo · paginação | H | A | 12 | 67,59 | 67,51 | 57,96–78,11 | 7,03 | 71,08 | 76,83 |
| Seguindo · paginação | H | B | 12 | 64,95 | 64,53 | 57,23–72,28 | 5,42 | 67,02 | 69,80 |
| Seguindo · paginação | http | A | 12 | 21,39 | 22,65 | 19,16–35,72 | 1,67 | 22,62 | 23,27 |
| Seguindo · paginação | http | B | 12 | 20,75 | 20,84 | 19,11–23,35 | 1,23 | 21,34 | 22,43 |
| Seguindo · paginação | ttfb | A | 12 | 17,34 | 18,60 | 15,38–31,30 | 1,82 | 18,66 | 19,21 |
| Seguindo · paginação | ttfb | B | 12 | 16,45 | 16,67 | 15,27–18,64 | 1,46 | 17,24 | 18,44 |

| Cenário | Métrica | P1 A/B | P2 B/A | P3 B/A | P4 A/B | Mediana B − A | A/B | B/A |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |
| Seguidores · abertura | H | 196,20 → 195,84 (-0,36) | 198,54 → 194,10 (-4,44) | 196,34 → 199,00 (2,66) | 190,67 → 183,51 (-7,16) | -2,40 | -3,76 | -0,89 |
| Seguidores · abertura | http | 49,30 → 45,85 (-3,45) | 46,25 → 45,32 (-0,93) | 48,14 → 48,71 (0,57) | 48,12 → 22,79 (-25,33) | -2,19 | -14,39 | -0,18 |
| Seguidores · abertura | ttfb | 16,50 → 14,06 (-2,44) | 15,98 → 16,35 (0,37) | 16,66 → 15,73 (-0,93) | 13,83 → 13,37 (-0,46) | -0,70 | -1,45 | -0,28 |
| Seguidores · paginação | H | 70,12 → 62,89 (-7,23) | 63,00 → 68,40 (5,40) | 64,11 → 63,72 (-0,39) | 58,89 → 62,44 (3,55) | 1,58 | -1,84 | 2,51 |
| Seguidores · paginação | http | 22,63 → 20,39 (-2,24) | 22,36 → 21,42 (-0,94) | 21,93 → 21,67 (-0,26) | 20,77 → 20,14 (-0,63) | -0,78 | -1,43 | -0,60 |
| Seguidores · paginação | ttfb | 18,02 → 16,12 (-1,90) | 17,93 → 16,27 (-1,66) | 17,64 → 17,64 (0,00) | 16,63 → 16,04 (-0,59) | -1,12 | -1,24 | -0,83 |
| Seguindo · abertura | H | 190,77 → 190,60 (-0,17) | 196,70 → 207,90 (11,20) | 192,79 → 193,80 (1,01) | 198,74 → 198,77 (0,03) | 0,52 | -0,07 | 6,11 |
| Seguindo · abertura | http | 44,79 → 42,64 (-2,15) | 48,60 → 49,04 (0,44) | 43,87 → 45,12 (1,25) | 47,79 → 46,86 (-0,93) | -0,25 | -1,54 | 0,84 |
| Seguindo · abertura | ttfb | 14,51 → 14,32 (-0,19) | 16,81 → 16,14 (-0,67) | 13,91 → 14,11 (0,20) | 15,63 → 15,05 (-0,58) | -0,38 | -0,38 | -0,23 |
| Seguindo · paginação | H | 60,59 → 63,89 (3,30) | 71,02 → 65,19 (-5,83) | 69,10 → 58,58 (-10,52) | 67,65 → 64,84 (-2,81) | -4,32 | 0,24 | -8,17 |
| Seguindo · paginação | http | 20,50 → 21,10 (0,60) | 22,44 → 21,25 (-1,19) | 21,22 → 19,77 (-1,45) | 22,51 → 21,10 (-1,41) | -1,30 | -0,40 | -1,32 |
| Seguindo · paginação | ttfb | 16,48 → 17,16 (0,68) | 18,48 → 16,96 (-1,52) | 16,96 → 15,44 (-1,52) | 18,16 → 16,40 (-1,76) | -1,52 | -0,54 | -1,52 |

## Interpretação e decisão

As medidas de latência são em ms. Nas tabelas, cada célula de par apresenta as medianas A → B e, entre parênteses, B − A. As duas últimas colunas são as medianas dos deltas de cada ordem. p75 e p90 são exploratórios. As baselines anteriores serviram de referência aos roteiros. A é o JAR anterior medido neste mesmo experimento. 4B3 [acervo local (04b3-baseline-social-parcial.md)] · 4B6-A [acervo local (04b6a-baseline-seguindo-feed.md)]

- **Redução estrutural e equivalência confirmadas.** O SELECT devolve 20 colunas a menos nas duas direções. O JSON, o número de consultas de leitura e de GETs e o conteúdo renderizado ficaram iguais.
- **Latência HTTP.** As medianas do GET paginado caíram em cerca de 0,64–2,70 ms. Na paginação de Seguidores, todos os pares apontaram na mesma direção. Na abertura de Seguidores, a redução de 25,33 ms no par 4 foi isolada. Nenhum recorte atingiu simultaneamente 5 ms e 5% de redução com consistência entre as ordens.
- **Conteúdo útil e regressões.** As medianas variaram entre −3,03 ms e +1,87 ms. A vantagem de B na paginação de Seguindo apareceu sobretudo na ordem B/A. A piora isolada de 11,20 ms no par 2 da abertura de Seguindo não se repetiu nos demais pares. Nenhum recorte atingiu 10 ms e 5% de redução com consistência entre as ordens, nem demonstrou piora consistente de magnitude prática. Os 12 valores por versão e cenário limitam inferências sobre a cauda.

A redução de colunas justifica manter a projeção. A diferença observada não quantifica redução de I/O do plano ou ganho perceptível. Os resultados encerram o ciclo das duas telas.

## Integridade e encerramento

O guard comparou as 54 tabelas e as sequências do v4 e registrou **185 operações, sem divergência inesperada**. As únicas alterações foram atribuídas ao login sintético. `refresh_tokens` passou de 32 a 33 linhas. `shared_limiter_state` permaneceu com três linhas e mudou de hash. Dados de negócio, snapshots, sequências e hashes do v3 foram preservados. Os hashes dos três artefatos e do catálogo do replay permaneceram iguais. A API e o proxy temporários foram encerrados, as portas 8082 e 3001 ficaram livres e os processos originais mantiveram o estado inicial. PostgreSQL e replay ficaram ativos. Guard [acervo local (guard.ndjson)] · Estado inicial [acervo local (initial.json)] · Estado final [acervo local (final.json)]

**Próxima prioridade sugerida — Reviews do diário.** A matriz aponta uma baseline 4A com 38 reviews distribuídas em três páginas, mediana de abertura de 229,81 ms e p95 exploratório de 275,97 ms. O fluxo paginado dá um recorte delimitado para diagnóstico. O volume foi qualificado naquele clone e precisa ser conferido no ambiente autorizado para a próxima etapa. A matriz não contém evidência de frequência de uso. [Matriz consolidada](04b7-matriz-cobertura.csv) · Baseline 4A [acervo local (04a-baseline-parcial.md)]

Jornadas brutas [acervo local (browser.ndjson)] · Análise completa [acervo local (analysis.json)] · Aquecimentos [acervo local (warm.ndjson)] · Executor [acervo local (run.ps1)]
