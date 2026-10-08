# Preparo e Painel do Gestor — primeira etapa

Implementação local na branch `homologacao`, em 07/10/2026. O módulo **Preparo** continua opcional, habilitado por loja no administrativo do BistroHub. Nenhuma nova marcação foi adicionada: permanecem Caixa, Encomendas, Cadastro de Clientes e Preparo. O cadastro de acessos web é feito pelo nosso administrativo.

## Liberação e cadastro

1. No administrativo existente (`/admin`), selecionar a loja e habilitar **Painel de preparo** no cadastro/edição da empresa.
2. Pelo novo link **Painel do Gestor**, abrir `/admin/gestores` e cadastrar o cliente/grupo, selecionando uma ou mais lojas autorizadas.
3. Cadastrar um usuário gestor vinculado ao cliente/grupo, com nome, usuário único e senha inicial de pelo menos 12 caracteres. O mesmo cliente pode ter vários usuários. Entregar a senha diretamente ao responsável.
4. O cliente entra em `/gestor` e consulta uma loja ou o conjunto de lojas vinculadas. Não existe cadastro público de gestores. O cadastro web não habilita automaticamente nenhum módulo.

O administrativo permite editar vínculos, ativar/desativar clientes e usuários e redefinir a senha. Essas alterações encerram as sessões anteriores. A desativação de uma loja e as mudanças na liberação de preparo valem na próxima consulta. O login de gestor possui sessão própria e não concede acesso ao administrativo nem ao login do tablet. Gerentes de Caixa e usuários do portal continuam com seus cadastros correspondentes.

## Tablet da cozinha

No painel **Preparo**, comandas continuam com mesa/cliente, itens, sabores, adicionais e observações, com filtro de dia e destaque de atraso. As etapas são **Recebido → Em preparo → Pronto → Finalizado**. O registro agora conserva início do preparo, horário em que ficou pronto e finalização, além da emissão original.

Pedidos emitidos no dia depois de abrir o painel recebem aviso visual quando sincronizados. **Ver e confirmar recebimento** abre o dia atual e limpa os avisos; avançar a etapa também confirma o aviso daquele pedido. Recebimento visual não altera a etapa. Há opção de som por tablet, inicialmente desligada, com botão para testar. O som é um arquivo local incluído no aplicativo. Pedidos antigos carregados na primeira sincronização não disparam avisos.

Enquanto a tela de preparo está em foco e o aplicativo está ativo, a consulta à nuvem ocorre a cada cinco segundos. O aviso depende de conexão e da sincronização do tablet do balcão. Nesta etapa não há push do sistema operacional nem aviso com aplicativo fechado, bloqueado ou em segundo plano. Manter o tablet ligado, com essa tela aberta, e conferir o volume.

Etapas funcionam offline, preservam seus horários e sincronizam depois da comanda de origem. Vários avanços offline podem ser agrupados no estado final sem perder os horários ou as atividades individuais. O servidor conserva os horários já recebidos e impede regressões, alterações de horários anteriores e atualização com relógio retrocedendo. Conflitos entre tablets continuam explícitos. Usar data/hora automáticas em todos os aparelhos.

A operação de preparo conserva os itens e não dispara uma segunda impressão. O envio e a confirmação de impressão do balcão mantêm o fluxo existente. Em 08/10, foi concluída a opção **Imprimir automaticamente ao enviar**, em Ajustes → Impressora. Começa desligada, é própria de cada tablet e exige conexão pela rede. A comanda é salva antes do envio; impressão falha abre a prévia para tentativa manual, preservando os destinos já confirmados. Não há reenvio automático em erro ou ao reiniciar. Enquanto uma impressão automática está em andamento, uma nova emissão aguarda sem limpar o rascunho. O fluxo padrão continua com prévia.

## TMA, volume de pedidos e métricas de produção

No **Painel do Gestor**, lojas com Preparo habilitado apresentam:

- TMA inicialmente definido como emissão até finalização, com intervalo visível e opção de consultar emissão até pronto ou início do preparo até pronto;
- quantidade de pedidos e contagem por etapa atual;
- gráficos e tabelas por hora do dia, dia da semana, dia e mês;
- horário com mais pedidos e médias de volume por hora/dia no período;
- espera média: emissão até início do preparo;
- preparo médio: início do preparo até pronto;
- tempo total médio até pronto: emissão até pronto;
- detalhamento por loja e horários/status dos pedidos.

