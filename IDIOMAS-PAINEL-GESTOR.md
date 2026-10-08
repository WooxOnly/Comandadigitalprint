# Idiomas e termos do Painel do Gestor — 08/10/2026

O login e as áreas de produção e vendas do portal `/gestor` estão disponíveis em português brasileiro, inglês e espanhol. A escolha abrange títulos, filtros, cartões, tabelas, gráficos, textos explicativos e mensagens de erro. Datas dos relatórios, números e valores usam respectivamente `pt-BR`, `en-US` ou `es-ES`; o calendário nativo dos campos de data segue as configurações do navegador. A moeda continua USD; trocar o idioma não converte valores nem altera o fuso selecionado.

## Preferência de cada usuário

- Sem login, o portal usa a escolha anterior do navegador ou seu idioma preferido. Idiomas não atendidos usam inglês. A opção escolhida na tela de entrada fica lembrada no navegador e é aplicada à conta após um login válido.
- Com login, a escolha fica gravada no D1 para o próprio usuário gestor. Continua após recarregar, sair/entrar e acessar por outro navegador ou computador. Cada usuário mantém sua escolha, inclusive quando compartilha o navegador com outro usuário.
- Uma escolha explícita na tela de entrada tem prioridade no próximo login; depois de aplicada, é removida essa escolha temporária. Sem nova escolha, a preferência da conta prevalece sobre a do navegador.
- Trocar o idioma conserva a área aberta, a loja selecionada, datas, fuso, intervalo de TMA e opções dos gráficos durante o recarregamento. Se a loja deixou de estar autorizada, o painel mostra indisponibilidade e não amplia automaticamente a seleção para todas as lojas.
- Falhas ao salvar mostram uma mensagem no idioma atual e mantêm a seleção anterior. Uma sessão expirada pode lembrar o idioma no navegador, mas não alterar a conta sem um novo login válido.
- A preferência não muda permissões, lojas, módulos, senha nem revisão da sessão. Nomes cadastrados de clientes, lojas, produtos, categorias e operadores são preservados.

O administrativo `/admin` e o cadastro `/admin/gestores` também estão disponíveis em PT/EN/ES, com preferência própria do proprietário gravada no D1. A preferência de cada gestor é independente do proprietário e do idioma de cada tablet. O APK permite escolher a língua inclusive no login. Regra permanente, refinamento de dimensões e roteiro físico em `REFINAMENTO-IDIOMAS-TABLETS.md`.

## Vocabulário das métricas

Não há uma única sigla internacional equivalente a TMA para todos os negócios. A tradução descreve a medida disponível no BistroHub e mostra seu intervalo para que o cliente não confunda produção do pedido com o atendimento completo da mesa.

| Português | Inglês | Espanhol | Definição no BistroHub |
| --- | --- | --- | --- |
| TMA | Average fulfillment time | Tiempo medio de servicio del pedido | Emissão do pedido até o registro de Finalizado. |
| TMA até pronto / Total até pronto | Average time to ready | Tiempo medio hasta listo | Emissão até o registro de Pronto. |
| TMA de preparo / Preparo médio | Average prep time | Tiempo medio de preparación | Início do preparo até Pronto. |
| Espera média | Average wait time | Tiempo medio de espera | Emissão até início do preparo. |
| Pedidos por hora | Orders per hour | Pedidos por hora | Volume por hora abrangida pela consulta, incluindo horas sem pedidos. |
| Horário com mais pedidos | Peak order hour | Hora con más pedidos | Faixa horária de maior quantidade de pedidos. |
| Produtividade por operador | Staff activity | Actividad por empleado | Contagens de etapas registradas por usuário; não mede trabalho exclusivo. |
| Ticket médio | Average check | Ticket medio | Produtos após desconto divididos pela quantidade de vendas, antes de devoluções e sem imposto, gorjeta ou entrega. |
| Vendas brutas | Gross sales | Ventas brutas | Valor dos produtos antes dos descontos e devoluções. |
| Vendas líquidas | Net sales | Ventas netas | Produtos após descontos e devoluções, sem imposto, gorjeta ou entrega. |
| Recebimentos líquidos | Net payments | Cobros netos | Pagamentos após devoluções; inclui imposto, gorjeta e entrega. |
| Cancelamentos | Voids | Anulaciones | Vendas canceladas. |
| Estornos | Refunds | Devoluciones | Devoluções de valores registradas no Caixa. |
| Fechamentos de caixa | Cash drawer closeouts | Cierres de caja | Fechamentos com dinheiro esperado, contado e diferença. |
| Diferença | Over/short | Diferencia | Dinheiro contado menos dinheiro esperado. |

