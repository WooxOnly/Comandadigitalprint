# 20 — Habilitações e preset do online no nosso painel de administrador

Decisão do proprietário em 22/10/2026. Requisitos registrados; nenhuma configuração funcional foi implementada por este documento.

## Habilitações por cliente

- [ ] Habilitar/desabilitar o módulo Pedidos online no nosso painel de administrador.
- [ ] Habilitar/desabilitar a permissão de agendamento separadamente, dentro do módulo online.
- [ ] Habilitar/desabilitar pedidos na mesa separadamente, dentro do módulo online.
- [ ] Reservar essas habilitações ao nosso administrador; o portal do cliente não pode concedê-las a si próprio.
- [ ] Validar permissões no servidor e refletir as capacidades disponíveis na página pública e no tablet.
- [ ] Definir escopo/herança por loja para clientes com várias unidades, sem compartilhar mesas/canal incorretamente.

## Preset de mesas e QR Code

- [ ] No nosso painel de administrador, configurar quantas mesas o cliente possui.
- [ ] Configurar o modelo de QR para atendimento na mesa: específico por mesa (identificação automática) ou genérico interno (consumidor informa a mesa), conforme as alternativas já levantadas.
- [ ] A fala mais recente repetiu “por mesa”; confirmar o nome dos modelos antes de finalizar a interface, sem inventar outro formato.
- [ ] Validar quantidade e identificação de mesas; valores máximos, renumeração e impressão ainda precisam de desenho.
- [ ] Disponibilizar QR de mesa somente quando módulo online + permissão de mesa + canal automático estiverem ativos.
- [ ] Bloquear novos envios por códigos antigos/cache após desabilitação ou mudança para WhatsApp.
- [ ] Preservar pedidos existentes ao reduzir/desativar mesas ou mudar o preset; definir tratamento de pendências.

## Configuração operacional no portal da loja

- [ ] Permitir exatamente um modo: WhatsApp manual OU automático na aba Pedidos online do tablet.
- [ ] No WhatsApp, cadastrar número comercial da própria loja e gerar mensagem para o consumidor enviar; sem pedido de mesa.
- [ ] No automático, configurar avisos/som e exigir aceite humano da solicitação recebida.
- [ ] Restringir modalidades/agendamento ao que nosso administrador habilitou.
- [ ] Preservar design, cores, logos e acessibilidade existentes em celular, tablet e PC.

## Verificação

- [ ] Administrador altera apenas o cliente/unidade selecionado; registrar responsável e alteração para rastreabilidade.
- [ ] Chamadas diretas, páginas antigas e QR impresso não contornam os módulos/modos atuais.
- [ ] Canal WhatsApp nunca atende pedido de mesa; não há dois canais simultâneos.
- [ ] Agendamento desabilitado não pode ser enviado pela API mesmo se a página antiga ainda exibir a opção.
- [ ] Não apagar solicitações/histórico nem alterar relatórios/TMA por uma mudança de configuração.

[Voltar ao índice](../../CHECKLIST-FIM-DE-SEMANA.md)
