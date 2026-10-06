# Caixa, Encomendas e Cadastro de Clientes

Implementação local na branch `homologacao`, incluindo cadastro/histórico de clientes, entregas, pagamentos divididos, gorjetas, estornos parciais, controle financeiro, relatórios e sales tax. Caixa, Encomendas e Clientes são opcionais por empresa e independentes das comandas de cozinha e um do outro. Nenhuma empresa recebe habilitação automática. Produção não foi alterada. Edição geral e reagendamento de encomendas não fazem parte desta etapa, conforme solicitado; os dados da entrega podem ser alterados enquanto a entrega estiver aberta.

A etapa operacional acrescenta **Painel de preparo** como quarto módulo independente (16 combinações) e agenda vinculada a Encomendas. Disponibilidade, favoritos, destinos de impressão, permissões e recuperação estão descritos em [MELHORIAS-OPERACIONAIS.md](MELHORIAS-OPERACIONAIS.md).

## Habilitação pelo portal

No cadastro e na edição de uma loja em `/admin`, existem quatro opções de módulos: **Usa módulo de caixa (USD)**, **Usa módulo de encomendas**, **Usa módulo de cadastro de clientes** e **Usa módulo de painel de preparo**. Somente a sessão do proprietário no portal altera essas opções. A combinação é livre: qualquer uma das 16 combinações, inclusive Cadastro de Clientes sozinho.

Após autenticar e sincronizar, os tablets vinculados à empresa recebem as opções. Os acessos aparecem no início e em Ajustes; acessar diretamente uma tela desabilitada também bloqueia seu uso. Ajustes mostra o estado, sem permitir alterar a habilitação no tablet. O estado recebido fica no armazenamento local para iniciar sem conexão; mudanças feitas no portal chegam na próxima sincronização.

Desabilitar um módulo oculta seu acesso e bloqueia novas gravações no servidor. Preserva os registros existentes, o histórico financeiro e clientes/encomendas ainda pendentes de sincronização. Um cliente novo e sua encomenda vinculada aguardam a reabilitação; essa espera não impede sincronizar comandas independentes. Reabilitar permite consultar os dados novamente e retomar essa fila. Um tablet offline só conhece a última configuração recebida.

## Cadastro de Clientes independente

Usa registros próprios `customer:<id>`, sem depender de abertura de caixa ou encomendas. Permite busca por nome/telefone/e-mail, cadastro e edição, até dez endereços (um por linha), observações, arquivamento e reativação. Nome e telefone ou e-mail são obrigatórios. Arquivar preserva o histórico e impede selecionar o cliente para novos vínculos. Registros sincronizam com revisões/conflitos e podem ser criados/editados offline depois da habilitação. A lista mostra até 100 resultados por busca; a seleção opcional mostra dez e permite filtrar todos os clientes salvos.

Quando também houver Encomendas ou Caixa, esses módulos oferecem seleção opcional de cliente ativo. O endereço pode ser escolhido entre os cadastrados ou informado manualmente. O nome/contato/endereço registrados no pedido e o nome no recibo são fotografias daquele momento: editar o cadastro não reescreve pedidos anteriores. Sem Cadastro de Clientes, os campos manuais desses módulos continuam funcionando. O cadastro e a montagem da comanda de cozinha permanecem como antes, sem seleção nova ou dependência deste módulo.

**Histórico** consulta online os últimos 100 agendamentos e 100 recebimentos vinculados, incluindo todos os tablets da empresa, com aviso se houver mais. Encomendas e recebimentos aparecem quando seus módulos estiverem habilitados; a consulta básica de clientes funciona com os outros desligados. Só gerentes/administradores veem valores de recebimentos nessa consulta; os demais veem data e itens. Sem conexão, mostra encomendas vinculadas já salvas no tablet. Pedidos antigos informados apenas por nome não recebem associação automática.

## Encomendas

