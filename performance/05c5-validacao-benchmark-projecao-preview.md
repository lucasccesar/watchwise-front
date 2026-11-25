# Etapa 5C5 · Validação da projeção de seguidos no Feed

A projeção executou no PostgreSQL e selecionou **5 colunas ante 22**, com uma consulta de preview por GET nas duas versões. Os dois JARs retornaram o mesmo JSON estrutural para 20 atividades e 65 seguidos. O objetivo foi verificar essa redução de leitura e separar seu efeito estrutural de um eventual efeito de latência no HTTP e na interface.

## Artefatos e ambiente

| Versão | SHA-256 |
| --- | --- |
| A · Antes da projeção | `f3ffba2d2c0ac016f5a69d50993d560155c8d75d4dea8f900f1d643e49489c72` |
| B · Com projeção | `599df884c615f4c9259d7cf64249a16bbac0b2deba33656b35340164c2b6962d` |

Ambos derivam do commit `7105887810a69aa51d017fad1bd4129ff65aeb4f` com as alterações locais documentadas na 5C4. A comparação por entrada da 5C4 verificou dependências e recursos iguais, duas classes com mudanças da projeção e sete classes internas com os mesmos descritores e instruções pelo javap. Revalidei os hashes antes de executar e em cada partida. Os JARs preservados foram reutilizados sem rebuild. O teste de confirmação de e-mail que falha em ambas as versões é preexistente e ficou fora da execução. Relatório 5C4 [acervo local (05c4-otimizacao-projecao-preview-seguidos.md)] · Metadados de compilação e comparação [acervo local (verification.json)]

A porta 8082 já tinha listeners. Usei somente a **API temporária em 127.0.0.1:18082**, com um processo por vez, JDBC para `watchwise_benchmark_exec_v4` em 127.0.0.1:15433 e PostgreSQL 16.14. Os processos originais ficaram fora do tráfego de benchmark. A plataforma usou Java 21, Node 24, sessão da persona sintética verificada e replay TMDB local em 127.0.0.1:18091, com hash de catálogo conferido. O launcher desabilitou migrations e inicialização SQL, usou DDL validate, desativou seeds e workers e desligou os crons configuráveis. O guard e a trava de execução verificaram isolamento, identidade e ausência de concorrência conhecida. Ambiente medido [acervo local (environment.json)] · Launcher [acervo local (run.ps1)]

## 5C5-A · SQL real e equivalência funcional

O PostgreSQL registrou as instruções da sessão JDBC temporária. Usei `log_statement=all` somente nas conexões diagnósticas, com valores dos parâmetros desabilitados inclusive em erro. A captura foi delimitada pela janela do GET e pelos PIDs PostgreSQL do pool confirmado pelo guard. O relatório bruto retém o SQL exato do preview com placeholders e apenas contagens das outras instruções. A configuração foi por sessão e ficou fora das JVMs de latência.

| Métrica | Original A | Otimizado B | Diferença |
| --- | ---: | ---: | ---: |
| Colunas selecionadas no preview | 22 | 5 | −17 |
| Execuções do lote de preview | 1 | 1 | 0 |
| Consultas de leitura no GET | 28 | 28 | 0 |
| Comandos transacionais no GET | 2 | 2 | 0 |
| Escritas observadas no GET | 0 | 0 | 0 |
| Registros do preview | 65 inferidos | 65 inferidos | 0 |
| Entidades hidratadas na requisição | não medido | não medido | não medido |
| DTOs de preview devolvidos | 65 | 65 | 0 |
| Elementos de atividade | 20 | 20 | 0 |
| Bytes do array de preview | 9.288 | 9.288 | 0 |
| Bytes do JSON HTTP | 60.742 | 60.742 | 0 |

Os dois lotes usaram somente `users`, com predicado pela chave primária `id IN ($1, …, $65)`, sem JOIN e sem ORDER BY. A consulta A selecionou todas as colunas mapeadas de User. A consulta B selecionou `id, username, name, profile_picture, is_profile_public`. A consulta de elegibilidade anterior ao lote e a reconstrução de ordem em Java continuaram separadas. O total de 28 consultas já inclui o lote de preview. A leitura agregada anterior confirmou 65 IDs elegíveis e resolvíveis e a resposta conteve os 65 previews distintos. O log de instruções não traz um contador de linhas devolvidas ou examinadas. SQL original [acervo local (SQL-A.json)] · SQL otimizado [acervo local (SQL-B.json)]

