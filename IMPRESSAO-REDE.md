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

## Opção econômica de impressora — 11/10/2026

O proprietário considerou a recomendação Epson de aproximadamente US$299 cara. A indicação econômica é **NETUM NT-8330L, variante USB LAN / US Plug, SKU SHF-NT-8330L-US**, com papel de 80 mm, guilhotina e Ethernet. [Variante específica no fabricante](https://www.netum.net/products/nt-8330-thermal-printer?variant=39636173946969): **US$84,99**, antes de frete e impostos. A variante USB de US$77,99 não tem rede. A alternativa [NETUM NT-8360L USB + LAN / US Plug](https://www.netum.net/products/nt-8360-thermal-printer?variant=40286163599449), SKU SHF-NT-8360L-US, estava a US$89,00. Preços/variantes confirmados no catálogo público atual do fabricante, sem compra.

O [suporte oficial NETUM](https://support.netum.net/hc/en-us/articles/44800664000795--All-Models-Receipt-Printer-Software-Drivers) associa NT-8330/NT-8360L ao [pacote de manuais e SDK](https://cdn.shopify.com/s/files/1/2144/8019/files/80MM_Thermal_Printer_Manual_SDK-8360.zip?v=1710728732). A consulta leu documentação e fonte do exemplo Android, sem executar os programas do pacote: o exemplo usa TCP 9100 e envio de bytes ESC/POS. É compatibilidade documental, ainda sujeita ao teste físico de acentos, colunas, corte e reconexão no BistroHub.

**Wi-Fi opcional, externo:** as variantes acima não incluem rádio Wi-Fi. A ponte **TP-Link TL-WR902AC** pode receber Wi-Fi e fornecer a conexão Ethernet para a impressora, conforme o [modo Client documentado pelo fabricante](https://www.tp-link.com/us/support/faq/2031/). Consultada a [US$39,99 na B&H](https://www.bhphotovideo.com/c/product/1322916-REG/tp_link_tl_wr902ac_ac750_wireless_travel_router.html), resulta em **US$124,98** com NT-8330L, antes do frete e dos impostos. São dois equipamentos, com alimentação própria e um cabo Ethernet curto; não é um adaptador USB conectado à impressora. Usar Ethernet direto no início e acrescentar a ponte somente se precisar evita investimento antecipado.

A [política de envio NETUM](https://www.netum.net/policies/shipping-policy) permite origem China ou depósito americano conforme disponibilidade; frete depende do checkout/peso. Não afirmar frete grátis, estoque local ou prazo específico sem consultar o pedido. Antes de padronizar várias unidades, testar uma unidade real com o aplicativo e as três línguas.

## Modelos Epson comparados — fora do orçamento indicado

Foi comparada **Epson OmniLink TM-m30III, preta, variante americana C31CK50022**, com Ethernet e Wi-Fi incluídos. O modo de rede direto usa o protocolo ESC/POS/TCP 9100 documentado para essa família. Bobina de 80 mm, fonte de alimentação e guilhotina atendem ao tipo de comanda/recibo do projeto. O proprietário rejeitou seu custo atual; ela permanece como referência técnica para futuros perfis, sem homologação física ou decisão de compra.

A variante preta **C31CK50012** tem Ethernet e aceita Wi-Fi por **OT-WL06, C32C891321**, adquirido separadamente. A **TM-T20IV C31CL47002** é outra opção com Ethernet e o mesmo acessório opcional; **C31CL47001** é USB/serial e não possui Ethernet. Nos modelos pesquisados, a conexão por cabo Ethernet desativa o Wi-Fi. Planejar o uso de uma conexão de rede por vez, sem pressupor alternância automática.

Preços consultados em 11/10/2026 na Provantage, produtos novos antes de impostos: [TM-m30III C31CK50022 com Wi-Fi/Ethernet](https://www.provantage.com/epson-c31ck50022~7EPSF0C0.htm), US$299,04; [TM-m30III C31CK50012 Ethernet](https://www.provantage.com/epson-c31ck50012~7EPSF0AX.htm), US$267,43; [TM-T20IV C31CL47002 Ethernet](https://www.provantage.com/epson-c31cl47002~7EPSF0E6.htm), US$284,10. Cotação e disponibilidade mudam; confirmar o número de peça e o conteúdo do kit no pedido.

Fontes técnicas: [ficha americana TM-m30III e variantes](https://mediaserver.goepson.com/ImConvServlet/imconv/430e3674d351b5c529e64b0c90ab1c1568ef528a/original?assetDescr=TM-m30III-Thermal-Receipt-Printer-Specification-Sheet-CPD-62919-Final.pdf), [manual TM-m30III Rev.F](https://files.support.epson.com/pdf/pos/bulk/tm-m30iii_trg_en_revf.pdf), [página TM-T20IV](https://epson.com/For-Work/Printers/POS/TM-T20IV-Thermal-Receipt-Printer/p/C31CL47002) e [manual TM-T20IV Rev.D](https://files.support.epson.com/pdf/pos/bulk/tm-t20iv_trg_en_rev_d.pdf).

## Direção multiplataforma e novos modelos — planejado

O proprietário determinou Android, Windows e web como destinos do BistroHub operacional, mantendo PT-BR/EN/ES. A expansão deve reutilizar regras de pedidos, módulos, permissões e o contrato da API, com adaptação de interface e impressão por plataforma. Windows e as telas operacionais web ainda não foram implementados nesta etapa.

A impressão deve separar três responsabilidades:

1. **Conteúdo:** pedido/recibo e contexto da loja, sem comandos de uma marca ou dependência do dispositivo.
2. **Perfil de modelo:** protocolo, codificação e número de tabela, largura/colunas, fonte, corte, recursos e comandos de status compatíveis. Perfis novos entram na lista homologada somente após teste real; ESC/POS, StarPRNT e BXL/POS não são automaticamente intercambiáveis.
3. **Transporte:** TCP local no Android; transporte/driver no Windows; serviço de impressão no computador da loja ou API de impressora documentada para a versão web. A conexão TCP nativa atual não está disponível diretamente em um navegador comum. SDK ePOS/Server Direct Print da Epson são alternativas específicas a avaliar, sem obrigar todos os modelos a usá-los.

Para várias lojas/aparelhos, planejar trabalhos de impressão identificados por loja, pedido e destino, com fila e estados persistentes. Repetir automaticamente um envio com resultado desconhecido pode duplicar papel; reimpressão deve ser uma ação explícita com novo trabalho e confirmação. Isolar configuração e acesso por loja. A confirmação de gravação no socket permanece distinta da impressão física, mesmo quando houver consulta de sensores ou spooler do sistema.

Essa direção foi registrada para o desenvolvimento futuro. O APK atual, as preferências existentes e a política de impressão automática não foram alterados por essa pesquisa.
