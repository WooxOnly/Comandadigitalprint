# Idiomas, dimensões e tablets — 08/10/2026

Português brasileiro, inglês e espanhol são requisitos permanentes do BistroHub: administrativo, Painel do Gestor, APK, mensagens de validação, acessibilidade e recibos. A regra está registrada em `AGENTS.md` para as próximas alterações. Nomes e observações cadastrados pelo restaurante permanecem como foram digitados.

## Alterações concluídas

- Administrativo `/admin` e cadastro `/admin/gestores` traduzidos, incluindo login, lojas, módulos, usuários, configurações, logs e mensagens das operações. A preferência do proprietário fica no D1 e acompanha o acesso em outro navegador. A preferência de cada gestor continua independente.
- APK permite escolher o idioma na tela de login, além de Ajustes e da vinculação inicial. A seleção continua sendo própria de cada aparelho.
- Correções de mensagens ausentes, acentuação, pontuação, nomes das formas de pagamento para leitores de tela e imposto sobre vendas em espanhol. Porcentagens acompanham o idioma; valores continuam em USD.
- Catálogos verificados automaticamente quanto a traduções EN/ES ausentes, textos vazios, parâmetros, normalização Unicode e sinais de codificação corrompida. Os testes também detectam rótulos literais novos sem tradução no APK.
- Nomes longos de clientes agora cabem nos seletores de encomendas. Textos de botões/conexões podem encolher dentro da linha, e a navegação respeita a largura disponível.
- A prévia de impressão mantém até oito destinos em uma lista rolável com altura limitada. Em telas horizontais baixas, o rodapé usa espaçamento menor para manter zoom e impressão acessíveis.
- No administrativo, o cabeçalho deixa de ser fixo em telas estreitas ou baixas, liberando espaço para os formulários.

Os termos comerciais e os intervalos de TMA estão documentados em `IDIOMAS-PAINEL-GESTOR.md`. A troca de idioma não converte moeda, muda permissões nem altera os módulos.

## Evidência local

- **194 testes aprovados**: 184 em arquivos `.test.cjs` e 10 em `.test.mjs`; nenhum teste falhou ou foi ignorado. Incluem persistência dos idiomas, isolamento das contas, sessão expirada, falha ao salvar, validações e os fluxos financeiros/operacionais existentes.
- Lint e TypeScript aprovados.
- **432 combinações de tela, idioma e tamanho em Chromium**: 108 do administrativo, 36 do gestor e 288 dos componentes do APK. PT/EN/ES nos seis tamanhos: 600 × 960, 960 × 600, 800 × 1280, 1280 × 800, 390 × 844 e 844 × 390, em pixels lógicos do navegador.
- A matriz abre os formulários de clientes/encomendas, detalhes do cardápio, relatório financeiro com dados, login, vinculação e backups; cobre 14 telas e os diálogos de produto e impressão. Usa nomes longos e oito destinos de impressão. Verifica largura/controles e conservação do cliente do pedido após rotação. Nenhum erro de JavaScript foi detectado.
- Exportação Android local aprovada, com áudio incluído e URL de homologação presente; URL de produção ausente do bundle. Gera JavaScript/assets, não APK assinado.
- Worker empacotado por `wrangler deploy --dry-run`, usando o D1 de homologação. Nenhuma publicação remota.

Os portais são executados pelo Worker real sobre SQLite de teste. As telas do APK usam os componentes reais através de React Native Web, com provedores, armazenamento e serviços físicos substituídos por dados sintéticos. Isso não simula fielmente teclado, escala de fonte do Android, barras do sistema, áudio, impressão ou consumo de bateria. Esses pontos ficam para os aparelhos.

Logs locais desta rodada: `/tmp/bistro-refinement-full.log`, `/tmp/bistro-refinement-mjs.log`, `/tmp/bistro-refinement-browser.log`, `/tmp/bistro-refinement-lint.log`, `/tmp/bistro-refinement-tsc.log`, `/tmp/bistro-refinement-android.log` e `/tmp/bistro-refinement-worker.log`. As capturas da prévia em paisagem ficaram em `/tmp/bistro-layout-rugb0t/`. Arquivos de `/tmp` são evidência temporária; os verificadores permanecem no repositório.

