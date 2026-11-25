# 6B.4 — Resolução dos problemas remanescentes do backend

**Os 43 casos negativos da 6B.3 foram recuperados.** Os quatro recortes somaram **442 testes aprovados**, com zero falhas, erros ou ignorados nesses recortes. As causas confirmadas estavam nas fixtures, nas configurações de mocks ou em expectativas de contratos antigos. As correções ficaram em 19 arquivos de teste do backend. [Referência da 6B.3](06b3-revalidacao-completa-candidato.md) · Resultado individual dos 43 casos [acervo local (original-43-results.json)]

## Causas e correções

| Grupo | Casos da 6B.3 | Causa confirmada e correção |
| --- | ---: | --- |
| Progresso de séries | 4 | Dois cenários HTTP usavam o contrato antigo. Séries iniciadas continuam visíveis e entram no agregado quando concluídas. Temporadas com 100% dos episódios lançados assistidos aparecem em `completedSeasonProgress`. A fixture de série concluída agora tem três episódios assistidos coerentes com a projeção e o escopo. O snapshot frio distingue especial, episódio lançado e futuro. O teste exige o futuro na navegação, marcado indisponível, e fora da contagem. Os dois casos de Mockito removem stubs desnecessários e verificam ausência de interações com entrada vazia. |
| Rollback, concorrência e preview em Picks | 4 | Os três testes integrados esperavam que TMDB voltasse a ser chamado dentro da transação. A preparação de mídia ocorre antes da escrita. Os dois testes de rollback agora confirmam a escrita no banco dentro da transação real, injetam indisponibilidade na montagem da resposta e verificam HTTP 502 e o estado após a reversão. O concorrente mantém a transação da seleção aberta na montagem, verifica `pg_blocking_pids` do escritor, libera a seleção e conserva as verificações de conflito e período intacto. O preview de pessoa exige o path bruto previsto em OpenAPI. |
| Importação de opiniões | 1 | A nota era anexada depois de o resumo iniciar a aplicação, quando o total do plano já estava fixado em um item. O teste agora monta o plano com dois itens antes do primeiro apply. Uma segunda aplicação da nota verifica idempotência, com dois itens processados, uma pendência preservada, zero notas registradas e zero entradas no Diário. |
| Autenticação | 6 | Stubs de emissão de token e cookies usavam sobrecargas antigas. Os testes passaram a verificar o argumento explícito de persistência de sessão, mantendo a emissão, a rotação e a revogação. |
| Confirmação de e-mail e cadastro | 7 | Cinco cenários exigiam entrega configurada e o mock informava indisponibilidade. O cenário negativo agora exige a mensagem atual e nenhuma interação com os repositórios ou com o remetente. O mapper verifica que uma conta nova permanece com e-mail não verificado. |
| Inventário de cache | 4 | Os testes contavam 20 caches de metadados, antes do cache de classificação indicativa de séries. O inventário agora exige 21 caches TMDB mais o de imagens. Os testes continuam verificando a divisão exata, as participações desiguais, o resto não alocado e o limite global. |
| Conteúdo e DTOs | 11 | Os doubles de episódio agora cobrem a consulta de detalhes da temporada e a indisponibilidade opcional. Os testes preservam a herança de poster e ficha técnica e distinguem o still do episódio no backdrop. O limite documentado de quatro episódios recentes e os desempates são conferidos com listas exatas. Os testes JSON mantêm listas exatas de campos, incluindo backdrop, notas e a faceta documentada de Watchlist. |
| Pessoas e busca | 5 | O mock de enriquecimento de votos devolvia uma lista vazia. Passa a devolver os itens recebidos, preservando os testes de paginação, filtro e ordenação. O offset fora da faixa continua rejeitado pelo contrato comum de paginação. O avatar do proprietário sem enriquecimento é nulo conforme o contrato, com os outros defaults ainda verificados. |
| Codec de Jogo | 1 | A fixture usava uma URL de host não aceito pelo normalizador de imagens. Passou a usar um path bruto válido, mantendo igualdade do DTO após a leitura e imutabilidade da lista. |

As referências de contrato incluem o OpenAPI atual e o histórico da 6B.3. O limite de quatro episódios recentes foi confirmado também pelo commit `f939c9be`. A preparação de mídia de Picks fora da transação de escrita foi confirmada por `d26cb8cd` e pelo controle de concorrência em `PickBlockMutationIntegrationTest`. Os testes de rollback exercitam uma falha injetada dentro da transação e validam o efeito persistido. O teste do fluxo de importação prepara uma geração consistente e mantém a invariante de contagem produtiva.

## Validação direcionada

| Recorte | Casos recuperados | Total aprovado | Falhas, erros e ignorados |
| --- | ---: | ---: | ---: |
| Progresso, Diário e importação de opiniões | 5 | 139 | 0 |
| Picks, concorrência, totais e preview | 4 | 47 | 0 |
| Autenticação, e-mail, mapper e cache | 17 | 92 | 0 |
| Contratos de conteúdo, pessoas, busca, jogo e controle de Watchlist | 17 | 164 | 0 |
| **Total** | **43** | **442** | **0** |

O cruzamento por método registra as seis renomeações sem perda de cobertura. A preparação foi executada com Java 21 e Maven offline. O recorte de Picks inclui o controle da ordem inversa, em que o template muda durante a preparação. O recorte de Diário inclui toda a classe HTTP e cobre os demais filtros e respostas. Os resultados dos 43 casos foram associados aos XMLs do Surefire.

Progresso e opiniões [acervo local (progress-opinions.log)] · Picks [acervo local (picks.log)] · Autenticação e cache [acervo local (auth-cache.log)] · Contratos [acervo local (contracts.log)] · Surefire [acervo local (surefire-reports)]

## Preservação e isolamento

A comparação byte a byte dos 1.818 arquivos de classes e recursos de produção compilados com `BOOT-INF/classes` do JAR produtivo da 6B.3 encontrou zero diferenças. As 13 otimizações, as correções anteriores e o trabalho paralelo foram preservados. O Angular e as árvores de trabalho originais ficaram intactos. Comparação de produção [acervo local (production-verification.json)]

O guard reaproveitado da 6B.3 verificou os sete datasources efêmeros, todos `postgres:16-alpine` em loopback, com portas dinâmicas e rótulo exclusivo da etapa. Cada destino foi confirmado antes de o Flyway aplicar as 104 migrations. Ao final, a inspeção registrou zero containers e zero volumes remanescentes da etapa. Os bancos em 15432 e 15433 e o TMDB real ficaram fora da execução. Verificação de isolamento [acervo local (isolation-verification.json)]

## Recomendação para a revalidação final

Os 43 casos conhecidos estão aptos à revalidação completa. Recomenda-se repetir as suítes no candidato isolado quando houver autorização e verificar os três skips históricos de armazenamento em ambiente com permissões POSIX e suporte a symlinks. A cobertura de 442 testes é direcionada. A suíte completa e a 6C permanecem pendentes.
