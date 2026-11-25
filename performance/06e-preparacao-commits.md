# 6E — Preparação dos commits definitivos

O candidato aprovado na 6C.2 pode ser separado em lotes de backend, frontend, testes, ferramentas e documentação. As 13 otimizações e as correções são contempladas no plano. O trabalho paralelo permanece preservado em lote próprio, cuja autoria e seleção precisam ser confirmadas antes da integração. Os arquivos mistos têm âncoras de seleção no [plano CSV](06e-plano-commits.csv). A autorização para operações Git de escrita fica pendente.

## Bases e referências Git

| Repositório | HEAD da árvore original | Base do candidato destacado | Relação local |
| --- | --- | --- | --- |
| Backend | `main` em `7105887810a69aa51d017fad1bd4129ff65aeb4f` | O mesmo commit, em `target/6a1-api` | `main` e `origin/main` locais coincidem |
| Frontend | `main` em `c7685599062c129458809c64624b5e404133a6ad` | `baadc3b8b48eaf9da4bad236ef6b46c999cd13ab`, em `performance/benchmarks/.local/6a1-front` | `main...origin/main` = 0/3. O ancestral comum é `c7685599` |

As referências remotas citadas são as cópias locais. O frontend candidato já contém `f03af2a` (dados de Perfil e gêneros), `922f34a` (ordenação contínua de listas) e `baadc3b` (documentação de contratos). As 12 sobreposições da 6A.1 exigem manter a base reconciliada, incluindo as seis resoluções textuais. Reaplicar os três commits sobre o candidato duplicaria a reconciliação. A inspeção considerou o diff entre HEAD e o conteúdo final do worktree, o índice existente e os arquivos novos. A árvore original frontend mantém 63 arquivos rastreados modificados e a backend 39. O candidato frontend possui 57 caminhos modificados só no índice, nove só no worktree e cinco em ambos. No backend os números são 36, 108 e três. Esses números excluem arquivos ainda não rastreados.

Evidências de referência. [6D](06d-organizacao-artefatos.md) · [Inventário da 6D](06d-inventario-versionamento.csv) · [6A.1](06a1-preparacao-candidato-integracao.md) · [6B.5](06b5-revalidacao-completa-final.md) · [6C.2](06c2-revalidacao-funcional-final.md)

## Ordem recomendada

O CSV cobre os 466 registros da 6D, acrescenta linhas para arquivos selecionados por trecho e registra cópias documentais condicionadas. Cada uma de suas 517 linhas identifica um destino ou exclusão, inclusive quando um caminho aparece em mais de um lote. `HOLD` identifica evidência preservada na origem e linhas que ficam fora da seleção. As âncoras numéricas usam o diff do HEAD do candidato para o conteúdo final. Os nomes de métodos, campos e operações são a referência quando o deslocamento de linhas mudar.

