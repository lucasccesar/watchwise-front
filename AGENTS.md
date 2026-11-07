# AGENTS.md

Instruções para implementar e manter o frontend do Watchwise. O frontend e o backend são repositórios separados; este arquivo governa apenas o frontend e seus consumidores da API.

## Produto e estado desta pasta

Watchwise é um app social para acompanhar, avaliar e comentar filmes, séries, temporadas e episódios. O primeiro lançamento do frontend deve cobrir as funcionalidades do produto já implementadas no backend.

Esta pasta contém as referências de design, ainda não uma aplicação executável. Não há `package.json`, configuração Angular ou comando de build definido. A direção atual é Angular com TypeScript, componentes standalone e uma SPA; preserve essa direção até o usuário pedir outra.

## Decisões atuais do produto

- Lançamento completo: incluir os fluxos de conta e todos os domínios de produto do backend, organizados em entregas de desenvolvimento sem excluir funcionalidades da estreia.
- `watchwise-prototype/telas` representa as telas e fluxos visuais; `watchwise-prototype/mobile`, `tablet` e `notebook` fornecem referências por tamanho de tela.
- `design-system` contém os tokens, princípios e componentes visuais aprovados; use-o como fonte visual, não crie um redesign por conta própria.
- Idioma inicial: português do Brasil. Prepare mensagens separadas por chave para adicionar inglês depois; não deixe textos de produto fixos em inglês por causa dos protótipos.
- A página de apresentação em `/explore` é pública e deve ser rastreável. As páginas do produto exigem login. As rotas necessárias para entrar ou recuperar acesso — login, cadastro, confirmação de e-mail e recuperação de senha — também precisam funcionar sem sessão.
- Perfis, listas e demais telas do produto não são públicas nem indexáveis na decisão atual. Se isso mudar, rever simultaneamente o roteamento do frontend e as autorizações das leituras no backend.
- O cookie CSRF e as sessões continuam sendo responsabilidade do contrato existente da API; não remover a proteção para contornar problemas de integração.

## Fontes de verdade e como consultá-las

Ao criar ou alterar uma tela, siga esta ordem:

1. Instrução mais recente do usuário para preferências ou decisão de produto.
2. `telas-reqs-definitivo.md`, a cópia local nesta raiz, para telas, dados, ações, erros e chamadas esperadas.
3. `design-system/README.md`, `design-system/tokens.json`, `design-system/principios-de-design.md` e os README de componentes para regras visuais.
4. O protótipo HTML correspondente em `watchwise-prototype/` para composição e comportamento visual.
5. O contrato OpenAPI ou a implementação publicados pelo repositório separado da API, somente quando acessíveis por uma cópia de trabalho independente ou fornecidos como referência.

O backend permanece em seu próprio repositório e não deve ser alterado como parte de uma tarefa do frontend. A cópia local de `telas-reqs-definitivo.md` documenta o contrato esperado pelas telas; trate-a como um snapshot que pode precisar ser reconciliado com mudanças futuras da API.

As chamadas de cada tela ficam limitadas aos endpoints listados na seção correspondente de `telas-reqs-definitivo.md`. Um endpoint documentado para outra tela, disponível no OpenAPI ou já usado em outro componente não autoriza seu uso nesta tela. Se os endpoints listados não fornecerem um dado necessário, descreva ao usuário o caso concreto e o que é necessário para atender ao comportamento pedido: quais dados ou capacidades faltam, qual comportamento fica limitado, por que isso ocorre e como o endpoint alternativo resolveria a necessidade. Identifique esse endpoint e pergunte se ele autoriza usá-lo. Aguarde a autorização explícita antes de adicionar ou chamar o endpoint. Sem autorização, mantenha a tela nos endpoints previstos e informe a limitação. Se a rota, campo, erro ou regra necessária não estiver documentada em nenhum lugar, não invente contrato: registre a lacuna e solicite a atualização ao responsável pelo repositório da API. Se o contrato publicado e a cópia divergirem, documente a diferença antes de conectar a tela e mantenha mudanças do backend separadas.

