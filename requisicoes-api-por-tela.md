# Requisições da API por tela

Inventário das chamadas `HttpClient` presentes na implementação atual do frontend. A lista foi montada a partir das rotas, componentes e serviços em `src/app/`; ela descreve o código deste checkout, não substitui o contrato da API nem garante que o backend esteja atualizado.

Todas as rotas abaixo são relativas e usam o prefixo `/api/v1`. `{id}` e nomes semelhantes representam valores dinâmicos da rota. As chamadas de ação só acontecem quando a pessoa aciona o controle correspondente. Métodos que percorrem todas as páginas podem gerar várias requisições HTTP.

## Requisições compartilhadas

### Sessão nas rotas autenticadas

O `authenticatedGuard` chama `GET /api/v1/users/me` quando ainda não há usuário em memória. Se receber `401`, tenta `POST /api/v1/auth/refresh` e repete `GET /api/v1/users/me`. Isso vale para as rotas protegidas abaixo; não é uma chamada própria de cada componente.

### Busca do cabeçalho e seletores

O cabeçalho autenticado e alguns seletores de listas, conexões e Picks usam:

- `GET /api/v1/search/view?q={texto}&scope={escopo}&page=1&size=5`

O `scope` depende do controle, por exemplo `CONTENT`, `MOVIE`, `SERIES`, `PERSON`, `LIST`, `PICKS_TEMPLATE` ou `USER`. A busca é disparada pela interação da pessoa, não por toda abertura de página.

### Seletor de imagem de conteúdo

Quando um seletor de cartaz/imagem é aberto:

- `GET /api/v1/contents/selection/{type}/{tmdbId}/{kind}` — carrega as imagens disponíveis.
- `PUT /api/v1/users/me/content-posters/{contentId}` — salva a imagem escolhida, com `customPosterUrl` no corpo.

O seletor aparece nas telas de filme e série; o diálogo de compartilhamento também consulta imagens para compor a prévia.

### Menu de ações sociais

Quando o menu de usuário/denúncia é exibido (por exemplo, em itens do feed e no detalhe de lista), ele pode fazer:

- `GET /api/v1/users/{userId}` — consulta relação com o usuário.
- `POST` ou `DELETE /api/v1/users/{userId}/follow` — seguir/deixar de seguir.
- `POST /api/v1/users/me/blocked/{userId}` — bloquear.
- `POST /api/v1/reports` — enviar denúncia.

## Telas públicas e de conta

### `/login` — entrar

- `POST /api/v1/auth/login` — envio das credenciais.
- `POST /api/v1/auth/oauth/google` — envio do ID token do Google.

### `/register` — cadastro

- `POST /api/v1/auth/register` — criação da conta.

### `/forgot-password` — recuperação de senha

- Nenhuma chamada à API está ligada ao formulário nesta implementação; a tela valida e mantém o estado local.

### `/terms`, `/privacy`, `/community-guidelines` e `/help-contact`

- Nenhuma chamada à API Watchwise. O conteúdo é carregado localmente.

### `/` e página não encontrada

- `/` redireciona para `/login`. A rota coringa exibe a página de não encontrado. Nenhuma dessas telas faz chamada de API própria.

## Início e navegação

### `/home` — início

**Carregamento:**

- `GET /api/v1/users/{userId}/summary/home` — resumo da Home, incluindo atividade social resumida e próximos lançamentos.
- `GET /api/v1/feed?size=3` — busca complementar de atividade quando a pessoa expande/carrega os detalhes sociais.
- `GET /api/v1/contents/{contentId}/page` — busca sob demanda dos dados de episódio usados por um card de atividade.

**Ações:**

- `POST /api/v1/diary` — registra um filme ou episódio como assistido.
- `PATCH /api/v1/diary/{diaryEntryId}` — atualiza um registro do diário.
- `POST /api/v1/users/me/dropped/SERIES/{tmdbId}` — marca uma série como abandonada.
- `POST` ou `DELETE /api/v1/diary/{entryId}/like` — curte ou remove curtida de atividade de diário.

### `/trending` — em alta

**Carregamento:**

