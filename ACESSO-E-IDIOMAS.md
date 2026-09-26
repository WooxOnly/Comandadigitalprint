# Acesso e idiomas

- Conta do aparelho: `admin`. Sem serviço publicado, o primeiro acesso cadastra uma senha local (8 a 128 caracteres, com confirmação). Não existe senha fixa embutida no APK.
- Login offline: verificador PBKDF2 no SecureStore; nunca grava a senha em texto. Cinco erros bloqueiam por um minuto, inclusive após reiniciar. Sessão termina ao sair ou reiniciar o app.
- Configurações: senha solicitada ao entrar na tela, calculada pela soma mês + dia + ano + hora local (0 a 23). Exemplo: 9 + 25 + 2026 + 6 = 2066. Ao sair da tela ou colocar o app em segundo plano, bloqueia novamente. Essa regra foi expressamente escolhida pelo usuário.
- Idioma salvo no aparelho: português, inglês ou espanhol. Rótulos, mensagens, recibos, reimpressão e teste acompanham a seleção. Produtos, sabores, extras e descrições originais permanecem conforme o cardápio. Observações livres não são traduzidas automaticamente. As janelas de impressão/permissão do Android/iOS seguem o idioma do próprio sistema operacional.
- Pedidos, histórico, configuração e impressão não dependem do servidor de autenticação. O logout conserva o pedido em edição durante a mesma execução do app.

## Admin semanal no servidor

Publicado no Cloudflare Workers + D1 em 26/09/2026: https://seabra-cardapio.wooxonly-comandas.workers.dev . As URLs internas de autenticação e cardápio já estão preenchidas; o aplicativo instalado precisa de um novo build para receber as mudanças.

### Consultar e alterar a senha

1. Abra https://seabra-cardapio.wooxonly-comandas.workers.dev/admin .
2. Entre no diálogo de login do navegador com o e-mail e a senha cadastrados pelo proprietário. O painel exige login antes de exibir seu conteúdo.
3. Use **Consultar senha** para ver a senha atual do usuário `admin` e a data da próxima renovação.
4. Use **Gerar nova senha agora** e confirme para substituir a senha imediatamente no servidor. Os tablets recebem a troca na próxima sincronização; offline continuam com a anterior. A próxima renovação automática semanal continua prevista para segunda-feira às 00:00 UTC.

O login do painel é diferente da senha semanal do aplicativo. E-mail e senha estão nos segredos ADMIN_PANEL_USER e ADMIN_VIEW_TOKEN do Cloudflare, fora do Git/APK. Cinco tentativas incorretas bloqueiam o acesso por 15 minutos. O navegador pode manter o login durante a sessão; use uma janela privativa em computadores compartilhados. A chave antiga foi invalidada.

### Referência para novas instalações do servidor

1. Para republicar em outra conta, conectar o Cloudflare e concluir o Worker conforme `server/README.md`.
2. Criar dois segredos independentes, aleatórios, com pelo menos 32 caracteres usando `wrangler secret put ADMIN_PASSWORD_SECRET` e `wrangler secret put ADMIN_VIEW_TOKEN` (executar pela CLI indicada no AGENTS.md). Nunca gravar os valores no repositório nem no APK.
3. Publicar. `/auth/admin` fornece apenas o verificador da senha. O painel `/admin` exige login HTTP Basic com ADMIN_PANEL_USER e ADMIN_VIEW_TOKEN antes de exibir o conteúdo. O endpoint `/auth/admin/password` também exige autenticação. A senha semanal exibida é ocultada após um minuto ou ao trocar de aba.
4. Configurar a URL HTTPS de `/auth/admin` em `src/config/auth.ts` e gerar novo APK quando solicitado.

A senha de 24 caracteres hexadecimais deriva de HMAC com segredo exclusivo do servidor; muda a cada segunda-feira às 00:00 UTC, sem depender de um agendamento que possa falhar. O segredo nunca é distribuído. O verificador público usa PBKDF2-SHA256 (100 mil iterações) sobre essa senha aleatória de 96 bits.

O app verifica ao iniciar, voltar ao primeiro plano e a cada minuto enquanto ativo. Só troca o verificador depois de validar e gravar com sucesso; rejeita versões anteriores. Sem internet ou com falha, continua aceitando a última senha recebida, conforme solicitado. A primeira sincronização substitui a senha local provisória. A senha antiga deixa de entrar após a sincronização, mas um pedido em andamento não é interrompido.

Não há sincronização de pedidos entre aparelhos nesta etapa. Essa possibilidade foi deixada para depois pelo usuário.