Cada média informa quantos registros têm os horários necessários. Pedidos antigos sem horários continuam na contagem e mostram tempo desconhecido; não entram como zero nas médias. Ao avançar um registro antigo, apenas o horário da etapa anterior conhecida pode ser recuperado do seu registro original. A média do grupo usa todos os registros medidos, sem fazer média das médias das lojas.

O TMA usa somente pedidos com os dois horários do intervalo escolhido. Na definição inicial, é emissão até `completedAt`, registrado ao marcar **Finalizado**. Pedidos pendentes ou antigos sem esse horário não entram como zero. Esse intervalo começa no registro da comanda; não mede o atendimento ao cliente antes da emissão. A escolha do intervalo altera cartões, tabelas e gráficos, com o número de pedidos medidos sempre informado. Os tempos de espera, preparo e até pronto continuam disponíveis separadamente.

A seleção usa o horário de emissão dentro das datas escolhidas. Atalhos permitem **Hoje**, **Últimos 7 dias**, **Mês atual** (até hoje) e **Mês anterior**. O seletor de mês consulta o mês completo, incluindo fevereiro com 28/29 dias; datas personalizadas permitem até 366 dias, para comparar meses. O fuso é escolhido na consulta, inicialmente o do navegador. Lojas consultadas em conjunto usam o mesmo fuso do relatório. Datas, horários, dias da semana e meses respeitam esse fuso, inclusive pedidos perto da meia-noite e mudanças de horário de verão.

As etapas representam a situação atual dos pedidos emitidos no período. Não é uma reconstrução do estado histórico ao final daquela data. A tela consulta novamente a cada 30 segundos enquanto visível. Períodos em andamento mostram o que já foi sincronizado; não projetam pedidos futuros.

Os gráficos permitem alternar **Quantidade**, **Média de pedidos** e **TMA** em cada recorte. Uma barra pode ser selecionada por clique ou teclado para consultar seus valores. Dias/horários sem pedidos continuam visíveis. Por hora e por dia, a média de volume divide os pedidos pelas horas abrangidas. Por dia da semana e por mês, divide pelos dias abrangidos; assim, cinco segundas e quatro terças não são comparadas apenas pelo total. As médias de volume incluem horas/dias sem pedidos e não usam um calendário de funcionamento da loja. Dias de horário de verão podem ter 23/25 horas; uma faixa horária repetida conta ambas as horas efetivas. Horários sem cobertura no período e TMA sem amostras aparecem como desconhecidos.

Totais, médias e gráficos agora usam agregação no banco, sem o limite anterior de 5.000 pedidos e sem transportar todos os pedidos ao navegador. Os seis conjuntos de leitura (tempos, lojas, detalhes, produtos, categorias e operadores) usam uma transação D1 para manter contagens e detalhes consistentes. O detalhamento continua limitado aos 100 pedidos mais recentes; a limitação não afeta os cálculos. Lojas com Preparo desligado aparecem como indisponíveis para essa métrica e não fornecem seus pedidos ao relatório. O relatório não retorna nome/contato de cliente ou pagamentos.

Em 08/10, foram concluídos os indicadores de **produtos**, **categorias** e **operadores**, além da área **Vendas e caixa** descrita abaixo. Os quatro módulos continuam independentes.

### Produtos, categorias e operadores

O relatório de produção agrega as quantidades de todos os itens emitidos no período, com os 100 produtos/categorias mais pedidos e a contagem total de grupos. Nomes e categorias são fotografias do pedido. Uma combinação de sabores conta como uma linha, sem duplicar a quantidade por sabor; adicionais permanecem na comanda. A contagem de pedidos por categoria é distinta, mesmo com várias linhas da categoria. Os itens das comandas não são vendas: valores financeiros ficam na área Caixa.

