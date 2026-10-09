# Pendências e preferências

## Autenticação e entrega em homologação — 09/10/2026

- Cloudflare e Expo autenticados nesta sessão por autorização de dispositivo nas páginas oficiais; Expo conectado à conta `onlybeone`, com acesso a `onlybeones-team`. Senhas e tokens não foram solicitados ou registrados no Git.
- Ponto D1 Time Travel registrado antes da migração: `00000004-00000002-000050ff-c80b4807b88a48b300ed0c70ab8d6b71`. Backup SQL conferido em `.wrangler/backups/homologacao-2026-10-09T22-26-20-819Z.sql`, fora do Git/APK; esquema reaplicado com 46 consultas.
- Worker `seabra-cardapio-homologacao` publicado com versão `bb2a071c-e52e-4df8-85da-ed999bcc81fd`, a partir do commit `930ed6bd6a718ed7a9daebef6dce02118cff4bd2`. `/health` respondeu 200/`ok: true`; páginas `/admin`, `/admin/gestores` e `/gestor` responderam 200 e passaram em nove verificações de idioma PT-BR/EN/ES no serviço publicado.
- APK concluído: [build `1292af19-22dc-47ff-962f-a89712cad14f`](https://expo.dev/accounts/onlybeones-team/projects/matheus-sampaio-homologacao/builds/1292af19-22dc-47ff-962f-a89712cad14f), commit `930ed6b`, perfil `homologacao`, pacote `com.wooxonly.comandadigitalprint.homologacao`, projeto `2cffbcaa-f4d7-423c-85c7-81131ca55310`. Expo confirmou `FINISHED` em 09/10/2026 às 18h48, horário de Nova York; Gradle registrou `BUILD SUCCESSFUL in 20m 32s`, incluindo a compilação de `react-native-tcp-socket`.
- [Download do APK de homologação](https://expo.dev/artifacts/eas/rc35-mtYlfGGrbvSODJyZo1UHErQfrOHcFssD5lRM2A.apk) conferido com HTTP 200 e arquivo de 146.967.969 bytes. Integridade ZIP, pacote Android próprio, API exclusiva de homologação, ausência da URL de produção e áudio de notificação incluído verificados no APK compilado. SHA-256: `1e40b78f6d0e94605680b47d6e7dfc9cc9144469565196cda5240df38f298dbc`.
- A entrega foi executada diretamente pelos CLIs autenticados desta sessão. A automação do GitHub ainda precisa dos três segredos descritos em `AMBIENTES.md`; o login por dispositivo não os cadastra automaticamente. Nenhuma entrega de produção foi iniciada.
- Publicador corrigido para capturar a saída do backup e remover links assinados privados de erros, impedindo sua exposição nos logs públicos do GitHub. Quatro testes do publicador, lint, tipos e validação do workflow aprovados. O commit de automação/documentação usa `[skip deployment]`: validação GitHub continua e evita uma segunda build do mesmo aplicativo.
- Expo Doctor da build informou 20/21 verificações aprovadas; a ressalva é a ausência de validação de `react-native-tcp-socket` para New Architecture no React Native Directory. A biblioteca compilou e o APK foi gerado; isso não substitui validação de funcionamento na impressora. Impressão ESC/POS, acentos/corte, som, teclado/fontes, rotação, sincronização entre aparelhos e uso durante o turno ainda exigem teste nos tablets/POS. Instalar o APK novo antes de habilitar os módulos opcionais.

## Entrega em homologação solicitada — 08/10/2026

- Usuário autorizou registrar e enviar todas as melhorias para `homologacao`, publicar o Worker/D1 de homologação e gerar APK exclusivo para testar hoje. Essa autorização substitui, para esta entrega, a preferência anterior de apenas acumular as mudanças.
- Pacote enviado à branch `homologacao` no commit `27830026019fe05afd34213072d007553cffe16e`. GitHub Actions aprovou instalação, lint, tipos e testes. Inclui 194 testes, matriz de 432 combinações de telas/idiomas/dimensões e exportação Android exclusiva de homologação.
- Entrega em andamento: autenticação de Cloudflare e Expo ainda precisa ser disponibilizada. Caminho em nuvem preparado no GitHub Actions, com três segredos e execução somente após push em `homologacao` e validações aprovadas. Instruções e alternativa pelo computador em `AMBIENTES.md`. Nunca registrar os valores das credenciais no Git ou na conversa.
- A entrega usa o commit validado, registra recuperação D1, confere backup e destinos, publica o Worker de homologação e solicita APK no projeto Expo próprio. `main` e pull requests executam apenas validações; nenhuma entrega de produção foi iniciada.
- O resultado de commit/push, validação remota, publicação e build será registrado ao concluir as etapas correspondentes. Os testes físicos de tablet/POS permanecem a cargo da validação desta versão entregue.

## Refinamento de idiomas e dimensões — 08/10/2026

- Regra permanente em `AGENTS.md`: todo recurso do administrativo, gestor e APK deve contemplar PT-BR/EN/ES, com revisão de escrita, acentuação, pontuação e verificação de retrato/paisagem.
- Administrativo e cadastro de gestores traduzidos; idioma do proprietário persistente no D1, separado das preferências dos gestores/tablets. APK ganha escolha no login, mensagens faltantes, imposto/percentuais e acessibilidade localizados.
- Corrigida largura com nomes longos de clientes; prévia de impressão comporta oito destinos roláveis e ações em telas baixas; cabeçalho administrativo adaptado a telas estreitas/baixas.
- 194 testes aprovados (184 CJS e 10 MJS), lint/TypeScript e 432 combinações de telas, três idiomas e seis dimensões em Chromium. Componentes reais do APK renderizados por React Native Web com serviços sintéticos; teclado/fonte Android, som, impressão e autonomia aguardam equipamento físico.
- Nova exportação Android local aprovada, áudio incluído, URL exclusiva de homologação verificada; Worker empacotado localmente em homologação. Sem commit/push/deploy/EAS nesta rodada.
- Antes da entrega, reaplicar esquema com `manager_user_preferences` e `panel_preferences`, além dos módulos anteriores. Testes físicos e recomendação de tablet 10–11"/8 GB documentados em `REFINAMENTO-IDIOMAS-TABLETS.md`.

## Conclusão do desenvolvimento combinado — 08/10/2026

- Prioridade atual do usuário: código e telas do escopo combinado prontos até 09/10; publicação e teste com tablets/POS ficam para outra etapa. Continuar acumulando alterações em `homologacao`, sem commit/push nesta rodada.
- Concluída a área Vendas e caixa no Painel do Gestor: indicadores financeiros, ticket médio, pagamentos, recortes por hora/semana/dia/mês, lojas, produtos/categorias, operadores e fechamentos. Usa os mesmos cálculos do tablet; só lojas autorizadas com Caixa habilitado entram.
- Concluídos produtos/categorias mais pedidos e produtividade por operador no painel de produção. Tablet registra quem iniciou, marcou pronto e finalizou, inclusive offline; histórico sem operador/tempo continua identificado como desconhecido. Não altera os quatro módulos independentes.
- Concluída impressão automática opcional por tablet, desligada por padrão e somente pela rede: salva antes de enviar, bloqueia duplicação, abre prévia em falha e permite repetição explícita sem reenviar destinos confirmados.
- Concluídos PT/EN/ES no login e nas áreas de produção/vendas do Painel do Gestor, com preferência por conta persistente em outros navegadores, preservação de filtros e formatação local de datas/números/USD. Termos de restaurantes pesquisados e documentados em `IDIOMAS-PAINEL-GESTOR.md`, com intervalos das métricas explícitos.
- Telas e fluxos já existentes de Caixa, Encomendas/agenda/entregas, Clientes, permissões, favoritos/esgotados e recuperação permanecem implementados. Inventário e limites em `DESENVOLVIMENTO-08-10.md` e `PREPARO-PAINEL-GESTOR.md`.
- Verificação mais recente de 08/10: 194 testes, lint/TypeScript, fluxos reais em Chromium incluindo PT/EN/ES, persistência e troca de filtros, matriz de dimensões, nova exportação Android e empacotamento local do Worker aprovados. Detalhes da ampliação mais recente na seção anterior.
- A ampliação de idiomas adiciona `manager_user_preferences` e `panel_preferences` ao esquema reaplicável já usado na entrega; deve ser aplicado antes do Worker atualizado. Não adiciona dependência nativa. Avisos com aplicativo fechado/em segundo plano e versão própria do gestor para celular permanecem fora da primeira versão combinada.

## Métricas de TMA e volume — 07/10/2026

- Painel do Gestor ampliado localmente com TMA por intervalo explícito (inicialmente emissão até finalização), gráficos/tabelas por hora, dia da semana, dia e mês, médias de volume, mês completo e consultas até 366 dias.
- Fusos e horário de verão considerados, com dias de 23/25 horas e normalização por quantidade de dias no período. Pedidos sem horários não viram amostras de duração zero.
- Totais agregados no D1 sem o limite anterior de 5.000 pedidos; detalhamento dos 100 mais recentes separado dos cálculos. Acesso continua limitado às lojas vinculadas e com Preparo habilitado.
- 162 testes, lint/TypeScript e fluxos reais no navegador verificados. Detalhes em `PREPARO-PAINEL-GESTOR.md`. Alterações acumuladas sem commit/deploy; publicação e APK da etapa anterior continuam pendentes dos acessos Cloudflare/Expo.

## Preparo e Painel do Gestor — 07/10/2026

- Primeira etapa implementada localmente em `homologacao`: Preparo opcional liberado no administrativo existente, horários por etapa e aviso visual/som opcional no tablet, com consulta ativa a cada cinco segundos. Os quatro módulos continuam independentes.
- Cadastro do cliente/grupo e dos usuários gestores exclusivamente no administrativo (`/admin/gestores`), com uma ou várias lojas autorizadas. Portal `/gestor` inicia pelas métricas de produção habilitadas por loja, com isolamento, médias baseadas nos tempos registrados e revogação de acesso.
- Roteiro, limites e verificação em `PREPARO-PAINEL-GESTOR.md`. Migração adiciona tabelas de gestores; áudio exige APK novo em todos os tablets de preparo. Métricas de vendas, produtos/categorias e operadores estavam previstas e foram concluídas na ampliação de 08/10.
- Alterações ainda sem commit/push/deploy/EAS nesta etapa, conforme a preferência de acumular até solicitar commit. Logins remotos continuam indisponíveis neste ambiente; publicação e teste com tablets/POS pendentes.

## Execução no computador com logins existentes — 07/10/2026

- Usuário autorizou usar as sessões salvas no computador. O ambiente atual está em nuvem, sem disco do computador montado e sem sessão Wrangler/EAS. Nenhuma senha/token foi exibida ou copiada.
- Comando `npm run publicar:homologacao` preparado para execução no computador autenticado: valida isolamento, confere ambos os logins, faz/verifica backup D1, aplica esquema, publica Worker, verifica saúde e solicita APK próprio sem aguardar build. Usa Node.js 24; instruções em `AMBIENTES.md`. A opção `-- --check` verifica a separação sem publicação.
- Publicação remota e novo APK continuam pendentes de execução com os logins acessíveis. A validação GitHub do commit anterior terminou com sucesso.

## Preparação da entrega em homologação — 06/10/2026

- Solicitado commit/push e publicação integral das melhorias em homologação. Pacote consolidado na branch `homologacao`; 136 testes, lint e TypeScript passaram novamente neste ambiente.
- Configurações confirmadas: Worker/D1 `seabra-cardapio-homologacao`, perfil EAS `homologacao`, projeto Expo `matheus-sampaio-homologacao` e pacote Android próprio. Produção permanece separada.
- Este ambiente tem acesso ao GitHub, mas Wrangler e EAS reportaram ausência de autenticação. Aplicação do esquema D1, publicação do Worker e início do APK dependem de configurar Cloudflare/Expo aqui ou usar os logins do computador do responsável. Roteiro em `AMBIENTES.md` e `MELHORIAS-OPERACIONAIS.md`.

## Entrega de 29/09/2026

- Dependências corrigidas para Expo SDK 57; Expo Doctor passou nas 21 verificações.
- Envio salva antes de limpar o pedido e libera a tela antes de aguardar a impressão. Impressão com limite de 30 segundos, proteção contra chamadas simultâneas e registro de falhas.
- Gerenciamento de usuários no início de Ajustes: listagem, status ativo/inativo, ativação/desativação, redefinição de senha e cadastro separado. Admin protegido usa o painel semanal.
- Logs de erros e impressão com fila offline e armazenamento na nuvem, acessíveis no painel protegido. Limites em DIAGNOSTICOS.md.
- Cardápio dos produtos das fotos com nomes português/inglês e ingredientes bilíngues. Códigos não aparecem no nome. Salgados e fatias de pizza removidos, preservando o histórico.
- Recursos anteriores: login local com senha semanal de seis caracteres e recuperação privada offline, idiomas PT/EN/ES, exigência de cliente opcional, detalhes no histórico, layout responsivo, splash do chef, impressão de produção sem preços em 58/80 mm.
- Sincronização entre tablets: UUID por aparelho/pedido, fila durável, reenvios idempotentes, conflitos explícitos e preferências de impressora/idioma por tablet. Roteiro em SINCRONIZACAO.md.

Worker publicado: b99f8578-d90f-470f-9447-8b207b3ec789. Migração de logs aplicada no D1; cardápio online atualizado com 39 produtos. Saúde do serviço e bloqueio de logs sem autenticação verificados.

## Dependências de equipamento

- Em 05/10/2026, melhorias operacionais implementadas localmente em `homologacao`: disponibilidade/esgotado, favoritos e busca; Painel de preparo como quarto módulo independente no portal (16 combinações); agenda diária/semanal vinculada a Encomendas; até oito destinos de impressão por categoria e destino de recibo; permissões por usuário e histórico de atividade no portal; verificação AES-GCM e recuperação guiada de registros ausentes/da nuvem. Complementos de comanda foram excluídos conforme confirmação. Novas tabelas `store_preparation_modules`, `store_access_settings`, `store_admin_activity`; metadados versão 3 e eventos operacionais filtrados para APKs antigos. Roteiro e limites em `MELHORIAS-OPERACIONAIS.md`. Nenhum commit/deploy/build EAS nesta etapa; pendem publicação em homologação, novo APK e testes com tablets/POS.

- Em 05/10/2026, nova etapa implementada localmente em `homologacao`: Cadastro de Clientes como terceiro módulo independente no portal (oito combinações), busca/edição/endereços/arquivamento/histórico; seleção opcional somente em Caixa/Encomendas; taxa/responsável/despacho/entrega; pagamentos divididos dinheiro/cartão/Zelle, gorjeta voluntária sem tax e estornos sucessivos por itens/valor/saldo com autorização, motivo e proteção atômica de saldos. Recibos e relatórios/CSV discriminam gorjeta, entrega, parcelas e devoluções. Comanda de cozinha mantém seu fluxo. Esquema reaplicável adiciona `store_customer_modules`, `cash_refunds` e views; metadados mantêm o contrato de duas flags para APKs antigos, com opção de três no novo. Nada publicado/commitado nesta etapa. Roteiro e limites em `MODULOS-ENCOMENDAS-CAIXA.md`; pendem publicação, instalação do APK e testes físicos.

- Em 05/10/2026, etapas adicionais implementadas localmente: gerentes selecionados no portal, descontos USD/percentuais, cancelamentos/estornos integrais com motivo/auditoria, proteção de preços, relatórios por período/dia/produto/pagamento/fechamento e CSV, sales tax configurável por empresa inicialmente desligado. Edição de encomendas foi pulada conforme solicitado. Novas tabelas `store_cash_settings` e `cash_adjustments` no mesmo esquema reaplicável; `expo-sharing` exige novo APK. Reaplicar o esquema de homologação e publicar Worker antes de instalar/testar; nenhum commit/deploy foi solicitado nesta etapa. Detalhes em `MODULOS-ENCOMENDAS-CAIXA.md`.

- Em 05/10/2026, primeira etapa de Encomendas e Caixa implementada localmente em `homologacao`: habilitação independente por empresa no portal, agendamentos de retirada/entrega, abertura por tablet, recebimentos USD em dinheiro/cartão/Zelle, entradas/saídas, fechamento e recibo não fiscal. Preço aparece no cardápio somente com Caixa habilitado; comandas continuam independentes e sem preço na impressão. Roteiro, limites e publicação em `MODULOS-ENCOMENDAS-CAIXA.md`. Requer reaplicar o esquema D1 de homologação, publicar Worker e instalar novo APK antes de habilitar os módulos; nenhum deploy realizado nesta etapa.

- Em 04/10/2026, impressão POS pela rede implementada na cópia de trabalho de `homologacao`, usando os campos existentes de IP/porta e ESC/POS. Teste e reimpressão compartilham o transporte, sem reenvio automático. É necessário gerar um novo APK para incluir o módulo TCP. Equipamento informado: Milestone POS de 80 mm com USB/rede, uso pela rede. Protocolo, acentos e corte ainda precisam de validação física; roteiro em `IMPRESSAO-REDE.md`.

- Validar o APK atualizado em dois tablets, incluindo rotação da tela, login e impressão física em 58/80 mm.
- Impressão direta Bluetooth/USB continua pendente. Pela rede, o código agora envia ESC/POS; a opção de sistema continua usando o driver instalado. “Impressão enviada” (PT/EN/ES) aparece após confirmação de gravação dos bytes no socket; não afirmar impressão física sem conferir o equipamento.
- Chave privada de recuperação fora do Git em .codex/private/seabra/recuperacao-offline.txt; instruções em ACESSO-E-IDIOMAS.md.

## Preferências permanentes

- Equipamento inicial: priorizar custo menor. Os 8 GB de RAM sugeridos eram margem de desempenho, não requisito mínimo medido. Alternativa de início: Android de 10–11", 4 GB de RAM física/64 GB, com Galaxy Tab A9+ de caixa aberta como recomendação econômica, sujeito ao teste do APK e do turno completo. Opções e preços consultados em `REFINAMENTO-IDIOMAS-TABLETS.md`.
- Sempre entregar PT-BR, inglês e espanhol no administrativo, gestor e APK, revisando escrita/acentuação/pontuação; validar dimensões e orientação e registrar o que ainda depende de aparelho físico.
- Fazer apenas mudanças solicitadas, sem refatorações extras; executar verificações adequadas e não repeti-las sem razão concreta.
- Ao solicitar commit: commit/push, nuvem aplicável e início do build Expo. Confirmar aceitação e fornecer links sem aguardar o build. Sem solicitação, acumular alterações locais.
- Comunicar o andamento de forma curta e frequente.
