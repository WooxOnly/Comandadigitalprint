# 19 — Loja aberta, pedido para agora, agendamento e janela de aceite

Regras básicas confirmadas em 22/10/2026. Prazos exatos e ações ao vencer ainda precisam de decisão; não inventar valores ou cancelamento automático.

## Horário de funcionamento

- [ ] Configurar os horários da loja no portal e sua referência de fuso.
- [ ] Verificar abertura/fechamento na finalização/envio, não apenas ao montar o cardápio.
- [ ] Não aplicar o horário de uma loja automaticamente a todos os clientes.
- [ ] Definir dias da semana, intervalos, pausas e exceções/feriados necessários ao modelo.

## Pedido para agora

- [ ] Só permitir quando a loja estiver aberta no funcionamento configurado.
- [ ] Não confirmar atendimento imediato quando a loja estiver fechada.
- [ ] No canal direto, disponibilizar o pedido pendente e sua janela de aceite à equipe.
- [ ] Definir a duração da janela e se será ajustável pelo cliente/loja.
- [ ] Definir o resultado de prazo vencido, recusa e cancelamento e a mensagem apresentada ao consumidor.
- [ ] Definir antecedência/margem de atendimento perto do fechamento, se necessária, antes de aplicar bloqueio adicional.

## Pedido agendado

- [ ] Permitir envio antecipado, inclusive de madrugada com a loja fechada, para atendimento futuro válido.
- [ ] Validar a data/hora de atendimento conforme funcionamento e regras de agenda aprovadas.
- [ ] Deixar a solicitação pendente por mais tempo para a equipe aceitar quando a loja voltar a funcionar.
- [ ] Não vencer o agendado pela mesma contagem imediata do pedido para agora enquanto a loja estiver fechada.
- [ ] Definir o marco inicial da contagem do agendado: abertura, antecedência do atendimento ou outra regra aprovada.
- [ ] Definir duração/limite de aceite do agendado e como tratar mudanças posteriores no funcionamento.
- [ ] Definir antecedência mínima e demais limites de agendamento, sem assumir capacidade ou prazo já confirmados.

## Operação e consistência

- [ ] Separar instante de criação da solicitação, aceite e horário de atendimento prometido.
- [ ] Registrar responsável e horário do aceite e conferir o prazo pela referência de tempo confiável definida para a operação.
- [ ] Preservar pedidos pendentes após reinício/reconexão; impedir aceite duplicado.
- [ ] Definir o que ocorre se a loja estiver aberta, mas o Caixa exigido estiver fechado.
- [ ] Não criar venda/preparo à meia-noite apenas porque o consumidor enviou uma solicitação agendada nesse horário.
- [ ] Aplicar as regras pertinentes ao canal WhatsApp na geração/envio da mensagem, sem simular controle de entrega externa ou aceite dentro do WhatsApp.

## Verificação

- [ ] Loja aberta aceita a modalidade para agora conforme a regra aprovada; loja fechada não a confirma.
- [ ] À meia-noite é possível solicitar agendamento para horário válido sem ser tratado como atendimento imediato.
- [ ] Horário inválido de atendimento é recusado com orientação clara.
- [ ] Pendência agendada atravessa o horário fechado conforme o prazo definido.
- [ ] Abertura do app, reconexão ou mudança do relógio local não reiniciam o prazo indevidamente.
- [ ] Relatórios operacionais usam os eventos/estados aprovados, sem somar solicitação não aceita como venda.

## Habilitação e alcance

- [ ] Exigir permissão de agendamento habilitada no nosso painel de administrador, além do módulo online.
- [ ] Aplicar janela de aceite rastreada à solicitação direta no sistema; não simular observação de aceite externo no WhatsApp.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
