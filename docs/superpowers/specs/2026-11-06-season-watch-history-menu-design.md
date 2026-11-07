# Menu de histórico da temporada

## Objetivo

Mostrar o menu de três pontos na ação principal da temporada quando pelo menos
um episódio estiver assistido, seguindo o padrão visual e de interação da tela
de série.

## Comportamento

- O botão principal continua registrando os episódios restantes.
- Os três pontos aparecem quando `watchedEpisodeCount > 0`, inclusive no estado
  parcialmente assistido.
- O menu contém somente **Histórico** e **Remover temporada do histórico**.
- **Histórico** permanece desabilitado, como na tela de série, pois o contrato
  não define uma tela/filtro de histórico por temporada.
- **Remover temporada do histórico** abre uma confirmação. Ao confirmar, o
  frontend lista os registros `EPISODE` da série, seleciona os que pertencem à
  temporada atual e remove seus registros de diário individualmente. Registros
  de outras temporadas permanecem intactos. A tela é recarregada após a
  remoção.

## Dados e falhas

O contrato não oferece remoção em lote por temporada. A operação usa a leitura
paginada do diário, filtrada por série e tipo `EPISODE`, e o endpoint existente
`DELETE /diary/{diaryEntryId}` para cada registro da temporada. Se uma exclusão
falhar, a interface informa o erro e atualiza os dados para refletir os
registros que ainda existem.

## Verificação

Compilar a aplicação e revisar `git diff --check`. Não adicionar ou executar
testes sem solicitação do usuário.
