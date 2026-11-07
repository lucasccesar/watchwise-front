# Pagination

Navegação entre páginas de resultados, conforme Pagination.pdf.

## Variantes

- **Numerada** — botões numerados (`Tertiary gray`), página atual em destaque (`primary`), setas anterior/próxima nas extremidades, reticências para intervalos longos.
- **Simples (anterior/próximo)** — apenas dois botões com rótulo textual, sem números, para listas onde o total não é relevante.
- **Com contador** — texto "Página X de Y" ou "Mostrando 1–10 de 240" ao lado dos controles.

## Estados

Default (`tertiary`), hover (`surface-secondary`), página atual (`primary`, texto `text`), disabled (setas nas extremidades quando não há mais páginas).

## Uso

Prefira a variante numerada para tabelas/listas grandes; a simples para feeds contínuos (scroll conceitual "carregar mais" não documentado nos anexos).
