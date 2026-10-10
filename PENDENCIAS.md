# Pendências e preferências

## Cinco erros sem espera antes do bloqueio — 09/10/2026

- Administrativo e vínculo inicial do tablet permitem os primeiros cinco erros sem espera. O 6º erro bloqueia por 30 segundos, o 9º por 60, o 12º por 90 e o 15º por 120. Após a espera, erros adicionais continuam a sequência; um login correto zera o contador. Pedidos durante o bloqueio não somam erros nem prorrogam o prazo.
- O contador existente é persistente e compartilhado entre o administrativo e o vínculo inicial; falhas de visitas anteriores explicam um bloqueio após uma tentativa nova. A transição de política zera tentativas/bloqueio uma única vez, para iniciar com cinco tentativas livres, sem alterar senhas, sessões, lojas ou dados. A versão da política e o reset são atualizados atomicamente; reaplicar o esquema preserva falhas posteriores.
- Alteração feita na API; o APK atual recebe a nova regra pelo servidor, mantendo a contagem regressiva em PT-BR/EN/ES. Não requer outra build. `store-schema.sql` aplicado antes do Worker atualizado.
- Lint, TypeScript, **211 testes** e **480 verificações de telas/idiomas/dimensões em Chromium** aprovados. Inclui cinco erros sem espera no formulário real, limites 6/9/12/15, concorrência, contador compartilhado, `Retry-After`, singular/traduções, reset no sucesso, migração de estados antigos e reaplicação sem liberar novos bloqueios. Verificação Android física continua no roteiro.
- Backup privado anterior à transição: `.wrangler/backups/homologacao-login-five-2026-10-10T00-00-41Z.sql` (10.242 bytes; fora do Git). Bookmark D1: `0000000e-00000000-000050ff-0fb3aec417be302c756c9f5579ace4d0`.
- Código enviado à branch `homologacao`: `3926c8b7e3ef940c0ef84f1830691e872d83efda`; GitHub Actions aprovado: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38007264318 . Worker publicado com versão `e388d05c-d6a4-4216-9973-b76b202a26fe`, somente em https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/admin . Nenhum destino de produção utilizado.
- Após a transição, D1 confirmou `attempts:0`, `blocked_until:0`, `version:2` (antes havia três erros acumulados). Entradas do administrativo em PT-BR/EN/ES responderam HTTP 200, sem `Retry-After` nem contagem regressiva; saúde HTTP 200/`ok:true`. Nenhuma tentativa inválida foi enviada ao ambiente real durante a verificação, preservando as cinco tentativas novas para o usuário.

## Bandeiras compactas no canto superior direito — 09/10/2026

