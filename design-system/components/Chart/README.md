# Chart

Visualização de dados categóricos/temporais, conforme Charts.pdf.

## Paletas

Duas paletas, para dois usos diferentes (ambas em `tokens.json`):

- **`chart-1`…`chart-6`** (monocromática) — Charts.pdf documenta séries em escala monocromática da cor de marca, do tom mais escuro (série 1) ao mais claro (última série); aqui aplicada aos stops exatos da escala Blue do Untitled UI. Use para séries sequenciais/de magnitude (ex. evolução mês a mês de uma única métrica).
- **`chartb-1`…`chartb-6`** (qualitativa) — a paleta multicolorida real do gráfico "Gêneros Mais Assistidos" em *Watchwise Initial Pages.pdf*, capturada por amostragem de pixel exata: Drama `chartb-1` (#2563EB), Thriller `chartb-2` (#10B981), Sci-Fi `chartb-3` (#8B5CF6), Comedy `chartb-4` (#F59E0B), Action `chartb-5` (#EF4444), Crime `chartb-6` (#F97316). Use na mesma ordem/categoria ao reproduzir esse gráfico específico ou qualquer outro breakdown por categoria não-ordenável (gênero, tipo de conteúdo, etc.).

## Tipos observados

Linha, barra e indicadores numéricos com badge de variação (ex. "+2.4%") — mesma estrutura do componente `Badge`.

## Grade e eixos

Linhas de grade e eixos usam `border`; rótulos de eixo usam `tertiary`, `text-xs`.

## Uso

Sempre rotular os eixos e incluir legenda quando houver mais de uma série. No Watchwise: distribuição de gêneros assistidos, filmes/séries por mês, evolução da nota média.
