# 16 — Pedido pelo QR Code dentro do restaurante, com entrega na mesa

Registro: 22/10/2026. Nova demanda importante da frente de cardápio online. Checklist de planejamento; nenhuma funcionalidade ou QR Code operacional foi implementado nesta etapa.

## Objetivo e alternativas apresentadas pelo proprietário

- Permitir que o cliente sentado no restaurante leia um QR Code, escolha os produtos no próprio celular e envie o pedido para atendimento na mesa.
- Alternativa A: QR Code específico de cada mesa, que já identifica a mesa automaticamente.
- Alternativa B: QR Code genérico do atendimento dentro do restaurante; o cliente informa a mesa e solicita a entrega nela.
- O QR Code genérico interno deve abrir o contexto de atendimento no local, distinto de um pedido externo para delivery/retirada.
- A decisão entre adotar uma alternativa ou oferecer ambas permanece para o desenho do fluxo; não tratar a sugestão como escolha definitiva de uma delas.

## Checklist — acesso e escolha dos produtos

- [ ] Revisar o cardápio online planejado e reutilizar o catálogo/carrinho da mesma loja, sem criar um cadastro paralelo de produtos.
- [ ] Abrir o cardápio no navegador do celular ao ler o QR Code, sem exigir instalação do aplicativo do restaurante para esse acesso.
- [ ] Identificar claramente o restaurante e a modalidade de consumir no local/receber na mesa.
- [ ] Permitir selecionar produtos, quantidades e opções disponíveis, revisar o carrinho e conferir os valores aplicáveis antes de enviar.
- [ ] Preservar o contexto da loja e da mesa durante a navegação e edição do carrinho.
- [ ] Manter uma experiência simples e utilizável nos idiomas e tamanhos de tela suportados.

## Checklist — QR Code específico da mesa

- [ ] Associar cada QR Code à loja correta e a uma mesa válida daquela loja.
- [ ] Preencher a mesa automaticamente e mostrá-la ao cliente antes da confirmação do pedido.
- [ ] Definir como o restaurante gera, identifica e imprime/disponibiliza os códigos para suas mesas.
- [ ] Definir o comportamento para uma mesa desativada, renumerada ou indisponível, sem enviar para a mesa errada.
- [ ] Confirmar se o cliente poderá corrigir a mesa ou precisará pedir auxílio, sem adotar uma regra implicitamente.

## Checklist — QR Code genérico interno

- [ ] Associar o QR Code à loja e ao atendimento dentro do restaurante.
- [ ] Solicitar que o cliente informe/selecione sua mesa antes do envio.
- [ ] Mostrar a mesa escolhida na revisão do pedido.
- [ ] Validar a mesa no contexto da loja, sem aceitar pedido sem a identificação exigida.
- [ ] Usar a modalidade de entrega na mesa, sem exigir um endereço de delivery externo para esse pedido.

## Checklist — recebimento e operação no restaurante

- [ ] Definir como a equipe é avisada de um novo pedido recebido por QR Code.
- [ ] Mostrar a origem do pedido e a mesa para o atendimento e para os registros operacionais pertinentes.
- [ ] Definir o aceite pelo restaurante e o momento em que o pedido entra no preparo, sem presumir envio automático à cozinha já aprovado.
- [ ] Compatibilizar o fluxo com Caixa aberto quando esse módulo estiver habilitado, sem criar uma dispensa silenciosa da regra solicitada.
- [ ] Separar pedido recebido, aceito, em preparo, entregue na mesa e pago conforme o fluxo que for definido.
- [ ] Manter a primeira etapa sem pagamento online integrado; registrar/receber o pagamento conforme o fluxo de Caixa aplicável.
- [ ] Definir o que o cliente vê após enviar: confirmação de recebimento, identificação do pedido e informações de atendimento disponíveis.
- [ ] Respeitar os módulos habilitados e preservar os padrões aprovados de pedido, cozinha, impressão e relatórios.

## Decisões pendentes

- [ ] Escolher QR por mesa, genérico interno ou suporte às duas alternativas.
- [ ] Implementar configuração de mesas e preset de QR no nosso painel de administrador, com autorização por cliente.
- [ ] Definir se é necessário nome/contato/cadastro do cliente neste atendimento local; não herdar obrigatoriedades do delivery sem avaliar a facilidade do uso.
- [ ] Definir se pedidos de várias pessoas na mesma mesa ficam separados ou vinculados a uma comanda compartilhada.
- [ ] Definir como acrescentar itens, repetir pedidos e tratar mudança de mesa, cancelamento ou indisponibilidade.
- [ ] Definir regras para recebimento quando o atendimento estiver fechado ou houver indisponibilidade, e quem pode aceitar/corrigir o pedido.
- [ ] Definir quando e como o futuro checkout com pagamento online também poderá atender essa modalidade.

## Verificação para concluir

- [ ] QR específico abre a loja/mesa correta e o pedido recebido pela equipe identifica essa mesma mesa.
- [ ] QR genérico permite informar a mesa e bloqueia envio sem os dados obrigatórios definidos para essa modalidade.
- [ ] Cliente consegue montar, revisar e enviar um pedido no navegador, recebendo confirmação condizente com o estado real.
- [ ] Entrega na mesa não é confundida com delivery externo ou retirada.
- [ ] Recarregar/repetir o envio não cria pedidos duplicados.
- [ ] A identificação da mesa acompanha as etapas aprovadas de atendimento/preparo/entrega, sem mudar estado de pagamento indevidamente.
- [ ] Com e sem módulo de Caixa, o comportamento segue as regras definidas para cada combinação.

## Relação com as demais demandas

- [Cardápio online e carrinho](10-cardapio-online.md).
- [Delivery/retirada externos configurados no portal](11-delivery-e-retirada.md).
- [Fluxo completo entre módulos](14-operacoes-e-integracao.md).
- [Pagamento online futuro](12-checkout-pago-futuro.md).

## Dependências e preset — decisão mais recente

- [ ] No nosso painel de administrador, habilitar o módulo online e a permissão de pedidos na mesa por cliente.
- [ ] Configurar ali a quantidade de mesas e o modelo de QR: por mesa ou genérico interno com mesa informada; a última fala repetiu “por mesa”, sem escolher um terceiro formato.
- [ ] Permitir QR/pedido de mesa apenas no recebimento automático na aba Pedidos online; nunca no modo WhatsApp.
- [ ] Ocultar/bloquear geração e uso de QR de mesa quando essas condições não forem atendidas.
- [ ] No servidor, bloquear também envios por QR já impresso, link antigo ou página em cache após troca para WhatsApp/desabilitação.
- [ ] Preservar pedidos já recebidos ao alterar o preset; definir o tratamento das pendências sem cancelamento automático.
- [ ] Diferenciar QR de mesa de um eventual QR público de compartilhamento do cardápio.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