Cadastro de cliente, contato, data/hora local, retirada ou entrega, endereço obrigatório para entrega, produtos, quantidades e observações. O agendamento novo deve ser futuro. Estados: agendada, em preparo, pronta, concluída ou cancelada; a tela pede confirmação para alterar o estado. Não permite editar/reabrir encomendas concluídas ou canceladas. Entregas têm taxa em USD, responsável e estados aguardando, saiu para entrega e entregue, com horários registrados. É necessário informar responsável ao despachar. Não retrocede uma entrega despachada e não altera a entrega concluída; para concluir uma encomenda com esse acompanhamento, primeiro marque como entregue. Taxa e responsável funcionam mesmo sem Caixa. A taxa do agendamento não gera cobrança automática: se receber pelo Caixa, informe os itens e a taxa no recebimento separado.

As encomendas usam registros `preorder:<id>`, próprios, com revisões e resolução de conflitos da sincronização existente. Salvar e alterar status funciona offline após receber a habilitação; os dados ficam na fila durável. São compartilhadas entre tablets da mesma empresa. O rascunho ainda não salvo permanece apenas na tela.

Encomendas não exige abertura de caixa, preço ou recebimento e não transforma automaticamente o agendamento em comanda de cozinha. Quando Caixa também está habilitado, o editor pode registrar o preço final por item, mas Encomendas continua funcionando sem Caixa.

## Caixa em dólares americanos

Cada identidade de tablet possui no máximo uma abertura ativa. Abrir informa o dinheiro inicial. A abertura não reinicia automaticamente à meia-noite: o operador fecha contando o dinheiro e abre outra quando iniciar o próximo expediente.

O módulo tem sua própria montagem de venda, sem usar o pedido em montagem da cozinha. Escolhe produtos, quantidades, preço final unitário e cliente opcional. Registra recebimento confirmado em **dinheiro, cartão ou Zelle**. Cartão e Zelle precisam ser cobrados/confirmados nos sistemas externos; o app registra a forma e o valor, sem processar a cobrança.

Uma venda pode usar uma ou mais formas de pagamento, com até uma parcela de cada tipo. **Dividir pagamento** informa quanto pertence a dinheiro, cartão e Zelle; mostra o restante e só finaliza quando a soma é igual ao total. Em dinheiro, informa o valor entregue e recebe o troco calculado sobre a parcela em dinheiro. Quando deixar o recebido vazio no modo dividido, considera o valor exato da parcela. O registro é atômico: não há pagamento incompleto ou saldo a receber. Gorjeta voluntária e taxa de entrega em USD são discriminadas e entram nos recebimentos; a gorjeta fica separada das vendas e do sales tax. Não há integração para distribuir gorjetas aos funcionários nesta etapa. Entradas e saídas exigem valor positivo e motivo; o servidor impede saída acima do saldo de dinheiro disponível. Cartão e Zelle aparecem em totais separados e não aumentam o dinheiro físico esperado. O saldo é:

`dinheiro inicial + parcelas recebidas em dinheiro (incluindo gorjeta/entrega) + entradas − saídas − devoluções em dinheiro`

O fechamento informa o dinheiro contado e mostra a diferença para o saldo esperado. Depois de fechado, o servidor bloqueia movimentações novas nessa abertura. Pagamentos existentes são imutáveis; cancelamentos e estornos são registros separados, descritos abaixo. Sabores e adicionais são registrados nas observações; mudança no preço final do item exige gerente ou administrador.

Abertura, recebimentos, movimentações e fechamento exigem sessão autenticada e conexão. O pedido de operação é salvo no armazenamento criptografado antes do envio. Quando a resposta se perde, **Consultar operação pendente** repete o mesmo identificador e recupera o resultado, inclusive após reiniciar o app. Enquanto há resultado pendente, bloqueia novas movimentações. Nenhuma operação financeira é aceita como concluída somente no cache offline.

