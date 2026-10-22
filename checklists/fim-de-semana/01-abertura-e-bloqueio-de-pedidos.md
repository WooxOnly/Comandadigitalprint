# 01 — Abertura de caixa, responsável, troco inicial e bloqueio de pedidos

Registro: 22/10/2026. Checklist de trabalho; os itens ainda não foram conferidos nesta rodada e podem aproveitar funções existentes. Caixa marcada significa tarefa efetivamente verificada, não apenas requisito anotado.

## Requisitos definidos

- Com o módulo de Caixa ativo, só permitir iniciar/confirmar pedidos quando houver caixa aberto.
- Registrar quem abriu o caixa e a data/hora efetiva da abertura.
- Oferecer dinheiro inicial para troco, inclusive zero. Esse fundo não é venda nem faturamento.
- Manter o comportamento normal de pedidos quando o cliente não utiliza Caixa.

## Checklist de execução

- [ ] Conferir como a abertura e o vínculo por tablet/loja funcionam hoje, antes de alterar.
- [ ] Mapear todos os caminhos para iniciar ou confirmar pedidos, incluindo acessos diretos e retomada de rascunho.
- [ ] Conferir o módulo da loja e exigir uma sessão de caixa aberta nos caminhos aplicáveis.
- [ ] Mostrar orientação clara para abrir o caixa quando a operação estiver bloqueada.
- [ ] Registrar a identidade autenticada do operador que abriu; não aceitar um nome livre como substituto dessa identidade.
- [ ] Registrar o instante de abertura e apresentar data/hora no fuso da operação.
- [ ] Oferecer o campo de saldo inicial para troco, com zero permitido e validação de valor monetário.
- [ ] Manter o saldo inicial identificado separadamente no histórico, nos totais e no fechamento.
- [ ] Vincular cada pedido/movimentação financeira à sessão de caixa correspondente.
- [ ] Garantir que repetição de um envio ou resposta perdida não crie duas aberturas/operações.

## Decisões pendentes

- [ ] Definir se a sessão será por tablet, operador, caixa físico ou compartilhada na loja; conferir a regra existente.
- [ ] Definir o comportamento de rascunhos quando o caixa for fechado e como resolver outra abertura concorrente.
- [ ] Confirmar as permissões de abrir e a moeda da operação; não presumir conversão automática BRL/USD.
- [ ] Definir o comportamento sem conexão a partir das garantias financeiras existentes.

## Verificação para concluir

- [ ] Com Caixa ativo e fechado, nenhum caminho aplicável inicia/confirma um pedido sem a abertura exigida.
- [ ] Com Caixa ativo e aberto, o pedido fica vinculado à sessão correta.
- [ ] Com Caixa desativado, pedidos continuam funcionando normalmente.
- [ ] Abertura com zero e com fundo de troco preserva operador, horário e valor após reiniciar/sincronizar.
- [ ] O fundo inicial não aumenta o relatório de vendas nem o ticket médio.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
