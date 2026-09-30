# Diagnóstico de erros e impressão

- Painel protegido: https://seabra-cardapio.wooxonly-comandas.workers.dev/admin
- Consulta dos últimos 500 eventos: `/admin/logs`, com o mesmo login do painel.
- Cada registro contém horário, identificador do tablet, etapa, código técnico e, quando aplicável, identificador do pedido. Não contém senha, token, cliente ou conteúdo do pedido.
- Eventos: falhas de login/carregamento, salvamento de pedidos, usuários, cardápio/configurações, sincronização, erros JavaScript globais e início/retorno/falha da impressão.
- Offline: fila local de até 200 eventos. Envio autenticado após reconexão e nova tentativa a cada minuto. Eventos confirmados são removidos da fila; reenvios usam o mesmo ID e não duplicam registros.
- Nuvem: retenção de 30 dias, com limpeza durante o recebimento de novos eventos.
- `print.dialog_opened` confirma apenas a abertura da janela do sistema. Android não informa pelo Expo se o usuário cancelou ou se houve saída física de papel.
- `PRINT_TIMEOUT`: o retorno da impressão excedeu 30 segundos. O pedido permanece salvo, a tela fica disponível e não há reenvio automático. Conferir a impressora antes de reimprimir pelo histórico.
- Erros fatais podem encerrar o processo antes da gravação assíncrona do log. Não há captura de falhas nativas do sistema operacional.

## Publicação

Aplicar `server/cloudflare/diagnostics-schema.sql` no D1 antes de publicar o Worker. Não colocar credenciais do painel no repositório.
