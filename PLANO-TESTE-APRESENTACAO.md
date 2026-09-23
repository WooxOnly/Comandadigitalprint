# Plano de teste e apresentacao

## Preparacao

1. Instalar as dependencias com `npm install`.
2. Iniciar com `npm run start`.
3. Para testar a impressao Android, usar um development build, pois a impressao nativa precisa estar incluida no APK.
4. Configurar uma impressora em `Impressora` e selecionar `Sistema Android` para o primeiro teste.

## Roteiro funcional

1. Abrir `Cardapio` e editar o nome, a categoria e o preco de um produto.
2. Marcar dois produtos de pizza como pizza e salvar o cardapio.
3. Voltar ao pedido e verificar as categorias e os precos.
4. Selecionar uma plaquinha de 1 a 10 ou informar uma plaquinha personalizada.
5. Informar o nome do cliente.
6. Adicionar produtos, alterar quantidades e conferir o total.
7. Adicionar observacoes livres e testar as sugestoes rapidas.
8. Adicionar uma pizza com dois sabores e conferir os sabores no pedido.
9. Enviar a comanda.
10. Confirmar que ela aparece no historico e que os dados permanecem apos reabrir o app.
11. Usar `Reimprimir` no historico.
12. Em `Cardapio`, informar uma URL JSON, salvar e fechar o app.
13. Abrir novamente com internet ligada e confirmar que o cardapio e verificado automaticamente.
14. Abrir novamente com internet desligada e confirmar que o cardapio local continua disponivel.

## Formato do cardapio online

```json
[
  { "id": "pizza-calabresa", "name": "Calabresa", "category": "Pizzas", "price": 45.0, "kind": "pizza" },
  { "id": "suco-laranja", "name": "Suco de laranja", "category": "Bebidas", "price": 8.0 }
]
```

## Roteiro da gravacao

1. Mostrar a tela inicial e a selecao de plaquinha.
2. Mostrar a edicao do cardapio e o salvamento local.
3. Montar um pedido com observacao, quantidade e pizza de dois sabores.
4. Mostrar o total e enviar a comanda.
5. Abrir o historico e reimprimir.
6. Mostrar a tela de configuracao da impressora e a largura de papel.
7. Mostrar a URL salva, fechar e reabrir o app para demonstrar a verificacao automatica.

## Validacao da impressao

- `Sistema Android`: fluxo conectado pelo `expo-print`; abre o servico de impressao do Android.
- `Bluetooth`, `Wi-Fi/rede` e `USB/OTG`: telas e configuracoes preparadas, mas a comunicacao direta depende do modulo nativo compatível com a marca/modelo e deve ser testada no APK com o equipamento real.
- Registrar no teste o modelo da impressora, a conexao, a largura do papel e se a comanda saiu legivel.