A tela consulta as últimas 30 aberturas e 300 movimentações do tablet; o banco conserva os registros anteriores. A API calcula os totais em centavos inteiros e protege abertura única, retirada e fechamento em instruções atômicas. Os valores informados têm limite de US$ 1.000.000,00 por campo/operação.

## Gerentes, descontos, cancelamentos e estornos

No portal, a edição da empresa permite escolher os **Gerentes do Caixa** entre os usuários ativos que já foram cadastrados e sincronizados pelo tablet. `admin` sempre tem autorização. Essa permissão vem somente do portal; alterar campos no próprio cadastro de usuário não concede acesso de gerente. O servidor verifica a sessão e a configuração atual em cada operação, inclusive depois de remover um gerente ou desativar seu usuário.

Gerentes e administradores podem dar desconto em valor USD ou percentual, com motivo obrigatório. O desconto deve ser menor que o subtotal. O recibo guarda subtotal, desconto, motivo, operador e autorizador. Somente esses usuários alteram preços ou cadastram novos produtos quando Caixa está habilitado. Funcionários recebem o preço do cardápio na montagem da venda; enviar pela API um preço/produto diferente exige autorização. Ajustes de preço guardam os valores do cardápio e da cobrança no histórico da venda.

**Cancelar venda** devolve o total no caixa original ainda aberto, antes de qualquer estorno. **Estornar venda** permite devolver o saldo integral, parte do valor ou quantidades de itens selecionados, usando o caixa atual, inclusive após fechar o original. Ao selecionar itens, pode incluir a gorjeta e/ou a taxa de entrega com seu imposto. Quantidades e valores ficam limitados ao saldo de cada linha. Pode registrar vários estornos até completar o total; confirmações perdidas reutilizam o mesmo ID.

Todas as devoluções exigem gerente/administrador e motivo. Confirme a devolução no dinheiro/terminal/cartão/Zelle antes de registrar; o aplicativo não executa a transferência externa. As parcelas devolvidas são distribuídas proporcionalmente entre as formas originais ainda disponíveis, com ajuste de centavos. A prévia mostra os valores por forma. O caixa atual precisa ter saldo para a parcela em dinheiro; cartão e Zelle não retiram dinheiro físico. A inserção verifica saldo da venda e do caixa em uma única instrução, impedindo devolução duplicada, acima do total ou concorrente com outra retirada.

Na devolução por itens, o imposto e o desconto seguem os valores originais proporcionalmente às quantidades. Na devolução por valor, distribui o valor entre saldos dos produtos, imposto, gorjeta e entrega, sem declarar quantidade física devolvida. Uma devolução integral posterior retorna todos os saldos restantes. A venda original permanece imutável; o fechamento anterior também fica preservado quando usar outro caixa. A reimpressão mostra **VENDA CANCELADA**, **ESTORNO PARCIAL** ou **ESTORNO INTEGRAL**, com data, motivo, valor total devolvido e saldo restante. O histórico conserva cada operador/motivo e os componentes efetivamente devolvidos.

## Sales tax por empresa

O portal tem **Aplicar sales tax** e percentual configurável com até duas casas decimais (por exemplo, 7,25%). Começa desligado e com taxa zero. A primeira versão usa uma taxa única sobre todos os itens, adicionada ao subtotal após desconto: `base tributável = subtotal − desconto + taxa de entrega`; `total = base tributável + imposto + gorjeta`. Arredonda o imposto para centavos uma vez por venda. Não há regra de isenção por produto ou imposto embutido no preço nesta etapa.

O tablet mostra subtotal, desconto, sales tax e total antes do recebimento. O servidor usa a configuração da empresa e recusa uma venda se a taxa mudou desde a prévia; atualizar o Caixa permite conferir o novo total. O recibo grava a taxa e o imposto efetivamente aplicados. Alterar a configuração depois da venda não modifica reimpressões, estornos ou consultas de uma operação já registrada.

