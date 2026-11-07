# Checkbox

Seleção múltipla, conforme Checkboxes.pdf.

## Variantes

- **Quadrado** — padrão, canto levemente arredondado (raio provisório, ver Pontos em aberto).
- **Circular** — variante redonda, mesmos estados.

## Estados

Unchecked (borda `border`, fundo `surface`), checked (fundo `primary`, ícone de check em `text`), indeterminate (traço central em `text` sobre fundo `primary`), hover, focus (anel `primary`), disabled (opacidade reduzida).

## Composição

Comumente combinado com label + descrição opcional (`text-sm` para o label, `text-xs`/`tertiary` para a descrição), usado em linhas de tabela e listas de seleção.

## Uso

Use quando o usuário pode marcar zero ou mais opções independentes. Para escolha única, use `Radio`.
