# Etapa 5C12 · Benchmark acumulado das otimizações do Feed

**Manter as três otimizações.** A consulta de previews passou de 22 para cinco colunas, as consultas de categorias de duas para uma e o lote de identidades de um para zero. O GET passou de 28 para 26 leituras, com JSON equivalente. Benefício temporal não demonstrado pelo critério prático no HTTP. Benefício temporal não demonstrado pelo critério prático em H.

## Artefatos e ambiente

| Artefato | SHA-256 |
| --- | --- |
| A | `f3ffba2d2c0ac016f5a69d50993d560155c8d75d4dea8f900f1d643e49489c72` |
| B | `4648efaea42daab8abee8e104ed0497918e159976954873dcbcdaf88fa6c295c` |

A é a referência anterior à 5C4 do commit 7105887810a69aa51d017fad1bd4129ff65aeb4f. B inclui a projeção de seguidos, o lote unificado de categorias e o reuso de UUIDs de mídia. A auditoria por entrada da 5C11 restringiu as diferenças a essas classes e classes internas, com dependências e recursos iguais. Nenhum build foi refeito. Atestação acumulada [acervo local (cumulative-artifacts.json)] · [5C11](05c11-validacao-ids-internos-midia-feed.md) · 5C10 [acervo local (05c10-otimizacao-ids-internos-midia-feed.md)]

A API temporária usou 127.0.0.1:18082 porque 8082 estava ocupada. O servidor Angular temporário usou http://localhost:3001 e proxy exclusivo para 18082. Build Angular `63e9d160acb3eefdc41793642fedb5329b798a888d1f5b7d09186d265590efd6` e Chromium 159.0.8154.6. Banco v4 em 127.0.0.1:15433, login sintético com sessão em memória, replay local e jobs, migrations e seeds desabilitados. Ambiente [acervo local (environment.json)] · Frontend [acervo local (frontend.json)]

## Matriz complementar do Feed

| Métrica | A | B | Diferença B − A |
| --- | ---: | ---: | ---: |
| Colunas do preview | 22 | 5 | −17 |
| Consultas de categorias | 2 | 1 | −1 |
| Consultas de resolução de IDs | 1 | 0 | −1 |
| Consultas totais de leitura | 28 | 26 | −2 |
| Atividades | 20 | 20 | — |
| Previews | 65 | 65 | — |
| Bytes do JSON | 60742 | 60742 | — |
| Mediana HTTP (ms) | 52,85 | 48,77 | -4,08 |
| Mediana TTFB HTTP (ms) | 51,69 | 47,37 | -4,32 |
| Mediana H (ms) | 254,37 | 259,73 | 5,36 |
| IQR HTTP (ms) | 3,67 | 3,64 | -0,02 |
| IQR H (ms) | 20,25 | 12,88 | -7,37 |

Diagnósticos SQL separados das medições, com parâmetros protegidos. A comparação canônica cobriu a resposta inteira, inclusive a ordem dos arrays, IDs, Picks, categorias, previews, metadados e paginação. Linhas devolvidas e custo de execução SQL não foram medidos diretamente. SQL A [acervo local (SQL-A.json)] · SQL B [acervo local (SQL-B.json)] · Categorias A [acervo local (SQL-A-categories.json)] · Categorias B [acervo local (SQL-B-categories.json)]

## Protocolo

Quatro pares A/B, B/A, B/A, A/B. Uma JVM por bloco. O aquecimento começa em 15 GETs e aumenta de cinco em cinco até 30 se necessário. As duas últimas janelas consecutivas de cinco devem satisfazer a variação de mediana de até max(5 ms, 10% da janela anterior), sem chamadas ao replay e com o mesmo socket. Um bloco não qualificado é pulado sem reposição. Falha de integridade interrompe tudo. Em bloco qualificado, são feitos seis GETs medidos, dois aquecimentos de navegador e quatro aberturas H, em série. Falhas isoladas de navegador não retiram amostras HTTP. Logging SQL e instrumentação desligados nas medições. Sessão, build, origem e regra de isolamento de rede iguais.

H mantém a abertura direta de /social, leitura do GET sem cursor, validação de ordem e autores do payload e espera pelos 20 links no DOM. O cronômetro histórico encerra quando o predicado retorna no Node. A conferência de visibilidade CSS e do hash funcional corre após a marca. N2 ficou fora da coleta. O guard e o login ficaram fora das janelas. Os limites de relevância prática foram 5 ms e 5% no HTTP e 10 ms e 5% no H, com direção favorável nas duas ordens. Método H [acervo local (05b11-overhead-balanceado-n2-feed.md)] · Baseline contextual 4B6-A [acervo local (04b6a-baseline-seguindo-feed.md)]

