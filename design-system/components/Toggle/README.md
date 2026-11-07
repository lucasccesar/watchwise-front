# Toggle

Interruptor binário (ligado/desligado) com efeito imediato, conforme Toggles.pdf.

## Estados

- **Off** — trilho `surface-secondary`, borda `border`, círculo `text` à esquerda.
- **On** — trilho `primary`, círculo `text` à direita.
- **Hover** — leve escurecimento/clareamento do trilho.
- **Focus** — anel de foco visível ao redor do trilho.
- **Disabled** — opacidade reduzida, sem interação.

## Tamanhos

sm e md, conforme Toggles.pdf.

## Uso

Sempre acompanhado de um label textual à direita ou à esquerda (`text-sm`); nunca usar sozinho sem contexto. Para escolhas que exigem confirmação/submit, prefira `Checkbox`.
