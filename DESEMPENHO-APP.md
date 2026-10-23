# Revisão de desempenho — 23/10/2026

Escopo autorizado: investigar e melhorar o desempenho mantendo layout, funções e regras. Trabalho local, sem publicação, APK ou OTA. As alterações do cardápio online continuam separadas e não foram disponibilizadas nesta revisão.

## Gargalos encontrados e corrigidos

1. Cada notificação da nuvem fazia AppContext serializar, ordenar e depois analisar novamente todo o histórico, inclusive na tela inicial. O filtro Hoje é aplicado na tela Histórico, após carregar o conjunto local. Agora os registros são lidos diretamente, sem ida e volta por JSON, e reordenados somente quando mudam. O histórico completo e a numeração continuam disponíveis.
2. Avisos somente de status também reconstruíam cardápio, opções de produtos, encomendas, clientes e preparos, propagando atualizações pelos contextos. Agora os seletores mantêm o estado quando os valores relevantes permanecem iguais. Mudanças reais continuam chegando pela mesma assinatura de sincronização.
3. Configurações idênticas da loja, acesso, preparo, caixa e páginas de alterações vazias regravavam o snapshot completo criptografado. Agora só persistem quando há diferença; a última sincronização continua durável. Escritas operacionais, fila offline, confirmações, cursor, autorização, criptografia e backups foram mantidos.
4. Consultas repetidas por prefixo percorriam todos os registros em cada chamada. Um cache por snapshot evita repetir a seleção, retornando arrays independentes para que ordenações dos consumidores não alterem consultas posteriores. Toda troca de values invalida o cache.
5. O painel de preparo refazia filtro, índice e ordenação a cada segundo e mantinha seu relógio ativo fora de foco. Fila/índices agora são memoizados pelas entradas, o relógio visual só roda com a tela focada e atualiza ao retornar. O hook de alertas mantém suas regras anteriores. Filtros, ordem e dimensões dos cartões foram preservados.
6. O Histórico recriava o índice de preparos e o filtro de datas em qualquer renderização. Esses cálculos agora são reaproveitados até suas entradas mudarem.

## Evidência e limites

- Teste sintético com 8.000 pedidos, sem caixa nem alterações pendentes: código anterior faz **5 gravações completas** por sincronização; código corrigido faz **1**, destinada à última sincronização. Isso é redução de gravações nesse cenário, não uma medição de FPS ou garantia de aplicativo 80% mais rápido.
- A suíte de 390 testes existentes passou; dois testes novos verificam o cenário de 8.000 pedidos, persistência, identidade dos registros, isolamento de arrays retornados e entrada de um pedido remoto novo.
- Lint e TypeScript passaram. Verificações Chromium usam componentes reais via React Native Web e serviços simulados; não equivalem a teste físico Android.
- O teste de histórico tinha pedidos fixos em 19/10 e falhava no filtro Hoje quando executado em outra data; seu relógio foi fixado no dia da própria massa, sem mudar o filtro do produto.
- Ainda não há medição de CPU, memória, FPS ou latência de navegação no tablet do proprietário. A melhora percebida precisa ser confirmada depois de uma entrega explicitamente autorizada e instalada.

## Próximas medições recomendadas

- No dispositivo: medir abertura fria/quente, tempo entre toque e exibição das abas, consumo de memória e travamentos durante sincronização, com e sem pedidos novos.
- O armazenamento ainda protege um snapshot completo criptografado e faz backup em cada commit. Uma eventual migração para persistência incremental exige desenho, migração, recuperação e testes próprios; não reduzir segurança ou durabilidade para obter um benchmark melhor.
- Grandes períodos do Histórico ainda podem renderizar muitos cartões. Virtualização pode ser avaliada depois com testes de rolagem, reimpressão e acessibilidade, preservando o desenho; não foi incluída sem uma medição que justifique a troca do contêiner.
- A revisão atual reduz trabalho comprovadamente redundante. A causa exata de toda a lentidão no tablet antigo permanece por medir; não atribuir exclusivamente ao layout ou ao histórico.

## Segunda investigação: interface e operações

- Salvar uma comanda submetia novamente o histórico completo à camada de gravação, com conversão JSON e comparações de cada registro antigo. A submissão agora grava somente o novo registro imutável pela mesma fila transacional; mantém o histórico em memória e o commit criptografado completo. O teste de 8.000 pedidos verifica também inclusão local offline, um commit, preservação dos antigos e fila contendo somente o pedido novo.
- O tratamento de tema/densidade achatava e convertia estilos estáticos repetidamente. Um cache com chaves fracas reaproveita somente objetos congelados; arrays e estilos mutáveis continuam sendo recalculados. As definições compartilhadas foram congeladas também em release, sem mudar os valores. Testes comparam a transformação em todas as combinações e a atualização de estilos dinâmicos. O contexto de aparência preserva sua identidade quando os valores derivados não mudam.
- A prévia de impressão agora reaproveita o plano, HTML e source da WebView até pedido/destino/idioma/configuração mudarem. Alterar zoom aplica o JavaScript existente sem reconstruir o documento.
- `verify-navigation-performance.cjs` mede clique até dois frames seguintes em Chromium com CPU limitada a 6×, 8.000 pedidos sintéticos (80 hoje), nas duas aparências e orientações. Foram 40 transições. Relatório em `/workspace/artifacts/desempenho/navigation-performance.json`.
- Nessa execução, medianas por tela ficaram aproximadamente: Início 359 ms, Cardápio 446 ms, Preparo 620 ms, Pedido 943 ms e Histórico 2.136 ms. São números de diagnóstico web com serviços simulados, sem armazenamento/ponte nativos e com montagem de telas da fixture; **não** representam o tablet nem comprovam ganho antes/depois. A execução concorria com testes locais, portanto não usar como orçamento de latência de produção. Histórico com muitos cartões continua sendo candidato forte a virtualização, mediante validação do mesmo desenho, filtro, rolagem e acessibilidade.
- A segunda suíte completa passou em 394 testes; lint e TypeScript passaram. O teste de opções de idioma tinha um seletor genérico que contava também os radios do tipo de atendimento; foi restrito aos nomes dos idiomas, sem alterar o produto.
- O fechamento do menu por Escape na fixture apresentou uma corrida ao pressionar a tecla imediatamente após a montagem do Modal. A comparação isolada com fontes anteriores também reproduziu o menu aberto após Escape; a versão atual fechou no mesmo teste. A verificação visual aguarda dois frames antes da tecla para permitir a instalação dos efeitos do Modal. Não foi alterado o comportamento de teclado do produto.
- Após ajustar apenas a fixture, a matriz de aparência passou em 90 casos, com três idiomas, temas claro/escuro e rotação. Os 40 testes de transição com CPU limitada também concluíram sem erro JavaScript ou largura excedente. Nenhuma publicação ou build foi iniciada.
