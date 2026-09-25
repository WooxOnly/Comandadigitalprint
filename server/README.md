# Servidor do cardápio

## Hospedagem definida: Cloudflare Workers + D1 (plano gratuito)

O Worker fornece HTTPS e o D1 guarda o cardápio em banco, sem depender de arquivos temporários da hospedagem. O projeto está preparado em `server/cloudflare/`. **Não está publicado:** ainda são necessários a conta Cloudflare, o banco e a URL final. Nenhum serviço pago foi contratado.

Na documentação consultada em 25/09/2026, o plano gratuito oferece 100 mil requisições/dia no Workers; o D1 inclui 5 milhões de linhas lidas/dia, 100 mil escritas/dia e 5 GB de armazenamento. Permanecer no plano gratuito; ao atingir limites, o serviço pode ficar indisponível e o aplicativo continua com o cardápio local. Não habilitar cobrança sem nova decisão do usuário.

Fontes: [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/), [configuração do D1](https://developers.cloudflare.com/d1/get-started/).

### Publicar quando houver conta e solicitação do usuário

Executar na raiz do repositório (PowerShell). Este roteiro não depende de enviar o código ao GitHub:

```powershell
npx.cmd wrangler@4 login
npx.cmd wrangler@4 d1 create seabra-cardapio
```

Copiar o `database_id` retornado para `server/cloudflare/wrangler.jsonc`, substituindo o ID de exemplo. Depois:

```powershell
npx.cmd wrangler@4 d1 execute seabra-cardapio --remote --config server/cloudflare/wrangler.jsonc --file server/cloudflare/schema.sql
npx.cmd wrangler@4 secret put MENU_ADMIN_TOKEN --config server/cloudflare/wrangler.jsonc
npx.cmd wrangler@4 deploy --config server/cloudflare/wrangler.jsonc
```

No prompt de segredo, inserir um token aleatório forte (pelo menos 32 bytes). Não salvar esse token no Git, no app ou na URL. O Worker começa com o cardápio Seabra incluído no código quando o banco está vazio. O primeiro `PUT /menu` grava no D1 e atualizações/deploys posteriores preservam esse conteúdo.

Testar `https://<endereço-retornado>/health` e `/menu`. Configurar a URL completa terminada em `/menu` em `src/config/menu.ts` antes de distribuir o próximo aplicativo. O operador não informa links: usa apenas **Atualizar cardápio**. O app verifica também ao abrir, compara o conteúdo e avisa “Cardápio atualizado com sucesso” somente depois de persistir uma mudança. Sem internet, mantém o cardápio local. Até a publicação, o endereço interno permanece vazio e o app não simula uma atualização bem-sucedida.

### Verificação local sem publicar

```powershell
npx.cmd wrangler@4 deploy --dry-run --config server/cloudflare/wrangler.jsonc --outdir .expo/worker-check
```

## API

- `GET /health`: verifica acesso ao cardápio/banco.
- `GET /menu`: leitura pública; sem token.
- `PUT /menu`: substitui o catálogo completo; exige `Authorization: Bearer <MENU_ADMIN_TOKEN>` e `Content-Type: application/json`.
- `OPTIONS`: permite consulta web com CORS.

O esquema exige IDs únicos, nomes e categorias preenchidos, valores numéricos finitos não negativos e metadados válidos. Máximo de 500 itens e corpo de 1 MiB. JSON inválido retorna 400, autenticação inválida 401, corpo grande 413 e tipo de conteúdo incorreto 415. Erros não revelam detalhes internos. O app e os dois servidores compartilham a validação em `shared/menu-validation.mjs`.

O endpoint administrativo substitui o cardápio inteiro: em atualizações concorrentes, vale a última gravação concluída. Guardar uma cópia do JSON antes de substituir o catálogo. O aplicativo **não** envia automaticamente as edições locais para o servidor.

## Alternativa Node local/VPS

```powershell
node server/server.mjs
```

Porta padrão 3000 (`PORT`). `MENU_ADMIN_TOKEN` habilita a escrita; sem token, o servidor fica somente para leitura. `MENU_FILE` permite apontar para um arquivo em volume persistente já inicializado com uma cópia de `server/menu.json`. O servidor Node grava em arquivo temporário sincronizado e faz substituição atômica; gravações são serializadas. Uma VPS precisa de proxy HTTPS e armazenamento persistente. O app aceita URLs HTTPS.

Testes locais (Node 24 para os testes com SQLite):

```powershell
node --test tests/*.test.cjs tests/*.test.mjs
```
