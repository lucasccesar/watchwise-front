# 5Q3 — Validação integrada da restauração leve da sessão

**Manter provisoriamente.** 160 de 160 observações oficiais válidas. O PostgreSQL registrou 11 → 2 leituras na restauração. Ganho prático em H: Notificações. Nenhuma piora prática em H demonstrada.

## Artefatos e ambiente

- A · JAR `e90e1c8b7d82012dc4b54878e6ae9cbb7fceb67cbc419a73c0b2fab5c04a50ac` · Angular `dbca8c2a9f9c01e2456a6991454831b5d10a54fbdb80347a226baa1e8e2faa89`
- B · JAR `9ab82116504885a307dbc364351ef81beee908154420e2826d02c8bf21fe78ed` · Angular `53c7109b3d56e90f493419482058a5b990b5344ec996a65c9efa2bf3b51bf055`

Os hashes foram confrontados com os artefatos de 5Q2. A usou a leitura completa e B a projeção de identidade. Os pares correspondentes preservam as doze otimizações anteriores. A persona wwhyb1001 é a mesma do v4 usada para Feed, Notificações e Meus Picks na 5N2. O destino foi o v4 em 127.0.0.1:15433, replay histórico em 127.0.0.1:18091, API temporária 8082 e proxy localhost:3001. O catálogo foi conferido e o miss respondeu localmente. O inventário de liberação tinha 0 snapshots válidos e 64 vencidos. As leituras do recorte aquecido foram qualificadas com o estado existente, com JDBC somente leitura após o login. Ambiente [acervo local (environment.json)] · 5Q2 [acervo local (05q2-otimizacao-restauracao-sessao.md)]

## Equivalência e protocolo

A e B reutilizaram a mesma sessão emitida fora das medições em contextos novos, sem a identidade Angular em memória. A qualificação comparou os dez campos e verificou o GET completo separadamente. A leitura anônima foi rejeitada. Os validadores históricos conferiram cartões, ordenação, paginação, conteúdo de Pick e fundo de Notificações. O clique aquecido reutilizou o documento, e qualquer GET de sessão nesse cenário invalida a tentativa. O controle não cobre o primeiro clique frio. Os testes de revogação e refresh do 5Q2 complementam o recorte atual.

A coleta planejou AB, BA, BA, AB, dois aquecimentos e seis aberturas por tela por minibloco, com dois cliques internos a partir das aberturas medidas de Meus Picks. O primeiro ciclo da JVM preparou detalhe e comentários e o primeiro aquecimento de navegador de Picks exercitou o clique. A JVM passou por 15 a 30 ciclos com estabilidade nas últimas duas janelas de cinco, tolerância max(5 ms, 10%) e replay zero nessas janelas. 8 gates aprovados. Qualquer observação inválida interrompe a execução sem reposição. Protocolo [acervo local (protocol.json)] · Aquecimento [acervo local (warm-gates.ndjson)]

## SQL observado e corpos sem compressão

| Recorte | A leituras / bytes | B leituras / bytes |
|---|---:|---:|
| Sessão | 11 / 1099 | 2 / 280 |
| Feed · abertura acumulada | 37 / 61841 | 28 / 61022 |
| Notificações · abertura acumulada | 22 / 16648 | 13 / 15829 |
| Meus Picks · abertura acumulada | 20 / 5741 | 11 / 4922 |

O acumulado soma contagens e bytes da sonda de sessão e dos GETs de tela, sem somar latências. Nos dois lados há leitura da versão e invalidação da sessão. Em A, também há entidade do usuário, sete agregados de diário e duas contagens de seguidores. Em B, há uma projeção com as dez colunas de identidade, sem os nove agregados ou carga de relacionamentos. Sondas SQL [acervo local (sql.ndjson)]

## Feed

48 válidas, 0 inválidas e 0 não executadas.

