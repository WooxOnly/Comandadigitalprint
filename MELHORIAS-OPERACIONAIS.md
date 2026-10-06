# Melhorias operacionais do BistroHub

Implementadas localmente na branch `homologacao` em 05/10/2026. Esta etapa inclui as sugestões 1, 2, 4, 5, 6, 7 e 8. Complementos de uma comanda (item 3) foram excluídos conforme confirmado pelo usuário. Os pedidos de cozinha salvos continuam imutáveis.

## Habilitação por empresa

O portal oferece quatro marcações independentes, inicialmente desligadas: **Caixa**, **Encomendas**, **Cadastro de Clientes** e **Painel de preparo**. São 16 combinações possíveis. Preparo acompanha as comandas existentes, sem exigir Caixa aberto, preços, Encomendas ou Clientes. A agenda pertence a Encomendas e não tem marcação própria.

O tablet recebe as opções ao sincronizar e conserva a última configuração quando offline. Desabilitar um módulo oculta sua tela e bloqueia novas gravações correspondentes no servidor, preservando dados e filas anteriores. Reativar permite continuar sincronizando as pendências. Preços aparecem somente com Caixa habilitado. Favoritos, busca, disponibilidade, impressoras, permissões e recuperação estão disponíveis no projeto atual, sem depender dos módulos.

## Disponibilidade, favoritos e busca

Em **Cardápio**, abrir os detalhes de um produto para marcar esgotado/disponível ou favorito. Essas opções são salvas individualmente e sincronizadas, separadas do formulário de edição do cardápio; não é necessário excluir o produto. Exigem permissão para editar cardápio. Favoritos são compartilhados pela empresa, aparecem primeiro na seleção e podem ser filtrados. A busca aceita nome, grupo, subgrupo e ingredientes, sem distinguir maiúsculas ou acentos.

Produtos esgotados permanecem visíveis com identificação, mas não podem ser selecionados para novos pedidos ou novas encomendas. A seleção do segundo sabor também respeita disponibilidade. A verificação é repetida ao adicionar/enviar; uma venda nova no Caixa verifica a disponibilidade no servidor. Uma venda já confirmada continua aceitando a consulta/repetição do mesmo identificador mesmo após o produto ficar esgotado.

Pedidos e encomendas já salvos, inclusive offline, conservam seus itens e conseguem sincronizar depois de uma mudança de disponibilidade. Essa regra evita perder pedidos existentes. O tablet offline usa a última disponibilidade recebida; alterações feitas em outro aparelho aparecem quando houver sincronização.

## Painel de preparo

Com o módulo habilitado, **Preparo** aparece na navegação e nos Ajustes. Mostra as comandas de cozinha por dia local, mais antigas primeiro, com mesa/cliente, itens, sabores, adicionais e observações. O histórico original e a impressão não são alterados.

Fluxo: **Recebido → Em preparo → Pronto → Finalizado**. Finalizados podem ser mostrados/ocultados. O tempo decorrido atualiza a cada 30 segundos enquanto a tela está aberta. O destaque de atraso tem limite informado na tela, inicialmente 20 minutos; esse limite não é configuração compartilhada da empresa.

Alterações funcionam offline e indicam pendência. A comanda de origem sincroniza antes do preparo; não é necessária impressão ou abertura de caixa para avançar. Vários avanços offline podem ser agrupados no estado final, conservando os registros individuais de atividade. O servidor impede regressões. Dois tablets alterando a mesma etapa recebem o conflito explícito da sincronização; não há escolha silenciosa que sobrescreva um deles.

## Agenda de encomendas

Na tela **Encomendas**, escolher Todas, Dia ou Semana; informar a data e navegar entre períodos. A semana mostra sete dias a partir da data escolhida. Limites usam o calendário local, inclusive mudanças de horário de verão.

Encomendas abertas com horário vencido recebem identificação de atraso; as previstas para a próxima hora têm destaque. Os contadores consideram todas as encomendas abertas, mesmo quando o filtro mostra outro período. Concluídas/canceladas ficam fora dos alertas. São avisos visuais atualizados a cada 30 segundos com a tela aberta; esta etapa não instala notificações de fundo ou mensagens externas.

## Impressoras por destino

