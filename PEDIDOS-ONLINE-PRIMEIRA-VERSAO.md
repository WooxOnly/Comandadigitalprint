# Pedidos online — desenho da primeira versão

Atualizado em 22/10/2026 com a definição mais recente do proprietário: **o cliente/vendedor escolhe o canal no próprio portal**. Este desenho substitui a proposta anterior de exigir portal + WhatsApp juntos e de usar somente o navegador do tablet. Registra os requisitos aprovados. O proprietário autorizou implementar a primeira etapa posteriormente; estado real, testes e limites em [PEDIDOS-ONLINE-TESTES.md](PEDIDOS-ONLINE-TESTES.md).

## Habilitação e preset no nosso painel de administrador

- Nosso administrador habilita por cliente o módulo Pedidos online, a permissão para agendamento e a permissão para pedidos na mesa.
- Nosso administrador configura a quantidade de mesas e o modelo de QR Code de atendimento no local: específico por mesa ou genérico interno com identificação da mesa pelo consumidor. São as alternativas anteriores; a última fala repetiu “por mesa”, sem definir um terceiro modelo.
- Essas habilitações e o preset ficam no nosso painel de administrador. O portal da loja permite apenas as configurações operacionais autorizadas; não permite que a loja habilite módulos ou permissões por conta própria.
- Dentro do módulo habilitado, a loja escolhe exatamente um canal: WhatsApp manual OU recebimento automático na aba Pedidos online do tablet. Nunca os dois simultaneamente.
- Pedido/QR de mesa exige módulo online habilitado, permissão de mesa habilitada e canal automático ativo. O modo WhatsApp não oferece pedido na mesa, nem por QR específico nem por QR genérico interno.
- Validar as permissões atuais também no servidor no envio, inclusive para links/QR antigos ou páginas em cache; ocultar o botão não basta.
- Se trocar para WhatsApp ou desabilitar uma permissão, impedir novos pedidos por aquela modalidade e preservar solicitações/histórico existentes. O tratamento operacional das pendências anteriores deve ser definido sem cancelamento silencioso.
- Agendamento só é oferecido quando habilitado pelo nosso administrador; configurar horários operacionais não concede a permissão de agendar.

## Configurações operacionais pelo próprio cliente no portal

- Escolher exatamente um recebimento por **WhatsApp com lançamento manual** ou **diretamente na aplicação/tablet**, somente com o módulo habilitado.
- No modo WhatsApp, informar o número comercial completo do próprio negócio, com código do país e DDD. Não existe número global do BistroHub.
- Configurar os avisos de novos pedidos/pendências no tablet, incluindo aviso visual e possibilidade de som/toque.
- Configurar o horário de funcionamento usado para distinguir pedido para agora e pedido agendado. Usar o fuso da loja, não o relógio arbitrário do consumidor.
- Configurar as modalidades de atendimento disponíveis e os dados pertinentes da loja.
- Manter o design já existente: cores, identidade, logos, componentes e padrões responsivos/idiomas/temas.
- Confirmar a herança ou configuração por unidade quando o cliente tiver várias lojas. Não presumir canal/número único para um grupo inteiro.

## Canal 1 — WhatsApp com lançamento manual

1. Consumidor acessa o cardápio, escolhe produtos/quantidades/opções e revisa o pedido.
2. Informa nome, contato e os demais dados necessários, incluindo modalidade e horário/data quando aplicáveis.
3. O sistema prepara uma mensagem para o WhatsApp configurado pela loja, contendo os dados informados, itens, quantidades, opções/observações e os valores efetivamente apresentados.
4. O consumidor abre o próprio WhatsApp e confirma o envio. Não há envio automático pela API nesta primeira versão; abrir a mensagem não comprova envio/entrega.
5. O vendedor recebe e confere a mensagem, entra em contato quando necessário e **lança o pedido manualmente** no sistema.

Não criar automaticamente um pedido operacional na aba do tablet por causa de um envio no canal WhatsApp. O registro automático paralelo no portal não é obrigatório nesta escolha; eventual histórico de solicitações WhatsApp continua a definir. Esse ponto substitui a proposta anterior de sempre salvar no portal antes do WhatsApp.

A mensagem deve identificar claramente loja, nome/contato do consumidor, produtos, quantidades, opções/adicionais/observações informados, entrega/retirada quando aplicável, endereço necessário e data/horário para agendados. Não inventar dados ausentes nem afirmar pagamento online realizado. A regra fiscal/total final permanece dependente das definições financeiras já registradas.

## Canal 2 — Recebimento direto na aplicação/tablet

1. Consumidor preenche e envia o pedido no cardápio online.
2. O sistema salva a solicitação da loja e a disponibiliza automaticamente numa **nova aba Pedidos online do tablet**.
3. A equipe vê os pedidos pendentes e recebe o aviso visual e/ou som conforme a configuração.
4. Uma pessoa confere e **aceita/confirma o pedido** dentro da janela de aceite aplicável.
5. A passagem do pedido aceito para cozinha/Caixa e demais etapas precisa seguir o desenho operacional e os módulos habilitados, preservando as regras existentes.

“Automático” significa entrada automática na caixa de pedidos online; **não significa aceite automático, venda paga ou início automático do preparo**. Repetição de envio, sincronização ou aceite não pode duplicar a solicitação nem o pedido resultante.

A lista nativa exige alteração do app e atualização de APK; a autorização para começar a frente online não substitui a autorização específica para compilar um APK. O portal é o local de configuração; uma caixa de entrada web adicional pode ser avaliada, mas não substitui silenciosamente a aba nativa definida pelo proprietário.

## Avisos e som no tablet

