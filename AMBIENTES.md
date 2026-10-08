# Produção e homologação

O GitHub é a fonte do código. `main` representa produção; `homologacao` recebe alterações para teste antes de serem promovidas a `main`. O GitHub Actions valida lint, tipos e testes nas duas branches.

| Ambiente | GitHub | Cloudflare Worker | D1 | Android |
| --- | --- | --- | --- | --- |
| Produção | `main` | `seabra-cardapio` | `seabra-cardapio` | Expo `@onlybeones-team/matheus-sampaio`; `com.wooxonly.comandadigitalprint` (`preview` APK ou `production` AAB) |
| Homologação | `homologacao` | `seabra-cardapio-homologacao` | `seabra-cardapio-homologacao` | Expo `@onlybeones-team/matheus-sampaio-homologacao`; `com.wooxonly.comandadigitalprint.homologacao` (`homologacao` APK) |

Os aplicativos podem coexistir no mesmo tablet e usam armazenamento local e servidores diferentes. A homologação começa com banco próprio, sem copiar pedidos ou usuários de produção. A senha inicial do painel de homologação deve ser alterada em **Senha de entrada no painel** após o primeiro acesso. Os segredos de cada Worker ficam na Cloudflare, fora do repositório.

Fluxo: desenvolver em `homologacao`, validar e publicar o Worker com `npx wrangler@4 deploy --config server/cloudflare/wrangler.homologacao.jsonc`; iniciar o APK com `npx eas-cli@latest build --platform android --profile homologacao --non-interactive --no-wait`. Após aprovação, mesclar a branch em `main`, validar, publicar o Worker com `npx wrangler@4 deploy --config server/cloudflare/wrangler.jsonc` e iniciar o APK de produção com o perfil `preview`. Aplicar novas migrações D1 separadamente em cada ambiente antes de publicar o Worker correspondente.

O endereço do servidor é fixado em cada perfil de `eas.json`, sem segredo embutido no aplicativo. O GitHub Actions valida ambas as branches. Após push em `homologacao` e validação aprovada, também pode publicar o servidor de homologação e solicitar o APK usando as credenciais abaixo. Em `main` e em pull requests, o fluxo executa somente as validações.

## Autenticar e entregar pela nuvem do GitHub

No [repositório](https://github.com/WooxOnly/Comandadigitalprint), abrir **Settings → Secrets and variables → Actions → New repository secret** e cadastrar:

| Nome exato | Valor a cadastrar no GitHub |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Token da conta que contém o Worker/D1 de homologação. Usar o modelo **Edit Cloudflare Workers** e incluir **Account → D1 → Edit**, restrito à conta correta. |
| `CLOUDFLARE_ACCOUNT_ID` | ID dessa conta Cloudflare, consultado no painel da conta. |
| `EXPO_TOKEN` | Token de acesso de um usuário/robô autorizado no projeto `@onlybeones-team/matheus-sampaio-homologacao`. |

Criar o token no [Cloudflare](https://dash.cloudflare.com/profile/api-tokens) e nas configurações de **Access tokens** do [Expo](https://expo.dev). As credenciais são inseridas no GitHub; não colocar seus valores no código, arquivos de configuração ou na conversa. Fontes: [Cloudflare/GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/), [permissões D1](https://developers.cloudflare.com/fundamentals/api/reference/permissions/) e [Expo/programmatic access](https://docs.expo.dev/accounts/programmatic-access/).

O job **Publicar homologação e solicitar APK** usa exatamente o commit validado, confere os destinos, registra um bookmark do D1 Time Travel, verifica ambos os logins, exporta e confere o backup, aplica o esquema, publica/verifica o Worker e solicita a build no projeto de homologação. Entregas são serializadas. A ausência de segredos ou uma falha anterior impede as etapas seguintes; o job informa os nomes faltantes sem exibir valores.

Quando os segredos forem cadastrados depois de uma tentativa, abrir **Actions → Validate app and server → execução de homologacao → Re-run failed jobs**. O resumo e os logs mostram os links do servidor e da build. O APK só fica disponível após a conclusão da build no Expo.

O backup SQL exportado permanece apenas no runner temporário, fora do Git. Nenhum arquivo com dados da empresa é publicado como artifact neste repositório. Para recuperação, usar o bookmark registrado nos logs com o [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), dentro da retenção da conta (7 dias no plano gratuito; 30 no pago). Uma restauração exige autenticação e deve considerar as operações posteriores ao ponto selecionado.

Se o projeto Expo ainda não tiver credenciais de assinatura Android, uma primeira configuração interativa pode ser exigida: executar `npx eas-cli@latest build --platform android --profile homologacao --no-wait` em um computador autenticado, sempre conferindo o projeto de homologação. A [documentação de builds em CI](https://docs.expo.dev/build/building-on-ci/) exige essa configuração prévia para execuções não interativas.

## Publicar com os logins salvos no computador

O ambiente em nuvem desta conversa não acessa automaticamente o disco ou as sessões do computador pessoal. Como alternativa à entrega pelo GitHub, quando Wrangler e EAS já estiverem autenticados nesse computador, abrir o terminal na pasta do projeto e executar (Node.js 24 ou mais recente):

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