O tablet grava `startedBy`, `readyBy` e `completedBy` usando o login local de cada avanço. Horários e operadores conhecidos não podem ser alterados; não se acrescenta operador retroativamente a um horário já sincronizado. O servidor verifica formato e existência de usuários da própria loja, conservando usuários históricos inativos. São atribuições operacionais informadas pelo tablet, inclusive offline; o autor autenticado da sincronização permanece no evento do servidor. Esses campos não concedem permissões.

O painel mostra iniciados, marcados prontos e finalizados por loja/operador. O preparo médio usa quem marcou pronto, e o TMA dos finalizados usa quem finalizou; não mede trabalho individual exclusivo. Logins compartilhados reúnem as atividades desse login. Registros históricos aparecem como **Sem operador registrado**, sem inventar nomes ou durações. O relatório exibe até 100 grupos de loja/operador e informa quantos existem. A seleção continua pela emissão do pedido.

### Vendas e caixa no Painel do Gestor

A nova área aparece somente quando pelo menos uma loja selecionada tem Caixa habilitado, mesmo sem Preparo. A área de produção exige Preparo, mesmo sem Caixa. Filtros de loja/grupo, datas e fuso são comuns; TMA aparece apenas na produção. A liberação é consultada novamente a cada atualização, e os dados da área desativada são limpos.

Telas concluídas: vendas/recebimentos líquidos e ticket médio; gráficos/tabelas por hora, dia da semana, dia e mês; pagamentos em dinheiro/cartão/Zelle; vendas por loja; produtos/categorias; operações por operador; fechamentos com diferença; últimas operações.

Cálculos usam a mesma função dos relatórios do tablet, em centavos inteiros. Vendas líquidas excluem imposto, gorjeta e entrega; recebimentos líquidos incluem esses componentes e excluem entradas/saídas. Ticket médio é o valor dos produtos após desconto por venda, antes de devoluções, sem imposto/gorjeta/entrega. A média do grupo é ponderada pelas vendas. Devoluções entram na sua data, mesmo para vendas fora do período, e podem produzir vendas líquidas negativas. Pagamentos divididos e estornos parciais seguem as parcelas/componentes registrados.

Lojas mantêm seus IDs de produto; na consolidação do grupo só produtos com o mesmo nome/categoria histórico são reunidos. Entradas/saídas, estornos e cancelamentos são atribuídos ao operador que registrou cada operação. Fechamentos usam todos os movimentos da abertura para o saldo esperado, inclusive fora do filtro.

A leitura de operações/fechamentos usa duas consultas numa única transação D1, já limitada às lojas autorizadas e habilitadas. Até 10.000 operações e 10.000 fechamentos no período/grupo são aceitos; acima disso a consulta inteira pede período menor ou uma loja, sem totais cortados. Tabelas de produtos, fechamentos e últimas operações mostram até 100 linhas e informam o total; cálculos incluem todos os registros aceitos. O portal não retorna recibos completos, nome/contato de clientes nem observações dos itens/motivos das operações.

O cadastro de gestores permanece exclusivamente no administrativo do BistroHub. Não há novo cadastro público nem quinta marcação de módulo.

## Idiomas e vocabulário comercial — 08/10/2026

Login e áreas de produção/vendas disponíveis em PT/EN/ES, com a escolha salva por usuário e mantida após sair/entrar ou acessar outro navegador. Trocar idioma conserva área e filtros durante o recarregamento e localiza datas dos relatórios, números e valores USD, preservando os nomes cadastrados.

O TMA inicial aparece como **Average fulfillment time** em inglês e **Tiempo medio de servicio del pedido** em espanhol, com emissão até finalização indicada. Ao mudar o intervalo, os títulos também mudam para tempo até pronto ou tempo de preparo. Pesquisa, definições, persistência, fontes e roteiro em `IDIOMAS-PAINEL-GESTOR.md`.

## Publicação e teste em homologação

As ampliações de 07/10 e 08/10 estão em entrega após autorização de commit/push, publicação e APK em 08/10. O procedimento em `AMBIENTES.md` aplica o esquema D1 e publica Worker/APK de homologação, usando `npm run publicar:homologacao` no ambiente autenticado. Resultados efetivos em `PENDENCIAS.md`; a autorização não comprova por si só que a publicação/build já ocorreu.

