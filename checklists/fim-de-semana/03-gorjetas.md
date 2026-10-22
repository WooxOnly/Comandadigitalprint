# 03 — Gorjeta opcional: 18%, 20%, 22% e Outro

Registro: 22/10/2026. Checklist de trabalho; os itens ainda não foram conferidos nesta rodada e podem aproveitar funções existentes. Caixa marcada significa tarefa efetivamente verificada, não apenas requisito anotado.

## Requisitos definidos

- Na finalização, permitir ao cliente dar tip ou finalizar sem tip.
- Oferecer quatro opções de tip: 18%, 20%, 22% e Outro.
- Guardar e apresentar a gorjeta separadamente do produto e do imposto.

## Checklist de execução

- [ ] Oferecer as opções de 18%, 20%, 22% e Outro na etapa definida de finalização.
- [ ] Permitir finalizar sem gorjeta, sem obrigar a selecionar um percentual.
- [ ] Definir a entrada da gorjeta personalizada em Outro.
- [ ] Exibir o valor monetário da gorjeta antes da confirmação final.
- [ ] Recalcular a tip quando a base confirmada do pedido mudar, sem manter um valor percentual desatualizado.
- [ ] Registrar a gorjeta com o pedido/venda e a sessão de caixa, separada dos demais componentes.
- [ ] Discriminar tip no recibo financeiro, no fechamento e nos relatórios correspondentes.
- [ ] Validar valores negativos, campos incompletos e limites monetários.

## Decisões pendentes

- [ ] Confirmar se Outro aceita valor em dinheiro, percentual ou as duas entradas.
- [ ] Confirmar a base do percentual: antes/depois de imposto e descontos; depender da definição fiscal/financeira.
- [ ] Definir arredondamento monetário e comportamento ao trocar de percentual para valor personalizado.
- [ ] Definir o tratamento de gorjeta em cancelamento/estorno; não confundir gorjeta voluntária com taxa obrigatória.

## Verificação para concluir

- [ ] Cada percentual gera o valor correto sobre a base aprovada e mantém os centavos corretamente.
- [ ] Sem tip, o valor de gorjeta é zero e a finalização permanece disponível.
- [ ] Outro não preserva indevidamente o percentual anterior.
- [ ] Pedido, recibo, pagamento, fechamento e relatório mostram a mesma gorjeta, sem somá-la duas vezes.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
