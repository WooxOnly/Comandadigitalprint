# Recuperação da senha do administrativo

O botão **Esqueceu a senha?** fica abaixo de Entrar no administrativo. O proprietário informa seu usuário ou e-mail e recebe um link no endereço de recuperação configurado no servidor. O formulário, as mensagens e o e-mail têm versões em português, inglês e espanhol.

O link expira em 15 minutos. Abrir o link não o consome; salvar uma nova senha, de 8 a 256 caracteres, o consome em uma transação com a alteração da senha. A revisão da senha invalida as sessões e os demais links anteriores. A senha semanal dos tablets, as lojas, os dados e as contas dos gestores não são alterados. O proprietário pode entrar com seu usuário habitual ou com o e-mail de recuperação cadastrado, usando a nova senha.

Os tokens têm 256 bits aleatórios e somente seus digests ficam no D1. Recuperação e redefinição exigem CSRF, mesma origem e corpo limitado. A solicitação oferece a mesma resposta para usuário conhecido/desconhecido; nunca escolhe o destinatário a partir de um campo enviado pelo navegador. Limites separados de envio e de redefinição preservam a regra existente de tentativas de login. Links são construídos com a origem configurada, nunca pelo Host da solicitação.

## Configuração em homologação

1. Criar uma conta no [Resend](https://resend.com/signup) com o mesmo e-mail escolhido como destinatário de recuperação. Gerar uma chave com permissão de envio de e-mails.
2. No Cloudflare, abrir **Workers & Pages → seabra-cardapio-homologacao → Settings → Variables and Secrets**. Adicionar **RESEND_API_KEY** como segredo, colando a chave somente no Cloudflare, e salvar/publicar a configuração.
3. **ADMIN_RECOVERY_EMAIL** define o destinatário e **PASSWORD_RESET_FROM** define o remetente. São segredos do Worker, fora do Git. Para a primeira verificação, o remetente é `onboarding@resend.dev`; o Resend permite esse remetente de teste somente para o e-mail da própria conta. Não é envio geral para clientes.
4. **PASSWORD_RESET_ORIGIN** está na configuração de homologação e aponta exclusivamente para `https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev`.
5. Abrir `/admin/recover`, solicitar o link, conferir a caixa de entrada/spam e redefinir a senha. Confirmar login com a nova senha e rejeição da senha/link anteriores. Esse teste altera a senha real e deve ser feito pelo proprietário.

Sem todos os valores de envio, o botão na página de recuperação fica desabilitado e a página informa a indisponibilidade. Não afirma envio de e-mail. Uma falha de entrega do fornecedor elimina o token não entregue e registra somente um aviso operacional sem e-mail, chave ou token.

Para envio a outros destinatários, cadastrar e verificar um domínio no Resend e substituir o remetente por um endereço desse domínio. Esse passo não é necessário para o teste do proprietário com o remetente de onboarding. Produção não recebe automaticamente a configuração de homologação.

## Verificação e alcance

Testes locais simulam somente o transporte Resend, usando o Worker e SQLite reais para formular, redefinir, entrar e revogar sessões. Cobrem expiração, concorrência, uso único, confirmação, limites, idiomas e dimensões. O teste de entrega em uma caixa postal exige a chave configurada e é registrado separadamente em `PENDENCIAS.md`.

Esta correção é do site/API. O APK de homologação já entregue continua atual; não há mudança nativa nem necessidade de nova build. A recuperação dos usuários gestores pelo administrativo e a recuperação local do app mantêm seus fluxos existentes.
