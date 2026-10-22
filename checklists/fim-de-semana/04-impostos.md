# 04 — Confirmar a regra do imposto antes de implementar o cálculo

Registro: 22/10/2026. Checklist de trabalho; os itens ainda não foram conferidos nesta rodada e podem aproveitar funções existentes. Caixa marcada significa tarefa efetivamente verificada, não apenas requisito anotado.

## O que precisa ser confirmado

O proprietário levantou uma hipótese sobre imposto e tip e pediu confirmação. Ainda não está decidido se a gorjeta entra na base nem qual base usar para os percentuais de gorjeta. Nenhuma hipótese deve ser tratada como regra fiscal confirmada.

## Checklist de pesquisa e decisão

- [ ] Confirmar país, estado/condado/localidade e moeda da primeira operação; inicialmente considerar a loja da Flórida/Orlando.
- [ ] Consultar fontes oficiais vigentes e a orientação fiscal aplicável à operação.
- [ ] Registrar fonte, link, data da consulta e a conclusão aplicável ao negócio.
- [ ] Confirmar a tributação dos produtos vendidos e se existem diferenças relevantes entre categorias/tipos de produto.
- [ ] Confirmar o tratamento da gorjeta voluntária e diferenciá-lo de uma taxa de serviço obrigatória.
- [ ] Confirmar o tratamento da entrega quando houver cobrança dessa taxa.
- [ ] Definir a incidência sobre os valores dos produtos considerando os descontos que forem permitidos.
- [ ] Definir com o proprietário a base sobre a qual calcular os percentuais de tip.
- [ ] Definir arredondamento por item/pedido e exibição monetária, para que o total feche em centavos.
- [ ] Documentar quais parâmetros serão configuráveis e quem poderá alterá-los.

## Checklist de implementação após a confirmação

- [ ] Revisar o cálculo existente e adequar somente o que a regra confirmada exigir.
- [ ] Discriminar subtotal/produtos, descontos quando aplicáveis, imposto, tip e total final.
- [ ] Preservar os valores e a regra aplicada às vendas históricas; não recalcular vendas antigas silenciosamente com configuração nova.

## Verificação para concluir

- [ ] Exemplos de cálculo aprovados cobrem pedido sem tip, tip percentual e tip personalizada.
- [ ] Entrega/desconto são conferidos conforme as decisões tomadas, sem base inventada.
- [ ] Pedido, recibo, fechamento e relatório conciliam com o mesmo cálculo.
- [ ] A hipótese fiscal foi substituída por uma conclusão documentada antes de marcar esta demanda concluída.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
