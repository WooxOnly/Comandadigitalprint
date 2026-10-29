# Revisão geral — 29/10/2026

Revisão dos fluxos existentes do aplicativo, versão web, administrador, gestor e cardápio público. Foram corrigidos problemas confirmados e executadas as suítes disponíveis. Isso não comprova ausência de outros defeitos nem substitui validação em dispositivos físicos. A entrega é somente na web de homologação; nenhum APK ou OTA foi solicitado.

## Correções realizadas

### Botões e confirmações na web

O `Alert.alert()` fornecido pela versão instalada do React Native Web não executava nenhuma ação. Além do problema de preparo corrigido anteriormente, isso afetava confirmações e mensagens de outras telas: excluir produto, arquivar cliente, aceitar/recusar pedido online, encomendas/entregas, recuperação de backup e fechamento de caixa.

Foi criada uma implementação comum de alertas para web, mantendo o Alert original no Android/iOS. A janela respeita o tema e os textos do chamador, permite cancelar, impede executar novamente uma confirmação já consumida e aparece acima de um editor que já esteja aberto. Trocar de usuário/sair limpa as ações pendentes. Não há gravação ao cancelar.

As transições intermediárias do preparo continuam diretas; a confirmação explícita de finalização e a política de conclusão automática existente foram preservadas. Não houve alteração de proporções das telas ou permissões.

### Consultas de pedidos online

Cada consulta periódica regravava os IDs já vistos e atualizava o contexto, mesmo com resposta idêntica. Agora o armazenamento só recebe IDs diferentes e o contexto só recebe uma resposta diferente. A frequência de consulta e as regras de recebimento, aceite e som foram preservadas. Atualização manual continua com indicador de carregamento; a consulta de fundo não alterna esse indicador.

O teste verificou **20 consultas idênticas, zero gravações adicionais e zero renderizações adicionais do consumidor**. Um pedido novo continuou atualizando a contagem e solicitando o som. Isso comprova redução de trabalho redundante nesse cenário; não é uma porcentagem de ganho geral do aplicativo.

Essa otimização está também no código compartilhado usado pelo Android, mas só chegará ao APK instalado quando houver uma nova compilação autorizada.

### Logo sincronizada

Quando uma logo era removida da configuração, o aplicativo conservava a antiga em memória. A atualização agora também aplica o valor vazio. Consentimento de publicação e isolamento da loja foram mantidos.

## Validação concluída

| Verificação | Resultado |
| --- | --- |
| Testes Node de regras, serviços, armazenamento e regressões | 424 aprovados |
| Suítes automatizadas de navegador, incluindo desempenho | 38 aprovadas |
| Matriz responsiva principal | 664 cenários, sete resoluções, PT/EN/ES |
| Aplicativo com export Expo e provedores reais | Chromium e WebKit aprovados |
| Alertas sobre uma janela já aberta | 12 combinações de idioma, tema e resolução |
| Lint e TypeScript | Aprovados |
| Exportação JavaScript Android | Concluída, sem gerar APK |
| Expo Doctor | 19/21 verificações aprovadas; dois grupos de alertas abaixo |

O aplicativo completo foi executado contra banco SQLite e credenciais sintéticas isoladas. Foram testados navegação por toque, emissão/prévia, histórico paginado de 205 pedidos, detalhes, preparo, exclusão de produto, arquivamento de cliente, abertura/fechamento de caixa e aceite online, incluindo cancelamento de confirmações. Nenhum desses testes escreveu na base real.

As outras suítes cobrem administrador/hierarquia, perfis/permissões, licenças, áreas separadas, login, recuperação e convites, cópia de senhas, temas, idiomas, filtros, busca, mesas, identificação, cardápio, encomendas e pedidos online. A validação automatizada de e-mail usa transporte simulado; não enviou mensagens reais.

Alguns testes antigos esperavam o seletor de idiomas anterior, tentavam clicar atrás de editores abertos ou usavam datas fixas incompatíveis com a execução atual. Esses testes foram ajustados à interface e ao relógio da massa; as verificações de permissões e regras não foram removidas. Alertas passaram a ser cobertos também por testes do aplicativo completo, além das fixtures de componentes.

WebKit é o motor usado pelo Safari, mas esta execução foi automatizada em Linux: não equivale a testar o iPad físico. Os testes de componentes compartilhados via React Native Web também não equivalem a executar o binário Android.

## Desempenho: medição e pendência

