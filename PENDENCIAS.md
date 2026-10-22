## Resumos de consumo duas vezes ao dia e novo dia demonstrativo — 21/10/2026

- Aplicado e validado no workflow 39589089383: 73 pedidos em 21/10, 64 concluídos, três recebidos/três em preparo/três prontos, duas encomendas, TMA 37,6min (30–45), quatro operadores e 73 pedidos sincronizáveis. Nove preparações fictícias antigas finalizadas com backup. Validação geral 39589059007 concluída com sucesso.

- Resumo curto com as cinco porcentagens sempre, às 9h e 18h de Orlando. Coletor reduzido para duas execuções diárias antes dos resumos; dados ausentes/desconhecidos ou com mais de 24h continuam sinalizados. Plano e cobrança preservados.
- Preparado modo append-day para acrescentar o dia local completo na loja seabra-1 de homologação, com prefixo próprio e importação idempotente: 30–100 pedidos, TMA 30–45min e Kainan/Davi/Carla/Elizabeth. Horários fictícios até a noite autorizados para apresentação; nove exemplos atuais na fila.
- Somente filas sintéticas antigas podem ser finalizadas, com backup e guarda de revisão. Nenhuma alteração de módulos, contas, outras lojas ou pedidos reais. Verificação de dados e relatórios reais em SQLite, repetição sem duplicações e preservação do histórico. Sem novo APK ou publicação do app.

## Cartões de ranking mais compactos e legenda da quantidade — 20/10/2026

- Nomes das listas reduzidos de 12px para 11px, entrelinhas e preenchimento menores para reduzir quebras e altura, com nomes completos e área de toque mínima de 44px preservados.
- Legenda acima das listas: valores à direita representam a quantidade vendida. Texto, tooltip da quantidade e nome acessível do botão traduzidos PT/EN/ES. Quantidades continuam em 12px e percentuais somente na pizza.
- Aplicado a produtos e grupos; ordinais, limites Top 10/Top 5, valores e cálculos preservados. Entrega web em homologação, sem APK.

## Quantidades compactas e posições ordinais — 20/10/2026

- Listas de produtos e grupos: quantidades reduzidas de 14px para 12px, preservando contraste/alinhamento. Posições com ordinal no idioma selecionado: português 1º, 2º, 3º; inglês 1st, 2nd, 3rd, 4th…10th; espanhol 1.º, 2.º, 3.º.
- Coluna da posição ajustada para acomodar os sufixos sem invadir o marcador ou o nome. Nomes acessíveis também usam ordinal. Quantidades, classificação, limites Top 10/Top 5 e percentuais da pizza preservados.
- Entrega web em homologação, sem APK.

## Logo BistroHub em todos os portais — 20/10/2026

- Logo oficial existente adicionada à barra compartilhada, ao lado de BistroHub e do slogan localizado. Abrange administrativo, portal do cliente, telas internas, login, convite e recuperação/redefinição de senha.
- SVG local incorporado, sem rede ou dependência nova; dimensões compactas e cores originais. Mantidos idioma/aparência no canto direito, marca do cliente separada e leitura acessível sem anunciar duas vezes BistroHub.
- Verificações de ausência de sobreposição em celular/tablet/PC, retrato/paisagem, claro/escuro e PT/EN/ES. Entrega web em homologação, sem APK.

## Grupos limitados aos cinco mais pedidos — 20/10/2026

- Nova decisão do proprietário: grupos mostram no máximo cinco entradas, mesmo com mais grupos no período. Lista de uma coluna, pizza e detalhes usam os mesmos cinco mais pedidos. Percentuais sobre os cinco exibidos; nota mostra cinco de N, sem fatia Outros ou posições fictícias.
- Produtos mantêm Top 10 em duas colunas. Totais gerais, permissões, períodos, quantidades e demais relatórios preservados. Verificação com doze grupos reais reduzidos aos cinco primeiros, inclusive a base dos percentuais. Entrega web em homologação, sem APK.

## Pizzas vivas com todos os percentuais — 20/10/2026

- Substituída a paleta opaca de produtos/grupos por dez cores mais vivas, iguais aos marcadores da lista. Outros gráficos mantêm suas cores.
- Seleção da fatia com brilho/saturação e contorno branco fino de 1,5px sem ampliar com o SVG. Evita tanto o destaque quase invisível quanto o antigo contorno grosso.
- Removida a regra que ocultava percentuais menores de 6%. Todas as fatias mostram o percentual inteiro: valores pequenos mais próximos da borda interna; fatias extremamente pequenas com chamadas externas espaçadas, sem ocultação nem sobreposição. Removido o aviso central que mostrava somente a fatia selecionada.
- Mantidos os cartões fechados da lista com somente quantidades, arredondamento/aviso, proporções reais e acessibilidade. Verificação inclui 10 rótulos simultâneos e cenário com nove fatias minúsculas. Entrega web em homologação, sem APK.

## Legendas em cartões fechados — 20/10/2026

- Nova orientação: cada item/grupo tem borda completa arredondada, espaçamento entre cartões e destaque suave de borda/fundo ao passar o mouse, tocar ou selecionar pelo teclado. Substitui a linha lateral e o círculo extra da seleção anterior.
- Lista e texto de seleção mostram nome e quantidade, sem percentual. Quantidades com alinhamento consistente e maior destaque. Percentuais arredondados continuam somente na pizza, com o aviso abaixo; valores reais e proporções preservados.
- Mantidos cinco itens por coluna no Top 10, versão de uma coluna para até cinco grupos/itens, nomes completos e adaptação celular/tablet/PC em ambas as orientações. Entrega web em homologação, sem APK.

## Refinamento da seleção e percentuais das pizzas — 20/10/2026

- Produtos e grupos: seleção da fatia por brilho sutil, sem contorno branco grosso. Foco de teclado continua perceptível com traço fino. Na legenda, removido o bloco claro e mantidos apenas uma linha discreta e o marcador da cor selecionada.
- Números menores e centralizados no centro geométrico de cada setor, com contorno de texto mais fino. Fontes definidas no CSS autorizado, respeitando a política de segurança do portal.
- Percentuais inteiros arredondados, consistentes entre pizza, legenda, seleção e nomes acessíveis. A proporção real das fatias, as quantidades e o denominador Top 10 não mudam. Aviso PT/EN/ES abaixo: percentuais arredondados; soma pode diferir de 100%.
- Mantidos Top 10 em cinco mais cinco, nomes completos, seleção por toque/teclado, aviso de fatias pequenas e estados vazios. Entrega web em homologação, sem APK.

## Horários sem rolagem horizontal — 20/10/2026

- Nova orientação do proprietário substitui a rolagem interna anterior: mostrar os 24 horários simultaneamente na largura do cartão. Removidas a largura mínima forçada e a instrução de rolar.
- Espaçamento calculado pela largura real, rótulos numéricos compactos com AM/PM agrupados em cartões estreitos, nomes completos acessíveis e todos os valores preservados. Mantidos sequência aprovada, escala 0/10/50/100/500/1.000, linha, totais e janela independente.
- Redimensionamento/rotação redesenha somente o gráfico com os dados já carregados, sem nova consulta. Conferência de todas as horas dentro do cartão e números sem sobreposição, PT/EN/ES, claro/escuro, celular/tablet/PC e retrato/paisagem. Entrega web em homologação, sem APK.

## Identidade da empresa no portal — 20/10/2026

- Nome da empresa separado do usuário, ao lado da logo já sincronizada pelo tablet. Usuário junto de Sair à direita, com quebra em telas pequenas, sem sobrepor a empresa. Mantida a marca BistroHub na barra geral.
- Logo servida somente com sessão válida e autorização atual da loja, sem alterar a imagem salva. Visão de várias lojas usa a logo comum; logos diferentes aparecem somente ao selecionar a loja correspondente. Imagem ausente/inválida não deixa ícone quebrado.
- Testes de autorização, formatos, ausência, divergência entre lojas e nomes próprios PT/EN/ES aprovados. Layout verificado em navegador, claro/escuro, celulares/tablets/PC e ambas as orientações. Entrega web em homologação, sem APK.

## Top 10 aprovado em duas colunas — 20/10/2026

- Modelo visual aprovado: balão único, legenda em duas colunas com divisória central, posições 1–5 à esquerda e 6–10 à direita; pizza grande e centralizada abaixo. Aplicado a produtos e grupos, com os nomes completos, quantidade e percentual.
- Disposição dos valores acompanha a largura do próprio cartão: abaixo do nome em espaços estreitos, à direita quando há espaço. Mantidas seleção por toque/teclado, cores, percentuais sobre Top 10 e detalhes; sem alterar cálculos/dados.
- Se houver até cinco entradas, mostrar uma coluna sem criar posições ou produtos fictícios. Estados vazios preservados. Celulares, tablets e PC, retrato/paisagem, PT/EN/ES e claro/escuro.

## Pedidos por mês: ano completo independente — 20/10/2026

- Decisão do proprietário: gráfico de pedidos por mês ignora o período geral e mostra janeiro a dezembro do ano atual no fuso local, inclusive meses zerados e futuros. Ano/base independente informados no cartão; totais da loja e suas permissões preservados.
- Mês atual inclui pedidos já emitidos até agora. Gráfico e detalhes compartilham doze totais anuais; filtros globais continuam valendo nos relatórios que dependem deles. Reutilizada a consulta indexada de fluxo para evitar uma leitura separada do histórico.

## Pedidos por horário: total acumulado e padrão de sete dias — 20/10/2026

- Decisão mais recente substitui a média horária: somar os pedidos de cada horário, sem dividir pelos dias. Padrão de sete dias completos, janela configurável entre 1 e 366 dias. Título Pedidos por horário e detalhes com hora/total.
- Legenda mostra a janela efetivamente aplicada e suas datas; sete por padrão, dez ao selecionar dez, inclusive quando o período global é diferente. Valores, legenda e detalhes usam a mesma resposta. Preferência antiga de média migra para nova chave para não restaurar 30 dias em navegadores antigos.
- Preservadas marcas 0/10/50/100/500/1.000, ordem americana dos 24 horários e rolagem interna. Média por dia da semana e TMA mantêm os cálculos já aprovados.

## Correção da escala horária — 20/10/2026

- Proprietário reafirmou as marcas 0, 10, 50, 100, 500 e 1.000 no gráfico horário; restaurada escala por faixas com aviso localizado. Mantidas médias de 30 dias, arredondamento com exceção do meio exato e os 24 horários na ordem americana aprovada.
- Indicação explícita de rolagem horizontal para evitar confundir os horários de madrugada visíveis inicialmente com o dia inteiro. Consulta remota apenas de leitura preparada para conferir totais reais por horário, sem nomes de clientes ou itens.

## Nomes da cozinha na apresentação — 20/10/2026

- Nomes aprovados e fixos: Kainan (com K), Davi, Carla e Elizabeth. Identificadores fictícios canônicos compatíveis com o app, nomes próprios exatos no gráfico e nos detalhes do portal. Outros operadores mantêm seus nomes originais.
- Renomeação restrita aos quatro identificadores demo.cozinha.1–4 na loja seabra-1 de homologação, com cópia original e eventos sincronizáveis. Não altera pedidos, tempos, etapas ou contas/permissões. Gerador e reparo demonstrativo passam a conservar esses nomes.

## Médias e acompanhamento de consumo — atualização de 20/10/2026

- Ajuste aplicado na base: 7.658 amostras, média 37,6 min, mínimo 30 e máximo 45. Workflow 39455426262 concluído com backup. Primeira publicação web 39455430486 validada; saúde HTTP 200. Revisão final também corrige o acesso direto ao favorito /gestor/login com redirecionamento para /gestor.

- Requisitos anteriores de totais por hora e eixo por faixas substituídos pela decisão mais recente: médias por hora (30 dias completos) e por dia da semana (120 dias completos), janelas individuais configuráveis de 7 a 366 dias. Independentes do período geral, incluem dias sem pedidos e excluem hoje. Dia da semana divide pelas ocorrências correspondentes. TMA continua ponderado pelo período geral.
- Todos os gráficos de barras usam valores em cada barra, barras mais finas e linha conectando os pontos dentro do gráfico, com escala linear automática. Horários mantêm a sequência americana expressamente solicitada e rolagem contida. Pizzas Top 10 preservadas.
- Ajuste autorizado apenas na base demonstrativa seabra-1 de homologação: tempos reais fictícios registrados de 30–45 minutos; cópia original em demo_tma_backup e eventos sincronizáveis. Pedidos em fila e outras lojas preservados.
- Monitoramento Cloudflare a cada três horas: snapshot privado na branch consumption-status e avisos aqui no ChatGPT em 30/80/90/95/100%, ou dados desconhecidos/desatualizados. Estimativa conservadora dos últimos 31 dias, pois a credencial de métricas não tem acesso à assinatura/ciclo. Plano Workers Paid mínimo US$5/mês não limita cobrança adicional. Sem alterar plano ou compilar APK.

## Login e recuperação do gestor — 20/10/2026

- Causa real do 503 identificada: Cloudflare D1 7500, cota diária de leituras excedida no plano gratuito. Limite externo renova à meia-noite UTC; cobrança não alterada. Mensagens específicas PT/EN/ES para os dois logins e recuperação por e-mail do gestor implementadas/testadas. Índice por data reduz leituras dos relatórios. Detalhes em RECUPERACAO-GESTOR.md. Publicação somente web; nenhum novo APK.

## Dados para apresentação — 20/10/2026

- Proprietário autorizou carregar 120 dias na loja atual de homologação. Gerador e workflow aditivos preparados: 7.659 pedidos, 240 encomendas, TMA variável e quatro operadores fictícios. Preservar registros existentes e módulos desativados. Roteiro em DEMONSTRACAO-HOMOLOGACAO.md; sem novo APK.

## Ajuste de ordem dos horários — 20/10/2026

- Ordem solicitada pelo proprietário: 1 AM até 12 AM, depois 1 PM até 12 PM, no gráfico de pedidos por hora e sua tabela. Mover os dados junto aos horários; manter os totais, datas e agrupamento local. Esta preferência substitui a sequência cronológica anterior. Entrega somente web, sem novo APK.

# Pendências e preferências

## Eixos explícitos e pizzas Top 10 — 20/10/2026

- Proprietário esclareceu que as marcas verticais são fixas: 0, 10, 50, 100, 500, 1.000. Implementada escala por faixas com aviso explícito de intervalos diferentes, preservando valores reais e ordem das quantidades; estende o padrão somente para volumes acima de 1.000.
- Todas as 24 horas em padrão americano, de 12 AM até 11 PM, com rótulos em duas linhas e rolagem interna quando o cartão é estreito. Quantidades continuam somadas entre todos os dias; pico e detalhes usam as mesmas horas AM/PM.
- Produtos e categorias mostram somente os 10 primeiros nas pizzas, legendas e detalhes, sem Outros. Percentuais calculados entre os dez exibidos e essa base indicada no cartão; demais totais do relatório continuam integrais. SVGs maiores e responsivos, percentuais internos, seleção por ponteiro/toque/teclado. Para fatias pequenas, o percentual selecionado aparece dentro do gráfico sem sobrepor rótulos.
- Inclui a correção d59468f de carregar sem trocar Hoje/presets por Personalizado. Proprietário: “Depois que fizer tudo pode publicar”. Somente portais em homologação, sem outro APK.
- Validados 24 testes Node (escala/idiomas/agrupamento) e 18 cenários do portal PT/EN/ES claro/escuro em três larguras: marcas fixas, todas as horas, faixas acima de 1.000, 12 produtos/grupos reais reduzidos aos 10 primeiros, percentuais e interação por teclado/toque. Lint, TypeScript, diff-check e destinos aprovados.

## Atualizar relatório preserva o período — 20/10/2026

- Reproduzido: botão de carregar chamava a rotina de edição de data, marcando o período como Personalizado mesmo sem alterar nenhuma data.
- Separada validação do formulário da marcação de edição manual. Atualizar mantém Hoje/7 dias/30 dias/mês/mês anterior/ano, inclusive no financeiro; digitar datas e usar o calendário continuam selecionando Personalizado. Datas inválidas e rascunhos mantêm a proteção existente.
- Correção somente dos portais da entrega autorizada; nenhum APK adicional.
- Conferidos 18 cenários de portal (PT/EN/ES, claro/escuro e três larguras), preservação de todos os períodos e de Personalizado, produção/financeiro, edição manual e calendário. 11 testes de idioma, lint, TypeScript e diff-check aprovados.

## Entrega completa autorizada — 20/10/2026

- Proprietário: “Quando terminar TUDO pode subir a atualizacao”. Autorizados portais de homologação e um APK deste conjunto, sem acompanhar a compilação. Produção fora do escopo.
- Atendimento: opção 1 aprovada (mesa com duas cadeiras e sacola com alça), sem legenda visível, mesmos botões e estados selecionados. PNGs transparentes locais com tintas claro/escuro; SVGs de origem preservados.
- Filtros: opção 2 aprovada em todos os controles: três linhas e círculos. Geometria compartilhada nos portais e máscara local no app. Histórico, Preparo, Encomendas e relatórios de Caixa; ícones à direita e controles preservam os rascunhos ao recolher/abrir.
- Retrato do pedido: ícones e cliente juntos na primeira linha; mesas, outra mesa e Avançar na segunda em tablets. Paisagem segue em uma linha; celulares estreitos/fontes grandes mantêm quebra acessível. Proporção 66/34 e cartões do preparo preservados.
- Inclui também totais por hora com escala automática, Últimos 30 dias e remoção do Voltar no desbloqueio dos Ajustes. Não há sugestões de ícones ainda aguardando escolha neste conjunto.
- Validação: 351 testes Node aprovados; 48 cenários de identificação, 6 fluxos da regra de mesa, 48 cenários de filtros, 39 do Preparo, 24 do filtro de Histórico, 30 de controles escuros e 18 do portal. Claro/escuro, PT/EN/ES, retrato/paisagem e celulares. Lint, TypeScript, diff-check e destinos aprovados. Android físico e impressão seguem verificação separada.

