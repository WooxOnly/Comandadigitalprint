# Impressão POS pela rede

A opção existente **Wi-Fi / rede** agora envia a comanda diretamente por TCP,
sem abrir a janela de impressão do Android. Teste e reimpressão usam a mesma
conexão e as preferências já salvas em cada aparelho. Pedidos continuam sendo
salvos antes da impressão. Não há reenvio automático em caso de falha.

## Configurar no aparelho

1. Instalar um novo APK do perfil `homologacao`, que inclui o módulo nativo
   `react-native-tcp-socket`. Atualização só de JavaScript ou Expo Go não basta.
2. Conectar o tablet à mesma rede local da impressora, que pode estar ligada
   ao roteador por cabo Ethernet. Internet não é necessária para imprimir.
3. Em **Ajustes → Impressora**, escolher **Wi-Fi / rede**, usar o IP da impressora
   no campo existente, a porta configurada no equipamento (padrão `9100`) e
   papel de **80 mm**. Salvar e usar **Testar impressora**.
4. Conferir o papel de teste, especialmente `á é í ó ú ã õ ç ñ ü` e o corte.
   Depois imprimir um pedido com observação, duas metades e adicionais;
   conferir o número diário, a mesa, o cliente, as quantidades e a reimpressão.

O IP é o da impressora, não o do servidor Cloudflare. Uma reserva DHCP no
roteador evita que ele mude. Caso o envio falhe ou demore, conferir se o pedido
saiu antes de reimprimir pelo histórico.

## Impressão automática opcional — 08/10/2026

Em **Ajustes → Impressora**, com Wi-Fi / rede configurada, habilitar **Imprimir automaticamente ao enviar** e salvar. Começa desligada por tablet. Só comandas novas usam o envio automático; teste, reimpressão e recibo de Caixa conservam suas ações próprias.

A comanda é salva antes de imprimir. Um bloqueio cobre validação, atividade e todos os destinos, impedindo impressão duplicada por toques simultâneos. Com impressão automática em andamento, a próxima emissão aguarda e conserva o rascunho. Não há fila automática para reiniciar o app nem reenvio após falha. Em falha, a prévia abre para confirmação manual e pula os destinos já confirmados nessa tentativa. Uma reimpressão nova pelo histórico reinicia essa confirmação, como antes; confira o papel antes de repetir.

Trocar para conexão do sistema/Bluetooth/USB desliga essa opção. A janela do driver nunca é acionada automaticamente. A opção não depende de Caixa, Encomendas, Clientes ou Preparo e não muda o fluxo das empresas que a deixam desligada.

## Protocolo e limites de verificação

O usuário informou impressora POS Milestone, 80 mm, USB e rede, com uso pela
rede. Não foi recuperado um manual específico do equipamento. A implementação
usa o perfil padrão **ESC/POS**, TCP, fonte A, texto centralizado, codificação
**CP850 / tabela 2**, avanço de três linhas e corte parcial. O papel de 58 mm
usa 32 colunas; 80/88 mm usam 48. Número do pedido e mesa ficam ampliados.
Não são enviados preços nem totais. Textos são quebrados para caber no papel,
e comandos de controle presentes nos campos do usuário são removidos.

Fontes consultadas:
- [Transporte TCP do python-escpos](https://github.com/python-escpos/python-escpos/blob/master/src/escpos/printer/network.py).
- [Comandos ESC/POS](https://github.com/python-escpos/python-escpos/blob/master/src/escpos/constants.py).
- [Perfil padrão e páginas de caracteres](https://github.com/receipt-print-hq/escpos-printer-db/blob/master/dist/capabilities.json).
- [Módulo TCP para React Native](https://github.com/Rapsssito/react-native-tcp-socket).
- [Bibliotecas nativas no Expo](https://docs.expo.dev/workflow/customizing/).

“Impressão enviada” significa que o componente nativo confirmou a gravação
dos bytes no socket. Não confirma impressão física, disponibilidade de papel
ou recebimento completo pelo firmware. A conexão tem limite de 15 segundos
e é fechada ao expirar, antes de liberar a trava de impressão. Falhas de IP,
porta, conexão e envio têm mensagens em PT/EN/ES e seguem para os logs existentes.

O plugin `with-network-printer` define o namespace Android ausente no Gradle
da versão 6.4.3 da biblioteca e remove o atributo antigo de pacote do manifesto,
durante o prebuild. iOS recebe a descrição de
acesso à rede local. A homologação usa o projeto Expo, pacote Android e servidor
separados descritos em `AMBIENTES.md`.

Testes de bytes, acentos, conteúdo, conexão TCP local, falhas, envio único,
tempo limite e módulos nativos indisponíveis podem ser executados com:

```sh
node --test tests/network-printing.test.cjs tests/receipt-printing.test.cjs
```

A compatibilidade do firmware (inclusive tabela de acentos e corte) depende
do teste físico. Nenhum teste nesta sessão enviou dados à impressora real.
