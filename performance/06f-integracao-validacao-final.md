# 6F — Integração definitiva e validação final

As alterações aprovadas foram versionadas em branches locais de integração. O backend compilado é equivalente ao aprovado na 6B.5. O frontend foi recompilado com as 13 otimizações, as correções e os testes aplicáveis. O lote paralelo P01 ficou fora dos commits e continua íntegro no candidato combinado. Essa separação produziu um build Angular diferente do artefato combinado da 6C.2. O escopo selecionado passou nos 211 testes Angular.

## Branches e commits

| Repositório | Branch local preparada | Base | Situação da original |
| --- | --- | --- | --- |
| Backend | `integration/watchwise-6f` | `7105887810a69aa51d017fad1bd4129ff65aeb4f` | `main` no mesmo commit da base, com alterações locais preservadas |
| Frontend | `integration/watchwise-6f` | `baadc3b8b48eaf9da4bad236ef6b46c999cd13ab` | `main` em `c7685599062c129458809c64624b5e404133a6ad`, com alterações locais preservadas |

No frontend, a base incorpora os três commits já presentes na referência local de `origin/main`. No backend, a base coincide com a referência local. Nenhuma consulta remota foi necessária. Os commits foram criados nos worktrees dedicados da 6F, com índices próprios. Atualizar as `main` usadas pelas árvores originais exigiria tratar alterações locais sobrepostas. As branches de integração são as referências preparadas para a revisão de publicação.

| Repositório | Lote | Hash | Mensagem |
| --- | --- | --- | --- |
| API | B01 | `299bda6b7c0cbc69601072009366b46809150481` | perf(feed): reduzir consultas e montagem de previews |
| API | B02 | `8a463bba05f058bc4d376a6b6a4ae7d7a6602c0b` | perf(picks): publicar totais e cartões resumidos |
| API | B03 | `8ca6977058262c83a3e97f94b973b3a6ed74d52e` | perf(social): projetar linhas para seguidores e seguindo |
| API | B04 | `730196dea3587f82e0ca4acd7ac72cb50719fcc9` | perf(summary): separar resenhas e fundo de notificações |
| API | B05 | `c9c99f0ebe3ce3573bebcc20864e028224022c91` | perf(watchlist): incluir gêneros globais sob demanda |
| API | B06 | `ebd0d2769efb3d35d8ed25193ad908489ab9e258` | fix(diary): qualificar filtros da timeline e validar notas |
| API | B07 | `504d681a20066dfce99c6116c107e798be64f615` | fix(lists): preservar associações, exclusão e paginação visual |
| API | B08 | `75bffe638fb05ed04458acaaccb2aa18e8c8925f` | feat(auth): adicionar identidade leve e normalizar rememberMe |
| API | B09 | `75572c78e2bf5c1d0bec6a9b6f12ff5c4a9193d5` | test: isolar bootstrap e recuperar a cobertura de integração |
| API | B10 | `6ac753f639c2ea811bad96670472a875d6849b11` | build(benchmark): isolar observação e replay do artefato produtivo |
| Angular | F01 | `ff5dd81df49b178f5b7734214d51e80f8940ad6e` | perf(picks): consumir totais e cartões resumidos |
| Angular | F02 | `caa8a472c6f1092de26de409699fa16db4ae6863` | perf(templates): antecipar opções após detalhe autorizado |
| Angular | F03 | `a4926eb26b39c244cd526f7520cefb368a222e2f` | fix(templates): numerar categorias a partir de um |
| Angular | F04 | `4774612cf14e467d224b9b004f11c2a5c7fe606e` | perf(diary): paginar timeline e compartilhar resumo de atividade |
| Angular | F05 | `c28c7f6d7c6d3f6c3fd1d2261cb5ea660fd2123e` | perf(watchlist): usar gêneros da página na lista e no Perfil |
| Angular | F06 | `33d04ebbb5687e8880c2cf1e162ba62729740cbf` | perf(notifications): buscar apenas o fundo do banner |
| Angular | F07 | `0763345f1e0bbac91619475ee5fe559418286308` | perf(auth): restaurar sessão com identidade leve |
| Angular | F08 | `000342a1d5cc5c80af8287522c37a32a96869978` | fix(episode): enviar remoção explícita de comentário |
| Angular | F09 | `eb32ebb566a0d785657fdcd042cb1c3f5c43c26a` | test: restaurar providers e mocks dos fluxos Angular |
| Angular | F10 | `07efe0ee942dfc60437623a682c1eb337fb9faf0` | chore(benchmark): preservar núcleo Playwright reutilizável |
| Angular | F09 · complemento | `f9763449dca46a78fddbe097167f88076a33b8dd` | test(share-preview): prover dependencias do componente no spec |
| Angular | F11 | Commit que adiciona este relatório | `docs(performance): consolidar evidencias e integracao local` |

