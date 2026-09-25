# Cardápio e pizzas — setembro de 2026

Fonte: três fotos do cardápio Seabra enviadas pelo usuário e lista textual com 24 extras. Catálogo compartilhado entre aplicativo e servidor em `server/menu.json`.

- 10 aperitivos (frango/tilápia e camarão de 1/2 lb são opções distintas), 8 lanches, 6 hambúrgueres, coxinha, 15 sabores de pizza e fatia: 41 opções.
- Preservados nomes, códigos e descrições legíveis; acentuação e grafia normalizadas. Sem inventar composição dos sabores de pizza. Fatia permite informar o sabor na observação, pois a foto não lista sabores por fatia.
- Preços das fotos ficam no JSON apenas como referência para compatibilidade com o servidor. Não há cobrança, total ou cálculo de preço no aplicativo de produção, conforme orientação do usuário.
- Pepperoni e Mussarela promocionais: somente inteiras, sem extras; não aparecem como segunda metade.
- Demais pizzas: escolha obrigatória entre inteira/dois sabores e escolha explícita da segunda metade. Extras opcionais com indicação de localização; observação preservada.
- Cada adição recebe identificação própria, evitando que quantidade/observação alterem outra pizza do mesmo sabor.
- Cardápio de demonstração é substituído ao atualizar. Catálogos personalizados são preservados; o botão “Carregar cardápio Seabra” permite substituí-los após confirmação. Uma URL que ainda sirva apenas exemplos não sobrescreve o cardápio real.
- Comanda e reimpressão continuam sem valores e com papel de 58/80 mm. Pedidos antigos sem extras continuam compatíveis.

## Verificação

Testes automatizados: catálogo, seleção obrigatória, bloqueio de promoção, notas e extras após serialização, identificação independente, migração do catálogo e recibos de 58/80 mm com HTML escapado e sem preços.

Roteiro no celular/iPad:
1. Escolher pizza regular, dois sabores e a segunda metade; adicionar bacon na segunda metade e milho na inteira.
2. Adicionar observação, conferir o pedido, imprimir e reimprimir pelo histórico.
3. Adicionar duas pizzas do mesmo sabor com observações diferentes; alterar a quantidade de uma e verificar a outra.
4. Abrir Pepperoni/Mussarela promocional e confirmar ausência de metades/adicionais.
5. Alternar entre inteira e dois sabores: seleção anterior de extras deve ser limpa para evitar localização incorreta.
6. Conferir celular/iPad, retrato/paisagem e impressão física nas duas larguras.

Revisão visual e impressão física pendentes: não havia navegador ou aparelho conectado às ferramentas de interface nesta sessão.
