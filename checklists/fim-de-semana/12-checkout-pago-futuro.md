# 12 — Pesquisa e futura integração de checkout com pagamento online

Registro: 22/10/2026. Checklist de trabalho; os itens ainda não foram conferidos nesta rodada e podem aproveitar funções existentes. Caixa marcada significa tarefa efetivamente verificada, não apenas requisito anotado.

## Situação desta demanda

Etapa futura. A primeira versão de pedidos online permanece sem cobrança integrada. O proprietário quer avaliar um checkout no qual o próprio cliente possa pagar; nenhum provedor foi escolhido.

## Checklist de pesquisa e decisão

- [ ] Confirmar país, moeda e operação dos primeiros vendedores.
- [ ] Definir quem será titular da conta de pagamento e quem receberá os valores de cada loja.
- [ ] Pesquisar checkout hospedado/integrado e a experiência adequada ao cliente.
- [ ] Avaliar candidatos como Stripe Checkout e Mercado Pago, sem tratá-los como escolhas confirmadas nem limitar a pesquisa a eles.
- [ ] Conferir disponibilidade para o modelo de negócio, meios de pagamento, taxas e prazos de repasse.
- [ ] Definir cancelamentos, estornos, falhas, pagamentos pendentes e a confirmação efetiva do recebimento.
- [ ] Confirmar o tratamento de produtos, imposto, tip e entrega no total cobrado.
- [ ] Definir como o pagamento entra no Caixa e nos relatórios sem duplicar o registro manual.
- [ ] Definir como cada evento de pagamento será associado ao pedido e conciliado com o provedor.

## Checklist de implementação somente após a escolha

- [ ] Documentar o fluxo aprovado e a configuração por vendedor/loja.
- [ ] Validar em ambiente de testes a confirmação de pagamento e os caminhos de falha/cancelamento/estorno.
- [ ] Não considerar a simples volta do cliente à página como prova suficiente de pagamento.
- [ ] Preservar a opção sem pagamento online quando ela fizer parte da configuração aprovada.

## Verificação para concluir

- [ ] Provedor e regras estão confirmados antes de conectar recebimentos reais.
- [ ] Um pedido não é cobrado nem contabilizado duas vezes em reenvios/retornos.
- [ ] Totais de pedido, pagamento, estorno e relatórios conciliam.

Esta demanda não deve bloquear nem ser apresentada como já incluída na primeira versão sem pagamento online.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
