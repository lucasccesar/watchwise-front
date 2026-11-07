# Select

Campo de seleção com lista suspensa (combobox), conforme Select.pdf.

## Gatilho (trigger)

Mesma estrutura visual do `Inputs` (label acima, borda `border`, fundo `surface`), com chevron à direita indicando abertura.

## Lista suspensa

Painel flutuante, fundo `surface`, borda `border`, itens em coluna:

- **Item de texto simples** — `text-sm`.
- **Item com ícone** — ícone do conjunto Untitled UI à esquerda.
- **Item com avatar** (foto) — para seleção de pessoas/perfis.
- **Item com status dot** — indicador colorido de status ao lado do texto.
- **Campo de busca** no topo do painel, para listas longas (combobox).

## Estados do item

Default, hover (`surface-secondary`), selecionado (marca de check à direita, texto `primary`), disabled.

## Estados do gatilho

Default, focus (borda `primary`), disabled — mesmos do `Inputs`.

## Uso

Use `Select` para listas de 5+ opções ou quando cada opção carrega metadado visual (avatar, status). Para 2–5 opções sempre visíveis, prefira `Radio` ou `Button Group`.