O hash de F11 pode ser consultado com `git log --format=%H -1 -- performance/06f-integracao-validacao-final.md` na branch de integração. P01 foi omitido da série. O complemento de F09 recuperou os providers de teste de Share Preview que o CSV da 6E agrupava com as alterações paralelas. São sete linhas novas no spec, com as mesmas assertions. A primeira execução Angular mostrou as sete falhas de injeção que essa seleção resolveu.

## Escopo versionado e preservação

- **Backend** · Projeções de Feed e Seguidores/Seguindo, totais e listagem resumida de Picks, resumos dedicados, gêneros da Watchlist, médias de Detalhe de lista e identidade de sessão. As correções de Diário, associações, tombstones e autenticação foram preservadas. O conteúdo de produção, recursos, testes selecionados e configuração Maven coincide com o candidato, desconsiderando a conversão LF/CRLF. O perfil de observação, seus testes e os dois scripts reutilizáveis de replay foram versionados no lote B10.
- **Angular** · Foram selecionados os consumidores dos contratos aditivos, a antecipação de opções de Templates, a correção de `displayOrder`, a correção de remoção de comentário, os testes de regressão, o núcleo Playwright e a documentação revisada. Watchlist principal e Perfil enviam `includeGenreOptions=true`, usam as opções da própria página e mantêm a eliminação do GET auxiliar. Os contratos completos de Picks e sessão permanecem no backend.
- **Trechos mistos** · A comparação com a 6C.2 isolou diferenças de fonte produtiva em `pick-template.component.ts`, `diary.component.html`, `profile.component.ts` e `watchlist.component.ts`. São os trechos reservados de atualização e apresentação da comunidade, UI de rewatch, estados do Perfil e avaliação após registro. Os specs de sessão e fundo de Notificações diferem apenas por linha em branco no final. Outros 43 caminhos exclusivamente paralelos ficaram fora da seleção. O candidato combinado e as árvores originais conservam esses conteúdos.
- **Documentação** · Foram preparadas 44 cópias de publicação, além deste relatório. Links locais puderam ser ajustados em 163 referências. Outras 542 referências a evidências externas à seleção foram convertidas em menções ao acervo local. Os documentos históricos originais foram mantidos. Os diffs staged foram conferidos por caminhos e conteúdo, passaram em `git diff --cached --check` e foram triados por padrões de credenciais e caminhos pessoais. Backups, arquivos de credenciais, catálogos locais, logs brutos, caches, binários e configuração pessoal ficaram fora dos commits.

As 13 otimizações contempladas permanecem nas mesmas classificações. As otimizações 1–4, 7–8, 10 e 12 têm manutenção definitiva no escopo avaliado. As otimizações 5–6, 9, 11 e 13 mantêm suas ressalvas de resultado ou cobertura. A validação de integração local sustenta preservação do código correspondente. As decisões de desempenho continuam apoiadas nos recortes históricos. [Índice e evidências individuais](README.md) · [Decisão 5R1](05r1-avaliacao-continuidade-projeto.md)