## Pedidos por hora: totais e escala automática — 20/10/2026

- Esclarecimento do proprietário substitui o comportamento anterior de média: somar os pedidos de cada horário de emissão em todos os dias selecionados. Sem divisão por dias/horas. O horário de pico já usa essa contagem e fica coerente com as barras.
- Gráfico e detalhes exibem apenas quantidades inteiras; removidas colunas de média e horas cobertas do diálogo. Descrição explícita em PT/EN/ES.
- Eixo de quantidade linear com marcas inteiras e limite automático 10/50/100/500/1.000 e equivalentes maiores. Horários permanecem na horizontal. Rótulo do pico e margem adequada para números grandes; barras reais de zero permanecem vazias. TMA e cálculos financeiros preservados.
- Validação: 23 testes Node de escala/idiomas/agrupamento, 18 cenários do portal PT/EN/ES claro/escuro, retrato/paisagem/celular; confirmada soma de 9 pedidos em dois dias e escala para 1.000. Lint, TypeScript e diff-check aprovados. Alteração local, sem publicação ou APK.

## Ajustes protegidos sem botão Voltar — 20/10/2026

- Removido o botão que levava ao Início, somente no formulário de desbloqueio dos Ajustes. Mantido Desbloquear como única ação principal, com margens internas e espaçamentos reajustados e cartão centralizado. Autenticação e bloqueio ao sair continuam iguais.
- Conferidos 18 cenários em navegador com componentes reais: PT/EN/ES, claro/escuro, retrato/paisagem do tablet e celular. Campo e botão alinhados, senha preservada na rotação e sem rolagem horizontal. Lint, TypeScript e diff-check aprovados. Alteração local para próxima entrega; nenhum APK solicitado.

## Últimos 30 dias no portal — 20/10/2026

- Incluído no filtro global de produção e financeiro, depois de Últimos 7 dias. Inclui hoje e os 29 dias anteriores no calendário do fuso do relatório, sem confundir com mês atual/anterior. PT/EN/ES.
- Validação local: 18 cenários do portal (três idiomas, claro/escuro, retrato/paisagem e celular), 11 testes de idioma, lint, TypeScript e diff-check aprovados. Pronto no código; ainda sem publicação desta alteração.

## Correção complementar do login dos dois portais — 20/10/2026

- Proprietário reportou novamente a expiração em /gestor/login e /admin/login. Conferido que a publicação anterior dos portais foi concluída e contém a primeira correção.
- Reproduzida uma corrida não coberta: cookie do desafio rotacionado por outra aba DEPOIS da renovação e ANTES do POST; o comportamento anterior navegava para a tela de expiração.
- Envio agora permanece no formulário via fetch. Somente o 403 explicitamente marcado pelo servidor como CSRF permite renovar e repetir uma vez, sem novo clique; senha incorreta, bloqueio e erro de conexão não geram repetição automática. Após sucesso, navega por GET para /admin ou /gestor.
- Respostas antigas de /login são normalizadas para a entrada GET e não mantêm o aviso de desafio expirado na tela. Credenciais ficam apenas no formulário/requisição; sem armazenamento, logs ou HTML refletindo senha. Sessão, CSRF e limites continuam validados no servidor.
- Navegador: 12 fluxos (dois portais × três idiomas × duas orientações), incluindo corrida entre abas, cookies vencidos, falha de conexão, retorno de POST antigo/recarregamento, senha incorreta sem repetição e cooldown aprovados. Lint, TypeScript e diff-check aprovados.
- Correção somente dos portais da entrega autorizada; não iniciar outro APK.

## Demandas retomadas em 19/10/2026 — implementação local

- Proprietário autorizou implementar e, depois, “Ok, sobe tudo”, esclarecendo “Portais e apk”. Autorizada publicação deste conjunto em homologação e uma compilação do APK correspondente, sem monitorar a compilação.
- Modo escuro: corrigidos traços dos ícones (atendimento, lupa, funil e setas), contraste das ações e seleção. Fundo laranja atrás do Iniciar pedido removido no escuro; fundo branco do Histórico corrigido; espaçamento abaixo de Finalizar pedido.
- Histórico: status junto ao cliente; detalhes com + e reimpressão com impressora. Impressora também nos cartões e detalhes do preparo, preservando permissões.
- Preparo: status traduzido e minutos em formato compacto, por exemplo Em preparo - 13m. O proprietário reafirmou que NÃO deve mudar o tamanho do balão: dimensões, capacidade e grade mantidas.
- Portal: gráficos L separados de pedidos por dia da semana e por mês; no Caixa, relatório próprio de ticket médio ponderado e gráficos separados de vendas líquidas em USD por dia e por mês. Filtros, escopos, módulos e datas reais de devolução preservados.
- Verificação final: 350 testes Node (`tests/*.test.cjs` e `tests/*.test.mjs`), lint, TypeScript e diff-check aprovados. Portal: 18 combinações de idioma/tema com três larguras cada, incluindo ticket ponderado, gráficos separados e devolução negativa; login: 12 fluxos previamente aprovados.
- Navegador: 450 combinações de aparência/idioma/tela, 39 verificações do KDS, 18 do histórico e 30 específicas dos controles escuros aprovadas. Componentes reais com dados/dispositivos sintéticos; Android físico e impressora continuam fora desta validação.

## TMA em destaque, controles à direita e login após inatividade — implementação local

- TMA em cartão grande na primeira linha dos relatórios, ao lado de Pedidos por hora. Uma média ponderada do período, com intervalo e amostra visíveis; filtro preservado: emissão→finalização, emissão→pronto e início→pronto. O filtro inicial/emissão→finalização inclui a espera antes do preparo.
- + e funil juntos no alto à DIREITA, nessa ordem, conforme esclarecimento explícito do proprietário. Símbolos desenhados menores e centralizados, cápsulas visuais compactas com área de toque de 44px; padrão também no relatório financeiro.
- Gráfico por hora mantém volume pela emissão (quantidade no dia, média por hora coberta em períodos maiores), sem mudar a escala aprovada ou os cálculos. Zeros não criam barras; valores positivos pequenos recebem pontos no valor real e rótulos quando há poucas horas com atividade, para não parecerem inexistentes.
- Ambos os logins renovam somente o desafio CSRF antes do POST normal, no mesmo clique. Não prolonga sessão autenticada, não relaxa validação e não grava senha fora do formulário. Falha de conexão conserva os dados e permite tentar novamente.
- Traço de preenchimento removido de Outra mesa no app, nas duas orientações do tablet.
- Publicação deste conjunto e APK autorizados posteriormente por “Ok, sobe tudo” / “Portais e apk”. APK 2e0bceb corresponde à entrega anterior.

## Entrega autorizada deste conjunto — 19/10/2026

- Proprietário: “Ok, pode postar tudo”. Autorização para publicar este conjunto em homologação e solicitar o APK correspondente, sem estender a autorização a compilações futuras.
- Inclui busca animada na linha das categorias, identificação em uma linha nos dois modos do tablet, ícones sem legenda, limites dos campos, mesa obrigatória/opcional configurável e comanda sem mesa vazia. Alterações anteriores de Histórico e remoção do contador já estão no histórico da branch e seguem incluídas.
- Validação final da entrega: 350 testes Node aprovados, além dos cenários de interface já registrados; lint, TypeScript, conferência de destinos e diff-check aprovados.
- A compilação APK será solicitada sem acompanhar seu andamento; portais/servidor recebem a validação compatível da nova regra de pedidos. Produção permanece fora do escopo.

## Faixa única também em retrato — aprovada e implementada localmente

- Aplicada a prévia aprovada em retrato: ícones, cliente, mesas 1–10, outra mesa e Avançar compartilham uma linha no tablet. Em retrato, os rótulos de mesa ficam acima dos campos para caber; paisagem mantém a disposição aprovada. Sem legenda dos ícones.
- Conferência dos componentes reais em navegador: 48 combinações de PT/EN/ES, claro/escuro e oito tamanhos, incluindo retratos 768×1024 e 800×1280 e paisagens 960×600 e 1280×800; sem sobreposição ou rolagem horizontal. Seis fluxos de validação/configuração com rotação preservam tipo, cliente e mesa. Lint, TypeScript e diff-check passaram. Android físico continua separado.
- Sem publicação ou compilação APK.

## Regra permanente: duas orientações — esclarecimento do proprietário

- Toda alteração visual deve ser pensada, implementada e revisada em paisagem E retrato. Se a proposta não funcionar bem em uma delas, informar a limitação concreta e discutir alternativas antes de implementar essa parte. Apenas não haver sobreposição não significa que a demanda foi atendida no outro modo.
- Atualização: o proprietário aprovou a prévia em retrato e autorizou prosseguir. A faixa única agora está implementada e revisada nos dois modos do tablet, conforme registro acima.

## Dados do pedido em uma linha e regra de mesa — 19/10/2026 — implementado localmente

- Prévia aprovada e implementação autorizada por “Ok, pode seguir”. Faixa única nos tablets onde cabe, com ícones próprios (mesa / sacola no balcão), sem legenda. Continuam sendo Para comer aqui / Para levar, inclusive na comanda. Cliente até 20 caracteres; outra mesa só números, até 3 dígitos. Layout estreito/fontes grandes preservam adaptação sem sobreposição.
- Novo pedido inicia sem mesa automática. Comer aqui exige escolha de mesa; levar permite vazio, exceto com a opção por loja **Ajustes → Pedidos → Exigir mesa também nos pedidos para levar**. Regra guardada/sincronizada junto de order-settings, disponível offline; exige permissão de Ajustes e preserva a regra independente de cliente obrigatório. Validação em Avançar e Finalizar, e limpeza da mesa após salvar o pedido.
- Comandas HTML/ESC-POS mantêm nomes completos dos tipos de atendimento e omitem a mesa vazia. Histórico/detalhes não mostram identificador de mesa vazio para levar.
- Verificado com 42 cenários de identificação (PT/EN/ES, dois temas, sete tamanhos), 18 do fluxo compacto, seis fluxos da regra/configuração com rotação e 21 testes de regras/impressão/idiomas. Evidência em navegador com provedores sintéticos, sem alegar validação Android física.
- Sem publicação ou nova compilação APK; aguardam autorização explícita.

## Busca de produtos na mesma linha — 19/10/2026 — implementação local

- Lupa menor em cápsula delimitada. Ao tocar, o campo se expande à esquerda da lupa, entre ela e Todos, sem abrir outra linha ou deslocar os produtos para baixo. A faixa de categorias mostra Todos ao concluir a abertura.
- Animação curta com redução de movimento respeitada; foco para digitar, texto mantido ao girar o tablet e busca limpa ao fechar. PT/EN/ES e temas claro/escuro preservados.
- Verificações: 18 cenários específicos de busca (PT/EN/ES, dois temas, três tamanhos, movimento reduzido e rotação), 18 cenários do fluxo compacto de pedidos e três testes de cobertura de idiomas. Lint e TypeScript aprovados; evidência em navegador com dados sintéticos.
- Implementação aguardando autorização específica para nova compilação APK; nenhuma publicação ou compilação solicitada para este ajuste.

## Autorização de compilação APK — esclarecimento 19/10/2026

- O proprietário contestou novos APKs automáticos. A autorização anterior de publicar tudo não cobre futuras compilações: cada nova compilação precisa de autorização explícita. Continuar implementação/testes; não solicitar APK automaticamente nem cancelar os já solicitados sem instrução.

## Remoção do aviso flutuante de preparo — 19/10/2026

- Removida a faixa global “Etapa alterada” com contador e botão Desfazer, inclusive sua sobreposição e temporizador.
- Desfazer até um minuto e correções autorizadas continuam nos Detalhes do pedido do preparo, com as regras offline existentes. Pedidos finalizados podem ser acessados por Mostrar finalizados.
- Verificação: 12 cenários de interface nos três idiomas, incluindo finalizados, desfazer, prazo expirado, autorização e ausência da faixa em paisagem/retrato/Home; 8 testes de correção offline; lint e TypeScript aprovados.

## Filtro de data no Histórico — 19/10/2026

- Funil compacto no lado direito; opções ocultas em popup: Hoje, Últimos 7 dias, Últimos 30 dias, Mês anterior e Personalizado. Ao abrir/reabrir o Histórico, volta a Hoje.
- Filtro pelo horário local do tablet, nos pedidos já armazenados, totalmente offline. Últimos 7/30 dias incluem hoje; mês anterior é o mês completo; personalizado inclui o dia final inteiro e aceita DD/MM/AAAA em PT/ES, MM/DD/YYYY em EN e oito dígitos numéricos. Datas inválidas ou invertidas não alteram a lista aplicada; Cancelar descarta as mudanças.
- Mantém status de preparo, detalhes e reimpressão. Estado vazio específico para período sem pedidos. Verificação específica de limites locais, virada de mês/ano, ano bissexto e horário de verão, além de 24 cenários de interface nos três idiomas, dois temas e quatro tamanhos. Os 13 testes específicos de datas/preparo/idiomas, lint e TypeScript passaram. Evidência de navegador com dados sintéticos; Android físico permanece separado.

## Preparo no Histórico — 19/10/2026

- Lista com Aguardando, Em preparo, Pronto ou Finalizado a partir da etapa salva. Detalhes mostram envio, início, pronto e finalização à direita em paisagem, abaixo do resumo em telas estreitas/fontes grandes.
- Utiliza o cache existente, incluindo correções offline, sem alterar pedidos/preparo. Finalização automática mantém Pronto e Finalizado no mesmo instante; configuração atual não reinterpreta pedidos antigos. Horários ausentes aparecem como não registrados, sem usar a data de atualização como substituta. Sem registro e módulo desabilitado, não exibe preparo fictício.
- Verificação: 20 testes específicos de histórico, política, correção e idiomas; 18 cenários de interface PT/EN/ES, claro/escuro, telefone/retrato/paisagem. Lint e TypeScript aprovados. Evidência em navegador com dados sintéticos, sem alegar validação Android física.

## Cadastro de produtos em popup — 19/10/2026

- Removido o botão global Salvar cardápio. Adicionar produto usa verde sólido e abre imediatamente um popup dedicado, mesmo com busca ativa; não cria item invisível no fim da lista.
- Popup de inclusão/edição com nome, preço quando Caixa está ativo, ingredientes, grupo, subgrupo e opção de pizza. Rodapé sempre acessível com **Salvar** / **Cancelar**, nos três idiomas. Formulário compacto, rolável em telas baixas e com áreas seguras preservadas.
- Rascunho isolado: cancelar não grava; validação antes de salvar; falhas mantêm o formulário e os dados. Novo item aparece no início do catálogo salvo, e a busca é limpa somente após inclusão bem-sucedida. Edição preserva os demais produtos. Disponibilidade/favorito também são rascunhos e são gravados junto do cardápio numa única transação durável. Exclusão pede confirmação e mantém o formulário em caso de falha.
- `saveMenu` confirma sucesso/falha apenas depois da gravação, para o popup não fechar com erro. Papéis e autorização de preço preservados; gravação local/sincronização offline continuam com a infraestrutura existente.
- Evidências: 24 fluxos de interface PT/EN/ES, claro/escuro e quatro tamanhos, incluindo busca ativa, criação, cancelamento, validação, edição, falha/reenvio e exclusão confirmada; mais 6 conferências do popup compacto em paisagem normal/baixa. Testes específicos de cardápio/perfis/idiomas (19), armazenamento/sincronização (14), lint e TypeScript aprovados. Navegador usa os componentes reais com adaptadores sintéticos de armazenamento/confirmação nativa; validação Android física continua separada.


## Cabeçalhos corrigidos: controles à direita — 19/10/2026

- Correção expressa do proprietário: tema e idioma juntos no canto superior DIREITO em todo o app e portais. Logo/nome/slogan voltam à posição original, antes dos controles, sem alterar a logo personalizada. Registros anteriores de canto esquerdo ficam superados por esta instrução.
- Cabeçalho operacional com logo à esquerda e preferências à direita; entrada/vinculação/licença com seletores no alto à direita de seus cartões. Restrições de idioma nos Ajustes preservadas.
- Portais restauram marca à esquerda na barra fixa e controles à direita. Popup de idioma alinhado pela direita para abrir dentro da tela, incluindo largura de 320px. Switch, bandeiras e cápsulas permanecem compactos.
- Verificação: 90 cenários do app com posição à direita/logo antes dos controles; 450 de aparência app/portais; 24 de seletores e popup dentro da tela; 19 testes Node de aparência/idioma. Lint/TypeScript aprovados. Gerar APK sem acompanhar a compilação.


## Prévia da comanda em 75% — 19/10/2026

