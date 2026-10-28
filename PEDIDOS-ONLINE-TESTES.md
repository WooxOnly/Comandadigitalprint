# Pedidos online — primeira etapa de testes em homologação

Implementação iniciada em 22/10/2026 por solicitação do proprietário. Esta entrega cobre catálogo público, carrinho, envio e recebimento/aceite. Não conclui integração financeira, despacho à cozinha ou o fluxo amplo de encomendas.

## Acessos

- Cardápio da Seabra: https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/pedir/seabra-1
- Nosso administrador: menu do cliente → loja → **Pedidos online**. Habilitações pertencem ao cliente; quantidade/modelo de QR pertencem à loja selecionada.
- Portal da loja: https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/gestor → **Pedidos online** → escolher loja. O portal configura o cardápio e as fotos; não recebe nem aceita pedidos.
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
- Loja mantém histórico no banco ao trocar de canal/desabilitar. A aba e as decisões ficam bloqueadas quando o módulo/canal automático está desligado; não há cancelamento silencioso.
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

## Ajustes posteriores — 22/10/2026

- Proprietário determinou recebimento somente no tablet, nunca no portal do cliente. Rotas/tela de recebimento/aceite do portal removidas; portal apenas configura módulo/canal/horários/fotos. WhatsApp manual continua como canal alternativo exclusivo.
- Nenhuma versão/APK/OTA do tablet deve ser gerada nesta rodada. A aba existe no código, condicionada ao módulo habilitado; a versão instalada não é atualizada por publicação do portal.
- Carrinho antes dos produtos no celular e à direita no desktop; itens em linhas compactas, grupos em botões e busca recolhida na lupa. Finalização em diálogo a partir do pedido atual.
- Nome, telefone válido e preferência dinheiro/crédito/débito obrigatórios, com validação no servidor e inclusão na mensagem WhatsApp/pedido do tablet. Não registra recebimento de dinheiro.
- Fotos configuradas no portal: envio local, redimensionamento para até 640px/120KB, armazenamento separado do catálogo legado, JPEG/PNG e acesso público somente no cardápio publicado.
- Limpeza autorizada: dez IDs identificados “Novo produto”, preço zero, apenas em seabra-1 homologação; backup do menu e evento condicionado à revisão/dados antes da remoção. Pedidos históricos preservados.

### Estado anterior: alterações locais, publicação suspensa

O proprietário suspendeu a publicação/compilação desta segunda rodada. Mudanças de layout, fotos, validação/pagamento, retirada do recebimento web e limpeza dos produtos estão preparadas localmente, sem push/deploy/APK/OTA. Nada desta rodada deve ser apresentado como já disponível no link online. Layout alinhado ao OrderWorkspace do app: 66/34 em paisagem, pedido atual fixo acima em retrato, catálogo com rolagem independente e sem botão flutuante sobre produtos. A solicitação posterior de QR do APK existente e dados demonstrativos de hoje é separada e não libera estas mudanças.


### Identidade do cardápio — ajuste local solicitado em 22/10/2026

Nome da loja e sua logo publicada no topo, ao lado dos controles de idioma/aparência. Marca/logo BistroHub pequenas no rodapé com “Desenvolvido por BistroHub”, traduzido para EN/ES. Sem alteração dos demais portais nem liberação automática de logos privadas. Sem publicação, push, APK ou OTA.


## Retomada da publicação — 27/10/2026

O proprietário autorizou subir as mudanças pendentes em homologação. A suspensão anterior do lote online fica superada por esta solicitação. Revisão local concluída: 14 testes de API e 37 cenários de navegador, cobrindo envio, fotos e cinco tamanhos/orientações; lint e TypeScript passaram. A publicação usa `build_apk=false`, sem reinicializar a configuração da loja. A limpeza específica dos dez produtos tem inspeção prévia, backup e proteção de revisão/dados, com testes de idempotência e preservação de outras lojas/pedidos. Não declarar instalação de novo APK nem correções adicionais da web ainda não descritas pelo proprietário. A confirmação da publicação e da limpeza será registrada após as execuções.

### Alinhamento da sincronização na web

O proprietário apontou “Dados sincronizados” e a última atualização fora do alinhamento de Início/Ajustes. Container específico da web passa a usar a largura máxima e os recuos do conteúdo; cozinha mantém a largura da própria grade. O componente nativo conserva exatamente o espaçamento anterior. A publicação desta rodada também inclui o app web, com `publish_web=true` e `build_apk=false`.

### Ícones em tablets grandes

Confirmado pelo proprietário: aumentar tanto os atalhos de Início quanto os ícones da barra inferior na web. Depois aprovou o modo retrato existente: tamanhos de ícones/badges em retrato permanecem iguais; ampliação aplicada somente em paisagem. Com janela disponível a partir de 1000×700px (incluindo iPad em paisagem com as barras do Safari), atalhos usam 32px e navegação 28px, com tamanhos intermediários para tablets menores e sem aumento nos celulares. Os cartões continuam com alturas iguais. Renderização nativa e dimensões dos APKs preservadas; não compilar APK/OTA nesta entrega, conforme nova confirmação explícita do proprietário.

