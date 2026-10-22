# 13 — Pedidos programados/encomendas e integração operacional posterior

Registro: 22/10/2026. Checklist de trabalho; os itens ainda não foram conferidos nesta rodada e podem aproveitar funções existentes. Caixa marcada significa tarefa efetivamente verificada, não apenas requisito anotado.

## Situação desta demanda

O proprietário pediu para rever esta parte depois. O fluxo completo ainda precisa ser desenhado; não deve ser considerado decidido por existir cadastro/agendamento.

## Checklist de levantamento com o proprietário

- [ ] Conferir a tela e o comportamento atualmente implementados para encomendas, retirada, entrega e permissões.
- [ ] Mapear do cadastro/agendamento até cozinha, preparo, retirada/entrega, pagamento e conclusão.
- [ ] Definir quando a encomenda será enviada à cozinha e se isso será manual ou automático.
- [ ] Definir a ligação com Caixa, exigência de abertura, recebimento e pagamento.
- [ ] Definir a relação entre pedido online comum e agendamento/programação.
- [ ] Definir responsáveis/permissões em cada etapa e comportamento com módulos desativados.
- [ ] Definir cancelamento, estorno, reagendamento quando aplicável e impressão, sem presumir funções que não foram aprovadas.
- [ ] Manter distintos estado de preparo, pagamento e conclusão; concluir preparo não significa automaticamente receber dinheiro.

## Conferência dos registros anteriores

- [ ] Conferir o estado atual dos rótulos Data da retirada/entrega e Horário da retirada/entrega e da data em padrão americano.
- [ ] Conferir os campos obrigatórios, validação e detalhes/opções dos produtos antes de sua inclusão.
- [ ] Conferir a autorização/auditoria de cancelamento conforme as regras atuais documentadas, sem reutilizar como atuais as anotações antigas já substituídas.
- [ ] Separar o que já foi entregue do que realmente falta; os registros antigos em PENDENCIAS.md não provam, sozinhos, que uma função ainda está pendente.

## Verificação para concluir a etapa de desenho

- [ ] Há um fluxo documentado para cada combinação aplicável de módulos.
- [ ] Momento de envio à cozinha, vínculo com Caixa e recebimento foram definidos explicitamente.
- [ ] Os pontos ainda não decididos continuam identificados antes de iniciar sua implementação.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
