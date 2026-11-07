# Table

Listagem tabular de dados, conforme Tables.pdf.

## Estrutura

Container em `surface`, borda `border`; cabeçalho de coluna com texto `text-sm`/600 sobre `surface-secondary`, suportando ordenação (seta asc/desc), tooltip de ajuda e estado desabilitado. Linhas com hover (`surface-secondary`) e divisor `border` entre linhas.

## Tipos de célula (catálogo do Tables.pdf)

- **Texto** simples, ou texto + subtexto (`text-sm` + `text-xs`/`tertiary`).
- **Checkbox** — seleção de linha.
- **Badge** (+ overflow "+N" quando há múltiplos badges).
- **Valor monetário/numérico** com badge de variação (tendência).
- **Toggle** embutido.
- **Avatar** (+ texto secundário) ou **avatar group**.
- **Barra de progresso** combinada com avatar.
- **Cartão de pagamento** (ícone de bandeira + últimos dígitos).
- **Arquivo** (ícone de tipo + nome + tamanho).
- **Ações** — ícones de editar/excluir ou menu overflow (`Dropdown Menu`).
- **Avaliação** — estrelas (usado no Watchwise para nota do usuário).

## Cabeçalho da tabela (toolbar)

Título da tabela + ações (busca, filtros, exportar, ação primária) acima do cabeçalho de colunas.

## Estado vazio

Ilustração/ícone central + título + descrição curta + ação primária, quando não há linhas a exibir.

## Paginação

Use o componente `Pagination` (variante numerada ou simples) no rodapé da tabela.

## Uso

No Watchwise: listas de filmes/séries assistidos, com colunas de título (texto+subtexto), status (`Badge`), nota (estrelas) e data.
