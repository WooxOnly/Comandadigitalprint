# Produção e homologação

O GitHub é a fonte do código. `main` representa produção; `homologacao` recebe alterações para teste antes de serem promovidas a `main`. O GitHub Actions valida lint, tipos e testes nas duas branches.

| Ambiente | GitHub | Cloudflare Worker | D1 | Android |
| --- | --- | --- | --- | --- |
| Produção | `main` | `seabra-cardapio` | `seabra-cardapio` | Expo `@onlybeones-team/matheus-sampaio`; `com.wooxonly.comandadigitalprint` (`preview` APK ou `production` AAB) |
| Homologação | `homologacao` | `seabra-cardapio-homologacao` | `seabra-cardapio-homologacao` | Expo `@onlybeones-team/matheus-sampaio-homologacao`; `com.wooxonly.comandadigitalprint.homologacao` (`homologacao` APK) |

Os aplicativos podem coexistir no mesmo tablet e usam armazenamento local e servidores diferentes. A homologação começa com banco próprio, sem copiar pedidos ou usuários de produção. A senha inicial do painel de homologação deve ser alterada em **Senha de entrada no painel** após o primeiro acesso. Os segredos de cada Worker ficam na Cloudflare, fora do repositório.

Fluxo: desenvolver em `homologacao`, validar e publicar o Worker com `npx wrangler@4 deploy --config server/cloudflare/wrangler.homologacao.jsonc`; iniciar o APK com `npx eas-cli@latest build --platform android --profile homologacao --non-interactive --no-wait`. Após aprovação, mesclar a branch em `main`, validar, publicar o Worker com `npx wrangler@4 deploy --config server/cloudflare/wrangler.jsonc` e iniciar o APK de produção com o perfil `preview`. Aplicar novas migrações D1 separadamente em cada ambiente antes de publicar o Worker correspondente.

O endereço do servidor é fixado em cada perfil de `eas.json`, sem segredo embutido no aplicativo. Os builds e deploys ainda são iniciados por comando; o GitHub Actions executa apenas validações. Uma automação futura de publicação precisa de credenciais próprias da Cloudflare e do Expo no GitHub Secrets.
