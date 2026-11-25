# Projeto de desempenho do WatchWise

O candidato de integração foi aprovado na 6C.2. Foram preservadas **13 otimizações**, com oito decisões de manutenção definitiva no escopo avaliado e cinco provisórias. A 6D organizou a documentação e o material de reprodução. A 6E preparou os commits. A 6F registra sua execução local e as diferenças em relação ao candidato combinado. [Integração local](06f-integracao-validacao-final.md) [Organização](06d-organizacao-artefatos.md) · [Inventário de versionamento](06d-inventario-versionamento.csv) · [Revalidação final](06c2-revalidacao-funcional-final.md)

## Evidência por otimização

H é o tempo até o conteúdo útil definido para o cenário. A melhora de uma chamada HTTP, o volume transferido e o trabalho no banco são métricas distintas de H. Cada resultado vale para o cenário e as condições de sua execução.

| Nº | Otimização | Evidência e decisão |
| ---: | --- | --- |
| 1 | Feed, projeção de previews | 22 → 5 colunas, mesmos 65 previews e JSON. GET direto −0,60 ms, abaixo do limiar. **Manter.** [5C5](05c5-validacao-benchmark-projecao-preview.md) |
| 2 | Feed, categorias de Picks em lote | Dois lotes → um. 40 → 20 ocorrências no recorte. Coleta temporal individual interrompida no aquecimento. **Manter.** [5C8](05c8-validacao-benchmark-categorias-picks.md) |
| 3 | Feed, reuso de IDs internos de mídia | Um lote → zero para quatro coordenadas. Efeito temporal individual sem medição. As três mudanças do Feed juntas ficaram próximas da referência em H. **Manter.** [5C11](05c11-validacao-ids-internos-midia-feed.md) · [5C12](05c12-benchmark-acumulado-otimizacoes-feed.md) |
| 4 | Explorar Picks e Explorar templates, totais | 18 → 3 leituras, 2.422 → 36 B e um GET a menos. H abaixo do limiar. **Manter.** [5D3](05d3-validacao-benchmark-explorar-picks.md) |
| 5 | Detalhe de template, antecipação das opções | Sobreposição com comunidade em 1/24 → 23/24 tentativas. Sete detalhes válidos, sem pares completos. H inconclusivo. **Provisória.** [5E3](05e3-validacao-benchmark-templates.md) |
| 6 | Meus Picks, projeção leve | 16 → 7 leituras e 22.704 → 4.561 B. Benefício do GET sem consistência suficiente. Primeiro clique frio potencialmente mais lento. **Provisória.** [5F3](05f3-validacao-benchmark-meus-picks.md) · [5F4](05f4-validacao-primeiro-clique-meus-picks.md) |
| 7 | Seguidores e Seguindo, projeção paginada | 27 → 7 colunas, com cinco leituras e DTO equivalente. Ganhos HTTP e H abaixo dos limiares individuais. **Manter.** [5G3](05g3-validacao-benchmark-seguidores-seguindo.md) |
| 8 | Reviews do Diário, resumo dedicado | 19 → 6 leituras, 4.586 → 206 B e GET aquecido 77,86 → 51,09 ms. Sem ganho prático de H. **Manter.** [5H3](05h3-validacao-benchmark-reviews-diario.md) |
| 9 | Watchlist, eliminação do GET auxiliar de gêneros | 3 → 2 GETs e 54 → 21 leituras na sonda. H de abertura 425,68 → 387,69 ms, com melhora repetida no acumulado. GET principal mais lento e filtro acumulado pior. A piora prática do filtro não se repetiu no HTTP direto aquecido. **Provisória.** [5I3](05i3-validacao-benchmark-watchlist.md) · [5O3](05o3-comparacao-http-direta-watchlist.md) |
| 10 | Histórico do Diário, reutilização do resumo | 17 → 5 leituras e GET 76,82 → 54,73 ms. Sem ganho prático de H na abertura. **Manter.** [5J3](05j3-validacao-benchmark-historico-diario.md) |
| 11 | Notificações, leitura dedicada do fundo | 43 → 5 leituras e GET 112,79 → 28,49 ms. Sem ganho prático de H atribuível à alteração. Fundo personalizado coberto em condições controladas. **Provisória.** [5L3](05l3-validacao-benchmark-notificacoes.md) |
| 12 | Detalhe de lista, médias após recorte | 48 → 30/18 candidatos por página e 65 → 64 leituras no percurso. A piora prática de H do acumulado não se repetiu na comparação posterior com JAR comum. **Manter.** [5M3](05m3-validacao-benchmark-detalhe-lista.md) · [5P2](05p2-comparacao-builds-angular-detalhe-lista.md) |
| 13 | Restauração leve da sessão | 11 → 2 leituras, 1.099 → 280 B e cerca de 17 ms a menos no GET em três aberturas. Ganho prático em H somente em Notificações, −18,47 ms e −6,53%. **Provisória.** [5Q3](05q3-validacao-benchmark-restauracao-sessao.md) · [5Q4](05q4-consolidacao-restauracao-sessao.md) |

## Benchmarks acumulados e limites

