# Watchwise Frontend

Frontend SPA de produção do Watchwise, inicializado com Angular 22.2.3, TypeScript e componentes standalone. Este primeiro incremento entrega Login; a Home, o cadastro, a recuperação de senha e as outras áreas do produto seguem como entregas futuras. `/explore` fica reservado à apresentação pública.

## Desenvolvimento

Use Node.js 22.22.3+, 24.15.0+ ou 26.0.0+ e npm. Instale as dependências com `npm ci` e inicie o servidor com `npm start`.

O servidor Angular abre em http://localhost:5173. O proxy de desenvolvimento encaminha /api/v1 para http://localhost:8080, preservando o prefixo. Inicie a API local separadamente. Em produção, public/_redirects encaminha rotas Angular para index.html; o Worker deve tratar /api/v1 antes do fallback de arquivos estáticos.

## Build de produção

Execute `npm run build`. O Angular CLI gera os arquivos estáticos em `dist/watchwise`.

Execute `npm test` para rodar os testes de rotas e mensagens de erro. O login usa cookies de sessão; nenhum token é lido ou persistido pelo frontend.

O botão Google fica visível, mas desabilitado enquanto não houver Client ID. Quando o Client ID público for criado, configure `GOOGLE_OAUTH_CLIENT_ID` em `src/app/features/auth/auth.config.ts`; o fluxo usa Google Identity Services em popup e envia o ID token à API. Não coloque segredos nesse arquivo.

Após autenticar, o app navega para `/home`. A rota temporária informa que a Home real será implementada em uma próxima entrega. `/register` envia `{ username, name, email, password }` para `POST /api/v1/auth/register`; a API retorna `202` e envia um email de confirmação. A cópia local de `telas-reqs-definitivo.md` não especifica o fluxo Signup; a integração segue a implementação atual do repositório separado da API, conforme decisão do usuário.

A API valida username (3–60 caracteres, sem `@`), nome (até 120), email (até 60) e senha (mínimo de 8 caracteres, maiúscula, minúscula, número e até 72 bytes UTF-8). O protótipo limita nome a 40 e username a 20 caracteres e aceita somente letras, números, pontos e sublinhados; a tela preserva essas restrições visuais. A aceitação de Termos e Política é exigida pela interface, mas não é enviada porque não existe campo correspondente no DTO atual.

O cadastro com Google permanece desativado porque a API disponível oferece OAuth apenas para login de contas existentes. Os links de Termos de Uso e Política de Privacidade levam a destinos temporários até a publicação desses conteúdos. `/forgot-password` continua com destino temporário até a tela de recuperação.