- Toda nova abertura inicia em 75%, inclusive no CSS inicial da visualização, evitando exibir 100% antes do carregamento. Fechar e reabrir restaura 75%; zoom manual e rotação mantêm o comportamento existente.
- Alteração somente da visualização no app; largura de papel, HTML enviado para impressão e recibo físico preservados.
- Lint/TypeScript, 12 testes de impressão e 6 cenários reais de interface em PT/EN/ES (início em 75%, CSS do documento, zoom manual, rotação e reabertura) aprovados. Android físico permanece separado; geração do APK sem acompanhamento.


## Setas de seleção padronizadas — 19/10/2026

- Pedido posterior ao fechamento: remover a seta de texto solta do idioma e corrigir os mesmos casos no restante da interface. Bandeira e chevron agora ficam juntos em uma cápsula visual de 48 × 32, com borda/fundo e alvo de toque de 44px; bandeira permanece 16 × 12.
- Chevron desenhado compartilhado no idioma, seletor de usuário do login, subgrupos do pedido e expansão de produtos do Cardápio. Reutiliza os botões/cápsulas existentes; expansão do Cardápio tem moldura própria. Setas invertem ao abrir. Portais usam o mesmo desenho em SVG, sem depender da fonte. Seletores nativos já contidos em campos mantêm o comportamento do sistema.
- Sem mudanças em idiomas disponíveis, sessões, permissões, rascunhos ou proporções aprovadas do Pedido.
- Verificações: 19 testes Node de aparência/idiomas; 24 casos específicos de cápsula/chevron/abrir/fechar nos três idiomas, temas e larguras; 90 de preferências do app; 450 de aparência app/portais; 18 do Pedido com subgrupos e proporções. Lint e TypeScript aprovados. Compilação do APK não acompanhada.


## Fechamento atual — 19/10/2026

Consulte [FECHAMENTO-2026-10-19.md](FECHAMENTO-2026-10-19.md) para o checklist consolidado e a entrega atual. Os registros anteriores abaixo preservam a cronologia; indicações antigas de “somente prévia”, “sem publicar” ou bloqueio de credenciais foram superadas pelas publicações posteriores. Switch/bandeira compactos já estão nos portais; proporção 34%/124px/76px incluída na entrega do APK solicitada para `5e9c22f`, sem acompanhar a compilação. Permanecem separados a conferência física, entrega real de e-mails e o fluxo de Encomendas expressamente adiado.


## Datas personalizadas do portal — publicado em homologação

- Publicado no código `f5eb545297cad8256e3409c1a055b7b902df68b2`: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39207357892 . Validação completa e portais aprovados; saúde e entrada do gestor HTTP 200 após publicação. Apenas web, sem novo APK.

- Corrigida a apresentação compacta que cobria o campo editável com uma data apenas exibida. Os campos De/Até agora são textos realmente editáveis em MM/DD/YYYY, com botão próprio de calendário e valores ISO separados para a consulta.
- Aceita também oito dígitos pelo teclado numérico, normalizados ao confirmar. Datas impossíveis e rascunhos incompletos ficam no campo, com validação traduzida, sem disparar consultas inválidas nem apagar o relatório aplicado. Intervalo invertido não é enviado; atualização explícita informa o erro.
- Calendário usa showPicker quando disponível e seletor nativo visível como alternativa. Fechar com Esc não fecha o painel inteiro de filtros. Escolha pelo calendário e digitação sincronizam o mesmo período, em qualquer opção de período; editar datas seleciona Personalizado automaticamente.
- Teste anterior de alteração programática do input nativo foi reforçado para clicar e digitar no campo visível, confirmar, verificar datas efetivamente enviadas/aplicadas e preservar entrada inválida. 18 cenários PT/EN/ES em larguras 390/800/1280; mais 3 específicos de teclado numérico/alternativa de calendário. Testes de idioma (11), lint e TypeScript aprovados localmente. Apenas portal; sem novo APK.

## Remoção do resumo textual abaixo de Pedidos por hora

- Publicado em homologação: `a55bc11f7180a45c880fbfb13186c8f84c4d2d59`, execução https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39206468370 . Validação e portais aprovados; saúde OK após publicar. Sem novo APK. Testes de idioma (11), navegador específico (3), lint e TypeScript aprovados.

- Proprietário dispensou a linha de horário/média como “09:00 PM · 0.03 Average orders/hour”. Removidos o resumo automático de pico e a linha similar após clicar em uma barra. O gráfico e o popup de detalhes continuam disponíveis. Alteração somente do portal, sem novo APK.

## TMA do período e controles +/funil — publicado em homologação

- Código publicado `1abe2f470bd1091158ebfff0cab2cacc5a8480fd`. Execução https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39206219795 : validação completa e portais aprovados; APK/release ignorados intencionalmente. Saúde e entrada do gestor HTTP 200 após publicação. 18 verificações de navegador PT/EN/ES, 30 testes específicos de relatórios/idiomas/vendas, lint e TypeScript aprovados.

- Substitui o gráfico de TMA por hora da rodada anterior. TMA agora mostra somente a média ponderada dos pedidos com intervalo registrado em todo o período selecionado (dia, mês, ano ou datas manuais). Incluído Ano atual no seletor; os limites existentes de até 366 dias permanecem.
- TMA fica no indicador compacto. O + abre média, período, intervalo medido e quantidade de pedidos usados no cálculo. O funil imediatamente à direita do + abre as opções do TMA. Sem registros, mostra — e zero amostras, sem inventar médias.
- Removida a coluna de TMA por hora dos detalhes do gráfico de quantidade. O gráfico de pedidos por hora permanece independente, com quantidade no dia e média por horário nos períodos maiores.
- Cabeçalhos de relatórios: + substitui o texto Detalhes, com nome acessível traduzido; ações no canto superior esquerdo. Filtros gerais e filtros do gráfico financeiro usam o mesmo funil para revelar/recolher seus campos. Globais preservam uma linha quando abertos. Detalhamento financeiro do gráfico também usa popup. Filtros não existentes não são inventados nos cartões sem opções.
- Testes reais de navegador com conta/base sintética verificam dia 5 min, mês/ano 8,3 min ponderados (três pedidos de 5 min e seis de 10 min), intervalo manual 10 min, mudança para tempo de preparo, zero amostras, ícones, diálogos e filtros financeiros. A linha de pico/quantidade de pedidos não é uma medida de TMA e permanece separada.
- Publicação somente dos portais, sem novo APK. Produção preservada; teste Android físico e entrega real de e-mails continuam separados.

## Ajuste dos filtros e gráficos do portal — correção atual

- Publicado em homologação no código `b21697602794c07ed3734bc3f335fc07662d37fc`: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39195808640 . Validação completa e portais aprovados; jobs APK/release intencionalmente ignorados. Saúde e entrada do gestor HTTP 200 após publicação. Produção e compilação anterior preservadas.

- Filtros gerais em uma única linha inclusive no celular: Loja, Período, De, Até e atualização por ícone. Datas compactas MM/DD/YYYY com o seletor nativo mantido; datas/período/loja continuam atualizando a consulta. Rótulo Período corrigido também em inglês/espanhol.
- Seletor de intervalo do TMA removido dos filtros gerais. Agora fica dentro de um gráfico próprio de TMA por hora, com detalhamento próprio. Troca do intervalo modifica a medida de tempo, preservando datas/loja e o gráfico de quantidade de pedidos.
- Pizzas de produtos/categorias permanecem visíveis; período sem pedidos agora mostra círculo neutro com 0 e mensagem explícita, em vez de substituir o gráfico apenas por texto. Nenhum valor ou distribuição é inventado.
- Chromium: 9 combinações PT/EN/ES e larguras 390/800/1280, incluindo alinhamento de todos os filtros, troca de base do TMA e período vazio. 22 testes específicos de idiomas/relatórios, lint e TypeScript aprovados. Validação física Safari permanece separada.
- Entrega web separada da fila longa de APK, com serialização específica da publicação do Worker. Compilações anteriores permanecem intactas. Entrega somente dos portais; opção `build_apk=false` no workflow evita gerar APK redundante em alterações web. A entrega completa continua oferecendo geração de APK por padrão.

## Últimas demandas de layout — publicadas em homologação

- Publicação concluída no commit `9095daae8b16ebfd799b11751749c13200efdb8f`. Validação completa e job de portais aprovados: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39193935444 . APK solicitado automaticamente após o sucesso dos portais; compilação não acompanhada. Conferência pública aprovada: saúde `ok:true`, `/admin`, `/gestor` e recuperação HTTP 200; API de relatórios sem sessão permanece 401. Produção preservada. Lint/TypeScript aprovados, além da validação completa do GitHub.

- Esta seção substitui os registros anteriores que ainda descreviam a tela de Pedido como somente uma prévia. Autorização atual: fazer todas as pendências e publicar em homologação. Fluxo operacional de Encomendas/cozinha/caixa continua adiado.
- App: mesas compactas, Outra mesa e Avançar na mesma linha nas larguras de tablet em retrato/paisagem. Em telas pequenas/fontes grandes há quebra acessível. Altura de toque preservada em 44 px; largura dos números reduzida expressamente a pedido do proprietário. Sem rolagem horizontal nesse bloco.
- Pedido atual fixo no retrato, com rolagem própria dos itens; catálogo independente. Finalizar pedido dentro do painel nas duas orientações, sem o subtítulo de impressão. Busca recolhida na lupa; subgrupos em diálogo no segundo toque da categoria, sem linha extra, mostrando somente o subgrupo específico selecionado no botão.
- Portal: filtros compactos; seletor único Hoje/7 dias/mês atual/mês anterior/personalizado junto às datas. Toda abertura inicia em Hoje. Retirados seletores visíveis de fuso, mês, recorte e indicador. Mantido o fuso do navegador para datas/cálculos. Troca de idioma preserva loja/área/base do TMA, mas reinicia o período em Hoje conforme solicitado.
- Indicadores menores; relatórios em duas colunas, com adaptação para celular. Pedidos por hora em eixos L com escala iniciando em 0/10/20/30/40/50; dia usa quantidade e períodos maiores usam média por hora coberta, incluindo dias sem pedidos e horário de verão. Detalhamento em popups com teclado/Escape. Gráficos de pizza de produtos/categorias (quantidade total não truncada, com Outros) e lojas. Produtividade da cozinha por usuário (prontos/iniciados/tempo médio), separada de operadores que só finalizam. Retirado o detalhamento de pedidos da interface.
- Workflows atualizados para versões das ações com Node 24, incluindo checkout, Node, Java, Android, Gradle e artefatos. Versões conferidas nos repositórios oficiais, sem iniciar build redundante.
- Evidências locais: 42 verificações do formulário, 18 do Pedido fixo/busca/subgrupos, 18 dos relatórios compactos e 48 fluxos de navegação/190 trocas de idioma, PT/EN/ES; regressões de relatórios/idiomas/vendas (30, incluindo total de pizza com mais de 100 produtos). Chromium com serviços/contas sintéticos; não equivale a Android físico.
- Limites externos: GET real da recuperação respondeu 200, formulário habilitado; isso não prova chegada de e-mail. Confirmar caixa de entrada/envio real ainda depende de provedor/remetente e acesso à caixa. Não foram enviados convites a clientes reais nem alteradas contas reais para testar. Conferência física no tablet/impressora depende do equipamento; não declarar concluída. Essas limitações não impedem a entrega do código autorizado.

## Publicação autorizada — rodada atual

- Após o proprietário ajustar D1 para Edit, retomados somente jobs falhos da execução `39180221058` (tentativa 2), reaproveitando os 335 testes/lint/TypeScript aprovados. Migração aditiva e publicação do Worker de homologação concluídas. Conferência pública: `/health`, `/admin` e `/gestor` HTTP 200; login do cliente com marca, campo e-mail e capitalização automática desabilitada. Geração do APK solicitada pelo workflow após o sucesso dos portais; não acompanhada e não afirmar APK concluído. Produção preservada. Código publicado: `21264046022b6fd436d7217a7b3e422bbfc8fc3e`. Layout de Pedido aprovado somente em prévia e entrega real de e-mails continuam pendentes.

- Tentativa `39180221058`, commit `21264046022b6fd436d7217a7b3e422bbfc8fc3e`: validação completa aprovada (lint, TypeScript e testes). Migração recusada pela API Cloudflare D1 `/import`, erro de autenticação 10000: token existente precisa de D1 Edit, não somente Read. Ponto de recuperação obtido antes da tentativa. Worker não foi atualizado e APK/release não iniciaram. Editar a permissão do token existente; retomar apenas jobs falhos após ajuste, reaproveitando a validação aprovada. Não recriar credenciais/secrets sem necessidade. Processamento: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39180221058 .

- Proprietário autorizou publicar tudo que foi implementado. Entrega somente em homologação, preservando produção. O layout de Pedido aprovado apenas em prévia continua pendente de implementação; não declarar essa parte entregue. Convites dependem da migração aditiva antes do Worker. APK só inicia após publicação bem-sucedida dos portais; entregar o link sem acompanhar a compilação.

## Correção de preparo totalmente offline — implementação local

- Até 60 segundos, quem realizou a última alteração pode desfazer sem autorização adicional. Depois de um minuto, quem está logado e tem permissão corrige diretamente, sem pedir usuário/senha. Se não tiver, solicita outro usuário autorizado e sua senha, validados exclusivamente no tablet. Admin/Gerente sempre autorizam; demais usuários dependem de `correctPreparation`. Nenhuma dependência de internet para realizar a ação.
- Guarda mudanças anteriores, correção e provas de autorização no cache protegido antes de confirmar a ação; sincroniza na ordem depois. Não salva senhas de aprovação nem troca a sessão. Credenciais/usuários precisam estar previamente disponíveis no tablet. Perfis e permissões são atualizados na sincronização sem expor verificadores de senha de outros usuários.
- Conflitos com outro tablet preservam a correção e a trilha locais para revisão; não sobrescrevem a etapa remota silenciosamente. Repetição após resposta perdida não duplica eventos.
- Validação: oito testes locais/servidor (reinício, pedido ainda não sincronizado, perda de resposta, concorrência, delegação, assinaturas adulteradas), 12 cenários visuais PT/EN/ES, lint e TypeScript aprovados. Evidência em Node/Chromium; validação física Android permanece pendente. Sem publicação, push ou build.

## Barra de ações do cliente organizada — alteração local em 18/10/2026

- Todos os atalhos do cliente, inclusive Licença, estão no mesmo grupo flexível. Mesma altura de 44 px e espaçamento de 8 px. Ordem: Cadastrar loja (quando permitido), Cadastro do cliente, Usuários App, Usuários Painel do gestor, Licença do cliente, Todos os clientes. Em desktop cabem na mesma linha; telas menores quebram apenas conforme a largura disponível.
- Conferência visual de 9 combinações (PT/EN/ES; 390/800/1280 px), sem sobreposição/rolagem horizontal e com altura uniforme. Lint e TypeScript aprovados. Sem publicar.

## Navegação de cadastro e usuários separada — alteração local em 18/10/2026

- Ao abrir um cliente, os botões são **Cadastro do cliente**, **Usuários App** e **Usuários Painel do gestor**. Removidos os atalhos mistos “Cadastro e usuários” e “Gerenciar senhas do cliente”.
- **Cadastro do cliente** (`/admin/cliente?groupId=...`) contém somente nome, tipo, situação e lojas vinculadas. Não renderiza nem consulta contas de usuários.
- **Usuários App** (`/admin?groupId=...#app-users`) pede escolher a loja e abre somente os usuários/perfis/senhas do aplicativo dessa loja. Não contém cartão de contas do portal. Atalhos antigos com `#client-password` são aceitos como alias para a nova seção.
- **Usuários Painel do gestor** (`/admin/gestores?groupId=...`) contém somente as contas por e-mail, senha/convite e situação desses acessos, sem formulário de cadastro do cliente. Os links mantêm o cliente selecionado.
- Verificado no Worker local: 18 cenários completos de navegação/edição dos três cadastros em PT/EN/ES, celular e desktop, incluindo isolamento entre lojas/clientes e ausência de formulários misturados. O fluxo de convite foi repetido após a separação: 15 cenários aprovados. Testes específicos de cadastro/idiomas/CSP (29), lint e TypeScript aprovados. Produção/homologação remotas permanecem sem novas publicações; não houve push ou build.
- A prévia de Pedido fixo em retrato foi aprovada posteriormente, com busca recolhida e subgrupos no botão da categoria; implementação na tela real ainda pendente.


## Portal do cliente por e-mail e convites — implementação local em 18/10/2026