**Redução estrutural demonstrada pela projeção, com redução quantitativa de hidratação não medida.** A consulta de B monta o DTO a partir dos escalares. Isso elimina o retorno de entidades completas especificamente desse lote. O caminho de enriquecimento das atividades ainda pode carregar User, e o contexto de persistência pode reutilizar entidades no original. As contagens SQL não quantificam esses efeitos.

Ambas as aberturas retornaram HTTP 200. A comparação ordenou chaves de objetos e conservou todas as posições dos arrays e todos os campos, inclusive cursor e metadados. Nenhum campo foi ignorado. O hash estrutural completo, o hash do preview e o hash da ordem das atividades coincidiram. O primeiro lote manteve 20 atividades distintas de autores elegíveis e os 65 previews conservaram os cinco campos e as fotos nulas. O hash completo também coincidiu com a referência direta da 5A2. O cliente pediu codificação identity e contou os bytes recebidos. Para o preview, serializou o valor compacto incluindo colchetes e confirmou que a mesma sequência existia no corpo recebido. Apenas totais e hashes foram persistidos. O gate de persistência aprovou a execução e liberou o benchmark HTTP. Gate da 5C5-A [acervo local (persistence-gate.json)] · Tentativas [acervo local (attempts.ndjson)]

## 5C5-B · Protocolo HTTP

Quatro pares planejados nas ordens A/B, B/A, B/A e A/B. Cada minibloco tem uma JVM e um Agent HTTP/1.1 próprios, socket único persistente, 30 aquecimentos fixos e seis medidas sequenciais do GET inicial `/api/v1/feed?size=20`. Máximo de 48 medidas. A sessão é reutilizada em memória. A cada partida valida-se o pool e o destino. A instrumentação 5A1, o SQL adicional e as estatísticas Hibernate ficam desligados durante as medições. Caches de JVM e conexão aquecem em cada minibloco. PostgreSQL e replay seguem compartilhados, sem reset.

O critério prévio da 5C1 foi mantido. As últimas duas janelas de seis devem manter o socket e não atingir o replay, com CV amostral de até 15% na janela final. A diferença entre medianas deve ficar abaixo ou igual ao maior valor entre 5 ms e 10% da primeira janela. A primeira falha interrompe a coleta, sem aquecimentos extras, reposição de amostras ou flexibilização. TTFB mede do início do pedido ao primeiro dado do socket. HTTP completo mede até o último byte. Login, boot, guard e parsing ficam fora da janela. O pareamento é entre miniblocos adjacentes completos. O sinal preliminar exige pelo menos 5 ms e 5% de redução na mediana agregada, com direção favorável nas duas ordens. Protocolo da 5C1 [acervo local (05c1-overhead-backend-feed.md)] · Baseline 4B6-A [acervo local (04b6a-baseline-seguindo-feed.md)] · Timeline 5B6 [acervo local (05b6-timeline-angular-feed.md)] · [Consolidação 4B7](04b7-consolidacao-baselines.md) · [Infraestrutura de benchmark](benchmarks/README.md)

### Resultados HTTP

Os oito miniblocos passaram no aquecimento. Houve **240 aquecimentos válidos e 48 amostras medidas válidas**, 24 por versão, com zero amostras inválidas, substituições ou pares incompletos. Os GETs medidos usaram o mesmo socket dos aquecimentos finais em cada bloco. O replay recebeu quatro chamadas por minibloco antes da janela medida e zero durante as medidas. O CV das janelas finais de aquecimento variou de 2,69% a 13,75%. A maior diferença absoluta entre as medianas das janelas foi 3,88 ms. Os hashes funcionais permaneceram iguais ao diagnóstico. Amostras [acervo local (attempts.ndjson)] · Aquecimento [acervo local (warmup-gates.ndjson)] · Replay [acervo local (replay-measured.ndjson)]