Em **Ajustes → Impressoras por destino**, adicionar até oito impressoras de rede, informar nome/IP/porta/papel e atribuir categorias. Uma categoria pertence a um destino; atribuí-la a outro remove a associação anterior. Categorias sem associação usam a impressora principal. É possível designar um destino para os recibos do cliente, sem associar categorias de produção. Usar **Salvar configurações** para confirmar no tablet.

Os destinos são preferências de cada aparelho, como o IP da impressora já existente. Desabilitar os destinos mantém a impressão principal. Cada destino oferece teste; papel pode ser 58, 80 ou 88 mm, e a porta padrão é 9100.

A prévia permite conferir os itens e largura de cada destino. Ao confirmar, todos os endereços são validados antes do primeiro envio. Cada item vai uma única vez para sua categoria/destino; a mesma identificação, mesa, cliente e data são conservadas. Não são acrescentados preços à comanda de cozinha.

O envio é sequencial. Destinos confirmados aparecem com ✓. Se um destino falhar, a repetição explícita na **mesma prévia** pula os já confirmados. Não há reenvio automático. Fechar e reabrir a comanda inicia uma nova reimpressão completa. Falha depois do início da transmissão pode significar entrega incerta: conferir o papel antes de repetir. Confirmação do socket não prova saída física do papel.

## Permissões e histórico

No cadastro/edição da empresa no portal, restringir separadamente:

- edição de cardápio, disponibilidade e favoritos;
- ajustes compartilhados, logotipo e preferências de impressão;
- reimpressão de comandas/recibos;
- recuperação de dados.

Sem restrição, mantém o acesso anterior dos usuários autenticados. Com restrição e nenhum usuário selecionado, apenas o administrador tem acesso. Selecionar somente usuários ativos da própria empresa. O administrador sempre tem essas permissões. Gerentes do Caixa continuam configurados separadamente e autorizam preços/descontos/cancelamentos/estornos conforme a etapa financeira.

O app aplica a configuração recebida, inclusive offline. O servidor também exige permissão nas alterações de cardápio, opções de produtos, impressora/logotipo/regras e registros de reimpressão/recuperação. Mudanças de permissões feitas com um tablet offline passam a valer localmente após sincronizar. Gravações que já estavam pendentes e perderam autorização ficam preservadas; não impedem sincronizar comandas independentes. Reimpressão física usa o controle do app; a leitura dos pedidos não é bloqueada pela permissão de imprimir.

O primeiro envio de uma comanda ou recibo recém-registrado continua permitido. O app registra a intenção de impressão antes de enviar bytes/abrir diálogo. Uma tentativa de impressão registrada não confirma impressão física. Recibos recuperados após confirmação perdida consultam as tentativas anteriores antes de permitir novo envio sem permissão de reimpressão.

Em **portal → Atividade**, consultar as alterações da empresa selecionada: operador autenticado que sincronizou, data de registro no servidor, cardápio, ajustes, disponibilidade/favoritos, etapas de preparo, tentativas de impressão/reimpressão/recuperação e alterações administrativas. Atividades offline só aparecem depois da sincronização. A data enviada no registro não substitui a data de recebimento do servidor. Paginação inclui todos os eventos que compartilham o milissegundo de corte, sem omiti-los. Senhas/hashes e dados brutos de usuários não aparecem nesse histórico.

## Recuperação guiada

Em **Ajustes → Recuperação de dados**, com permissão:

1. **Tablet substituto/dados da nuvem:** vincular à mesma empresa e entrar na nuvem. A recuperação relê os eventos desde o início, conservando dados atuais e filas pendentes. Um aparelho novo mantém sua própria identidade e abertura de caixa. Impressora e idioma do anterior podem ser copiados separadamente nos Ajustes do tablet; a recuperação não clona a identidade financeira.
2. **Cópias locais:** verificar os backups do aparelho. A verificação descriptografa com AES-GCM, valida empresa/tablet, registros e fila e apresenta contagens e eventuais operações financeiras pendentes. Cópias inválidas aparecem indisponíveis.
3. **Recuperar registros ausentes:** conserva uma cópia criptografada do estado atual antes da operação e incorpora somente registros que ainda não existem. Registros atuais, inclusive edições e pendências, prevalecem. Mantém os identificadores das mutações recuperadas e tenta sincronizar. Não é uma função de desfazer alterações do cardápio ou voltar o banco a uma data passada.