- Corrigida a definição anterior: **o login do Portal do cliente usa e-mail**, normalizado em minúsculas. O campo Nome identifica a pessoa e não é login. O administrativo oferece **Definir senha** ou **Enviar convite por e-mail**, além de reenvio e status. A senha pode ser definida pelo proprietário ou pelo cliente após receber o convite; mínimo de 8 caracteres com confirmação.
- Convites válidos por 24 horas, um único uso, token aleatório de 256 bits armazenado como hash. Link usa fragmento e o remove do histórico ao abrir, sem token em query, armazenamento do navegador ou resposta administrativa. GET de pré-visualização de e-mail não consome o convite. Respeita cliente/conta ativos, revisão, CSRF, limite de tentativas e reenvio após um minuto. Alterar e-mail/senha/cadastro invalida convites e sessões anteriores conforme a revisão. Não concede acesso ao administrativo nem ao APK.
- Cadastros antigos mantêm ID, hash e vínculo de lojas; o proprietário precisa informar um e-mail real ao editar, sem deduzir endereço a partir do antigo usuário. Internamente a coluna legada `manager_users.username` armazena o e-mail normalizado; o cadastro/API expõe `email`.
- Nova tabela aditiva `manager_user_invitations` em `server/cloudflare/store-schema.sql`. **Antes de qualquer futura publicação autorizada**, aplicar o schema no D1 de homologação, com permissão de escrita de D1. O token Cloudflare configurado anteriormente tinha D1 Read; não supor que execute migrações. O workflow de entrega atual não aplica esse novo schema automaticamente. Não publicar Worker novo sobre banco sem essa tabela.
- Integração de envio usa a configuração existente: `PASSWORD_RESET_PROVIDER` (Resend/Brevo), chave privada correspondente, `PASSWORD_RESET_FROM` e `PASSWORD_RESET_ORIGIN` fixo de homologação. SMTP/provedor e remetente reais continuam pendentes de configuração/conferência. Falta de configuração impede o envio antes de criar o acesso; falha do provedor registra falha e nunca afirma que enviou. O fluxo manual continua disponível.
- Evidências: testes específicos de autenticação, convites e dependências, revisão de idiomas/CSP, lint e TypeScript. Navegador: 15 cenários completos nos três idiomas (cadastro → envio simulado → criação de senha → login → recusa de reutilização), com troca de idioma/tema. Envio testado com provedores sintéticos, sem e-mails reais. Nenhuma publicação, push ou build solicitado.


## Alterações locais posteriores à suspensão de publicações — 18/10/2026

- **Não publicar sem nova autorização explícita.** Nenhum push, deploy ou build solicitado nesta rodada. A autorização ampla somente volta a valer se o proprietário disser para seguir e publicar tudo; uma nova proibição exige perguntar antes de cada publicação.
- Portal do cliente: login com a mesma logo do administrativo, marca compartilhada, cartão compacto de até 440 px, botão terracota, temas e idiomas preservados. Logo também no cabeçalho autenticado. Removido `text-transform:capitalize` dos campos de acesso; desativados autocorreção/capitalização do teclado. A definição inicial por usuário foi substituída pela implementação de acesso por e-mail e convites descrita acima. Cadastro: **Clientes → Abrir cliente → Usuários Painel do gestor → Novo usuário**, com lojas autorizadas e conta separada do APK. Teste Chromium: 18 cenários (PT/EN/ES, claro/escuro, 320/800/1280 px). Login/erro traduzido, CSP, catálogos, lint e TypeScript conferidos. Prévia local: `/tmp/bistro-client-login-YdUY0e/light-1280.png`.
- Preparo: implementação online inicial substituída pela regra offline aprovada abaixo.
- **Pedido em retrato aprovado, ainda pendente de implementação:** Pedido atual fixo abaixo da faixa da mesa, com rolagem independente dos itens; catálogo rola abaixo. Busca recolhida numa lupa junto das categorias. Primeiro toque numa categoria com subgrupos mostra todos os produtos; segundo toque abre os subgrupos. Exibir o subgrupo no botão somente quando um específico estiver selecionado, sem linha separada de subgrupos.
- Integração operacional futura de Encomendas com cozinha/caixa continua adiada.


## Correções da rodada atual — 18/10/2026

- Dados do pedido: campos de atendimento, cliente e mesa reorganizados sem sobreposição, mantendo rascunho na rotação. Botão sem seta: **Avançar / Continue / Continuar**.
- Preparo: opção por loja **Utilizar o botão finalizar no fluxo de preparo**, no administrativo junto do módulo. Começa habilitada para preservar o funcionamento atual. Desabilitada, **Pronto** conclui diretamente; habilitada, **Finalizar** confirma a entrega. Mantém tempos e autoria. Política armazenada em registro reservado, sem migração D1, sincronizada e mantida offline; somente proprietário altera.
- Removido o selo antigo “Do pedido à cozinha”. Slogan **BistroHub — Do caixa à cozinha.** nos cabeçalhos interativos do app e dos portais, traduzido nos três idiomas.
- Aparência: sol/lua sem texto visível no canto superior direito, acesso livre e preferência persistente. App usa formas locais, sem emoji ou dependência nova; portais usam SVG. Nomes acessíveis traduzidos e alvos de 44 × 44.
- Evidência de navegador: 444 cenários compartilhados de aparência/portais, 42 do bloco de identificação e 39 do KDS. Testes específicos de conclusão: 24 verificações Node e 9 cenários de navegador; regressão de Pedido com 54 cenários aprovada antes da mudança final de cabeçalho. Mais 54 cenários específicos dos ícones aprovados, incluindo contraste mínimo de 4,5:1, localização no topo direito e alvos de toque. Lint e TypeScript aprovados. Evidência em Chromium com serviços sintéticos; validação física Android continua separada.
- O processamento anterior foi consultado a pedido do proprietário: todos os jobs concluídos com sucesso, inclusive APK/release; o e-mail da tentativa #3 era histórico. Download daquela versão: https://github.com/WooxOnly/Comandadigitalprint/releases/download/homologacao-0d9991be9a5c/BistroHub-Homologacao.apk . Os avisos antigos abaixo ficam como histórico, sem necessidade de recriar secrets.
- Somente homologação autorizada. Fluxo operacional de Encomendas/cozinha/caixa permanece adiado. Não acompanhar a próxima compilação APK: entregar o link e consultar novamente apenas quando solicitado.


## Economia de tokens e compilação sem acompanhamento — 17/10/2026

- Proprietário reiterou: iniciar geração de APK, entregar o link e não acompanhar/esperar a compilação. Consultar novamente somente se solicitado. Monitor local encerrado; compilação remota preservada.
- `EXPO_TOKEN` configurado pelo proprietário e aceito; ferramentas Android e autenticação Expo passaram. APK solicitado no processamento https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39027796587 , etapa de geração em andamento na última consulta. Não afirmar APK pronto/download validado enquanto não houver conferência posterior solicitada.
- Priorizar testes específicos da alteração e dependências afetadas; aproveitar evidências já aprovadas. Rodada completa somente quando mudanças compartilhadas ou fechamento da entrega justificarem, sem repetir suítes sobrepostas sem necessidade.
- A reconexão ocorreu porque o ambiente temporário reiniciou e perdeu sessões locais; agora Cloudflare e Expo usam Actions Secrets persistentes do repositório. Não solicitar recriar esses acessos sem falha concreta.

## Portais publicados; APK aguardando acesso Expo — 17/10/2026

- Proprietário configurou `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` nos GitHub Actions Secrets. A nova tentativa publicou somente o Worker de homologação, preservando variáveis remotas e sem migração de banco.
- Código funcional publicado: `0d9991be9a5c732f301e832cbfbe41882de60b27`. Worker: **`ac4d157e-f1ef-45b1-9b0a-8e3862e62b97`**, publicação em 17/10 às 07:22 de Nova York. Job `portals` aprovado: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39027796587 . O resultado geral desse processamento permanece como falha por causa do job independente do APK, não da publicação do Worker.
- Conferência pública após publicação: `/admin`, `/gestor` e `/health` responderam HTTP 200; saúde `ok:true`. Testes autenticados automatizados usam bases sintéticas; nenhuma conta real foi alterada para conferir a entrega.
- CI completo aprovado para o código publicado, com 310 testes, lint/TypeScript: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39027796609 . Revisão de navegador: 664 cenários responsivos, 444 de aparência, 261 do administrativo, 54 de Pedido e 54 de Encomendas.
- **APK ainda não gerado:** o GitHub Actions informou `EXPO_TOKEN ausente`. Configurar esse segredo na conta Expo com acesso ao projeto de homologação e retomar somente o job de APK; a compilação é local no runner e não usa a cota esgotada de builds EAS cloud. A liberação para download continua condicionada à assinatura/pacote e conclusão verificadas.
- Produção preservada. Integração futura de Encomendas com cozinha/caixa continua adiada. Recuperação real por e-mail depende do remetente/provedor, e validação física de tablet/POS continua para teste no equipamento.

## Correção adicional encontrada na validação remota — 17/10/2026

- A segunda execução de CI revelou uma corrida no retorno idempotente do estorno do Caixa: a mesma operação podia ser confirmada por outra requisição entre a primeira consulta e a leitura do histórico, fazendo o reenvio receber erro. O banco continuava impedindo estorno duplicado.
- Corrigido o reconhecimento do mesmo identificador no histórico antes de calcular novo estorno. Teste determinístico força exatamente esse intervalo; motivo diferente continua rejeitado como `INVALID_RETRY`. O teste concorrente anterior também deixa de presumir qual das duas operações diferentes vence a corrida; continua exigindo exatamente um estorno e o número correto de reenvios confirmados para o identificador vencedor. Os 33 testes direcionados de Caixa/módulos ampliados passaram; a suíte global posterior passou com **310 testes**, além de lint/TypeScript. O ajuste final da asserção concorrente foi verificado novamente nos 18 testes de Caixa.
- Preparação Android do runner corrigida para não solicitar o pacote obsoleto `tools`; usar `platform-tools`. Presença de `EXPO_TOKEN` agora é conferida antes de instalar ferramentas. Não confundir falha de preparação com ausência de credencial Expo, que ainda será conferida.

## Estado da entrega — 17/10/2026

- Código funcional salvo em `f86581460767b4695dd68fe3844520c377ec7d43`, branch `homologacao`. CI aprovado: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39027405322 .
- Entrega remota https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39027405397 interrompida antes da publicação: **`CLOUDFLARE_API_TOKEN` ausente nos GitHub Actions Secrets**. O ambiente reiniciado também não tem a antiga sessão Wrangler/Expo. Não afirmar que o Worker ou APK desta etapa foram publicados.
- Revisão completa adicional aprovada: **664 verificações responsivas**, **444 de aparência** e **261 do administrativo**, PT-BR/EN/ES. Testes específicos de Pedido e Encomendas: 54 + 54 verificações. Código: 309 testes distintos aprovados (308 na suíte geral e um novo caso administrativo executado separadamente), lint/TypeScript aprovados.
- Compilação APK separada da publicação do Worker, para permitir preparar o instalador quando o acesso Expo estiver disponível. Sua liberação conjunta depende da publicação correta do servidor. Credenciais exigidas no GitHub Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `EXPO_TOKEN`; nunca registrar seus valores no projeto ou na conversa.
- As seções datadas abaixo são histórico. Pedidos posteriores de concluir tudo e publicar homologação substituem as antigas anotações de aguardar autorização. Mantêm-se adiados apenas o fluxo operacional de encomendas/cozinha/caixa e as expansões futuras; recuperação real por e-mail ainda depende do provedor/remetente.

## Retomada e conclusão das correções de Encomendas — 17/10/2026

- Código recuperado do commit `10210de` após reinício do ambiente. Correções recentes reconstruídas; nunca considerar a antiga compilação Android como entrega desta etapa.
- Data da retirada/entrega sempre em mês/dia/ano, inclusive na agenda; mês, dia, ano, hora e minuto separados. Mês/dia/hora/minuto aceitam um ou dois dígitos, com zero à esquerda ao sair; ano usa quatro dígitos para evitar ambiguidade. Horário de 24 horas do tablet. Campos obrigatórios com asterisco, validação de preenchimento, datas reais, futuro e horário inexistente na transição de horário de verão.
- Adicionar produtos em Encomendas abre o mesmo diálogo de opções e observações do Pedido. Sabores, extras e observações são preservados na encomenda, sem inserir o produto na comanda do dia. Botões e título identificam o contexto.
- Cancelamento exige selecionar usuário e informar sua senha, com autorização no servidor e auditoria de autorizador, operador solicitante e instante. Admin/Gerente sempre autorizam; Caixa depende da permissão individual **Cancelar encomendas**, inicialmente desligada, disponível no cadastro individual do administrativo e nos Ajustes protegidos do app. Cozinheiro permanece sem acesso à tela. Esta é a exceção de permissão individual explicitamente solicitada; os demais acessos continuam pelos quatro perfis.
- Cancelar exige conexão e encomenda previamente sincronizada; outras operações de encomendas mantêm o comportamento offline existente. A sessão do operador é preservada e senhas não entram em logs, filas ou armazenamento. Reenvios são idempotentes; sincronizar recupera resposta perdida. Revogação de permissão durante a autorização impede a gravação.
- Validação local: suíte geral com **308 testes aprovados**, mais teste adicional do cadastro de permissão pelo proprietário aprovado; lint/TypeScript aprovados. Chromium: **54 verificações do Pedido**, **54 de Encomendas** (PT/EN/ES, claro/escuro e rotação) e **261 do administrativo** aprovadas. Evidência sintética dos componentes reais; não equivale a testes físicos de Android/impressora.
- Entrega: rotina específica de homologação preparada para publicar Worker com `--keep-vars`, sem reaplicar esquema nesta alteração de campos JSON, e gerar APK assinado no runner via EAS local, evitando a cota esgotada do EAS cloud. Publicação/compilação só contam como concluídas após confirmação do processamento remoto e download verificado.
- **Único fluxo funcional adiado pelo proprietário:** integração operacional de Encomendas com cozinha/caixa. Não foi redesenhada nesta etapa.
- Dependência externa ainda sem confirmação: entrega real de recuperação por e-mail requer remetente/provedor autorizado. Não afirmar envio real apenas por sucesso de tela/testes simulados.

## Pedido compacto e modo escuro aprovados — 16/10/2026

- Proprietário aprovou a prévia mantendo a identidade atual, com **duas colunas de produtos**, ingredientes/descrição acessíveis pelo **ⓘ**, **+** para abrir a configuração/observações e dados de atendimento/mesa/cliente em bloco superior recolhível por **Confirmar dados**, reaberto por **Editar**. Remover **Somente favoritos** dessa tela; favoritos cadastrados no Cardápio não são apagados.
- Implementação local: catálogo e pedido com rolagem independente na proporção 3:2; uma coluna de produtos quando a largura disponível/fontes ampliadas não comportarem duas. Nomes completos quebram linhas sem reticências; cartões acompanham o texto e mantêm ações separadas com alvo de toque de 44 pontos. Ingredientes não adicionam nem imprimem itens; o botão + preserva o diálogo existente de opções/observações. Preços continuam condicionados ao módulo Caixa; esta revisão não altera cobrança nem inventa um novo cálculo financeiro a partir da ilustração.
- Proprietário rejeitou o tema escuro esverdeado e aprovou a prévia **grafite/cinza neutro**, texto claro e ações em laranja. Paleta compartilhada ajustada para app e portais; tema claro e impressão em papel preservados.
- Conferência em navegador dos componentes reais com dados sintéticos: **54 verificações** de pedido em PT-BR/EN/ES, claro/escuro, nomes longos, dados recolhíveis, ingredientes, abertura de observações, preços dependentes de módulo e rotação. **300 testes de código**, **444 verificações de aparência** e **369 verificações responsivas ampliadas** aprovadas, além das 54 específicas do pedido; lint e TypeScript aprovados. Compilação Android ainda em andamento. Não confundir prévias ilustradas e Chromium com validação no tablet físico.
- Compilação local anterior com o tema verde interrompida para incorporar o grafite aprovado. Novo APK de homologação sendo preparado; ainda não declarar disponível nem publicado. Nenhuma alteração desta rodada foi publicada em produção. A revisão futura do fluxo cozinha/caixa permanece adiada.

## Encomendas — detalhamento com o proprietário, 16/10/2026

Estamos detalhando a tela antes de implementar os novos pontos. Não publicar esta rodada nem avançar automaticamente para outras telas.

- **Fluxo completo da operação — revisão adiada expressamente:** o proprietário ampliou o pedido para rever o fluxo de tudo, incluindo **encomendas, pedidos, cozinha e caixa**, não somente o envio da encomenda ao preparo. Mapear do cadastro/agendamento ou abertura do pedido até envio à cozinha, preparo, retirada/entrega, pagamento e conclusão, incluindo cancelamento, estorno e impressão. Definir como os módulos se comunicam, quais ações são manuais/automáticas, responsáveis, permissões e comportamento quando módulos estiverem desativados. A encomenda precisa chegar à cozinha em algum momento; esse momento e a ligação com o Caixa ainda não foram definidos. Não confundir estado do preparo com pagamento ou conclusão. Escopo de revisão registrado; não implementar nem considerar o desenho aprovado nesta etapa.
- Rótulos confirmados: **Data da retirada/entrega** e **Horário da retirada/entrega**.
- Data sempre na ordem americana **mês/dia/ano**, nos três idiomas. Campos separados para mês, dia, ano, hora e minuto; mês/dia/hora/minuto aceitam até dois dígitos. Foi proposta a entrada sem zero inicial com preenchimento automático; o ano com quatro dígitos foi perguntado, ainda sem confirmação explícita.
- Campos obrigatórios indicados com asterisco; se vazios ao salvar, destacar e mostrar aviso junto do campo. Impedir salvamento incompleto/inválido. Não disparar avisos intrusivos na abertura da tela.
- Ao adicionar produto na Encomenda, abrir os detalhes/observações e opções como em Pedido, antes da inclusão definitiva.
- Cancelamento solicitado: selecionar o usuário autorizador e verificar sua senha; registrar usuário, data e hora do cancelamento, sem registrar a senha. **Admin/Gerente sempre autorizados; Caixa depende da permissão individual específica “Cancelar encomendas”; Cozinheiro permanece sem acesso à tela.** Esta é uma nova exceção solicitada à regra anterior de permissões exclusivamente por perfil. O padrão desativado para o Caixa foi sugerido, ainda não confirmado separadamente. Não substituir o operador da sessão pela identidade de quem autoriza.
- Histórico separado de concluídas/canceladas foi apenas sugerido na conversa; fluxo atual ainda não conferido e proposta não aprovada. Não tratar conclusão como pagamento automático nem apagar registros.
- Correção do contraste do filtro selecionado autorizada; alteração já local, ainda não publicada. Os demais itens desta seção são requisitos/propostas em detalhamento, não funcionalidades entregues.

