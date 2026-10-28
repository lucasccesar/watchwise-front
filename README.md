# Watchwise Frontend

Frontend SPA do Watchwise, inicializada com Angular 22.2.3, TypeScript e componentes standalone. Nesta entrega, a única tela implementada é Login; /explore fica reservado à futura apresentação pública.

## Desenvolvimento

Use Node.js 22.22.3+, 24.15.0+ ou 26.0.0+, versões compatíveis com Angular 22, e npm. Instale as dependências com npm install e inicie o servidor com npm start.

O servidor Angular abre em http://localhost:5173. O proxy de desenvolvimento encaminha /api/v1 para http://localhost:8080, preservando o prefixo. Inicie a API local separadamente. Em produção, public/_redirects encaminha rotas Angular para index.html; o Worker deve tratar /api/v1 antes do fallback de arquivos estáticos.

## Build de produção

Execute npm run build. O Angular CLI gera os arquivos estáticos em dist/watchwise/browser.

Não há testes automatizados nem script de teste configurado nesta etapa. O login envia os cookies de sessão pelo navegador; nenhum token é lido ou persistido pelo frontend. O login Google exige um Client ID público, indisponível na configuração local atual.
