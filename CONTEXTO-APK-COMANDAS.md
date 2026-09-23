# Contexto para continuar o aplicativo Android de comandas

## Origem e finalidade

Requisitos recuperados da conversa ChatGPT **“Criar APK De Comandas”**, entregues ao ambiente de desenvolvimento a pedido do usuário. Este documento registra o contexto para o assistente de programação continuar o trabalho.

Não há comprovação de implementação existente do aplicativo Android. A presença deste documento nesta pasta não significa que o projeto atual já implemente esses requisitos ou deva ser convertido para Android.

## Requisitos confirmados pelo usuário

- Criar um APK Android simples para impressão de comandas.
- Apresentar um cardápio visual organizado em categorias.
- Armazenar os dados internamente e permitir operação sem internet.
- Ao abrir o aplicativo, se houver internet, permitir uma verificação opcional de atualização do cardápio, sem bloquear o uso.
- Montar pedidos com vários produtos e suas quantidades.
- Permitir pizzas com dois sabores.
- Registrar observações individuais por produto, quando necessárias, com sugestões rápidas e entrada de texto livre.
- Identificar o pedido por plaquinha, inicialmente de 1 a 10, com possibilidade de cadastrar outras.
- Permitir informar o nome do cliente opcionalmente.
- Imprimir comandas térmicas não fiscais, inicialmente em papel de 80 mm. Manter a largura e as configurações de impressão separadas, sem fixar toda a solução em 80 mm.
- Salvar localmente o histórico do que foi enviado.

## Ambiguidade sobre mesa e plaquinha

A fala recuperada sobre mesa e plaquinha não permite concluir se representam o mesmo identificador ou campos distintos. Não impor dois campos obrigatórios. Confirmar essa distinção antes de consolidar a interface e o modelo de dados.

## Sugestões anteriores — ainda não são decisões do usuário

- Kotlin com Jetpack Compose e Room/SQLite como possível base técnica.
- Conexão Bluetooth, dependendo da impressora efetivamente utilizada.
- Edição de categorias, subcategorias, produtos e sugestões de observações.
- Possibilidade de reimpressão.
- Uma primeira fase com cardápio, pedido, banco local e impressão; atualização online em fase posterior.

Essas opções devem ser avaliadas à luz do código existente e das decisões do usuário. A sugestão de fases não elimina o requisito de verificação opcional de atualização do cardápio.

## Decisões atualizadas

- O cardápio real será definido e configurado por último.
- A impressão inicial é uma comanda de produção para a cozinha: deve conter produtos, quantidades, sabores e observações, sem preços ou totais financeiros. Isso também vale para reimpressões.
- O ícone Android deve representar um gorro de chef de cozinha. A arte e sua configuração foram atualizadas nesta etapa; detalhes em `assets/ICONES.md`.
- A impressão deve ser configurável dentro do aplicativo, sem fixar a solução em um único modelo ou conexão.
- A implementação deve contemplar as opções de impressão suportadas pelo Android e pelo dispositivo disponível, incluindo a configuração específica da impressora quando necessário.
- O cardápio ficará hospedado fora da rede local em um servidor HTTPS.
- O aplicativo consultará o servidor ao abrir e terá um botão para forçar uma nova atualização.
- O servidor terá leitura pública do cardápio e atualização administrativa protegida por token.

## Decisões ainda pendentes

- Se mesa e plaquinha são o mesmo campo ou identificadores distintos.
- Regra de preço para pizza com dois sabores.
- Domínio e serviço de hospedagem do servidor do cardápio.
- Quais conexões e modelos de impressora estarão disponíveis para os testes de impressão.

Moeda, preços, cardápio final e equipamento não foram definidos no contexto recuperado. Não inventar esses dados nem apresentar exemplos como escolhas confirmadas.

## Orientação para o assistente de programação

1. Ler as instruções locais aplicáveis e inspecionar o código existente antes de escolher arquitetura ou propor alterações.
2. Identificar se já existe uma implementação Android ou algum componente reutilizável, preservando o trabalho atual.
3. Usar os requisitos confirmados como referência e tratar separadamente sugestões técnicas e decisões pendentes.
4. Priorizar a camada de impressão configurável e resolver as decisões que afetem cada etapa antes de consolidar a implementação correspondente, especialmente os métodos suportados pelo Android e o preço de pizzas com dois sabores.

A entrega deste documento é somente transferência de contexto. Nenhuma implementação, instalação de dependência ou alteração de funcionalidade faz parte desta entrega.