## Escopo confirmado — abertura do app, 16/10/2026

- Proprietário confirmou que a tela Início com o banner “Tudo pronto para o próximo pedido” **não deve mudar**. HomeScreen e seu layout não foram alterados nesta rodada.
- Trabalhar **um item por vez, avançando somente após autorização explícita**. A autorização mais recente cobre apenas a abertura do app; as demais alterações locais anteriores permanecem aguardando revisão, sem publicação.
- Abertura configurada com imagem transparente do chapéu e nome **BistroHub**, fundo off-white `#F5F3EF`, variante nativa escura em grafite `#181A1B`, largura de imagem 200 pontos dentro do canvas nativo de 288 para preservar a marca. Ativo `assets/bistrohub-splash.png`; ícone do aplicativo preservado.
- Esta configuração nativa exige nova compilação/instalação do APK. Ainda não publicada nem validada no Android físico. Não tratar prévia ou Expo Go como evidência da abertura do APK.

## Fila atual de ajustes — 16/10/2026, resolver parte por parte

Pedido mais recente: registrar todas as demandas e resolver uma por vez. **Os ajustes de layout serão decididos junto com o proprietário.** Não tratar sugestões de dimensões, cores ou composição como desenho aprovado, nem publicar automaticamente esta rodada enquanto ela está em revisão.

- [ ] **Usuários:** mostrar somente a primeira letra maiúscula, como **Will, Admin**. Esta correção substitui o pedido anterior de tudo em maiúsculas. Preservar identificadores de autenticação, contas existentes e senhas; não confundir operadores com nomes de clientes dos pedidos. Ainda não implementado.
- [ ] **Home em paisagem:** proprietário considera ícones/cartões e espaços muito grandes. Rever proporções em conjunto. Sugestões ainda não aprovadas: retirar o banner grande, botão Iniciar pedido no topo, atalhos compactos com ícone ao lado do nome, até seis módulos por linha, barra inferior e cabeçalho menores, preservando alvos de toque. Não aplicar esse redesenho sem definir a próxima parte com o proprietário.
- [ ] **Pedido — grupos de produtos:** colocar **Todos por último** e abrir inicialmente em **Aperitivos**, mostrando somente esse grupo para reduzir a lista inicial. Código local ajustado; sem Aperitivos, usar o primeiro grupo disponível. Preservar a seleção explícita do operador e o rascunho ao girar o tablet; não alterar produtos nem a ordem dos outros grupos. Ainda não publicado nem entregue em APK.
- [ ] **Abertura do APK:** substituir o fundo verde; exibir logo **e nome BistroHub**. Off-white/grafite e detalhe laranja foram sugestões; a composição final será revista em conjunto. A imagem com nome ainda não foi implementada nem entregue em APK.
- [ ] **Preparo:** trocar Iniciar por **Em preparo**, manter **Pronto**; destacar mesa e nome; apresentar **Recebido há X minutos** e **Em preparo há X minutos**, contando cada etapa desde seu próprio início. Código local alterado, ainda requer revisão final e entrega no APK.
- [ ] **Filtro de Encomendas:** texto desaparece quando o filtro fica verde. Corrigida localmente a cor selecionada de Todas/Dia/Semana e do endereço selecionado na mesma tela; lint e TypeScript aprovados. Conferência em Chromium aprovada em 36 combinações de filtros, idiomas PT-BR/EN/ES, temas claro/escuro e orientação horizontal/vertical, com contraste mínimo de 4,5:1. Não publicado nem entregue em APK; ainda sem validação no Android físico.
- [ ] **Entrega APK:** compilação local anterior interrompida para incorporar os novos pedidos. Não há APK novo pronto desta rodada. Cota gratuita de compilação EAS cloud esgotada; nenhuma contratação paga autorizada. Retomar a compilação quando a rodada acordada estiver fechada.
- [ ] **Recuperação por e-mail:** continua dependente de remetente/serviço aprovado para enviar aos destinatários cadastrados; não afirmar que está funcionando.

As demais demandas e evidências permanecem registradas abaixo. A publicação de homologação já conferida é a versão `9b07a29`; alterações locais posteriores não estão automaticamente disponíveis nela. Produção deve permanecer preservada.

## Publicação online conferida — 16/10/2026

- Código `9b07a29c31c05c9ea01ef0c852d14a0c2f31884d` enviado à branch `homologacao`; CI com **297 testes aprovados**, lint e TypeScript: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38983437074 .
- Backup privado validado antes da migração. Aplicada somente `license-schema.sql`, sem reaplicar o esquema antigo de lojas. `LICENSE_SIGNING_PRIVATE_JWK` configurada como segredo correspondente à chave pública do APK. Worker de homologação publicado com `--keep-vars`, versão `fd08b381-27b9-497a-987c-7e0426ea45d5`.
- Conferência autenticada online aprovou Home/clientes, botão/página de licença, cadastro individual com os quatro perfis, ausência de checklists, temas, API da licença com assinatura verificada, separação do Portal do cliente, `/health`, mesma senha semanal e configurações de lojas preservadas. Resultado privado em `/tmp/bistro-roles-live-result.json`. Nenhuma conta real alterada; produção preservada.
- **APK:** EAS cloud recusou a build por cota gratuita Android esgotada; reset informado para 01/11/2026. Nenhum plano pago contratado e nenhum ID de build cloud criado para esta entrega. Compilação **EAS local** iniciada com o mesmo perfil/projeto/pacote de homologação e credenciais remotas do Expo, usando ferramentas Android isoladas em `/workspace/scratch`. Log privado em `/tmp/bistro-eas-local-private.log`. Não afirmar APK disponível antes de a compilação concluir e gerar o arquivo.

## Entrega completa para homologação — 16/10/2026, publicação autorizada

- Proprietário reiterou **publicar tudo**, incluindo app e portais. Esta entrega substitui as notas históricas de alterações apenas locais. Destino exclusivo: branch, Worker/D1 e projeto Expo de homologação; produção preservada.
- Cadastro individual de usuários por lista → Editar usuário → perfil **Admin/Gerente/Caixa/Cozinheiro**. Removidos da loja os checklists de permissões e a lista de Gerentes do Caixa. Perfis são a única regra de autorização por usuário, no app, offline e servidor; configurações legadas permanecem guardadas, sem conceder ou retirar permissões. Flags de módulos, licença e opção de reimpressão da cozinha continuam independentes.
- **Licença do cliente** ganhou botão e página próprios ao abrir o cliente, acessível também pela navegação da loja, sem misturar licença com permissões. Código temporário e primeira ativação offline incluídos.
- Cartões de clientes menores, botão à direita; temas claro/escuro, preparo 12/8 com gestos, acesso do Caixa a Clientes e revisões de segurança/idiomas incluídos. Abertura nativa ajustada para fundo neutro claro/grafite e marca menor de 96 pontos, usando a imagem existente; não houve redesenho da marca.
- Destinos Cloudflare/Expo e par de assinatura conferidos. Backup privado anterior à migração validado. Navegador aprovou 261 verificações administrativas, 324 de perfis e 144 de licenças; lint/TypeScript aprovados. IDs de publicação, CI e build serão registrados após os serviços confirmarem.
- **Única dependência externa ainda não concluída:** ativação do envio real de recuperação por e-mail, que exige serviço/remetente aprovado. Código do suporte está incluído; não afirmar entrega de mensagens. Testes físicos no Android/POS são validação do proprietário, não funcionalidades ausentes.

## Cartão compacto de cliente — 16/10/2026

- Botão **Abrir cliente** movido para a extremidade direita do cartão, ao lado de tipo, nome e quantidade de lojas. Reduzidos margens e preenchimento vertical apenas dos cartões de clientes; Home e lojas preservam sua apresentação. Em telas estreitas, o botão pode passar para a linha seguinte para manter leitura e toque.
- Conferência de apresentação aprovada em PT-BR/EN/ES e larguras 320, 800 e 1280 px, sem transbordamento e com cartão abaixo de 120 px nas larguras maiores. Lint, TypeScript e `git diff --check` aprovados. Sem publicação nesta alteração; permanece junto às mudanças acumuladas de homologação.

## Licença mensal por cliente — 16/10/2026

- Nova demanda do proprietário: validade mensal, **renovação automática**, status e bloqueio/desbloqueio no administrativo, independentemente dos módulos e dos perfis do APK. Implementada no cadastro de Cliente, incluindo cliente de loja única ou cliente com várias lojas; a licença cobre as lojas vinculadas ao cliente no cadastro atual. Não existe uma licença global administrativa.
- Tablet consulta uma vez por dia UTC; falha de rede não bloqueia a validade assinada já recebida. No vencimento, há nova tentativa e botão de verificação manual. Bloqueio recebido impede o uso mesmo antes do vencimento; sem comunicação, novos bloqueios/renovações só serão conhecidos na próxima consulta. APIs operacionais também verificam a licença, inclusive para Admin.
- **Nunca verificado** também aceita liberação manual: código temporário assinado, com prazo absoluto de até 31 dias, vinculado a origem/ambiente, cliente, loja, aparelho e revisão. Existe entrada do código na tela de licença e na vinculação inicial offline. A liberação não cria usuário nem dispensa senha do operador. Consulta online bem-sucedida substitui o código pelo status atual; código antigo não contorna bloqueio mais recente recebido.
- Provas, identificação e referência de horário ficam em SecureStore, fora dos backups de pedidos. Relógio com retrocesso relevante exige correção; interface fica bloqueada sem apagar dados nem desmontar o pedido em edição. Não se promete proteção contra root/APK adulterado, nem bloqueio remoto instantâneo sem comunicação.
- Controle compacto no administrativo, PT-BR/EN/ES e claro/escuro. Alterações administrativas registradas por cliente e revisão, com transação para salvar estado/histórico. Chave privada somente no servidor; APK contém exclusivamente a chave pública. Nenhuma senha real, conta ou dado de produção foi alterado.
- **Validação:** 296 testes globais aprovados; 15 cenários específicos de licenças também aprovados após a revisão final, incluindo primeiro vínculo offline, assinatura com WebCrypto, adulteração do cache, expiração, relógio, isolamento, autorização e chave ausente. Lint, TypeScript e `git diff --check` aprovados. Navegador: **144 verificações de licenças** com formulários reais e **444 verificações de aparência/idiomas** novamente aprovadas. Evidências em `/tmp/bistro-license-full-final.log`, `/tmp/bistro-license-last-tests.log`, `/tmp/bistro-license-browser-final.log` e `/tmp/bistro-license-appearance-regression.log`; capturas em `/tmp/bistro-license-browser-Vhhk10`.
- **Ainda não publicado, sem commit/push ou novo APK.** Para ativar, aplicar apenas a migração aditiva `license-schema.sql` após backup e configurar com segurança `LICENSE_SIGNING_PRIVATE_JWK` correspondente à chave pública do APK, antes do Worker/build. Par privado preparado em arquivo local protegido e ignorado pelo Git; fazer custódia segura na publicação. Instruções e limites em `LICENCAS.md`. Testes físicos Android/SecureStore/assinatura nativa continuam para o aparelho; evidências de Node e navegador não os substituem. Permanecem as duas dependências anteriores: recuperação real de e-mail e escolha do novo visual da abertura nativa.

## Temas claro/escuro, preparo por gesto e revisão dos idiomas — 16/10/2026

- **Claro / Escuro** no app: seletor na entrada, vinculação inicial e Home, sem senha de Ajustes nem permissão de perfil. Escolha salva localmente por aparelho e usada após reabrir; preferência inicial acompanha o sistema. A apresentação é aplicada a telas, formulários, navegação, diálogos e estilos locais, incluindo o preparo. Native Appearance acompanha a escolha; recibos para impressão continuam em papel branco. Trocar o tema preserva o pedido em edição.
- **Painel administrativo e Portal do cliente:** controle em barra superior fixa durante a rolagem, inclusive entrada, recuperação e redefinição de senha. Preferência salva por navegador e compartilhada entre as páginas do mesmo domínio, sem alterar contas, cookies de autenticação ou permissões. CSS usa a mesma conversão semântica de cores do app, com contraste de texto, campos e gráficos; nonces e política CSP preservados.
- **Preparo:** 12 pedidos no horizontal do tablet de referência (4 × 3), oito no vertical (2 × 4). Janelas horizontais curtas como 960×600 mantêm oito para preservar os botões de 44 pontos e a leitura; 12 são liberados a partir de 1000×700 em paisagem. Deslizar para a esquerda avança uma página, para a direita volta, sem circular nas extremidades. Rolagem vertical dos itens permanece independente. Ao girar, um pedido da página anterior continua visível; ordenação, detalhes e autorização de reimpressão permanecem.
- **Idiomas:** revisão de PT-BR, EN e ES nos catálogos e nas páginas renderizadas dos portais: entrada/recuperação/redefinição, Home, clientes/grupos/lojas, configurações, acessos, senhas, contas, logs/histórico e métricas. Conferidos textos estáticos/dinâmicos, rótulos, mensagens, termos de TMA, pontuação, parâmetros e UTF-8. Os 557 textos do catálogo compartilhado estão cobertos nos dois idiomas de destino; novos controles de aparência também possuem tradução no APK.
- **Validação final:** 281 testes globais aprovados; lint, TypeScript e `git diff --check` aprovados. Chromium: 444 verificações de aparência/idiomas, persistência e rascunho em três dimensões e três idiomas; 261 da hierarquia administrativa em seis dimensões; 39 do preparo, incluindo gestos simulados por eventos DOM no responder React Native Web, orientação e listas longas. Mais 39 verificações aprovadas como Cozinheiro, com acesso restrito ao preparo. Evidências em `/tmp/bistro-theme-full-final.log`, `/tmp/bistro-theme-browser-palette-final.log`, `/tmp/bistro-theme-hierarchy-final.log` e `/tmp/bistro-theme-kds-final.log`; capturas dos temas em `/tmp/bistro-appearance-XgrPwm`.
- **Sem push, publicação, migração ou novo APK.** Android físico, gesto nativo, som e impressora continuam para teste no aparelho. O novo visual da abertura nativa antes do login ainda não foi alterado: sugestões enviadas e escolha visual do proprietário pendente. Recuperação por e-mail continua dependendo da configuração real do serviço, registrada abaixo.

## Preparo: oito quadros compactos e textos sem reticências — 15/10/2026

- Pedido posterior substitui o layout antigo de seis quadros: agora são **oito pedidos por página**, **4 × 2 no horizontal** e **2 × 4 no vertical**, no tablet. Paginação e contador usam a mesma constante; a segunda página começa pelo nono pedido, sempre em ordem de emissão.
- Altura dos quadros limitada a 220 pontos na fonte padrão, adaptando-se ao espaço disponível. Retirados os limites de uma linha que cortavam nomes, clientes e observações com “...”. Textos quebram linha e todos os itens ficam disponíveis em rolagem interna, com botões de detalhes, reimpressão autorizada e avanço de status fixos. Detalhes completos e política de reimpressão do portal preservados.
- **17 testes existentes aprovados**, lint, TypeScript e `git diff --check` aprovados. Chromium: **27 verificações aprovadas**, PT-BR/EN/ES e cinco dimensões, incluindo oito cartões visíveis, paginação 1–8/9–12, quebra de nomes longos, alcance do último item, detalhes e reimpressão. Mais **27 verificações aprovadas como Cozinheiro**, com a navegação restrita ao preparo. Capturas de demonstração com pedidos fictícios em `/tmp/bistro-preparation-board-l3L1C1/preparo-oito-pedidos-horizontal.png` e `preparo-oito-pedidos-vertical.png`.
- **Sem push, publicação ou novo APK.** Verificação em navegador com componentes reais; Android e impressão físicos continuam para o teste do proprietário.

## Revisão geral de telas e segurança — 15/10/2026

- **Aplicativo / proporção:** atalhos da Home agora mantêm a mesma largura quando a última linha da grade fica incompleta, inclusive após rotação e com diferentes perfis/módulos. Antes, um único atalho podia ocupar toda a linha.
- **Portal do cliente / telas estreitas:** corrigidos filtros de agrupamento e indicador que ultrapassavam a largura em 320 px. Consultas antigas de métricas deixam de renderizar depois que outra consulta entra na fila; vale para Produção e Vendas, preservando a seleção atual.
- **Permissões:** Admin e Gerente conseguem salvar preços após login offline, sem depender de uma sessão de nuvem. A resolução de conflitos agora exige a permissão atual para o registro, tanto para manter o rascunho quanto para descartá-lo. Reimpressão no Histórico fica desabilitada quando a permissão foi retirada; validação existente no envio permanece.
- **Sessão / sincronização:** resposta 401 atrasada de uma sessão anterior não invalida a sessão de outro operador que acabou de entrar. Removida verificação de tela de Clientes indevidamente presente na recuperação da nuvem; permissão de restauração continua obrigatória.
- Revisão local com contas e bancos sintéticos. Auditoria inicial: **276 testes aprovados**, **261 verificações da hierarquia administrativa**, **132 de ícones/navegação** e **27 do preparo**. Verificação ampliada dos portais/app aprovou **664 cenários**, incluindo sete dimensões de 320×568 a 1280×800, três idiomas e regressão de consulta de métricas com respostas atrasadas. Testes específicos das correções: **33 aprovados**. **324 verificações de perfis e navegação** também aprovadas após o ajuste dos cartões, incluindo larguras iguais em linhas incompletas e bloqueio visual da reimpressão. Lint, TypeScript e `git diff --check` aprovados. **Rodada global final: 279 testes aprovados, sem falhas.**
- **Sem publicação, push ou build de APK**, conforme instrução do proprietário. Esta revisão valida código e telas em navegador; não substitui testes no tablet Android, som e impressão reais. A ativação real da recuperação por e-mail continua pendente conforme a situação registrada abaixo.

