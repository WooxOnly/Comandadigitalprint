# Pendências e preferências

- **Dados online/múltiplos tablets publicados no servidor em 29/09/2026:** identificador UUID por instalação e pedido, fila offline persistente, reenvio idempotente, compartilhamento de usuários/cardápio/histórico, conflitos explícitos, impressora/idioma por tablet. Migração `cloud-schema.sql` aplicada no D1; Worker `2c3a4799-347d-4500-ab7a-598b65b872d0` publicado. Login, acesso protegido e gravação idempotente verificados em produção sem criar pedidos/usuários fictícios. APK solicitado nesta entrega; acompanhar pelo link do Expo fornecido na conversa. Roteiro e limites em `SINCRONIZACAO.md`. Validar com dois aparelhos físicos.

- **Recuperação offline implementada localmente:** na primeira instalação ou após apagar dados, a chave privada do proprietário permite criar senha temporária do admin, sem rede. Chave fora do Git em `.codex/private/seabra/recuperacao-offline.txt`; detalhes em `ACESSO-E-IDIOMAS.md`. Não recupera pedidos/usuários apagados. Distribuir e validar no próximo APK solicitado.

- **Incluído em 29/09/2026, ainda sem novo APK:** nome Comanda Digital na tela de login, junto ao ícone do chef.
- **Correções locais de 29/09/2026:** login com cálculo nativo e limite de espera, recuperação do admin sem redefinir a senha, cadastro/ativação/desativação/redefinição de usuários em Ajustes, colunas com rolagem independente no tablet e botão Ver detalhes no histórico. Validar login offline e rotação no aparelho após gerar novo APK; a nova biblioteca de criptografia exige build nativo.
- **Cloudflare restaurado em 29/09/2026:** quatro segredos reconfigurados, login original do painel restaurado e senha semanal de 6 caracteres publicada. A chave de geração foi renovada (o valor anterior não estava disponível), com revisão incrementada para os aparelhos receberem a nova senha. Painel sem autenticação retorna 401; acesso autenticado e verificador testados. Nenhum commit/push/build Expo nesta etapa.

- **Comanda melhorada em 26/09/2026:** plaquinha e cliente destacados, itens maiores, sabores separados, extras por metade e observações com borda. Layout centralizado em 58/80 mm e sem preços. Falta validar na impressora física.
- Validar o aplicativo no celular/iPad e a impressão física em 58/80 mm.
- A migração para Expo Router adicionou dependências nativas: o APK instalado anteriormente não contém esta etapa. Gerar novo APK apenas quando solicitado.
- Validar no próximo APK a abertura com gorro de chef/fundo verde, o layout compacto no tablet e a opção “Obrigar informar cliente” (salva automaticamente em Ajustes; desativada por padrão).
- Hospedagem publicada no Cloudflare Workers + D1; URLs internas preenchidas. Distribuir essas alterações no próximo APK solicitado. Painel e instruções em `ACESSO-E-IDIOMAS.md`.
- Integrações diretas Bluetooth/Wi-Fi/USB dependem da impressora; hoje a impressão usa a janela do sistema.
- Quando o usuário pedir commit, fazer commit/push e enviar à nuvem aplicável, incluindo iniciar build Expo. Confirmar aceitação e informar links, sem aguardar conclusão. Sem pedido de commit/publicação, acumular alterações locais.
- Comunicação e execução concisas; evitar consultas e verificações repetidas sem necessidade.
- Acesso/idiomas implementados localmente: validar no próximo APK o login `admin`, a senha de Ajustes (mês + dia + ano + hora local) e português/inglês/espanhol. Detalhes em `ACESSO-E-IDIOMAS.md`.
- Admin semanal e botão de troca manual publicados. Painel protegido por login com e-mail/senha nos segredos do Cloudflare; chave antiga desativada. Offline mantém a última senha sincronizada. Não sincroniza pedidos entre tablets.
