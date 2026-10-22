# 09 — Relatório de ticket médio

Registro: 22/10/2026. Checklist de trabalho; os itens ainda não foram conferidos nesta rodada e podem aproveitar funções existentes. Caixa marcada significa tarefa efetivamente verificada, não apenas requisito anotado.

## Requisito definido

Apresentar o valor médio por venda para os clientes que utilizam Caixa, reconciliado com o relatório de vendas.

## Decisões necessárias antes do cálculo

- [ ] Definir a base: vendas brutas ou líquidas e quais descontos entram.
- [ ] Confirmar o tratamento de imposto, gorjeta e eventual taxa de entrega.
- [ ] Definir quais vendas entram no divisor, incluindo o tratamento de cancelamentos e estornos parciais/integrais.
- [ ] Definir a referência de período/loja/caixa que será usada.

## Checklist de execução

- [ ] Registrar a fórmula aprovada: base monetária de vendas definida dividida pela quantidade de vendas definida para o mesmo escopo.
- [ ] Usar os mesmos critérios do relatório de vendas, sem contar aberturas, troco inicial ou outras movimentações como vendas.
- [ ] Mostrar o ticket médio em moeda, com arredondamento monetário adequado.
- [ ] Permitir entender a base e a quantidade utilizadas no indicador, na apresentação que for aprovada.
- [ ] Tratar período sem vendas sem divisão por zero nem fabricação de uma venda.
- [ ] Preservar a distinção entre ticket médio financeiro e médias de pedidos/horários ou TMA da cozinha.

## Verificação para concluir

- [ ] Com base aprovada de 1.000 e 20 vendas válidas, o resultado é 50 na moeda da operação; este é apenas um exemplo aritmético.
- [ ] Contar um pagamento dividido não duplica a quantidade de vendas.
- [ ] Resultado concilia com os mesmos filtros e critérios do relatório de vendas.
- [ ] Casos de desconto, estorno e ausência de vendas seguem as decisões documentadas.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