## Situação atual da revisão — 14/10/2026

- Os registros abaixo são históricos: publicações posteriores substituem as antigas anotações de “sem deploy” ou “aguardando acesso”. A entrega atual inclui os quatro módulos operacionais, navegação com ícones, senhas administrativas globais, gestão de clientes/grupos/lojas e os quatro perfis de usuário do app descritos a seguir.
- **Painel administrativo e Portal do cliente separados:** `/admin` administra empresas, usuários e configurações; `/gestor` consulta métricas autorizadas por cliente/loja. Contas, sessões e cookies independentes. Perfis do APK não criam nenhum desses acessos automaticamente.
- **Recuperação de senha por e-mail ainda pendente de ativação real:** a consulta aos nomes dos segredos confirmou `RESEND_API_KEY` presente e `BREVO_API_KEY` ausente. O remetente de teste do Resend não atende ao envio para qualquer destinatário cadastrado. O suporte a Brevo já existe no código; faltam a conta/remetente aprovados e a configuração do serviço. Não considerar envio ou recebimento validado.
- Testes de Android físico, som e impressão na POS real continuam com o proprietário. Os resultados de navegador registrados são emulação com componentes reais, sem confirmação de saída de papel.
- Windows e aplicação operacional web permanecem expansão futura solicitada, além dos portais web já existentes. Não apresentar essas plataformas operacionais como implementadas nesta entrega.

## Caixa: acesso ao cadastro de clientes — 14/10/2026

- Perfil **Operador de caixa (Caixa)** inclui **Clientes** na Home, barra inferior e rotas quando o módulo de cadastro de clientes está habilitado. Pode cadastrar, editar, arquivar/reativar e consultar o histórico do cliente, inclusive registrar alterações offline. O módulo funciona independentemente de Caixa e Encomendas.
- Regra compartilhada aplicada no aplicativo e no servidor. Mantidos os bloqueios de módulo, isolamento por loja e restrições de administração de usuários e relatórios financeiros. Desativar Clientes preserva as operações offline pendentes para sincronizar quando habilitado novamente.
- **20 testes de perfis e operações aprovados**, incluindo gravações online/offline do Caixa, reativação do módulo, acesso ao histórico com valores financeiros omitidos e isolamento entre lojas. Lint, TypeScript e `git diff --check` aprovados. Chromium: **318 verificações de perfis/navegação**, quatro perfis, 16 combinações de módulos, três idiomas e seis dimensões. Verificação em navegador; não substitui teste no Android físico.
- **Alteração somente no código local. Não publicada, sem push e sem nova build de APK, conforme pedido posterior do proprietário: “Não precisa subir agora”.** A versão online e os APKs existentes ainda não incluem esta ampliação de permissão.

## Quatro perfis de usuário do app — 14/10/2026

- Perfis comuns ao app e ao cadastro administrativo em **Gerenciar senhas do cliente → Acesso ao aplicativo**: **Admin**, **Gerente**, **Operador de caixa (Caixa)** e **Cozinheiro**. Admin tem todas as funções ativas, incluindo Ajustes com senha horária; Gerente opera tudo exceto Ajustes/recuperação; Caixa usa Início/Pedido/Histórico/Encomendas/Caixa; Cozinheiro usa somente o painel de preparo, com saída disponível no cabeçalho. Módulos desativados não aparecem e não abrem por rota direta.
- Perfil não substitui as contas do Portal do cliente ou do painel administrativo. Conta semanal reservada `admin` segue protegida e global. Contas adicionais do app podem ter perfil Admin, sem ganhar acesso administrativo web. Usuários legados sem perfil recebem Caixa como padrão restrito, sem alteração de senha ou gravação forçada de cadastro. Perfis inválidos são recusados.
- Controle compartilhado em `shared/app-roles.mjs`: menus, URLs, edição offline, sincronização, gravações do servidor, relatórios e leitura da fila. Cozinheiro não recebe cardápio/cadastro de clientes/encomendas pela sincronização; mantém pedidos, preparo e configuração de impressão necessária. Gerente é reconhecido nos relatórios e na edição de preços sem depender da antiga marcação individual. Configurações de aprovação existentes dentro do Caixa e a política de reimpressão do preparo continuam válidas.
- Seleção de perfil no app protegido e no portal, PT-BR/EN/ES. Apenas Admin administra perfis no app; operadores não se promovem pela API ou por gravação offline. Mudanças de perfil/senha/desativação invalidam sessões online antigas; rejeição de sessão encerra o acesso do app. Offline permanece o último perfil recebido até reconectar. Filas de operações que perderam permissão são preservadas sem envio; operações ainda permitidas continuam sincronizando.
- **264 testes globais aprovados**; após a revisão de filtro de leitura/entrada, **12 testes de segurança, idiomas e portal também aprovados**. Lint, TypeScript e `git diff --check` aprovados. Chromium: **321 cenários de perfis**, quatro perfis × 16 combinações de módulos, bloqueio de rotas diretas, relatórios/preços do Gerente, seletor de perfil e seis dimensões × três idiomas; **318 verificações gerais do APK**, **27 de preparo como Cozinheiro** (além da conferência como Admin), **261 de portal administrativo** com gravação do perfil pelo formulário real. Bases e contas sintéticas.
- Publicado somente em homologação: commit `59024e69caea4b4ccf59ee8cf7e2bd1ee7a1340c`, Worker `4bef26da-16fc-4c6d-9671-add2110b4f37`, mantendo variáveis remotas. CI aprovado: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38721475585 . Conferência online autenticada aprovou seletor dos quatro perfis, lista de usuários sem hashes, separação da sessão do Portal do cliente, mesma senha semanal e configurações de lojas preservadas. `/admin`, `/gestor` e `/health` responderam HTTP 200; saúde `ok:true`. Evidência privada em `/tmp/bistro-roles-live-result.json`. Sem migração ou alteração de produção; nenhum usuário real cadastrado, redefinido ou promovido.
- APK de homologação aceito pelo EAS, estado inicial `NEW`: https://expo.dev/accounts/onlybeones-team/projects/matheus-sampaio-homologacao/builds/7ca60887-b221-4210-9077-42591f296262 . Perfil `homologacao`, projeto `2cffbcaa-f4d7-423c-85c7-81131ca55310`, pacote `com.wooxonly.comandadigitalprint.homologacao`. Instalar esta build quando o download ficar disponível para testar os quatro perfis; a aceitação não comprova conclusão da compilação. Todas as correções anteriores estão incluídas no código da build.

## Ícones e navegação dos módulos do APK — 14/10/2026

- Corrigida a causa comum a **Preparo, Encomendas, Clientes e Caixa**: antes tinham atalhos separados sem ícone e não faziam parte da barra inferior. Agora Home e barra compartilham uma lista única, filtrada pelos módulos habilitados da loja. Cada módulo tem ícone local PNG transparente com fonte SVG versionada, sem fonte externa ou dependência de rede.
- Atalhos opcionais recebem o mesmo layout responsivo dos existentes. Barra inferior inclui módulos ativos antes de Ajustes, destaca a tela atual e seus pais (Relatórios → Caixa, detalhes → Histórico, recuperação → Ajustes). Rolagem horizontal em telas estreitas mantém alvos de toque e traz o item selecionado para a área visível; no tablet horizontal a barra comporta os nove itens. Preservado o painel com seis pedidos.
- **28 testes existentes aprovados**, lint, TypeScript e `git diff --check` aprovados. Chromium com componentes reais do APK via React Native Web aprovou **132 cenários específicos**, incluindo as 16 combinações de módulos, ícones locais, seleção, cliques e rotas filhas; **318 verificações gerais de layout** e **27 de preparo**, PT-BR/EN/ES em retrato e paisagem. Testes de Android e impressora físicos continuam separados.
- Correção exclusiva do APK; sem alteração de Worker, banco, senhas ou módulos reais da loja. Código enviado à branch `homologacao`, commit `103a907d11914d2d2afd518fffaee5dd9120ac4f`. Build de homologação aceita pelo EAS, estado inicial `NEW`: https://expo.dev/accounts/onlybeones-team/projects/matheus-sampaio-homologacao/builds/7d1b403b-fb97-465e-a6b2-a7b14b815e9e . Projeto/pacote isolados de produção conferidos. CI: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38666369249 . Não afirmar download pronto enquanto compila; instalar esta nova build quando disponível para receber os ícones e a navegação.

## Senhas administrativas globais e acessos do cliente — 14/10/2026

- Menu principal **Home, Clientes, Gerenciar senhas, Minha conta e Sair**. Home apresenta contagens reais e atalhos. Senha semanal do administrador e senha horária de Ajustes ficam em Gerenciar senhas global, sem escolher cliente, grupo ou loja. Contexto e navegação de loja não aparecem nas páginas globais. Clientes continuam de loja única ou grupos sem camada superior obrigatória.
- Senha semanal `admin` realmente unificada no backend para todas as lojas. Mantida a derivação e revisão da antiga loja padrão para preservar a senha atual de homologação; rotação manual passa a valer globalmente. Credencial pública conserva a identificação da loja para validar o vínculo e usa nova faixa de revisão (`2 ** 48 + revisão global`) para que APKs existentes aceitem a transição mesmo se o cache de outra loja tinha revisão maior. Respostas antigas não revertem a nova credencial. Tablets offline mantêm o cache até sincronizar. Senha de Ajustes continua com a regra horária existente.
- Dentro do cliente/grupo ou da loja, **Gerenciar senhas do cliente** separa acesso ao aplicativo e ao Portal do cliente. Usuários comuns do app são cadastrados/redefinidos/desativados por loja via sessão do proprietário, sincronizam pelo mesmo log de eventos e têm senha não vazia de até 128 caracteres. Portal do cliente reutiliza a gestão de usuários gestores vinculada ao cliente, mínimo de oito caracteres e acesso somente às métricas autorizadas. Uma credencial não cria a outra. Não mostrar hashes ou senhas atuais de clientes.
- Endpoint `/admin/app-users` exige sessão administrativa e seleção válida de cliente/loja; gravações exigem mesma origem, validam entrada, reservam `admin` e usam CAS atômico. Alterar/desativar usuário invalida sessões online anteriores; conflitos não sobrescrevem dados. Senhas vazias na edição preservam o hash salvo.
- **260 testes globais aprovados**, lint, TypeScript e `git diff --check` aprovados. Chromium local: **261 cenários de hierarquia/fluxos** e **252 verificações de portais/layouts**, PT-BR/EN/ES em seis dimensões. Inclui senhas globais sem contexto de loja, duas lojas com mesmo admin mas tokens isolados, rotação, migração de cache no APK existente, cadastro de usuário pelo formulário real, isolamento de cliente e cartão de senhas com resultados cabendo em 1280×720. Testes usam contas e banco sintéticos; não são testes Android físicos.
- Publicado somente em homologação: commit `6191f28f8dd982d8a1f2a112cc1c95bdc3a732bb`, Worker `54168c8c-1b0c-4c63-a440-e64ae02e3092`, mantendo variáveis remotas. Conferência online autenticada aprovou navegação global e lista de usuários protegida, comparou a senha semanal com referência privada anterior (mesma senha) e confirmou configurações de lojas preservadas. `/health` HTTP 200/`ok:true`. CI: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38665738788 . Evidência privada sem senha em `/tmp/bistro-global-password-live-result.json`. Sem migração de banco, nova build de APK ou alteração de produção. Nenhuma rotação, redefinição ou cadastro real de usuário foi feito na verificação online.

## Idioma somente após desbloquear os Ajustes — 15/10/2026

- Seletor de idioma removido da tela **Acesso protegido** dos Ajustes. Dentro dos Ajustes, as bandeiras continuam disponíveis somente após a senha de Configurações ser verificada. Mantidos os seletores de entrada e vinculação inicial do tablet, conforme pedidos anteriores, e o idioma já salvo.
- Sem alteração da senha por hora, verificação, bloqueio ao sair/segundo plano ou permissões. Atualizado o roteiro responsivo existente para conferir ausência das bandeiras antes do desbloqueio e preservação do rascunho durante rotação, mantendo a conferência das bandeiras dentro dos Ajustes.
- **20 testes existentes aprovados**, lint e TypeScript aprovados. Conferência Chromium com telas reais via React Native Web aprovou **318 verificações** em PT-BR/EN/ES e seis dimensões. Android físico permanece para teste do proprietário. Destinos isolados de homologação conferidos; nenhuma alteração do Worker ou banco é necessária. Código enviado à branch `homologacao`, commit `e18d4da50a071aaee005b9b741e57bec11720649`. Nova build aceita pelo EAS, estado inicial `NEW`: https://expo.dev/accounts/onlybeones-team/projects/matheus-sampaio-homologacao/builds/1e0459ad-be44-4467-89a2-0da6831a8653 . Perfil `homologacao`, projeto e pacote separados de produção; não afirmar download pronto enquanto compila. Instalar a nova build quando o download ficar disponível. CI: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38664869829 .

## Salvar e desfazer alterações da loja — 15/10/2026

- “Salvar empresa” substituído por **Salvar**, com **Desfazer** ao lado, em PT-BR/EN/ES. Ambos começam desabilitados e só habilitam quando algum campo difere dos valores carregados. Reverter manualmente todas as alterações também os desabilita.
- Desfazer restaura nome, módulos, taxa, gerentes, reimpressão e permissões, incluindo o bloqueio dos campos de Caixa, sem enviar requisições. Durante o salvamento ambos ficam bloqueados; falhas preservam o rascunho e permitem tentar novamente ou desfazer. Salvamento bem-sucedido recarrega os valores persistidos.
- **25 testes existentes aprovados**, lint, TypeScript e `git diff --check` aprovados. Chromium privado aprovou **45 cenários** em três idiomas: estado inicial, mudança e reversão manual, desfazer todos os campos, falha de gravação com rascunho preservado, bloqueio durante requisição, regressão do Caixa e três dimensões sem rolagem horizontal. Publicado somente em homologação: commit `b752a55cce01bbf14a8ac31e7e3579355ea09998`, Worker `c8bcde05-c199-45c2-8d23-80e484247a06`, mantendo variáveis remotas. Conferência autenticada online confirmou os dois botões inicialmente desabilitados e a lógica nova presente; módulos e configurações preservados, `/health` HTTP 200/`ok:true`. CI: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38664597941 . Mudança somente do portal; não requer APK ou migração. Produção preservada.

## Caixa: módulo e configurações no mesmo bloco — 14/10/2026

- Opção **Usa módulo de caixa (USD)** movida para o bloco **Configuração do Caixa**, tanto no cadastro quanto na edição de loja. Taxa, aplicação de sales tax e seleção de gerentes ficam em fieldset nativamente desabilitado enquanto o módulo estiver desligado; o próprio seletor do módulo permanece utilizável.
- Ativação libera os campos imediatamente; alternar sem salvar preserva os valores do formulário. Ao salvar com o módulo desligado, o payload omite `cashSettings`, preservando no servidor a taxa e os gerentes anteriormente salvos. Campos desabilitados deixam de bloquear a validação dos demais módulos.
- Mensagem de orientação em PT-BR, EN e ES. **25 testes existentes aprovados**, lint e TypeScript aprovados. Conferência Chromium privada aprovou **21 cenários** em três idiomas: agrupamento, bloqueio, alternância com valores preservados, edição ativa, payload inativo omitido, cadastro novo e três dimensões sem rolagem horizontal. Mudança exclusiva do portal: sem alteração do APK ou migração de dados.
- Publicado somente em homologação: commit `03538788c22b657b7cc118bf0e6492b0eb09da09`, Worker `b9c43fd7-a02c-4411-a4a6-9fecdf4d8710`, mantendo variáveis remotas. GitHub Actions aprovado: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38664268006 . Conferência online autenticada confirmou agrupamento e campos bloqueados com Caixa desligado; configurações e módulos permaneceram inalterados. `/health` respondeu HTTP 200/`ok:true`. Produção preservada; sem nova build de APK. Evidência privada sem credenciais em `/tmp/bistro-live-cash-group-result.json`.

## Painel de preparo em grade e reimpressão por loja — 14/10/2026

