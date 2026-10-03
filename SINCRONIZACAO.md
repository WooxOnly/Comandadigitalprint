# Dados online e vários tablets

A versão anterior do servidor foi publicada em 29/09/2026 (`2c3a4799-347d-4500-ab7a-598b65b872d0`). O isolamento por loja descrito abaixo está preparado no código local e ainda precisa da migração D1, publicação do Worker e novo build do app, nessa ordem. **Validar em dois aparelhos após a publicação.**

## Funcionamento

- Cada tablet é vinculado uma vez ao identificador de uma loja ativa. O vínculo é guardado em dois armazenamentos locais e divergências bloqueiam o acesso para proteger o backup. O vínculo existente e os dados antigos pertencem a `seabra-1`; o primeiro vínculo de um tablet novo exige internet para confirmar o identificador. Depois, ele continua funcionando offline na loja vinculada. Cardápio, usuários, regra de cliente, logotipo e histórico são compartilhados somente entre tablets da mesma loja. Uma loja nova começa com cardápio vazio.
- O servidor grava registros, eventos, revisões, senhas semanais, tentativas de login e diagnósticos por loja. O token autenticado contém o identificador da loja e determina o escopo de todas as leituras e gravações; enviar outro identificador não permite acessar outra loja. Usuários comuns e a senha semanal do admin são próprios de cada loja. Nenhuma chave de administração do servidor vai no APK.
- Cada instalação gera um UUID permanente, salvo junto aos dados locais. Em Ajustes é possível dar nome ao tablet e consultar o identificador. Apagar todos os dados/reinstalar gera outra identidade; nunca reutiliza os códigos dos pedidos antigos.
- Cada pedido novo recebe `UUID do tablet + UUID do pedido`, independentemente da hora do aparelho. Sincronizar um pedido não dispara impressão nos outros tablets. Cada tablet mantém seu próprio pedido em montagem.
- O envio salva a comanda e a fila pendente no mesmo arquivo local criptografado antes de limpar o pedido e abrir a impressão. Arquivos ficam em Documentos privados, fora do cache. A chave AES-GCM fica no SecureStore. A gravação troca o apontador somente depois de escrever o novo arquivo completo, preservando o anterior se falhar.
- A cada gravação, o app mantém uma cópia local criptografada do estado completo (pedidos, fila pendente, cardápio, usuários, ajustes e identidade do tablet). O arquivo, a chave de criptografia e o diretório de backup são próprios da loja; uma cópia de outra loja é recusada. Conserva a última cópia de cada um dos 14 dias mais recentes. Enquanto aberto, verifica a virada do dia a cada minuto; se esteve fechado, faz a verificação ao reabrir. Se o arquivo principal estiver ausente ou danificado, tenta restaurar a cópia local válida mais recente, mesmo sem internet.
- Pedidos podem ser enviados e impressos offline, conforme escolha do proprietário. Aparecem como **Pendente de sincronização** até a confirmação do servidor. A fila persiste ao reiniciar. O app tenta sincronizar ao salvar, voltar à tela e a cada 30 segundos enquanto ativo.
- Servidor Workers + D1 grava cada alteração com chave única de operação. Reenvios após timeout retornam a confirmação anterior. Pedidos gravados são imutáveis; códigos não são usados para substituir comandas existentes.
- Cadastros usam revisão do servidor para detectar alterações concorrentes. O aviso de conflito identifica o cadastro e permite escolher a versão; nenhuma versão local pendente é descartada automaticamente. Em colisão de pedidos antigos, manter local preserva ambos com códigos distintos.
- Impressora e idioma são separados por tablet. Após reinstalar, Ajustes permite copiar as preferências de outro identificador, sem assumir a identidade dele. Cardápio e histórico vêm do servidor após autenticar.
- A primeira conexão de `seabra-1` importa os pedidos e cadastros antigos para essa loja. Divergências do cardápio são mantidas como conflitos para decisão do usuário. O logotipo antigo é convertido quando o arquivo existe e tem até 500 KB; se estiver ausente ou for maior, escolha novamente uma imagem menor. Novos logotipos são armazenados como imagem, não como caminho temporário.
- O token de sincronização dura até 7 dias e é guardado no SecureStore, mas a sessão visível do app exige novo login na virada de cada dia local. Trocar senha/desativar usuário invalida sua sessão no servidor. Offline permanece o acesso local recebido anteriormente; não é possível receber uma revogação sem conexão. A chave de recuperação offline só reabre acesso local, não autentica no servidor.
- Entrar online usa a senha atual e restaura o acesso mesmo com o armazenamento limpo. Quando a conexão falha, o login pode usar o verificador já salvo. Usuários locais novos usam PBKDF2-SHA256 de 100 mil iterações, compatível com a autenticação do Worker; hashes locais antigos continuam legíveis.

## Publicação, somente quando solicitada

1. Fazer backup do D1 e aplicar a migração por loja **antes** do Worker novo, conforme [STORES.md](server/cloudflare/STORES.md):
   `npx.cmd wrangler@4 d1 execute seabra-cardapio --remote --config server/cloudflare/wrangler.jsonc --file server/cloudflare/store-schema.sql`
2. Publicar o Worker: `npx.cmd wrangler deploy --config server/cloudflare/wrangler.jsonc`.
3. Confirmar login em `/cloud/login`, bloqueio sem sessão e gravação/leitura autenticadas. Não inserir pedidos fictícios no banco de produção.
4. Quando solicitado commit, enviar ao GitHub e iniciar EAS Android preview, confirmando aceitação sem esperar o build.
5. Instalar em dois tablets; entrar como admin online e aguardar **Dados sincronizados** no primeiro antes de limpar qualquer dado. Testar pedido offline nos dois, reconexão, histórico compartilhado e impressoras separadas.

## Limites de proteção

Limpar cache não apaga o arquivo persistente. **Apagar os dados de um tablet antes de sincronizar ainda elimina alterações que só existam nele.** O status informa essa condição. A cópia no servidor protege apenas o que já foi confirmado lá. O pedido ainda em montagem permanece um rascunho da sessão, não uma comanda salva.

O backup local fica no armazenamento privado do mesmo tablet e usa a chave do SecureStore. Ele protege contra perda ou corrupção do arquivo principal e indisponibilidade da nuvem; apagar os dados do app, desinstalar ou perder a chave também elimina o acesso a essas cópias. Alterações offline posteriores à última cópia válida podem não ser recuperadas se o arquivo principal e a cópia atual forem danificados juntos.

O banco aceita várias lojas separadas por identificador. Cadastrar uma loja nova requer inseri-la explicitamente em `stores`, como documentado em [STORES.md](server/cloudflare/STORES.md). A sincronização depende da disponibilidade e das cotas do Cloudflare; falhas mantêm a fila local e o aviso pendente.
