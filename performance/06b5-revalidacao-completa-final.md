# 6B.5 — Revalidação completa final do candidato de integração

**Decisão: aprovado com ressalvas para a 6C.** As três suítes terminaram com zero falhas e zero erros. Os 43 casos recuperados na 6B.4 passaram dentro da suíte completa. Três controles de segurança do armazenamento ficaram parcialmente ou integralmente sem cobertura pelas limitações do sistema de arquivos Windows. A comparação binária histórica do Angular também ficou limitada, conforme registrado abaixo. A 6C permanece pendente.

A execução usou somente os worktrees da 6A.1, backend `71058878` e frontend `baadc3b`, com as alterações locais do candidato preservadas. Nenhuma fonte, teste, regra de negócio ou configuração de produção foi editada. [6B.3](06b3-revalidacao-completa-candidato.md) · [6B.4](06b4-correcao-problemas-remanescentes-backend.md)

## Resultados completos

| Suíte | Etapa | Total | Aprovados | Falhas | Erros | Ignorados | Aprovação sobre o total | Duração |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Backend | 6B | 4.138 | 3.944 | 39 | 152 | 3 | 95,31% | 11 min 39 s |
| Backend | 6B.3 | 5.268 | 5.222 | 26 | 17 | 3 | 99,13% | 28 min 28 s |
| Backend | **6B.5** | **5.268** | **5.265** | **0** | **0** | **3** | **99,94%** | **27 min 18 s** |
| Angular | 6B | 208 | 160 | 48 | 0 | 0 | 76,92% | 4,03 s |
| Angular | 6B.3 | 208 | 208 | 0 | 0 | 0 | 100% | 5,10 s |
| Angular | **6B.5** | **208** | **208** | **0** | **0** | **0** | **100%** | **4,64 s** |
| Instrumentação | 6B | 4 | 4 | 0 | 0 | 0 | 100% | 57,689 s com build |
| Instrumentação | 6B.3 | 4 | 4 | 0 | 0 | 0 | 100% | 1 min com build |
| Instrumentação | **6B.5** | **4** | **4** | **0** | **0** | **0** | **100%** | **0,808 s nos testes e 58,324 s com build** |

O backend rodou com Java 21 e Maven offline, sem filtro no perfil produtivo. A instrumentação rodou separadamente no perfil `benchmark-observation`, que contém um spec de quatro testes. O Angular usou Node 24.17.0, UTC e `npm.cmd test -- src --reporter=json`. O relatório confirma que os 36 arquivos descobertos pertencem a `src`. Essas durações descrevem a validação.

- **6B → 6B.5.** Os 3.944 testes aprovados continuaram passando. Passaram também 108 métodos anteriormente negativos. Os 83 resultados sintéticos de erro de bootstrap deram lugar à descoberta de 1.210 métodos. Três regressões adicionadas após a 6B completam o aumento líquido de 1.130 casos. Os 48 resultados negativos do Angular já estavam recuperados na 6B.3 e a suíte se manteve verde.
- **6B.3 → 6B.5.** A descoberta ficou em 414 classes e 5.268 casos. Passaram os 5.222 que já passavam, as 26 falhas e os 17 erros da 6B.3. O cruzamento preservou a identidade dos seis métodos renomeados na 6B.4. Permaneceram os mesmos três casos ignorados. Nenhuma regressão apareceu nas três suítes.

Log backend [acervo local (backend-full.log)] · Surefire [acervo local (surefire-reports)] · Comparação por método [acervo local (full-comparison.json)] · Os 43 casos na execução completa [acervo local (original-43-full-results.json)] · Angular [acervo local (angular-candidate.json)] · Instrumentação [acervo local (benchmark.log)]

## Testes ignorados

| Método | Justificativa verificada | Cobertura pendente |
| --- | --- | --- |
| `ImportTemporaryFilesTest#refusesASymbolicLinkInTheTemporaryRoot` | A tentativa de criar o link ativou a suposição do teste, conforme o XML. | Rejeição de raiz temporária que atravessa um link simbólico. |
| `ImportTemporaryFilesTest#refusesAnExistingDirectoryWithSharedPermissionsWithoutChangingIt` | A suposição consulta `PosixFileAttributeView`. A visão de atributos POSIX ficou indisponível no sistema de arquivos usado. | Rejeição do diretório compartilhado e preservação de suas permissões. |
| `PrivateImportFileStoreTest#shouldRejectTraversalAndSymlinkEscapeWhenKeyIsNotPrivateRegularFile` | O teste executou as duas asserções de travessia antes de abortar na criação do link. | Rejeição da leitura por link para fora do armazenamento privado. |

