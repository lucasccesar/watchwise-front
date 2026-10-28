# Watchwise Frontend

Frontend SPA de produção do Watchwise, inicializado com Angular 22.2.3, TypeScript e componentes standalone. Este primeiro incremento entrega Login; a Home, o cadastro, a recuperação de senha e as outras áreas do produto seguem como entregas futuras. `/explore` fica reservado à apresentação pública.

## Desenvolvimento

Use Node.js 22.22.3+, 24.15.0+ ou 26.0.0+ e npm. Instale as dependências com `npm ci` e inicie o servidor com `npm start`.

O servidor Angular abre em http://localhost:5173. O proxy de desenvolvimento encaminha /api/v1 para http://localhost:8080, preservando o prefixo. Inicie a API local separadamente. Em produção, public/_redirects encaminha rotas Angular para index.html; o Worker deve tratar /api/v1 antes do fallback de arquivos estáticos.

## Build de produção

Execute `npm run build`. O Angular CLI gera os arquivos estáticos em `dist/watchwise`.

Execute `npm test` para rodar os testes de rotas e mensagens de erro. O login usa cookies de sessão; nenhum token é lido ou persistido pelo frontend.

O botão Google fica visível, mas desabilitado enquanto não houver Client ID. Quando o Client ID público for criado, configure `GOOGLE_OAUTH_CLIENT_ID` em `src/app/features/auth/auth.config.ts`; o fluxo usa Google Identity Services em popup e envia o ID token à API. Não coloque segredos nesse arquivo.

Após autenticar, o app navega para `/home`. A rota temporária informa que a Home real será implementada em uma próxima entrega. `/register` agora exibe a tela Signup com validações locais; o envio e a confirmação por email aguardam o contrato de cadastro ser documentado em `telas-reqs-definitivo.md`. `/forgot-password` continua com destino temporário até a tela de recuperação.

O cadastro com Google permanece desativado porque a API disponível oferece apenas OAuth para login de contas existentes. Os links de Termos de Uso e Política de Privacidade levam a destinos temporários até a publicação desses conteúdos.