| Bloco | Último n | Medianas das janelas (ms) | Gate |
| --- | ---: | ---: | --- |
| P1-A | 20 | 61,89 → 55,96 | passou |
| P1-B | 25 | 51,24 → 49,74 | passou |
| P2-B | 20 | 59,15 → 55,48 | passou |
| P2-A | 20 | 59,43 → 55,09 | passou |
| P3-B | 20 | 57,08 → 51,51 | passou |
| P3-A | 20 | 60,33 → 54,63 | passou |
| P4-A | 20 | 63,81 → 58,51 | passou |
| P4-B | 20 | 57,54 → 51,87 | passou |

### HTTP direto

Qualificadas 48 de 48 tentativas medidas. Inválidas ou não qualificadas 0. Aquecimentos válidos 165 e inválidos 0. Pares completos 4 de quatro. Benefício temporal não demonstrado pelo critério prático.

A teve 24 amostras válidas e 0 inválidas. B teve 24 válidas e 0 inválidas.

| Métrica (ms, salvo CV) | A | B |
| --- | ---: | ---: |
| Mediana | 52,85 | 48,77 |
| Média | 53,37 | 48,92 |
| Mínimo | 49,72 | 43,74 |
| Máximo | 60,49 | 54,23 |
| IQR | 3,67 | 3,64 |
| CV (%) | 5,30 | 6,05 |
| p75 | 54,58 | 51,48 |
| p90 | 57,25 | 52,53 |
| Mediana TTFB | 51,69 | 47,37 |

| Estatística do TTFB (ms, salvo CV) | A | B |
| --- | ---: | ---: |
| Mediana | 51,69 | 47,37 | — |
| Média | 52,15 | 47,68 | — |
| Mínimo | 48,54 | 42,69 | — |
| Máximo | 59,24 | 52,46 | — |
| IQR | 3,66 | 3,61 | — |
| CV (%) | 5,23 | 5,93 | — |
| p75 | 53,43 | 50,34 | — |
| p90 | 55,59 | 51,25 | — |

| Minibloco | Mediana | TTFB | Amostras |
| --- | ---: | ---: | ---: |
| P1-A | 52,30 | 50,94 | 6 |
| P1-B | 45,00 | 43,77 | 6 |
| P2-B | 52,49 | 51,19 | 6 |
| P2-A | 52,85 | 51,69 | 6 |
| P3-B | 48,71 | 47,37 | 6 |
| P3-A | 50,87 | 49,73 | 6 |
| P4-A | 56,10 | 54,70 | 6 |
| P4-B | 48,85 | 47,66 | 6 |

| Par | Ordem | Mediana A | Mediana B | B − A (ms) | B − A (%) | Δ TTFB (ms) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | A/B | 52,30 | 45,00 | -7,30 | -13,96 | -7,17 |
| 2 | B/A | 52,85 | 52,49 | -0,36 | -0,69 | -0,50 |
| 3 | B/A | 50,87 | 48,71 | -2,16 | -4,24 | -2,36 |
| 4 | A/B | 56,10 | 48,85 | -7,25 | -12,93 | -7,04 |

A diferença agregada B − A foi -4,08 ms (-7,73%). A mediana das diferenças entre pares foi -4,71 ms. Por ordem, A/B ficou em -7,28 ms e B/A em -1,26 ms.

As medianas dos blocos variaram de 50,87–56,10 ms em A e de 45,00–52,49 ms em B. A faixa das diferenças por par foi -7,30 a -0,36 ms.

### Playwright H

Qualificadas 32 de 32 tentativas medidas. Inválidas ou não qualificadas 0. Aquecimentos válidos 16 e inválidos 0. Pares completos 4 de quatro. Benefício temporal não demonstrado pelo critério prático.

A teve 16 amostras válidas e 0 inválidas. B teve 16 válidas e 0 inválidas.

| Métrica (ms, salvo CV) | A | B |
| --- | ---: | ---: |
| Mediana | 254,37 | 259,73 |
| Média | 251,90 | 260,24 |
| Mínimo | 232,64 | 231,36 |
| Máximo | 268,87 | 289,23 |
| IQR | 20,25 | 12,88 |
| CV (%) | 4,77 | 5,22 |
| p75 | 261,60 | 268,59 |
| p90 | 266,20 | 271,53 |
| Mediana TTFB | 54,39 | 51,82 |

No navegador, a mediana do GET inicial foi 61,57 ms em A e 78,71 ms em B.