- **5N2** concluiu 120 observações válidas no contraste de 12 alterações. Feed e Meus Picks reduziram trabalho sem melhora temporal consistente. Reviews e Notificações melhoraram os GETs auxiliares. A abertura da Watchlist melhorou em H, enquanto seu filtro e o Detalhe de lista pioraram no recorte acumulado. Diferenças de empacotamento limitam a atribuição causal. A 5P2 não reproduziu a regressão prática de H do Detalhe de lista no contraste isolado. [Fechamento 5N2](05n2-benchmark-acumulado.md) · [Matriz de resultados](05n2-resultados-acumulados.csv)
- **5Q3** concluiu 160 observações válidas no contraste separado da restauração de sessão. O ganho prático em H apareceu somente em Notificações. As amostras da 5N2 e da 5Q3 pertencem a contrastes diferentes. [5Q3](05q3-validacao-benchmark-restauracao-sessao.md)
- As rodadas usaram Chromium local, proxy, PostgreSQL isolado e replay controlado. O p95 de pequenas amostras é exploratório. O histórico deixa em aberto concorrência, escalabilidade, distribuição real do tráfego, snapshots frios e latência do provedor externo. As decisões provisórias continuam específicas aos recortes citados. [5R1](05r1-avaliacao-continuidade-projeto.md) · [Baselines](04b7-consolidacao-baselines.md)

## Cobertura e Fase 7

Das 39 telas elegíveis, 10 têm baseline histórica em 16 combinações, 15 foram investigadas e 13 têm observações A/B válidas em algum recorte. Doze investigações foram encerradas e três suspensas, Watchlist, Progresso e Progresso da lista. Validação funcional e investigação de desempenho têm coberturas próprias. [Matriz de cobertura](04b7-matriz-cobertura.csv) · [Inventário de rotas](rotas.csv) · [Fechamento 5R1](05r1-avaliacao-continuidade-projeto.md)

A Fase 7 tem como referência as 24 telas sem investigação específica listadas na 5R1. A ordem abaixo segue grupos funcionais e não representa prioridade de execução.

| # | Tela | Rota |
| ---: | --- | --- |
| 1 | Início | `/home` |
| 2 | Perfil | `/users/:username` |
| 3 | Calendário | `/calendar` |
| 4 | Em alta | `/trending` |
| 5 | Detalhe filme | `/content/movie/:tmdbId` |
| 6 | Detalhe série | `/content/series/:tmdbId` |
| 7 | Temporada | `/content/series/:tmdbId/season/:seasonNumber` |
| 8 | Episódio | `/content/series/:tmdbId/season/:seasonNumber/episode/:episodeNumber` |
| 9 | Detalhe de review/registro | `/diary/entry/:entryId` |
| 10 | Minhas listas | `/lists` |
| 11 | Descobrir listas | `/lists/community` |
| 12 | Criar lista | `/lists/create` |
| 13 | Editar lista | `/lists/:listId/edit` |
| 14 | Configurações | `/settings` |
| 15 | Preencher Pick | `/picks/templates/:templateId/new` |
| 16 | Criar template | `/picks/create` |
| 17 | Importar template | `/picks/import` |
| 18 | Login | `/login` |
| 19 | Cadastro | `/register` |
| 20 | Recuperação de senha | `/forgot-password` |
| 21 | Termos | `/terms` |
| 22 | Privacidade | `/privacy` |
| 23 | Diretrizes | `/community-guidelines` |
| 24 | Ajuda/contato | `/help-contact` |

## Validação e materiais de reprodução

- **6A e 6A.1** registram o candidato, os arquivos sobrepostos, a reconciliação da Watchlist e a separação de instrumentação. [Auditoria](06a-auditoria-final.md) · [Preparação](06a1-preparacao-candidato-integracao.md)
- **6B.5** aprovou 5.265 testes do backend, com três ignorados e zero falhas ou erros. Instrumentação 4/4. O JAR de produção ficou sem as classes de observação e o de benchmark reteve as seis. [Validação completa](06b5-revalidacao-completa-final.md)
- **6C** aprovou 31/32 cenários. **6C.1** corrigiu a criação de Templates. **6C.2** aprovou 211/211 testes Angular e 32/32 cenários integrados. [6C](06c-validacao-funcional-integrada.md) · [6C.1](06c1-correcao-criacao-templates.md) · [6C.2](06c2-revalidacao-funcional-final.md)
- **Reprodução** usa o pacote Playwright, os critérios em `scenarios.mjs` e os guards dos protocolos históricos. O manual e os lançadores históricos permanecem na árvore original. O núcleo selecionado está no candidato. Arquivos com dependência de dados ou configuração local exigem revisão de escopo antes de serem transportados. [Núcleo Playwright](benchmarks/run.mjs) · [Manual histórico](benchmarks/README.md)
- **Artefatos atuais** estão em `dist/6c2/artifacts` e no `target/6b5` do backend candidato. Os hashes e os locais de evidências estão no relatório da 6D. [Artefatos e preservação](06d-organizacao-artefatos.md#artefatos-preservados)

Permanecem os três testes dependentes de POSIX ou links simbólicos, a comparação binária indisponível com o Angular da 6B.3 e os oito avisos CSS preexistentes. As referências marcadas como acervo local apontam a evidências mantidas no ambiente de validação. As cópias documentais de publicação têm links relativos entre si.