O diagnóstico de navegação executou 40 transições em Chromium com CPU limitada a 6×, 8.000 pedidos sintéticos, dos quais 80 no dia, duas orientações e dois temas. As medianas foram: Início 321 ms, Cardápio 423 ms, Preparo 686 ms, Pedido 1.013 ms e Histórico 2.298 ms; a maior amostra de Histórico foi 3.202 ms.

Essa fixture monta telas com provedores sintéticos, sem armazenamento criptografado/ponte nativa nem retenção de abas nativas. São valores de diagnóstico, não tempos do tablet ou comparação antes/depois. O teste não estabelece um orçamento de latência aprovado.

**Histórico com muitos cartões continua sendo um gargalo a trabalhar.** O componente nativo ainda monta os cartões do período; a versão web operacional já consulta histórico sob demanda e pagina em 100 pedidos. A virtualização do histórico nativo precisa preservar rolagem, detalhes, reimpressão e acessibilidade. Não foi feita uma troca de contêiner nesta revisão sem essa validação.

## Alertas de dependências e testes físicos pendentes

O Expo Doctor apontou:

- `react-native-tcp-socket` com metadado “Untested on New Architecture”. Isso requer testar a impressora Android; não demonstra por si só falha de impressão.
- Oito atualizações de correção recomendadas: Expo 57.0.31, asset 57.0.20, constants 57.0.22, crypto 57.0.4, linking 57.0.13, router 57.0.29, sharing 57.0.24 e splash-screen 57.0.10.

Não foram atualizadas dependências nativas nem ocultados os avisos. Uma atualização deve ter validação de instalação, impressão e dispositivos antes de ser considerada pronta.

Continuam pendentes testes físicos de instalação/atualização, latência e memória no Android comum, impressão TCP, som real, ciclo de suspensão/retorno, teclado e armazenamento persistente do Safari/iPad. Não há Android conectado ou emulador disponível nesta execução. A exportação JS não valida assinatura, empacotamento ou instalação do APK.

## Requisitos anteriores ainda não implementados integralmente

São demandas de produto registradas, separadas das regressões corrigidas:

- Bloquear novos pedidos sem caixa aberto quando esse módulo for usado.
- Checkout com gorjetas 18%, 20%, 22% e outro valor, separadas; confirmar tratamento tributário aplicável antes de implementá-lo.
- Detalhamento CC/CD e bandeira, e relatórios financeiros completos previstos nos checklists.
- Integrar o aceite online à geração operacional de pedido, cozinha e caixa. Hoje aceitar confirma a solicitação; não significa pagamento ou envio automático à cozinha.
- Definir prazo de aceite, expiração e tratamento das solicitações pendentes ao trocar canal/configuração; integração completa das encomendas com cozinha/caixa.
- Pagamento integrado, pinpad e push remoto com aplicativo fechado continuam etapas futuras.
- Miniaturas dependem de fotos reais cadastradas pela loja; somente Pizzas tem subgrupos no catálogo atual. Não foram inventadas imagens ou categorias.

Referências: [checklist completo](CHECKLIST-FIM-DE-SEMANA.md), [primeira versão online](PEDIDOS-ONLINE-PRIMEIRA-VERSAO.md) e [estado dos testes online](PEDIDOS-ONLINE-TESTES.md). As regras não foram alteradas silenciosamente para completar esses itens.

## Reprodução e evidências

```sh
node --test tests/*.test.cjs tests/*.test.mjs
npx expo lint
npx tsc --noEmit
node tests/browser/verify-web-app.cjs
WEB_APP_ENGINE=webkit node tests/browser/verify-web-app.cjs
node tests/browser/verify-web-alerts.cjs
node tests/browser/verify-online-polling.cjs
node tests/browser/verify-navigation-performance.cjs
npx expo export --platform android --output-dir /tmp/bistro-audit-android-js
NODE_USE_ENV_PROXY=1 npx expo-doctor
```

As suítes de navegador exigem Playwright, seus navegadores/dependências e esbuild disponíveis no ambiente de teste. Nesta execução foram instalados como ferramentas temporárias, sem mudar package.json/package-lock.

Evidências preservadas em `/workspace/artifacts/auditoria-20261029/`: `browser-suites.json`, `navigation-performance.json`, `unit-tests.log` e `expo-doctor.log`. Capturas temporárias estão nos caminhos indicados pelos resultados das suítes.

## Entrega

Destino: aplicativo web de homologação, `/app/`. Publicação usa `web_only=true`, `publish_web=false`, `sync_api=false`, `build_apk=false`, `enable_online_demo=false`. Sem migração, alteração de registros reais, mudança de cobrança, backend, portais, produção ou compilação APK/OTA.
