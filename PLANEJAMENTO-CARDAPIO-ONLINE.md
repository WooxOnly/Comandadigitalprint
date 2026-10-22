# Cardápio digital e pedidos online — requisitos registrados em 22/10/2026

Checklists detalhados por demanda, para acompanhar a execução: [CHECKLIST-FIM-DE-SEMANA.md](CHECKLIST-FIM-DE-SEMANA.md). Os requisitos deste planejamento são preservados; decisões novas devem ser refletidas no checklist correspondente.

Frente separada do redesenho do Caixa, importante para a expansão do BistroHub a pequenos vendedores e pessoas que produzem alimentos em casa. Requisitos para estudar e desenhar; nenhuma implementação ou publicação foi solicitada nesta etapa.

## Objetivo e experiência do cliente

- Disponibilizar uma página online própria de cada vendedor/loja, compartilhável por link, com identidade visual e produtos disponíveis para pedido.
- Experiência simples de catálogo e montagem de pedido, semelhante em funcionalidade a uma página de loja em aplicativo de delivery, sem copiar a marca ou identidade do DoorDash.
- Facilitar a escolha de produtos, quantidades e opções do catálogo que forem aplicáveis, carrinho e revisão do pedido, com preços e totais claros.
- Funcionar bem em celular, tablet e computador. A facilidade de pedir deve orientar o desenho; requisitos de cadastro/login ainda serão definidos.
- Revisar o cardápio público já existente e o catálogo do sistema para aproveitar o que for adequado, evitando cadastros/telas duplicados e mantendo cada cliente/loja isolado.

## Primeira versão — envio do pedido sem pagamento online

- O cliente escolhe os produtos, revisa o pedido e fornece os dados necessários para ser contatado pelo vendedor.
- Ao finalizar, o pedido/solicitação chega ao vendedor, que entra em contato para combinar ou confirmar o atendimento e o pagamento fora da plataforma.
- Pode haver um checkout próprio para revisar e enviar o pedido mesmo sem cobrança online. Separar esse checkout de envio de pedido de uma integração de pagamento.
- Não exigir integração de pagamento, pinpad ou gateway nesta primeira versão. Não considerar um pedido pago simplesmente porque foi enviado.
- Definir no desenho os dados mínimos de contato, canal de contato/notificação, confirmação de recebimento ao cliente, aceite pelo vendedor e tratamento de indisponibilidade. Não presumir WhatsApp, SMS ou e-mail como canal já escolhido.

## Entrega e retirada configuradas no portal

- Permitir ao vendedor configurar no portal as modalidades disponíveis: delivery/entrega e retirada.
- O cliente deve escolher entre as modalidades habilitadas para aquela loja; coletar endereço quando necessário para entrega e apresentar as instruções pertinentes à retirada.
- Definir no desenho horários, prazos de produção/atendimento, disponibilidade dos produtos, eventual área/taxa de entrega e quais informações da operação doméstica serão publicadas.
- Não presumir contratação de entregadores ou integração com plataformas externas de delivery.

## Etapa futura — checkout com pagamento

- Avaliar um checkout integrado à experiência do cliente para pagar o próprio pedido.
- Candidatos para pesquisa posterior incluem Stripe Checkout e Mercado Pago, conforme país, moeda, disponibilidade e modelo comercial do vendedor. Nenhum provedor foi selecionado ou validado nesta etapa.
- Confirmar taxas, meios de pagamento, repasse ao vendedor, titularidade da conta recebedora, estornos e a experiência de checkout antes de escolher a solução.
- Definir a relação entre valor dos produtos, taxa de entrega, imposto e gorjeta; reaproveitar as definições fiscais e financeiras do Caixa quando forem aplicáveis e confirmadas.

## Integração com os módulos existentes — decisões pendentes

- Definir como o pedido online recebido é aceito pelo vendedor e entra na operação de pedidos, cozinha, histórico e relatórios, respeitando os módulos habilitados.
- Compatibilizar com a regra de caixa aberto quando o módulo Caixa existir: decidir em qual momento a solicitação online vira um pedido operacional/venda e quando o caixa precisa estar aberto. Não impor nem dispensar esse bloqueio silenciosamente.
- Pedidos programados/encomendas e sua integração serão desenhados na etapa posterior já solicitada pelo proprietário; não presumir que a disponibilidade online resolve o agendamento.
- Separar requisitos anotados, desenho aprovado, implementação e validação. Não gerar APK, iniciar checkout real, alterar dados ou publicar uma página apenas por este registro de planejamento.
