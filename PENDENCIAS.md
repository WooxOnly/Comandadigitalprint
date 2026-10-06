# Pendências e preferências

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

- Fazer apenas mudanças solicitadas, sem refatorações extras; executar verificações adequadas e não repeti-las sem razão concreta.
- Ao solicitar commit: commit/push, nuvem aplicável e início do build Expo. Confirmar aceitação e fornecer links sem aguardar o build. Sem solicitação, acumular alterações locais.
- Comunicar o andamento de forma curta e frequente.
