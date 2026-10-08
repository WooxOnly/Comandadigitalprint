# Código e telas concluídos — 08/10/2026

Escopo da versão combinada, com as ampliações de 07/10 e 08/10 na branch `homologacao`. O desenvolvimento foi concluído e a entrega foi autorizada em 08/10: commit/push, publicação de homologação e APK exclusivo para teste. O andamento e os resultados efetivos ficam em `PENDENCIAS.md`; este inventário descreve o código concluído, sem afirmar que a publicação/build já ocorreu.

| Área | Código e telas disponíveis |
| --- | --- |
| Administrativo BistroHub | Quatro módulos independentes por loja: Caixa, Encomendas, Cadastro de Clientes e Preparo. Configuração de sales tax e gerentes; permissões do tablet; cadastro de cliente/grupo, lojas vinculadas e usuários do Painel do Gestor. PT/EN/ES no login, telas e mensagens, com preferência do proprietário persistente. |
| Encomendas | Agendamento com cliente/contato, retirada ou entrega, itens e status; agenda vinculada ao módulo; responsável, taxa, despacho e confirmação de entrega. |
| Clientes | Cadastro, busca, edição, endereços, arquivamento e histórico; uso independente ou vínculo opcional com Encomendas/Caixa. |
| Caixa | Abertura, venda própria, preço no cardápio quando habilitado, dinheiro/cartão/Zelle, pagamentos divididos, troco, gorjeta, entrega, entradas/saídas, fechamento, recibo não fiscal e reimpressão. |
| Controle financeiro | Gerentes/administradores autorizam descontos, alteração de preço, cancelamentos e estornos integrais/parciais; imposto configurável e inicialmente desligado; relatórios e CSV no tablet. |
| Tablet da cozinha | Recebido → Em preparo → Pronto → Finalizado; horários e operadores por etapa; destaque de atraso; aviso visual e som opcional com painel aberto; sincronização e avanços offline. |
| Painel do Gestor — produção | Loja ou grupo; TMA selecionável, espera/preparo/tempo até pronto; quantidade e média de pedidos por hora, dia da semana, dia e mês; filtros de datas/fuso; produtos/categorias mais pedidos, operadores e detalhes. Exige Preparo habilitado. |
| Painel do Gestor — vendas | Vendas/recebimentos líquidos, ticket médio, descontos/imposto/gorjeta/entrega, devoluções, pagamentos, recortes de período, lojas, produtos/categorias, operadores, fechamentos e últimas operações. Exige Caixa habilitado. |
| Painel do Gestor — idiomas | Login, produção e vendas em PT/EN/ES; preferência persistente por usuário em outros navegadores; datas/números/USD localizados; troca conserva área e filtros; termos comerciais pesquisados e intervalos das métricas explícitos. |
| APK — idiomas e dimensões | PT/EN/ES selecionáveis no login, vinculação e Ajustes; revisão de mensagens/acentos/acessibilidade, correções de nomes longos e navegação, prévia com oito destinos roláveis e rodapé adaptado a paisagem. |
| Operação existente | Busca/favoritos/esgotados, permissões, destinos de impressão por categoria, logs/atividades e recuperação de dados. Módulos adicionais desligados não alteram o fluxo existente. |
| Impressão pela rede | ESC/POS/TCP com IP/porta/papel; opção por tablet de imprimir automaticamente comandas novas após salvar, desligada por padrão; prévia para tentativa manual em falha, conservando destinos já confirmados. |

Os acessos do gestor são criados somente pelo administrativo do BistroHub. Cada consulta verifica sessão, vínculo com as lojas ativas e módulos liberados. Desligar um módulo preserva seus registros e impede novas operações/consultas correspondentes. Clientes, Encomendas, Caixa e Preparo não exigem uns aos outros.

## Verificação desta rodada

