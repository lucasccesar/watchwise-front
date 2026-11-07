# Design: estados vazios e dropdowns globais

## Objetivo

Centralizar os estados vazios que substituem o conteúdo principal da página na região disponível abaixo dos controles superiores. Fechar os dropdowns customizados assim que uma opção for selecionada.

## Escopo

- Aplicar o alinhamento aos estados vazios de página/lista, incluindo listas, diário, watchlist, social, notificações, conexões, progresso, listas e áreas equivalentes.
- Preservar mensagens vazias internas de cards e subseções, como comentários sem respostas ou painéis individuais do perfil.
- Preservar cores, tipografia, bordas, conteúdo e ações atuais dos estados vazios.
- Fechar menus e seletores customizados depois da seleção; seletores HTML nativos mantêm o comportamento nativo de fechamento.
- O fechamento após selecionar uma lista em “Adicionar à lista” passa a prevalecer sobre a instrução anterior de manter esse menu aberto.

## Abordagem

Reutilizar o estilo compartilhado `.ww-empty-panel` como apresentação dos estados principais. Ajustar a cadeia de layout Flexbox da área autenticada e as regiões de conteúdo das páginas para que o estado vazio possa crescer até ocupar o espaço restante entre cabeçalho/controles e rodapé. O conjunto completo do estado permanece centralizado dentro dessa região, sem offsets ou margens artificiais. Aplicar a mesma regra às páginas sem `.ww-empty-panel` quando o vazio substituir a lista principal.

Para dropdowns, fechar o estado aberto no handler da opção selecionada, aproveitando os estados e métodos já existentes em cada feature. Isso mantém ações, navegação, tratamento de erro e abertura de modais sob controle do componente que os possui, sem evento global sintético ou dependência adicional. O clique fora e o acionamento do botão do dropdown continuam com o comportamento existente.

## Restrições

- Não reposicionar cabeçalhos, filtros, abas ou outros controles superiores.
- Não centralizar estados vazios internos a cards, subseções, comentários, sugestões de busca ou seletores de lista.
- Conteúdo não vazio conserva a ordem, dimensões e comportamento visual existentes.
- Usar tokens e padrões de responsividade já definidos; nenhuma nova dependência ou alteração de API.
- Preservar alterações locais existentes e não criar commits como parte desta tarefa.

## Critérios de aceitação

1. Em cada página com vazio principal, o painel ocupa toda a região restante abaixo dos controles e acima do rodapé; o conjunto do conteúdo fica centrado nos dois eixos.
2. Páginas com resultados não perdem conteúdo nem têm cabeçalhos, filtros, paginação ou ações movidos.
3. Mensagens vazias em painéis e subseções permanecem no respectivo painel, sem ocupar o restante da página.
4. Cada opção selecionada fecha seu dropdown customizado; seletores nativos continuam fechando com o comportamento do navegador.
5. O comportamento continua responsivo em desktop, tablet e celular.
