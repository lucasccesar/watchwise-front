# 6C.2 — Revalidação funcional final do candidato

**Decisão: aprovado para a 6D com as ressalvas históricas registradas abaixo.** A suíte Angular aprovou **211 de 211 testes**. Os **32 cenários integrados originais** passaram em uma única execução, ante 31 na 6C. A criação de Template pela interface enviou ordem 1 para a primeira categoria, recebeu HTTP 201 e abriu o detalhe criado. Nenhuma regressão funcional foi identificada no recorte. A 6D permanece pendente. [6B.5](06b5-revalidacao-completa-final.md) · [6C](06c-validacao-funcional-integrada.md) · [6C.1](06c1-correcao-criacao-templates.md)

## Candidato e artefatos

| Artefato | SHA-256 e evidência |
| --- | --- |
| JAR produtivo [acervo local (watchwise.jar)] | `1dc93daa55362d823d2c9be08f605499524a553c67d3d6e3713aa005ecf09217`. Idêntico em SHA-256 ao JAR aprovado na 6B.5, com zero classes de instrumentação no pacote produtivo. |
| Build Angular da 6C.1 [acervo local (browser)] | `e209b74b52ef5b20f1344cb7d8ccbf20fd2ca17305599d9670a9706a11b85007` no manifesto [acervo local (angular-tree.sha256)]. Os 88 arquivos foram conferidos individualmente. |

As cópias qualificadas ficaram em `dist/6c2/artifacts`, fora do cache. A etapa usou os worktrees da 6A.1. O JAR conferiu com o da 6B.5 e a verificação das datas de modificação de `src/main`, `src/test` e `pom.xml` do backend não encontrou arquivos mais recentes que a validação registrada. A suíte completa do backend da 6B.5, com 5.265 aprovados e três ignorados, foi mantida como evidência. A 6C.2 fez uma nova validação funcional do mesmo binário.

As 13 otimizações foram preservadas pela identidade dos artefatos com as referências aprovadas. A diferença produtiva incorporada no frontend desde a 6B.5 é a numeração de categorias da 6C.1. A revalidação cobriu, entre outros caminhos, sessão leve, Feed, Watchlist com gêneros, detalhe de lista com médias, Explorar, detalhe com opções fixas e Meus Picks. O código de produção, os testes do projeto, as árvores originais e o trabalho paralelo ficaram intactos.

## Suíte Angular completa

| Etapa | Arquivos | Total | Aprovados | Falhas | Erros | Ignorados |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 6B.5 | 36 | 208 | 208 | 0 | 0 | 0 |
| 6C.2 | 37 | 211 | 211 | 0 | 0 | 0 |

O recorte foi `npm.cmd test -- src --reporter=json`, em UTC. Todos os 37 arquivos registrados pertencem a `src`. O cruzamento por arquivo e nome do teste confirmou que os 208 anteriores passaram. Os três novos casos da 6C.1 cobrem o payload de categoria única, a ordem após remover e reinserir e a preservação de ordem e grupos em rascunho importado. Duração do executor Angular de 4,94 s. JSON do Vitest [acervo local (angular.json)] · Log [acervo local (angular-test.log)]

## Matriz funcional

| Fluxo | 6C | 6C.2 | Evidência da nova execução |
| --- | ---: | ---: | --- |
| Autenticação e perfil | 6/6 | 6/6 | Login pelo formulário, cookie HttpOnly, identidade leve no reload, refresh 204 com rotação, perfil completo renderizado, logout e bloqueio de acesso anônimo. |
| Social, grafos e notificações | 8/8 | 8/8 | Privacidade antes do aceite e liberação para a conta autorizada. Feed em três páginas por cursor. Seguidores e Seguindo em páginas distintas. Notificação marcada como lida na interface e escrita de terceiro rejeitada. |
| Diário e resenhas | 4/4 | 4/4 | Registro e leitura paginada, resenha editada, nota persistida, cursor em ambas as ordens e dois episódios confirmados no grupo REST e no histórico visual. |
| Watchlist | 3/3 | 3/3 | Paginação, gêneros globais, ordenação e filtro. No Perfil, o resultado filtrado apareceu com dois GETs paginados e sem GET auxiliar de gêneros. A remoção persistiu. |
| Listas e médias | 2/2 | 2/2 | Lista mista criada. Detalhe paginado sem repetição e médias pessoal e pública atualizadas após a edição de nota. |
| Picks e Templates | 4/5 | 5/5 | Formulário criou Template com ordem inicial 1. Busca abriu o detalhe. Modelo revisado apareceu no Angular. Pick publicado pela interface e depois tornado privado continuou disponível para o dono. Quatro opções fixas foram hidratadas e a substituição de episódio conservou o progresso completo. |
| Progresso | 3/3 | 3/3 | Série avançou de um para dois episódios assistidos, com próximo episódio e contagem de restantes coerentes. Lista mista confirmou o agregado e exibiu a temporada expandida. |
| Importação de opiniões | 1/1 | 1/1 | Importação e reimportação Letterboxd via worker real. A reimportação preservou a única resenha, seu ID, a nota e a data, sem duplicação. |
| **Total** | **31/32** | **32/32** | Mesmos 32 identificadores de cenário. **Zero reprovados, bloqueados ou exceções JavaScript.** |

A interface atual oferece edição do rascunho de criação, com inclusão e remoção de categorias. Ela ainda carece de controles para editar ou reordenar categorias publicadas. O recorte original preservou a verificação de edição via REST e a conferência no detalhe Angular. A 6C.1 conserva a evidência complementar de reordenação de categorias publicadas, também via REST e com reflexo confirmado no navegador.

Houve zero HTTP 5xx. Os únicos 4xx foram o 400 deliberado de cursor inválido no Feed, 401 esperados na ausência de sessão ou de cookie e 403 esperados nas verificações de privacidade e destinatário. Nenhum HTTP 400 ocorreu na criação de Template. Resultados por cenário e registros HTTP [acervo local (results-all.json)]

## Isolamento

PostgreSQL 16 Alpine descartável em `127.0.0.1:55481`, banco `ww6c_e0bb26c350ac`. O guard JDBC confirmou o destino e a ausência de histórico Flyway antes da inicialização. A API aplicou 104 migrations. Chromium 159.0.8154.6 executou os fluxos com contas sintéticas e fixtures locais determinísticas. O navegador bloqueou solicitações de imagens e fontes externas. Referências ausentes no serviço de mídia local responderam localmente. As portas protegidas e o TMDB real ficaram fora da execução. A verificação final encontrou zero processos, containers e volumes remanescentes desta etapa. Guard JDBC [acervo local (datasource-final.log)] · Encerramento [acervo local (cleanup.json)]

## Ressalvas e recomendação

- Permanecem pendentes os três testes de armazenamento dependentes de POSIX ou links simbólicos, dois em `ImportTemporaryFilesTest` e um em `PrivateImportFileStoreTest`. Devem ser executados em ambiente compatível antes da integração definitiva.
- A comparação binária com o build Angular histórico da 6B.3 segue indisponível. O manifesto atual foi verificado contra a referência da 6C.1.
- Os oito avisos CSS preexistentes continuam documentados, com os mesmos arquivos, limites e tamanhos verificados no build da 6C.1.

Os critérios funcionais da 6C.2 foram satisfeitos. O candidato pode seguir para a 6D após autorização, usando os artefatos verificados e mantendo as ressalvas abertas.