Para repetir a suíte funcional:

```bash
node --test tests/*.test.cjs tests/*.test.mjs
npm run lint
npx tsc --noEmit
```

Para repetir a matriz de dimensões, instalar as ferramentas separadamente do aplicativo. Requer Node.js 24, Chromium e OpenSSL:

```bash
npm install --prefix /tmp/bistro-browser-tools --no-audit --no-fund playwright-core esbuild
NODE_PATH=/tmp/bistro-browser-tools/node_modules node tests/browser/verify-layouts.cjs
```

O executável padrão é `/usr/bin/chromium`; outro caminho pode ser informado por `CHROMIUM_PATH`. Os dados são sintéticos, e o servidor de teste usa uma porta local temporária.

## Roteiro para o tablet físico

Instalar o novo APK de homologação e usar somente lojas de teste. Repetir os pontos de interface nos três idiomas e nas duas orientações.

| Verificação | Resultado esperado |
| --- | --- |
| Vinculação e login | Escolha de idioma acessível; acentos legíveis; vínculo e preferência conservados ao reiniciar. |
| Pedido em edição | Alternar retrato/paisagem com cliente, itens e observações preenchidos; conservar o conteúdo e alcançar navegação/envio. |
| Teclado aberto | Em login, cliente, encomenda, caixa e IP da impressora, alcançar o último campo e o botão de ação por rolagem. |
| Fonte e tamanho de exibição | Repetir com fonte padrão e aproximadamente 130%/150%, conforme as opções do Android, e com tamanho de exibição ampliado; conferir formulários, menus, diálogos e ações. |
| Nomes longos | Conferir cliente, loja, usuário, produto e destino de impressão com textos extensos, acentos e sinais como ¿ e ¡. |
| Módulos opcionais | Habilitar separadamente Caixa, Encomendas, Clientes e Preparo; conferir menus/telas e retorno ao fluxo existente ao desligar. |
| Caixa | Abrir, vender, dividir dinheiro/cartão/Zelle, conferir imposto desligado/ligado, desconto autorizado, gorjeta, entrega, estorno e fechamento; comparar relatório e recibo. |
| Encomenda e clientes | Retirada/entrega, agenda, vínculo opcional do cliente e avanço dos estados; conferir formulários nas duas orientações. |
| Cozinha em dois tablets | Emitir no balcão, receber com painel aberto, testar som/volume, avançar preparo/pronto/finalizado e conferir TMA/operadores no gestor. |
| Sem internet | Registrar operações suportadas, reconectar e conferir sincronização e ausência de duplicação; relatórios web exigem internet. |
| POS pela rede | Na Milestone de 80 mm, conferir IP/porta, largura, acentos nas três línguas, corte, recibo não fiscal e oito destinos quando usados; em falha, repetir explicitamente somente os pendentes. |
| Uso durante o dia | Manter por um turno de pelo menos oito horas, com pedidos e sincronização representativos; observar aquecimento, bateria/carregamento, velocidade, volume e retorno após suspensão. |

Calendários do navegador, permissões e janelas de impressão do sistema seguem a língua/configuração do navegador ou Android. O aplicativo não traduz dados livres nem controla os diálogos do sistema.

## Escolha do tablet

O usuário pediu reduzir o investimento inicial. Para começar, considero **10 a 11 polegadas, 4 GB de RAM física e 64 GB de armazenamento**, com Android, Wi-Fi e uso dedicado ao BistroHub, uma escolha econômica a validar no APK. Os 8 GB/128 GB sugeridos inicialmente oferecem mais margem; não são um requisito mínimo medido do sistema. A largura lógica depende da densidade e das configurações do Android; polegadas sozinhas não determinam o layout.

