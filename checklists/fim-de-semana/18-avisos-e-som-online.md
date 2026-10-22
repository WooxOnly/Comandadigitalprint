# 18 — Pendências, aviso visual e toque de novo pedido online no tablet

Requisito confirmado em 22/10/2026. O cliente define a configuração dos alertas no portal. Reaproveitar a identidade e os componentes existentes; registro não equivale a recurso implementado.

## Checklist de execução

- [ ] Identificar pedidos pendentes visualmente na aba Pedidos online.
- [ ] Oferecer aviso curto na tela do tablet para novo pedido/pendência, conforme a configuração.
- [ ] Oferecer toque/som para a chegada de pedido online, conforme a configuração.
- [ ] Sincronizar/cachear a configuração da loja para os tablets autorizados conforme o modelo que for definido.
- [ ] Conferir o reaproveitamento do áudio existente em src/ui/useKitchenAlerts.ts, sem confundir alerta de cozinha já existente com novo alerta online.
- [ ] Associar cada alerta à solicitação correta e permitir abrir seus detalhes.
- [ ] Encerrar/atualizar a indicação de pendência conforme o aceite ou demais estados aprovados.
- [ ] Manter a solicitação salva mesmo se o tablet estiver sem conexão; definir a recuperação da lista na reconexão.
- [ ] Evitar duplicar o toque/aviso de um mesmo evento após sincronização, recarga ou reinício.

## Decisões pendentes

- [ ] Definir combinações de aviso visual e som e os valores iniciais da configuração.
- [ ] Definir se haverá lembretes repetidos, sua frequência e quando param.
- [ ] Definir alcance com app aberto, em segundo plano e fechado. “Pushzinho” na tela não comprova que já foi escolhida uma infraestrutura de push remoto.
- [ ] Se necessário push do sistema, avaliar permissões, credenciais, entrega e custos antes de contratar/integrar serviço.
- [ ] Definir comportamento com vários tablets e quem deixa de receber o alerta quando outro operador aceita.
- [ ] Definir o que acontece com notificações de pedidos agendados recebidos durante o horário fechado.

## Verificação

- [ ] Avisos e som respeitam a configuração do cliente e as permissões/condições reais do dispositivo.
- [ ] Contagem de pendências corresponde à lista, mesmo após aceite em outro tablet.
- [ ] Novo pedido é distinguido de uma simples atualização de lista.
- [ ] Notificações/áudio não alteram pedido, Caixa ou cozinha por si mesmos.
- [ ] Testes no tablet físico cobrem o alcance efetivamente prometido; não declarar push em segundo plano validado só por testar aviso dentro do app.

## Dependência do canal

- [ ] Avisos de chegada automática no tablet pertencem ao canal automático; WhatsApp exige lançamento manual e não gera chegada automática paralela.
- [ ] Definir avisos das pendências antigas após troca de canal, preservando seus registros.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
