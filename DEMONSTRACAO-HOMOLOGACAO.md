# Base demonstrativa — homologação

Carga solicitada pelo proprietário em 20/10/2026 para apresentação do app e portal. Destino exclusivo: Worker/D1 `seabra-cardapio-homologacao`, loja `seabra-1` (Seabra Hunters Creek). Nunca executar em produção.

- 120 dias inclusivos, de 23/06/2026 a 20/10/2026, calendário America/New_York.
- 7.659 pedidos sintéticos, de 30 a 100 por dia, usando nomes, categorias e preços do catálogo atual. Os oito pedidos anteriores permanecem intactos.
- 7.650 concluídos, com TMA entre 30 e 45 minutos e média próxima de 37,5 minutos (ajuste de apresentação autorizado em 20/10; originais guardados em demo_tma_backup); quatro identificadores fictícios de operadores de cozinha, sem criar contas ou permissões.
- Nove pedidos recentes na fila: três recebidos, três em preparo e três prontos. Os tempos continuam correndo após a carga, como em qualquer pedido real.
- 240 encomendas: histórico concluído e duas futuras para demonstração. O fluxo operacional futuro de encomendas/cozinha/caixa continua adiado.
- Caixa e Cadastro de Clientes estavam desativados nessa loja. A carga respeita esses módulos, sem ativá-los, modificar configurações ou cadastrar vendas/clientes escondidos. O gerador também suporta lojas com esses módulos já ativos, usando os cálculos reais de preço, impostos, pagamentos e relatórios.

Todos os identificadores sintéticos usam o prefixo `demo120-v1-`; clientes nos pedidos têm nomes iniciados por Demo, contatos de encomendas usam `example.invalid` e números de pedido usam o tablet DEMO. Não há mensagens, impressão ou cobrança automática.

O workflow manual `demo-homologacao.yml`, modo inspect, consulta somente catálogo, módulos e contagens. O modo load registra antes um ponto de restauração D1, gera SQL validado, adiciona eventos de sincronização com a sequência real e carrega lotes. IDs/mutações são determinísticos: repetir a mesma carga no mesmo dia não duplica pedidos nem sobrescreve registros existentes. Não usar este prefixo para outro intervalo/dia; preparar outro lote explicitamente se a apresentação exigir atualização futura.

O resultado é conferido no D1 por total, 120 dias, limites diários, etapas, tempos e operadores. Dados entram pelo mecanismo de eventos, para o APK existente recebê-los na sincronização normal. O volume pode exigir alguns minutos para a primeira sincronização no tablet; o portal lê a base diretamente. Nenhum novo APK é necessário.

Validação automatizada: teste SQLite com todos os módulos, importação repetida sem duplicação, preservação de registros anteriores, totais de produção e finanças, fechamentos reconciliados, módulos inativos e rejeição de loja inválida. Dados de demonstração não constituem validação física de impressão/tablet.

## Dia adicional para apresentação

Modo manual `append-day` no mesmo workflow: acrescenta somente o dia local atual, com identificadores `demo-day-v1-AAAAMMDD-`, sem reutilizar o lote original de 120 dias. Os pedidos concluídos fictícios podem estar distribuídos até 22h30 e finalizar até 23h15, explicitamente para mostrar o dia inteiro na apresentação; a fila de três recebidos/três em preparo/três prontos usa horários atuais. A janela de Hoje contém o lote, enquanto relatórios de dias completos mantêm suas regras normais.

TMA de cada concluído entre 30 e 45 minutos; Kainan, Davi, Carla e Elizabeth preservados. Encerra somente filas fictícias de dias anteriores com backup em `demo_day_preparation_backup`, confirmação de revisão/conteúdo e evento de sincronização. Histórico, pedidos reais, outras lojas e módulos desligados preservados. Repetir a importação não duplica nem substitui alterações já feitas pelo usuário. Ponto de restauração antes da carga e artefato privado no workflow; não gera APK nem publica aplicativo.

Carga adicional aplicada em 21/10/2026: 73 pedidos (64 concluídos e nove na fila), duas encomendas, TMA médio 37,6min, mínimo 30 e máximo 45. Workflow 39589089383 aprovado, com ponto de restauração e cópias das nove preparações fictícias antigas finalizadas.

## Movimento da demonstração — 21/10/2026

Ajuste em homologação: sexta > sábado > domingo > quinta > quarta > terça > segunda, com segunda mais fraca. Pedidos fictícios somente entre 07h e 22h de Orlando; café da manhã 07h30–10h, almoço fraco e retomada no fim do dia. Sexta concentra movimento das 17h às 21h, sobretudo 18h–20h. Preservar o total de pedidos e as durações exatas de cada etapa do TMA, além de Kainan, Davi, Carla e Elizabeth. Aplicação por workflow manual `retime-demo-flow.yml`, com cópia prévia, eventos protegidos por revisão e conferência após a escrita; não requer publicação/APK.
