# 05 — Dinheiro, CC, CD e bandeiras; sem pinpad inicialmente

Registro: 22/10/2026. Checklist de trabalho; os itens ainda não foram conferidos nesta rodada e podem aproveitar funções existentes. Caixa marcada significa tarefa efetivamente verificada, não apenas requisito anotado.

## Requisitos definidos

- Meios iniciais: Dinheiro, CC (cartão de crédito) e CD (cartão de débito).
- Separar tipo de cartão da bandeira; contemplar Visa e Mastercard.
- Na primeira versão o registro é manual, sem integração com pinpad. Pagamentos em cartão são realizados/confirmados externamente.
- Prever integração futura, sem iniciá-la nesta etapa.

## Checklist de execução

- [ ] Mapear a escolha/identificação do pagamento no fluxo de iniciar e finalizar um pedido com Caixa.
- [ ] Apresentar Dinheiro, CC e CD de forma clara ao operador.
- [ ] Registrar crédito e débito como tipos distintos, mantendo a bandeira em campo separado.
- [ ] Contemplar CC/Visa, CC/Mastercard, CD/Visa e CD/Mastercard.
- [ ] Confirmar manualmente o recebimento externo antes de registrar a venda como paga.
- [ ] Em dinheiro, conferir valor recebido e troco conforme o comportamento que for aprovado.
- [ ] Vincular pagamento, pedido e sessão de caixa sem duplicar recebimentos em nova tentativa de envio.
- [ ] Exibir as mesmas classificações no recibo financeiro, histórico, fechamento e relatórios.
- [ ] Preservar registros antigos de formas já existentes, inclusive Zelle, sem incluí-las automaticamente na nova lista inicial.
- [ ] Preservar as informações necessárias para uma futura integração, sem declarar uma autorização bancária inexistente.

## Decisões pendentes

- [ ] Definir o momento exato da seleção da forma e da confirmação do recebimento.
- [ ] Definir outras bandeiras e o comportamento quando a bandeira não for informada/conhecida.
- [ ] Revisar a divisão de pagamento existente e decidir como ela ficará com CC/CD; não presumir mudança sem desenho.
- [ ] Definir troco, pagamento insuficiente e tratamento de cancelamentos/estornos em cada forma.

## Verificação para concluir

- [ ] Crédito e débito não são agrupados indevidamente e a bandeira não substitui o tipo.
- [ ] Cartão não aumenta o saldo de dinheiro físico esperado no caixa.
- [ ] Registrar cartão manualmente não afirma que o app processou a cobrança.
- [ ] Nova tentativa após perda de resposta não registra a mesma venda duas vezes.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