| Métrica | Mediana A → B | Δ absoluto | Δ % | IQR A / B | Δ por par | Δ AB / BA |
|---|---:|---:|---:|---:|---:|---:|
| H | 350,99 → 356,53 | 5,54 | 1,58 | 28,73 / 43,35 | 1,80 / 6,69 / 3,56 / -18,74 | -8,47 / 5,13 |
| GET de sessão | 28,29 → 10,98 | -17,31 | -61,18 | 2,41 / 0,97 | -16,47 / -18,12 / -17,46 / -16,10 | -16,28 / -17,79 |
| TTFB da sessão | 24,92 → 7,30 | -17,62 | -70,70 | 1,79 / 0,99 | -16,85 / -17,74 / -18,20 / -15,76 | -16,31 / -17,97 |
| Início da sessão GET | 73,81 → 74,96 | 1,14 | 1,55 | 8,79 / 6,44 | 2,72 / -2,57 / -4,00 / -0,44 | 1,14 / -3,28 |
| Fim observado da sessão GET | 110,04 → 90,69 | -19,35 | -17,58 | 10,38 / 8,06 | -15,95 / -21,26 / -22,08 / -16,76 | -16,36 / -21,67 |
| Fim da sessão → início do GET principal | 65,36 → 92,85 | 27,50 | 42,08 | 25,16 / 13,70 | 26,57 / 30,46 / 33,75 / -11,34 | 7,61 / 32,10 |
| Início do GET principal | 179,38 → 184,81 | 5,43 | 3,02 | 17,09 / 27,23 | 3,67 / 12,00 / 13,74 / -26,92 | -11,63 / 12,87 |
| GET principal | 93,64 → 115,55 | 21,91 | 23,40 | 20,69 / 13,14 | 22,22 / 31,69 / 30,37 / -8,45 | 6,89 / 31,03 |
| TTFB do GET principal | 75,73 → 76,14 | 0,41 | 0,54 | 8,98 / 6,88 | 3,89 / -0,46 / -4,24 / 1,86 | 2,87 / -2,35 |
| Corpo de sessão (bytes) | 1.111,00 → 292,00 | -819,00 | -73,72 | 0,00 / 0,00 | -819,00 / -819,00 / -819,00 / -819,00 | -819,00 / -819,00 |
| Corpos HTTP (bytes) | 61.956,00 → 61.144,00 | -812,00 | -1,31 | 7,00 / 7,00 | -815,50 / -815,50 / -819,00 / -815,50 | -815,50 / -817,25 |
| GETs | 2,00 → 2,00 | 0,00 | 0,00 | 0,00 / 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |

| Par | Ordem | H A / B (ms) | GET sessão A / B (ms) | Início GET principal A / B (ms) |
|---:|---|---:|---:|---:|
| 1 | AB | 365,22 / 367,02 | 28,13 / 11,66 | 182,97 / 186,64 |
| 2 | BA | 356,06 / 362,75 | 28,74 / 10,62 | 180,62 / 192,63 |
| 3 | BA | 364,62 / 368,18 | 28,60 / 11,14 | 177,60 / 191,34 |
| 4 | AB | 340,55 / 321,81 | 26,75 / 10,65 | 183,94 / 157,02 |

| Par | Ordem | H A / B (ms) | GET sessão A / B (ms) | Início GET principal A / B (ms) |
|---:|---|---:|---:|---:|
| 1 | AB | 365,22 / 367,02 | 28,13 / 11,66 | 182,97 / 186,64 |
| 2 | BA | 356,06 / 362,75 | 28,74 / 10,62 | 180,62 / 192,63 |
| 3 | BA | 364,62 / 368,18 | 28,60 / 11,14 | 177,60 / 191,34 |
| 4 | AB | 340,55 / 321,81 | 26,75 / 10,65 | 183,94 / 157,02 |

## Notificações

48 válidas, 0 inválidas e 0 não executadas.