- **194 testes automatizados aprovados** (184 CJS e 10 MJS), incluindo isolamento, módulos independentes, cálculos financeiros compartilhados, estornos de vendas antigas, pagamentos divididos e limites sem totais cortados; produtos/categorias, operadores, histórico sem tempos e proteção de campos conhecidos; impressão após salvar, bloqueio de duplicação e tentativa manual de destinos pendentes; idiomas nos três ambientes, cobertura de traduções, persistência por proprietário/gestor e navegador, sessão expirada, falha ao salvar, validação e esquema reaplicável.
- Lint e TypeScript sem erros.
- Navegador Chromium com dados sintéticos: cadastro no administrativo, login do gestor, grupo de duas lojas, produção/produtos/operadores, telas e gráficos financeiros, mudança de módulos com sessão aberta, filtros rápidos durante resposta lenta, largura de 390 px e revogação de usuário. Sem erro de JavaScript.
- Verificação adicional em Chromium nos três idiomas: login/erro de credencial, preferência após sair/entrar e em outro navegador, duas contas no mesmo navegador, nomes cadastrados preservados, filtros/área mantidos ao trocar idioma, métricas e USD localizados, falha ao salvar, mensagem de módulos indisponíveis e largura de 390 px. Sem erro de JavaScript.
- Refinamento mais recente: **432 combinações** de telas/idiomas e seis dimensões em retrato/paisagem. Portais executados pelo Worker real; componentes do APK renderizados por React Native Web com serviços sintéticos, formulários abertos, relatório, rotação com cliente preenchido e oito destinos. Testes físicos permanecem necessários; roteiro em `REFINAMENTO-IDIOMAS-TABLETS.md`.
- Exportação Android local com destino exclusivo de homologação e áudio incluído. É verificação de JavaScript/assets, não APK.
- Worker empacotado localmente com `wrangler deploy --dry-run`, ligado à configuração de homologação. Não é publicação.

Logs locais: `/tmp/bistro-manager-completion-full.log`, `/tmp/bistro-manager-completion-browser.log`, `/tmp/bistro-manager-completion-lint.log`, `/tmp/bistro-manager-completion-tsc.log`, `/tmp/bistro-manager-completion-android.log` e `/tmp/bistro-manager-completion-worker.log`.

Ampliação inicial de idiomas: `/tmp/bistro-manager-language-full.log`, `/tmp/bistro-manager-language-browser.log`, `/tmp/bistro-manager-language-lint.log`, `/tmp/bistro-manager-language-tsc.log` e `/tmp/bistro-manager-language-worker.log`. A ampliação seguinte também ajusta a interface do tablet e foi exportada novamente; evidência atual nos arquivos `/tmp/bistro-refinement-*.log`, detalhados em `REFINAMENTO-IDIOMAS-TABLETS.md`.

## Limites definidos para esta versão

- Cozinha recebe avisos enquanto o painel está aberto e o app ativo; notificações com aplicativo fechado ou em segundo plano ficam para uma etapa futura. A versão própria do gestor para celular também foi prevista para depois; o portal atual é web.
- Preparo e produtividade usam os registros disponíveis. Tempos/operadores históricos ausentes não são inventados. O operador de uma etapa representa quem registrou o avanço no tablet; um login compartilhado reúne essas atividades. Os recortes de produção usam a emissão dos pedidos e o status atual.
- Métricas financeiras aceitam até 10.000 operações/fechamentos no período selecionado; acima disso a consulta inteira pede período menor ou uma loja. Totais nunca usam uma lista cortada. Tabelas de detalhes e rankings têm limites explícitos de apresentação.
- Cartão/Zelle são recebimentos confirmados externamente e registrados no Caixa; o aplicativo não processa a transferência. Impressão não confirma fisicamente a saída do papel. Uma falha não dispara repetição automática.
- Complementos de uma comanda foram excluídos pelo usuário. Edição/reagendamento geral de encomendas pertence à etapa que ele pediu para pular; essas funções não foram incorporadas ao escopo desta versão.

Detalhes funcionais em `MODULOS-ENCOMENDAS-CAIXA.md`, `MELHORIAS-OPERACIONAIS.md`, `PREPARO-PAINEL-GESTOR.md`, `IDIOMAS-PAINEL-GESTOR.md`, `REFINAMENTO-IDIOMAS-TABLETS.md` e `IMPRESSAO-REDE.md`. A próxima etapa de entrega reaplica o esquema, incluindo `manager_user_preferences` e `panel_preferences`, e gera o APK atualizado, seguida do teste com os aparelhos. O refinamento de idiomas/dimensões não introduz dependência nativa.