- Proprietário pediu referência de KDS com pelo menos seis pedidos visíveis no tablet de 11 polegadas, por data/hora de emissão, detalhes e reimpressão configurável no portal. Implementado **3 × 2 horizontal / 2 × 3 vertical**, paginação de seis, desempate estável por ID e comparação de instantes com fusos. Pendentes de dias anteriores permanecem na fila; dia, concluídos, atraso e avisos sonoros têm filtros em janela separada. Cabeçalho e navegação compactados apenas nesta tela.
- Detalhes exibem todos os itens, sabores, adicionais, observações, datas e marcos/atores de preparo, sem mudar o pedido. Reimpressão manual reutiliza a prévia, fila, roteamento e proteção de repetição existentes; não altera status nem cria pedido novo.
- Nova política em **Configurações da loja → Painel de preparo → Permitir reimpressão no painel de preparo**, desligada por padrão. Também exige módulo Preparo e permissão do usuário. Configuração sincronizada/cacheada no tablet; autorização online antes da prévia e novamente antes de enviar, incluindo revogação durante a prévia. Nenhuma impressão automática é disparada ao abrir detalhes ou alterar status.
- Migração incremental em `server/cloudflare/preparation-settings-schema.sql` adiciona somente a política sem reaplicar importações legadas. Esquema geral inclui a tabela para instalações novas. Não ativar módulos ou reimpressão de lojas automaticamente.
- PT-BR/EN/ES completos. Quatro testes específicos aprovados: cronologia/fusos/status/período; opção por loja; autorização por módulo/usuário/loja e revogação; sincronização/cache e falha offline. **258 testes globais aprovados**, incluindo impressão e socket TCP; lint, TypeScript e empacotamento do Worker aprovados.
- Chromium com componentes reais do APK aprovou 27 cenários específicos em cinco dimensões × três idiomas: seis cartões visíveis, paginação cronológica, detalhes completos, ocultação por política e chamada manual da prévia com origem Preparo. Conferência geral do APK aprovou **318 verificações** em seis dimensões/três idiomas, incluindo rotação, formulários e recibos. Teste Android/11 polegadas, som e saída de papel físicos continuam com o proprietário; não apresentar emulação como teste em aparelho real.
- Código enviado à branch `homologacao` no commit `f3a86b0e7ff97898695751563af2618ef0ad4030`; GitHub Actions aprovado: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38663664701 . Backup privado salvo antes da migração incremental; contas administrativas, registros e eventos preservados. Worker publicado com versão `f3eb332a-c317-4be9-9250-177f5d121cde`, mantendo variáveis remotas.
- Conferência online autenticada confirmou opção presente no portal e desligada por padrão, GET de configuração no tablet e POST de autorização bloqueado enquanto desligada. Módulo Preparo da loja de homologação continuou ativo como já estava, sem mudar liberação de módulos; nenhum pedido/status foi alterado, impressão física tentada ou e-mail enviado. Produção somente preservada. Evidência privada sem credenciais em `/tmp/bistro-live-kitchen-result.json`.
- **APK novo aceito e em compilação (`IN_PROGRESS`)**: https://expo.dev/accounts/onlybeones-team/projects/matheus-sampaio-homologacao/builds/edfdb58a-702c-43f9-918c-e8a93b4dcc60 . Perfil `homologacao`, projeto Expo `2cffbcaa-f4d7-423c-85c7-81131ca55310`, pacote `com.wooxonly.comandadigitalprint.homologacao`, commit `f3a86b0`. Download aparece na página quando terminar. A entrega é confirmada na aceitação da build, conforme preferência já autorizada; não afirmar APK pronto enquanto compila. Aplicativo anterior não recebe a grade apenas ao atualizar o portal. Instalar esse novo APK para testar; Android e impressora físicos permanecem no roteiro.

## Clientes, navegação compacta e dados para homologação — 14/10/2026

- Fluxo esclarecido pelo proprietário: **Clientes → cadastro de loja única ou grupo de lojas → loja escolhida**. O grupo Seabra Food não tem cliente/empresa acima. Não criar camada administrativa obrigatória acima dos grupos existentes; preservar IDs, vínculos e contas gestoras.
- Implementado tipo `single`/`group` sobre o cadastro existente, com limite transacional de uma loja para clientes individuais, revisão contra edição simultânea e conversão explícita de tipo. Clientes novos podem vincular lojas existentes sem vínculo ou cadastrar a primeira loja após salvar.
- Logs, histórico, configurações e senhas de tablet ficam dentro da loja escolhida. Senha da conta administrativa em **Minha conta**. A entrada `/admin#password` pede a loja e conserva a intenção de consultar a senha durante a navegação, sem selecionar uma loja automaticamente.
- Administrativo compactado: cabeçalho horizontal em desktop, títulos e espaçamentos reduzidos e cartões de senha semanal/Ajustes lado a lado. Bandeiras 20 × 15 e alvos de toque 44 × 44 preservados. PT-BR, EN e ES; resultados de histórico protegidos contra respostas fora de ordem.
- Proprietário confirmou que os dados anteriores eram de produção e pediu **copiar tudo** para homologação. Backups privados dos dois bancos salvos antes da cópia. Copiados e comparados por conteúdo: 21 registros atuais, 24 eventos por loja, 17 registros legados, 20 eventos legados, diagnósticos, numeração de loja/tablet e revisões semanais. Nome restaurado de produção: Seabra Hunters Creek. Acesso administrativo de homologação preservado; chaves, endpoints e APKs continuam separados. Produção somente lida, sem publicação ou escrita.
- Cópia remota concluída; evidência privada sem conteúdo dos registros em `/tmp/bistro-business-copy-result.json`. Senha semanal deve ser consultada em homologação e usada na loja correspondente; copiar dados não torna a senha de produção válida no outro ambiente.
- Validação de código: 254 testes globais aprovados antes dos últimos ajustes de densidade; 33 testes específicos após esses ajustes aprovados. Lint, TypeScript e empacotamento do Worker aprovados. Chromium aprovou 258 verificações específicas do fluxo de clientes/lojas e 198 de layout dos portais em três idiomas e seis dimensões. Consulta semanal e de Ajustes, inclusive resultados, coube sem rolagem vertical em 1280 × 720 nos três idiomas; formulários reais de cadastro individual, criação de loja e conversão para grupo aprovados. Código commitado e enviado em `38f1ec94c7f81909504dfa3a95675d412cc3c166`; GitHub Actions aprovado: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38661893455 .
- Publicado somente o Worker de homologação, versão `1547886b-8687-48a3-b959-976287391d8f`, mantendo variáveis remotas. Estrutura aplicada com backup; a cópia exata do snapshot de produção foi restaurada após a migração, que reaplicava dois registros legados ausentes na tabela moderna. Conferência por conteúdo preservou as contas e os 21 registros/24 eventos copiados antes da publicação.
- Cadastro **Seabra Food**, tipo grupo, vinculado à loja existente **Seabra Hunters Creek** (`seabra-1`), sem camada de cliente acima e sem alterar ID/código, permissões, módulos ou dados da loja. Verificação autenticada online percorreu `/admin#password` → cliente → loja → consulta semanal; o fragmento foi conservado e as duas senhas couberam em 1280 × 720. Consulta da senha atual, login da API do tablet, 24 mudanças da nuvem contendo cardápio/usuários e vínculo inicial do tablet aprovados. Nenhuma senha foi girada, conta redefinida ou e-mail enviado. Administrador adicional, identidade renovada e logout conferidos. Evidência privada sem credenciais: `/tmp/bistro-live-admin-review-result.json`.
- A consulta genérica `/admin#password` agora apresenta escolha de loja. Acesso específico atual: https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/admin?groupId=18b40997-33ef-4b24-afaf-229a8ae96581&storeId=seabra-1#password . Se um APK já tem cache anterior à cópia, usar **Ajustes → Recuperação de dados → Recuperar da nuvem**, preservando a identidade e as operações locais pendentes; não apagar os dados do app para atualizar o cardápio.
- Alterações exclusivas de servidor/portal e dados: APK de homologação existente continua apontando para a API de homologação. Não é necessária nova compilação Android nesta entrega; validação física de tablet/impressora e ativação real de recuperação por e-mail continuam separadas.

## Administrador adicional em homologação — 14/10/2026

- Proprietário autorizou um novo administrador com o mesmo acesso completo da conta atual, preservando os acessos existentes. Confirmou explicitamente somente homologação e corrigiu o endereço antes do cadastro; credenciais e e-mail da conta real ficam fora do Git.
- Preparado suporte a contas administrativas independentes: senha PBKDF2, identidade e revisão nas sessões, idioma persistente por conta, bloqueio progressivo próprio e vínculo de tablets. Renovação conserva a identidade; troca de senha altera somente a conta autenticada. O proprietário original e seu alias de recuperação mantêm o contrato anterior.
- Recuperação adicional usa destinatário cadastrado e tabela de tokens separada, sem misturar revisões ou redefinir a senha do proprietário. Requer o provedor de envio já configurado; nenhum e-mail real é solicitado no cadastro. Cadastro de gestor continua separado de conta administrativa.
- Validação concluída: **264 testes aprovados**, incluindo 12 cenários de administradores adicionais e 13 de recuperação isolada; lint, TypeScript e empacotamento do Worker de homologação aprovados. Revisões de autenticação e recuperação não encontraram bloqueadores.
- Código enviado à branch `homologacao` no commit `07be122`. Backup privado conferido antes da migração e estrutura aplicada no D1 de homologação. Administrador solicitado cadastrado com senha própria, sem alterar o cadastro anterior; somente o hash e o salt são armazenados.
- Worker de homologação publicado com versão `e7a3526f-019b-43e0-89b8-97be7fe8fa0b`, preservando as variáveis remotas. Login real confirmado, administrativo abrindo por grupos sem loja automática e acesso a `/admin`, `/admin/gestores` e `/admin/stores` HTTP 200; renovação HTTP 204 conservou a identidade adicional, e logout encerrou a sessão. Verificação antes/depois confirmou credencial original, dados e revisões semanais preservados. Evidência privada sem senha em `/tmp/bistro-additional-admin-live-result.json`.
- Entrega concluída somente em homologação. Alteração exclusiva do servidor: o APK atual permanece válido e produção não foi modificada. Nenhum e-mail real de recuperação foi solicitado; a ativação do serviço de envio continua uma pendência separada.

## Impressoras e expansão Android, Windows e web — 11/10/2026

- Proprietário pediu POS de 80 mm com Ethernet RJ45 e Wi-Fi como opção, sem depender de Bluetooth. Aceita adaptação de novos modelos e determinou que o BistroHub operacional também terá Windows e versão web futuramente, além do Android. Essa expansão corresponde às telas operacionais; os portais administrativo/gestor existentes continuam separados.
- Proprietário rejeitou a indicação Epson de aproximadamente US$299 por ser cara; a prioridade passou a ser uma impressora mais econômica. Candidata de compra: **NETUM NT-8330L, USB LAN / US Plug, SKU SHF-NT-8330L-US**, por **US$84,99** no fabricante, antes de frete/impostos. A opção de US$77,99 é USB sem rede e não atende. NT-8360L, USB + LAN / US Plug, é alternativa documentada de US$89,00. Conferir variante e tomada americana; disponibilidade encomendável não prova estoque local nos EUA.
- Essas variantes NETUM LAN não possuem Wi-Fi integrado. Opcionalmente, uma ponte **TP-Link TL-WR902AC** em modo Client liga a porta Ethernet à rede Wi-Fi; oferta B&H de US$39,99, total com NT-8330L **US$124,98** antes de frete/impostos. São duas compras e dois equipamentos alimentados, com cabo Ethernet curto entre eles; não apresentar a ponte como dongle USB ou módulo interno da impressora. Preferir Ethernet direto inicialmente para simplificar.
- Compatibilidade documental com ESC/POS/TCP 9100 confirmada no suporte e SDK oficial NETUM associado a NT-8330/NT-8360L. O exemplo Android abre `initSocket(...,9100)` e envia comandos ESC/POS, inclusive status/corte. Ainda falta homologar a unidade real: acentos, fonte/colunas, corte e falhas/reimpressão. Não há promessa de zero problemas nem recomendação de compra em volume antes desse teste.
- Epson TM-m30III C31CK50022 e TM-T20IV C31CL47002 ficaram como referências técnicas comparadas, não como recomendação dentro do orçamento atual. Protocolo e variantes foram documentados para integração futura; a pesquisa não obriga o projeto a uma marca.
- **Planejado:** separar conteúdo do pedido/recibo, perfil de cada modelo e transporte por plataforma; Android com rede direta, Windows com transporte/driver adequado e web com serviço de impressão na loja ou integração documentada. Navegador comum não reutiliza diretamente o socket TCP nativo do APK. Futuro cadastro de modelos/capacidades, fila por loja/aparelho, IDs de trabalhos, estados de envio/falha e reimpressão explícita para evitar duplicações; impressão física só é confirmada quando houver evidência do equipamento.
- Windows, web operacional, serviço de impressão e perfis adicionais **continuam pendentes de desenvolvimento**. Não houve compra, nova build ou alteração do fluxo atual de impressão nesta pesquisa. Roteiro, fontes e direção técnica em `IMPRESSAO-REDE.md`. Recuperação por Brevo permanece com sua configuração de conta/remetente/chave pendente; esta nova demanda não encerra essa pendência.

## Suporte ao Brevo para recuperação sem domínio — 11/10/2026

- Proprietário escolheu explicitamente **Brevo gratuito, sem domínio**. Manter o endereço original do portal e concluir a ativação quando a conta/remetente de envio estiverem aprovados e a chave Brevo cadastrada com segurança no Cloudflare.
- Preparado transporte opcional `PASSWORD_RESET_PROVIDER=brevo`, com `BREVO_API_KEY`, mantendo Resend como padrão quando a seleção não é configurada. Conta/remetente de envio e endereço de recuperação do portal permanecem independentes; o destinatário vem do servidor e o e-mail original do portal foi preservado.
- O envio Brevo usa sua API REST oficial, remetente verificado chamado BistroHub e texto em PT-BR/EN/ES. Valor de provedor desconhecido ou chave do provedor selecionado ausente desabilita a recuperação; não há fallback para a chave do outro serviço, repetição automática ou aceitação de destinatário arbitrário do formulário.
- Preservados CSRF, origem fixa, cota de solicitações, resposta pública genérica, token aleatório com digest/validade/uso único, transação de senha e limpeza do token em falha de envio. Log operacional contém somente o provedor conhecido e o status HTTP, sem corpo, chave, endereço, ID de mensagem ou token.
- **28 testes específicos aprovados**, com seleção/credenciais de ambos, contrato HTTP 201 Brevo e idiomas, redefinição real em SQLite, limpeza em falha, execução em `waitUntil`, ausência de fallback/repetição e privacidade dos logs. Nenhuma mensagem real ou redefinição da conta do proprietário executada nesta implementação.
- **239 testes globais, lint, TypeScript e empacotamento do Worker aprovados.** Chromium aprovou **36 fluxos e 114 verificações de layout**, Resend/Brevo × PT-BR/EN/ES × seis dimensões, com formulários nativos, CSRF/Origin, senha de oito caracteres, uso único, login recuperado e troca de idioma por GET sem envio/token adicional. Transporte externo exclusivamente simulado. Evidência em `/tmp/bistro-brevo-all-tests.log`, `/tmp/bistro-password-recovery-providers-browser.log` e `/tmp/bistro-password-recovery-fWwSsI`.
- **Ativação real pendente:** conta Brevo aprovada para envio, remetente individual verificado e `BREVO_API_KEY` configurada como segredo no Worker, seguidos da seleção `brevo` e do remetente correspondente. O plano gratuito e a reescrita de remetentes gratuitos foram confirmados nas referências oficiais em `RECUPERACAO-SENHA-PAINEL.md`. A configuração de envio ativa ainda é Resend com remetente de teste; suporte preparado não comprova entrega.
- Código enviado à branch `homologacao`: `4084342ca47cc05046e0a1a70a4659534a8470d0`. Worker publicado com versão `9ea0956b-e9b0-485f-a587-61eda65c968d`. `/admin/recover` respondeu HTTP 200 em PT-BR/EN/ES com a navegação por GET preservada; `/health` HTTP 200/`ok:true`. Conferência remota exclusivamente por leitura, sem novo envio, redefinição, migração D1 ou APK. Produção preservada.
- GitHub Actions do código aprovado (lint, TypeScript e 239 testes): https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38181933457 . Código e publicação do suporte concluídos; a configuração de envio real continua pendente das credenciais/remetente do serviço escolhido.

## Envio de recuperação para o e-mail cadastrado — 11/10/2026

- Proprietário esclareceu que o e-mail do portal deve permanecer o original, independente do endereço usado para criar a conta Resend. `ADMIN_RECOVERY_EMAIL` foi restaurado ao endereço original no Worker de homologação; senha, usuário administrativo canônico e dados preservados. Endereços e valores dos segredos não são registrados no Git.
- O remetente atual de teste, `onboarding@resend.dev`, permite envio somente ao e-mail da conta Resend. A conta informada pelo proprietário usa outro endereço; essa restrição impede o envio ao destinatário original. Para enviar a endereços externos cadastrados, é necessário verificar um domínio próprio no Resend e configurar `PASSWORD_RESET_FROM` com um remetente desse domínio.
- Proprietário informou não ter domínio e escolheu **Brevo gratuito, sem domínio**. Ativar o suporte preparado nesta rodada com remetente individual verificado e aprovação de envio. A opção Brevo foi comprovada nos documentos oficiais: até 300 e-mails/dia no Free após aprovação, API transacional e reescrita do remetente para endereços gratuitos. Sua configuração real permanece pendente. A chave Resend já está presente; formulário habilitado não comprova aceitação ou entrega. O destino continua vindo do cadastro no servidor, nunca de um destinatário arbitrário informado no formulário.
- Somente a configuração do destinatário foi ajustada. Nenhum novo e-mail de teste foi solicitado, nenhum token foi criado por esta sessão e a senha real não foi redefinida. Leitura agregada anterior encontrou dois pedidos na cota de envio e zero links ainda válidos; limites não foram zerados ou contornados. Evidências privadas em `/tmp/bistro-recovery-before-email-fix.json` e `/tmp/bistro-recovery-recipient-restore.log`.
- Destinatário original restaurado e versão `9cf465e5-05cf-4119-900f-ba03d1209b9b` ativa em 100% após a configuração. GET da recuperação respondeu HTTP 200/formulário habilitado. Lint, TypeScript e `git diff --check` aprovados. Atualizações desta rodada no Git são somente documentação; nenhuma nova build ou publicação de código foi necessária.

