# Dropdown Menu

Menu de ações/opções acionado por botão, avatar ou item de UI, conforme Dropdowns.pdf.

## Composição

Painel flutuante (`surface`, borda `border`), lista de itens agrupados por seções opcionais separadas por divisor (`border`).

## Tipos de item

- **Texto simples**, com ícone opcional à esquerda e atalho de teclado opcional à direita (`text-xs`, `tertiary`).
- **Checkbox/Radio embutido** — para opções que alternam estado sem fechar o menu.
- **Item destrutivo** — cor não mapeada (ver Pontos em aberto sobre cores semânticas).

## Menu de conta (padrão observado)

Cabeçalho com avatar + nome + e-mail do usuário, seguido de seções de itens e um item de saída ao final — usado como referência para o menu de perfil do usuário.

## Estados

Default, hover (`surface-secondary`), disabled (`tertiary`, sem interação).

## Uso

Acionado por clique em botão/ícone/avatar; fecha ao selecionar um item ou clicar fora.
