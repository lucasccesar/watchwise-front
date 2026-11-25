# 5Q4 — Consolidação da restauração leve da sessão

**Manter provisoriamente a restauração leve e encerrar este ciclo de gargalos compartilhados.** A 5Q3 comprovou nove leituras a menos na sessão e HTTP mais rápido nas três telas. O ganho prático em H foi demonstrado somente em Notificações. A decomposição do Feed não encontrou uma nova dependência bloqueante demonstrada. A próxima prioridade é avaliar a continuidade do projeto de desempenho com a evidência acumulada, sem escolher uma otimização especulativa.

## Evidência consolidada da 5Q3

Foram 160 observações válidas, sem invalidações. A sonda de sessão registrou 11 → 2 leituras e 1.099 → 280 bytes de JSON, redução de 819 bytes. B manteve a leitura de segurança e selecionou apenas as dez colunas de identidade. Saíram sete agregados de Diário e duas contagens de seguidores. Os GETs de tela apresentaram a mesma contagem de leituras e os mesmos bytes nas sondas. Com a sessão, as leituras acumuladas passaram de 37 → 28 no Feed, 22 → 13 em Notificações e 20 → 11 em Meus Picks. O total observado de GETs por abertura permaneceu 2, 3 e 3, respectivamente. O endpoint completo continuou disponível e os dez campos de sessão, cartões, ordem, paginação, fundo de Notificações e conteúdo do Pick passaram pelos validadores. O guard final confirmou a preservação dos dados, snapshots e sequências, com deltas autorizados de autenticação registrados à parte. Implementação 5Q2 [acervo local (05q2-otimizacao-restauracao-sessao.md)] · [Validação 5Q3](05q3-validacao-benchmark-restauracao-sessao.md) · Sondas SQL [acervo local (sql.ndjson)] · Guard final [acervo local (final.json)]

Todos os deltas são B − A. AB e BA são as medianas dos deltas dos pares de cada ordem.

| Cenário | Δ HTTP da sessão | Δ início do GET principal | Δ H | Δ H por ordem AB / BA |
|---|---:|---:|---:|---:|
| Feed | −17,31 ms (−61,18%) | +5,43 ms | +5,54 ms (+1,58%) | −8,47 / +5,13 ms |
| Notificações | −17,06 ms (−60,85%) | −31,30 ms | −18,47 ms (−6,53%) | −20,03 / −7,68 ms |
| Meus Picks | −16,95 ms (−60,63%) | −35,57 ms | −14,54 ms (−4,63%) | −16,06 / −24,79 ms |
| Detalhe de Pick, clique aquecido | — | +1,47 ms | +8,09 ms (+5,22%) | +7,84 / +6,30 ms |

O HTTP da sessão melhorou nos quatro pares de cada abertura. Notificações e Meus Picks anteciparam o GET principal nos quatro pares. Notificações atingiu 10 ms e 5% em H no agregado, com ganho nas duas ordens e um par de sinal contrário. Meus Picks melhorou H nos quatro pares e ficou aquém de 5% no agregado. O Feed teve sinais diferentes entre ordens tanto no início do GET principal quanto em H. O clique aquecido permaneceu sem GET de sessão nos 16 casos. Seu H piorou no agregado e nas duas ordens, mas ficou aquém de 10 ms e teve pares em sentidos opostos. Isso não demonstra equivalência temporal exata. O primeiro clique frio segue fora deste controle. Resultados por minibloco, par e ordem [acervo local (analysis.json)]

## O que aconteceu no Feed

O recálculo usou as 144 aberturas oficiais. Em cada amostra, a duração observada da sessão é seu fim menos seu início. O intervalo entre GETs é o início do GET principal menos o fim da sessão. A janela do GET principal é seu fim menos seu início. O trecho pós-resposta é H menos o fim observado do GET principal. As parcelas em sequência fecham H por amostra. A duração HTTP do Chromium foi mantida em coluna própria. O coletor registra o início e o fim pelos callbacks do Playwright e usa `responseEnd` da rede para a duração HTTP. Esses relógios descrevem marcos distintos. As medianas são resumos dos intervalos individuais e não são aditivas. Registros oficiais [acervo local (browser.ndjson)] · Coletor [acervo local (http.mjs)]

| Intervalo ou marco (ms) | Feed A → B | Notificações A → B | Meus Picks A → B |
|---|---:|---:|---:|
| Ação → início da sessão | 73,81 → 74,95 | 72,25 → 74,81 | 75,31 → 76,14 |
| Sessão pelos callbacks | 33,79 → 15,39 | 33,31 → 16,09 | 33,04 → 16,42 |
| Ação → fim observado da sessão | 110,03 → 90,69 | 106,65 → 91,21 | 108,75 → 92,77 |
| Fim da sessão → início do GET principal | 65,36 → 92,85 | 98,41 → 73,96 | 112,53 → 92,33 |
| Ação → início do GET principal | 179,38 → 184,81 | 200,47 → 169,17 | 220,94 → 185,38 |
| GET principal pelos callbacks | 82,22 → 82,09 | 22,99 → 58,52 | 29,74 → 50,14 |
| GET principal no Chromium | 93,64 → 115,55 | 67,71 → 40,39 | 91,16 → 75,34 |
| Fim observado do GET principal → H | 91,42 → 88,02 | 52,75 → 44,63 | 61,33 → 58,97 |

No Feed, a sessão acabou mais cedo e a janela até o próximo GET aumentou em três pares. Os quatro deltas dessa janela foram +26,57, +30,46, +33,75 e −11,34 ms, com +7,61 ms em AB e +32,10 ms em BA. Um marco anterior pode ampliar esse intervalo mesmo quando a operação seguinte permanece no mesmo instante. De fato, o início do GET do Feed teve deltas por par de +3,67, +12,00, +13,74 e −26,92 ms, com −11,63 ms em AB e +12,87 ms em BA. Notificações encurtou a janela entre GETs nos quatro pares. Meus Picks encurtou a janela no agregado, com sinais mistos por par, e antecipou o GET principal nos quatro.

