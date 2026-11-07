# Tooltip

Texto de apoio contextual exibido ao passar o cursor/focar um elemento, conforme Tooltips.pdf.

## Composição

Balão compacto, fundo `surface-secondary`, texto `text` (`text-xs`), seta apontando para o elemento de origem. Suporta 8 posições (topo/base/esquerda/direita, cada uma com alinhamento início/centro/fim).

## Variantes de conteúdo

- **Somente texto** — uma linha ou parágrafo curto.
- **Com título** — título (`text-xs`, 600) + descrição (`text-xs`, `tertiary`).

## Uso

Textos curtos (uma frase); nunca conter ações interativas (botões/links) — para isso use `Dropdown Menu` ou um popover. Aparece no hover/focus e desaparece ao sair.
