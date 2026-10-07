# Produção e homologação

O GitHub é a fonte do código. `main` representa produção; `homologacao` recebe alterações para teste antes de serem promovidas a `main`. O GitHub Actions valida lint, tipos e testes nas duas branches.

| Ambiente | GitHub | Cloudflare Worker | D1 | Android |
| --- | --- | --- | --- | --- |
| Produção | `main` | `seabra-cardapio` | `seabra-cardapio` | Expo `@onlybeones-team/matheus-sampaio`; `com.wooxonly.comandadigitalprint` (`preview` APK ou `production` AAB) |
| Homologação | `homologacao` | `seabra-cardapio-homologacao` | `seabra-cardapio-homologacao` | Expo `@onlybeones-team/matheus-sampaio-homologacao`; `com.wooxonly.comandadigitalprint.homologacao` (`homologacao` APK) |

Os aplicativos podem coexistir no mesmo tablet e usam armazenamento local e servidores diferentes. A homologação começa com banco próprio, sem copiar pedidos ou usuários de produção. A senha inicial do painel de homologação deve ser alterada em **Senha de entrada no painel** após o primeiro acesso. Os segredos de cada Worker ficam na Cloudflare, fora do repositório.

Fluxo: desenvolver em `homologacao`, validar e publicar o Worker com `npx wrangler@4 deploy --config server/cloudflare/wrangler.homologacao.jsonc`; iniciar o APK com `npx eas-cli@latest build --platform android --profile homologacao --non-interactive --no-wait`. Após aprovação, mesclar a branch em `main`, validar, publicar o Worker com `npx wrangler@4 deploy --config server/cloudflare/wrangler.jsonc` e iniciar o APK de produção com o perfil `preview`. Aplicar novas migrações D1 separadamente em cada ambiente antes de publicar o Worker correspondente.

O endereço do servidor é fixado em cada perfil de `eas.json`, sem segredo embutido no aplicativo. Os builds e deploys ainda são iniciados por comando; o GitHub Actions executa apenas validações. Uma automação futura de publicação precisa de credenciais próprias da Cloudflare e do Expo no GitHub Secrets.

## Publicar com os logins salvos no computador

O ambiente em nuvem desta conversa não acessa automaticamente o disco ou as sessões do computador pessoal. Quando Wrangler e EAS já estiverem autenticados nesse computador, abrir o terminal na pasta do projeto e executar (Node.js 24 ou mais recente):

```sh
git switch homologacao
git pull --ff-only origin homologacao
npm ci
npm run publicar:homologacao
```

O comando verifica a branch, os destinos e as sessões antes de qualquer alteração remota. Usa o Worker/D1 de homologação, projeto Expo próprio e pacote Android de homologação. Faz backup do banco em `.wrangler/backups/` (fora do Git e do APK), verifica que o arquivo não está vazio, reaplica `store-schema.sql`, publica o Worker, verifica `/health` e solicita um APK com `--no-wait`. O Expo informa o link exclusivo da nova build; o arquivo estará disponível ao finalizar. Produção permanece separada.

Para conferir apenas a configuração, sem publicar nem gerar APK:

```sh
npm run publicar:homologacao -- --check
```

Se a sessão estiver ausente/expirada no próprio computador, executar `npx wrangler@4 login` ou `npx eas-cli@latest login` e repetir o comando. Nenhuma senha/token é lida manualmente, copiada para o repositório ou solicitada pela conversa. Se o EAS pedir configuração inicial das credenciais Android, executar `npx eas-cli@latest build --platform android --profile homologacao --no-wait` no computador, conferir o projeto de homologação e seguir a configuração de assinatura ali. O script interrompe a sequência em caso de falha; uma falha após a migração/publicação não desfaz automaticamente as etapas concluídas. Preservar o backup para recuperação, se necessária.