Há também um sinal no HTTP do próprio Feed que merece registro. A duração no Chromium subiu +21,91 ms (+23,40%) no agregado, com +6,89 ms em AB e +31,03 ms em BA. O TTFB subiu apenas +0,41 ms, com sentidos opostos por ordem, e a janela de callbacks ficou perto do mesmo valor no agregado. A sonda do Feed manteve 26 leituras e 60.742 B em ambas as versões. Os brutos não conservam as marcas necessárias para isolar espera anterior ao envio, recebimento do corpo, transporte ou entrega do evento ao coletor. O sinal de duração HTTP não demonstra uma causa no backend, um novo bloqueio pré-GET nem regressão prática de H. [Tabela da 5Q3](05q3-validacao-benchmark-restauracao-sessao.md#feed)

O Feed fez apenas dois GETs nas 48 aberturas. O guard espera a identidade, o Router carrega layout e componente sob demanda, e `SocialComponent.ngOnInit → load → FeedApiService.getFeed` lê a sessão em memória e assina a chamada diretamente. O trecho não aguarda outro GET. O agrupamento dos cartões e a preparação do fundo ocorrem após a resposta. A configuração HTTP registra XSRF e não introduz uma cadeia de espera de aplicação nesse recorte. Em Notificações, o fundo começou antes ou junto do GET principal, e em Meus Picks o GET de templates começou depois do principal. Cada auxiliar sobrepôs o GET principal e terminou antes dele nas 48 aberturas de sua tela. Os brutos da 5Q3 observam a rede de API, mas não segmentam avaliação de módulos, ativação do Router e inicialização dos componentes. O diagnóstico anterior de ativação já documentou a sequência e a tentativa de preload. O ciclo individual do Feed permanece encerrado. Rotas [acervo local (app.routes.ts)] · Configuração HTTP [acervo local (app.config.ts)] · Feed [acervo local (social.component.ts)] · FeedApiService [acervo local (feed-api.service.ts)] · Meus Picks [acervo local (picks-my.component.ts)] · Notificações [acervo local (notifications.component.ts)] · Timeline anterior [acervo local (05b6-timeline-angular-feed.md)] · Preload anterior [acervo local (05b5-experimento-preload-seletivo.md)]

## Revisão das hipóteses compartilhadas

| Operação | Evidência e telas | Confiança, risco e evidência mínima para reconsiderar |
|---|---|---|
| Ativação após a sessão | O mesmo guard e layout precedem Feed, Notificações e Meus Picks. As janelas se comportaram de forma diferente entre telas, sem outro GET intermediário. | Alta para a sequência, baixa para redundância comum. Alterar ordem de ativação envolve o guard e o ciclo de vida. Reconsiderar apenas se os registros existentes identificarem a mesma dependência dispensável e a relação com H em pelo menos duas telas. |
| Preparação de cartões e confirmação de H após o GET | O trecho permanece mensurável nas três telas, com o maior tempo no Feed. `groupActivities` é próprio do Feed. As outras telas usam templates e estados distintos. O trecho também contém o tempo de parse e observação do predicado. | Baixa para atribuição a uma operação comum. Uma alteração poderia mudar a apresentação ou o marco observado. Exigir, em evidência existente, o mesmo processamento repetido dentro da janela crítica de pelo menos duas telas, sem redefinir H. |
| Montagem de mídia com cache aquecido | O Feed chama `assembleBasicMetadataWithKnownIds`, que pode resolver e aguardar metadados. Há caminhos de montagem de mídia em Notificações e no Detalhe de Pick. Replay zero e SQL estável não medem custo de coordenação ou hits em memória. Meus Picks já evita previews na listagem. | Alta para existência da montagem, baixa para redundância compartilhada que determine H. Risco de mudar idioma, imagem, estado ou fallback. Reconsiderar apenas com repetição da mesma resolução ou montagem comprovada nas sondas de duas telas, mantendo a saída dos cartões integralmente equivalente. |

A 5Q3 resolveu estruturalmente a primeira oportunidade da 5Q1. As duas restantes continuam sem atribuição causal. Os registros do Feed acrescentam um sinal a acompanhar, mas não identificam uma alteração isolável. Diagnóstico 5Q1 [acervo local (05q1-diagnostico-gargalos-compartilhados.md)] · Agrupamento do Feed [acervo local (social.component.ts)] · Assembler [acervo local (ContentCardAssembler.java)] · Montagem no Feed [acervo local (FeedServiceImpl.java)]

## Próxima prioridade e protocolo mínimo

**Avaliar a continuidade do projeto de desempenho.** Consolidar o estado das treze otimizações, a cobertura real e as limitações de representatividade. Comparar as pendências com a matriz, o uso esperado e o custo de validação. Encerrar o ciclo atual se essa revisão não revelar uma operação comum com trabalho evitável demonstrado, dependência de H em duas ou mais telas e contraste seguro. Só diante desse gatilho vale propor uma coleta curta, com duas telas representativas, mesmos dados, política de cache, autorizações e H, e critério de aceitação definido antes da execução. Esta entrega não seleciona uma nova mudança de código. [Matriz consolidada](04b7-matriz-cobertura.csv)

Os resultados descrevem três cenários de abertura direta com contexto novo de navegador e JVM aquecida no recorte sintético e um controle interno. São limiares práticos, sem inferência formal ou extrapolação às 39 telas. A 5Q4 analisou apenas registros preservados e código. Nenhum banco, login ou processo de aplicação foi acionado.
