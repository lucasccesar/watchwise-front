# Divergência de contrato: denúncias

O snapshot local `telas-reqs-definitivo.md` não documenta o fluxo de denúncias da tela Social.

A cópia de trabalho independente do repositório da API (`watchwise-api`) implementa `POST /reports`.
O frontend usa o prefixo same-origin `/api/v1`, portanto a chamada correspondente é `/api/v1/reports`.

O body exige `targetType`, `targetId` e `reason`; `details` é opcional e limitado a 280 caracteres. Os
tipos relevantes para os menus da Social são `USER`, `COMMENT`, `REVIEW` e `CONTENT_REVIEW`. Os motivos disponíveis são
`SPAM_OR_MISLEADING`, `HARASSMENT_OR_BULLYING`, `HATE_SPEECH`, `UNMARKED_SPOILER`,
`SEXUAL_OR_VIOLENT_CONTENT` e `OTHER`. `UNMARKED_SPOILER` não é aceito para denúncias de usuário.

Essa integração segue a implementação atual da API. Atualize o snapshot de requisitos para registrar a
rota, os tipos, os motivos e os limites quando o contrato for reconciliado. Nenhuma alteração foi feita no
repositório da API.
