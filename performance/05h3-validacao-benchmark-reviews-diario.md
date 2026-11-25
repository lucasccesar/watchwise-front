# Etapa 5H3 · Qualificação do resumo dedicado de Reviews

## Resultado final da 5H3

**Manter o resumo dedicado e encerrar o ciclo de Reviews.** Foram válidas as 48 aberturas e as 16 paginações oficiais. A mediana do GET do resumo caiu de **77,86 para 51,09 ms** (−26,77 ms, −34,38%), com o mesmo sentido em todos os pares. O tempo até conteúdo útil da abertura ficou em **271,94 → 273,18 ms** (+1,24 ms, +0,46%). O benefício HTTP do resumo foi demonstrado. A rodada não demonstrou aceleração perceptível da abertura nem regressão relevante na paginação.

### Causa identificada e evidências

A nova retenção preservou o JSON da Home que correspondia ao hash histórico e outro corpo reproduzido durante o aquecimento e a abertura diagnóstica de A. A diferença integral se limitou a **`/genreCountsMoviesLast30Days`**. `Comedy` e `Romance` trocaram de posição com contagem 2. `Family` e `Fantasy` trocaram de posição com contagem 1. Os membros e as contagens permaneceram iguais. A consulta existente usa `ORDER BY count DESC` sem desempate, permitindo essas permutações. O Angular da Home combina as contagens e exibe os seis primeiros gêneros. Os gêneros com posições alteradas ficaram abaixo desse corte na fixture, e a seleção e os valores do gráfico permaneceram iguais. Os sete campos de Reviews também ficaram iguais. Evidências originais [acervo local (divergences.ndjson)] · Comparação [acervo local (home-equivalence.json)] · Consulta [acervo local (DiaryEntryRepository.java)] · Gráfico da Home [acervo local (home.component.ts)]

A resposta exata da antiga tentativa descartada não pode ser recuperada. Ela continua inválida. Nesta retomada, foram registradas 151 observações do JSON da Home, incluindo ciclos de aquecimento e a série final, com somente as duas variantes reproduzidas. O auxiliar registrou endpoint, versão, fase e amostra, hashes integrais, caminhos e valores divergentes e os corpos sintéticos necessários. Dados da sessão ficaram restritos a hashes e a retenção ocorreu após a janela de H. Hashes observados [acervo local (home-hashes.ndjson)] · Diferenças retidas [acervo local (divergences.ndjson)]

### Critérios e qualificação

O controle da Home foi executado separadamente, fora das aberturas oficiais, com um GET da rota legada em cada versão. Ambos retornaram 200 e 4.586 bytes. Foram comparados todos os campos. A única diferença aceita foi a permutação comprovada de gêneros de filme empatados, preservando o conjunto, as contagens, a ordenação não crescente e os mesmos itens e valores do gráfico. Os demais valores e arrays foram comparados integralmente. Durante a coleta, o auxiliar manteve a detecção de qualquer outra variação fora da janela de H. Controle da Home [acervo local (home-control.ndjson)] · Critérios fixados antes da série [acervo local (official-criteria.json)]

O controle de Reviews exigiu equivalência dos sete campos, do JSON integral da listagem, dos IDs, da ordem, da paginação e do conteúdo renderizado. As cinco aberturas diagnósticas por versão passaram, incluindo a primeira abertura A já concluída na execução anterior desta retomada. A primeira paginação diagnóstica A foi descartada porque o auxiliar ainda exigia zero chamadas ao replay nesse trecho. Ela fez exatamente as quatro resoluções de filme da segunda página já observadas em A e B no diagnóstico estrutural. Antes da coleta oficial, a regra passou a exigir zero chamadas na abertura e aceitar na página 2 somente zero chamadas ou o conjunto exato dessas quatro chaves, com resposta 200. A paginação e o filtro foram então qualificados nos dois lados, sem alterar o método H. Qualificação inicial [acervo local (browser.ndjson)] · Qualificação concluída [acervo local (qualification.json)] · Jornadas [acervo local (browser.ndjson)]

### Coleta oficial