- Identificar visualmente pedidos pendentes na nova aba.
- Exibir um aviso curto na tela quando houver novo pedido/pendência, conforme a configuração do cliente.
- Oferecer um toque/som de novo pedido, configurável pelo cliente.
- Definir se o lembrete se repete, quando para e como evitar repetir o som indevidamente após reiniciar/sincronizar.
- Distinguir aviso dentro do app de push/notificação do sistema com o app em segundo plano/fechado; alcance, permissões e infraestrutura dessa segunda modalidade ainda precisam ser definidos.
- Conferir o reaproveitamento da base existente de áudio do app (`src/ui/useKitchenAlerts.ts`, `expo-audio`), sem afirmar que ela já implementa notificações de pedidos online ou push remoto.

## Pedido para agora

- Só permitir quando a loja estiver aberta no horário de funcionamento configurado.
- Validar essa condição na finalização/envio, não apenas na apresentação do botão.
- Na modalidade direta, o pedido pendente tem uma janela para a equipe aceitar.
- Definir a duração dessa janela e o resultado quando ela terminar; não inventar um valor padrão nem cancelar automaticamente por suposição.
- Quando a loja estiver fechada, não apresentar um pedido para agora como recebido/aceito para atendimento imediato.

## Pedido agendado

- Quando o administrador habilitar agendamento, permitir que o consumidor solicite com antecedência, inclusive de madrugada com a loja fechada, para um horário futuro de atendimento válido.
- A data/hora de atendimento agendado deve respeitar o funcionamento e as condições de agendamento que forem aprovadas.
- A solicitação pode ficar pendente por mais tempo para ser aceita quando a loja voltar a funcionar.
- Não aplicar cegamente ao pedido agendado a mesma contagem imediata do pedido para agora.
- Definir quando começa a janela de aceite do agendado e qual é o limite; ainda não foi escolhido início na abertura, antecedência do atendimento ou outro critério.
- Separar criação da solicitação, aceite e horário prometido de atendimento. Pedido feito à meia-noite para atendimento futuro não é uma venda/preparo ocorrido à meia-noite automaticamente.

## Decisões que ainda precisam ser fechadas

- Prazo de aceite para pedido para agora e se será ajustável por cliente/loja.
- Início/duração/limite da janela de aceite dos agendados e sua relação com reabertura da loja.
- Comportamento quando o prazo acabar, recusa/cancelamento e informações apresentadas ao consumidor.
- Dias da semana, intervalos/pausas, exceções/feriados, fuso e antecedência mínima de agendamento.
- Comportamento se a loja estiver no horário de funcionamento, mas o Caixa exigido estiver fechado.
- Momento em que o aceite gera o pedido operacional, envio à cozinha, impressão e vínculo financeiro.
- Escopo do aviso: app aberto, segundo plano ou fechado; repetição do toque e confirmação do alerta.
- Histórico adicional no portal para solicitações WhatsApp; isso não habilita um segundo canal de recebimento.
- Número/canal por loja ou por cliente com várias unidades.

## Preservação do sistema atual

- Tratar solicitações online diretas em registros próprios enquanto aguardam aceite.
- Não alterar pedidos, preparo, vendas, recebimentos, relatórios ou TMA existentes apenas porque chegou uma solicitação pública.
- Criar/encaminhar pedido operacional somente pela transição definida, conferindo módulos, permissões e caixa aberto quando exigido.
- Não criar nova regra de tip, imposto ou pagamento sem as definições financeiras já registradas. A primeira etapa continua sem cobrança online integrada.
- Reutilizar o catálogo e conferir no servidor preço, produto, opções e disponibilidade; não confiar no preço informado pelo navegador.
- Preservar revisões, dados, controles e layouts já aprovados. Migrações futuras devem ser aditivas, com restauração e validação.
- Usar Consumer, citado pelo proprietário como sistema que já utiliza no Brasil, como referência funcional a analisar; não presumir que sua interface/regras foram inspecionadas nem copiar identidade/código de terceiros.

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

## Entregáveis e estado real

- [x] Decisão de desenho: canal escolhido pelo cliente no próprio portal.
- [x] Decisão de desenho: WhatsApp com mensagem detalhada e lançamento manual pelo vendedor.
- [x] Decisão de desenho: canal direto com aba Pedidos online no tablet e aceite por uma pessoa.
- [x] Decisão de desenho: avisos visuais/som configuráveis e regras distintas para agora/agendado.
- [ ] Fechar os prazos e comportamentos pendentes sem assumir decisões.
- [ ] Desenhar páginas públicas e configuração dos canais usando o design existente.
- [ ] Implementar e testar persistência, envio/recebimento e não duplicação.
- [ ] Implementar/testar a aba nativa e os avisos com o escopo de notificação aprovado.
- [ ] Verificar loja aberta/fuso, recebimento de agendados fora do expediente e transições de aceite.
- [ ] Verificar isolamento de lojas, permissões e preservação dos registros/relatórios atuais.
- [ ] Preparar publicação em homologação conforme o escopo autorizado; APK apenas com autorização específica de compilação.

As caixas de decisões confirmam requisitos explicitamente definidos; não marcam implementação ou publicação como concluída.

Referências: [índice completo](CHECKLIST-FIM-DE-SEMANA.md), [canal e tablet](checklists/fim-de-semana/17-canais-e-recebimento-no-tablet.md), [avisos e som](checklists/fim-de-semana/18-avisos-e-som-online.md) , [horários, agendamento e aceite](checklists/fim-de-semana/19-horarios-agendamento-e-aceite.md) e [preset do administrador](checklists/fim-de-semana/20-configuracao-administrativa-online.md).
