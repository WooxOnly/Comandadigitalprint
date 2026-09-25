# Atualização visual — 24/09/2026

- Revisados os textos visíveis do aplicativo: acentos, cedilhas, plurais, mensagens e permissão de acesso às fotos.
- Nova paleta com fundo claro, cartões brancos, verde-escuro e terracota; o gorro de chef aparece como logotipo padrão.
- Navegação inferior sempre disponível, com contraste no item selecionado.
- Campos com rótulos, controles maiores e botões de quantidade com 44 pontos de área de toque.
- Em telas a partir de 760 pontos, cardápio/pedido e configurações usam duas colunas; a tela inicial usa quatro cartões por linha. Texto ampliado retorna ao arranjo de uma coluna.
- Áreas seguras respeitam recortes, barra de status e indicador inferior. A rotação foi liberada para aproveitar celular e iPad em retrato ou paisagem.
- Janela de observação centralizada e limitada em largura no tablet, e apresentada como painel inferior no celular.
- A identificação do método de impressão usa “Sistema iOS (AirPrint)” no iOS e “Sistema Android” no Android.
- A impressão de produção continua centralizada, sem preços, com largura de 58 ou 80 mm.

## Conferência no aparelho

Verificações automáticas: TypeScript, lint, três testes de impressão e as 21 verificações do Expo passaram. A versão web compilou. As combinações principais de texto e fundo verificadas têm contraste acima de 4,5:1.

1. Abrir todas as abas e conferir textos, campos e destaque da aba selecionada.
2. Montar um pedido, abrir observações, digitar com o teclado e alterar a quantidade.
3. No iPad, conferir as duas colunas em retrato e paisagem; repetir com texto ampliado nas configurações do sistema.
4. Conferir o teclado, as margens da tela e o painel de observação em um celular pequeno.
5. Reimprimir uma comanda para confirmar que o formato da cozinha foi preservado.

A compilação web permite uma prévia local com `npm run web`. Ela não substitui os testes nativos em Android e iPad. O controle visual do navegador/computador não estava disponível nesta sessão; não foi feita uma validação visual em dispositivo físico nem gerado um pacote iOS.
