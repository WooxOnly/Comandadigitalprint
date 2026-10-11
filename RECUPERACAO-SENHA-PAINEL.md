# Recuperação da senha do administrativo

O botão **Esqueceu a senha?** fica abaixo de Entrar no administrativo. O proprietário informa seu usuário ou e-mail e recebe um link no endereço de recuperação configurado no servidor. O formulário, as mensagens e o e-mail têm versões em português, inglês e espanhol.

O link expira em 15 minutos. Abrir o link não o consome; salvar uma nova senha, de 8 a 256 caracteres, o consome em uma transação com a alteração da senha. A revisão da senha invalida as sessões e os demais links anteriores. A senha semanal dos tablets, as lojas, os dados e as contas dos gestores não são alterados. O proprietário pode entrar com seu usuário habitual ou com o e-mail de recuperação cadastrado, usando a nova senha.

Os tokens têm 256 bits aleatórios e somente seus digests ficam no D1. Recuperação e redefinição exigem CSRF, mesma origem e corpo limitado. A solicitação oferece a mesma resposta para usuário conhecido/desconhecido; nunca escolhe o destinatário a partir de um campo enviado pelo navegador. Limites separados de envio e de redefinição preservam a regra existente de tentativas de login. Links são construídos com a origem configurada, nunca pelo Host da solicitação.

## Configuração em homologação

1. Criar uma conta no [Resend](https://resend.com/signup) e gerar uma chave com permissão de envio de e-mails. O endereço dessa conta pode ser diferente do e-mail de recuperação cadastrado no portal quando o remetente usa domínio próprio verificado.
2. No Cloudflare, abrir **Workers & Pages → seabra-cardapio-homologacao → Settings → Variables and Secrets**. Adicionar **RESEND_API_KEY** como segredo, colando a chave somente no Cloudflare, e salvar/publicar a configuração.
3. **ADMIN_RECOVERY_EMAIL** define o destinatário cadastrado e **PASSWORD_RESET_FROM** define o remetente. São segredos do Worker, fora do Git. Para enviar a Hotmail, Gmail ou outros destinatários externos, adicionar um domínio próprio em **Resend → Domains**, publicar os registros DNS fornecidos pelo Resend, aguardar **Verified** e configurar o remetente com um endereço desse domínio. A chave de envio precisa ter acesso a esse domínio. `onboarding@resend.dev` é somente para teste com o e-mail da própria conta Resend.
4. **PASSWORD_RESET_ORIGIN** está na configuração de homologação e aponta exclusivamente para `https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev`.
5. Abrir `/admin/recover`, solicitar o link, conferir a caixa de entrada/spam e redefinir a senha. Confirmar login com a nova senha e rejeição da senha/link anteriores. Esse teste altera a senha real e deve ser feito pelo proprietário.

Sem todos os valores de envio, o botão na página de recuperação fica desabilitado e a página informa a indisponibilidade. Não afirma envio de e-mail. Uma falha de entrega do fornecedor elimina o token não entregue e registra somente um aviso operacional sem e-mail, chave ou token.

O e-mail destinatário do portal permanece independente do e-mail da conta Resend. O formulário identifica a conta, enquanto o servidor escolhe seu endereço de recuperação cadastrado; nunca envia um link válido para um endereço arbitrário do formulário. O fluxo desta página corresponde à conta proprietária do administrativo; recuperação de gestores pelo administrativo mantém seu fluxo existente. Produção não recebe automaticamente a configuração de homologação.

Referências oficiais: [limite do remetente de teste](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), [registros e verificação do domínio](https://resend.com/docs/dashboard/domains/manage-domains), [domínio exato do remetente](https://resend.com/docs/knowledge-base/403-error-domain-mismatch) e [permissões da chave](https://resend.com/docs/create-an-api-key). Copiar os registros gerados no painel, sem presumir seus tipos ou valores.

## Alternativa sem domínio próprio

O proprietário informou não ter domínio. A alternativa pesquisada é Brevo Free: após aprovação da conta para envio, até 300 e-mails/dia e API REST transacional. Um remetente Gmail pode ser verificado por código enviado ao próprio endereço; o Brevo reescreve o remetente dos e-mails transacionais para um domínio dele, independente do provedor do destinatário. O e-mail do portal permanece cadastrado normalmente no servidor.

O enviador atual continua sendo Resend. Integrar/configurar Brevo depende da escolha do proprietário, da conta aprovada, do remetente verificado e de uma chave própria de envio. A reescrita é descrita pelo Brevo como solução provisória; domínio próprio continua sendo uma alternativa para preservar a identidade do remetente.

Fontes: [plano e aprovação](https://www.brevo.com/pricing/), [verificação individual](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [reescrita e destinatários externos](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders) e [contrato de envio REST](https://developers.brevo.com/reference/send-transac-email).

## Verificação e alcance

Em 11/10/2026, a presença de `RESEND_API_KEY` como segredo foi conferida no Worker de homologação. A página de recuperação respondeu HTTP 200 nos três idiomas com envio habilitado e sem aviso de indisponibilidade. Essa verificação por leitura confirma a configuração; a validade da chave no fornecedor, o recebimento do e-mail e a redefinição ainda precisam do teste real do proprietário.

Na mesma data, o proprietário relatou ausência dos e-mails e informou que a conta Resend usa um endereço diferente do destinatário do portal. O endereço original de recuperação foi mantido. Permanece pendente a verificação de domínio e a troca do remetente de onboarding por remetente autorizado, seguida do teste de entrega.

Testes locais simulam somente o transporte Resend, usando o Worker e SQLite reais para formular, redefinir, entrar e revogar sessões. Cobrem expiração, concorrência, uso único, confirmação, limites, idiomas e dimensões. O teste de entrega em uma caixa postal exige a chave configurada e é registrado separadamente em `PENDENCIAS.md`.

Esta correção é do site/API. O APK de homologação já entregue continua atual; não há mudança nativa nem necessidade de nova build. A recuperação dos usuários gestores pelo administrativo e a recuperação local do app mantêm seus fluxos existentes.