## Recuperação por e-mail habilitada em homologação — 11/10/2026

- Proprietário cadastrou `RESEND_API_KEY` como segredo no Worker `seabra-cardapio-homologacao`. Presença conferida pelo CLI sem consultar ou expor seu valor; destinatário e remetente continuam configurados como segredos.
- Versão ativa após a configuração: `b28c52f6-8bf6-4162-8309-bc24f95d94d8`, com 100% do tráfego. `/admin/recover` respondeu HTTP 200 em PT-BR/EN/ES com formulário presente, botão de envio habilitado e sem aviso de indisponibilidade.
- Verificação exclusivamente por leitura: não solicita e-mail, cria token ou altera a senha real. A configuração está habilitada; aceitação da chave pelo Resend, recebimento na caixa postal e redefinição ainda dependem do teste real do proprietário. A confirmação pública de solicitação é genérica e sozinha não comprova entrega.
- Evidências: `/tmp/bistro-recovery-activation-pages.json`, `/tmp/bistro-recovery-activation-secrets.log` (somente nomes) e `/tmp/bistro-recovery-activation-deployments.log`. Sem mudança de código, banco ou APK; atualização deste registro não exige outra publicação do Worker.

## Troca de idioma sem reenvio de formulário — 10/10/2026

- Corrigido o aviso nativo de reenvio no Firefox ao trocar o idioma depois de um POST de login. O seletor salva a preferência e navega explicitamente por GET; erros em `/admin/login` e `/gestor/login` retornam à entrada correspondente, com CSRF novo. A navegação substitui a entrada POST do histórico e força um documento novo mesmo com fragmento ou marcador de idioma já igual.
- Preservados PT-BR/EN/ES, preferência por conta/cookie, grupo, loja, parâmetros, fragmento e filtros do Painel do Gestor. Recuperação não repete o envio e redefinição preserva o token válido sem consumir o link, alterar a senha ou guardar credenciais no navegador. A troca não soma falhas nem prorroga bloqueios.
- **229 testes**, lint, TypeScript e empacotamento do Worker aprovados. Chromium e Firefox 157 aprovados: **96 cenários e 380 trocas de idioma**, nos três idiomas, em retrato e paisagem, com métodos das requisições e estado D1 conferidos. Também aprovadas **498 verificações de telas/idiomas/dimensões** e **18 fluxos/57 verificações responsivas de recuperação**. Nenhuma tentativa inválida, mensagem real ou redefinição foi enviada à conta do proprietário.
- Estabilizado o relógio da matriz de telas: pausa um minuto após a instalação para evitar `Cannot fast-forward to the past` quando navegadores executam em paralelo. Essa alteração é exclusiva do teste; a regra de bloqueio do aplicativo continua igual.
- Evidências: `/tmp/bistro-language-navigation`, `/tmp/bistro-language-navigation-chromium.log`, `/tmp/bistro-language-navigation-firefox.log`, `/tmp/bistro-layout-0SRTyO` e `/tmp/bistro-password-recovery-bdYEt3`. Novo roteiro automatizado em `tests/browser/verify-language-navigation.cjs`.
- Correção exclusiva dos portais web compartilhados; o APK atual permanece válido. Publicação autorizada somente em homologação. A chave Resend estava pendente nesta entrega; sua configuração foi confirmada em 11/10, conforme o registro acima. O teste de entrega real continua pendente.
- Código enviado à branch `homologacao`: `3421b36da209ec9002043b38af719c35f7d63fe0`. Worker publicado com versão `a18ce48d-49e8-4ab4-bf3e-d885144ffa5d`. `/admin`, `/gestor` e `/admin/recover` responderam HTTP 200 em PT-BR/EN/ES com a navegação corrigida; `/health` HTTP 200/`ok:true`. Conferência remota exclusivamente por GET, sem afetar tentativas da conta real. Banco e produção não foram alterados. Para substituir uma página POST antiga já aberta, cancelar o aviso e abrir novamente o endereço `/admin`, em vez de recarregar o formulário antigo.
- GitHub Actions do código aprovado (lint, TypeScript e 229 testes): https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38050341726 . Entrega concluída em homologação; o registro posterior modifica somente esta documentação e não exige outra publicação.

## Esqueceu a senha? no administrativo — 10/10/2026

- Proprietário solicitou o botão no login e escolheu recuperação por link de e-mail. Implementados `/admin/recover` e `/admin/reset-password`, com PT-BR/EN/ES, bandeiras compactas, retorno à entrada e nova senha de mínimo 8 caracteres.
- Links aleatórios de 256 bits, digest no D1, validade de 15 minutos e uso único. Senha, consumo do link e limpeza de tentativas são transacionais; revisão revoga as sessões e outros links antigos. CSRF, mesma origem, corpo limitado e limites próprios de envio/redefinição. GET não consome o link. Senha semanal, lojas e contas de gestores preservadas.
- O endereço de recuperação escolhido pelo proprietário também serve de identificador no login/vínculo, com a mesma senha da conta administrativa; usuário original e identidade das sessões mantidos. Destinatário e remetente de teste configurados como segredos somente no Worker de homologação. O endereço não é copiado para o Git.
- **229 testes aprovados**, lint e TypeScript aprovados; **498 verificações existentes de telas/idiomas/dimensões** mais **18 fluxos reais de recuperação e 57 verificações responsivas** em Chromium, PT-BR/EN/ES. Transporte Resend exclusivamente simulado nos testes; nenhuma redefinição da conta real foi feita. Evidência em `/tmp/bistro-password-recovery` e `/tmp/bistro-password-recovery-7priPW`.
- **Configuração habilitada em 11/10:** `RESEND_API_KEY` presente como segredo no Cloudflare Worker `seabra-cardapio-homologacao`; formulário habilitado nos três idiomas. **Pendente:** verificar domínio e configurar remetente autorizado para enviar ao endereço original, confirmar entrega real e testar a redefinição pelo proprietário. Sem a chave, a tela informa indisponibilidade e desabilita envio; não afirma que enviou. Roteiro completo em `RECUPERACAO-SENHA-PAINEL.md`.
- Código enviado à branch `homologacao`: `f5c596c963d371c406c1a14f41d92050469cb5ff`. GitHub Actions aprovado: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38049570486 . Worker publicado com versão `30962ad2-425e-49b8-b22a-4992c0eeb5e8`. `/admin` e `/admin/recover` responderam HTTP 200 em PT-BR/EN/ES, com link visível e envio corretamente desabilitado sem a chave. `/health` HTTP 200/`ok:true` e `/gestor` HTTP 200. Backup privado validado antes da migração; revisão da senha, quantidade de lojas/gestores e política de login preservadas. Nenhum token de recuperação da conta real foi criado.
- Correção limitada ao site/API; o APK de homologação entregue continua atual. Produção preservada e nenhuma build Android redundante gerada. **Código e publicação concluídos; chave configurada, mas remetente de domínio verificado, teste do envio real e redefinição pelo proprietário continuam pendentes.**

## Bandeiras no APK como no portal — 09/10/2026

- Entrada, vínculo inicial, acesso protegido dos Ajustes e Ajustes abertos usam o seletor compacto no canto superior direito, com bandeiras 20 × 15, botões 44 × 44 e seleção verde clara com borda fina. A seleção recebe o mesmo espaço de 12 pixels antes do conteúdo usado no portal.
- Na tela que pede a senha dos Ajustes, o idioma pode ser alterado sem desbloquear configurações; a proteção continua ativa. A preferência salva e os nomes acessíveis Português/English/Español são preservados.
- Prévia em navegador passa a incluir o `SettingsGate` real na rota de acesso protegido, além das telas de login, vínculo e Ajustes. Lint, TypeScript, 20 testes de idioma/autenticação e **498 verificações de telas/idiomas/dimensões** aprovados; trocar o idioma preserva a senha em digitação e mantém os Ajustes bloqueados. Capturas da entrada e dos Ajustes em 600 × 960 e 960 × 600 conferidas. Evidência em Chromium/React Native Web; teste físico Android permanece no roteiro.
- Código enviado à branch `homologacao`: `b4462b7403519509ef88efa14ac4b5f7f7844dd4`. Validação GitHub aprovada (lint, TypeScript e 211 testes): https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38008080457 . Destinos exclusivos de homologação conferidos pelo publicador; o Worker da regra de cinco erros já está publicado e não foi alterado nesta rodada.
- **APK atualizado concluído (`FINISHED`)**: https://expo.dev/accounts/onlybeones-team/projects/matheus-sampaio-homologacao/builds/e603baa1-8846-4d4b-8fcd-19ec914ea7e6 . Expo confirmou perfil `homologacao` e commit `b4462b7`; aplicativo **BistroHub Homologação**, pacote `com.wooxonly.comandadigitalprint.homologacao`. Finalizou em 09/10/2026 às 20h33, horário de Nova York. Essa é a build mais recente, com as bandeiras também no acesso protegido dos Ajustes. [Download do APK](https://expo.dev/artifacts/eas/eOt-6UVhZtwsj_bK8CEOYu0gdSs7hu7IteD4pS7zF9I.apk) conferido com HTTP 200 e disponível para instalar/testar.
- Conferência final após a solicitação de publicar tudo: GitHub Actions da documentação `3ccf152` aprovado (https://github.com/WooxOnly/Comandadigitalprint/actions/runs/38008188367), branch enviada e sem mudanças de código pendentes. Worker `e388d05c-d6a4-4216-9973-b76b202a26fe` ativo em 100%; `/admin`, `/gestor` e `/health` responderam HTTP 200/saúde `ok:true`. APK e Worker já contêm todo o código atual; alterações posteriores aos commits publicados são somente documentação. Entrega completa em homologação, disponível para os testes físicos do proprietário.

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

## Movimento da demonstração — 21/10/2026

Ajuste em homologação: sexta > sábado > domingo > quinta > quarta > terça > segunda, com segunda mais fraca. Pedidos fictícios somente entre 07h e 22h de Orlando; café da manhã 07h30–10h, almoço fraco e retomada no fim do dia. Sexta concentra movimento das 17h às 21h, sobretudo 18h–20h. Preservar o total de pedidos e as durações exatas de cada etapa do TMA, além de Kainan, Davi, Carla e Elizabeth. Aplicação por workflow manual `retime-demo-flow.yml`, com cópia prévia, eventos protegidos por revisão e conferência após a escrita; não requer publicação/APK.

Movimento aplicado e verificado: execução `39596516985` concluída com sucesso. Preservados 7.732 pedidos fictícios, os 73 de hoje, nove exemplos ativos, nomes e durações exatas de todas as etapas. Consulta real do painel confirmou sexta > sábado > domingo > quinta > quarta > terça > segunda. Horários fictícios entre 07h e 22h. CI, lint, TypeScript e cinco testes direcionados aprovados. Não há pendência desta redistribuição; atualizar o portal e sincronizar o tablet para obter os eventos.

## Escopo corrigido: somente dados da demonstração — 21/10/2026

O usuário rejeitou mudanças no padrão do relatório. A alteração de ordem das horas/cartão de pico (`0485169`) foi integralmente revertida por `d63fa6b`, antes de qualquer publicação. Mantidos o portal e suas regras anteriores. A consulta real (`39615440835`) confirmou zero pedidos às 00h e fora de 07h–22h nos últimos sete dias; 12 PM representa meio-dia. O pico de hoje às 7h vinha dos nove exemplos ativos fictícios concentrados na abertura. O modo manual `morning-queue` ajusta somente esses nove pedidos e suas nove preparações para 08h10–09h35, preservando cada duração/operador/status, todo o histórico finalizado, totais e demais dados. Usa backup e eventos protegidos por revisão; não requer APK ou publicação do portal.

Ajuste dos nove exemplos atuais concluído e verificado na execução `39616138601`: 18 registros alterados, 73 pedidos de hoje preservados, pico de hoje às 8h, durações exatas mantidas. O usuário ampliou em seguida a conferência para TODO o histórico de pedidos da loja, sem limite de data e sem restrição ao prefixo demonstrativo. A ferramenta `normalize-store-hours.mjs` e o workflow manual `normalize-store-hours.yml` percorrem todos os pedidos/preparos de seabra-1, mantêm horários válidos e corrigem os demais para 07h–22h local com backup/eventos protegidos. Incluem testes com pedidos de 2024, sem prefixo, mudança de horário de verão e conflito de revisão. Nenhuma mudança de padrão do relatório nem publicação/APK.

Conferência integral concluída na execução `39617846309`, commit `1724a2e`, em 21/10/2026. Foram lidos TODOS os 7.740 pedidos existentes de seabra-1, entre 23/06/2026 e 21/10/2026, sem corte de data/prefixo. Encontrados dois pedidos antigos fora do funcionamento; corrigidos seus horários e os respectivos preparos (quatro registros), preservando as durações exatas e a data local. Verificação final: zero vendas fora de 07h–22h e zero à meia-noite; pico de hoje permanece às 8h. Os registros válidos permaneceram intactos. Backup D1 `demo_hours_backup` e artefato privado `homologacao-all-history-hours-backup` (sete dias). CI `39617766028`, oito testes direcionados, lint e TypeScript aprovados. UI anterior mantida; nenhuma publicação/APK.

## Fluxo obrigatório de Caixa — planejamento para o fim de semana, 22/10/2026

Requisitos registrados pelo proprietário para a próxima etapa, sem implementação/publicação nesta conversa:

- Quando o cliente utiliza o módulo de Caixa, só permitir criar/confirmar um novo pedido com um caixa aberto. Cobrir os caminhos de pedido que serão mapeados na revisão do fluxo; não limitar a regra à aparência de um botão. Clientes sem o módulo continuam com o fluxo normal de pedidos.
- Na abertura, registrar o operador autenticado que abriu o caixa e a data/hora efetiva da abertura. Manter vínculo auditável entre a abertura e os pedidos/movimentações desse caixa.
- Oferecer valor inicial em dinheiro para troco, opcional, aceitando zero quando não houver fundo inicial. Deve ser disponível para a operação no Brasil e nos Estados Unidos, respeitando a moeda da operação.
- Classificar esse valor como saldo/fundo inicial do caixa, separado de vendas e faturamento. Preservá-lo para a futura conferência do fechamento.
- Esta é a definição inicial do fluxo de Caixa para trabalhar no fim de semana. A revisão completa de pagamentos, fechamento e integração pedidos/cozinha/encomendas continua na etapa de desenho já registrada; não considerar esses detalhes novos como decididos nem iniciar APK/publicação por este planejamento.

## Complemento do fluxo de Caixa — gorjeta, pagamentos e fechamento, 22/10/2026

Requisitos consolidados em [PLANEJAMENTO-FLUXO-CAIXA.md](PLANEJAMENTO-FLUXO-CAIXA.md), para retomar em um possível momento no fim de semana: tip opcional na finalização, com 18%, 20%, 22%, Outro e possibilidade de não dar gorjeta; discriminar produtos, imposto e gorjeta. Confirmar antes da implementação a incidência do imposto e a base de cálculo da tip, sem assumir que gorjeta voluntária é tributada. Formas iniciais: dinheiro, CC (crédito), CD (débito), com bandeira Visa/Mastercard separada do tipo. Registro manual de pagamentos, sem pinpad nesta fase e prevendo integração futura. Desenhar fechamento diário/conferência completa preservando o fundo inicial de troco e detalhando vendas/impostos/gorjetas/formas/bandeiras. A sequência operacional e regras ainda abertas serão definidas no desenho; pedido programado será tratado depois. Somente registro de requisitos, sem implementação, APK ou publicação.

## Complemento contínuo do planejamento de Caixa — layout e relatórios, 22/10/2026

Proprietário pediu manter registradas todas as demandas que for lembrando para a retomada no fim de semana. Atualizado [PLANEJAMENTO-FLUXO-CAIXA.md](PLANEJAMENTO-FLUXO-CAIXA.md): detalhar cada operação do fluxo; mostrar valores dos produtos/pedido quando o módulo Caixa estiver habilitado, preservando o layout aprovado em celular/tablet/PC e distinguindo habilitação do módulo de caixa aberto. Incluir histórico e detalhamento dos últimos fechamentos, relatório de valores/quantidades de vendas e ticket médio, conciliando os valores com o fechamento e separando saldo inicial, vendas, impostos e gorjetas. A base exata do ticket médio e o tratamento de descontos/cancelamentos/estornos permanecem para definição. Revisar e complementar o financeiro existente sem duplicar relatórios ou alterar o fluxo de produção. Apenas requisitos registrados; sem implementação ou publicação.