| Métrica | Mediana A → B | Δ absoluto | Δ % | IQR A / B | Δ por par | Δ AB / BA |
|---|---:|---:|---:|---:|---:|---:|
| H | 282,66 → 264,19 | -18,47 | -6,53 | 13,36 / 24,28 | -20,67 / 0,82 / -16,19 / -19,39 | -20,03 / -7,68 |
| GET de sessão | 28,03 → 10,97 | -17,06 | -60,85 | 3,34 / 1,68 | -18,22 / -14,60 / -15,21 / -18,13 | -18,18 / -14,90 |
| TTFB da sessão | 24,47 → 7,38 | -17,09 | -69,85 | 2,39 / 1,26 | -18,24 / -15,46 / -15,64 / -17,57 | -17,91 / -15,55 |
| Início da sessão GET | 72,25 → 74,82 | 2,57 | 3,56 | 5,28 / 6,82 | -2,54 / 8,88 / 1,33 / 1,10 | -0,72 / 5,10 |
| Fim observado da sessão GET | 106,65 → 91,21 | -15,44 | -14,47 | 6,93 / 8,53 | -19,19 / -5,80 / -14,16 / -18,06 | -18,62 / -9,98 |
| Fim da sessão → início do GET principal | 98,41 → 73,96 | -24,45 | -24,85 | 7,17 / 27,08 | -15,44 / -22,91 / -26,30 / -30,22 | -22,83 / -24,60 |
| Início do GET principal | 200,47 → 169,17 | -31,30 | -15,61 | 14,71 / 26,83 | -33,17 / -27,35 / -37,84 / -45,80 | -39,48 / -32,59 |
| GET principal | 67,71 → 40,39 | -27,32 | -40,34 | 8,32 / 29,54 | -12,90 / -27,38 / -27,07 / -29,91 | -21,41 / -27,23 |
| TTFB do GET principal | 16,33 → 17,49 | 1,16 | 7,11 | 1,51 / 3,18 | 2,22 / 2,48 / 0,00 / -0,77 | 0,72 / 1,24 |
| Corpo de sessão (bytes) | 1.111,00 → 292,00 | -819,00 | -73,72 | 0,00 / 0,00 | -819,00 / -819,00 / -819,00 / -819,00 | -819,00 / -819,00 |
| Corpos HTTP (bytes) | 16.699,00 → 15.880,00 | -819,00 | -4,90 | 0,00 / 0,00 | -819,00 / -819,00 / -819,00 / -819,00 | -819,00 / -819,00 |
| GETs | 3,00 → 3,00 | 0,00 | 0,00 | 0,00 / 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |

| Par | Ordem | H A / B (ms) | GET sessão A / B (ms) | Início GET principal A / B (ms) |
|---:|---|---:|---:|---:|
| 1 | AB | 287,09 / 266,41 | 29,14 / 10,91 | 208,33 / 175,16 |
| 2 | BA | 284,74 / 285,56 | 26,90 / 12,30 | 200,26 / 172,92 |
| 3 | BA | 273,27 / 257,08 | 25,80 / 10,59 | 194,87 / 157,03 |
| 4 | AB | 276,45 / 257,06 | 28,83 / 10,70 | 201,64 / 155,84 |

| Par | Ordem | H A / B (ms) | GET sessão A / B (ms) | Início GET principal A / B (ms) |
|---:|---|---:|---:|---:|
| 1 | AB | 287,09 / 266,41 | 29,14 / 10,91 | 208,33 / 175,16 |
| 2 | BA | 284,74 / 285,56 | 26,90 / 12,30 | 200,26 / 172,92 |
| 3 | BA | 273,27 / 257,08 | 25,80 / 10,59 | 194,87 / 157,03 |
| 4 | AB | 276,45 / 257,06 | 28,83 / 10,70 | 201,64 / 155,84 |

## Meus Picks

48 válidas, 0 inválidas e 0 não executadas.

