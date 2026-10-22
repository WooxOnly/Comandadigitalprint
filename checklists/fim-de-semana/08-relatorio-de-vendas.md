# 08 — Relatório dos valores de vendas

Registro: 22/10/2026. Checklist de trabalho; os itens ainda não foram conferidos nesta rodada e podem aproveitar funções existentes. Caixa marcada significa tarefa efetivamente verificada, não apenas requisito anotado.

## Requisitos definidos

- Apresentar os valores vendidos para clientes que utilizam Caixa.
- Separar faturamento/vendas de imposto, gorjeta e fundo inicial.

## Checklist de execução

- [ ] Revisar o relatório de vendas existente antes de criar tela ou cálculo duplicado.
- [ ] Mostrar valores de vendas e quantidade de vendas no período/escopo escolhido.
- [ ] Discriminar imposto, tip e total recebido, sem confundi-los com faturamento dos produtos.
- [ ] Detalhar recebimentos em Dinheiro, CC, CD e bandeiras conforme os registros.
- [ ] Excluir abertura de caixa, fundo inicial e movimentos que não são vendas da contagem de vendas.
- [ ] Definir e exibir o tratamento de descontos, cancelamentos, estornos e taxa de entrega conforme o desenho aprovado.
- [ ] Conferir a relação de cada venda com pedido, sessão, operador e fechamento.
- [ ] Preservar os dados históricos de meios de pagamento anteriores à nova classificação.
- [ ] Respeitar permissões, loja/cliente e habilitação do módulo.

## Decisões pendentes

- [ ] Definir a apresentação de vendas brutas/líquidas, filtros e agrupamentos necessários.
- [ ] Definir a referência temporal de venda, pagamento e estorno para cada total do relatório.
- [ ] Definir claramente o que significa total vendido versus total recebido.

## Verificação para concluir

- [ ] Um conjunto conhecido de vendas concilia com recibos e fechamentos.
- [ ] Abrir caixa com troco não aumenta faturamento nem quantidade de vendas.
- [ ] Alterar o filtro do relatório não altera os registros da operação.
- [ ] Estado sem vendas e dados indisponíveis são apresentados sem inventar números.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