| Ordem | Repositório | Mensagem | Objetivo | Otimizações | Dependência |
| --- | --- | --- | --- | --- | --- |
| 01 · B01 | API | `perf(feed): reduzir consultas e montagem de previews` | Projetar autores, agrupar categorias e reutilizar IDs de mídia conhecidos | 1–3 | — |
| 02 · B02 | API | `perf(picks): publicar totais e cartões resumidos` | Adicionar totais e projeção paginada sem mudar as rotas completas | 4,6 | — |
| 03 · B03 | API | `perf(social): projetar linhas para seguidores e seguindo` | Preservar visibilidade e paginação com projeções | 7 | — |
| 04 · B04 | API | `perf(summary): separar resenhas e fundo de notificações` | Adicionar dois resumos e manter os endpoints existentes | 8,10,11 | — |
| 05 · B05 | API | `perf(watchlist): incluir gêneros globais sob demanda` | Atender à lista e ao Perfil pelo GET paginado | 9 | — |
| 06 · B06 | API | `fix(diary): qualificar filtros da timeline e validar notas` | Resolver SQL ambíguo e validar o intervalo de notas nos dois fluxos | — | — |
| 07 · B07 | API | `fix(lists): preservar associações, exclusão e paginação visual` | Corrigir proxies e tombstones e enriquecer médias só após o recorte elegível | 12 | — |
| 08 · B08 | API | `feat(auth): adicionar identidade leve e normalizar rememberMe` | Preservar restauração e compatibilidade dos DTOs de autenticação | 13 | — |
| 09 · B09 | API | `test: isolar bootstrap e recuperar a cobertura de integração` | Levar correções de infraestrutura, fixtures e regressões do backend por arquivo | 1–4,6–13 | B01–B08 |
| 10 · B10 | API | `build(benchmark): isolar observação e replay do artefato produtivo` | Versionar o perfil Maven, instrumentação, replay e regras locais | — | B09 |
| 11 · F01 | Angular | `perf(picks): consumir totais e cartões resumidos` | Adotar os endpoints aditivos nos consumidores corretos | 4,6 | B02 |
| 12 · F02 | Angular | `perf(templates): antecipar opções após detalhe autorizado` | Preservar dependências, retry, segurança, cancelamento e H | 5 | — |
| 13 · F03 | Angular | `fix(templates): numerar categorias a partir de um` | Corrigir a criação pela interface e manter as regressões | — | F02 |
| 14 · F04 | Angular | `perf(diary): paginar timeline e compartilhar resumo de atividade` | Preservar filtros, conclusões e aplicação do resumo | 8,10 | B04,B06 |
| 15 · F05 | Angular | `perf(watchlist): usar gêneros da página na lista e no Perfil` | Preservar filtro válido, vazio filtrado e ausência do GET auxiliar | 9 | B05 |
| 16 · F06 | Angular | `perf(notifications): buscar apenas o fundo do banner` | Preservar fallback e independência da listagem | 11 | B04 |
| 17 · F07 | Angular | `perf(auth): restaurar sessão com identidade leve` | Preservar refresh, guards e escopo de autenticação | 13 | B08 |
| 18 · F08 | Angular | `fix(episode): enviar remoção explícita de comentário` | Preservar os contratos de atualização e primeira nota | — | B06 |
| 19 · P01 | Angular | `feat(ui): preservar alterações paralelas reconciliadas` | Lote separado sujeito à confirmação de autoria e à revisão das dependências de UI | — | F02–F05,F08 |
| 20 · F09 | Angular | `test: restaurar providers e mocks dos fluxos Angular` | Levar somente specs de configuração e contratos ainda sem lote | — | F01–F08,P01 |
| 21 · F10 | Angular | `chore(benchmark): preservar núcleo Playwright reutilizável` | Versionar fontes, pacote e regras de ignore | — | B10 |
| 22 · F11 | Angular | `docs(performance): consolidar evidências e plano de integração` | Versionar documentação selecionada, após revisar links e sensibilidade | — | B01–B10,F01–F10,P01 |

B09 concentra as alterações interdependentes de descoberta Spring, slices, mocks, importação determinística, calendário de progresso, concorrência, regressões de contrato e fixtures da 6B.2C/6B.4. O lote pressupõe a aplicação de B01–B08. A primeira nota sem versão e a versão zero ou positiva nas atualizações permanecem verificadas em F09. F08 mantém a remoção explícita do comentário via PATCH. F03 corrige a origem de `displayOrder` no Angular para começar em um e leva a regressão de múltiplas categorias, sem mudar o DTO produtivo.

P01 é uma proposta separada da série de desempenho. Inclui a apresentação, os mapas de Perfil, os estados das listas e as ações compartilhadas localmente reconciliadas. O lote exige revisão de autoria e validação da composição. Os três commits já na base do frontend ficam no histórico original. Os 124 arquivos de B09 são um lote de testes interdependentes. Os arquivos de instrumentação e seu teste ficam no B10.

### Arquivos mistos e pontos de integração

