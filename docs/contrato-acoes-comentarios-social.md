# Contrato das ações de comentários na Social

O snapshot `telas-reqs-definitivo.md` documenta a exclusão de comentários, mas não registra a edição
via `PATCH /comments/{commentId}` nem o tipo `COMMENT` para denúncias.

A cópia de trabalho independente de `watchwise-api` implementa:

- `PATCH /api/v1/comments/{commentId}` com `text` obrigatório, limitado a 280 caracteres, e
  `containsSpoiler` opcional; a resposta é o comentário atualizado.
- `DELETE /api/v1/comments/{commentId}` para excluir o próprio comentário.
- `POST /api/v1/reports` com `targetType: COMMENT` para denunciar um comentário.
- `GET /api/v1/users/{userId}` com `viewerRelation` para apresentar Seguir ou Deixar de seguir.
  As mutações usam as rotas de follow já documentadas.

O frontend usa esses contratos já presentes na implementação da API. Nenhuma alteração foi feita no
repositório da API; reconcilie o snapshot local de requisitos com essas rotas.
