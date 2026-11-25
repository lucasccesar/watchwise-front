# 6C.1 — Correção e revalidação da criação de Templates

**O bloqueio de criação de Templates identificado na 6C foi resolvido.** A rodada integrada final aprovou os cinco cenários direcionados de Templates e os seis controles de sessão. Foram registrados zero HTTP 400 e zero exceções JavaScript nessa rodada. A decisão de avançar para a 6D fica para a revalidação final da 6C. [Relatório da 6C](06c-validacao-funcional-integrada.md) · Resultado final Playwright [acervo local (results-templates.json)]

## Causa-raiz e correção

O formulário usava o índice do array como `displayOrder`. A categoria inicial recebia zero apesar de ser exibida como categoria 1. O DTO de criação exige `@NotNull @Positive` e o de edição exige `@Positive` quando o campo é enviado. O OpenAPI documenta mínimo 1 para ambos. Os serviços persistem a ordem recebida e as telas de detalhe e resposta ordenam numericamente por grupo.

A busca nas fontes Angular encontrou um único ponto que atribui o campo no payload de criação, em `PickCreateComponent.submit()`. Ele agora envia `index + 1` sobre o rascunho final, preservando a ordem relativa e os grupos, inclusive para rascunhos importados. As opções fixas mantêm o payload de `target`. O DTO de opções não define `displayOrder` e não apresentou incompatibilidade equivalente. A validação do backend foi preservada.

- [pick-create.component.ts](../src/app/features/picks/pages/pick-create/pick-create.component.ts) contém a alteração produtiva de uma linha.
- [pick-create.component.spec.ts](../src/app/features/picks/pages/pick-create/pick-create.component.spec.ts) verifica payload e navegação da criação com uma categoria, remoção e reinserção em outra posição e ordem e grupos de categorias de um rascunho importado.

## Validação

| Recorte | Resultado |
| --- | --- |
| Teste de regressão antes da alteração | Três falhas. O componente emitiu ordens a partir de zero. Log [acervo local (angular-red.log)] |
| Angular, funcionalidades de Picks | 25 aprovados em cinco arquivos, incluindo os três novos casos e os controles de detalhe, seleção de episódio, Explorar e Meus Picks. Log [acervo local (angular-green.log)] |
| Controles Java | 27 aprovados em validação da criação, controller e serviço de categorias e serviço de opções. Log [acervo local (backend-controls.log)] |

### Playwright com Angular, API e PostgreSQL reais

| Cenário | Resultado observado |
| --- | --- |
| Criação com uma categoria | Formulário enviou ordem 1, recebeu HTTP 201 e abriu o detalhe criado. |
| Criação com várias categorias | Após remover a intermediária, as duas categorias restantes foram enviadas com ordens 1 e 2. HTTP 201. As duas opções fixas foram enviadas como targets e apareceram no detalhe. |
| Edição e reordenação | O CRUD de categorias publicadas foi exercitado por REST no contexto autenticado do Playwright, pois a interface atual não oferece esses controles. Edição do modelo e reordenação retornaram 200, inclusão retornou 201 e remoção retornou 204. O detalhe Angular mostrou a descrição revisada e a nova ordem, com os IDs originais preservados. |
| Busca e detalhe | A busca em Recentes retornou 200, com duas categorias no modelo criado. A navegação pelo cartão mostrou o detalhe com a ordem atualizada. |
| Publicação | O Angular publicou um Pick no modelo criado. HTTP 201, duas respostas renderizadas e progresso `COMPLETE` na API. |

Ajustei o roteiro para aguardar a renderização de cada linha do rascunho e selecionar a opção fixa pelo controle `role=option`. As tentativas intermediárias ficaram registradas. O limite de cadastro devolveu HTTP 429 após novas contas de teste no primeiro ambiente. Usei um segundo ambiente descartável sem alterar a política da aplicação. O recorte final foi executado em Chromium 159.0.8154.6. Os 32 cenários da 6C não foram repetidos. Roteiro [acervo local (templates.mjs)] · Primeira tentativa [acervo local (results-first.json)] · Limite de cadastro [acervo local (results-registration-limit.json)] · Resultado final [acervo local (results-templates.json)]

## Artefatos, integridade e encerramento

- Build Angular de produção com 88 arquivos, em dist/6c1/artifacts/browser [acervo local (browser)], fora do cache. SHA-256 do manifesto da árvore [acervo local (angular-tree.sha256)] `e209b74b52ef5b20f1344cb7d8ccbf20fd2ca17305599d9670a9706a11b85007`. Os oito avisos CSS mantiveram os mesmos arquivos, limites e tamanhos da 6B.5. Log do build [acervo local (angular-build.log)]
- O JAR produtivo da 6B.5 foi reutilizado, com SHA-256 `1dc93daa55362d823d2c9be08f605499524a553c67d3d6e3713aa005ecf09217`. O diff produtivo do frontend ficou restrito à numeração de criação. A antecipação das opções em Templates, a contagem de Explorar e a projeção de Meus Picks permaneceram intactas. Os controles direcionados cobriram esses fluxos. O conjunto das 13 otimizações foi preservado.
- Os dois PostgreSQL `postgres:16-alpine` tiveram portas dinâmicas e datasource verificado antes das 104 migrations. Foram usados somente contas sintéticas e fixtures locais de mídia. As portas protegidas ficaram fora da execução. O encerramento confirmou zero processos, containers e volumes dos dois ambientes. Guard inicial [acervo local (datasource-final.log)] · Guard final [acervo local (datasource-second.log)] · Encerramento inicial [acervo local (cleanup-first.json)] · Encerramento final [acervo local (cleanup-final.json)]

## Recomendação para a revalidação final da 6C

Usar o novo build Angular e o mesmo JAR produtivo. A validação dirigida removeu o bloqueio de Templates. Permanecem as ressalvas dos três testes de armazenamento dependentes de POSIX ou links simbólicos e a comparação binária do Angular com a cópia histórica perdida da 6B.3. As árvores originais e o trabalho paralelo foram preservados. A 6D permanece pendente.
