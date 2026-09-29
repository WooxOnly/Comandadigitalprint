# Dados online e vários tablets

Servidor publicado em 29/09/2026, versão `2c3a4799-347d-4500-ab7a-598b65b872d0`, após aplicar a migração D1. Login, bloqueio anônimo, leitura, gravação e reenvio idempotente confirmados no serviço publicado. **Instalar o novo APK após o build do Expo; validar em dois aparelhos.**

## Funcionamento

- Um restaurante por instalação deste serviço. Cardápio, usuários, regra de cliente, logotipo e histórico são compartilhados após sincronizar. Usuários são gerenciados pelo admin; as rotas exigem sessão autenticada. Nenhuma chave de administração do servidor vai no APK.
- Cada instalação gera um UUID permanente, salvo junto aos dados locais. Em Ajustes é possível dar nome ao tablet e consultar o identificador. Apagar todos os dados/reinstalar gera outra identidade; nunca reutiliza os códigos dos pedidos antigos.
- Cada pedido novo recebe `UUID do tablet + UUID do pedido`, independentemente da hora do aparelho. Sincronizar um pedido não dispara impressão nos outros tablets. Cada tablet mantém seu próprio pedido em montagem.
- O envio salva a comanda e a fila pendente no mesmo arquivo local criptografado antes de limpar o pedido e abrir a impressão. Arquivos ficam em Documentos privados, fora do cache. A chave AES-GCM fica no SecureStore. A gravação troca o apontador somente depois de escrever o novo arquivo completo, preservando o anterior se falhar.
- Pedidos podem ser enviados e impressos offline, conforme escolha do proprietário. Aparecem como **Pendente de sincronização** até a confirmação do servidor. A fila persiste ao reiniciar. O app tenta sincronizar ao salvar, voltar à tela e a cada 30 segundos enquanto ativo.
- Servidor Workers + D1 grava cada alteração com chave única de operação. Reenvios após timeout retornam a confirmação anterior. Pedidos gravados são imutáveis; códigos não são usados para substituir comandas existentes.
- Cadastros usam revisão do servidor para detectar alterações concorrentes. O aviso de conflito identifica o cadastro e permite escolher a versão; nenhuma versão local pendente é descartada automaticamente. Em colisão de pedidos antigos, manter local preserva ambos com códigos distintos.
- Impressora e idioma são separados por tablet. Após reinstalar, Ajustes permite copiar as preferências de outro identificador, sem assumir a identidade dele. Cardápio e histórico vêm do servidor após autenticar.
- A primeira conexão importa os pedidos e cadastros existentes. Divergências do cardápio são mantidas como conflitos para decisão do usuário. O logotipo antigo é convertido quando o arquivo existe e tem até 500 KB; se estiver ausente ou for maior, escolha novamente uma imagem menor. Novos logotipos são armazenados como imagem, não como caminho temporário.
- A sessão de sincronização dura 7 dias e é guardada no SecureStore. Trocar senha/desativar usuário invalida sua sessão no servidor. Offline permanece o acesso local recebido anteriormente; não é possível receber uma revogação sem conexão. A chave de recuperação offline só reabre acesso local, não autentica no servidor.
- Entrar online usa a senha atual e restaura o acesso mesmo com o armazenamento limpo. Quando a conexão falha, o login pode usar o verificador já salvo. Usuários locais novos usam PBKDF2-SHA256 de 100 mil iterações, compatível com a autenticação do Worker; hashes locais antigos continuam legíveis.

## Publicação, somente quando solicitada

1. Aplicar o esquema existente se necessário e depois a migração **aditiva**:
   `npx.cmd wrangler d1 execute seabra-cardapio --remote --config server/cloudflare/wrangler.jsonc --file server/cloudflare/cloud-schema.sql`
2. Publicar o Worker: `npx.cmd wrangler deploy --config server/cloudflare/wrangler.jsonc`.
3. Confirmar login em `/cloud/login`, bloqueio sem sessão e gravação/leitura autenticadas. Não inserir pedidos fictícios no banco de produção.
4. Quando solicitado commit, enviar ao GitHub e iniciar EAS Android preview, confirmando aceitação sem esperar o build.
5. Instalar em dois tablets; entrar como admin online e aguardar **Dados sincronizados** no primeiro antes de limpar qualquer dado. Testar pedido offline nos dois, reconexão, histórico compartilhado e impressoras separadas.

## Limites de proteção

Limpar cache não apaga o arquivo persistente. **Apagar os dados de um tablet antes de sincronizar ainda elimina alterações que só existam nele.** O status informa essa condição. A cópia no servidor protege apenas o que já foi confirmado lá. O pedido ainda em montagem permanece um rascunho da sessão, não uma comanda salva.

O serviço não é multiempresa: todos os tablets conectados a esta implantação pertencem ao mesmo restaurante. A sincronização depende da disponibilidade e das cotas do Cloudflare; falhas mantêm a fila local e o aviso pendente.
