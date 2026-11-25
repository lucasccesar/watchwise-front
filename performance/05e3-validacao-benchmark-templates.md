# Etapa 5E3 · Benchmark da antecipação das opções de Templates

**Manter provisoriamente.** A antecipação de rede foi confirmada. A mediana descritiva de H do detalhe variou 2,02 ms (1,43%) nas poucas amostras com equivalência. A equivalência instável deixou os quatro pares de detalhe incompletos. O efeito em H continua inconclusivo.

## Artefatos e ambiente

| Artefato | SHA-256 |
| --- | --- |
| Angular A [acervo local (browser)] | `6556c71bd86d6e0c450c75e4b6052116a6d94ba36974fa041a2767693ab6d5c8` |
| Angular B [acervo local (browser)] | `5c289425391ec98c6447c6b4c1aa0a8d7fecbcac01fbcb7e410fde915ea68c3f` |
| JAR compartilhado [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | `169952931b31c629ecc0256e0eec6fb0ebf0b0b07dffb73031d8a714083ec790` |

Os hashes correspondem à 5E2. O build A também corresponde ao Angular final da 5D3. A auditoria de proveniência da 5E2 restringe o diff de código ao componente de detalhe e seus testes. Os arquivos estáticos coincidem. Os chunks JavaScript recompilados têm hashes e conteúdo gerado diferentes, inclusive por compartilhamento e minificação. A e B usaram o mesmo JAR validado na 5D3, que mantém as quatro otimizações anteriores.

Uma JVM ficou ativa na porta 18082 durante toda a comparação, com JDBC exclusivo em v4 na porta 15433 e TMDB apontado ao replay local 18091. Um servidor estático temporário foi alternado por minibloco em `http://localhost:3001`, sempre com o mesmo proxy. O Chromium 159.0.8154.6 foi aberto por minibloco, com contexto novo por amostra, sessão sintética em memória reutilizada, service worker bloqueado e cache HTTP desabilitado pela interceptação. O navegador só teve acesso HTTP à origem local. A resposta de referência ausente do replay foi 404 local. Migrations, seeds, rotinas agendadas e observação SQL/Hibernate ficaram desativadas.

## Equivalência e protocolo

A qualificação confirmou HTTP 401 sem sessão e verificou o principal do login. Cada build exibiu o mesmo template e categorias, 20 opções visuais de 24 disponíveis, os mesmos 10 Picks da comunidade e a mesma ordem. As respostas de API foram comparadas por hash de conteúdo e a projeção do DOM por título, categorias, links, rótulos, opções e ordem. O catálogo confirmou 20 de 72 cartões, com a mesma ordenação, e o fluxo interno começou após seu carregamento. Os GETs e parâmetros foram validados por operação, incluindo a ausência de chamadas duplicadas. Os testes locais da 5E2 complementam falhas e cancelamento. A paginação do recorte continua limitada a 20 opções.

Cada ciclo de aquecimento HTTP começou pelo catálogo e executou as quatro leituras iniciais do detalhe com opções encadeadas ao template. O aquecimento foi aprovado em 15 ciclos. As duas janelas finais de cinco tiveram medianas de 77,11 e 71,81 ms para tolerância de 7,71 ms. Foram exigidos pelo menos 15 ciclos, com extensão de cinco até 30 e ausência de replay nas duas últimas janelas.
Foram executadas as ordens A/B, B/A, B/A e A/B, sem reiniciar o backend entre os blocos. Foram executados 16 aquecimentos de navegador. Dois passaram na checagem de equivalência usada para marcar aquecimentos válidos. As aberturas do catálogo que prepararam o clique ficaram fora das estatísticas. A 4B6-B registrou 182,88 ms para detalhe e 238,54 ms para catálogo. Essas referências históricas não entram nas diferenças A/B desta rodada.

## Resultados observados

### Equivalência instável nas navegações medidas

O critério prévio de igualdade do conteúdo descartou 41 de 48 detalhes (21 de A e 20 de B). A assinatura composta abrange os JSONs e a projeção visual. As quatro assinaturas apareceram nos dois builds, incluindo duas projeções de opções. Os brutos guardam os hashes, mas não os valores individuais, portanto não distinguem troca de identidade, ordem ou metadados. A consulta paginada FIXED não explicita ordenação, uma hipótese a conferir se a variabilidade precisar ser corrigida. A rodada não prova a causa nem uma regressão específica de B.

Em análise diagnóstica separada, os eventos de rede das 48 tentativas permanecem interpretáveis. Todas tiveram cinco GETs, 20 opções renderizadas, zero chamadas ao replay e zero erros capturados. A sobreposição aconteceu em 1/24 de A e 23/24 de B. O intervalo mediano do fim do detalhe até o início das opções foi 4,21 ms em A e 0,19 ms em B. Esses dados confirmam o mecanismo de antecipação. As amostras inválidas ficaram fora das estatísticas de H, dos pares e da tabela abaixo.

### Amostras válidas

| Métrica, mediana onde aplicável | A | B | B − A |
| --- | ---: | ---: | ---: |
| Detalhe → início das opções (ms) | 4,52 | 0,18 | -4,34 |
| Comunidade → início das opções (ms) | 0,50 | -3,88 | -4,38 |
| Sobreposição opções/comunidade (ms) | 0,00 | 3,88 | 3,88 |
| Até a conclusão das opções (ms) | 134,99 | 133,94 | -1,05 |
| H, detalhe (ms) | 141,42 | 143,44 | 2,02 |
| GETs, detalhe | 5,00 | 5,00 | 0,00 |
| Bytes dos corpos HTTP, detalhe | 56010,00 | 56010,00 | 0,00 |
| Opções renderizadas | 20,00 | 20,00 | 0,00 |
| Duração do detalhe HTTP (ms) | 25,01 | 25,15 | 0,14 |
| Duração da comunidade HTTP (ms) | 27,45 | 27,46 | 0,02 |
| Duração das opções HTTP (ms) | 14,33 | 14,81 | 0,48 |
| TTFB do detalhe (ms) | 18,93 | 17,38 | -1,55 |
| TTFB da comunidade (ms) | 20,43 | 19,36 | -1,07 |
| TTFB das opções (ms) | 12,35 | 12,28 | -0,07 |
| Último término das opções → H (ms) | 3,61 | 7,22 | 3,61 |
| H, abertura direta do catálogo (ms) | 204,22 | 209,63 | 5,41 |
| GETs, catálogo | 3,00 | 3,00 | 0,00 |
| Bytes dos corpos HTTP, catálogo | 12634,00 | 12634,00 | 0,00 |
| Navegações com início de opções antes do término da comunidade | 0/3 (0,0%) | 4/4 (100,0%) | 100,0 p.p. |
| Equivalência funcional | Aprovada na qualificação | Aprovada na qualificação | Instável na coleta nos dois builds |

O início e o término dos GETs foram observados nos eventos de rede do Chromium na mesma base temporal de cada operação. A sobreposição soma a união dos intervalos das opções que intersectam a janela da comunidade; durações concorrentes não são adicionadas. O término de rede não mede o momento em que o Angular processou a resposta. H continua sendo o predicado histórico do DOM.
As opções foram a última resposta em 3/3 detalhes de A e 4/4 de B. O equilíbrio entre a janela de rede, o processamento e a confirmação de H impede atribuir todo o tempo remanescente à renderização. A duração e o TTFB de cada GET estão na tabela para verificar possíveis efeitos da concorrência.

| Recorte | Versão | Válidas | Média H | Mediana H | Mín. | Máx. | IQR | CV (%) | p75 | p90 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Detalhe interno | A | 3 | 142,12 | 141,42 | 138,60 | 146,33 | 3,87 | 2,75 | 143,88 | 145,35 |
| Detalhe interno | B | 4 | 142,57 | 143,44 | 135,86 | 147,53 | 5,96 | 3,61 | 145,99 | 146,91 |
| Catálogo direto | A | 8 | 211,35 | 204,22 | 202,08 | 228,59 | 18,42 | 5,37 | 221,75 | 226,10 |
| Catálogo direto | B | 8 | 213,43 | 209,63 | 204,12 | 229,80 | 11,05 | 4,40 | 217,92 | 226,62 |

| Recorte | Par | Ordem | A válidas / H | B válidas / H | B − A |
| --- | ---: | --- | ---: | ---: | ---: |
| Detalhe interno | 1 | A/B | 3 / 141,42 | 4 / 143,44 | — |
| Detalhe interno | 2 | B/A | 0 / — | 0 / — | — |
| Detalhe interno | 3 | B/A | 0 / — | 0 / — | — |
| Detalhe interno | 4 | A/B | 0 / — | 0 / — | — |
| Catálogo direto | 1 | A/B | 2 / 216,38 | 2 / 211,23 | -5,15 |
| Catálogo direto | 2 | B/A | 2 / 214,65 | 2 / 209,63 | -5,01 |
| Catálogo direto | 3 | B/A | 2 / 202,98 | 2 / 227,53 | 24,55 |
| Catálogo direto | 4 | A/B | 2 / 211,37 | 2 / 205,31 | -6,06 |

O detalhe ficou sem pares completos, o que impede estimar uma diferença pareada ou sua consistência por ordem. No catálogo, a mediana das diferenças dos quatro pares foi −5,08 ms. A mediana agregada variou +5,41 ms (+2,65%). Três pares favoreceram B e um mostrou aumento de 24,55 ms. O controle exploratório não mostrou uma piora consistente.
Em 48 detalhes e 16 catálogos planejados, foram registradas 48 e 16 tentativas medidas, com 41 e 0 inválidas, respectivamente. As inválidas ficam nos brutos e nenhum bloco foi repetido para suprir perdas.

## Integridade e próxima ação

Foram registradas 84 operações no guard. O v3 conservou os hashes e as sequências. No v4, as alterações permitidas ficaram em `refresh_tokens`, `shared_limiter_state`. Os dados de negócio e snapshots permaneceram iguais. A API e os servidores temporários encerraram e as portas foram liberadas. PostgreSQL e replay histórico permanecem em execução.

O agrupamento de opções brutas por categoria e o reuso das categorias em memória reduziriam leituras no detalhe bruto. O recorte medido usa uma categoria fixa ativa e essa hipótese não elimina diretamente o GET visual. A evidência atual não justifica pagar o custo e o risco de alterar o assembler e a ordem dos DTOs para buscar um ganho de H nesse recorte. **Próxima ação recomendada: encerrar o ciclo de Templates e passar a Notificações**, conforme a prioridade consolidada da 4B7.

Qualificação e dados brutos [acervo local (20261124T115544626Z)] · Análise agregada [acervo local (analysis.json)] · Executor [acervo local (experiment.mjs)] · 5E2 [acervo local (05e2-otimizacao-carregamento-opcoes-templates.md)] · 5E1 [acervo local (05e1-diagnostico-templates.md)] · [5D3](05d3-validacao-benchmark-explorar-picks.md) · [5C12](05c12-benchmark-acumulado-otimizacoes-feed.md) · [Matriz 4B7](04b7-matriz-cobertura.csv)