| Métrica | Mediana A → B | Δ absoluto | Δ % | IQR A / B | Δ por par | Δ AB / BA |
|---|---:|---:|---:|---:|---:|---:|
| H | 313,77 → 299,23 | -14,54 | -4,63 | 21,05 / 29,84 | -7,08 / -13,06 / -36,52 / -25,05 | -16,06 / -24,79 |
| GET de sessão | 27,96 → 11,01 | -16,95 | -60,63 | 1,49 / 0,98 | -17,77 / -15,92 / -17,22 / -17,41 | -17,59 / -16,57 |
| TTFB da sessão | 24,42 → 7,62 | -16,79 | -68,78 | 1,35 / 1,12 | -17,18 / -15,81 / -16,60 / -17,24 | -17,21 / -16,20 |
| Início da sessão GET | 75,31 → 76,14 | 0,83 | 1,10 | 5,11 / 8,29 | -0,04 / 1,88 / 2,88 / -2,05 | -1,05 / 2,38 |
| Fim observado da sessão GET | 108,75 → 92,77 | -15,98 | -14,69 | 6,10 / 7,78 | -16,52 / -14,03 / -14,10 / -18,93 | -17,73 / -14,06 |
| Fim da sessão → início do GET principal | 112,54 → 92,33 | -20,21 | -17,95 | 9,15 / 47,07 | 3,42 / 5,48 / -53,84 / -39,06 | -17,82 / -24,18 |
| Início do GET principal | 220,94 → 185,38 | -35,57 | -16,10 | 15,41 / 54,33 | -12,23 / -7,13 / -71,35 / -55,88 | -34,05 / -39,24 |
| GET principal | 91,16 → 75,34 | -15,82 | -17,36 | 7,13 / 47,04 | -1,06 / 3,14 / -46,45 / -39,20 | -20,13 / -21,65 |
| TTFB do GET principal | 21,59 → 21,01 | -0,58 | -2,67 | 5,27 / 3,19 | -0,71 / -1,17 / -0,67 / 0,16 | -0,28 / -0,92 |
| Corpo de sessão (bytes) | 1.111,00 → 292,00 | -819,00 | -73,72 | 0,00 / 0,00 | -819,00 / -819,00 / -819,00 / -819,00 | -819,00 / -819,00 |
| Corpos HTTP (bytes) | 5.764,00 → 4.945,00 | -819,00 | -14,21 | 0,00 / 0,00 | -819,00 / -819,00 / -819,00 / -819,00 | -819,00 / -819,00 |
| GETs | 3,00 → 3,00 | 0,00 | 0,00 | 0,00 / 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |

| Par | Ordem | H A / B (ms) | GET sessão A / B (ms) | Início GET principal A / B (ms) |
|---:|---|---:|---:|---:|
| 1 | AB | 322,38 / 315,29 | 28,73 / 10,96 | 227,06 / 214,83 |
| 2 | BA | 320,12 / 307,05 | 27,02 / 11,10 | 220,94 / 213,81 |
| 3 | BA | 329,13 / 292,61 | 28,56 / 11,34 | 236,15 / 164,80 |
| 4 | AB | 299,81 / 274,77 | 27,90 / 10,49 | 212,66 / 156,79 |

| Par | Ordem | H A / B (ms) | GET sessão A / B (ms) | Início GET principal A / B (ms) |
|---:|---|---:|---:|---:|
| 1 | AB | 322,38 / 315,29 | 28,73 / 10,96 | 227,06 / 214,83 |
| 2 | BA | 320,12 / 307,05 | 27,02 / 11,10 | 220,94 / 213,81 |
| 3 | BA | 329,13 / 292,61 | 28,56 / 11,34 | 236,15 / 164,80 |
| 4 | AB | 299,81 / 274,77 | 27,90 / 10,49 | 212,66 / 156,79 |

## Detalhe de Pick

16 válidas, 0 inválidas e 0 não executadas.

