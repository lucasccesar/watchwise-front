# Benchmarks do WatchWise

Escopo inicial: Home e Minhas listas. O runner usa Chromium headless, Angular real e a API real através do proxy. Ele roda em série, usa login pelo formulário com a fixture benchviewer e mantém o estado de autenticação apenas em memória. A validação exige PowerShell 7, Node e o ambiente isolado preparado em 02-ambiente.md [acervo local (02-ambiente.md)].

## Instalação local

Na raiz do frontend:

```powershell
Set-Location performance/benchmarks
$localPath = (New-Item -ItemType Directory -Force .local).FullName
$env:npm_config_cache = Join-Path $localPath 'npm-cache'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $localPath 'chromium'
$env:TEMP = (New-Item -ItemType Directory -Force .local/tmp).FullName
$env:TMP = $env:TEMP
npm.cmd ci
.\node_modules\.bin\playwright.cmd install chromium --only-shell
```

## Execução

Com os serviços iniciados e fixtures instaladas, volte à raiz do frontend e execute:

```powershell
.\performance\benchmarks\Invoke-Benchmark.ps1 -Screens home,lists -Repetitions 2 -Warmups 0
```

O script verifica as portas, a conexão JDBC no banco watchwise_benchmark e o retorno de 401 sem sessão. Ele carrega a senha sintética do arquivo protegido no backend e passa o valor somente por variável de ambiente ao processo. Use localhost:5173 no navegador. A origem 127.0.0.1:5173 não está na configuração CORS dev e devolveu 403 no login em navegador.

Relatórios novos ficam em .local/results. Use -PublishValidation só quando quiser substituir a amostra em results. Escolha uma ou ambas as telas via -Screens. Aumente aquecimento e repetições apenas quando a etapa de benchmark estiver autorizada.

## O que foi validado

O Chromium fez login, verificou a Home com a identidade da fixture e o cartão do filme 550, abriu a lista privada esperada por navegação Angular e retornou à Home mantendo a sessão. O smoke e as oito amostras válidas estão em validation.json [acervo local (validation.json)]. O resumo está em summary.md [acervo local (summary.md)]. O preflight e a comparação de dados cobriram identidade e visibilidade dos usuários, entradas do diário, listas e itens. A autenticação emite tokens no banco e algumas leituras podem atualizar caches ou snapshots. Esses estados não estão na comparação.

## Como interpretar

- Cold usa um novo contexto autenticado com cache de navegador frio e navegação de documento. Internal usa um novo contexto, prepara a rota de origem e mede o clique no menu. Nenhum dos modos reinicia o backend, zera cache do servidor ou mede o login.
- O intervalo termina com resposta válida da API e elemento da fixture visível. O coletor observa falhas tardias por mais um segundo. Registra HTTP 4xx/5xx, falhas de rede, erros JavaScript e erros de console sem gravar mensagens brutas, queries, cookies ou corpos. Falhas de recursos visuais externos aparecem no diagnóstico quando observadas, sem invalidar automaticamente a medição de conteúdo.
- O JSON registra as chamadas de API do navegador, método, endpoint, status, duração observada, TTFB e bytes do corpo quando disponíveis. A duração usa o relógio da rede no navegador e inclui o caminho pelo proxy. Ela não representa o tempo de processamento interno do Spring. Métricas ausentes ficam nulas ou sem valor, por exemplo em requisição pendente ao fechar a janela de coleta.
- Duplicatas agrupam método e caminho normalizado. Queries ficam de fora. Uma sequência indica apenas que uma requisição terminou antes de outra começar. Ela não prova dependência.
- Aquecimentos e falhas ficam separados das amostras válidas. A mediana usa os valores centrais e o p95 usa o posto mais próximo. Com duas repetições, o p95 equivale ao máximo. A amostra verifica a execução, sem servir como baseline.
- A amostra usa Angular com configuração de produção servido por ng serve, Spring dev, execução local sem limitação artificial de rede e dados mínimos. Faltam volumes representativos, cenários alternativos e medições de processamento do servidor.