Foram concluídos os quatro pares A/B, B/A, B/A e A/B, sem reposições. Houve 16 aquecimentos de navegador e 16 aberturas de preparação da paginação, separados das 48 aberturas e 16 paginações oficiais. Seis JVMs estabilizaram em 20 ciclos e duas em 25. As 64 observações oficiais foram válidas, sem GETs duplicados, erros de API ou exceções JavaScript. Protocolo [acervo local (protocol.json)] · Aquecimento [acervo local (warm.ndjson)] · Análise por minibloco [acervo local (analysis.json)]

Tempos em ms. A página 2 tem quatro observações por versão em cada condição de cache de mídia.

| Cenário e métrica | A mediana | A IQR | B mediana | B IQR | B − A | Diferença % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Abertura · resumo | 77,86 | 5,59 | 51,09 | 4,88 | -26,77 | -34,38 |
| Abertura · TTFB do resumo | 44,56 | 6,47 | 17,28 | 1,54 | -27,28 | -61,23 |
| Abertura · listagem | 73,49 | 4,75 | 72,96 | 6,09 | -0,53 | -0,72 |
| Abertura · TTFB da listagem | 39,67 | 4,01 | 38,67 | 3,47 | -1,00 | -2,52 |
| Abertura · H | 271,94 | 14,24 | 273,17 | 13,13 | 1,24 | 0,46 |
| Página 2 com replay · GET | 45,92 | 12,82 | 49,49 | 4,19 | 3,57 | 7,79 |
| Página 2 com replay · H | 85,91 | 18,64 | 90,71 | 4,60 | 4,80 | 5,59 |
| Página 2 com cache · GET | 41,26 | 3,40 | 39,45 | 3,38 | -1,81 | -4,39 |
| Página 2 com cache · H | 88,27 | 8,40 | 78,95 | 6,27 | -9,32 | -10,56 |

| Cenário e métrica | Par 1 A/B | Par 2 B/A | Par 3 B/A | Par 4 A/B | Mediana dos pares | Ordem A/B | Ordem B/A |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Abertura · resumo | -34,48 | -23,02 | -29,61 | -23,98 | -26,79 | -29,23 | -26,31 |
| Abertura · TTFB do resumo | -31,58 | -24,58 | -29,41 | -25,73 | -27,57 | -28,66 | -26,99 |
| Abertura · listagem | -6,16 | 1,52 | -2,88 | 3,01 | -0,68 | -1,57 | -0,68 |
| Abertura · TTFB da listagem | -1,42 | 0,23 | -2,72 | 0,97 | -0,60 | -0,23 | -1,25 |
| Abertura · H | -18,68 | 11,22 | -4,44 | 3,75 | -0,35 | -7,46 | 3,39 |
| Página 2 com replay · GET | -43,56 | 2,53 | 16,46 | 3,39 | 2,96 | -20,09 | 9,50 |
| Página 2 com replay · H | -40,62 | 6,97 | 10,09 | -0,49 | 3,24 | -20,55 | 8,53 |
| Página 2 com cache · GET | -3,12 | -4,74 | -0,81 | 1,12 | -1,96 | -1,00 | -2,78 |
| Página 2 com cache · H | -9,31 | -13,90 | -14,37 | -4,74 | -11,60 | -7,02 | -14,13 |

### Caminho crítico e replay

O resumo passou de última resposta em **24/24 aberturas A para 0/24 B**. O término mediano do resumo em relação à listagem passou de **+4,20 para −22,90 ms**. A listagem passou a limitar a conclusão da primeira onda, e a mediana do GET da listagem variou apenas −0,53 ms. O resumo atendeu ao limiar de −5 ms e −5%, com consistência nas duas ordens. H ficou longe do limiar de −10 ms e −5% e os deltas mudaram de sentido entre as ordens.

O corpo total dos três GETs da abertura passou de 33.669 para 29.289 bytes. A abertura aquecida fez **zero chamadas ao replay no resumo, zero na lista e zero no total**, em A e B. Na página 2, a primeira resolução das quatro chaves e o acesso seguinte sem replay ocorreram igualmente nas duas versões, com um GET de listagem por clique. As diferenças nos dois recortes de paginação ficaram exploratórias e não demonstraram regressão relevante ou ganho consistente acima dos limiares. O diagnóstico frio anterior continua sendo a evidência de que três chamadas passaram do resumo para a primeira página, com o total da jornada inalterado. Nesta retomada, não houve um experimento específico com JVM fria. Os tempos do replay local não representam o TMDB real.