- `GET /api/v1/trending?timeWindow={janela}&size=12` — resumo da janela selecionada.
- `GET /api/v1/trending/{movie|series}?timeWindow={janela}&page={página}&size=21` — lista paginada da categoria selecionada.

**Ações nos cards:**

- `POST /api/v1/contents/reference` — registra/resgata a referência Watchwise do filme ou série antes de carregar detalhes.
- `GET /api/v1/contents/{contentId}/page` — consulta dados do conteúdo.
- `POST /api/v1/diary` ou `POST /api/v1/diary/bulk` — registra filme/série como assistido.
- `POST /api/v1/users/me/watchlist/{MOVIE|SERIES}` e `DELETE /api/v1/users/me/watchlist/{MOVIE|SERIES}/{entryId}` — adiciona ou remove da Watchlist.
- `GET /api/v1/users/{userId}/lists?page={página}&size=10&contentId={contentId}` — carrega listas compatíveis com o conteúdo.
- `GET /api/v1/lists/{listId}?page={página}&size=30&type={tipo}` — consulta itens para verificar associação.
- `POST /api/v1/lists/{listId}/items` e `DELETE /api/v1/lists/{listId}/items/{itemId}` — adiciona/remove conteúdo de uma lista.
- `POST /api/v1/users/me/lists/bulk` — cria uma lista com o conteúdo selecionado.

### Busca no cabeçalho

