# 10 — Cardápio digital com carrinho e envio de pedido, sem pagamento online

Registro: 22/10/2026. Checklist de trabalho; os itens ainda não foram conferidos nesta rodada e podem aproveitar funções existentes. Caixa marcada significa tarefa efetivamente verificada, não apenas requisito anotado.

## Requisitos definidos

- Frente separada do redesenho de Caixa, voltada também a vendedores que produzem alimentos em casa.
- Disponibilizar produtos numa página online própria do vendedor, com experiência simples de catálogo, carrinho e pedido, semelhante funcionalmente a uma loja de delivery.
- Na primeira versão não cobrar online: o cliente envia o pedido e o vendedor entra em contato.

## Checklist de desenho e execução

- [ ] Revisar o cardápio público e catálogo existentes para reaproveitar o que for adequado.
- [ ] Definir a página/link de cada loja e sua identidade, incluindo nome e logo disponíveis.
- [ ] Disponibilizar os produtos selecionados pelo vendedor com descrição/preço e opções aplicáveis.
- [ ] Permitir escolher itens, quantidades e opções, revisar e editar o carrinho.
- [ ] Apresentar preços e total claramente antes do envio.
- [ ] Oferecer checkout próprio para revisar/enviar o pedido, mesmo sem integração de pagamento.
- [ ] Coletar os dados mínimos necessários para o vendedor contatar o cliente.
- [ ] Registrar o pedido/solicitação e entregar as informações ao vendedor para contato/confirmacão.
- [ ] Definir e apresentar ao cliente a confirmação de recebimento e o estado real do pedido.
- [ ] Não marcar o pedido como pago nem confirmar preparo automaticamente apenas porque foi enviado.
- [ ] Integrar as opções de entrega/retirada habilitadas no portal, conforme o checklist específico.
- [ ] Garantir que cada loja mostre e receba apenas seus próprios produtos/pedidos.

## Decisões confirmadas após o registro inicial

- [x] Definir recebimento exclusivo por loja: WhatsApp com lançamento manual OU nova aba Pedidos online no tablet com aceite humano, dentro do módulo habilitado pelo nosso administrador.
- [x] Definir quem configura o número: cada cliente/vendedor no próprio portal; sem número global.
- [x] Definir a referência visual: reaproveitar o design, cores, logos e padrões atuais.

Estas caixas registram decisões de desenho explicitamente tomadas; não indicam telas ou integrações implementadas. As regras atuais de canais, habilitação administrativa e tablet estão registradas em [PEDIDOS-ONLINE-PRIMEIRA-VERSAO.md](../../PEDIDOS-ONLINE-PRIMEIRA-VERSAO.md).

## Decisões pendentes

- [ ] Definir dados de contato do consumidor e exigência ou dispensa de cadastro; respeitar o canal exclusivo escolhido pela loja.
- [ ] Definir aceite/recusa, indisponibilidade de produto, limites de produção e pedidos recebidos fora do atendimento.
- [ ] Definir quando a solicitação vira pedido operacional e como entra em cozinha/caixa/histórico.
- [ ] Definir como a regra de caixa aberto se aplica ao recebimento/aceite de pedidos online; não presumir bloqueio ou dispensa.

## Verificação para concluir

- [ ] Um cliente em celular, tablet ou PC consegue montar e enviar um pedido sem pagar online.
- [ ] O vendedor recebe exatamente os itens, quantidades e dados fornecidos, sem duplicação em nova tentativa.
- [ ] O fluxo explica que o vendedor entrará em contato e não sugere uma cobrança já efetuada.
- [ ] A experiência é própria do BistroHub/vendedor, sem copiar a identidade visual de terceiros.

A modalidade de atendimento dentro do restaurante está detalhada separadamente no [checklist 16 — Pedido por QR Code na mesa](16-pedido-por-qr-code-na-mesa.md).

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