### Integridade, decisão e próxima prioridade

Os guards de retomada registraram 5 operações na primeira execução e 122 na conclusão. As únicas alterações persistentes foram as operacionais do login normal, com `refresh_tokens` de 34 para 35 e depois 36 linhas. O limitador permaneceu com três linhas e mudou de hash após os logins. Os fingerprints corroboram a preservação dos dados de negócio, das credenciais já provisionadas, dos snapshots, das sequências e dos quatro artefatos. O v3 e o banco em 15432 ficaram fora das operações. As portas temporárias 8082 e 3001 foram liberadas. PostgreSQL e replay continuam ativos. Guard da primeira execução [acervo local (final.json)] · Guard da execução final [acervo local (guard.ndjson)] · Estado final [acervo local (final.json)]

A otimização fica mantida pela equivalência funcional, pelo benefício HTTP e pela redução de 19 para 6 leituras SQL do resumo já demonstrada. O ciclo de Reviews fica encerrado com o efeito sobre H medido abaixo do limiar prático.

**Próxima prioridade sugerida — Watchlist.** A matriz registra cobertura aquecida histórica e um diagnóstico de 276 chamadas ao replay na primeira página fria. É uma oportunidade estrutural de maior escala. O cenário frio ainda depende de uma forma autorizada de controlar snapshots e escritas. A 5I não foi iniciada. [Matriz](04b7-matriz-cobertura.csv) · [Diagnóstico e pendências](04b7-consolidacao-baselines.md)

## Retomada após autorização

**Credencial provisionada. Validação funcional e estrutural concluída no recorte diagnóstico. Coleta oficial interrompida.** O novo resumo passou de 19 para 6 leituras SQL e de 4.586 para 206 bytes. O JSON integral da Home variou na primeira abertura oficial de A, apesar de os sete campos de Reviews e o JSON completo da listagem permanecerem iguais. A tentativa foi invalidada e a série ficou sem amostras válidas. A decisão permanece **manter provisoriamente**.

### Credencial e preservação

O guard inicial coincidiu com o estado final da inspeção anterior. O v4 foi confirmado em `127.0.0.1:15433`. A identidade de `wwb3reviews1` coincidiu com o UUID determinístico da fixture, domínio reservado de teste, perfil privado e 38 resenhas marcadas. A credencial foi gerada com 32 bytes aleatórios e codificada com BCrypt custo 12 pelo helper existente. O segredo ficou em CLIXML protegido por DPAPI no diretório local ignorado. A transação calculou previamente o fingerprint esperado de `users` com a mudança de uma única coluna. O guard confirmou exatamente esse fingerprint, com uma linha afetada, contagens iguais e todas as outras tabelas e sequências intactas. Identidade sintética [acervo local (identity.json)] · Delta autorizado [acervo local (provision-result.json)]

O login normal retornou HTTP 200, verificou a identidade e permitiu reutilizar a mesma sessão em memória nos dois JARs. As duas rotas de resumo retornaram HTTP 401 sem sessão. Como operações do login, `refresh_tokens` passou de 33 para 34 linhas e `shared_limiter_state` manteve três linhas, com mudança de hash. Esses deltas foram registrados separadamente do provisionamento. Os 30 guards do executor registraram únicamente essas duas alterações operacionais. Uma operação foi sinalizada como inválida pela asserção do JSON da Home, sem divergência de dados. O guard final coincidiu com o diário das permissões operacionais e confirmou o hash dos usuários após provisionamento, os snapshots e os quatro artefatos. Nenhum outro database foi acessado. Autenticação [acervo local (authentication.json)] · Guard [acervo local (guard.ndjson)] · Estado final [acervo local (final.json)]

### Equivalência e cobertura

