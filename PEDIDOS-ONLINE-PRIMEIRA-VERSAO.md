# Pedidos online — desenho da primeira versão

Atualizado em 22/10/2026 após o proprietário autorizar começar a frente online. Este documento fecha as decisões já tomadas e identifica a decisão pendente sobre o tablet. Não declara funcionalidades implementadas ou publicadas.

## Decisões confirmadas nesta conversa

- Começar o cardápio digital com preços, seleção de produtos, carrinho e envio de pedidos, aproveitando a estrutura já existente.
- Receber as solicitações no portal do próprio cliente/vendedor.
- Depois de salvar o pedido, oferecer ao consumidor uma mensagem pronta para ele enviar pelo próprio WhatsApp.
- Não usar envio automático pela API do WhatsApp na primeira versão. Abrir a mensagem não comprova que o consumidor efetivamente a enviou.
- Cada cliente configura seu WhatsApp comercial no próprio portal. Não existe um número fixo global do BistroHub; o número da Seabra não é pré-requisito para desenvolver a opção configurável.
- Reutilizar o design existente: cores, identidade, logos, componentes e padrões responsivos/idiomas/temas.
- Primeira etapa sem cobrança online. Checkout de envio de pedido não representa processamento de pagamento.
- O proprietário pediu para pensar melhor na operação pelo tablet antes de fechar esse ponto.

## Fluxo de recebimento proposto

1. Consumidor acessa o link da loja no navegador.
2. Consulta os produtos disponíveis e seus preços, escolhe itens/quantidades/opções e revisa o carrinho.
3. Escolhe a modalidade habilitada de entrega/retirada e informa os dados necessários para contato/atendimento.
4. O servidor valida os produtos e valores atuais e salva uma solicitação online própria daquela loja.
5. O consumidor recebe a confirmação de que a solicitação foi salva no portal.
6. Se o vendedor configurou WhatsApp e a opção está disponível, o consumidor pode abrir a mensagem pronta e confirmar o envio no WhatsApp.
7. O vendedor consulta a solicitação no portal e entra em contato/define o atendimento, conforme o fluxo que for aprovado.

O pedido deve permanecer salvo mesmo se o cliente não tiver WhatsApp, fechar o aplicativo ou desistir de enviar a mensagem. Não mostrar “mensagem entregue” sem confirmação real desse serviço.

## Configuração pelo portal do vendedor

- Identificar o cliente/loja autorizado e seu link público.
- Configurar o número comercial completo do WhatsApp, com código de país e DDD.
- Definir os produtos disponibilizados e aproveitar preços/descrições/disponibilidade do catálogo existente.
- Configurar entrega e retirada e as instruções necessárias.
- Configurar a identidade pública da própria loja e sua logo, com publicação explícita.
- Manter configurações e solicitações isoladas por cliente/loja. Confirmar a herança ou configuração por unidade no caso de grupos com várias lojas.
- Oferecer publicação/pausa da opção online conforme a habilitação autorizada do módulo; não tornar todas as lojas públicas automaticamente.

## Tablet — alternativas ainda para decidir

### A. Portal no navegador do tablet na primeira etapa

- A equipe abre a caixa de entrada do portal no navegador do tablet com suas credenciais.
- O app nativo atual permanece como está; esta alternativa não precisa de novo APK para mostrar a lista web.
- Pode ser o primeiro passo para testar o recebimento online antes de integrar a rotina nativa.
- Ainda é preciso definir o procedimento do funcionário ao receber, contatar e atender a solicitação.

### B. Caixa de entrada separada dentro do app

- Nova área de solicitações online no tablet, habilitada conforme a loja/módulo e permissões.
- Solicitações recebidas permanecem separadas de pedidos de cozinha, vendas e Caixa até o momento explicitamente definido.
- É necessário desenhar recebimento, notificação, aceite, edição, impressão e eventual passagem para o fluxo atual.
- A inclusão no app exige alteração e atualização de APK; não compilar sem a autorização específica vigente.
- Definir a interação com caixa aberto e evitar pedidos/recebimentos duplicados.

### C. Fechar o desenho operacional do tablet antes de escolher