Os arquivos `design-system/` e `watchwise-prototype/` estão no `.gitignore` atual. São referências locais: use-os quando existirem, sem removê-los do ignore ou forçá-los para um remoto sem pedido do usuário. Em um clone sem esses materiais, diga que não estão disponíveis e não os reconstrua de memória.

## Arquitetura Angular

Organize o código por área de produto. Mantenha a composição visual compartilhada em `shared`; cada feature mantém suas páginas, componentes e serviços próximos.

```text
src/app/
  core/                 configuração, sessão, cliente HTTP e interceptors
  layout/               layout público e layout autenticado
  shared/               componentes visuais, diretivas e utilitários comuns
  features/
    explore/            apresentação pública do Watchwise
    auth/               login, cadastro, confirmação e recuperação
    home/
    search-content/
    profile/
    diary/
    ratings-reviews/
    watchlist-dropped/
    lists/
    social/
    notifications/
    summary-calendar/
    picks/
    games/
    imports/
    settings/
  app.routes.ts
```

- Use componentes standalone e `@angular/router`. Carregue features sob demanda pelas rotas para evitar enviar o app inteiro no primeiro acesso.
- Agrupe os subtipos de uma área no mesmo domínio, sem criar uma pasta de topo para cada uma das cerca de quarenta telas.
- Use serviços tipados por domínio para comunicar com a API; componentes apresentam estado e despacham ações, sem montar URLs nem duplicar regras de negócio.
- Use Signals para estado local da interface e RxJS/`HttpClient` para operações assíncronas. Não adicione um store global até existir estado compartilhado que justifique essa dependência.
- Use Reactive Forms em formulários complexos, com validação e mensagens próximas do campo correspondente.
- Guards de rota protegem a navegação e evitam telas privadas durante o carregamento; nunca substituem autorização no backend.
- Preserve estados explícitos de carregamento, vazio, erro, `PARTIAL` e `UNAVAILABLE` quando previstos pelo contrato da tela. Paginação, ordenação, visibilidade e agregações devem vir do servidor.

## Rotas e renderização

- Pré-renderize `/explore` como página pública com conteúdo real de apresentação, título, descrição e links úteis. Use o design system para construí-la.
- Renderize as features autenticadas no cliente. Não faça SSR de todas as telas; elas mostram dados pessoais e o usuário decidiu que não são indexáveis.
- Mantenha login, cadastro, confirmação de e-mail e recuperação de senha acessíveis sem sessão. Proteja o restante da área do produto no router e trate `401` como sessão ausente/expirada.
- Configure fallback SPA para rotas Angular ao servir arquivos estáticos. As rotas de API devem ser encaminhadas ao backend, nunca respondidas pelo fallback da página.
- O Worker encaminha chamadas relativas sob `/api/v1` à API do Watchwise. Preserve o prefixo `/api/v1`; não remova ou duplique o contexto do servidor. No desenvolvimento local, configure o proxy do servidor Angular para a API local com o mesmo caminho.

## Integração segura com a API