Foram usados os pares de JARs já qualificados e Angular controlado, na mesma origem `http://localhost:3001`, com API temporária em `127.0.0.1:8082`. Os três GETs de Reviews em A e B retornaram 15 + 15 + 8 resenhas, total 38, com igualdade integral de JSON, IDs, ordem e paginação. O resumo dedicado retornou as mesmas sete propriedades funcionais que a Home. Foram observados 4.508 minutos de filme, 38 reproduções, 19 filmes distintos, zero minutos de episódio, zero episódios, zero séries e fundo nulo. O fallback foi preservado nesse cenário. Fundo não nulo permanece verificado pelos testes locais da 5H2. A rota legada executada em B devolveu o mesmo JSON integral que a referência diagnóstica de A.

A qualificação completou cinco aberturas por versão, uma paginação e um filtro de filmes por versão. O conteúdo apareceu na ordem esperada, sem erros de API ou JavaScript. O método H manteve o contrato histórico. Após a marca de H, a validação checou a listagem integral, os sete campos, o texto renderizado, links e controles. O replay respondeu 200 para todas as 19 referências de filme nas passagens diagnósticas, em ambos os lados. Qualificação [acervo local (qualification.json)] · Observações brutas [acervo local (browser.ndjson)] · Autorização HTTP [acervo local (access.ndjson)]

### SQL, bytes e trabalho deslocado

As operações foram feitas sequencialmente por versão em JVM nova, com logging SQL isolado da janela temporizada. O resumo foi seguido pelas páginas 1, 2 e 3. Os números são das chamadas diagnósticas observadas.

| Operação | Leituras SQL A → B | Corpo JSON A → B | GETs de filme ao replay A → B |
| --- | ---: | ---: | ---: |
| Resumo | 19 → 6 | 4.586 → 206 B | 4 → 1 |
| Reviews, página 1 | 17 → 17 | 28.119 → 28.119 B | 11 → 14 |
| Reviews, página 2 | 17 → 17 | 28.176 → 28.176 B | 4 → 4 |
| Reviews, página 3 | 16 → 16 | 15.050 → 15.050 B | 0 → 0 |

O resumo dedicado conservou as leituras da sessão e do alvo, o agregado dos seis totais, a seleção e leitura do último item e uma consulta de catálogo do driver PostgreSQL. No resumo antigo apareceram ainda próximos episódios, leituras associadas a watchlist e calendário, agregados diários e de gênero, Feed, cartazes, companhias e notificações. Duas das 19 leituras de A eram do catálogo do driver. Excluindo essa classe, as leituras foram de 17 para 5. A Home legada em B foi observada também após a paginação, com 18 leituras e zero novas chamadas ao replay sob cache já aquecido. SQL e replay [acervo local (sql.ndjson)]

No diagnóstico frio, três resoluções deixaram o resumo e apareceram na primeira página. Resumo mais página 1 somaram 15 chamadas ao replay em cada versão. A passagem pelas três páginas somou 19 em cada versão. O trabalho deslocado não retornou na paginação. As chamadas observadas não medem invocações Java que acertaram o cache. O diagnóstico sequencial confirma o deslocamento nesse estado inicial, sem estimar a duração com requisições concorrentes ou TMDB real.

### Interrupção da coleta e próxima ação

A qualificação nos dois artefatos foi concluída. O primeiro minibloco A estabilizou o aquecimento da JVM em 20 ciclos, com 48,64 e 45,49 ms nas duas janelas finais e tolerância de 5 ms. Os dois aquecimentos de navegador passaram. Na primeira abertura oficial, a resposta da Home retornou HTTP 200 e manteve o mesmo tamanho de transporte observado nos aquecimentos. O comparador íntegro, que ordena chaves mas preserva ordem de arrays, detectou diferença no JSON. O resumo projetado e o JSON de Reviews mantiveram os hashes da qualificação. O guard passou e a coleta parou conforme a regra definida, sem reposição ou flexibilização do validador.

O corpo integral divergente não foi retido pelo executor, portanto o campo exato não foi identificado. Uma verificação posterior, somente leitura e com o guard aprovado, encontrou quatro grupos de gêneros empatados na janela da Home. A consulta existente usa `ORDER BY count DESC` sem desempate. Essa é uma fonte plausível de variação de ordem em campo fora dos sete campos de Reviews, sem evidência de que explique a tentativa descartada. Nenhum SQL de produção foi alterado. Falha registrada [acervo local (failure.json)] · Empates verificados [acervo local (genre-order-diagnostic.json)] · Consulta de gêneros [acervo local (DiaryEntryRepository.java)]

