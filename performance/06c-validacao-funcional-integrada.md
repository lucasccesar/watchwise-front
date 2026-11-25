# 6C — Validação funcional integrada do candidato de produção

**Decisão: bloqueado para a 6D.** Passaram **31 dos 32 cenários** consolidados. A criação de Template pelo Angular foi reprovada. O formulário envia `categories[0].displayOrder=0`, a API exige um inteiro positivo e devolveu HTTP 400 em três execuções. Nenhuma exceção JavaScript foi capturada. A criação válida pela API permitiu validar o restante de Picks independentemente. Resultados consolidados [acervo local (results-consolidated.json)] · [Referência da 6B.5](06b5-revalidacao-completa-final.md)

## Artefatos e ambiente

| Artefato copiado da 6B.5 | Verificação |
| --- | --- |
| JAR produtivo [acervo local (watchwise.jar)] | SHA-256 `1dc93daa55362d823d2c9be08f605499524a553c67d3d6e3713aa005ecf09217`. Zero classes de instrumentação em `common/performance`. |
| Build Angular [acervo local (browser)] | 88 arquivos conferidos individualmente. SHA-256 do manifesto [acervo local (angular-tree.sha256)] `d03d3942afad3feb36cc8477fba8ab6547bdd2b9809601a164fb39b2a4708321`. |

As cópias estão em `dist/6c/artifacts`, fora do cache Angular, e foram qualificadas sem recompilar. A igualdade com os artefatos da 6B.5 preserva as 13 otimizações e as correções anteriores. Permanecem os oito avisos CSS preexistentes e a diferença de hash histórico Angular registrada na 6B.5. A cópia histórica perdida não foi reconstruída.

Usei o JAR de produção com o perfil local `dev` e parâmetros de runtime explícitos. O Angular produtivo foi servido pelo servidor estático adaptado do projeto, com fallback SPA e proxy de mesma origem para a API. Chromium **159.0.8154.6** exercitou as rotas reais. O PostgreSQL 16 Alpine foi provisionado em loopback com porta dinâmica. Na rodada final a origem foi `http://localhost:58671`, a API usou a porta 58670 e o banco isolado usou 58673. O registro de ambiente conserva a identidade das duas rodadas.

Cada banco foi verificado pelo cliente JDBC antes de iniciar a aplicação. A verificação confirmou porta, usuário sintético, nome esperado, versão 16 e ausência de histórico Flyway. Em ambas as rodadas foram aplicadas 104 migrations. A primeira tentativa de inicialização foi rejeitada pela proteção de armazenamento de importação porque staging e diretório temporário eram distintos. Foi usada uma raiz privada compartilhada dentro do ambiente descartável, como a aplicação exige.

As contas e as coleções foram criadas pela API real, com a confirmação automática local prevista no perfil de desenvolvimento. O envio de e-mail ficou desabilitado. Os metadados de mídia vieram de fixtures locais determinísticas [acervo local (tmdb.mjs)], com dois filmes e uma série de três episódios. Uma referência desconhecida retornou 404 local. As rotas auxiliares `top_rated` ficaram fora das fixtures e também retornaram 404 local. Chromium bloqueou os carregamentos externos de imagem e fonte. Assim, a validação comprova comportamento com mídia controlada. Ela não cobre CDN, provedor remoto, envio de e-mail nem a configuração de implantação do perfil `prod`.

Guard JDBC inicial [acervo local (datasource-qualified.log)] · Guard JDBC final [acervo local (datasource-final.log)] · API final e migrations [acervo local (backend-final.log)] · Ambiente final [acervo local (environment.json)]

## Matriz funcional

