# Lojas no Worker

Cada loja tem um identificador estável de 3 a 40 caracteres minúsculos (`a-z`, `0-9`, `-`), começando e terminando com letra ou número. A loja existente é `seabra-1` (nome exibido: Seabra 1). O cadastro autorizado fica em `stores(id, name, active)` no D1. `store_codes` associa a cada identificador um número interno permanente, mostrado no painel com pelo menos três dígitos (001, 002, 003). Renomear a loja altera apenas `stores.name`; nem o número nem o identificador usado pelos tablets mudam. Um código informado pelo tablet não cria uma loja.

## Migração do banco publicado

Antes de publicar o Worker com isolamento por loja, execute `store-schema.sql` no mesmo banco D1 definido em `wrangler.jsonc`. Ele pressupõe que `schema.sql`, `cloud-schema.sql` e `diagnostics-schema.sql` já foram aplicados. Faça backup do D1 antes da migração e mantenha o Worker antigo sem novas gravações durante o intervalo entre o backup e a publicação. Depois execute:

```powershell
npx.cmd wrangler@4 d1 execute seabra-cardapio --remote --config server/cloudflare/wrangler.jsonc --file server/cloudflare/store-schema.sql
```

O script cria as tabelas `store_*`, copia para `seabra-1` todos os eventos, registros, revisões, tentativas de login, rotações de senha e diagnósticos existentes, sem alterar as tabelas antigas. Ele pode ser executado novamente sem sobrescrever gravações novas. A sequência dos eventos antigos é preservada para que os cursores dos tablets continuem válidos. Só depois de a migração ser aceita pelo D1 publique o Worker e distribua o app compatível. A senha semanal atual de `seabra-1` continua válida.

Para ativar os códigos internos em uma instalação já existente, execute novamente o mesmo `store-schema.sql` antes de publicar o painel atualizado. Ele numera as lojas existentes pela ordem original do banco e cria o código automaticamente para cada nova loja.

O mesmo script cria `store_tablet_numbers`. Na primeira sincronização, cada tablet recebe um número permanente dentro da loja; o número fica salvo no cache local para uso offline. As comandas usam `tablet-número diário`, por exemplo `1-001`, e a sequência diária do próprio tablet volta a 001 à meia-noite local. Se um tablet novo ainda não recebeu seu número por falta de conexão, a comanda usa um prefixo estável derivado do identificador desse tablet até a primeira sincronização; o número já impresso permanece igual nas reimpressões.

Em um banco novo, aplique na ordem `schema.sql`, `cloud-schema.sql`, `diagnostics-schema.sql`, `panel-password-schema.sql` e `store-schema.sql` antes de publicar.

## Cadastro de outra loja

O proprietário entra uma única vez em `/admin`, sem informar loja no login. No menu **Lojas**, informa o nome da nova loja; o painel gera um ID estável e a cadastra no D1. O seletor no topo permite mudar de loja sem sair. A consulta e a rotação da senha semanal e os logs usam apenas a loja selecionada. A senha de entrada no painel é global; as senhas semanais usadas pelos administradores no app são diferentes por loja. Usuários comuns são cadastrados separadamente em cada loja. Uma loja nova começa com cardápio vazio.

Como alternativa operacional, um responsável pelo D1 pode cadastrar a loja explicitamente com um ID novo e imutável. Exemplo:

```sql
INSERT INTO stores(id, name, active) VALUES ('seabra-2', 'Seabra 2', 1);
```

No primeiro acesso de um tablet novo, a tela de vínculo exige o usuário e a senha do painel administrativo. O Worker confere essa credencial e devolve apenas as lojas ativas para escolha; o tablet salva o ID escolhido, sem guardar a senha do painel. É necessária internet nessa primeira configuração. Depois, o vínculo permanece local e o app pode iniciar offline. Tablets que já tinham vínculo ou dados locais anteriores à implantação continuam na mesma loja.

O proprietário também pode consultar/rotacionar a senha semanal de uma loja usando o token privado `ADMIN_VIEW_TOKEN` em `/auth/admin/password?storeId=<id>`. Esse token tem acesso administrativo global e não deve ser distribuído a tablets. O token legado `MENU_ADMIN_TOKEN` só edita `seabra-1`; para outras lojas, o cardápio é editado pelo app após login naquela loja.

## Limites de acesso

`POST /cloud/login` aceita `storeId`, verifica a credencial daquela loja e devolve um token assinado que inclui o ID. A ausência do ID serve apenas à migração dos clientes antigos para `seabra-1`. Todas as consultas e alterações em `/cloud/changes`, `/cloud/change` e `/cloud/diagnostics` filtram o ID da sessão; informar outro ID na requisição não concede acesso. A leitura pública `GET /menu?storeId=<id>` usa o registro de lojas ativas; sem o parâmetro, retorna `seabra-1` para compatibilidade.