Não há rota independente `/search` no roteador. A busca disponível no cabeçalho usa `GET /api/v1/search/view` conforme a seção [Busca do cabeçalho e seletores](#busca-do-cabeçalho-e-seletores).

### `/calendar` — calendário

- `GET /api/v1/users/me/calendar?month={AAAA-MM}` — consulta o mês exibido. Navegar entre meses gera nova chamada.

## Perfil, diário e progresso

### `/users/{username}` — perfil

**Resolução e cabeçalho do perfil:**

- `GET /api/v1/search/view?q={username}&scope=USER&page=1&size=5` — localiza o usuário pelo nome de usuário.
- `GET /api/v1/users/{userId}` — carrega o perfil e a relação com a pessoa autenticada.

**Aba principal:**

- `GET /api/v1/users/{userId}/summary?type={MOVIE|SERIES}` — resumo do perfil; o modo de episódios usa `SERIES`.
- `GET /api/v1/users/{userId}/top5/{MOVIE|SERIES}` — Top 5 da categoria.
- `GET /api/v1/users/{userId}/diary?page={página}&size={tamanho}&type={MOVIE|EPISODE}&sortBy=NEWEST` — itens recentes da categoria.
- No modo de episódios, também carrega `GET /api/v1/users/{userId}/series-in-progress?...` e percorre páginas de `GET /api/v1/users/{userId}/diary?...` para preparar os episódios avaliados.
- `GET /api/v1/users/{userId}/reviews?page=1&size=50` — resenhas recentes usadas no perfil.

**Abas acessíveis no perfil:**

- `progress`: páginas de `GET /api/v1/users/{userId}/series-in-progress?page={página}&size=100&sortBy={ordenação}&direction={ASC|DESC}` e `GET /api/v1/users/{userId}/top5/MOVIE`. Ao abrir o destaque de uma série, `GET /api/v1/contents/{seriesTmdbId}/page` carrega a arte de fundo.
- `history`: `GET /api/v1/users/{userId}/summary/all-time` e `GET /api/v1/users/{userId}/diary` com filtros de tipo, série, nota, período, ordenação e paginação.
- `reviews`: `GET /api/v1/users/{userId}/diary` com `hasReview=true`, tipo, ordenação e paginação.
- `lists`: `GET /api/v1/users/{userId}/lists/view?page={página}&size={tamanho}` com filtros e ordenação.
- `watchlist`: `GET /api/v1/users/{userId}/watchlist/view?...`; a lista de gêneros é derivada percorrendo páginas desse mesmo endpoint.
- `picks`: `GET /api/v1/users/{userId}/picks?page={página}&size={tamanho}`.
- `episode-ratings-map`: `GET /api/v1/users/{userId}/episode-ratings-map?page={página}&size=11`.
- `episode-ratings-map/{seriesTmdbId}`: `GET /api/v1/users/{userId}/series/{seriesTmdbId}/episode-ratings`.

**Ações:**

- `POST /api/v1/users/{userId}/follow` ou `DELETE /api/v1/users/{userId}/follow` — seguir/deixar de seguir.
- `POST /api/v1/diary` — registra o próximo episódio como assistido quando essa ação é oferecida na aba de progresso.
- A busca de candidatos para seletores usa `GET /api/v1/search/view`.

### `/users/{username}/followers` e `/users/{username}/following`

- `GET /api/v1/users/{userId}/followers?page={página}&size=20` ou `GET /api/v1/users/{userId}/following?page={página}&size=20` — lista conexões.
- Na tela de seguindo, `DELETE /api/v1/users/{userId}/follow` — deixa de seguir uma pessoa.
- A resolução do nome de usuário usa `GET /api/v1/search/view?q={username}&scope=USER&page=1&size=5`.

### `/progress` — progresso de séries

- `GET /api/v1/users/{userId}/series-in-progress?page={página}&size={tamanho}&sortBy={ordenação}&direction={ASC|DESC}` — consulta progresso e paginação.
- `POST /api/v1/diary` — registra episódio assistido pela ação de marcar o próximo episódio.

### `/diary` — diário

- `GET /api/v1/users/{userId}/summary/home` — resumo exibido no cabeçalho da tela.
- `GET /api/v1/users/{userId}/diary/series` — opções de filtro de série.
- `GET /api/v1/users/{userId}/diary?page={página}&size=1000&sortBy=NEWEST` — registros do diário; a tela percorre as páginas.
- `GET /api/v1/users/{userId}/diary/view?page={página}&size=1000&grouped=true` — itens agrupados para a apresentação do diário; também percorre as páginas.

**Ações:**

- `POST /api/v1/diary` — registra uma nova visualização ao repetir um filme/episódio.
- `DELETE /api/v1/diary/{diaryEntryId}` — exclui um registro.
- `POST` ou `DELETE /api/v1/{diary|reviews|dropped}/{entryId}/like` — curte/remove curtida conforme a origem do card.

### `/diary/reviews` — resenhas do diário

- `GET /api/v1/users/{userId}/summary/home` — resumo do cabeçalho.
- `GET /api/v1/users/{userId}/diary/series` — opções de filtro.
- `GET /api/v1/users/{userId}/reviews?page={página}&size=1000` — lista de resenhas, percorrida página a página.
- Não solicita `/diary/view` nesta rota.
- Curtir/remover curtida usa `POST` ou `DELETE /api/v1/{diary|reviews|dropped}/{entryId}/like`.

### `/diary/entry/{entryId}` — detalhe de resenha

- `GET /api/v1/diary/{entryId}` — carrega o registro.
- `GET /api/v1/users/{authorId}` — consulta o perfil do autor.
- `GET /api/v1/diary/{entryId}/comments?page={página}&size=20` — comentários e respostas.
- Para montar o card do conteúdo relacionado, pode criar referência com `POST /api/v1/contents/reference` e ler `GET /api/v1/contents/{contentId}/page`.

**Ações:**

- `POST /api/v1/diary/{entryId}/comments` — comenta/responde.
- `POST` ou `DELETE /api/v1/diary/{entryId}/like` — curte/remove curtida da resenha.
- `PATCH /api/v1/diary/{entryId}` — atualiza a resenha/registro.
- `POST` ou `DELETE /api/v1/comments/{commentId}/like` — curte/remove curtida de comentário.

## Watchlist e listas

### `/watchlist` — minha Watchlist

- `GET /api/v1/users/{userId}/watchlist/view?...` — carrega itens paginados, com tipo, gênero, status, ordenação e direção.
- `GET /api/v1/users/{userId}/watchlist/view?...` — a busca de opções de gênero percorre páginas do mesmo endpoint.

**Ações nos itens:**

- `DELETE /api/v1/users/me/watchlist/MOVIE/{entryId}` ou `DELETE /api/v1/users/me/watchlist/SERIES/{entryId}` — remove item da Watchlist.
- `POST /api/v1/diary` ou `POST /api/v1/diary/bulk` — registra conteúdo como assistido.
- Para adicionar/remover de uma lista do usuário, usa `GET /api/v1/users/{userId}/lists?page={página}&size=10&contentId={contentId}`, `GET /api/v1/lists/{listId}?page={página}&size=30&type={tipo}`, `POST /api/v1/lists/{listId}/items` ou `DELETE /api/v1/lists/{listId}/items/{itemId}`.
- `POST /api/v1/users/me/lists/bulk` — cria uma lista diretamente a partir do item.

### `/lists` — minhas listas

- `GET /api/v1/users/me/lists/view?source={OWNED|...}&page={página}&size=10` — carrega as listas próprias e, conforme filtros, aplica tipo de item, gênero e ordenação.
- Ordenar/reordenar listas salva as posições com `PATCH /api/v1/lists/{listId}`.
- `DELETE /api/v1/lists/{listId}` — exclui uma lista.
- `POST` ou `DELETE /api/v1/lists/{listId}/like` — curte/remove curtida.

### `/lists/community` — listas da comunidade

- `GET /api/v1/lists/discover/view?sortBy={ordenação}&sortDirection=desc&page={página}&size=10` — lista paginada, com filtros opcionais de tipo e gênero.
- Ações de curtir/remover curtida: `POST` ou `DELETE /api/v1/lists/{listId}/like`.

### `/lists/create` — criar lista

- `GET /api/v1/search/view?...` — busca de conteúdo para selecionar itens.
- Para escolher temporada/episódio: `GET /api/v1/contents/selection/series/{seriesTmdbId}/seasons` e `GET /api/v1/contents/selection/series/{seriesTmdbId}/seasons/{seasonNumber}/episodes`.
- `POST /api/v1/users/me/lists` — cria lista sem itens selecionados.
- `POST /api/v1/users/me/lists/bulk` — cria lista com itens selecionados.

### `/lists/{listId}/edit` — editar lista

- `GET /api/v1/lists/{listId}/view?page={página}&size=30&sortBy=position&sortDirection=asc` — carrega lista e seus itens, percorrendo páginas.
- `PATCH /api/v1/lists/{listId}` — atualiza nome, descrição e visibilidade.
- `POST /api/v1/lists/{listId}/items` — adiciona itens.
- `DELETE /api/v1/lists/{listId}/items/{itemId}` — remove itens.
- Busca e seleção de temporada/episódio usam os mesmos endpoints descritos em [Criar lista](#listscreate--criar-lista).

### `/lists/{listId}` — detalhe da lista

- `GET /api/v1/lists/{listId}/view?...` — carrega detalhes, itens e filtros/paginação.
- `GET /api/v1/lists/{listId}/comments?page={página}&size=20` — comentários.
- `GET /api/v1/users/{userId}/lists?...` e `GET /api/v1/lists/{otherListId}?page=...` — opções e itens do seletor de listas.

**Ações:**

- `POST` ou `DELETE /api/v1/lists/{listId}/like` — curte/remove curtida.
- `POST /api/v1/lists/{listId}/comments` — comenta/responde.
- O menu de ações sociais do autor pode consultar `GET /api/v1/users/{userId}`, seguir/deixar de seguir com `POST`/`DELETE /api/v1/users/{userId}/follow`, bloquear com `POST /api/v1/users/me/blocked/{userId}` ou denunciar com `POST /api/v1/reports`.
- `PATCH /api/v1/lists/{listId}` — atualiza metadados/ordem.
- `PATCH /api/v1/lists/{listId}/items/{itemId}` — atualiza posição ou dados do item.
- `POST /api/v1/lists/{listId}/items` e `DELETE /api/v1/lists/{listId}/items/{itemId}` — adiciona/remove itens.
- `DELETE /api/v1/lists/{listId}` — exclui lista.
- `POST` ou `DELETE /api/v1/comments/{commentId}/like`; `DELETE /api/v1/comments/{commentId}` — ações nos comentários.
- Marcar itens como assistidos usa `POST /api/v1/diary` ou `POST /api/v1/diary/bulk`; adicionar/remover Watchlist usa os endpoints descritos em [Minha Watchlist](#watchlist--minha-watchlist).

### `/lists/{listId}/progress` — progresso da lista

- `GET /api/v1/lists/{listId}/progress` — progresso agregado.
- `POST /api/v1/diary` — registra o episódio marcado como assistido.

## Social e notificações

### `/social` — feed social

- `GET /api/v1/feed?size=20` — primeira página do feed.
- `GET /api/v1/feed?size=20&cursor={cursor}` — carrega mais atividade.
- `GET /api/v1/users/{userId}` — consulta relação com usuário antes de ações que dependem desse estado.
- `POST /api/v1/users/{userId}/follow` ou `DELETE /api/v1/users/{userId}/follow` — seguir/deixar de seguir.
- `POST /api/v1/users/me/blocked/{userId}` — bloquear usuário.
- `POST /api/v1/reports` — envia denúncia.
- Curtidas em atividades usam `POST`/`DELETE` em `/api/v1/diary/{id}/like`, `/api/v1/reviews/{id}/like`, `/api/v1/dropped/{id}/like`, `/api/v1/picks/{id}/like` ou `/api/v1/picks-templates/{id}/like`, conforme o tipo da atividade.
- Comentários usam `POST /api/v1/diary/{id}/comments`, `/api/v1/picks/{id}/comments` ou `/api/v1/picks-templates/{id}/comments`, conforme o tipo da atividade.
- `PATCH /api/v1/comments/{commentId}` e `DELETE /api/v1/comments/{commentId}` — editar/excluir comentário próprio.

### `/notifications` — notificações

- `GET /api/v1/users/{userId}/summary/home` — consulta o estado de notificações não lidas exibido pela tela.
- `GET /api/v1/notifications/view?page={página}&size={tamanho}&isRead={true|false}` — carrega e filtra notificações.
- `PATCH /api/v1/notifications/{notificationId}/read` — marca uma notificação como lida; pode ser repetida para várias notificações.
- `POST /api/v1/users/me/follow-requests/{requesterId}/accept` — aceita solicitação de seguir.
- `DELETE /api/v1/users/me/follow-requests/{requesterId}` — rejeita solicitação de seguir.

### `/settings` — configurações

- `GET /api/v1/users/me/settings` — carrega perfil, privacidade, preferências e conta.
- `GET /api/v1/users/me/follow-requests?page={página}&size=20` — solicitações pendentes.
- `GET /api/v1/users/me/blocked?page={página}&size=20` — usuários bloqueados.

**Ações:**

- `PATCH /api/v1/users/me` — atualiza perfil, preferências ou senha.
- `DELETE /api/v1/users/me/banner` — remove o banner.
- `POST /api/v1/users/me/blocked/{userId}` e `DELETE /api/v1/users/me/blocked/{userId}` — bloqueia/desbloqueia usuário.
- `POST /api/v1/users/me/follow-requests/{requesterId}/accept` e `DELETE /api/v1/users/me/follow-requests/{requesterId}` — aceita/rejeita solicitação.
- `POST /api/v1/auth/logout` — encerra a sessão.
- `DELETE /api/v1/users/me` — exclui a conta; a senha é enviada no corpo.

## Conteúdo

As telas de detalhe começam criando/obtendo uma referência Watchwise com `POST /api/v1/contents/reference`; a resposta fornece o `contentId` usado nas leituras seguintes. Os caminhos de filme, série, temporada e episódio compartilham alguns recursos, mas nem toda ação existe em todos os tipos.

### `/content/movie/{tmdbId}` — filme

**Carregamento e painéis:**

- `POST /api/v1/contents/reference` com tipo `MOVIE`.
- `GET /api/v1/contents/{contentId}/page` — detalhe do filme.
- `GET /api/v1/contents/{contentId}/reviews?page={página}&size=20&sort={ordenação}` — resenhas.
- `GET /api/v1/contents/{contentId}/comments?page={página}&size=20` — comentários.
- `GET /api/v1/users/{userId}/following?page={página}&size=20` — conexões relevantes para a tela.
- O seletor de listas usa `GET /api/v1/users/{userId}/lists?...` e `GET /api/v1/lists/{listId}?page={página}&size=30&type=MOVIE`.

**Ações:**

- `POST /api/v1/diary`, `PATCH /api/v1/diary/{entryId}` e `DELETE /api/v1/diary/{entryId}` — registra/edita/remove visualização.
- `POST /api/v1/users/me/watchlist/MOVIE` e `DELETE /api/v1/users/me/watchlist/MOVIE/{entryId}` — adiciona/remove Watchlist.
- `POST /api/v1/users/me/dropped/MOVIE/{tmdbId}` e `DELETE /api/v1/users/me/dropped/MOVIE/{tmdbId}` — marca/remove como abandonado.
- `POST /api/v1/users/me/lists/bulk`, `POST /api/v1/lists/{listId}/items` e `DELETE /api/v1/lists/{listId}/items/{itemId}` — cria/atualiza associação com listas.
- `POST /api/v1/contents/{contentId}/comments`, `POST`/`DELETE /api/v1/comments/{commentId}/like`, `DELETE /api/v1/comments/{commentId}` — comentários.
- `POST`/`DELETE /api/v1/{diary|reviews|dropped}/{entryId}/like` — curtida em resenha/atividade.

### `/content/series/{tmdbId}` — série

**Carregamento e painéis:**

- `POST /api/v1/contents/reference` com tipo `SERIES`.
- `GET /api/v1/contents/{contentId}/page` — detalhe da série; também pode ser repetido ao atualizar o estado visual.
- `GET /api/v1/contents/{contentId}/reviews?page={página}&size=20&sort={ordenação}` e `GET /api/v1/contents/{contentId}/comments?page={página}&size=20`.
- `GET /api/v1/users/{userId}/series-in-progress?...` — registro de progresso da série.
- `GET /api/v1/users/{userId}/lists?...` e `GET /api/v1/lists/{listId}?page={página}&size=30&type=SERIES` — seletor/estado das listas.

**Ações:**

- `POST /api/v1/diary` ou `POST /api/v1/diary/bulk` — registra a série como assistida; `PATCH /api/v1/diary/{entryId}` atualiza o registro.
- `PUT /api/v1/contents/{contentId}/my-rating` — salva avaliação numérica.
- `POST /api/v1/contents/{contentId}/reviews`, `PATCH /api/v1/reviews/{reviewId}` e `DELETE /api/v1/reviews/{reviewId}` — cria/edita/remove resenha de conteúdo.
- `POST /api/v1/users/me/watchlist/SERIES` e `DELETE /api/v1/users/me/watchlist/SERIES/{entryId}` — adiciona/remove Watchlist.
- `POST /api/v1/users/me/dropped/SERIES/{tmdbId}` e `DELETE /api/v1/users/me/dropped/SERIES/{tmdbId}` — marca/remove como abandonada.
- `POST /api/v1/users/me/lists/bulk`, `POST /api/v1/lists/{listId}/items`, `DELETE /api/v1/lists/{listId}/items/{itemId}` — ações de listas.
- `DELETE /api/v1/diary/series/{seriesTmdbId}` — remove o histórico de diário da série.
- `POST /api/v1/contents/{contentId}/comments`, `POST`/`DELETE /api/v1/comments/{commentId}/like` e `DELETE /api/v1/comments/{commentId}` — comentários.
- `POST`/`DELETE /api/v1/{diary|reviews|dropped}/{entryId}/like` — curtida.

### `/content/series/{tmdbId}/season/{seasonNumber}` — temporada

**Carregamento e painéis:**

- `POST /api/v1/contents/reference` com tipo `SEASON`.
- `GET /api/v1/contents/{contentId}/page` — detalhe da temporada.
- `GET /api/v1/contents/selection/series/{seriesTmdbId}/seasons` — opções de temporada.
- `GET /api/v1/contents/{contentId}/reviews?page={página}&size=20&sort={ordenação}` e `GET /api/v1/contents/{contentId}/comments?page={página}&size=20`.
- `GET /api/v1/users/{userId}/lists?...` e `GET /api/v1/lists/{listId}?page={página}&size=30&type=SEASON` — seletor/estado das listas.

**Ações:**

- `POST /api/v1/diary` ou `POST /api/v1/diary/bulk` — registra a temporada como assistida; `PATCH /api/v1/diary/{entryId}` atualiza registro existente.
- `PUT /api/v1/contents/{contentId}/my-rating` — salva avaliação.
- `POST /api/v1/users/me/lists/bulk`, `POST /api/v1/lists/{listId}/items` e `DELETE /api/v1/lists/{listId}/items/{itemId}` — ações de listas.
- `POST /api/v1/contents/{contentId}/comments`, `POST`/`DELETE /api/v1/comments/{commentId}/like`, `DELETE /api/v1/comments/{commentId}` — comentários.
- `POST`/`DELETE /api/v1/{diary|reviews|dropped}/{entryId}/like` — curtida.

### `/content/series/{tmdbId}/season/{seasonNumber}/episode/{episodeNumber}` — episódio

**Carregamento e painéis:**

- `POST /api/v1/contents/reference` para a referência `EPISODE` e para a referência da série.
- `GET /api/v1/contents/{episodeContentId}/page` e `GET /api/v1/contents/{seriesContentId}/page` — episódio e contexto da série.
- `GET /api/v1/contents/{episodeContentId}/reviews?page={página}&size=20&sort={ordenação}` e `GET /api/v1/contents/{episodeContentId}/comments?page={página}&size=20`.
- `GET /api/v1/users/{userId}/lists?...` e `GET /api/v1/lists/{listId}?page={página}&size=30&type=EPISODE` — seletor/estado das listas.

**Ações:**

- `GET /api/v1/diary/{entryId}` — carrega registro existente para edição.
- `POST /api/v1/diary` e `PATCH /api/v1/diary/{entryId}` — cria/edita registro assistido.
- `DELETE /api/v1/diary/{entryId}` — remove registro.
- `POST /api/v1/lists/{listId}/items` e `DELETE /api/v1/lists/{listId}/items/{itemId}` — adiciona/remove de lista.
- `POST /api/v1/contents/{contentId}/comments`, `POST`/`DELETE /api/v1/comments/{commentId}/like`, `DELETE /api/v1/comments/{commentId}` — comentários.
- `POST`/`DELETE /api/v1/{diary|reviews|dropped}/{entryId}/like` — curtida.

## Picks

### `/picks` — minhas escolhas

- `GET /api/v1/users/me/picks/view?page={página}&size=10` — Picks da pessoa autenticada.
- `GET /api/v1/users/me/picks-templates/view?page={página}&size=20` — modelos próprios.

### `/picks/explore` e `/picks/templates` — explorar modelos

- `GET /api/v1/picks-templates?page={página}&size={tamanho}&sort={ordenação}` — modelos; pode incluir `origin` e `name`.
- `GET /api/v1/users/me/picks-templates/view?...` — modelos próprios.
- Para os contadores, `GET /api/v1/users/me/picks/view?...` e `GET /api/v1/users/me/picks-templates/view?...`.
- `POST /api/v1/picks-templates/{templateId}/like` ou `DELETE /api/v1/picks-templates/{templateId}/like` — curte/remove curtida.

### `/picks/create` — criar modelo

- `GET /api/v1/search/view?q={texto}&scope={escopo}&page=1&size=5` — busca de opções.
- Ao selecionar episódios: `GET /api/v1/contents/selection/series/{seriesTmdbId}/seasons` e `GET /api/v1/contents/selection/series/{seriesTmdbId}/seasons/{seasonNumber}/episodes`.
- `POST /api/v1/picks-templates` — cria o modelo e suas categorias/opções.

### `/picks/import` — importar modelo

- Nenhuma chamada à API nesta implementação; leitura, validação, importação e exportação do JSON são locais.

### `/picks/templates/{templateId}` — detalhe do modelo

- `GET /api/v1/picks-templates/{templateId}` — modelo.
- `GET /api/v1/picks-templates/{templateId}/my-picks/view?page={página}&size=10` — Picks da própria pessoa.
- `GET /api/v1/picks-templates/{templateId}/picks/view?page={página}&size=10&sort={RECENT|POPULAR}` — Picks da comunidade.
- `GET /api/v1/picks-templates/{templateId}/comments?page={página}&size=20` — comentários.
- `GET /api/v1/picks-templates/{templateId}/categories/{categoryId}/options/view?page=1&size=100` — opções da categoria quando solicitadas.
- `POST`/`DELETE /api/v1/picks-templates/{templateId}/like` e `POST`/`DELETE /api/v1/picks/{pickId}/like` — curtidas.
- `POST /api/v1/picks-templates/{templateId}/comments` — comentário/resposta.

### `/picks/templates/{templateId}/new` — responder modelo

- `GET /api/v1/picks-templates/{templateId}` — carrega o modelo.
- `GET /api/v1/picks-templates/{templateId}/categories/{categoryId}/options/view?page=1&size=100` — visualizações das opções.
- `GET /api/v1/search/view?...` — busca de respostas.
- Para seleção de episódio, `GET /api/v1/contents/selection/series/{seriesTmdbId}/seasons` e `GET /api/v1/contents/selection/series/{seriesTmdbId}/seasons/{seasonNumber}/episodes`.
- `POST /api/v1/picks-templates/{templateId}/picks` — publica a resposta.

### `/picks/{pickId}` — detalhe de uma escolha

- `GET /api/v1/picks/{pickId}/view` — escolha.
- `GET /api/v1/picks/{pickId}/comments?page={página}&size=20` — comentários.
- `POST`/`DELETE /api/v1/picks/{pickId}/like` — curte/remove curtida.
- `POST /api/v1/picks/{pickId}/comments` — comenta/responde.
- `PATCH /api/v1/picks/{pickId}` — altera visibilidade.

## Código existente sem rota ativa

Os itens abaixo têm chamadas nos serviços/componentes, mas o roteador atual não abre essas telas. As entradas de jogos redirecionam para `/home`; os caminhos de retrospectiva também redirecionam, e outros ainda não têm rota. Portanto, as chamadas abaixo não são feitas ao navegar pela aplicação atual.

### Jogos

- Visão diária: `GET /api/v1/games/today/view`, `GET /api/v1/games/{date}` e `GET /api/v1/games/history?page={página}&size={tamanho}`.
- Ranking: `GET /api/v1/games/rankings/view?page={página}&size={tamanho}&gameType={tipo}`.
- Gameplay: `GET /api/v1/games/{gameType}/play?majorRoles={true|false}`, `GET /api/v1/games/{gameType}/search?q={texto}&page={página}&size=8&view=true`, `POST /api/v1/games/{gameType}/play/attempt?majorRoles=...` e `POST /api/v1/games/{gameType}/play/give-up?majorRoles=...`.
- Seleção do jogo de episódio: `GET /api/v1/games/EPISODE_BY_FRAME/search/series?...`, `GET /api/v1/games/EPISODE_BY_FRAME/series/{seriesTmdbId}/seasons` e `GET /api/v1/games/EPISODE_BY_FRAME/series/{seriesTmdbId}/seasons/{seasonNumber}/episodes`.

### Retrospectivas do perfil

O componente contém chamadas para estas telas, mas os caminhos atualmente redirecionam para `/home`:

- Resumo do mês: `GET /api/v1/users/{userId}/summary/month?type={MOVIE|SERIES}&month={AAAA-MM}`.
- Resumo do ano: `GET /api/v1/users/{userId}/summary/year?type={MOVIE|SERIES}&year={AAAA}`.
- Estatísticas gerais: `GET /api/v1/users/{userId}/summary/all-time` e `GET /api/v1/users/{userId}/summary/all-time/edition?type={MOVIE|SERIES}`.

### Outras telas dos requisitos

- Não há rota `/person/{tmdbId}` nem tela independente `/explore` ou `/search` no roteador atual.
- O fluxo de confirmação de e-mail não tem rota/componente ligado nesta cópia.
- Consulte [`telas-reqs-definitivo.md`](telas-reqs-definitivo.md) para a lista de telas previstas no produto; esta seção não inventa chamadas para telas ainda sem implementação/rota.

## Fontes principais

- Rotas: [`app.routes.ts`](src/app/app.routes.ts) e [`auth.routes.ts`](src/app/features/auth/auth.routes.ts).
- Sessão: [`session.service.ts`](src/app/core/session/session.service.ts) e [`authenticated.guard.ts`](src/app/core/session/authenticated.guard.ts).
- Serviços HTTP: arquivos `*-api.service.ts` nas pastas `src/app/features/*/data-access/`.
- Requisitos de tela: [`telas-reqs-definitivo.md`](telas-reqs-definitivo.md).