Minha recomendação econômica é o **Galaxy Tab A9+ Wi-Fi, 4 GB/64 GB, de caixa aberta**, quando disponível com devolução. Consulta de 08/10/2026:

| Opção econômica | Especificação | Oferta consultada |
| --- | --- | --- |
| [Samsung Galaxy Tab A9+](https://www.bestbuy.com/product/samsung-galaxy-tab-a9-11-64gb-wi-fi-graphite/6566195/openbox?condition=good) | 11", Snapdragon 695, 4 GB/64 GB | Best Buy, caixa aberta, condição Good: US$ 87,99. |
| [Lenovo Tab M11](https://www.bestbuy.com/product/lenovo-tab-m11-11-fhd-tablet-4gb-ram-128gb-emmc-storm-grey/6572187/openbox) | 11", MediaTek Helio G88, 4 GB/128 GB | Best Buy, caixa aberta, condição Good: US$ 143,99. |

Preços exibidos na consulta, antes de impostos; estoque e retirada dependem da loja/CEP. Caixa aberta significa aparelho aberto e devolvido. Conferir carregador, tela, bateria e condições de devolução. O desempenho com 4 GB ainda não foi medido no aparelho; repetir o roteiro físico com a operação real durante um turno. Não há necessidade de comprar a versão com conexão celular para a impressão na rede local.

As sugestões anteriores ficam como opções de maior investimento:

| Opção | Especificação conferida | Uso sugerido |
| --- | --- | --- |
| [Samsung Galaxy Tab S10 FE Wi-Fi](https://www.samsung.com/us/tablets/galaxy-tab-s/galaxy-tab-s10-fe-gray-128gb-sm-x520nzaaxar/) | 10,9", Exynos 1580, 8 GB/128 GB, bateria de 8.000 mAh | Minha primeira escolha para mais margem de desempenho com os módulos e uso contínuo. |
| [Samsung Galaxy Tab A11+](https://www.samsung.com/us/tablets/galaxy-tab-a11-plus/) | 11", MediaTek MT8775; escolher a versão 8 GB/256 GB, bateria de 7.040 mAh | Alternativa de custo menor que considero adequada para os fluxos previstos; desempenho ainda precisa ser medido no APK físico. |

Especificações dos modelos anteriores consultadas em 08/10/2026 nas páginas oficiais Samsung dos Estados Unidos. Para os modelos econômicos, ver também o [comunicado Samsung do A9+](https://images.samsung.com/is/content/samsung/assets/jp/explore/news/galaxy-tab-a9-plus/NewsRelease_galaxy-tab-a9-plus_231023.pdf) e a [ficha técnica Lenovo M11](https://psrefstuff.lenovo.com/syspool/Sys/PDF/datasheet/Lenovo-Tab-M11_Tab_Datasheet_EN.pdf). Confirmar o modelo e a quantidade de RAM no anúncio; RAM virtual não substitui a RAM física. A autonomia anunciada pelo fabricante não comprova um turno inteiro no BistroHub.

Para posto fixo, usar suporte estável, carregador/cabo de boa qualidade e local ventilado, afastado de forno, calor e respingos. Configurar proteção da bateria quando disponível. Wi-Fi é suficiente; a impressora de rede precisa estar acessível na mesma rede local, sem isolamento entre aparelhos. A aprovação operacional depende do teste de um turno com o APK e a POS.

## Entrega posterior

O refinamento foi concluído na branch `homologacao`; commit/push, publicação e APK foram autorizados em 08/10 e estão em entrega, com resultados efetivos registrados em `PENDENCIAS.md`. Antes do Worker atualizado, reaplicar `server/cloudflare/store-schema.sql`: inclui `manager_user_preferences` e `panel_preferences`, além das tabelas de módulos já previstas. O comando de entrega preparado reaplica esse esquema.

As mudanças de interface desta rodada exigem o APK atualizado para serem testadas no Android; não adicionam dependência nativa. O APK também precisa incorporar os módulos nativos das etapas anteriores, incluindo impressão pela rede, compartilhamento e áudio da cozinha.
