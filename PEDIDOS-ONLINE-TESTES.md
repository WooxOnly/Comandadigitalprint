# Pedidos online — primeira etapa de testes em homologação

Implementação iniciada em 22/10/2026 por solicitação do proprietário. Esta entrega cobre catálogo público, carrinho, envio e recebimento/aceite. Não conclui integração financeira, despacho à cozinha ou o fluxo amplo de encomendas.

## Acessos

- Cardápio da Seabra: https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/pedir/seabra-1
- Nosso administrador: menu do cliente → loja → **Pedidos online**. Habilitações pertencem ao cliente; quantidade/modelo de QR pertencem à loja selecionada.
- Portal da loja: https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/gestor → **Pedidos online** → escolher loja. A página de configuração também abre a caixa de entrada web para testar sem APK novo.
- App: nova aba **Online**, com pendências, detalhes e aceitar/recusar. O código está implementado; instalação no tablet exige um novo APK com autorização específica.

## Regras implementadas

- Administrador habilita módulo online, agendamento e mesa. Cliente não concede permissões a si próprio.
- Exatamente um canal por loja: chegada automática na caixa de entrada OU mensagem WhatsApp confirmada pelo consumidor, com lançamento manual pela loja.
- Configuração da loja: publicar/retirar cardápio, canal, WhatsApp com país/DDD, retirada/entrega, horário semanal, fuso e avisos visuais/som no app aberto.
- Primeira configuração de teste Seabra: módulo online e retirada publicados, canal automático, 07:00–22:00 America/New_York. Agendamento e mesa começam desabilitados; o administrador decide habilitá-los e informa a quantidade real de mesas. Nenhuma configuração anterior é sobrescrita pelo bootstrap.
- Mesa exige módulo + permissão de mesa + canal automático. QR específico por mesa ou genérico interno, gerado localmente e imprimível. Links antigos e páginas em cache não contornam configuração atual.
- Produtos/preços vêm do catálogo atual; indisponibilidade e subtotal são validados no servidor. Pizza inteira/dois sabores e observações disponíveis. Seleção estruturada de extras permanece para complementar.
- Para agora exige loja aberta; agendado autorizado pode ser solicitado fechado para atendimento futuro dentro do horário válido. Fuso da loja, dias reais e transições de horário de verão são verificados.
- Reenvios com a mesma identidade/dados não duplicam a solicitação. Aceite/recusa são concorrentes e auditados, com loja, operador e horário.
- A solicitação continua separada de `order:*`, preparo e vendas. Aceitar confirma a solicitação, sem criar automaticamente cozinha/pagamento/venda nesta etapa.
- Logo do tablet só se torna pública com ativação explícita pela loja. A rota privada de logos não foi liberada.
- Sem cancelamento automático por prazo nesta primeira etapa: duração, expiração e integração operacional ainda precisam de decisão. Nenhum prazo foi inventado.

## Limites desta etapa

- Sem pagamento online, gateway ou API de envio automático do WhatsApp.
- Som/aviso do app em primeiro plano, atualização de pedidos aproximadamente a cada 15 segundos enquanto ativo; sem promessa de push com app fechado/segundo plano.
- Caixa de entrada retorna até 100 solicitações por vez, pendentes primeiro. Paginação histórica ainda precisa ser acrescentada antes de operação em escala.
- Loja mantém histórico ao trocar de canal/desabilitar. Solicitações já recebidas continuam consultáveis e podem ser aceitas/recusadas; não há cancelamento silencioso.
- Autenticação do app, licença e perfis continuam exigidos. Cozinheiro não acessa dados de contato/pedidos online; Admin/Gerente/Caixa podem consultar e decidir.
- Nada muda no protocolo dos quatro módulos dos APKs existentes, TMA, histórico ou dados demonstrativos.

## Validação e publicação

- Migração aditiva: `server/cloudflare/migrations/20261022-online-orders.sql`.
- Workflow `deliver-homologacao.yml`, com `build_apk=false`, aplica migração e publica somente o Worker. `enable_online_demo=true` inicializa apenas a configuração de teste se ainda não existir.
- Testes de API: preço, loja, origem/CSRF, idempotência, permissões, canal, agendamento, QR e concorrência.
- Chromium: página pública e configurações/aceite, 390×844, 844×390, 768×1024, 1024×768 e 1440×900, PT/EN/ES e claro/escuro. Componentes nativos da tela/nav conferidos nos mesmos tamanhos/temas/idiomas.
- Navegador não comprova som, permissões, teclado ou notificação no Android físico. Esses itens aguardam APK autorizado e teste no tablet.
- Publicar somente homologação; produção e assinatura/cobrança fora do escopo.

## Publicação conferida — 22/10/2026

- Código publicado: `f99cc4b`; [execução 39781806854](https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39781806854), validação e portal concluídos. APK e release ignorados.
- CI: 386 testes passaram, zero falhas; lint e TypeScript aprovados.
- Navegador: 36 cenários do portal + 36 da tela nativa e 132 verificações de navegação existente. QR gerado foi decodificado e confirmou loja/mesa.
- Link público HTTP 200. Conferência no servidor publicado: 49 produtos, inclusão no carrinho, sem transbordamento horizontal em 390×844 e sem erros JavaScript. Nenhum pedido real/de teste foi enviado nessa conferência remota.
- Bootstrap de homologação concluído; nenhum pedido, preparo, venda, dado histórico ou APK criado pelo bootstrap.