**Resultado oficial:** 0/48 aberturas válidas, uma abertura inválida, 0/16 paginações medidas e nenhum par completo. Não há mediana A/B, diferença por ordem ou resultado oficial de latência. Os diagnósticos e aquecimentos ficaram fora das distribuições. Para retomar, a ação mais curta é capturar em diagnóstico limitado os dois corpos sintéticos da Home antes da asserção e localizar a diferença por campo, mantendo a comparação integral. A coleta só deve recomeçar se a estabilidade estiver demonstrada ou a causa for resolvida sob autorização específica. A 5I ficou fora da execução. Aquecimento [acervo local (warm.ndjson)] · Análise [acervo local (analysis.json)]

As portas temporárias ficaram livres e os serviços PostgreSQL e replay permaneceram ativos. O registro anterior do bloqueio de autenticação permanece abaixo.

## Histórico da qualificação anterior à autorização

**Coleta bloqueada pela autenticação da persona populada.** O v4 tem 38 resenhas na conta sintética B3, sem credencial ativa. A única conta documentada como autorizada no v4 tem zero resenhas. Os artefatos históricos conferem e foi produzido um par Angular sob condições iguais de compilação. Nenhuma medição oficial ou diagnóstica do endpoint foi iniciada.

## Artefatos e diferença de hash