- Administrativo, cadastro de grupos/gestores, Painel do Gestor e telas do APK com seleção de idioma usam bandeiras **20 × 15**, reduzidas de 32 × 24, no canto superior direito. Botões **44 × 44** conservam a área de toque; fundo transparente e seleção verde clara com borda fina substituem os blocos grandes/escuros. Nomes acessíveis, foco, seleção e preferência salva preservados.
- No tablet, o seletor fica no início do vínculo/login e dos Ajustes; no site, antes do conteúdo do formulário e no canto direito do cabeçalho administrativo. Não usa posicionamento absoluto sobre campos ou menus.
- Lint, TypeScript, 15 testes de idioma/login e 480 verificações de telas/idiomas/dimensões em Chromium aprovados. Revisão independente de 18 casos dos portais em PT-BR/EN/ES, em 390 × 844 e 600 × 960, confirmou botões 44 × 44, bandeiras 20 × 15 no canto direito, foco visível e ausência de sobreposição ou rolagem horizontal. Android físico permanece no roteiro de teste.
- Código enviado à branch `homologacao`: `43918626a4053200f4ef329dc67be99fc77405b7`. Worker publicado com versão `3c08b63d-13f3-4af0-ad1c-3e4cdef7dcea`. Administrativo: https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/admin ; gestores/grupos: `/admin/gestores`; Painel do Gestor: `/gestor`. Saúde HTTP 200/`ok:true` e entradas dos portais em PT-BR/EN/ES conferidas online.
- **APK atualizado aceito e em compilação (`IN_PROGRESS`)**: https://expo.dev/accounts/onlybeones-team/projects/matheus-sampaio-homologacao/builds/0177dde9-0916-4adc-bea8-5a5cd43b9761 . Perfil `homologacao`, commit `4391862`, nome **BistroHub Homologação**, pacote `com.wooxonly.comandadigitalprint.homologacao`. O download estará nessa página ao concluir. Entrega confirmada ao aceitar a build, sem esperar a compilação, conforme preferência permanente.
- A primeira validação do GitHub expôs uma disputa intermitente em um teste existente de sincronização: o autosync podia inverter o tablet vencedor antes das chamadas explícitas. O teste agora aguarda o autosync ainda offline e reconecta A antes de B, preservando a detecção de conflito e verificando também a escrita pendente. Os **210 testes** passaram novamente com a correção. Essa alteração posterior afeta somente o teste; não exige republicação nem outro APK.
- Backup privado anterior à reaplicação do esquema: `.wrangler/backups/homologacao-2026-10-09T23-44-56-681Z.sql` (fora do Git). Bookmark D1: `0000000c-00000000-000050ff-9113c0892347f621294948c0b2c063b6`. Publicação direta com Cloudflare/Expo autenticados; `[skip deployment]` evita duplicação enquanto os Actions Secrets permanecem pendentes.
- Produção não recebeu esta entrega: `main` permanece em `25f0aa41abc449b57169ac1142deb781d2435ad2`. Testes dos portais já podem começar; APK depende do término da build e da instalação no tablet.

## Entrega das correções em homologação — 09/10/2026

- Código commitado e enviado: `7c5e617cac2a61c3651cf95e51393ab29faa9f02`, branch `homologacao`. Inclui bandeiras, espera progressiva no login/vínculo, fluxo **grupo → cliente/loja**, senhas web de mínimo 8 caracteres e senhas escolhidas no app de 1 a 128 caracteres. Grupos e lojas existentes preservados; nenhuma senha foi redefinida durante a publicação.
- Worker publicado: versão `8eed4dd2-f149-497f-8338-451a71cf290e`. Administrativo: https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/admin ; grupos/usuários: `/admin/gestores`; gestor: `/gestor`. Saúde HTTP 200/`ok:true`; entradas dos dois portais conferidas online em PT-BR/EN/ES, com três bandeiras.
- **APK novo aceito e em compilação (`IN_PROGRESS`)** no Expo: https://expo.dev/accounts/onlybeones-team/projects/matheus-sampaio-homologacao/builds/395b6ba1-41cd-4626-a6b7-0f601fabe662 . Perfil `homologacao`, Android, commit `7c5e617cac2a61c3651cf95e51393ab29faa9f02`, aplicativo **BistroHub Homologação**, pacote `com.wooxonly.comandadigitalprint.homologacao`. O download aparece nessa página após o término. Conforme preferência permanente, entrega confirmada ao aceitar a build, sem esperar a compilação e sem confundir com o APK anterior.
- Lint, TypeScript, **210 testes** e **480 verificações de telas/idiomas/dimensões em Chromium** aprovados. GitHub Actions do código também aprovado: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38004876116 . Publicação executada diretamente com Cloudflare/Expo autenticados; `[skip deployment]` evita publicação automática duplicada enquanto os três Actions Secrets ainda não estão configurados.
- Backup privado antes da reaplicação do esquema: `.wrangler/backups/homologacao-2026-10-09T23-32-05-942Z.sql` (10.230 bytes; fora do Git). Bookmark D1: `0000000a-00000000-000050ff-d54f4c8f92189238b395261d983a48af`.
- Produção não recebeu esta entrega: branch `main` permanece em `25f0aa41abc449b57169ac1142deb781d2435ad2`. Pendências para uso: término da build no Expo, instalação do APK novo e teste em tablet/impressora físicos. Não é necessário aguardar a compilação para testar os portais.

## Administrativo por grupos e regras de senhas — 09/10/2026

