# Fechamento das demandas — 19/10/2026

Este é o estado consolidado. Os registros mais antigos de `PENDENCIAS.md` são históricos: frases como “somente prévia”, “sem publicar”, tema no canto direito, TMA por hora ou falta de acesso Cloudflare/Expo não descrevem mais a entrega atual.

## Demandas conferidas no código e nas evidências

| Item | Resultado |
| --- | --- |
| 1. Proporção do Pedido em paisagem | Pedido atual com 34% da largura útil; catálogo com o restante; dados com 124px e produtos com 76px, conforme valores enviados pelo proprietário. |
| 2. Identificação do pedido | Mesas compactas, Outra mesa e Avançar na mesma linha no tablet; sem sobreposição; expansão acessível para erros/fontes grandes. |
| 3. Pedido atual em retrato | Fixo, com rolagem dos itens independente do catálogo. |
| 4. Finalizar pedido | Dentro de Pedido atual nas duas orientações; sem subtítulo de impressão. |
| 5. Busca | Recolhida na lupa junto das categorias; consulta ativa continua visível. |
| 6. Subgrupos | Primeiro toque mostra todos da categoria; segundo abre seleção; sem linha adicional. |
| 7. Categorias/favoritos | Aperitivos primeiro quando disponível, Todos por último; retirado Somente favoritos do Pedido. |
| 8. Produtos e ingredientes | Ingredientes no ⓘ; + preserva configuração/observações. Em paisagem, nomes em até duas linhas, completos ao abrir o produto e na acessibilidade. Preço continua condicionado ao módulo Caixa. |
| 9. Marca | BistroHub e slogan Do caixa à cozinha.; abertura com marca e fundo claro/grafite configurada. Home preservada conforme decisão posterior do proprietário. |
| 10. Aparência/idiomas | Switch compacto e seletor com bandeira/seta, juntos à esquerda no app e nos portais; tema grafite; preferência local persistente. Idioma de Ajustes somente após desbloqueio. |
| 11. Entrada do cliente | Logo e identidade compartilhadas; e-mail normalizado sem capitalização forçada; conta independente do aplicativo. |
| 12. Navegação do cliente | Cadastro do cliente, Usuários App e Usuários Painel do gestor separados; atalhos organizados num único grupo responsivo. |
| 13. Acesso por senha/convite | Senha manual ou convite de uso único por 24h, reenvio e falhas explícitas. Migração aditiva de convites aplicada em homologação. |
| 14. Conclusão do preparo | Opção por loja para usar Finalizar; desabilitada, Pronto conclui diretamente. Política disponível no cache offline. |
| 15. Desfazer preparo | Própria última ação em até 60s sem credenciais extras; depois, permissão local ou outro usuário autorizado em cache. Sem internet e sem trocar a sessão. |
| 16. Filtros gerais dos relatórios | Loja/período/datas/atualização em uma linha; abre em Hoje; sem fuso/mês separados. Datas manuais e calendário realmente editáveis. |
| 17. Relatórios compactos | Indicadores menores; duas colunas, adaptadas para celular; detalhes em popup pelo + e filtros pelo funil à direita do +. |
| 18. Volume por hora | Gráfico com eixos L; quantidade no dia e média por horário nos períodos maiores; sem a linha textual dispensada pelo proprietário. |
| 19. Gráficos de pizza | Produtos, categorias e lojas; totais corretos e anel vazio explícito quando não há pedidos. |
| 20. TMA | Uma média ponderada do período; detalhes e intervalo no próprio indicador; sem gráfico de TMA por hora. |
| 21. Produtividade | Cozinha por usuário de preparo, separada de quem apenas confirma entrega; detalhes de pedidos retirados dessa página. |
| 22. Entrega | Actions com versões atuais de Node; credenciais existentes reutilizadas; destino exclusivo de homologação e geração do APK sem acompanhamento. |

## Publicação

- Portais: mudanças compartilhadas de aparência/idioma publicadas em `ecc4914`; entradas `/admin` e `/gestor` conferidas por HTTP com o novo switch/dropdown. Alteração posterior `5e9c22f` modifica somente o layout do app e seus testes/documentação; não existe mudança web aguardando publicação.
- App: código de entrega `5e9c22f08ed9b1cadc773ef1d6c8a35bfc065b42`, incluindo as preferências compactas e a proporção aprovada. Entrega solicitada: https://github.com/WooxOnly/Comandadigitalprint/actions/runs/39209635785 . Não houve acompanhamento da compilação nem confirmação de APK pronto.
- Sem alterações de código local fora da entrega. Este fechamento é documental e não exige outra geração de APK. Produção permanece fora do escopo autorizado.

## Validação

- Último ajuste: 18 cenários de Pedido com medições de 34%/124px/76px; 42 de identificação; 54 de catálogo/detalhes/preço/rotação, nos três idiomas e dois temas. Lint e TypeScript aprovados.
- Preferências compartilhadas: 450 cenários de aparência, 90 de seletores compactos do app, 48 cenários/190 trocas de idioma dos portais e 18 de login do cliente aprovados na entrega anterior. Resultados reutilizados porque não houve nova mudança nesses componentes.
- Saúde pública, entradas dos portais e recuperação responderam HTTP 200; relatórios sem sessão responderam 401. Nenhuma conta real foi alterada nem convite real enviado para testar.
- Revisão final: 336 testes da suíte completa aprovados, zero falhas. Destinos de publicação conferidos pelo comando `publicar:homologacao -- --check`: Worker, projeto Expo e pacote Android exclusivos de homologação.

## O que permanece separado da entrega de código

1. Instalar/conferir o novo APK no tablet real, com impressão na impressora e validação do turno/offline entre aparelhos. Navegador e testes sintéticos não comprovam o hardware.
2. Confirmar chegada real de recuperação/convites no e-mail, com provedor/remetente autorizados e acesso à caixa. Código e testes de integração estão concluídos; GET do formulário não comprova entrega.
3. Integração operacional completa de Encomendas/cozinha/caixa continua expressamente adiada pelo proprietário. Não foi implementada como parte desta rodada.

Não foi encontrada outra demanda aprovada de código pendente nesta revisão. A conclusão do APK é informada pelo workflow; sua geração não foi acompanhada, conforme preferência do proprietário.