| Fluxo | Resultado | Precondição, ação e evidência |
| --- | --- | --- |
| Autenticação e perfil | **6 aprovados** | Conta sintética nova com REST 201. Visitante recebe 401 e a rota protegida redireciona a `/login`. O formulário retorna 200 e instala cookie HttpOnly. Reload consulta a identidade leve e recupera o mesmo usuário do perfil completo. Sem cookie de acesso, refresh retorna 204 e rotaciona o cookie. Perfil completo aparece na interface. Botão Sair retorna 204, redireciona e protege novamente a identidade. |
| Social, grafos e notificações | **8 aprovados** | Atividades e conexões sintéticas entre três contas. Solicitação pendente gera notificação e preserva a privacidade. Aceite libera o feed e os grafos autorizados. Três páginas de um item encadearam o cursor sem repetir eventos. Cursor inválido devolveu 400. Seguidores e Seguindo exibiram duas páginas distintas e a conta sem acesso recebeu 403. Feed e grafos renderizaram dados reais. O Angular marcou a notificação lida com 204. Filtros refletiram o estado e a alteração por outra conta recebeu 403. |
| Diário, histórico e notas | **4 aprovados** | Dois filmes e dois episódios registrados em datas controladas. As páginas REST do histórico tiveram ordem e total exatos. A resenha apareceu no Angular, foi editada pelo formulário e a atualização de nota para 9 persistiu. As três páginas por cursor em NEWEST e OLDEST mantiveram os filmes em extremos opostos e o grupo intermediário com dois episódios da temporada. O histórico visual exibiu ambos os filmes, ambos os episódios e o total de dois. |
| Watchlist principal e do Perfil | **3 aprovados** | Filmes Alpha e Beta e série Gamma incluídos antes de registrar visualizações. Páginas distintas, inversão de ordem e filtro Ação retornando Beta. No Perfil, o Angular exibiu Drama/Ação e o resultado filtrado. Dois GETs paginados usaram `includeGenreOptions=true`, sem chamada auxiliar a `/watchlist/genres`. A remoção na coleção retornou 204 e restaram dois itens. |
| Listas e médias | **2 aprovados** | Criação via API de lista pública mista com dois filmes e uma série. Detalhe em duas páginas sem duplicação e série renderizada no Angular. Após editar a nota de episódio, a média do dono passou de 7 para 8,5 e a pública de 8 para 9. |
| Picks e Templates | **4 aprovados, 1 reprovado** | Modelo válido preparado pela API com ordem 1. POST 201, PATCH 200 e texto revisado no Angular. Busca em Explorar observou 200 nas três ordenações. Recentes e Mais respondidos exibiram o modelo, e Popularidade semanal excluiu o modelo sem atividade. O card abriu o detalhe. A publicação de Pick pelo Angular apareceu em Meus Picks. A edição de visibilidade bloqueou a segunda conta. Quatro opções fixas foram hidratadas e a seleção mudou de T1E1 para T1E2 pelo endpoint real. A criação do modelo pelo formulário foi reprovada com 400. |
| Progresso de séries e lista | **3 aprovados** | REST confirmou um episódio assistido e próximo S01E02. Após o segundo evento, a série apareceu no Angular, com 2/3, um restante e S01E03 seguinte. O agregado de lista confirmou o mesmo estado e a temporada foi expandida na interface. |
| Importação de opiniões | **1 aprovado** | ZIP Letterboxd sintético enviado ao backend e processado pelo worker real. Primeiro job `COMPLETED`, com evento aplicado e nota/resenha absorvidas. Reimportação `COMPLETED` com evento ignorado. Uma única resenha de Diário conservou ID, nota 10 e data de visualização. |

Nenhum cenário foi dado como aprovado com base apenas em mock de API ou em status HTTP quando dependia de uma interface renderizada. O rollback e a concorrência de Picks usam como evidência complementar os testes integrados com PostgreSQL da [6B.4](06b4-correcao-problemas-remanescentes-backend.md).

Os falsos negativos do roteiro inicial foram preservados nos resultados brutos. Incluíram um seletor de perfil oculto, uma tentativa de preparar Watchlist depois de registrar os filmes já vistos, um seletor do Diário e uma paginação social que desconsiderava a atividade adicional da fixture. As revalidações de Watchlist e Explorar separaram navegação do documento da chamada REST e distinguiram as três ordenações do catálogo. Nenhum desses ajustes alterou o código produtivo. Primeira rodada [acervo local (results-first.json)] · Rodada completa [acervo local (results-all.json)] · Revalidação Watchlist [acervo local (results-collections.json)] · Revalidação Picks [acervo local (results-picks.json)]

## Defeito bloqueante e ressalvas

A criação padrão pelo Angular usa o índice zero para a primeira categoria em `PickCreateComponent`. O DTO `PicksTemplateCategoryCreationDTO` exige `@Positive`. A requisição real falha antes de criar o modelo, portanto o usuário não consegue concluir o fluxo normal de publicação de Templates. A criação via REST com ordem 1 confirma a independência dos demais fluxos. Recomenda-se alinhar a ordem emitida pelo formulário ao contrato e reprovar ou aprovar a 6D somente após repetir a criação pela interface.

Continuam pendentes `ImportTemporaryFilesTest#refusesASymbolicLinkInTheTemporaryRoot`, `ImportTemporaryFilesTest#refusesAnExistingDirectoryWithSharedPermissionsWithoutChangingIt` e `PrivateImportFileStoreTest#shouldRejectTraversalAndSymlinkEscapeWhenKeyIsNotPrivateRegularFile`. A verificação de WSL mostrou apenas a distribuição administrada pelo Docker Desktop. Nenhum ambiente POSIX compatível e autorizado estava disponível para executar esses três métodos. A ressalva de armazenamento da 6B.5 permanece.

## Encerramento

Os dois ambientes foram descartados em sequência. A checagem por identidade e rótulo registrou zero processos temporários, zero containers e zero volumes restantes nas duas rodadas. As portas dinâmicas foram liberadas. Os bancos em 15432 e 15433, o replay histórico e os serviços preexistentes ficaram fora da execução. O código de produção e as árvores originais foram preservados. A 6D permanece pendente. Encerramento inicial [acervo local (cleanup-first.json)] · Encerramento final [acervo local (cleanup-final.json)]
