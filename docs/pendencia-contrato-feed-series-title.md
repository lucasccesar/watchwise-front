# Pendência de contrato: título da série no feed social

## Estado observado

A tela Social precisa mostrar o nome da série junto à temporada e ao episódio,
por exemplo `Abbott Elementary · T1 · E3`. O `GET /api/v1/feed` atual não
fornece o título da série no item do feed:

- `FeedItem.content` inclui `seriesTmdbId`, `seasonNumber` e `episodeNumber`;
- `FeedItemView.card.title` é o título do episódio;
- `FeedItemView` adiciona o card visual, mas não `seriesTitle`.

Essa forma está registrada em `docs/openapi.yaml` e no DTO
`FeedItemViewDTO` do repositório `watchwise-api`.

## Atualização necessária na API

Adicionar `seriesTitle: string | null` ao `FeedItemView` para atividades com
conteúdo `EPISODE`, resolvendo o título no idioma preferido do usuário durante
o enriquecimento em lote do feed. O cliente não deve chamar a Home nem fazer
uma requisição de detalhes para cada atividade.

Esta alteração pertence ao repositório separado da API. O frontend continua
renderizando `seriesTitle` quando o campo vier no item do feed.
