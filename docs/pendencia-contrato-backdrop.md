# Pendência de contrato: `backdropPath` dos banners

## Estado observado

O frontend usa `backdropPath` opcional nas respostas de Social/Feed, Diário,
Watchlist, Calendário e Listas. Na cópia local do repositório `watchwise-api`,
os DTOs correspondentes não declaram esse campo:

| Tela | Endpoint | DTO da API inspecionado |
| --- | --- | --- |
| Social | `GET /api/v1/feed` | `FeedPageViewDTO` |
| Diário | `GET /api/v1/users/{userId}/diary` | `DiaryEntryResponseDTO` |
| Watchlist | `GET /api/v1/users/{userId}/watchlist/view` | `WatchlistViewResponseDTO` |
| Calendário | `GET /api/v1/users/me/calendar` | `CalendarResponseDTO` |
| Listas | endpoints de listas do usuário/comunidade | `UserListCardDTO` e respostas de visualização |

Os cards de conteúdo da API também não fornecem `backdropPath` no contrato atual.
As respostas deixam esses valores como `undefined` no cliente.

## Regra do frontend

Durante a requisição, o frontend mantém `undefined` e não mostra fallback. Após
uma resposta bem-sucedida, usa a string retornada quando disponível; se o campo
não vier no DTO, considera que essa resposta não tem imagem e aplica o fallback.
Uma resposta com erro continua sem fallback. Diário usa
`latestWatchedBackdropPath` do resumo já retornado pela API, evitando uma
requisição redundante ao diário.

## Atualização necessária na API

Para cada endpoint acima, definir a origem do backdrop da página e expor
`backdropPath: string | null` na resposta. A API deve retornar `null` quando a
consulta de backdrop tiver sido concluída e nenhum caminho estiver disponível.
A alteração pertence ao repositório da API e não foi feita neste repositório.