O esquema reaplicável `server/cloudflare/store-schema.sql` adiciona `manager_clients`, `manager_users`, `manager_login_limits`, `manager_user_preferences` e `panel_preferences`. Nenhum cadastro de gestor é criado na migração. Reaplicar antes de publicar o Worker com idiomas. Instalar o novo APK em todos os tablets que avançam preparo antes de usar os novos horários. APKs antigos que omitirem horários já gravados receberão bloqueio ao tentar substituir esse registro. Atualização apenas do JavaScript não inclui os módulos nativos de áudio/asset.

Endereços de homologação após publicar:

- Administrativo: `https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/admin`
- Cadastro de gestores: `https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/admin/gestores`
- Portal do cliente: `https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/gestor`

O perfil `homologacao` mantém projeto Expo, Worker/D1 e pacote Android próprios. Nenhuma publicação foi feita em produção.

Para reproduzir apenas a exportação local de teste, usar a variável `EXPO_PUBLIC_API_BASE_URL` e limpar o cache de transformação ao trocar o destino:

```bash
APP_VARIANT=homologacao \
EXPO_PUBLIC_API_BASE_URL=https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev \
npx expo export --platform android --clear --output-dir /tmp/bistro-preparation-android
```

O perfil EAS já define essa variável corretamente. O comando acima gera um pacote de JavaScript/assets para verificação, não um APK.

Roteiro físico: liberar somente a loja de teste; instalar APK atualizado em balcão/cozinha; emitir pedido com painel da cozinha aberto; testar som ligado/desligado e volume; avançar etapas e comparar horários/médias no portal; escolher intervalo de TMA, trocar recortes/indicadores, consultar um mês e comparar dias da semana; repetir offline e sincronizar; consultar cliente de uma loja e grupo; desativar acesso ou retirar loja e verificar novo login/escopo. Conferir a POS e a impressão existente separadamente.

## Validação local

Ampliação mais recente de 08/10: 194 testes aprovados, lint/TypeScript, navegador Chromium com telas financeiras, mudanças de módulo e idiomas/persistência; 432 combinações de telas/idiomas/dimensões, nova exportação Android exclusiva de homologação e empacotamento local do Worker. Administrativo, gestor e APK contemplam PT/EN/ES; reaplicar o esquema com `manager_user_preferences` e `panel_preferences` antes da entrega. O refinamento não acrescenta dependência nativa. Inventário em `DESENVOLVIMENTO-08-10.md` e roteiro físico em `REFINAMENTO-IDIOMAS-TABLETS.md`.

- Suíte completa após a ampliação de métricas: 162 testes passaram. Os testes de analytics incluem médias ponderadas, intervalos de TMA, volumes acima de 5.000 pedidos, recortes, meses de 28/29 dias, fusos e horário de verão com 23/25 horas. Cobrem tempo, fila offline/reinício, idempotência, flags, acesso administrativo, credenciais, sessões/revogação, isolamento, médias ponderadas, limites e horários históricos.
- Fluxo real em Chromium com dados sintéticos: cadastro pelo administrativo, login do gestor, duas lojas, filtro, TMA, gráficos por hora/semana/dia/mês, seleção de mês/período anual, resposta lenta com troca rápida de filtro, layout estreito e revogação sem erro de JavaScript.
- Lint e TypeScript; exportação Android de homologação; montagem do Worker com `wrangler deploy --dry-run`.
- Prebuild Android numa cópia temporária: pacote de homologação correto e áudio sem permissão de gravação nem serviço de áudio em segundo plano. Nenhuma pasta nativa foi criada no repositório.
- Expo Doctor: 20 de 21 verificações passaram. Continua o aviso de catálogo sobre `react-native-tcp-socket` ainda não testado oficialmente na New Architecture; o teste físico da impressão continua necessário. As dependências exigidas pelo áudio foram instaladas, com ajustes de patch de Expo/Router/Linking dentro do SDK 57.

A ampliação de 08/10 altera o Worker, o portal web e o JavaScript do tablet (operadores e impressão automática); não adiciona outro módulo nativo nem outra migração além dos já previstos em 07/10. Estas verificações não geram um APK assinado nem substituem os testes físicos de áudio, sincronização e impressora.
