# Plano de benchmark

## Premissas
- Não há ferramenta E2E/performance configurada no checkout. A implementação futura deve escolher uma ferramenta e validar suporte a navegação SPA Angular, cookies HttpOnly e CSRF; a ferramenta escolhida é desconhecida.
- Cada cenário deve fixar usuário/dados, origem frontend/API, cache, navegador, viewport, tempo de espera de renderização e critérios de sucesso. Separar navegação inicial da chamada de ações opt-in.
- Sequência sugerida: validar ambiente e autenticação; criar smoke E2E por lote; capturar baseline serial; só então carga/concor­rência. Registrar request count, p50/p95/p99, erro, bytes e Web Vitals quando suportado.

## Lotes de telas (5–10 por lote)
1. **Conta e navegação básica (5):** `/login`, `/register`, `/forgot-password`, `/terms`, `/privacy`. Começar pelo login e caminho de sessão; rotas públicas sem dados autenticados.
2. **Páginas informativas e início (5):** `/community-guidelines`, `/help-contact`, `/home`, `/trending`, `/calendar`. Cobrir navegação pública e autenticada.
3. **Conteúdo (5):** `/content/movie/:tmdbId`, `/content/series/:tmdbId`, `/content/series/:tmdbId/season/:seasonNumber`, `/content/series/:tmdbId/season/:seasonNumber/episode/:episodeNumber`, `/diary/entry/:entryId`. IDs conhecidos e conteúdo preparado.
4. **Diário e progresso (5):** `/diary`, `/diary/reviews`, `/progress`, `/watchlist`, `/settings`. Capturar paginação/filtros em um cenário próprio.
5. **Listas (5):** `/lists`, `/lists/community`, `/lists/create`, `/lists/:listId`, `/lists/:listId/edit`. Usar listas seed; criação/edição separadas da leitura.
6. **Listas e conexões (5):** `/lists/:listId/progress`, `/users/:username`, `/users/:username/followers`, `/users/:username/following`, `/social`. Perfil privado/relação de follow deve ter fixtures definidas.
7. **Notificações e Picks (5):** `/notifications`, `/picks`, `/picks/explore`, `/picks/templates`, `/picks/templates/:templateId`. Leituras primeiro; interação em cenário separado.
8. **Picks (5):** `/picks/templates/:templateId/new`, `/picks/create`, `/picks/import`, `/picks/:pickId`, `/picks/...` (rota adicional desconhecida — revisar se recurso/jogo entrou no router antes de implementar). Observação: a rota de jogo atual redireciona; priorizar telas Picks mapeadas diretamente e definir o quinto caso após validar inventário.
9. **Fallback e completude (até 5):** `/` (redirect), `/**` (not found), rotas `/games`/`/games/play/:gameType`/`/games/ranking` (redirects; avaliar como transições, não páginas). Não contam como páginas benchmark de performance independentes.

## Ordem de implementação
1. Smoke de login/sessão e inicialização API/DB; confirmar credentials/CSRF e scripts de start.
2. Grupos 1–2 com métricas de navegação e estado autenticado.
3. Grupo 3 com fixtures de conteúdo válidas e aquecimento/cold cache separados.
4. Grupos 4–6 priorizando listas, diary, perfil e social com dados estáveis.
5. Grupos 7–8 (Picks); detalhar ações/mutações separadamente.
6. Redirects, not-found, relatório consolidado e limites de performance.

## Pontos a resolver na implementação posterior
- Escolha da ferramenta E2E/performance e local de execução: desconhecidos.
- Rota pública `/explore` não existe; rotas `games` redirecionam; considerar para escopo apenas mediante decisão do produto.
- Um agrupamento de 5 por Picks não corresponde a cinco telas concretas inequívocas; não inventar rota. Completar após decisão sobre telas de jogos ou usar 4 cenários nesse lote.
- Confirmar proxy efetivo no script de desenvolvimento e configurar ambiente de benchmark dedicado, seed, conta autenticada e telemetria.