| Área | Seleção e controle na 6F |
| --- | --- |
| Backend · autores e sessão | Selecionar individualmente `findPreviewsByIdIn` e seus imports em B01, e `findSessionIdentityById` e seu DTO em B08. Os dois métodos chegam no mesmo hunk. |
| Backend · Feed e Watchlist | Dividir o mesmo hunk de `ContentCardAssembler` entre `assembleBasicMetadataWithKnownIds` em B01 e `resolveGenres` em B05. Ambos os controles ficam em B09. |
| Backend · listas | B07 mantém `findByIdWithUser`, o fetch das referências usadas após a consulta e os tombstones antes da exclusão. No mesmo leitor, médias podem ir após o recorte somente no modo visual com ordenação independente de nota. Conferir ambas as funções no review. |
| Backend e frontend · OpenAPI | Selecionar por paths e schemas em cada lote. O frontend usa a timeline combinada do Diário com `includeCompletions`, parâmetro já presente no backend-base. B06 transporta o alias e a validação de nota. O cursor v5 e seu desempate já estão na base backend. A especificação frontend não acrescenta o path do fundo de Notificações neste diff. Registrar a diferença documental e manter como referência o path existente na OpenAPI do backend e nos manuais de telas. |
| Frontend · Diário | F04 leva resumo, tipos de timeline, filtros e aplicação das páginas. Os trechos de `lockRewatch` e da apresentação compartilhada de avaliação pertencem ao P01. O spec do Diário deve continuar exercitando página, ordem, filtros e resenhas. |
| Frontend · Templates | F02 leva a cadeia de detalhe autorizado para opções e o cancelamento. Skeleton e apresentação da comunidade acompanham o estado e a rotina correspondente de P01. Ao montar F02 sozinho, revisar os pontos compartilhados de destruição e `communityRefresh` para evitar referências sem definição. F03 leva a criação com ordem iniciada em um. |
| Frontend · Watchlist e Perfil | F05 leva o opt-in, gêneros e controle da troca de perfil. Rewatch e ação pós-registro ficam em P01. O helper de recarga e o estado de carregamento do Perfil são compartilhados com outros fluxos. Revisar os chamadores em conjunto e preservar os testes da 6A.1. |
| Frontend · Detalhe de lista, estilos e UI | As alterações de interface e compatibilidade de ordenação do candidato são do lote paralelo. Preservar o carregamento contínuo incorporado pela base, o estado vazio filtrado, a visibilidade e as ações existentes. Manter o serviço de tooltip junto da sua inicialização. |

Aplicar B02, B04, B05 e B08 antes dos respectivos consumidores frontend. Os totais e cartões novos são aditivos. Os endpoints completos de Picks, resumo e usuário continuam disponíveis aos consumidores existentes. No caso da Watchlist, a página principal **e** a aba do Perfil enviam `includeGenreOptions=true` a `GET /api/v1/users/{userId}/watchlist/view`. O backend conserva o comportamento padrão dos demais consumidores e retorna `availableGenres` sobre toda a lista visível. Um filtro válido sobrevive à página vazia. A guarda de remoção de um gênero explicitamente ausente volta à primeira página. Uma resposta legada sem a propriedade limpa o menu antigo e conserva o filtro. Manter a eliminação do GET auxiliar. O frontend que depende dos novos endpoints só deve ser integrado depois de confirmada sua disponibilidade no backend correspondente.

## Evidências, decisões e itens locais

- **Manutenção definitiva no escopo avaliado** · 1–3 Feed, 4 totais de Explorar, 7 projeções sociais, 8 resumo de Reviews, 10 reuso no Histórico e 12 recorte em Detalhe de lista.
- **Manutenção provisória** · 5 Templates, antecipação medida com H inconclusivo; 6 Meus Picks, projeção confirmada e primeiro clique frio com custo deslocado; 9 Watchlist, métricas do GET/filtro variáveis e snapshots frios fora do escopo; 11 Notificações, queda no GET de fundo sem ganho isolado em H e fundo personalizado com cobertura controlada; 13 sessão, ganho prático em H somente em Notificações. Os critérios de decisão e a distinção entre desempenho medido e redução de trabalho permanecem no [índice](README.md) e na [5R1](05r1-avaliacao-continuidade-projeto.md).
- **Proteção e portabilidade** · A seleção exclui backups protegidos, armazenamento de credenciais, arquivos de ambiente pessoais, logs e amostras brutas, caches, builds, catálogos de replay locais e saídas sob `dist/`, `target/` ou `.local/`. A triagem textual procurou padrões de chaves privadas, tokens conhecidos, URLs com credenciais e caminhos Windows nas fontes e nos documentos alterados disponíveis. Não encontrou correspondências nessas classes. Isso não substitui a revisão do texto e dos hunks que comporão cada commit, especialmente scripts e documentos históricos. Não abrir nem copiar o conteúdo de backups ou credenciais.
- **Links** · No índice publicado, trocar `../../../../05*.md`, `../../../../06a*.md`, `../../../../04b7-*`, `../../../../rotas.csv` e o link ao manual por links relativos a cópias portáveis aprovadas. O CSV enumera as referências diretas. Inspecionar links transitivos dos relatórios selecionados. Referências a JARs, logs, ambientes locais ou resultados fora da seleção devem virar referências textuais com etapa e hash quando disponível. Preservar o documento original se a conversão eliminar contexto. Publicar somente o recorte revisado, com referências internas resolvíveis. Nenhum link histórico foi editado nesta etapa.
- **Benchmark reutilizável** · Selecionar no backend somente as duas fontes do replay copiadas, instrumentação, teste, regras de ignore e perfil `benchmark-observation`. No frontend selecionar as 14 fontes/arquivos de pacote e o ignore. Lançadores específicos, fixtures, manifestos de rodada e catálogos permanecem com suas referências históricas até uma revisão individual de portabilidade e segurança. O pacote preparado preserva a metodologia H original.