Os outros 16 casos dessas duas classes passaram. As suposições explicam os skips e delimitam o que ainda precisa ser comprovado. Recomenda-se executar esses três métodos em ambiente com atributos POSIX e criação de links simbólicos antes da integração definitiva.

## Builds e preservação

| Artefato | Duração | SHA-256 |
| --- | --- | --- |
| JAR de produção [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | 30,523 s | `1dc93daa55362d823d2c9be08f605499524a553c67d3d6e3713aa005ecf09217` |
| JAR de benchmark [acervo local (watchwise-api-0.0.1-SNAPSHOT.jar)] | 58,324 s, com testes | `b9495cd6372342456ca111c5ca1d9fb17e2601eb94296d93cfac755e435a3a1d` |
| Angular de produção [acervo local (browser)] | 25,868 s | `d03d3942afad3feb36cc8477fba8ab6547bdd2b9809601a164fb39b2a4708321` |

O JAR produtivo tem **zero** classes de `common/performance`. O de benchmark tem **seis**, as duas classes principais e as quatro internas esperadas. As 1.966 entradas compartilhadas de `BOOT-INF` são idênticas entre os novos JARs. A comparação de `BOOT-INF` do JAR produtivo com a 6B.3 também teve **zero entradas alteradas, adicionadas ou removidas**. As classes de produção, os recursos e as dependências empacotadas preservam as correções e as otimizações do backend. Os recursos de aplicação mantêm os perfis existentes e a inspeção não encontrou observação ativa por padrão nem destinos de benchmark incorporados.

No Angular, os oito avisos de orçamento CSS tiveram os mesmos arquivos, tamanhos e limite de 25 kB da 6B e da 6B.3. Os worktrees mantêm as 13 otimizações e as cinco ressalvas provisórias registradas no inventário anterior.

**Incidente com a evidência Angular.** Apontei o primeiro build para `.angular/cache/6b5`. A limpeza automática do Angular CLI removeu `.angular/cache/6b3`, que guardava o bundle, o manifesto e os resultados Angular históricos, e a cópia de referência em `.angular/cache/6b-reference-pre-integracao`. Os relatórios das etapas e os resultados Angular originais da 6B em `performance/benchmarks/.local/6b-front` permanecem disponíveis. A saída atual foi movida para `dist/6b5` e os testes Angular foram refeitos ali. Um segundo build, direto em `dist/6b5`, reproduziu byte a byte os 88 arquivos do primeiro. O SHA-256 do manifesto atual difere do valor registrado na 6B.3, `87f3d04a8fd977a6ef6724e02a982cdf7faa9d86a611daab9cfec14fe3bcc800`. Sem a árvore histórica, a origem da diferença permanece indeterminada. A confirmação de preservação do frontend se apoia no código mantido e nas validações atuais.

Inspeção dos JARs [acervo local (artifact-inspection.json)] · Build do backend [acervo local (backend-build.log)] · Build Angular [acervo local (angular-build.log)] · Manifesto Angular [acervo local (angular-tree.sha256)] · Segundo build Angular [acervo local (angular-repro.log)]

## Isolamento e decisão

Foram verificados **127 datasources descartáveis**, todos da imagem `postgres:16-alpine`, em loopback, com portas dinâmicas e rótulo exclusivo da etapa. O guard confirmou o mapeamento e a identidade efetiva da conexão antes de entregá-la aos testes ou ao Flyway. Cada destino observado nas migrations tinha confirmação anterior. A configuração de fallback também usou Testcontainers e as portas 15432 e 15433 foram vetadas. As dependências de mídia usaram doubles ou o destino local sem serviço.

A checagem final confirmou **zero containers e zero volumes remanescentes** entre os recursos desta etapa. Foram observados 127 volumes anônimos e 435 tentativas de reconexão de pools Hikari em segundo plano bloqueadas após o encerramento dos respectivos containers. Nenhum bloqueio foi registrado em outras threads. Os serviços preexistentes permaneceram fora da execução. Verificação do isolamento [acervo local (isolation-verification.json)]

O candidato está apto à validação funcional integrada com as ressalvas registradas. A etapa seguinte pode usar o novo conjunto de artefatos como referência. As proteções de armazenamento precisam da validação específica de plataforma e a identidade binária histórica do Angular permanece sem confirmação. Nenhum benchmark ou validação da 6C foi iniciado.
