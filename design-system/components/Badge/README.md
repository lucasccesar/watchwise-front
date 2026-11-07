# Badge

Rótulo compacto de status/categoria, conforme Badges.pdf.

## Formatos

Pill (cantos totalmente arredondados) e quadrado (cantos levemente arredondados).

## Modificadores

- **Somente texto**.
- **Com ponto** (dot) indicador à esquerda.
- **Com ícone** à esquerda.
- **Com avatar** à esquerda (para badges de "atribuído a").
- **Com X** removível (fecha ao clicar).
- **Com seta** (trailing arrow), indicando tendência/variação.

## Cor

Badges.pdf documenta variantes coloridas (cinza, marca, erro, aviso, sucesso e outras), mapeadas aos tokens deste sistema:

- **Neutro** — fundo `surface-secondary`, texto `text`.
- **Destaque/marca** — fundo transparente, borda e texto `accent`.
- **Erro** — fundo `error-soft`, texto `error`.
- **Sucesso** — fundo `success-soft`, texto `success`.
- **Aviso** — fundo `warning-soft`, texto `warning`.

## Banner composto

Badges.pdf também mostra um padrão de banner (ícone + título + descrição + ações) para anúncios de funcionalidade — mesmo mapeamento de cor acima (ex. banner de erro = `error-soft`/`error`).

## Uso

No Watchwise: badges de status de título ("Assistindo", "Concluído") usam `Neutro`, "Dropado" usa `Erro`; destaques (ex. "Novo episódio") usam `Destaque/marca`.

> Sentence case (ver *Princípios de Design*): use texto em sentence case nos rótulos de novos badges — os exemplos acima já seguem esse padrão. Badges em caixa alta que já existem em telas aprovadas do Watchwise não são alterados retroativamente.
