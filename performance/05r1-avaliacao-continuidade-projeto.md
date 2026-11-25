# 5R1 — Avaliação de continuidade do projeto de desempenho

**Decisão D — encerrar temporariamente o projeto de desempenho e preservar as 13 otimizações.** O trabalho demonstrou reduções de consultas, colunas, payload e chamadas, além de ganhos práticos em H em recortes específicos. A próxima intervenção ainda carece de uma hipótese sustentada sobre o caminho crítico ou de uma necessidade operacional clara. A pausa preserva oito decisões de manutenção definitiva no escopo avaliado e cinco provisórias. Os critérios abaixo permitem retomar por evidência, sem transformar lacunas de cobertura em obrigação de coleta.

## Balanço das treze otimizações

As linhas seguem os IDs de implementação da 5N1, sem contar de novo efeitos combinados ou cenários de controle. A 13ª alteração foi validada separadamente na 5Q3. Cada resultado vale para a métrica, operação e condições indicadas. Os 120 registros válidos da 5N2 medem o conjunto de doze alterações, com diferenças de empacotamento Angular. Os 160 da 5Q3 medem o contraste específico de sessão. Inventário 5N1 [acervo local (05n1-consolidacao-otimizacoes.csv)] · [Benchmark acumulado 5N2](05n2-benchmark-acumulado.md#fechamento-da-5n2-após-a-retomada) · [5Q3](05q3-validacao-benchmark-restauracao-sessao.md)

| # | Otimização | Benefício demonstrado e ressalva | Decisão |
|---:|---|---|---|
| 1 | Feed · projeção de previews | 22 → 5 colunas no lote, mesmos 65 previews e mesmo JSON. GET direto −0,60 ms, abaixo do limiar. H não isolado. | Manter |
| 2 | Feed · categorias de Picks em lote | Dois lotes → um, 40 → 20 ocorrências no recorte e contrato preservado. Aquecimento interrompeu a coleta temporal individual. | Manter |
| 3 | Feed · reuso de IDs internos | Lote de resolução 1 → 0 para quatro coordenadas. Evidência de sonda, sem latência isolada. As três mudanças juntas mantiveram H perto da referência, sem ganho prático. | Manter |
| 4 | Explorar Picks e Explorar templates · totais | Cabeçalho 18 → 3 leituras, 2.422 → 36 B e um GET a menos. A janela dos totais melhorou especialmente no controle de navegação, que compara duas chamadas com uma. H permaneceu abaixo do limiar. | Manter |
| 5 | Detalhe de template · antecipar opções | Sobreposição com comunidade em 1/24 → 23/24 tentativas. Sete detalhes válidos, sem par completo. As requisições ficaram concorrentes, com efeito em H inconclusivo e instabilidade de conteúdo sem causa comprovada. | Manter provisoriamente |
| 6 | Meus Picks · projeção da listagem | GET paginado 16 → 7 leituras, 22.704 → 4.561 B. A melhora agregada do GET não passou a consistência adotada na 5F3. A 5F4 observou primeiro clique frio mais lento, apesar de o replay da jornada cair de 4 → 1. O controle aquecido não cobre esse custo. | Manter provisoriamente |
| 7 | Seguidores e Seguindo · projeção paginada | 27 → 7 colunas, cinco leituras e DTOs equivalentes. Ganhos HTTP e H abaixo dos limiares práticos individuais. | Manter |
| 8 | Reviews do diário · resumo dedicado | Resumo 19 → 6 leituras e 4.586 → 206 B, GET 77,86 → 51,09 ms em condição aquecida. H não melhorou de forma prática. Na sonda fria, três resoluções foram deslocadas do resumo para a primeira página, total de 15 em ambos. | Manter |
| 9 | Watchlist · eliminar GET auxiliar de gêneros | A abertura individual foi de três para dois GETs e de 54 para 21 leituras na sonda. H caiu 425,68 → 387,69 ms, com melhora repetida no acumulado. O GET principal de abertura piorou e o filtro Action mostrou regressão acumulada em HTTP e H. O menu passou ao GET principal. A 5O3 não reproduziu regressão prática do filtro em HTTP direto aquecido. Snapshots frios ficaram fora. | Manter provisoriamente, investigação suspensa |
| 10 | Histórico do Diário · reusar resumo | Resumo 17 → 5 leituras e GET 76,82 → 54,73 ms. A timeline continuou crítica. H de abertura não melhorou e a página 2 teve piora descritiva abaixo do limiar absoluto. | Manter |
| 11 | Notificações · leitura dedicada do fundo | Fundo 43 → 5 leituras e GET 112,79 → 28,49 ms na avaliação individual, com confirmação no acumulado. A escolha do fundo padrão adiantou, sem ganho prático de H atribuível a esta mudança. A sonda fria reduziu replay de 4 → 1. Fundo personalizado validado apenas em testes controlados. | Manter provisoriamente, ressalva do fundo personalizado |
| 12 | Detalhe de lista · médias após recorte | Candidatos de 48 → 30/18 na primeira e segunda página. Jornada 65 → 64 leituras, ordenação por nota preservada. Parte do cálculo ocorre quando a página seguinte é pedida, com redução líquida no percurso. Pioras acumuladas em GET e H não foram reproduzidas como regressão prática de H ao variar o Angular com JAR compartilhado na 5P2. Séries com agenda incompleta ficaram em UNKNOWN no replay. | Manter, investigação encerrada |
| 13 | Restauração leve da sessão | 11 → 2 leituras, 1.099 → 280 B e cerca de 17 ms a menos no GET de sessão nas três telas. GET principal adiantou em Notificações e Meus Picks. H teve ganho prático apenas em Notificações (−18,47 ms, −6,53%). Feed sem ganho, Meus Picks abaixo de 5% e clique aquecido abaixo do limiar de regressão, sem GET de sessão. | Manter provisoriamente |

A série acumulada mostrou piora em Detalhe de lista e no filtro Watchlist, junto com melhora na abertura da Watchlist. A 5P2 não reproduziu uma regressão prática de abertura no contraste isolado dos dois builds com JAR compartilhado, e a 5O3 delimitou o filtro à condição HTTP direta aquecida. Esses recortes deixam espaço para efeitos em outras condições. A 5Q4 também reteve a piora da duração HTTP do GET principal do Feed no Chromium, sem aumento comparável de TTFB nem atraso consistente de H. Os registros não demonstraram outro GET bloqueante nem atribuíram essa diferença ao backend. 5N3 [acervo local (05n3-avaliacao-estrategica-proximas-prioridades.md)] · [5O3](05o3-comparacao-http-direta-watchlist.md) · [5P2](05p2-comparacao-builds-angular-detalhe-lista.md) · [5Q4](05q4-consolidacao-restauracao-sessao.md)

## Cobertura das 39 telas

A unidade é o ID das linhas de inventário na matriz. Baseline histórica significa uma combinação classificada como baseline, sem contar validações 3B, sondas, comparações A/B ou as sínteses estratégicas como novas baselines. O estado histórico do inventário pode anteceder as qualificações, como em Watchlist, Diário e Detalhe de lista. Para o estado de investigação valem os fechamentos das etapas posteriores. [Matriz](04b7-matriz-cobertura.csv) · [Consolidação das baselines](04b7-consolidacao-baselines.md) · Cobertura 5N3 [acervo local (05n3-avaliacao-estrategica-proximas-prioridades.md)]

- **10 telas com baseline histórica em 16 combinações.** Feed, Seguidores, Seguindo, Reviews do diário, Notificações, Meus Picks, Detalhe de Pick, Explorar Picks, Explorar templates e Detalhe de template. As outras 29 não têm baseline histórica nessa classificação.
- **15 investigadas, 13 com observações A/B válidas em algum recorte.** Às dez acima somam-se Watchlist, Diário e Detalhe de lista, mais Progresso e Progresso da lista, cujas investigações foram suspensas na qualificação. A 5Q3 acrescentou observações em telas já incluídas nesses conjuntos. Detalhe de template tem válidas sem pares completos.
- **12 receberam alteração direta em seu caminho de tela**, considerando os dois fluxos de Explorar que usam os totais próprios e Seguidores/Seguindo em separado. São as 13 telas com A/B menos Detalhe de Pick, que figura como controle da projeção de Meus Picks e da sessão. A alteração compartilhada da sessão foi validada em três desses alvos. Rotas que usam o mesmo guard podem se beneficiar, com desempenho ainda não medido.
- **12 investigações encerradas**, incluindo Detalhe de Pick como controle e Detalhe de lista após a 5P2. **Três suspensas**: Watchlist após a 5O3, Progresso e Progresso da lista pelos gates de mutação e snapshots. Encerramento de investigação e manutenção provisória são decisões distintas.
- **24 sem investigação específica neste ciclo.** Início, Perfil, Calendário, Em alta, Detalhe filme, Detalhe série, Temporada, Episódio, Detalhe de review/registro, Minhas listas, Descobrir listas, Criar lista, Editar lista, Configurações, Preencher Pick, Criar template, Importar template, Login, Cadastro, Recuperação de senha, Termos, Privacidade, Diretrizes e Ajuda/contato. Algumas já têm verificação funcional histórica ou cenários parciais.

### Triagem de possíveis ciclos futuros

Frequência é tratada abaixo como potencial decorrente do papel da tela na jornada. A matriz não traz telemetria de uso que permita ranquear acessos.

| Tela | Motivo para considerar | Viabilidade e condição de entrada |
|---|---|---|
| Início | Entrada autenticada, com resumo e cartões enriquecidos. Os controles de gêneros da Home na 5N2 mostraram empate no limite do gráfico. Esse é um requisito de estabilidade, sem prova de custo para H da Home. | Qualificar persona, estado do cartão e saída estável sem flexibilizar equivalência. Começar somente se houver sinal de lentidão ou prioridade de produto. |
| Perfil | Hub de identidade, relações e resumo. Acesso potencial na própria conta e a partir de outros usuários. Volume e permissões variam com o titular. | Fixar perfil próprio e, se necessário, um perfil alheio com visibilidade conhecida. A matriz registra configuração/validação pendente. |
| Calendário | Tela com janela temporal, dependências de catálogo e atualidade de agendas. Mudanças de mês podem alterar volume e comportamento. | Fixar mês e evento, qualificar dados e verificar que a leitura não depende de reconciliação que altere o recorte. |
| Minhas listas | Ponto de entrada para uma operação recorrente de organização. Pode exigir paginação e previews. As listas históricas de 90/268 itens caracterizam o conteúdo após a entrada, sem medir volume ou velocidade da listagem. | Conservar o ciclo de Detalhe de lista encerrado. Qualificar quantidade e composição de listas por persona, ordem e paginação antes de considerar o recorte. |
| Detalhe filme | Destino possível de vários cartões. A cobertura controlada depende de catálogo e composição do detalhe, além de dados locais da persona. | Primeiro qualificar um título representativo com replay integral para a jornada proposta. Falta evidência de que essa dependência hoje limite H em uso real. |

A triagem deixa páginas legais e formulários sem submissão em prioridade menor. O catálogo incompleto e as fixtures ainda pendentes elevam o custo de qualificação de outras jornadas. [Inventário de rotas](rotas.csv) · [Lacunas de cobertura](04b7-consolidacao-baselines.md)

## Questões de capacidade e representatividade

| Questão | O que a evidência cobre | Lacuna |
|---|---|---|
| Usuários simultâneos, throughput e saturação | Execuções sequenciais e sondas por operação. A concorrência de algumas requisições de uma página foi observada. | Não houve comparação controlada sob múltiplos usuários, vazão no ponto de saturação ou curva de erros. |
| CPU, memória e pool | Limites do ambiente local conhecidos e checagens instantâneas de capacidade. Janelas de aquecimento qualificaram estabilidade local. | Não houve avaliação comparativa de CPU, RSS, GC, espera e exaustão do pool em regime concorrente. |
| Escalabilidade PostgreSQL | Sondas de SQL e tamanho dos lotes sustentam economias estruturais. | Crescimento de custo com cardinalidade, distribuição de dados, pressão de I/O e planos sob carga ficaram sem validação. |
| Coleções extensas | Watchlist com 276 entradas e filtro de 13, lista de 48 na série e listas históricas de 90/268 em validações parciais. | A curva de custo por volume e a cobertura temporal sistemática de coleções grandes permanecem pendentes. |
| Snapshots frios e mídia | Replay controlado, alguns primeiros cliques e sondas frias. A 5F4 caracterizou trabalho deslocado. Progresso e Progresso da lista esbarraram em reconciliação e integridade. | Sem série geral para snapshots ausentes ou vencidos, regeneração concorrente e condições de cache misto. A latência do replay não estima TMDB real. |
| Rede e produção | Chromium, proxy e PostgreSQL locais, em condições comparáveis por rodada. | Sem validação em rede representativa, sob variabilidade externa ou distribuição real de tráfego. P95 de amostras pequenas continua exploratório. |

A comparação entre rodadas depende de artefatos, jogos de dados, perfis, cache e condição de rede. Os percentuais locais não foram somados nem extrapolados. [Limitações das baselines](04b7-consolidacao-baselines.md) · [Controle frio de Picks](05f4-validacao-primeiro-clique-meus-picks.md) · Qualificação de Progresso [acervo local (05k1-diagnostico-progresso.md)]

## Estratégias comparadas

| Estratégia | Benefício e evidência que justificaria | Dependências e riscos | Complexidade, custo relativo e limite |
|---|---|---|---|
| **A · Investigar telas ainda não avaliadas** | Pode encontrar um gargalo em uma jornada central. A matriz identifica candidatos, mas não registra deterioração ou dependência dominante em nenhum novo candidato. | Persona, fluxo, fixture e catálogo estáveis, além de critério de utilidade verificável. Risco de investir em cobertura sem sinal de impacto. | Média, custo médio por tela. Continuaria restrita a cenários selecionados e não responderia sobre capacidade. |
| **B · Carga concorrente e escalabilidade** | Responderia sobre throughput, filas, CPU, memória, pool e comportamento SQL. Vale diante de previsão de volume, saturação ou necessidade de dimensionamento com metas explícitas. | Instância isolada e autorizada, massa sintética, perfis de carga, métricas e limites de interrupção. Contenção do host pode mascarar a causa. | Alta, custo alto. Os resultados valem para o mix e recursos testados. Banco original e ambientes reais ficam fora sem isolamento e autorização próprios. |
| **C · Condições próximas da produção** | Ajudaria a validar impacto de rede, caches e dependências, inclusive a materialidade de custos frios já observados. Vale se houver divergência documentada entre uso e benchmark. | Ambiente isolado representativo, dados sintéticos, orçamento de dependências e política de acesso. Risco de atribuir variação externa ao código. | Alta, custo alto. Sem perfis reais confiáveis, o ambiente ainda é uma aproximação. |
| **D · Pausar e retomar por evidência** | Preserva os ganhos e evita uma nova rodada motivada apenas por falta de cobertura. Coerente com o fechamento 5Q4 e com os recortes da 5O3 e 5P2. | Manter decisões, referências e ressalvas rastreáveis. Risco de surgirem problemas sem sinal disponível, ou de os artefatos perderem representatividade. | Baixa, menor custo imediato. Questões de capacidade e condições externas permanecem abertas. |

## Condições para retomar

Preservar as 13 mudanças, com as cinco ressalvas provisórias registradas no balanço. Retomar somente quando houver pelo menos um dos seguintes gatilhos:

1. **Regressão ou incidente reproduzível em jornada relevante.** Comparação equivalente com degradação que exceda o orçamento da jornada, ou, na falta de orçamento, os critérios históricos de 10 ms e 5% para H ou 5 ms e 5% para HTTP. Exigir direção consistente entre ordens quando houver A/B, equivalência funcional e um intervalo que oriente a investigação.
2. **Mudança material de volume ou requisito de capacidade.** Meta explícita de usuários concorrentes, throughput ou latência, ou evidência recorrente de saturação, espera no pool ou erros. A coleta futura depende de ambiente isolado, carga sintética e autorização própria.
3. **Divergência entre prática e replay.** Evidência de que cache frio, catálogo, rede ou dependência externa explicam degradação recorrente em jornada importante. Fixar o cenário e a métrica antes de escolher uma comparação representativa.
4. **Nova evidência estrutural no caminho crítico.** Trabalho redundante demonstrável, com hipótese isolável e ganho esperado em uma jornada importante ou em pelo menos duas telas para uma intervenção compartilhada. Para as ressalvas já documentadas, exigir evidência específica, como estabilidade recuperada do detalhe de Templates ou impacto recorrente do primeiro clique frio.

Qualquer retomada começa pela triagem documental do gatilho e pela definição de sucesso, equivalência e interrupção. A 5R1 termina com a recomendação de pausa. Nenhum teste novo foi executado. PostgreSQL e replay foram deixados no estado existente.
