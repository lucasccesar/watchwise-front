# Radio

Seleção única entre opções mutuamente exclusivas, conforme Radio.pdf.

## Variante simples

Círculo com borda `border`; selecionado = ponto interno `primary` sobre borda `primary`. Estados default/hover/focus/disabled equivalentes ao Checkbox.

## Variante cartão (selector card)

Radio.pdf documenta radios compostos em cartões maiores — usados para seleção de planos, métodos de pagamento ou itens de lista com avatar:

- Cartão com borda `border` (não selecionado) ou `primary` (selecionado), fundo `surface`.
- Conteúdo do cartão: título (`text-sm`, 600), descrição (`text-xs`, `tertiary`), avatar/ícone opcional à esquerda, radio à direita ou à esquerda.

## Uso

Use `Radio` simples para até ~5 opções curtas em formulário; use o cartão quando cada opção precisa de mais contexto (descrição, preço, avatar). Para uma única opção binária (ligado/desligado imediato, sem submissão), use `Toggle`.
