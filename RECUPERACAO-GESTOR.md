# Acesso e recuperação do painel do gestor

Em 20/10/2026, a Cloudflare confirmou erro 7500: cota diária de linhas lidas do D1 gratuito excedida. O portal respondia 503 JSON e a tela confundia isso com falta de conexão. O limite é da conta, renova à meia-noite UTC e não pode ser removido por código. Alterar o plano tem custo e depende do proprietário; nenhuma alteração de cobrança foi feita.

O login dos dois portais diferencia indisponibilidade, limite diário do serviço, conexão interrompida, modo offline, timeout, sessão/cookies, credenciais, formulário/tamanho inválido e limite de tentativas. Todas as mensagens estão em PT-BR/EN/ES, conforme o idioma selecionado. HTTP 5xx e JSON de erro não viram falha de internet. O cliente não exibe detalhes internos. Os campos permanecem preenchidos; somente a rejeição CSRF explicitamente marcada permite uma nova tentativa automática. Cooldowns seguem Retry-After, sem agendar credenciais; timeout de 20 segundos libera o botão.

O painel do gestor passa a ter **Esqueceu a senha?**, `/gestor/recover` e `/gestor/reset-password`:

- Reutiliza o provedor e remetente já configurados para convites: PASSWORD_RESET_PROVIDER, PASSWORD_RESET_FROM, PASSWORD_RESET_ORIGIN e RESEND_API_KEY ou BREVO_API_KEY. Não depende do destinatário do proprietário.
- Link em fragmento, removido do endereço ao abrir, sem token em query, logs, markup, storage ou resposta pública. Banco recebe somente SHA-256; validade de 15 minutos e uso único.
- Resposta condicional uniforme para e-mail desconhecido/inativo e falha individual de entrega, sem revelar cadastro. Falta global de configuração retorna indisponibilidade explícita. Falha de entrega invalida o token correspondente e registra apenas provedor/status.
- CSRF renovado antes de enviar; origem e tipos/tamanho do corpo validados. Limites separados por IP e por conta para pedidos e resgates.
- Senha mínima de oito caracteres, confirmação e novo salt. A troca incrementa a revisão, revoga sessões anteriores, invalida convites pendentes e limpa o bloqueio de login dessa conta/IP após a troca confirmada. Não altera lojas, cliente, módulos, permissões ou senhas dos tablets.
- Mudança de revisão, cliente/lojas ou desativação revoga o link. Escritas de senha/consumo executam em uma transação D1 com comparações de revisão e salt/hash únicos.

Aplicar `server/cloudflare/migrations/20261020-manager-recovery.sql` antes de publicar. Inclui as tabelas aditivas e índice parcial por loja/data de emissão dos pedidos. As seis consultas de produção usam o índice de intervalo, evitando ler todo o histórico para Hoje/intervalos curtos. A cota gratuita permanece aplicável a períodos grandes e ao restante da conta.

Verificações: suíte Node completa, testes de fluxo de recuperação com provedor sintético, sessão revogada, link usado/expirado/substituído, conta inativa, configuração/entrega indisponível, proteção de origem/CSRF e limite D1. Navegador: 12 cenários de recuperação (idiomas/temas/orientações) e 12 cenários de login com falhas HTTP, offline, timeout, retenção de campos e tentativas controladas. Confirmação de entrega em uma caixa real exige um pedido real do usuário; testes não enviam e-mails para terceiros.
