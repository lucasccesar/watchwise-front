# 6D — Organização dos artefatos e documentação

A 6D organizou as evidências do candidato aprovado na 6C.2. As 13 otimizações, as correções posteriores e o trabalho paralelo foram preservados. O [índice do projeto](README.md) consolida decisões, evidências e as 24 telas da Fase 7. O [inventário CSV](06d-inventario-versionamento.csv) reúne 466 registros de arquivos alterados, referências de benchmark e famílias de saídas locais. As linhas de famílias representam conjuntos, sem enumerar arquivos internos de dependências, dados ou caches.

## Organização e versionamento

| Grupo | Local e tratamento |
| --- | --- |
| Produto e testes | Alterações e arquivos novos do candidato foram inventariados por caminho com o estado Git encontrado na entrada. Versionar alterações e regressões correspondentes em lotes coerentes, com revisão por trecho nos arquivos mistos. |
| Núcleo Playwright | Foram copiadas 14 fontes e arquivos do pacote para `performance/benchmarks/` no candidato. O conjunto inclui runner, cenários, helpers, verificação de integridade, observação de replay, servidor estático e lockfile. As cópias conferem com a origem em SHA-256. |
| Replay e instrumentação | Foram copiados `benchmark-fixtures/tmdb-replay.mjs` e `tmdb-hierarchy.mjs` para o candidato backend, com hashes iguais aos da origem. A observação continua no perfil Maven `benchmark-observation`. A inspeção da 6B.5 encontrou zero classes de instrumentação no JAR produtivo e seis no de benchmark, cujos hashes conferiram nesta etapa. |
| Lançadores, fixtures e protocolos | Os demais scripts, SQL, manifestos e auxiliares específicos de rodada permanecem onde os relatórios apontam. O CSV marca esses caminhos para revisão de guards e dependências antes de eventual versionamento. O manual original explica instalação, ambiente e metodologia. Os resultados históricos registram H, escopos frio e interno, replay e limites de comparação. |
| Documentação e resultados | Índice, relatório e inventário são candidatos a versionamento. Os relatórios históricos originais permanecem com seus caminhos e conteúdo. Resumos e matrizes podem ser selecionados após revisão de sensibilidade e portabilidade dos links. |
| Logs, bruto e configuração local | Os candidatos ganharam regras de ignore com escopo local. No frontend, `performance/benchmarks/results/` preserva visibilidade de resumos em Markdown e mantém os demais resultados fora da seleção padrão. `dist/`, área `.local`, caches e ferramentas baixadas permanecem locais. No backend, `target/` já cobre as saídas, e foram acrescentadas regras para diretórios e configuração local de benchmark. |
| Trabalho paralelo | O inventário sinaliza caminhos sobrepostos e candidatos a lote separado. Perfil e mapa de episódios, CSS e componentes compartilhados são exemplos na árvore frontend. Arquivos mistos como Diário, Watchlist, OpenAPI e o leitor de listas exigem atribuição por trecho. A 6D manteve o conteúdo e o índice já existentes, sem tentar separar alterações por substituição integral de arquivos. |

A separação nesta etapa foi feita por cópias verificadas do núcleo e por classificação. Os resultados e executores históricos ficaram nos locais originais. O conjunto portátil ainda depende dos lançadores e condições dos protocolos selecionados. [Manual e lançadores originais](benchmarks/README.md) · [Auditoria 6A](06a-auditoria-final.md) · [Reconciliação 6A.1](06a1-preparacao-candidato-integracao.md)

### Credenciais e informações locais

O inventário aponta, sem valores, os arquivos de credenciais protegidas sob `target/` do backend, o diretório `.watchwise-private-backups/` informado pela etapa de backup e áreas locais de configuração. Nenhum backup ou arquivo de credenciais foi aberto ou copiado. Os dados brutos podem conter identificadores, metadados ou caminhos locais. Esses conjuntos não entram no lote de versionamento.

A triagem textual de documentação e infraestrutura sinalizou caminhos absolutos específicos da máquina nos relatórios 5A1 e 5A2. Os scripts locais da validação integrada também dependem de caminhos da máquina. A triagem por padrões e nomes serve à classificação do inventário. A revisão de sensibilidade dos arquivos selecionados permanece necessária antes da integração.

## Artefatos preservados

| Artefato | Local no worktree | SHA-256 |
| --- | --- | --- |
| JAR produtivo | Cópia da 6C.2 [acervo local (watchwise.jar)] e referência da 6B.5 [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | `1dc93daa55362d823d2c9be08f605499524a553c67d3d6e3713aa005ecf09217` |
| JAR de benchmark | Backend 6B.5 [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | `b9495cd6372342456ca111c5ca1d9fb17e2601eb94296d93cfac755e435a3a1d` |
| Build Angular | 6C.2 [acervo local (browser)] e 6C.1 [acervo local (browser)] | `e209b74b52ef5b20f1344cb7d8ccbf20fd2ca17305599d9670a9706a11b85007`, SHA-256 do manifesto da árvore |

O manifesto e os 88 arquivos Angular conferiram nas duas cópias. Os artefatos aprovados ficam fora do cache Angular. Os resultados funcionais permanecem em `dist/6c`, `dist/6c1` e `dist/6c2`. Os relatórios e saídas anteriores de benchmark mantêm as referências originais em `performance/benchmarks/.local` e `target/benchmark*`. Resultado integrado final [acervo local (results-all.json)] · [Validação da 6B.5](06b5-revalidacao-completa-final.md)

## Integridade e recomendação para a 6E

Os quatro estados Git foram comparados antes e depois. Os HEADs e os índices permaneceram iguais. As árvores originais conservaram o status e os hashes dos arquivos rastreados e não ignorados. Entre os arquivos preexistentes nos candidatos, a única mudança foi no `.gitignore` de cada repositório. As novas fontes reutilizáveis e os três documentos continuam sem staging. Código produtivo e testes mantiveram seus hashes. Nenhum banco, serviço, build, teste ou benchmark foi executado. Conferência de integridade [acervo local (verification.json)]

Na 6E, revisar por trecho os arquivos mistos, preparar lotes de produto e testes, ferramentas e documentação, e transportar apenas as evidências revisadas para a árvore integrada. Ajustar os links de revisão que apontam à árvore original quando os respectivos relatórios forem selecionados. Continuam pendentes os três testes de armazenamento dependentes de POSIX ou links simbólicos, a comparação indisponível com o Angular histórico da 6B.3 e os oito avisos CSS preexistentes. A 6E permanece pendente.
