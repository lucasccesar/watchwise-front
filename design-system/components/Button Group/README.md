# Button Group

Controle segmentado para alternar entre opções mutuamente exclusivas (ex.: períodos de um gráfico, filtros de visualização), conforme Button Group.pdf.

## Composição

Conjunto de 2 a 5 segmentos lado a lado, borda compartilhada (`border`), sem espaçamento entre eles.

## Estados por segmento

- **Default** — fundo `surface`, texto `tertiary`.
- **Hover** — fundo `surface-secondary`.
- **Selecionado/ativo** — fundo `surface-secondary`, texto `text`, peso 600.
- **Disabled** — texto `tertiary` com opacidade reduzida, sem interação.

## Variantes

- Somente texto.
- Com indicador (ponto colorido em `primary`) à esquerda do rótulo.
- Icon-only nas extremidades (ex. anterior/próximo) combinado com segmentos de texto no meio.

## Uso

Não use para mais de 5 opções — nesse caso prefira `Select`/`Dropdown Menu`. Rótulos curtos, `text-sm`.
