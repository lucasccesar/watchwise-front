# Content Pages Actions and Season Layout Design

## Goal

Corrigir os comportamentos e diferenças visuais solicitados nas páginas de série, temporada e filme, mantendo a composição própria de cada tela e os contratos existentes da API.

## Approved approach

Aplicar correções focadas nos templates e estilos de `series`, `season` e `movie`. A avaliação da série reutilizará o padrão visual já implementado na Home, sem extrair um novo componente compartilhado nem alterar estilos globais fora dos seletores necessários destas páginas.

## Current findings

- O salvamento em lote da série usa um botão `type="button"`; após sucesso, `saveBulkWatch()` chama `reload()`. `loadSeries()` apaga o conteúdo atual, muda o estado para `loading` e mostra o skeleton de página inteira. O efeito relatado é uma transição de estado no frontend, não um submit de formulário nem uma navegação do browser.
- O contrato TypeScript de `SeasonContentPage.details` não declara `creators`, e `SeasonEpisodeCard` não declara `overview`, apesar de esses campos serem retornados pela API conforme informado.
- O modal de nota da série tem markup e regras de estrela diferentes do modal de nota da Home.
- A seleção de pôster já tem um componente reutilizável (`app-content-poster-picker`); a correção deve garantir seu acionamento e camada visual no menu da série, sem criar um segundo seletor.

## Design and behavior

### Season page

- Mostrar o nome da série acima do título da temporada, na área indicada pela referência anexada.
- Usar `details.creators` na informação de criadores em vez do conjunto de `crew` exibido atualmente.
- Manter o cast e a equipe na estrutura de seção existente da série.
- Nos cards de episódio:
  - exibir título e `Sx · Ex` na mesma linha, com a numeração em branco e peso 600;
  - mostrar duração e data de lançamento na mesma linha, separados por `·`;
  - mostrar `overview` abaixo das estatísticas;
  - retirar a nota da comunidade da imagem do episódio;
  - garantir que o menu de ações fique acima das demais informações;
  - deixar o título do episódio branco e sem sublinhado;
  - formatar a contagem ao lado de “Episódios” com 14 px, peso 400 e cinza;
- Mostrar a borda de temporada selecionada apenas no pôster, sem padding adicional, com o raio do pôster e o nome da temporada azul.
- Exibir `episodeCount` do ator/personagem com o mesmo tamanho, cor e peso do texto do personagem.

### Series page actions and dialogs

- Manter “Marcar como assistido” em uma linha; aplicar todos os cantos arredondados ao contêiner `.series-action-watch-row--has-menu`.
- Corrigir a área clicável do controle principal de assistir, preservando a interação separada do botão de três pontos.
- Remover a ação de abandonar série do dropdown mobile da série.
- Alinhar o ícone do modal de conclusão.
- Fazer o modal de avaliação seguir o modal da Home: mesma estrela, dez opções em uma única linha quando houver espaço, números cinza por padrão e brancos até a nota selecionada, footer alinhado à esquerda e botão final com o rótulo “Salvar”.
- Remover fundo/borda aplicados no hover de botões primários equivalentes nesta área, mantendo indicação de foco por teclado.
- Acionar o `app-content-poster-picker` pelo dropdown e manter sua lista como dropdown sobreposta, com o mesmo visual da seleção de pôster do modal de compartilhamento.
- No envio do modal em lote, conservar a página renderizada e atualizar o estado da série em segundo plano, sem limpar `page()` nem mostrar o skeleton de tela inteira.

### Movie and repeated metadata

- Quando `movie-following` estiver vazio, renderizar a mesma mensagem e classe de estado vazio usadas em `series-following-empty`.
- Usar espaçamento de 6 px entre as linhas de metadados equivalentes às informações desktop da página de conteúdo.

## Boundaries

- Não alterar a API nem inventar novas rotas.
- Não reestilizar outros banners, páginas ou modais.
- Preservar carregamento, erro, ações, endpoints e estados atuais além do refresh visual de sucesso do salvamento em lote.
- Usar somente tokens e padrões existentes no design system para as regras visuais novas ou ajustadas.

## Acceptance criteria

1. A página da temporada mostra o nome da série no local indicado e a lista de episódios apresenta título, código da temporada/episódio, runtime, data, overview e estatísticas na hierarquia descrita.
2. A nota comunitária não aparece sobre a imagem do episódio e o dropdown permanece acima dos demais elementos.
3. A temporada atual destaca somente seu pôster; os demais cards e textos mantêm o layout existente.
4. Na página da série, o botão de assistir cabe em uma linha, a borda tem raio uniforme, o hit area funciona e o dropdown não apresenta a ação de abandonar.
5. O modal de avaliação acompanha o visual e os estados das estrelas da Home, e seu footer fica à esquerda com o rótulo “Salvar”.
6. Salvar o registro em lote não desmonta a página nem mostra o skeleton completo; os dados atualizados continuam refletindo o resultado da API.
7. O dropdown de alterar pôster abre e fica visualmente sobre os outros elementos.
8. A página de filme mostra a mensagem de estado vazio em “Pessoas que você segue”; o espaçamento das informações de metadados fica em 6 px.
9. O build existente e `git diff --check` são usados como verificações finais; nenhuma suíte de teste nova será adicionada nem executada sem pedido do usuário.

## Alternatives considered

- Extrair agora o modal de avaliação para um componente global compartilhado: aumenta o escopo e o risco de regressão nas páginas que já têm composição especial.
- Reorganizar estilos globais de conteúdo: pode alterar telas não mencionadas e repetir a regressão de padrões especiais relatada anteriormente.
- Correções focadas e reaproveitamento do componente de pôster já existente: escolhido por reduzir a superfície de mudança e manter o comportamento de cada página.