## Publicação e limpeza conferidas — 27/10 local / 28/10 UTC

- Entrega `928fe09`, workflow [40606432790](https://github.com/WooxOnly/Comandadigitalprint/actions/runs/40606432790): validação, portais e aplicativo web concluídos; APK/release ignorados.
- Limpeza [40606744338](https://github.com/WooxOnly/Comandadigitalprint/actions/runs/40606744338): dez produtos acidentais removidos, 39 produtos preservados, backup em `menu_cleanup_backup`, nenhum pedido alterado.
- Logo sincronizada já existia, mas a exibição pública estava desabilitada. A solicitação anterior do proprietário permite habilitar apenas essa identidade pública, com backup e guarda da configuração/logo, preservando canal, horários e demais preferências. Confirmação de execução pendente neste registro.


### Confirmação final da entrega

- Web e portais publicados pelo workflow 40606432790, com validação concluída e jobs de APK/release ignorados.
- Limpeza 40606744338 confirmou dez removidos, 39 produtos preservados e nenhum pedido alterado.
- Workflow 40607017461 habilitou a logo salva do Seabra, com backup/guarda de revisão e sem alterar canal, horários ou outros dados.
- Conferência pública concluída em 390, 1032, 1376 e 1920px: cardápio com 39 produtos reais, logo carregada, sem transbordamento horizontal ou erro JavaScript; bundle do app contém as correções de sincronização e ícones. Nenhum pedido foi enviado na conferência remota.
- Retrato preservado conforme aprovação do proprietário; ícones maiores em paisagem, adaptados à janela. Ajustes e Início usam o mesmo alinhamento de sincronização. Nenhum APK/OTA gerado.

## Cardápio configurável e senhas — 2026-10-28

- Subgrupos reutilizam `subcategory` do catálogo; abrem pelo grupo com chevron em diálogo, no padrão da tela de pedidos do aplicativo, sem segunda faixa fixa nem grupos fictícios. Ao fechar os detalhes de um produto, preserva a rolagem anterior do catálogo.
- Fotos existentes aparecem como miniaturas com ampliação em diálogo por toque/teclado. Cadastro de fotos e descrição por produto em `/gestor/online?storeId=seabra-1&view=photos`. Fotos reais devem ser cadastradas pelo gestor; produtos sem foto continuam legíveis.
- Gestor configura separadamente a exibição de fotos, descrições e subgrupos. Preferências antigas continuam compatíveis e o botão Desfazer preserva o estado salvo.
- Descrições online são isoladas em `online_product_details`, com autorização por loja/licença/módulo, até 2.000 caracteres, texto simples e fallback para a descrição do catálogo. Não alteram o catálogo do tablet. Migração aditiva/idempotente incluída.
- Gerenciar senhas: cada senha revelada tem seu próprio botão Copiar senha; cópia somente do valor, com retorno localizado, fallback de área de transferência e falha explícita. Os botões desaparecem junto com a revelação existente após um minuto/troca de aba/saída.
- Verificação local: 16 testes de API online; 39 cenários de navegador em PT/EN/ES e cinco resoluções/orientações, incluindo filtros, foto ampliada, descrição sem HTML e preferências; teste de cópia com valores sintéticos distintos, sucesso, recusa e fallback. Lint e TypeScript aprovados. Publicação somente em homologação web/portais; APK/OTA continuam sem autorização.

- Revisão da prévia: cartões usam altura pelo conteúdo para não cortar nomes/descrições longos. Teste de navegador verifica que todo o bloco de informação cabe em cada cartão. Previews representativas adicionais usam o catálogo real do repositório, Pizzas → Promocionais/Regulares/Especiais, sem alterar dados remotos.
- Esclarecimento final do proprietário: Lanches NÃO tem subgrupos; a prévia sintética anterior gerou essa confusão. Somente Pizzas tem Promocionais/Regulares/Especiais no cadastro atual. Não inventar subgrupos nem reclassificar produtos.

## Acesso direto às fotos/descrições — 2026-10-28

- Corrigido GET anônimo das páginas `/gestor/online` e `/gestor/online/lojas`: redireciona ao login do gestor, em vez de retornar JSON Unauthorized. Preserva destino interno validado e volta à página após login; conta administrativa e conta do gestor continuam independentes.
- Retorno aceita somente páginas online conhecidas, loja e visualização permitidas. APIs continuam retornando HTTP 401 sem sessão e continuam verificando a autorização da loja após login. Sem redirecionamentos externos, API como destino ou liberação de sessão por link.
- Sessão expirada ao salvar foto/descrição/configuração encaminha novamente ao login com o mesmo destino. Preserva tradução PT/EN/ES e os fluxos existentes de CSRF, senha inválida e recuperação. Sem alteração no APK.
