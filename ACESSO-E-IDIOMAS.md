# Acesso e idiomas

- Conta do aparelho: `admin`, com senha semanal de 6 caracteres. A primeira instalação pode receber o acesso pela internet ou ser ativada offline com a chave de recuperação do proprietário e uma senha temporária. Não existe senha em texto embutida no APK.
- Login offline: verificador PBKDF2 protegido localmente; admin no SecureStore e usuários compartilhados no arquivo criptografado com chave no SecureStore. Nunca grava a senha em texto. A conferência usa processamento nativo assíncrono e não aguarda rede. Se o cálculo não responder em 10 segundos, apresenta erro e libera nova tentativa. Cinco erros bloqueiam por um minuto, inclusive após reiniciar. Sessão termina ao sair ou reiniciar o app.
- Limpar somente o cache não deve apagar o SecureStore. Apagar os dados do app/reinstalar pode remover usuários e credenciais: use **Recuperar acesso do admin**, com internet, ou **Recuperar sem internet**, com a chave guardada fora do tablet. A recuperação offline não restaura dados apagados. Após a publicação da sincronização, o login online poderá baixar os dados já confirmados no servidor.
- Em Ajustes, após desbloquear, **Usuários** permite cadastrar, ativar/desativar e redefinir senhas locais de 4 a 6 caracteres. Os usuários continuam disponíveis offline após reiniciar o app. O admin é reservado e não pode ser removido; o usuário conectado não pode desativar a si mesmo. Limite de 30 usuários por aparelho.
- Configurações: senha solicitada ao entrar na tela, calculada pela soma mês + dia + ano + hora local no formato de 12 horas (1 a 12). Exemplo: 9 + 25 + 2026 + 6 = 2066. Às 15h, a hora usada é 3; ao meio-dia e à meia-noite, é 12. Ao sair da tela ou colocar o app em segundo plano, bloqueia novamente. Essa regra foi expressamente escolhida pelo usuário.
- Idioma salvo no aparelho: português, inglês ou espanhol. Rótulos, mensagens, recibos, reimpressão e teste acompanham a seleção. Produtos, sabores, extras e descrições originais permanecem conforme o cardápio. Observações livres não são traduzidas automaticamente. As janelas de impressão/permissão do Android/iOS seguem o idioma do próprio sistema operacional.
- Pedidos, histórico, configuração e impressão não dependem do servidor de autenticação. O logout conserva o pedido em edição durante a mesma execução do app.

## Admin semanal no servidor

### Recuperação sem internet

Quando não há admin salvo, **Recuperar sem internet** permite informar a chave do proprietário e cadastrar uma senha temporária de 4 a 6 caracteres, com confirmação. O app abre após salvar o acesso, sem consultar o servidor. A senha temporária funciona após reiniciar e só é substituída quando a senha semanal é recebida e gravada com sucesso. A recuperação não substitui uma conta admin já configurada.

A chave privada está fora do repositório, em `C:\Users\mathe\.codex\private\seabra\recuperacao-offline.txt`. Guarde uma cópia fora do tablet. Somente o verificador PBKDF2 consta em `src/config/offlineRecovery.json`, para sobreviver à limpeza dos dados. A chave funciona nas instalações deste aplicativo que incluam esse verificador. Cinco erros bloqueiam por um minuto, inclusive após reiniciar. Não apague nem regenere esse arquivo de configuração sem planejar a entrega de outra chave ao proprietário.

Essa funcionalidade precisa de um novo APK; não está no aplicativo instalado anteriormente.

Publicado no Cloudflare Workers + D1 em 26/09/2026: https://seabra-cardapio.wooxonly-comandas.workers.dev . As URLs internas de autenticação e cardápio já estão preenchidas; o aplicativo instalado precisa de um novo build para receber as mudanças.

### Consultar e alterar a senha

1. Abra https://seabra-cardapio.wooxonly-comandas.workers.dev/admin .
2. Entre na tela de login do BistroHub com o e-mail e a senha cadastrados pelo proprietário. O painel exige login antes de exibir seu conteúdo.
3. Use **Consultar senha** para ver a senha atual do usuário `admin` e a data da próxima renovação.
4. Use **Gerar nova senha agora** e confirme para substituir a senha imediatamente no servidor. Os tablets recebem a troca na próxima sincronização; offline continuam com a anterior. A próxima renovação automática semanal continua prevista para segunda-feira às 00:00 UTC.

O login do painel é diferente da senha semanal do aplicativo. E-mail e senha estão nos segredos ADMIN_PANEL_USER e ADMIN_VIEW_TOKEN do Cloudflare, fora do Git/APK. Cinco tentativas incorretas bloqueiam o acesso por 15 minutos. A sessão do painel expira após uma hora sem atividade; é possível sair manualmente pelo botão **Sair**. A chave antiga foi invalidada.

### Referência para novas instalações do servidor

1. Para republicar em outra conta, conectar o Cloudflare e concluir o Worker conforme `server/README.md`.
2. Criar dois segredos independentes, aleatórios, com pelo menos 32 caracteres usando `wrangler secret put ADMIN_PASSWORD_SECRET` e `wrangler secret put ADMIN_VIEW_TOKEN` (executar pela CLI indicada no AGENTS.md). Nunca gravar os valores no repositório nem no APK.
3. Publicar. `/auth/admin` fornece apenas o verificador da senha. O painel `/admin` usa formulário de login e cookie de sessão assinado; o endpoint `/auth/admin/password` também exige autenticação. A senha semanal exibida é ocultada após um minuto ou ao trocar de aba.
4. Configurar a URL HTTPS de `/auth/admin` em `src/config/auth.ts` e gerar novo APK quando solicitado.

A senha de 6 caracteres (letras maiúsculas e números, sem caracteres ambíguos) deriva de HMAC com segredo exclusivo do servidor; muda a cada segunda-feira às 00:00 UTC, sem depender de um agendamento. O segredo nunca é distribuído. O verificador usa PBKDF2-SHA256 (100 mil iterações). Senhas antigas já armazenadas continuam legíveis pelo app até receber a nova versão.

O app verifica atualizações em segundo plano ao iniciar, voltar ao primeiro plano e a cada minuto enquanto ativo. Essa consulta em segundo plano é independente; o login online também autentica no servidor de sincronização, com limite de espera de 8 segundos e acesso local quando a conexão falha. Só troca o verificador depois de validar e gravar com sucesso; rejeita versões anteriores. Sem internet ou com falha, continua aceitando a última senha recebida. A senha antiga deixa de entrar após a sincronização, mas um pedido em andamento não é interrompido.

O servidor de sincronização entre tablets foi publicado em 29/09/2026; os aparelhos precisam instalar o novo APK. Consulte `SINCRONIZACAO.md` para migração, autenticação online, fila offline e recuperação dos dados já confirmados no servidor.