Cadastre novas telas em scenarios.mjs com rota, origem para navegação interna, endpoint esperado e critério de renderização baseado em fixture. Selecione as telas pelo runner.

## Etapa 3B

Na raiz do frontend, execute:

```powershell
.\performance\benchmarks\Invoke-Benchmark.ps1 -Screens 'diary,watchlist,social,notifications,calendar,movie' -Repetitions 2 -Warmups 0
```

A opção -PublishValidation grava a amostra deste grupo em results/etapa-3b [acervo local (summary.md)], preservando os arquivos de Home e Minhas listas. O cenário de Calendário espera o evento sintético de novembro de 2026 no mês inicial. O cenário de Filme abre a referência TMDB 550 pelo cartão da Home no modo interno.

## Etapa 3B, grupo 2

```powershell
.\performance\benchmarks\Invoke-Benchmark.ps1 -Screens 'progress,list-detail,profile,followers,following,my-picks' -Repetitions 2 -Warmups 0
```

Com -PublishValidation, os arquivos ficam em results/etapa-3b-grupo-2 [acervo local (summary.md)]. O wrapper confirma o alvo local, procura processos conhecidos de benchmark antes de iniciar e resolve o UUID da lista privada de benchviewer. Progresso, Seguidores e Seguindo são medidos apenas por abertura direta das URLs inventariadas. Outros três cenários também usam links reais da aplicação.

## Etapa 3B, grupo 3

```powershell
.\performance\benchmarks\Invoke-Benchmark.ps1 -Screens 'diary-reviews,diary-entry,series,season,episode,list-progress' -Repetitions 2 -Warmups 0
```

Com -PublishValidation, os arquivos ficam em results/etapa-3b-grupo-3 [acervo local (summary.md)]. O wrapper resolve UUIDs da resenha, da lista privada e das referências da hierarquia 1399/1/1 no PostgreSQL isolado. Progresso da lista verifica apenas o resumo compatível com a fixture atual, sem cartões de séries.

## Etapa 3B, grupo 4

```powershell
.\performance\benchmarks\Invoke-Benchmark.ps1 -Screens 'community-lists,list-create,list-edit,settings,picks-explore,pick-detail' -Repetitions 2 -Warmups 0
```

Com -PublishValidation, os arquivos ficam em results/etapa-3b-grupo-4 [acervo local (summary.md)]. O UUID da lista privada e do Pick vêm do banco isolado. A abertura da lista pública após a medição de Listas da comunidade aparece separada como followUp no JSON. Os cenários de formulário validam os campos sem submissão.

## Etapa 3B, grupo 5

```powershell
.\performance\benchmarks\Invoke-Benchmark.ps1 -Screens 'trending,picks-templates,template-detail,pick-fill,template-create,template-import' -Repetitions 2 -Warmups 0
```

Com -PublishValidation, o relatório é salvo em results/etapa-3b-grupo-5 [acervo local (summary.md)]. Para repetir apenas um modo, use -Mode cold ou -Mode internal. O wrapper resolve o UUID do template sintético no banco isolado. Os formulários são medidos sem publicação. Trending registra se exibiu títulos ou um estado vazio válido.

## Etapa 3B, grupo 6

```powershell
.\performance\benchmarks\Invoke-Benchmark.ps1 -Screens 'login,register,forgot-password,terms,privacy,community-guidelines,help-contact' -Repetitions 2 -Warmups 0
```

Com -PublishValidation, os resultados ficam em results/etapa-3b-grupo-6 [acervo local (summary.md)]. A seleção somente de telas públicas pula o smoke autenticado e usa contextos novos sem credenciais. O conjunto verifica a renderização e os links de navegação, sem submissões. A matriz consolidada [acervo local (fixtures-etapa-3c.md)] documenta o trabalho posterior.