Selecionar outro intervalo de TMA atualiza também o nome em cartões, tabelas, gráfico e cabeçalho dos pedidos finalizados por operador. Só entram na média os pedidos com ambos os horários registrados. O intervalo inicial não inclui espera anterior à emissão nem comprova o momento de entrega ao consumidor; depende do avanço de status no tablet.

## Pesquisa e fontes

Consulta em 08/10/2026 a materiais de plataformas usadas em restaurantes:

- [Toast — Understanding average fulfillment timers](https://doc.toasttab.com/doc/platformguide/platformKitchenAvgFullfillmentTimer.html): usa **average fulfillment time** para o intervalo entre envio à cozinha e conclusão, distinguindo níveis de conclusão por estação/expedição. O BistroHub qualifica o intervalo pelos seus próprios registros.
- [Lightspeed — KDS Statistics](https://k-series-support.lightspeedhq.com/hc/en-us/articles/4403156122651-KDS-Statistics): usa tempos médios de preparação em estatísticas de cozinha. Fundamenta a separação do tempo de preparo.
- [TheFork Manager Espanha — Melhorar os tempos de serviço](https://www.theforkmanager.com/es/blog/gestion-restaurantes/mejorar-tiempos-servicio-restaurante): emprega conceitos de tempo de serviço, preparação e espera. O ciclo completo descrito inclui etapas do cliente que não medimos; por isso adotamos **del pedido** e exibimos as duas etapas do intervalo.
- [Toast — Locations Reports Overview](https://support.toasttab.com/en/article/Locations-Reports-Overview): utiliza vendas brutas/líquidas e ticket médio nas métricas de restaurantes com várias unidades.
- [Toast — Sales contest reporting](https://support.toasttab.com/en/article/How-can-I-set-up-a-sales-contest-at-my-restaurant): usa **average check** para a média por venda. O painel informa o cálculo exato do BistroHub.
- [TheFork Manager Espanha — Administração de restaurantes](https://www.theforkmanager.com/es/blog/como-administrar-un-restaurante): utiliza **ticket medio** em indicadores comerciais.

## Entrega e verificação

O esquema reaplicável `server/cloudflare/store-schema.sql` agora inclui `manager_user_preferences` e `panel_preferences`. Deve ser aplicado em homologação antes de publicar o Worker atualizado; não altera registros existentes nem cria contas. O comando de entrega já preparado reaplica esse esquema. Os portais não acrescentam dependência nativa; as correções posteriores da interface do tablet precisam do APK atualizado.

Testes automatizados em `tests/manager-language.test.cjs` cobrem detecção regional, login, persistência entre navegadores/contas, autorização, sessão expirada, validação de entrada, falha do D1, esquema reaplicável, traduções e scripts das páginas. A verificação real em Chromium cobre os três idiomas, métricas, valores USD, troca de área/filtros, falha ao salvar e largura de 390 px. A validação local não representa publicação em homologação.

Para testar: escolher cada idioma; consultar uma loja e um grupo; variar os três intervalos de TMA; trocar recortes do gráfico; abrir vendas e conferir USD; sair/entrar; abrir outro navegador; alternar dois usuários; e verificar que a preferência de um não altera a do outro.