| Métrica | Original A | Otimizado B | B − A |
| --- | ---: | ---: | ---: |
| HTTP mediana (ms) | 55,20 | 54,60 | −0,61 (−1,10%) |
| HTTP média (ms) | 55,63 | 54,70 | −0,93 |
| HTTP mín.–máx. (ms) | 51,36–61,98 | 51,05–60,20 | — |
| HTTP IQR (ms) | 2,94 | 1,95 | −0,99 |
| HTTP CV | 4,24% | 3,98% | −0,26 p.p. |
| HTTP p75 (ms) | 56,97 | 55,26 | −1,71 |
| HTTP p90 (ms) | 58,45 | 57,65 | −0,80 |
| TTFB mediana (ms) | 53,99 | 53,12 | −0,88 |
| TTFB média (ms) | 54,17 | 53,20 | −0,97 |
| TTFB p90 (ms) | 56,93 | 55,90 | −1,03 |
| Conteúdo útil por H | não medido | não medido | não medido |

| Par | Ordem | Mediana A (ms) | Mediana B (ms) | Δ HTTP (ms) | Δ HTTP vs. A | Δ TTFB (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | A/B | 55,01 | 53,73 | −1,29 | −2,34% | −1,23 |
| 2 | B/A | 53,82 | 54,47 | +0,65 | +1,20% | +0,40 |
| 3 | B/A | 56,71 | 54,94 | −1,78 | −3,13% | −1,81 |
| 4 | A/B | 55,37 | 54,83 | −0,55 | −0,99% | −0,49 |

A mediana das diferenças entre os pares foi **−0,92 ms**, com extremos de −1,78 a +0,65 ms. Por ordem, a mediana foi −0,92 ms em A/B e −0,56 ms em B/A. As medianas de bloco variaram de 53,82 a 56,71 ms em A e de 53,73 a 54,94 ms em B. O CV usa desvio padrão amostral e os quantis usam interpolação linear. P75 e p90 são exploratórios. A diferença agregada ficou abaixo do limiar de triagem e a variação entre os blocos é maior que o efeito observado. A conclusão vale para 65 seguidos, neste recorte e sob caches compartilhados, com possível efeito residual de aquecimento, carga do host e das leituras do guard sobre o cache do banco. As medidas são diretas ao backend temporário e não se comparam numericamente ao método H da baseline 4B6-A. Estatísticas [acervo local (statistics.json)] · Blocos [acervo local (blocks.ndjson)]

## 5C5-C · Interface

Playwright foi dispensado segundo o limiar da 5C5-B. Nenhum servidor Angular temporário foi iniciado. Tempo até conteúdo útil, avatares e cabeçalho no navegador ficaram sem medição nesta rodada. O método H permanece a referência e N2 ficou fora da comparação.

## Integridade e decisão

As 11 operações com guard passaram. As tabelas de negócio, snapshots e sequências do v4 conservaram os fingerprints. O login autorizado acrescentou uma sessão em `refresh_tokens` (22 → 23) e atualizou o hash do limitador com três linhas antes e depois. Os GETs diagnósticos e medidos não introduziram alterações detectadas. Os hashes do v3 permaneceram iguais. O launcher encerrou as JVMs temporárias e verificou a liberação de 18082 e a preservação dos listeners originais em 8081, 3000 e 5173. Os hashes dos dois JARs foram conferidos novamente no fim. Atestação [acervo local (integrity-summary.json)] · Journal [acervo local (guard.ndjson)]

| Aspecto | Classificação |
| --- | --- |
| Equivalência funcional | Confirmada para a conta e a página medidas |
| Melhoria estrutural de persistência | Confirmada. Cinco colunas e a mesma quantidade de consultas |
| Redução de hidratação | Estrutural no lote. Magnitude não medida |
| Ganho HTTP | Melhoria estrutural sem ganho de latência demonstrado |
| Ganho no frontend | Não medido |

**Decisão recomendada · Manter a otimização.** O contrato foi preservado e a consulta ficou mais seletiva, sem regressão relevante observada no protocolo. A diferença de −0,61 ms não sustenta um ganho de latência e os resultados não devem ser extrapolados para cardinalidades maiores.

**Próxima ação · Investigar as consultas repetidas de categorias de Picks**, em etapa separada.