- Manter a escolha em aberto enquanto o proprietário detalha a rotina desejada.
- Não assumir entrada automática na cozinha ou no financeiro, nem prometer ausência total de alterações no app se a alternativa B for escolhida.

## Preservação do sistema atual

- Tratar solicitações online em registros próprios até que o aceite e a integração operacional estejam definidos.
- Não criar automaticamente registros de pedido/preparo/venda/recebimento no fluxo existente só porque houve uma solicitação pública.
- Não contaminar relatórios atuais de pedidos, TMA ou Caixa com solicitações ainda não incorporadas pela operação aprovada.
- Não criar nova tip, imposto, pagamento ou regra de caixa sem as definições que continuam nos checklists correspondentes.
- Manter o cardápio/catálogo existente como referência, evitando manter dois preços divergentes para o mesmo produto.
- Validar no servidor preço, produto e disponibilidade; o preço enviado pelo navegador não é autoridade.
- Preservar revisões, dados e layouts já aprovados; futuras migrações devem ser aditivas e acompanhadas de cópia/restauração e testes.

## Custos e restrições já conferidos

- A conta atual já utiliza Cloudflare Workers Paid. A documentação oficial confirma mínimo de **US$ 5/mês por conta**, com 10 milhões de requisições e 30 milhões de milissegundos de CPU incluídos por mês no modelo Standard.
- No modelo documentado, os excedentes de Workers são US$ 0,30 por milhão de requisições e US$ 0,02 por milhão de milissegundos de CPU. D1 tem cobrança própria por uso de linhas/armazenamento além de suas franquias; não apresentar o mínimo de US$ 5 como teto.
- É possível aproveitar Worker e D1 atuais para começar, sem contratar outra hospedagem fixa. O novo uso entra no consumo da conta inteira e deve continuar sendo monitorado.
- O link inicial pode utilizar o endereço da hospedagem existente e um caminho por loja. Um domínio comercial próprio é opcional e pode exigir compra/renovação separada.
- A modalidade escolhida para WhatsApp usa uma mensagem aberta para o consumidor enviar; não exige contratar uma API de envio automático nem garante que o cliente enviará a mensagem.
- Sem checkout de pagamento nesta etapa, não é necessário contratar gateway para cobrar os pedidos desta primeira versão.
- O catálogo atual valida até 500 produtos e 1 MB por envio. Isso é uma restrição atual do sistema, não uma promessa de capacidade ilimitada da hospedagem.
- Notificações automáticas, imagens/uploads novos, domínio próprio ou pagamento integrado exigem avaliação específica antes de contratar serviços ou prometer ausência de custo.

Fontes consultadas em 22/10/2026:

- [Cloudflare Workers — preços](https://developers.cloudflare.com/workers/platform/pricing/), conferido no [código-fonte oficial da documentação](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers/platform/pricing.mdx).
- [Cloudflare D1 — preços](https://developers.cloudflare.com/d1/platform/pricing/), com fonte oficial em [cloudflare-docs](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/d1/platform/pricing.mdx).
- Restrição de catálogo: `shared/menu-validation.mjs`, nesta versão do repositório.

## Entregáveis para começar a implementação

- [ ] Fechar a escolha inicial de como o tablet receberá as solicitações.
- [ ] Definir as páginas públicas de catálogo, carrinho, dados do pedido e confirmação usando o design existente.
- [ ] Definir a configuração do WhatsApp e das modalidades no portal próprio do vendedor.
- [ ] Definir a caixa de entrada autenticada, o acompanhamento e a rotina de atendimento.
- [ ] Implementar persistência, validação e repetição segura do envio sem gerar solicitações duplicadas.
- [ ] Verificar isolamento entre lojas e preservação dos registros/relatórios atuais.
- [ ] Conferir celular/tablet/PC, orientação, temas, idiomas, preços e mensagens de erro.
- [ ] Preparar a publicação isolada em homologação com as migrações necessárias; não iniciar APK por autorização apenas da frente web.

Referências: [checklist 10](checklists/fim-de-semana/10-cardapio-online.md), [checklist 11](checklists/fim-de-semana/11-delivery-e-retirada.md), [checklist 14](checklists/fim-de-semana/14-operacoes-e-integracao.md) e [checklist 16](checklists/fim-de-semana/16-pedido-por-qr-code-na-mesa.md).