As cópias diárias mantêm os últimos 14 dias disponíveis; cópias anteriores à recuperação têm retenção separada de 14 arquivos. Não são exportadas chaves nem dados descriptografados. A chave permanece no SecureStore do aparelho. Backups locais pertencem à empresa **e ao tablet de origem**; não há importação em outro aparelho nesta etapa. Uma reinstalação/perda de chave pode tornar as cópias locais ilegíveis. Dados offline nunca sincronizados dependem do aparelho original; o novo tablet recupera os registros que chegaram à nuvem.

Uma operação financeira recuperada permanece pendente com seu identificador original. Consultar seu resultado no Caixa antes de iniciar nova movimentação; não se cria uma segunda cobrança. Se já existir outra operação financeira pendente, a recuperação pede resolvê-la primeiro.

## Preparação para teste em homologação

As alterações permanecem locais, sem commit, publicação, migração remota ou build EAS nesta etapa. Quando a publicação for solicitada:

1. Fazer backup do D1 de homologação e reaplicar `server/cloudflare/store-schema.sql`. Além das tabelas dos módulos financeiros/clientes, cria `store_preparation_modules`, `store_access_settings` e `store_admin_activity`. A migração preserva registros existentes e aceita reaplicação.
2. Publicar somente com `server/cloudflare/wrangler.homologacao.jsonc` e gerar APK com o perfil `homologacao`. Instalar nos tablets de teste antes de habilitar módulos. Esta etapa não adicionou dependências nativas; TCP, criptografia e compartilhamento das etapas anteriores já exigem o APK atualizado.
3. Testar as 16 combinações, com todos desligados e cada módulo sozinho. Preparo funciona sem Caixa; agenda só aparece com Encomendas. Fazer uma comanda normal antes/depois de abertura/fechamento do Caixa.
4. Em dois tablets, marcar esgotado/favorito, pesquisar, tentar selecionar segundo sabor esgotado e sincronizar pedidos já salvos offline. Testar conflitos de preparo e ocultação/preservação de filas ao desativar módulos.
5. Atribuir categorias a dois destinos, imprimir itens em destinos diferentes e recibo no destino próprio. Interromper o segundo destino; repetir na mesma prévia e conferir que o primeiro não recebe novamente. Conferir a POS Milestone de 80 mm, acentos, corte e saída real do papel.
6. Restringir permissões de um funcionário, testar online/offline e reimpressão, conferir o histórico no portal. Verificar cópias locais, recuperar ausentes sem substituir edições e recuperar a nuvem em um aparelho substituto. Nenhuma etapa usa produção.

APKs antigos mantêm metadados de duas flags. Clientes com `moduleVersion=2` recebem três; a versão atual usa `moduleVersion=3` para quatro. Os novos tipos de evento desta etapa só são devolvidos para sincronizações que enviam `features=operations-v1`; na primeira atualização do cache o novo app reinicia o cursor para buscar esses eventos anteriores. Isso preserva compatibilidade das mudanças operacionais, mas não substitui atualizar APKs antes de habilitar Encomendas/Clientes.

## Verificações locais desta etapa

- `node --test tests/*.test.cjs tests/*.test.mjs`: 136 testes passaram, sem falhas. Os 14 novos testes cobrem disponibilidade, 16 combinações, preparo offline/conflitos, agenda com horário de verão, rotas de impressão e falha parcial, permissões, auditoria e recuperação. Testes existentes também verificaram AES-GCM/cópias corrompidas, fila durável e recibo no destino escolhido.
- Lint, TypeScript e `git diff --check` passaram.
- Exportação Android do perfil de homologação passou; o bundle foi conferido para conter o endpoint de homologação e não o de produção.
- Worker compilado com `wrangler deploy --dry-run` e configuração de homologação, sem publicação remota.
- Não foram adicionadas dependências nativas nesta etapa; a geração nativa validada nas etapas anteriores não foi repetida. Permanecem pendentes instalação do APK, testes em dois tablets e impressão física.