| Estatística do TTFB (ms, salvo CV) | A | B |
| --- | ---: | ---: |
| Mediana | 54,39 | 51,82 | — |
| Média | 54,39 | 52,10 | — |
| Mínimo | 51,83 | 47,01 | — |
| Máximo | 57,63 | 55,16 | — |
| IQR | 1,91 | 3,23 | — |
| CV (%) | 2,70 | 4,27 | — |
| p75 | 55,24 | 54,14 | — |
| p90 | 55,89 | 54,74 | — |

| Minibloco | Mediana | TTFB | Amostras |
| --- | ---: | ---: | ---: |
| P1-A | 258,62 | 53,99 | 4 |
| P1-B | 258,13 | 50,48 | 4 |
| P2-B | 269,60 | 54,21 | 4 |
| P2-A | 260,34 | 55,17 | 4 |
| P3-B | 256,07 | 51,20 | 4 |
| P3-A | 247,42 | 53,35 | 4 |
| P4-A | 242,72 | 54,75 | 4 |
| P4-B | 264,03 | 52,69 | 4 |

| Par | Ordem | Mediana A | Mediana B | B − A (ms) | B − A (%) | Δ TTFB (ms) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | A/B | 258,62 | 258,13 | -0,50 | -0,19 | -3,51 |
| 2 | B/A | 260,34 | 269,60 | 9,26 | 3,56 | -0,97 |
| 3 | B/A | 247,42 | 256,07 | 8,65 | 3,50 | -2,15 |
| 4 | A/B | 242,72 | 264,03 | 21,31 | 8,78 | -2,06 |

A diferença agregada B − A foi 5,36 ms (2,11%). A mediana das diferenças entre pares foi 8,96 ms. Por ordem, A/B ficou em 10,41 ms e B/A em 8,96 ms.

As medianas dos blocos variaram de 242,72–260,34 ms em A e de 256,07–269,60 ms em B. A faixa das diferenças por par foi -0,50 a 21,31 ms.

Amostras HTTP [acervo local (attempts.ndjson)] · Amostras H [acervo local (browser.ndjson)] · Estatísticas HTTP [acervo local (statistics.json)] · Estatísticas H [acervo local (statistics-h.json)]

As distribuições descrevem tentativas qualificadas. Somente pares completos entram nos contrastes pareados. Caches do PostgreSQL/replay são compartilhados, e o guard fora da janela pode afetar seu estado. A deriva é visível nas diferenças por par. A mediana histórica de 270,76 ms da 4B6-A serve apenas de contexto, com origem e condições operacionais próprias. Os resultados acumulados não identificam o efeito temporal de uma alteração individual.

## Integridade e encerramento

As quatro diferenças HTTP favoreceram B, mas a mediana caiu 4,08 ms, abaixo do mínimo de 5 ms. A diferença foi maior nos blocos A/B que nos B/A, o que recomenda cautela na atribuição. Em H, a mediana subiu 5,36 ms, com B mais lento em três dos quatro pares. O último par teve aumento de 21,31 ms. O TTFB do navegador caiu nos quatro pares, portanto a direção de H não acompanhou a do TTFB. O aumento agregado de H ficou abaixo do critério prático de 10 ms e 5%. A evidência sustenta manter as melhorias estruturais, sem declarar aceleração da interface.

O guard preservou os dados de negócio, snapshots, sequências e hashes do v3. O login levou refresh_tokens de 26 a 27 e atualizou o limitador, com 3 linhas ao final. A verificação final confirmou a liberação das portas 18082 e 3001 e a preservação dos listeners originais.

Guard [acervo local (guard.ndjson)] · Estado final [acervo local (final.json)]

Ciclo de otimização do Feed encerrado nesta etapa. A decisão de manutenção distingue a melhoria no PostgreSQL dos resultados temporais.

## Próxima tela · Explorar Picks

A 4B6-B tem baseline de abertura direta em Recentes, com cinco itens e mediana de 239,88 ms, e do clique interno em Mais escolhidos, com 20 de 72 templates e mediana de 128,34 ms. O endpoint principal é GET /api/v1/picks-templates. A abertura também carrega /api/v1/users/me, /api/v1/users/me/picks-templates/view e /api/v1/users/me/picks/view. A seção semanal, a entrada interna no Explorar e busca visual ficaram fora desse recorte. Reutilizar o executor, as fixtures e os brutos da 4B6-B. A próxima ação é uma auditoria curta das seis chamadas na abertura de Recentes, mantendo as queries de ordenação visíveis para distinguir requisições com semânticas diferentes. 4B6-B e brutos [acervo local (04b6b-baseline-picks-templates.md)] · [Matriz consolidada 4B7](04b7-consolidacao-baselines.md)