## Relatórios e CSV

Em **Caixa → Relatórios do Caixa**, gerentes e administradores consultam a empresa inteira, incluindo todos os tablets, por data inicial/final. As datas são inclusivas, usam o fuso do aparelho e respeitam mudanças de horário de verão. O período pode ter até 366 dias de calendário. A consulta e a exportação exigem internet e sessão autorizada.

Os relatórios mostram vendas brutas, descontos, impostos recebidos/devolvidos, cancelamentos/estornos, vendas líquidas sem imposto, imposto líquido, recebimentos líquidos, gorjetas e taxas de entrega recebidas/devolvidas/líquidas, entradas/saídas, totais por dia, forma de pagamento e produto, fechamentos com diferenças e registro das operações. Devoluções entram na data de devolução, mesmo quando a venda está fora do período. O desconto é distribuído por produto em centavos, com ajuste dos centavos de arredondamento, para reconciliar a soma com os totais da venda.

Os totais consultam os registros completos do período, sem usar o limite de 300 movimentos do cache do tablet. Se exceder 10.000 operações ou fechamentos, a consulta pede intervalo menor e não apresenta um total cortado. Na tela, produtos, fechamentos e auditoria mostram os primeiros 100 registros por seção, com aviso; o CSV inclui todos os registros aceitos no período.

**Exportar CSV** atualiza os dados e abre o compartilhamento nativo para salvar/enviar o arquivo. O arquivo UTF-8 tem cabeçalhos em inglês, valores em USD e inclui operador, motivo, autorização, desconto, imposto, ajustes de preço, gorjeta, entrega, parcelas por pagamento e detalhes dos estornos parciais em centavos. As vendas líquidas por produto excluem gorjeta, entrega e imposto; esses componentes têm totais separados que conciliam com o recebido. Textos são escapados para CSV e protegidos contra execução de fórmulas em planilhas. O arquivo de exportação fica no cache para o aplicativo de destino poder lê-lo; o sistema pode limpar esse cache. O módulo nativo `expo-sharing` exige um novo APK.

## Preços e recibo

Com Caixa habilitado, os preços em USD aparecem nos produtos do cardápio e na seleção de produtos do pedido. O cadastro permite editar o preço. Com Caixa desabilitado, esses campos e valores ficam ocultos.

As comandas existentes continuam sem preços na impressão e podem ser montadas, salvas e impressas com caixa fechado ou sem os módulos. Os rascunhos e históricos dos módulos são separados.

O recebimento no Caixa pode gerar um recibo não fiscal com empresa, identificador, data, cliente opcional, itens, valores, gorjeta, taxa de entrega, total, todas as parcelas por forma de pagamento e, em dinheiro, recebido/troco. Guarda o preço e o nome dos itens no momento da venda, preservando reimpressões quando o cardápio mudar. Disponível em PT/EN/ES, pelo diálogo de impressão existente ou ESC/POS pela rede com a configuração de IP/porta/papel do tablet. Enviar os bytes não confirma a saída física do papel.

## Publicação em homologação, quando solicitada

1. Fazer backup do D1 de homologação e aplicar o `store-schema.sql` atualizado antes do Worker. O script cria `store_modules`, `store_customer_modules`, `store_preparation_modules`, `store_access_settings`, `store_admin_activity`, `store_cash_settings`, `cash_sessions`, `cash_entries`, `cash_adjustments` e `cash_refunds`, além das views `cash_reversals` e `cash_movements`, sem substituir registros existentes e pode ser reaplicado.

   ```bash
   npx wrangler@4 d1 execute seabra-cardapio-homologacao --remote --config server/cloudflare/wrangler.homologacao.jsonc --file server/cloudflare/store-schema.sql
   npx wrangler@4 deploy --config server/cloudflare/wrangler.homologacao.jsonc
   ```

