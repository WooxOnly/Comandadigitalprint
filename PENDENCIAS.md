# Pendências e preferências

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

- Validar o APK atualizado em dois tablets, incluindo rotação da tela, login e impressão física em 58/80 mm.
- Impressão direta Bluetooth/Wi-Fi/USB ainda depende da marca/modelo e protocolo da impressora. Informação solicitada ao proprietário. Atualmente é usada a janela do sistema; não afirmar envio físico apenas por abrir essa janela. Ao integrar o transporte direto, exibir “Impressão enviada” (PT/EN/ES) após confirmação do envio.
- Chave privada de recuperação fora do Git em .codex/private/seabra/recuperacao-offline.txt; instruções em ACESSO-E-IDIOMAS.md.

## Preferências permanentes

- Fazer apenas mudanças solicitadas, sem refatorações extras; executar verificações adequadas e não repeti-las sem razão concreta.
- Ao solicitar commit: commit/push, nuvem aplicável e início do build Expo. Confirmar aceitação e fornecer links sem aguardar o build. Sem solicitação, acumular alterações locais.
- Comunicar o andamento de forma curta e frequente.
