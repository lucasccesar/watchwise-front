# Design: ícone de progresso e curtidas dos cartões de listas

## Objetivo

Padronizar o ícone que abre o progresso entre o menu de perfil do header e os cartões da tela de Listas. Tornar o contador de curtidas dos cartões uma ação interativa cujo coração só fica preenchido quando o usuário curtiu a lista.

## Contexto

- O menu de perfil já usa um ícone de três barras para Progresso; o botão de progresso dos cartões de lista usa hoje outro desenho.
- Os cartões recebem `likedByMe` e `likesCount` pelo contrato existente.
- `ListsApiService.setLiked` já envia `POST` ou `DELETE /api/v1/lists/{listId}/like`; a API não precisa mudar.

## Abordagem

Manter o desenho atual de três barras do menu de perfil e girá-lo 90 graus no sentido horário. Substituir o desenho diferente no botão de progresso dos cartões de lista pelo mesmo SVG e aplicar a mesma orientação. Preservar os rótulos acessíveis, o destino, o tooltip e o restante do menu.

Trocar o elemento estático de curtidas dos cartões por um botão. Usar `likedByMe` como estado inicial e `aria-pressed` como indicação acessível. O coração permanece vazado quando não curtido e fica preenchido na cor de curtida existente quando curtido. Ao ativar, chamar `setLiked` com o estado pretendido e atualizar o estado e a contagem do cartão após sucesso. Bloquear novas ativações na lista que estiver enviando a requisição. Em erro, manter o estado anterior e exibir toast localizado.

Depois de uma curtida ou remoção bem-sucedida, atualizar novamente a página quando a associação ou a ordenação dos resultados depender da curtida — fonte “Listas curtidas” ou ordenação por curtidas — para manter a paginação e a ordem do servidor corretas. Nos demais casos, manter o cartão na posição atual e atualizar apenas seu estado e contador.

Usar os tokens e padrões existentes para foco, tipografia e superfícies; conservar a cor e o estilo atuais do coração. Adicionar mensagens de ação e erro nos catálogos pt-BR e en.

## Restrições

- Não alterar o endpoint, o contrato da API ou a lógica de negócio no backend.
- Não mudar destinos de navegação, textos do botão de progresso, menus ou layout dos cartões além dos controles descritos.
- Não adicionar dependências ou criar um componente genérico de ícones para apenas esses dois usos.
- Preservar as alterações locais já existentes; sem commit ou push nesta unidade.

## Critérios de aceitação

1. O botão Progresso do menu de perfil mostra as três barras giradas 90 graus à direita.
2. O botão para abrir progresso em cada cartão de lista usa o mesmo ícone, tamanho e orientação.
3. A curtida começa vazada quando `likedByMe` é falso e preenchida quando verdadeiro.
4. Ativar a curtida chama o endpoint já existente, atualiza a contagem e impede requisições duplicadas para o mesmo cartão.
5. Remover curtida na fonte “Listas curtidas” atualiza os resultados; a ordenação por curtidas permanece consistente com o servidor.
6. Em erro, o cartão mantém o estado anterior e apresenta um toast localizado.
7. O controle funciona por teclado e comunica seu estado com `aria-pressed`; as dimensões responsivas do cartão e do menu permanecem preservadas.