## Integridade e ressalvas

A verificação comparou os quatro HEADs e índices Git à referência da 6D, além dos arquivos rastreados e não ignorados. As árvores originais conservaram seus hashes e status registrados. Nos candidatos, as únicas mudanças em arquivos que já existiam na captura anterior à 6D continuam sendo os dois `.gitignore` da própria 6D. As duas entregas deste plano são novos documentos do candidato frontend. O código de produção e os testes conservam os hashes anteriores.

| Artefato | SHA-256 verificado |
| --- | --- |
| JAR produtivo, cópias 6B.5 e 6C.2 | `1dc93daa55362d823d2c9be08f605499524a553c67d3d6e3713aa005ecf09217` |
| JAR de benchmark 6B.5 | `b9495cd6372342456ca111c5ca1d9fb17e2601eb94296d93cfac755e435a3a1d` |
| Manifestos Angular 6C.1 e 6C.2, 88 arquivos por árvore | `e209b74b52ef5b20f1344cb7d8ccbf20fd2ca17305599d9670a9706a11b85007` |

A evidência anterior permanece 5.265 testes backend aprovados e três ignorados por dependência de POSIX ou links simbólicos, 211/211 Angular, 4/4 de instrumentação e 32/32 cenários integrados. Permanecem os oito avisos CSS preexistentes e a comparação binária indisponível com o build Angular histórico da 6B.3. Nenhum teste, build ou benchmark integrou esta etapa.

## Procedimento recomendado para a 6F

1. Mediante autorização explícita, confirmar branches definitivas, atualizar a visão das refs somente com o acesso autorizado e comparar com as bases deste plano. Se surgir divergência, revisar os novos caminhos sobrepostos antes de levar os lotes. Manter os worktrees originais e os candidatos disponíveis para referência.
2. Preparar branches de integração isoladas a partir dos dois HEADs candidatos, com índices próprios. Transportar o conteúdo final por caminho e por trecho, conferindo os símbolos do CSV. Revisar os arquivos novos individualmente. Usar a seleção do índice novo como fonte do commit, sem reaproveitar automaticamente o staging atual do candidato.
3. Aplicar backend primeiro, depois consumidores frontend e o lote paralelo revisado. Em pontos inseparáveis de UI, revisar um conjunto atômico de hunks com autoria confirmada. Se realizar a separação exigir inventar comportamento intermediário, pausar o lote correspondente e preservar o candidato integrado. Não propagar uma árvore incompleta como o candidato que passou na 6C.2.
4. Antes de cada commit autorizado, conferir diff selecionado e exclusões por caminho, sem adição global. Ao final, comparar as árvores compostas ao código e testes do candidato 6C.2 e explicar diferenças intencionais de documentação/ignore. Conferir contratos aditivos, preservação da base upstream, perfil Maven e matriz de cobertura. Se a composição de produção ou testes divergir, revalidar os fluxos afetados sob autorização apropriada. Usar as evidências da 6C.2 somente quando a composição correspondente for preservada.
5. Concluir commit e integração somente dentro da autorização concedida para a 6F. Push, deploy e promoção dos artefatos exigem escopo explícito próprio. Até essa autorização, a 6E termina no plano.

A recomendação é **prosseguir para a 6F após autorização**, com revisão do lote paralelo, validação da separação dos trechos e saneamento documental antes de qualquer integração definitiva.