2. Gerar e instalar o APK do perfil `homologacao` em todos os tablets de teste **antes de habilitar módulos**. O APK anterior não conhece os registros de encomendas/clientes. A API de metadados mantém duas flags para tablets antigos; clientes da etapa anterior pedem `moduleVersion=2` e recebem três; o app atual pede `moduleVersion=3` e recebe quatro. Isso mantém o contrato antigo enquanto os módulos novos ficam desligados. Atualize todos os tablets da empresa antes de habilitar módulos que gravam tipos novos de registros. A impressão TCP também exige um novo APK, conforme `IMPRESSAO-REDE.md`.

   ```bash
   npx eas-cli@latest build --platform android --profile homologacao --non-interactive
   ```

3. Em empresas de teste, validar as 16 combinações de módulos, incluindo Cadastro de Clientes sozinho. Entrar/sincronizar em dois tablets, conferir preços, salvar retirada/entrega offline e reconectar. Verificar abertura própria por tablet, troco, dinheiro/cartão/Zelle, entradas/saídas, diferença no fechamento, consulta de operação pendente e recibo físico de 80 mm.
4. Desabilitar cada módulo, sincronizar e conferir ocultação, bloqueio no servidor e preservação do histórico. Fazer uma comanda normal antes de abrir Caixa e depois de fechá-lo. Nenhuma etapa altera produção.
5. Cadastrar/sincronizar usuário e selecioná-lo como gerente no portal. Testar desconto USD/percentual com motivo, bloqueio para funcionário, sales tax desligado/ligado, mudança da taxa antes da venda, cancelamento, estorno após fechamento, confirmação perdida e reimpressão marcada. Consultar relatórios com dois tablets e exportar CSV no Android/iPad. Conferir saldo físico, totais e diferenças sem alterar produção.
6. Testar clientes offline, conflitos entre tablets, endereços, arquivamento e histórico; cadastrar cliente sem Caixa/Encomendas. Testar responsável/taxa, despacho e entrega sem Caixa. Receber uma venda em dinheiro/cartão/Zelle divididos com gorjeta, tax e entrega; conferir troco. Estornar parte dos itens, parte do valor e saldo restante, verificando autorização, centavos, saldo em dinheiro, relatório/CSV e reimpressão. Testar confirmação perdida de estorno parcial após reiniciar o app.

## Validação local

Testes executam o Worker com SQLite real em memória: padrões desabilitados, autorização do portal e de gerentes, 16 combinações de flags independentes, clientes/arquivamento/histórico/offline, entregas, migração reaplicável, isolamento por empresa, encomendas/conflitos/offline, preços, descontos, taxas e arredondamento, abertura única, recebimentos divididos, gorjetas/entrega, devoluções integrais/parciais, troco, saldos, operações simultâneas e recuperação de confirmação perdida após reiniciar. Relatórios verificam períodos, horário de verão, todos os tablets, saldo líquido, imposto devolvido, fechamento original preservado e proteção contra totais cortados. Recibos cobrem USD, idiomas, escape de HTML, transporte de rede e ausência de preços na comanda de cozinha. CSV e compartilhamento de arquivos têm verificação própria. Typecheck, lint, exportação Android e geração nativa em cópia temporária complementam os testes. Publicação, APK instalado e equipamento físico ainda precisam de validação em homologação.

Em 05/10/2026: **115 testes passaram**, além de `npx tsc --noEmit`, `npx expo lint`, exportação Android apontada exclusivamente para homologação e empacotamento local do Worker com `wrangler deploy --dry-run`. Logs de testes: `/tmp/bistro-modules-final-tests.log`; exportação: `/tmp/bistro-modules-final-android`; bundle Worker: `/tmp/bistro-modules-worker-check`. Isso não constitui deploy, APK gerado/instalado ou validação física. A geração nativa Android já havia sido verificada em cópia temporária na etapa anterior; esta etapa não adiciona dependências nativas.
