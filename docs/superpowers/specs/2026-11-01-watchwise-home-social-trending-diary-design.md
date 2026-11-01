# Ajustes de interação e paridade visual do Watchwise

## Objetivo

Corrigir os comportamentos pedidos na Home e no Diário, comparar os controles mobile de Trending com o protótipo e verificar os feeds da Home e da área Social sem gravar dados de demonstração.

## Abordagem aprovada

As mudanças ficam nos componentes donos de cada tela. Home e Diário têm interações diferentes de Trending; criar um seletor genérico aumentaria o acoplamento sem reduzir a lógica específica. Os serviços e contratos atuais da API permanecem como fonte dos dados.

### Home

- Remover somente a ação “Marcar como assistido” dos cards de Continue assistindo.
- Tornar o conteúdo do card navegável à página do filme, série ou episódio correspondente. Menu de ações e outros botões continuam com sua própria ação.
- Exibir a data local da Home desde o estado inicial, sem skeleton dependente da resposta da API.
- Remover sublinhado do nome e do username no menu de conta.
- Verificar os estados do feed da Home com os dados reais da sessão.

### Social e Trending

- Verificar o feed Social em modo somente leitura. A referência contém André Luis, usuário @andreluis. Só autenticar uma conta local de André se houver credencial de teste explícita no próprio projeto; não tentar senhas por suposição.
- Comparar o sheet Filters & sort do protótipo nos estados de Visualização (lista/grade) e Período (hoje/esta semana), incluindo abertura, subpágina, retorno, confirmação, fechamento e teclado. Manter o texto em pt-BR e os dados servidos pela API atual.

### Diário

- Alinhar tipografia, largura e hierarquia do banner e das quatro estatísticas ao padrão da Home.
- Remover a borda externa das abas Histórico e Resenhas e incluir seus ícones.
- Exibir ícones em cada filtro e na ordenação.
- Separar os tipos MOVIE, SERIES, SEASON e EPISODE sem agrupar episódios/temporadas como série ou episódio como temporada.
- Montar as opções do filtro Série somente com séries vinculadas aos registros; usar o nome da série, não título de episódio ou filme.
- Trocar o menu Nota por faixa inclusiva de 1 a 10 com dois limites inteiros, atualização imediata, clamp para manter mínimo ≤ máximo e redefinição para qualquer nota.
- Mostrar os campos De e Até lado a lado e quatro atalhos: últimos 7 dias, últimos 30 dias, este ano e todo o período.
- Disponibilizar ordenação por mais recentes, mais antigos, melhor avaliados e pior avaliados; notas ausentes ficam ao final em ordenação por nota, com desempate estável por data.
- Fazer o botão global alternar entre seções por data e uma grade plana, sem cabeçalhos/separadores de dia no modo plano. Os controles de um dia individual continuam recolhendo somente aquele dia.
- Mostrar seis cards por linha em desktop e reduzir a quantidade em telas menores para evitar overflow.

## Dados, persistência e limites

- Filtros e ordenação usam os registros já carregados do endpoint de diário existente. Nenhuma operação de criação, avaliação, seguimento ou alteração de conta será disparada durante a verificação.
- O filtro de período compara datas locais inclusivas e os atalhos atualizam o mesmo intervalo manual.
- Caso não exista credencial de André no projeto/local, a navegação Social da sessão disponível será verificada e a falta de acesso será registrada como bloqueio específico.
- O PC deve permanecer ligado após a conclusão.

## Verificação

- Adicionar testes unitários primeiro para roteamento/formatação local da Home, estados de filtros de Trending e lógica pura de filtro/ordenação do Diário.
- Rodar os testes focalizados e o build de desenvolvimento do frontend.
- Conferir Home, Social, Trending e Diário no navegador embutido; comparar overlays com os protótipos e verificar desktop, tablet e mobile nas alterações de layout.
- Confirmar que o servidor frontend permanece na porta 5173 e que nenhuma ação alterou dados do usuário.
