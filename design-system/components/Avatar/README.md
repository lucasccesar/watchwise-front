# Avatar

Representação visual de usuário/perfil, conforme Avatars.pdf.

## Tipos

- **Foto** — imagem do usuário, recorte circular.
- **Iniciais/placeholder** — fundo `secondary`, iniciais em `text`, quando não há foto.
- **Ícone placeholder** — silhueta genérica, mesmo fundo `secondary`.
- **Adicionar** — círculo tracejado (borda `border`) com ícone de "+", para convidar/adicionar um novo perfil.

## Tamanhos

De xs a 2xl (6 tamanhos), conforme Avatars.pdf — escala proporcional à hierarquia da tela (lista densa usa os menores; cabeçalho de perfil usa os maiores).

## Indicador de status

Ponto no canto inferior direito, com borda `surface` (separa do fundo do avatar): online = `success`, offline/ausente = `tertiary`.

## Composições

- **Avatar group** — pilha de avatares sobrepostos com contador "+N" ao final, para múltiplos participantes.
- **Avatar + progresso** — anel de `Progress` radial ao redor do avatar (ex. progresso de maratona de uma série).
- **Lista com avatar** — avatar + nome + e-mail/subtexto, usado em linhas de tabela e menus.

## Uso

Sempre com fallback (iniciais ou ícone) quando não há foto — nunca deixar vazio.