| Métrica | Mediana A → B | Δ absoluto | Δ % | IQR A / B | Δ por par | Δ AB / BA |
|---|---:|---:|---:|---:|---:|---:|
| H | 154,95 → 163,03 | 8,09 | 5,22 | 12,22 / 21,81 | 20,04 / 18,02 / -5,42 / -4,36 | 7,84 / 6,30 |
| Início do GET principal | 87,61 → 89,08 | 1,47 | 1,67 | 9,85 / 16,86 | 12,24 / 9,74 / -8,94 / -6,27 | 2,98 / 0,40 |
| GET principal | 41,68 → 46,56 | 4,88 | 11,70 | 2,33 / 2,63 | 6,83 / 6,10 / 3,79 / 0,65 | 3,74 / 4,94 |
| TTFB do GET principal | 31,64 → 34,61 | 2,97 | 9,38 | 1,97 / 0,57 | 2,30 / 3,52 / 1,62 / 1,13 | 1,72 / 2,57 |
| Corpos HTTP (bytes) | 2.387,00 → 2.387,00 | 0,00 | 0,00 | 0,00 / 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |
| GETs | 2,00 → 2,00 | 0,00 | 0,00 | 0,00 / 0,00 | 0,00 / 0,00 / 0,00 / 0,00 | 0,00 / 0,00 |

| Par | Ordem | H A / B (ms) | GET sessão A / B (ms) | Início GET principal A / B (ms) |
|---:|---|---:|---:|---:|
| 1 | AB | 163,04 / 183,08 | — | 91,48 / 103,71 |
| 2 | BA | 149,92 / 167,94 | — | 82,66 / 92,41 |
| 3 | BA | 167,69 / 162,27 | — | 96,55 / 87,61 |
| 4 | AB | 151,35 / 146,99 | — | 87,50 / 81,23 |

| Par | Ordem | H A / B (ms) | GET sessão A / B (ms) | Início GET principal A / B (ms) |
|---:|---|---:|---:|---:|
| 1 | AB | 163,04 / 183,08 | — | 91,48 / 103,71 |
| 2 | BA | 149,92 / 167,94 | — | 82,66 / 92,41 |
| 3 | BA | 167,69 / 162,27 | — | 96,55 / 87,61 |
| 4 | AB | 151,35 / 146,99 | — | 87,50 / 81,23 |

### Leitura dos resultados

- **Feed** · Sessão -17,31 ms (-61,18%), atingiu o critério prático. Início do GET principal 5,43 ms (3,02%), sem atingir critério prático e consistência. H 5,54 ms (1,58%), sem atingir critério prático e consistência.
- **Notificações** · Sessão -17,06 ms (-60,85%), atingiu o critério prático. Início do GET principal -31,30 ms (-15,61%), atingiu o critério prático. H -18,47 ms (-6,53%), atingiu o critério prático.
- **Meus Picks** · Sessão -16,95 ms (-60,63%), atingiu o critério prático. Início do GET principal -35,57 ms (-16,10%), atingiu o critério prático. H -14,54 ms (-4,63%), sem atingir critério prático e consistência.
- **Detalhe de Pick** · Sem GET de sessão. H 8,09 ms (5,22%), sem atingir critério prático e consistência.

Os intervalos são calculados dentro de cada observação. O relógio dos callbacks e as marcas HTTP do Chromium permanecem separados. Os limiares práticos são 5 ms e 5% para HTTP e 10 ms e 5% para H, com mesmo sentido em AB e BA. A análise cobre três telas em abertura direta, sem extrapolar para a aplicação inteira. Brutos [acervo local (browser.ndjson)] · Observações, distribuições e medianas por minibloco [acervo local (analysis.json)]

## Integridade e decisão

Guard final aprovado. 445 registros de guard. O login autorizado alterou refresh_tokens de 49 para 50 e o limitador manteve 3 linhas. Os dados de negócio, snapshots e sequências foram preservados pelo guard. Os serviços PostgreSQL e replay permaneceram ativos. Encerramento [acervo local (final.json)] · Guards [acervo local (guard.ndjson)] · Deltas operacionais [acervo local (operational.ndjson)]

A classificação distingue economia estrutural, H, latência de sessão e controle interno. A conclusão temporal usa apenas a coleta qualificada. A 5Q4 fica fora desta entrega.
