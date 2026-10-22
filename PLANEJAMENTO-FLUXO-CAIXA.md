# Fluxo de Caixa — requisitos registrados em 22/10/2026

Planejamento para retomarmos em um possível momento no fim de semana. Este documento registra os pedidos do proprietário; não significa implementação, publicação ou aprovação de detalhes ainda em aberto.

## Abertura e vínculo dos pedidos

- Com o módulo de Caixa ativado, só permitir iniciar/confirmar pedidos quando houver caixa aberto. Sem o módulo, manter o fluxo normal.
- Registrar o operador autenticado responsável pela abertura e a data/hora efetiva.
- Oferecer fundo inicial em dinheiro para troco, opcional e aceitando zero, disponível para a operação brasileira e americana conforme a moeda configurada.
- Tratar o fundo de troco como saldo inicial, separado de vendas/faturamento, e considerá-lo na conferência do fechamento.
- Vincular pedidos e movimentações ao respectivo caixa. O desenho completo deve revisar os caminhos de entrada de pedidos e o comportamento da operação offline.

## Gorjeta (tip) na finalização do pedido

- Perguntar se o cliente deseja deixar gorjeta; permitir finalizar sem gorjeta.
- Oferecer quatro opções: **18%, 20%, 22% e Outro**.
- Outro permite informar uma gorjeta personalizada; detalhar o formato dessa entrada no desenho do fluxo.
- Registrar e apresentar gorjeta separadamente dos produtos, do imposto e dos demais componentes do total. Manter essa separação nos recibos e na conferência do caixa.
- Não confundir gorjeta voluntária com eventual taxa de serviço obrigatória.

## Imposto — confirmação pendente

- O proprietário pediu para confirmar a regra tributária antes de definir o cálculo: sobre quais valores o imposto incide e se a gorjeta entra ou não na base.
- Confirmar com fontes oficiais da jurisdição da loja (inicialmente Flórida/Orlando) e a orientação fiscal aplicável, distinguindo gorjeta voluntária de cobrança obrigatória.
- Confirmar também a base dos percentuais de tip (subtotal antes/depois do imposto) antes da implementação. Não adotar como fato a hipótese de imposto sobre a tip.
- Manter produtos, imposto e gorjeta discriminados, independentemente da regra que for confirmada.

## Formas de pagamento

- No fluxo de pedido com Caixa, contemplar a identificação da forma de pagamento desde o início e seu registro na finalização; detalhar a sequência operacional ao desenhar o fluxo completo.
- Primeira versão: **Dinheiro**, **CC — cartão de crédito** e **CD — cartão de débito**.
- Em CC/CD, registrar a bandeira, inicialmente contemplando **Visa** e **Mastercard**. Definir a lista completa e como tratar outras bandeiras no desenho.
- Tipo de cartão e bandeira são informações distintas: por exemplo, CC/Visa e CD/Mastercard.
- Sem integração com pinpad na primeira versão: o operador registra/confirma manualmente o pagamento realizado externamente. Não tratar o registro manual como autorização de uma transação bancária pelo app.
- Preparar o desenho para futura integração com pinpad, preservando as informações de pagamento e o histórico.
- Eventuais meios existentes fora da nova lista inicial, como Zelle, precisam manter seus registros históricos; não incluí-los automaticamente nas opções da primeira versão solicitada.

## Fechamento do caixa no fim do dia

- Desenhar o fluxo completo de encerramento e conferência das movimentações vinculadas ao caixa.
- Consolidar vendas, impostos, gorjetas e recebimentos por Dinheiro/CC/CD, com o detalhamento de bandeiras.
- Considerar o saldo inicial de troco na conferência do dinheiro; definir a apresentação do esperado, contado e eventuais diferenças.
- Registrar responsável e data/hora do fechamento. Regras de pendências, ajustes, cancelamentos/estornos e reabertura devem ser definidas na revisão do fluxo; não presumir decisões ainda não tomadas.

## Etapas posteriores

- Pedido programado/encomendas será revisto depois, conforme o proprietário solicitou. A integração completa com pedidos/cozinha/caixa continua pendente desse desenho.
- Não iniciar implementação, compilação de APK, migração de dados ou publicação apenas por este registro de planejamento.