| Artefato | SHA-256 |
| --- | --- |
| JAR A [acervo local (A.jar)] | `59357e0116bbe61111d2dde69f64a508bc626c9d8e944abef059301c9aac9b6a` |
| JAR B [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | `517c9f35df9df4ffe547f17f6a2c40434c694fa2fe7d83ec2720bbd781969901` |
| Angular A aprovado na 5G3 [acervo local (browser)] | `f54ff1ede314165c51695253a4cfd5d2c1c2cf6faae5185708d30a899adcc5b5` |
| Angular B da 5H2 [acervo local (browser)] | `cfad6a997859d8f10393bbda816737a171bb4c04d37d8e42c0190d32b57f44a5` |
| Angular A controlado [acervo local (browser)] | `5e9ccaa9ff28f9d0e1089c2cb2922666f9193fb0f23707564d26672b90d03ed7` |
| Angular B controlado [acervo local (browser)] | `5061e30298ee77d7758794e5b16cbc86d6ca9f4c5490ad4054d27eb1fca69af7` |

Os quatro hashes da 5H2 foram reconfirmados. O JAR A corresponde ao B aprovado na 5G3. A comparação por entrada entre os JARs aponta somente o delta de Summary e o POM interno. A inspeção dos chunks confirma que o Angular A histórico chama o resumo da Home em Reviews e que B inclui a chamada ao resumo dedicado. Ambos mantêm a operação da Home. [5G3](05g3-validacao-benchmark-seguidores-seguindo.md) · 5H2 [acervo local (05h2-otimizacao-resumo-reviews-diario.md)] · Comparação dos JARs [acervo local (jar-comparison.json)] · Auditoria Angular [acervo local (artifact-audit.json)]

O A histórico e a recompilação de conferência da 5H2 divergem em 42 nomes de chunks JavaScript e no `index.html`. CSS e arquivos estáticos permaneceram iguais. Foram observadas diferenças no encadeamento dos imports e nos aliases dos módulos. O novo A controlado reproduziu byte a byte o hash da recompilação de conferência. O padrão não é explicado por timestamps e os registros históricos não contêm metadados suficientes para provar a causa exata da diferença de empacotamento.

A árvore de fontes da conferência da 5H2 e a árvore atual diferem somente em `diary-api.service.ts` e `diary.component.ts`. O par controlado compilou A a partir daquela árvore e B trocando apenas os dois arquivos, no mesmo diretório, em produção e com as mesmas dependências. Foram conferidos os arquivos de configuração e o lockfile. O comando usou Node 24.17.0, npm 11.13.0, Angular CLI/build 22.2.5, TypeScript 6.0.3, UTC e um worker. A inspeção estática confirmou o resumo anterior no A controlado e o dedicado no B, com a Home presente nos dois. Os pares históricos foram preservados. Para atribuir latência à otimização, a recomendação é usar JAR A com Angular A controlado e JAR B com Angular B controlado, após a qualificação autenticada no navegador. Configuração e hashes [acervo local (controlled-builds.json)] · Contratos compilados [acervo local (controlled-contracts.json)]

## Conta, replay e guards

O container original estava saudável e publicado em `127.0.0.1:15433`. O replay estava ativo em `127.0.0.1:18091`, com o catálogo histórico validado por SHA-256. A consulta da 5H3 identificou `watchwise_benchmark_exec_v4` e confirmou `transaction_read_only=on`. Ela reproduziu os filtros de elegibilidade da rota de Reviews sem selecionar dados de autenticação ou conteúdo de comentários. Ambiente [acervo local (environment.json)] · SQL de qualificação [acervo local (qualification.sql)]

| Persona sintética | Acesso documentado no v4 | Resenhas elegíveis | Candidato a fundo |
| --- | --- | ---: | --- |
| `wwhyb1001` | Conta autorizada no provisionamento do v4 | 0 | Sim |
| `wwb3reviews1` | Credencial herdada desabilitada no provisionamento | 38, todas de filme, em 19 mídias distintas | Sim |

A ausência de massa própria na conta autorizada impede a abertura populada e a paginação. A rota usa o ID da sessão, e a persona B3 é privada. Os 19 filmes da fixture foram atendidos pelo replay no smoke histórico. A cobertura de metadados do cenário autenticado ainda precisa ser comprovada no v4. Consulta agregada [acervo local (account-qualification.json)] · Linhagem e credenciais [acervo local (04b1-contas-sociais.md)] · Smoke histórico [acervo local (03c-fixtures-reviews-progresso.md)]

Os guards inicial e final confirmaram o v4 e as mesmas 54 tabelas e sequências, incluindo snapshots e tabelas operacionais. O guard inicial coincidiu com o estado final da 5G3. A primeira consulta agregada falhou por alias SQL ausente, ainda em modo somente leitura, e o guard após a falha também passou. Após corrigir o alias, a consulta foi concluída e verificada. Nenhuma credencial foi carregada ou alterada. Nenhuma API ou frontend foi iniciado. Os processos originais mantiveram seu estado, com PostgreSQL e replay ativos. O v3, o banco original e o TMDB real não foram acessados. Guard inicial [acervo local (guard-before.json)] · Guard final [acervo local (guard-after.json)] · Comparação [acervo local (integrity.json)]

## Validação pendente e decisão

- **Equivalência, SQL real e payload.** Pendente no PostgreSQL. A 5H2 demonstrou em testes locais a equivalência dos seis totais e imagem e a redução de 830/826 para 222 bytes nas duas fixtures. As leituras SQL dos endpoints e o payload em execução ainda não foram medidos. Validação local [acervo local (05h2-otimizacao-resumo-reviews-diario.md)]
- **Estabilidade e A/B.** Zero aberturas diagnósticas e zero amostras oficiais. A 4A permanece apenas como referência histórica. A matriz registra a 5H3 como bloqueada. Baseline 4A [acervo local (04a-baseline-parcial.md)] · [Matriz](04b7-matriz-cobertura.csv)
- **Custos deslocados.** Pendente verificar se a lista ou a paginação passa a resolver mídia que antes era aquecida pelo resumo da Home. Comparar as chamadas de replay e os tempos por trecho durante a execução futura.
- **Decisão.** Manter provisoriamente a implementação até a validação de equivalência, redução real de trabalho e desempenho. O ciclo de Reviews continua aberto.

A autorização mínima pendente é **provisionar uma credencial sintética nova e exclusiva para `wwb3reviews1` somente no `watchwise_benchmark_exec_v4`**. O provisionamento deve preservar as 38 resenhas, a privacidade da conta e as outras contas. As credenciais e tokens herdados continuam desativados. A credencial nova deve ficar no armazenamento protegido já adotado pelo benchmark, com a alteração operacional registrada por guards. Depois é possível retomar a qualificação autenticada dos pares e o protocolo balanceado já definido para a 5H3.
