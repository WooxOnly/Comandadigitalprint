# 17 — Canal configurado pelo cliente: WhatsApp manual ou Pedidos online no tablet

Requisito confirmado em 22/10/2026. A configuração é de cada cliente no próprio portal. Substitui a obrigatoriedade anterior de usar portal + WhatsApp juntos. Estado da primeira implementação e limites: [PEDIDOS-ONLINE-TESTES.md](../../PEDIDOS-ONLINE-TESTES.md). Itens sem marcação continuam exigindo conferência específica.

## Canal WhatsApp

- [x] Permitir ao vendedor escolher o recebimento por WhatsApp e cadastrar o próprio número comercial com código de país/DDD.
- [ ] Gerar mensagem com nome, contato e todos os dados fornecidos que sejam pertinentes ao pedido.
- [ ] Incluir itens, quantidades, opções, observações e valores efetivamente apresentados.
- [ ] Identificar entrega/retirada quando aplicável, endereço necessário e data/hora agendada quando houver.
- [x] Abrir o WhatsApp para o consumidor confirmar o envio; não usar API de disparo automático nesta etapa.
- [ ] Não afirmar que a mensagem foi enviada/entregue apenas por abrir o link.
- [x] Manter o lançamento operacional manual pelo vendedor, sem criar automaticamente pedido no tablet nesse canal.
- [ ] Definir se haverá histórico de solicitação no portal também para o canal WhatsApp, sem tornar esse registro uma condição já aprovada.

## Canal direto na aplicação

- [ ] Permitir ao cliente escolher o recebimento direto na aplicação.
- [x] Criar uma nova aba Pedidos online no tablet com lista e identificação de pendências.
- [x] Salvar a solicitação da loja e disponibilizá-la na lista automaticamente.
- [ ] Apresentar detalhes suficientes para a pessoa conferir e aceitar/confirmar o pedido.
- [x] Registrar o aceite com responsável e instante, sem confundir recebimento automático com aceite automático.
- [ ] Manter estados de solicitação, preparo, entrega e pagamento distintos.
- [ ] Definir e implementar o encaminhamento de um pedido aceito ao fluxo operacional, respeitando módulos/permissões/Caixa.
- [ ] Impedir duplicidade em envio, sincronização e aceite por mais de um tablet.
- [ ] Conferir telas em retrato/paisagem com o design atual, sem alterar dimensões aprovadas de outras telas.

## Configuração e decisões pendentes

- [ ] Definir configuração por unidade quando um cliente tiver várias lojas.
- [ ] Definir comportamento ao trocar de canal, preservando os pedidos já recebidos.
- [x] Exigir exatamente um canal ativo por loja na configuração, interface pública e servidor; nunca oferecer ambos simultaneamente.
- [ ] Definir se a lista também aparecerá no portal; isso não substitui a aba nativa solicitada.

## Verificação

- [ ] Cliente A não recebe dados nem usa o WhatsApp do cliente B.
- [ ] WhatsApp produz a mensagem completa, mas não lança automaticamente pedido operacional.
- [ ] Canal direto recebe a solicitação na loja correta e exige o aceite previsto.
- [ ] O mesmo pedido não gera duas comandas/vendas em reenvio ou aceites concorrentes.
- [ ] A alteração no app é identificada como dependente de atualização de APK; não iniciar compilação sem autorização específica.

## Habilitação e dependências confirmadas

- [ ] Exigir habilitação do módulo online pelo nosso administrador antes da escolha operacional do canal pela loja.
- [ ] Restringir pedidos na mesa ao canal automático e à permissão de mesa concedida pelo nosso administrador.
- [ ] Ao trocar de canal, preservar solicitações já recebidas; definir o tratamento das pendências anteriores sem cancelar silenciosamente.
- [ ] Revalidar o modo atual no servidor, inclusive em páginas/QR antigos, sem aceitar mesa por WhatsApp.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)

Validação de API e navegador concluída em 22/10/2026. Aba nativa implementada/conferida no navegador; APK e tablet físico ainda pendentes.
