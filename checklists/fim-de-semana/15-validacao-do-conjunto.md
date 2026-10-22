# 15 — Conferência final do conjunto antes de uma entrega

Registro: 22/10/2026. Checklist de trabalho; os itens ainda não foram conferidos nesta rodada e podem aproveitar funções existentes. Caixa marcada significa tarefa efetivamente verificada, não apenas requisito anotado.

## Como usar este checklist

Critérios de verificação para quando as funcionalidades forem implementadas. Não solicitar publicação ou novo APK apenas por marcar os requisitos em documento.

## Cenários operacionais

- [ ] Cliente sem Caixa continua usando o pedido e os demais módulos habilitados.
- [ ] Cliente com Caixa precisa da abertura aplicável e consegue abrir com zero ou com fundo inicial.
- [ ] Pedido com produtos/opções preserva os valores e o layout durante edição/rotação.
- [ ] Sem tip, tip de 18%, 20%, 22% e Outro seguem a base confirmada.
- [ ] Imposto usa a regra efetivamente pesquisada/aprovada.
- [ ] Dinheiro, CC e CD e suas bandeiras ficam corretos em cada etapa.
- [ ] Finalização, cozinha, entrega/retirada e pagamento mantêm os estados definidos no desenho.
- [ ] Fechamento com e sem diferença concilia com os registros.
- [ ] Relatórios de fechamentos, vendas e ticket médio conciliam entre si conforme suas bases definidas.
- [ ] Cardápio online sem pagamento permite pedido completo e contato do vendedor, com modalidades configuradas.

- [ ] QR Code específico identifica a mesa; QR Code genérico interno solicita a mesa, conforme as alternativas aprovadas, e o pedido mantém a modalidade de atendimento local.

## Preservação e compatibilidade

- [ ] Dados antigos, inclusive meios de pagamento anteriores, permanecem consultáveis e com seus valores originais.
- [ ] Permissões e escopo de cliente/loja são preservados.
- [ ] Nova tentativa de envio, falha de conexão e reinício não duplicam cobranças ou registros financeiros.
- [ ] Valores monetários, centavos e somas conciliam sem usar arredondamento de gráfico no lugar de cálculo financeiro.
- [ ] Celular/tablet/PC, orientação, fontes ampliadas, temas e idiomas preservam o layout aprovado.
- [ ] Distinguir testes automatizados/navegador de validação no tablet, impressão e operação física real.

## Encerramento e entrega

- [ ] Registrar o que foi conferido, alterado e validado, bem como as pendências restantes.
- [ ] Confirmar que pedidos programados e checkout pago continuam identificados como etapas posteriores quando ainda não realizados.
- [ ] Seguir a autorização de publicação que estiver vigente no momento da entrega.
- [ ] Nova compilação de APK depende de autorização específica; não presumir autorização por este planejamento.

## Configuração online e cenários dependentes

- [ ] Portal da loja não consegue habilitar módulo/agendamento/mesa reservados ao nosso administrador.
- [ ] Cliente sem habilitação não recebe a funcionalidade por chamada direta à API.
- [ ] Exatamente um canal ativo; WhatsApp não cria chegada automática e tablet exige aceite humano.
- [ ] Quantidade de mesas e modelo de QR respeitam o preset do administrador e isolamento entre clientes.
- [ ] QR de mesa funciona somente no automático, inclusive após troca de modo com link antigo/cache.
- [ ] Loja fechada impede pedido para agora, mas permite agendado autorizado para atendimento futuro válido.
- [ ] Avisos configurados não duplicam solicitação; troca/desativação preserva histórico e pendências.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