- Proprietário entra em **Grupos**, escolhe o grupo e depois o cliente ou loja. Não há seleção automática de Hunters Creek ou outra unidade. Grupos existentes reaproveitados; lojas sem vínculo aparecem em **Lojas sem grupo**, inclusive inativas, sem reativação automática. Métricas continuam no portal separado `/gestor`.
- Cadastro de grupos pode começar vazio; cadastro de loja no grupo vincula a nova unidade em transação, sem anexar lojas existentes quando o nome/ID colide. O administrativo consulta logs e histórico globais, do grupo ou da unidade selecionada. Senha semanal exige seleção explícita de loja.
- Senhas de contas dos sites: mínimo de **8 caracteres**, tanto no formulário quanto na API, para troca do proprietário e criação/redefinição de gestores. Senhas escolhidas no app: qualquer tamanho não vazio, até o limite de entrada existente de 128 caracteres, com confirmação, proteção e verificador preservados. Senha semanal gerada e código de Ajustes mantêm suas regras. Segredos de assinatura e tokens da API continuam separados.
- Lint, TypeScript e **210 testes** aprovados; **480 combinações** de telas, idiomas e dimensões em Chromium, sem erros de JavaScript. Inclui fluxo de grupo/loja, lojas inativas e sem grupo, vínculo atômico, logs por escopo, mínimo de 8 no site e senhas curtas/longas no app. Evidência de navegador; validação no Android físico permanece no roteiro.
- Entrega solicitada expressamente pelo proprietário: comitar, enviar à branch `homologacao`, publicar Worker e iniciar APK exclusivo. Status e links da entrega serão registrados após confirmação dos serviços.

## Espera progressiva no acesso administrativo — 09/10/2026

- Vínculo inicial do tablet e login do administrativo agora bloqueiam por 30 segundos após três erros, 60 após seis, 90 após nove e mais 30 segundos por grupo de três. O total de erros persiste após a espera e zera ao entrar corretamente. Pedidos durante o bloqueio não contam erros nem prorrogam o prazo; atualizações do contador/deadline são atômicas no D1.
- API retorna `Retry-After` e `retryAfterSeconds`. Tablet e administrativo mostram contagem regressiva em PT-BR/EN/ES, tratam o singular de um segundo, impedem nova submissão durante a espera e liberam a ação ao terminar. A tela não tenta entrar automaticamente. Reabertura do administrativo consulta novamente o prazo real; retorno do tablet ao primeiro plano atualiza seu relógio.
- Bloqueios legados da regra de cinco erros/15 minutos são removidos uma vez durante a transição, preservando o contador. Não exige migração de esquema nem troca de credenciais.
- Lint, TypeScript, 202 testes e 444 combinações de telas/idiomas/dimensões em Chromium aprovados. Inclui limites de 30/60/90/120 segundos, fim exato da espera, contador compartilhado, concorrência, legado, login correto, contagem regressiva e ausência de reenvio automático. Verificação física em Android permanece separada.
- Implementação validada antes da entrega; publicação desta rodada registrada na seção mais recente. A nova regra depende da próxima publicação do Worker; a contagem regressiva no tablet requer o APK atualizado.

## Bandeiras nos seletores de idioma — 09/10/2026

- Substituídos os nomes visíveis dos idiomas por bandeiras do Brasil, Estados Unidos e Espanha no vínculo inicial do tablet, login, Ajustes, administrativo, cadastro de gestores e Painel do Gestor. O idioma selecionado continua destacado e a preferência salva mantém o comportamento existente.
- Imagens incluídas no APK e SVGs incorporados ao HTML, sem depender de internet para carregar as bandeiras ou de fontes de emojis. Nomes dos idiomas preservados para acessibilidade; botões com área mínima de 64 × 48 e estado de seleção exposto.
- Lint, TypeScript, 195 testes existentes e 432 combinações de telas/idiomas/dimensões em Chromium aprovados. Bandeiras carregadas, preferência entre páginas/navegadores e prévias em retrato/paisagem conferidas. A validação usa componentes reais do APK via React Native Web; aparelho Android continua necessário para a verificação física.
- Implementação validada antes da entrega; publicação desta rodada registrada na seção mais recente. Para aparecer no aplicativo instalado e nos portais online, incluir a alteração na próxima entrega.

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
