# Inputs

Campos de texto, área de texto e código (OTP), conforme Inputs.pdf.

## Text field

- **Label** acima do campo (`text-sm`, 600, `text`).
- Campo com borda `border`, fundo `surface`, texto `text`, placeholder `tertiary`.
- Ícone/prefixo opcional à esquerda; ícone de ajuda/erro opcional à direita.
- Hint text abaixo (`text-xs`, `tertiary`).

## Estados

- **Default** — borda `border`.
- **Focus** — borda `primary`, anel de foco (cor não especificada exatamente nos anexos; recomenda-se `primary`).
- **Error** — borda `error`, ícone de erro à direita e hint text em `error` (substitui o hint normal).
- **Disabled** — fundo `surface-secondary`, texto `tertiary`, sem interação.

## Textarea

Mesmo sistema de estados do text field, altura maior, redimensionável verticalmente.

## Código (OTP/PIN)

Conjunto de campos de um único caractere, alinhados, com separador visual opcional a cada grupo (ex. 3+3 dígitos). Mesmos estados (default/focus/preenchido/erro/disabled).

## Uso

Sempre acompanhar o campo de um label visível — não usar apenas placeholder como label. Hint text explica formato esperado; error text substitui o hint quando há erro.