## Validação dos artefatos

| Artefato | SHA-256 da 6F | Comparação |
| --- | --- | --- |
| JAR de produção | `9f02f9931bb40d6acf91be222ba377ab54764ff69fd7a1196be149a7719b247f` | 2.069 entradas de arquivo. Somente o POM embarcado difere em bytes por LF/CRLF. Zero classes de instrumentação. |
| JAR de benchmark | `be5f6c14aa44874839e5a957211185b742b933b1de754db94b2f7f82a886bc50` | 2.075 entradas de arquivo. Mesma diferença no POM, com as seis classes esperadas de instrumentação. |
| Build Angular de produção | `78ddb96725cbd1eee1e6ac12adb5b7dae5863cb595f0b666ae17790b07317f37` | Manifesto dos 88 arquivos. Treze têm mesmo caminho e bytes que na 6C.2. A equivalência binária do build combinado não se aplica ao escopo reduzido da 6F. |

Os JARs foram compilados com Java 21 e Maven em modo offline, nos perfis padrão e `benchmark-observation`. A comparação foi feita por nomes e SHA-256 dos arquivos internos. As diferenças de hash global incluem o empacotamento ZIP. Depois de normalizar as quebras de linha do único arquivo diferente, ambos os conteúdos conferem com suas referências. O JAR de benchmark contém `BenchmarkObservationConfiguration`, `BenchmarkRequestFilter` e as classes internas `Measurement`, `Scope`, `SqlEvents` e `SqlEvents$Execution`. Os quatro testes do perfil passaram separadamente.

O build Angular de produção foi executado no worktree da branch, com as dependências locais já disponíveis. Os **211 testes** do recorte `src` passaram, sem falhas ou ignorados. Os 211 casos conferem por nome, arquivo e resultado com a 6C.2. Os oito avisos CSS ocorreram nos mesmos arquivos da aprovação anterior. O orçamento ficou intacto. As diferenças de UI em relação ao candidato combinado decorrem da separação de P01. Os 32 cenários de navegador são evidência histórica da composição combinada na 6C.2. A 6F não reexecutou essa matriz. Também não foi necessário repetir a suíte completa do backend porque as fontes e o conteúdo compilado correspondente conferiram.

Os novos artefatos permanecem nas saídas `target` e `dist/watchwise/browser` dos worktrees de integração. Os artefatos aprovados da 6B.5, 6C.1 e 6C.2 foram preservados e seus hashes conferidos. O manifesto e os logs da 6F permanecem no acervo local de controle. [Validação 6B.5](06b5-revalidacao-completa-final.md) · [Validação 6C.2](06c2-revalidacao-funcional-final.md)

## Ressalvas e prontidão

O host disponibiliza apenas a distribuição WSL de infraestrutura do Docker Desktop. Nenhum ambiente de validação POSIX dedicado compatível foi identificado. Continuam pendentes três testes, dois que dependem da criação real de links simbólicos e um que exige atributos POSIX. A lista e o alcance das verificações estão na [6B.5](06b5-revalidacao-completa-final.md#testes-ignorados). A preparação de um ambiente POSIX dedicado fica condicionada à autorização específica. A comparação binária com o Angular histórico da 6B.3 permanece indisponível, e os oito avisos CSS continuam registrados.

**Decisão local.** Backend aprovado pela equivalência compilada. Frontend aprovado nos testes e no build do escopo de integração, com a ressalva de que a evidência integrada de 32 cenários corresponde ao candidato combinado. As branches locais estão prontas para revisão de publicação como conjunto selecionado. A promoção de `main`, o push e o deploy ficam fora desta execução. Para iniciar a Fase 7, usar as referências versionadas que forem aprovadas para publicação e registrar se a verificação funcional complementar da composição Angular entregue e a cobertura POSIX serão exigidas como condição de entrada. Nenhuma execução da Fase 7 foi iniciada.