- Use apenas URLs relativas sob `/api/v1`; não fixe o domínio Heroku no código do navegador.
- A API usa cookies de sessão `access_token` e `refresh_token` `HttpOnly`. Não leia, copie nem guarde esses tokens em `localStorage`, `sessionStorage` ou Signals persistidos.
- A proteção CSRF usa o cookie `XSRF-TOKEN` e o cabeçalho `X-XSRF-TOKEN`. Configure o `HttpClient` Angular com esses nomes e use pedidos same-origin.
- **Bloqueio atual de integração, a tratar no repositório separado da API:** a API usa o caminho `/api/v1` no cookie CSRF, mas o frontend abre a página em `/explore`. O interceptor XSRF do Angular lê o cookie da página; o caminho do cookie impede essa leitura. Antes de permitir mutações protegidas, combine com a implementação da API para definir o caminho do cookie CSRF como `/` e também apagar o cookie com o mesmo caminho, ou acordem outra forma segura de disponibilizar o token. A integração do frontend deve acompanhar a mudança acordada; não modifique o backend a partir deste repositório. Não desligue CSRF nem tente fabricar/injetar o cabeçalho no Worker.
- `POST /auth/oauth/google` recebe um ID token do Google. Não implemente callback de redirecionamento sem uma decisão nova de contrato. O Client ID do Google é público; Client Secret, chave TMDB, Resend, JWT, banco e credenciais R2 nunca entram no bundle do frontend.
- O backend continua sendo a fonte de verdade para privacidade, bloqueios, seguidores, seleção de conteúdos, pontuação, regras de jogos e estado de importação.
- Mensagens `ApiError` são mapeadas para apresentação em português. Não apresente stack traces, chaves de storage, tokens ou mensagens internas do servidor.

## Uploads e conteúdo externo

- Imports são enviados à API como `multipart/form-data`; limite de arquivo atual: 50 MiB. Não envie arquivos diretamente ao R2 nem inclua credenciais R2 no navegador.
- Para uma barra de progresso de upload, o `HttpClient` Angular padrão baseado em Fetch não fornece eventos de progresso. Isole a implementação XHR ao serviço de upload se o protótipo/requisito exigir progresso; não altere globalmente o backend HTTP sem verificar o efeito sobre pré-renderização.
- Envie `FormData` sem definir manualmente `Content-Type`, permitindo que o navegador gere o boundary multipart. Respeite preview, seleção, resolução, confirmação, retry e cancelamento conforme o contrato.
- Dados TMDB são obtidos pela API. Não chame TMDB diretamente do navegador e não duplique no cliente dados que a resposta já entrega.
- O backend guarda referências leves a conteúdos, não catálogo TMDB. `UserList` (lista criada pelo usuário) é diferente de `Watchlist` (quero assistir); mantenha rótulos distintos na interface.
- Diário registra eventos efetivos de MOVIE/EPISODE. Conclusão de SERIES/SEASON é derivada desses eventos; ratings e reviews são recursos próprios.

## Design system e acessibilidade

- Antes de compor componentes, leia os tokens e princípios. Use os nomes semânticos de cor/spacing/tipografia em `design-system/tokens.json`; não substitua tokens por cores ou valores arbitrários.
- O design system documenta modo escuro, fonte Inter, conteúdo centralizado e variantes/estados dos componentes. Reutilize as decisões aprovadas; ajuste layout conforme a referência de desktop/tablet/mobile correspondente.
- A interface deve funcionar em telas pequenas e grandes, com foco visível, navegação por teclado, HTML semântico, labels visíveis e feedback além da cor. Respeite `prefers-reduced-motion`.
- Use strings localizáveis desde o início. `pt-BR` é o locale entregue primeiro; mantenha chaves e catálogos preparados para `en` sem traduzir os protótipos de forma cega.
- O README do design system ainda descreve inglês como idioma do produto. A decisão posterior do usuário para o lançamento é português do Brasil; aplique essa decisão mais recente e não copie o texto inglês dos protótipos como copy final.

## Trabalho com o protótipo

- `watchwise-prototype/telas/index.html` lista as referências desktop. Consulte a tela equivalente em `mobile/`, `tablet/` e `notebook/` quando ajustar breakpoints.
- Os arquivos `.dc.html` são protótipos exportados, não páginas de produção. Reimplemente-os como componentes Angular; não carregue a página por iframe, não use `support.js` como API e não copie dados estáticos de demonstração para telas reais.
- Aplique tokens e componentes de `design-system/` à implementação, mesmo quando um `.dc.html` tiver estilos inline ou um estado que contradiz o sistema. Se houver contradição visual, explique qual referência está divergindo e siga a decisão explícita mais recente do usuário.

## Verificação e estado do projeto

