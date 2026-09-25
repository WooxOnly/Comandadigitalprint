# Revisão do projeto — 22/09/2026

> Atualização de 25/09/2026: este documento preserva a revisão histórica. Os itens 1 e 3 foram resolvidos no cadastro Seabra; 2, 5, 6 e 7 foram tratados na etapa de envio/servidor/Expo Router. Permanecem integração direta com impressoras e validação física. Hospedagem definida como Cloudflare Workers + D1, ainda não publicada. Consulte `PENDENCIAS.md` e `server/README.md` para o estado atual.

## Resultado desta etapa

- O aplicativo já tem cadastro local de produtos, categorias, pedidos, observações, histórico, reimpressão e atualização do cardápio por URL.
- O ícone do Android ainda apontava para os arquivos padrão do Expo. Agora usa o gorro de chef em `assets/chef-icon.png` e `assets/chef-foreground.png`, configurados em `app.json`.
- O cupom agora é uma **comanda de produção para a cozinha**, sem colunas de preço, subtotais ou total financeiro. Mostra plaquinha, cliente, data/hora, quantidades, produtos, sabores e observações.
- A alteração do cupom vale para enviar, testar a impressora e reimprimir pedidos antigos, pois os três usam `printerService.ts`.
- O tamanho inclui o espaçamento interno dentro dos 58/80 mm. Observações preservam quebras de linha e a plaquinha aparece em destaque.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `npx.cmd expo lint` | Passou |
| `npx.cmd tsc --noEmit` | Passou |
| `npx.cmd --yes expo-doctor` | 21/21 verificações passaram |
| Configuração pública resolvida pelo Expo | Novos caminhos dos ícones confirmados |
| PNGs | Quadrados, 1254 × 1254; ícone completo opaco; primeiro plano com transparência real |
| Recorte do ícone adaptativo | Conteúdo visível dentro do círculo seguro central de 66/108 da largura |
| HTML de produção em 58 e 80 mm | Conferido por verificações de conteúdo e renderização no Chrome |
| Pedidos que ainda contêm preços | HTML idêntico ao dos mesmos pedidos sem o campo de preço |
| Sabores, quantidades, observações e caracteres especiais | Preservados; conteúdo HTML escapado |
| Chamada de impressão | Verificada com substituto do módulo nativo, sem enviar papel |
| Servidor local | Sintaxe válida; GET /health e /menu responderam; PUT sem autorização retornou 401 |
| Cardápio do servidor | Nenhum dado alterado pelos testes |

Não foi gerado/instalado um APK nesta etapa, nem realizada impressão física. O resultado dos testes automáticos não substitui os testes no aparelho e na impressora.

## Pontos encontrados para as próximas etapas

1. **Alta — itens do mesmo produto podem interferir entre si.** Em `App.tsx:88`, cada linha mantém o ID do produto. Duas unidades adicionadas separadamente com observações diferentes acabam com o mesmo ID; `changeQuantity` e `updateNote` afetam todas as linhas com esse ID, e as chaves React se repetem. Cada linha da comanda precisa de um identificador próprio.
2. **Alta — o pedido é limpo antes de confirmar que foi salvo.** Em `App.tsx:205`, `sendOrder` limpa o formulário antes de aguardar o armazenamento. Se a gravação falhar, a mensagem diz que houve envio, embora a impressão ainda não tenha sido chamada. Falta também proteção para toques repetidos durante o envio.
3. **Média — pizza com dois sabores ainda escolhe o segundo automaticamente.** Em `App.tsx:100`, o código pega a primeira outra pizza cadastrada e cobra o maior preço. Essa regra de preço não foi confirmada no contexto. A observação digitada no modal também não é transferida para essa pizza.
4. **Média — Bluetooth, Wi-Fi e USB são apenas configurações.** `printerService.ts` só integra a impressão pelo sistema Android. Os outros modos retornam erro explícito; a integração direta depende do equipamento.
5. **Média — o servidor precisa de validação e gravação mais robustas.** `server/server.mjs:25` aceita preços negativos, campos vazios e IDs repetidos. A gravação do JSON é direta, sem substituição atômica; um JSON de requisição malformado cai no erro 500. Não foi feita uma auditoria de segurança completa.
6. **Média — salvar a configuração da impressora não salva a URL do cardápio.** `App.tsx:181` persiste só a impressora. Atualmente a URL é persistida ao salvar o cardápio ou após uma atualização bem-sucedida, o que deixa o fluxo da tela de configurações confuso.
7. **Estrutura — navegação ainda é feita por estado em App.tsx.** O projeto não usa Expo Router, ao contrário da orientação do AGENTS.md. A migração pode ser planejada separadamente.
8. **A confirmar no aparelho — operação offline e persistência.** O código implementa armazenamento local, mas esta revisão não reproduziu os testes anteriores do usuário. Modelo da impressora e hospedagem HTTPS também continuam pendentes no contexto escrito.

## Conferência no celular

1. Gerar um novo APK do perfil `preview` e instalar a atualização. O ícone do launcher é uma configuração nativa: recarregar o JavaScript não troca o ícone de um APK já instalado.
2. Conferir o gorro na tela inicial do Android, inclusive com ícones temáticos se o aparelho oferecer a opção.
3. Montar um pedido com preços cadastrados, quantidade maior que um e observações.
4. Imprimir em 80 mm e, se disponível, 58 mm: conferir ausência de valores e presença de quantidades, sabores e observações.
5. Reimprimir um pedido antigo e usar “Testar impressora”: ambos devem usar o formato de produção.

Referências: [configuração de ícones no Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/config/app/), [ícones adaptativos Android](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive). A descrição e os prompts da arte estão em [assets/ICONES.md](assets/ICONES.md).