- Atualmente não há `package.json`, `angular.json`, arquivos em `src/` nem testes de frontend nesta pasta. Não invente scripts de build/teste e não execute comandos do protótipo como se fossem o app.
- Ao inicializar Angular, registre a versão escolhida, scripts reais, proxy de desenvolvimento e testes aqui. Use a CLI/estrutura indicada pelas decisões atuais e verifique a compatibilidade do build Cloudflare antes de adicionar adaptadores.
- Para cada feature, valide o fluxo feliz, sessão expirada/401, erros do API contract, loading/empty, autorização no servidor e layout mobile/desktop. Para a landing pública, valide HTML inicial, title/description/canonical, conteúdo rastreável e `noindex` nas rotas autenticadas.
- Os comandos de build e teste só devem ser documentados depois que existirem no `package.json` real. Não invente scripts nem execute os `servir.bat` do protótipo como se fossem o aplicativo.

## Git, commits e publicação

- O repositório remoto do projeto é `https://github.com/lucasccesar/watchwise-front`.
- Trabalhe em um clone existente de `https://github.com/lucasccesar/watchwise-front`. Se a sessão começar na pasta de referências sem metadados `.git`, clone o repositório existente em outra pasta e preserve esta pasta. Não execute `git init`, não crie um segundo remoto e não sobrescreva o repositório remoto.
- Antes de editar código numa cópia Git, confira `git status --short --branch`, `git branch --show-current` e `git remote -v`. Preserve alterações que já existam; não descarte trabalho alheio.
- Agrupe alterações pequenas e relacionadas em commits que formem um conjunto revisável; não faça um commit por arquivo ou por ajuste visual isolado.
- Após cada implementação e durante trabalhos longos, revise `git status` e o diff pelo menos a cada 60 minutos de trabalho ativo ou quando se acumularem cerca de 4 pequenas correções, o que ocorrer primeiro. Se houver mudanças coerentes e verificáveis, faça um commit local agrupado nesse checkpoint, mesmo que elas não componham uma feature grande. Não deixe várias alterações concluídas acumularem indefinidamente à espera de uma entrega maior.
- Antes de cada commit, confirme que o conjunto está revisável, rode as verificações disponíveis e revise o diff. Se uma funcionalidade maior ainda estiver em andamento, faça checkpoint apenas de partes coerentes que já estejam funcionando; mantenha fora do commit alterações incompletas ou inconsistentes e reavalie no próximo checkpoint.
- Se a tarefa tiver unidades funcionais independentes, faça um commit local por unidade concluída. Preserve commits existentes e não reorganize ou una commits sem pedido explícito.
- Preserve commits já existentes. Só reorganize ou una commits quando o usuário pedir explicitamente.
- Use Conventional Commits em uma linha: `type(scope): descrição curta`, por exemplo `feat(profile): add public profile screen`. Sem corpo explicativo, a menos que um detalhe indispensável não caiba no assunto. Descreva a mudança; não escreva justificativa ou plano no assunto.
- **Todo commit deve ser sem coautoria.** Não inclua trailer `Co-Authored-By`, coautor, nem atribuição a IA ou ferramenta na mensagem ou nos trailers do commit.
- Depois de cada commit, confira `git log -1 --format=%B` e informe explicitamente que ele não contém coautoria ou atribuição a IA/ferramenta.
- Revise `git diff --check`, o diff e os arquivos staged antes de cada commit. Adicione caminhos explícitos; não use `git add .` nem `git add -A`.
- Mudanças somente em documentação — incluindo `AGENTS.md`, `README.md` e arquivos do design system — ficam sem commit por padrão. Só crie commit documental quando o usuário pedir explicitamente.
- Nunca faça `git push`, inclusive para `main`, sem autorização explícita do usuário para aquele push. Autorização anterior para outro repositório ou tarefa não se aplica.
- `design-system/` e `watchwise-prototype/` estão ignorados pelo `.gitignore` atual. Não use `git add -f` nesses diretórios nem os publique sem pedido explícito.
