import { ONLINE_TRANSLATIONS } from '../../shared/online-i18n.mjs';
export type Language = 'pt' | 'en' | 'es';
export const LOCALES: Record<Language, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
export const translations: Record<string, readonly [string, string]> = {
  ...ONLINE_TRANSLATIONS,
  'Forma de pagamento': ['Payment method', 'Forma de pago'],
  "Filtros": ["Filters", "Filtros"],
  "Não foi possível salvar as regras do pedido. Tente novamente.": ["Could not save order rules. Try again.", "No se pudieron guardar las reglas del pedido. Inténtalo de nuevo."],
  "Escolha uma mesa antes de avançar.": ["Select a table before continuing.", "Selecciona una mesa antes de continuar."],
  "Informe uma mesa com até 3 dígitos.": ["Enter a table number with up to 3 digits.", "Introduce un número de mesa de hasta 3 dígitos."],
  "Exigir mesa também nos pedidos para levar": ["Require a table for takeaway orders too", "Exigir mesa también en los pedidos para llevar"],
  "Para comer aqui sempre exige mesa. Para levar, a mesa é opcional quando esta opção está desligada. Regra salva por loja e disponível offline.": ["Dine-in always requires a table. For takeaway, a table is optional when this option is off. This rule is saved per location and available offline.", "Comer aquí siempre requiere mesa. Para llevar, la mesa es opcional cuando esta opción está desactivada. La regla se guarda por local y está disponible sin conexión."],
  "Fechar busca": ["Close search", "Cerrar búsqueda"],
  "Hoje": ["Today", "Hoy"],
  "Últimos 7 dias": ["Last 7 days", "Últimos 7 días"],
  "Últimos 30 dias": ["Last 30 days", "Últimos 30 días"],
  "Mês anterior": ["Last month", "Mes anterior"],
  "Personalizado": ["Custom", "Personalizado"],
  "Filtrar por data": ["Filter by date", "Filtrar por fecha"],
  "Data inicial": ["Start date", "Fecha inicial"],
  "Data final": ["End date", "Fecha final"],
  "Formato da data": ["Date format", "Formato de fecha"],
  "Aplicar": ["Apply", "Aplicar"],
  "Nenhum pedido neste período.": ["No orders in this period.", "No hay pedidos en este período."],
  "Altere o filtro de data para consultar outros pedidos.": ["Change the date filter to see other orders.", "Cambia el filtro de fecha para ver otros pedidos."],
  "Informe datas válidas no formato indicado.": ["Enter valid dates in the indicated format.", "Introduce fechas válidas en el formato indicado."],
  "A data final deve ser igual ou posterior à inicial.": ["The end date must be on or after the start date.", "La fecha final debe ser igual o posterior a la inicial."],
  "Aguardando": ["Waiting", "En espera"],
  "Preparo do pedido": ["Order preparation", "Preparación del pedido"],
  "Enviado à cozinha": ["Sent to kitchen", "Enviado a cocina"],
  "Horário não registrado": ["Time not recorded", "Hora no registrada"],
  "Recebido há {minutes} minuto": ["Received {minutes} minute ago", "Recibido hace {minutes} minuto"],
  "Em preparo há {minutes} minuto": ["In prep for {minutes} minute", "En preparación desde hace {minutes} minuto"],
  "Pronto há {minutes} minuto": ["Ready for {minutes} minute", "Listo desde hace {minutes} minuto"],
  "Finalizado há {minutes} minuto": ["Completed {minutes} minute ago", "Finalizado hace {minutes} minuto"],
  "Recebido há {minutes} minutos": ["Received {minutes} minutes ago", "Recibido hace {minutes} minutos"],
  "Em preparo há {minutes} minutos": ["In prep for {minutes} minutes", "En preparación desde hace {minutes} minutos"],
  "Pronto há {minutes} minutos": ["Ready for {minutes} minutes", "Listo desde hace {minutes} minutos"],
  "Finalizado há {minutes} minutos": ["Completed {minutes} minutes ago", "Finalizado hace {minutes} minutos"],

  "Confira a data e a hora deste tablet para validar a licença.": ["Check this tablet’s date and time to validate the license.", "Revisa la fecha y la hora de esta tableta para validar la licencia."],
  "Voltar à entrada": ["Back to sign in", "Volver al inicio de sesión"],
  "Gerenciar licença": ["Manage license", "Gestionar licencia"],
  "Licença do cliente": ["Customer license", "Licencia del cliente"],
  "A licença vale para todas as lojas deste cliente. O tablet consulta uma vez por dia e funciona offline até a validade recebida.": ["The license covers all locations for this customer. The tablet checks once a day and works offline until its saved expiration date.", "La licencia cubre todos los locales de este cliente. La tableta consulta una vez al día y funciona sin conexión hasta la fecha de vencimiento guardada."],
  "Válida até": ["Valid until", "Válida hasta"],
  "Renovar automaticamente a cada mês": ["Renew automatically every month", "Renovar automáticamente cada mes"],
  "Renovar por um mês": ["Renew for one month", "Renovar por un mes"],
  "Bloquear licença": ["Block license", "Bloquear licencia"],
  "Desbloquear licença": ["Unblock license", "Desbloquear licencia"],
  "Liberação temporária offline": ["Temporary offline access", "Acceso temporal sin conexión"],
  "Também funciona em tablets que nunca verificaram a licença. Copie o identificador do tablet e cole o código gerado no aparelho. Prazo máximo: 31 dias.": ["Also works on tablets that have never verified their license. Copy the tablet ID and paste the generated code on that device. Maximum duration: 31 days.", "También funciona en tabletas que nunca han verificado la licencia. Copia el identificador de la tableta y pega el código generado en ese dispositivo. Plazo máximo: 31 días."],
  "Identificador do tablet": ["Tablet ID", "Identificador de la tableta"],
  "Liberar até": ["Allow access until", "Permitir acceso hasta"],
  "Gerar código temporário": ["Generate temporary code", "Generar código temporal"],
  "Código temporário": ["Temporary code", "Código temporal"],
  "Licença ativa": ["License active", "Licencia activa"],
  "Licença bloqueada": ["License blocked", "Licencia bloqueada"],
  "Licença vencida": ["License expired", "Licencia vencida"],
  "Licença temporariamente indisponível.": ["License service temporarily unavailable.", "Servicio de licencias temporalmente no disponible."],
  "Bloquear este cliente? Os tablets receberão o bloqueio quando consultarem o servidor.": ["Block this customer? Tablets will receive the block when they check with the server.", "¿Bloquear a este cliente? Las tabletas recibirán el bloqueo cuando consulten el servidor."],
  "Operação concluída.": ["Operation completed.", "Operación completada."],
  "A loja está vinculada a mais de um cliente.": ["The location is linked to more than one customer.", "El local está vinculado a más de un cliente."],
  "Confira o tablet e o prazo da liberação.": ["Check the tablet and the access expiration date.", "Revisa la tableta y la fecha de vencimiento del acceso."],
  "Esta loja não pertence ao cliente selecionado.": ["This location does not belong to the selected customer.", "Este local no pertenece al cliente seleccionado."],
  "Confira a validade da licença.": ["Check the license expiration date.", "Revisa la fecha de vencimiento de la licencia."],
  "Licença do aplicativo": ["App license", "Licencia de la aplicación"],
  "Verificando licença…": ["Checking license…", "Verificando licencia…"],
  "Licença bloqueada pelo administrador.": ["License blocked by the administrator.", "Licencia bloqueada por el administrador."],
  "A licença deste cliente venceu.": ["This customer’s license has expired.", "La licencia de este cliente ha vencido."],
  "Não foi possível ler a licença neste aparelho.": ["Could not read the license on this device.", "No se pudo leer la licencia en este dispositivo."],
  "Este tablet ainda não verificou a licença.": ["This tablet has not verified its license yet.", "Esta tableta aún no ha verificado la licencia."],
  "Conecte à internet ou solicite ao administrador um código temporário para este tablet.": ["Connect to the internet or ask the administrator for a temporary code for this tablet.", "Conéctate a internet o solicita al administrador un código temporal para esta tableta."],
  "Verificar agora": ["Check now", "Verificar ahora"],
  "Não foi possível consultar a licença. A última validade recebida continua valendo.": ["Could not check the license. The last received expiration date still applies.", "No se pudo consultar la licencia. Se mantiene la última fecha de vencimiento recibida."],
  "Aplicar código temporário": ["Apply temporary code", "Aplicar código temporal"],
  "Código inválido, vencido ou destinado a outro tablet.": ["Invalid or expired code, or code for another tablet.", "Código no válido, vencido o destinado a otra tableta."],
  "Tema claro": ["Light theme", "Tema claro"],
  "Tema escuro": ["Dark theme", "Tema oscuro"],
  "Claro": ["Light", "Claro"],
  "Escuro": ["Dark", "Oscuro"],
  "Não foi possível salvar o tema.": ["Could not save the theme.", "No se pudo guardar el tema."],
  "Operador de caixa": ["Cashier", "Cajero"],
  "Admin": ["Admin", "Admin"],
  "Gerente": ["Manager", "Gerente"],
  "Cozinheiro": ["Cook", "Cocinero"],
  "Perfil de acesso": ["Access profile", "Perfil de acceso"],
  "Perfil inválido.": ["Invalid access profile.", "Perfil de acceso no válido."],
  "Editar usuário": ["Edit user", "Editar usuario"],
  "Seu perfil não tem acesso a esta tela ou o módulo está desativado.": ["Your profile cannot access this screen or the module is disabled.", "Tu perfil no tiene acceso a esta pantalla o el módulo está desactivado."],
  "O perfil limita as telas do aplicativo. Módulos desativados permanecem indisponíveis.": ["The profile limits app screens. Disabled modules remain unavailable.", "El perfil limita las pantallas de la aplicación. Los módulos desactivados siguen sin estar disponibles."],

  "Preparo": ["Kitchen", "Cocina"],
  "Clientes": ["Customers", "Clientes"],
  "Fila de preparo": ["Kitchen queue","Cola de cocina"],
  "Ordem de emissão": ["Ordered by time placed","Orden por hora del pedido"],
  "Filtros e avisos": ["Filters and alerts","Filtros y avisos"],
  "Itens e observações nos detalhes": ["Items and notes in details","Artículos y notas en los detalles"],
  "Detalhes": ["Details","Detalles"],
  "Pedidos anteriores": ["Previous orders","Pedidos anteriores"],
  "Próximos pedidos": ["Next orders","Siguientes pedidos"],
  "Filtrar por dia: ligado": ["Day filter: on","Filtro por día: activado"],
  "Filtrar por dia: desligado": ["Day filter: off","Filtro por día: desactivado"],
  "Iniciar": ["Start","Iniciar"],
  "Finalizar": ["Complete","Finalizar"],
  "Entre na nuvem para reimprimir pelo painel de preparo.": ["Sign in online to reprint from the kitchen display.","Inicia sesión en línea para reimprimir desde la pantalla de cocina."],
  "Reimpressão no preparo não habilitada para esta loja.": ["Kitchen reprinting is not enabled for this location.","La reimpresión en cocina no está habilitada para este local."],
  "Não foi possível autorizar a reimpressão. Confira a conexão e as permissões.": ["Unable to authorize reprinting. Check your connection and permissions.","No se pudo autorizar la reimpresión. Comprueba la conexión y los permisos."],
  "Configuração de preparo inválida.": ["Invalid kitchen settings.","Configuración de cocina no válida."],
  "Permitir reimpressão no painel de preparo": ["Allow reprinting from the kitchen display","Permitir la reimpresión desde la pantalla de cocina"],
  "Também respeita as permissões de reimpressão de cada usuário. A impressora deve estar configurada no tablet da cozinha.": ["User reprint permissions also apply. Configure the printer on the kitchen tablet.","También se aplican los permisos de reimpresión de cada usuario. Configura la impresora en la tableta de cocina."],
  'Pendências': ['Pending items', 'Pendientes'],
  'Fechar': ['Close', 'Cerrar'],
  'Revise os itens esgotados antes de enviar.': ['Review sold-out items before sending.', 'Revisa los productos agotados antes de enviar.'],
  'Sales tax': ['Sales tax', 'Impuesto sobre ventas'],
  'Cardápio recebido inválido': ['The received menu is invalid.', 'El menú recibido no es válido.'],
  'Informe um endereço HTTPS válido, sem usuário, senha ou fragmento.': ['Enter a valid HTTPS address without a username, password or fragment.', 'Introduce una dirección HTTPS válida, sin usuario, contraseña ni fragmento.'],
  'Comanda não encontrada.': ['Kitchen ticket not found.', 'Comanda no encontrada.'],
  'Loja': ['Store', 'Tienda'],
  'Tipo de pedido': ['Order type', 'Tipo de pedido'],
  'Onde será consumido?': ['For here or to go?', '¿Para comer aquí o para llevar?'],
  'Para comer aqui': ['For here', 'Para comer aquí'],
  'Para levar': ['To go', 'Para llevar'],
  'Escolha se o pedido é para comer aqui ou para levar.': ['Choose whether this order is for here or to go.', 'Elija si el pedido es para comer aquí o para llevar.'],
  'Detalhes do pedido': ['Order details', 'Detalles del pedido'],
  'Pedido não encontrado.': ['Order not found.', 'Pedido no encontrado.'],
  "Carregando dados salvos…": [
    "Loading saved data…",
    "Cargando datos guardados…"
  ],
  "Escolher logotipo do restaurante": [
    "Choose restaurant logo",
    "Elegir logotipo del restaurante"
  ],
  "COMANDA DIGITAL": [
    "DIGITAL ORDERS",
    "COMANDAS DIGITALES"
  ],
  "Do pedido à cozinha": [
    "From order to kitchen",
    "Del pedido a la cocina"
  ],
  "ADICIONAR AO PEDIDO": [
    "ADD TO ORDER",
    "AGREGAR AL PEDIDO"
  ],
  "Como você quer este produto?": [
    "How would you like this item?",
    "¿Cómo desea este producto?"
  ],
  "Pizza promocional: somente inteira e sem adicionais.": [
    "Promotional pizza: whole only, no extras.",
    "Pizza en promoción: solo entera y sin extras."
  ],
  "1. Inteira ou dois sabores?": [
    "1. Whole or two flavors?",
    "1. ¿Entera o dos sabores?"
  ],
  "Inteira": [
    "Whole",
    "Entera"
  ],
  "Dois sabores": [
    "Two flavors",
    "Dos sabores"
  ],
  "2. Qual é o outro sabor?": [
    "2. What is the other flavor?",
    "2. ¿Cuál es el otro sabor?"
  ],
  "1ª metade:": [
    "1st half:",
    "1.ª mitad:"
  ],
  "2ª metade:": [
    "2nd half:",
    "2.ª mitad:"
  ],
  "1ª metade: ": [
    "1st half: ",
    "1.ª mitad: "
  ],
  "2ª metade: ": [
    "2nd half: ",
    "2.ª mitad: "
  ],
  "Extras (opcional)": [
    "Extras (optional)",
    "Extras (opcional)"
  ],
  "Pizza inteira": [
    "Whole pizza",
    "Pizza entera"
  ],
  "Pizza de dois sabores": [
    "Two-flavor pizza",
    "Pizza de dos sabores"
  ],
  "inteira": [
    "whole",
    "entera"
  ],
  "Observação (opcional)": [
    "Notes (optional)",
    "Observaciones (opcional)"
  ],
  "Observação do produto": [
    "Item notes",
    "Observaciones del producto"
  ],
  "Ex.: bem passado, sem molho...": [
    "E.g. well done, no sauce...",
    "Ej.: bien cocido, sin salsa..."
  ],
  "Sem cebola": [
    "No onion",
    "Sin cebolla"
  ],
  "Sem pimenta": [
    "No pepper",
    "Sin pimienta"
  ],
  "Bem passado": [
    "Well done",
    "Bien cocido"
  ],
  "Pouco sal": [
    "Less salt",
    "Poca sal"
  ],
  "Adicionar ao pedido": [
    "Add to order",
    "Agregar al pedido"
  ],
  "Cancelar": [
    "Cancel",
    "Cancelar"
  ],
  "Sistema iOS (AirPrint)": [
    "iOS system (AirPrint)",
    "Sistema iOS (AirPrint)"
  ],
  "Sistema Android": [
    "Android system",
    "Sistema Android"
  ],
  "Selecione o driver instalado no tablet na janela de impressão do sistema.": [
    "Select the driver installed on this tablet in the system print dialog.",
    "Seleccione el controlador instalado en esta tableta en el diálogo de impresión del sistema."
  ],
  "Esta conexão direta ainda não está disponível. Escolha a impressão pelo sistema para usar o driver instalado.": [
    "This direct connection is not available yet. Choose system printing to use the installed driver.",
    "Esta conexión directa aún no está disponible. Elija la impresión del sistema para usar el controlador instalado."
  ],
  "Bluetooth": [
    "Bluetooth",
    "Bluetooth"
  ],
  "Wi-Fi / rede": [
    "Wi-Fi / network",
    "Wi-Fi / red"
  ],
  "USB / OTG": [
    "USB / OTG",
    "USB / OTG"
  ],
  "Início": [
    "Home",
    "Inicio"
  ],
  "Visão geral": [
    "Overview",
    "Vista general"
  ],
  "Pedido": [
    "Order",
    "Pedido"
  ],
  "Novo pedido": [
    "New order",
    "Nuevo pedido"
  ],
  "Montar uma comanda": [
    "Create an order",
    "Crear una comanda"
  ],
  "Cardápio": [
    "Menu",
    "Menú"
  ],
  "Produtos e categorias": [
    "Products and categories",
    "Productos y categorías"
  ],
  "Histórico": [
    "History",
    "Historial"
  ],
  "Consultar e reimprimir": [
    "View and reprint",
    "Consultar y reimprimir"
  ],
  "Ajustes": [
    "Settings",
    "Ajustes"
  ],
  "Configurações": [
    "Settings",
    "Configuración"
  ],
  "Impressora e atualização": [
    "Printer and updates",
    "Impresora y actualizaciones"
  ],
  "Todos": [
    "All",
    "Todos"
  ],
  "Histórico inválido": [
    "Invalid history",
    "Historial inválido"
  ],
  "Cardápio inválido": [
    "Invalid menu",
    "Menú inválido"
  ],
  "Dados indisponíveis": [
    "Data unavailable",
    "Datos no disponibles"
  ],
  "Não foi possível carregar os dados salvos. Feche e abra o aplicativo para tentar novamente. O envio ficará bloqueado para proteger o histórico.": [
    "Could not load saved data. Close and reopen the app to try again. Sending is blocked to protect your history.",
    "No se pudieron cargar los datos. Cierre y vuelva a abrir la aplicación. El envío está bloqueado para proteger el historial."
  ],
  "Confira a pizza": [
    "Check the pizza",
    "Revise la pizza"
  ],
  "Confira os sabores.": [
    "Check the flavors.",
    "Revise los sabores."
  ],
  "Falha ao salvar": [
    "Could not save",
    "Error al guardar"
  ],
  "Não foi possível salvar a regra do cliente. Tente novamente.": [
    "Could not save the customer rule. Try again.",
    "No se pudo guardar la regla del cliente. Intente nuevamente."
  ],
  "Permissão necessária": [
    "Permission required",
    "Permiso necesario"
  ],
  "Permita o acesso às fotos para escolher o logotipo do restaurante.": [
    "Allow photo access to choose the restaurant logo.",
    "Permita el acceso a las fotos para elegir el logotipo del restaurante."
  ],
  "Confira nomes, categorias e identificadores do cardápio.": [
    "Check menu names, categories and IDs.",
    "Revise nombres, categorías e identificadores del menú."
  ],
  "Cardápio salvo": [
    "Menu saved",
    "Menú guardado"
  ],
  "Os produtos foram salvos neste aparelho.": [
    "Products were saved on this device.",
    "Los productos se guardaron en este dispositivo."
  ],
  "Não foi possível salvar o cardápio.": [
    "Could not save the menu.",
    "No se pudo guardar el menú."
  ],
  "Novo produto": [
    "New product",
    "Nuevo producto"
  ],
  "Verificando atualizações…": [
    "Checking for updates…",
    "Buscando actualizaciones…"
  ],
  "Cardápio atualizado com sucesso": [
    "Menu updated successfully",
    "Menú actualizado correctamente"
  ],
  "Cardápio atualizado": [
    "Menu updated",
    "Menú actualizado"
  ],
  "Cardápio atualizado com sucesso.": [
    "Menu updated successfully.",
    "Menú actualizado correctamente."
  ],
  "Seu cardápio já está atualizado": [
    "Your menu is up to date",
    "Su menú está actualizado"
  ],
  "Cardápio em dia": [
    "Menu up to date",
    "Menú al día"
  ],
  "Seu cardápio já está atualizado.": [
    "Your menu is up to date.",
    "Su menú está actualizado."
  ],
  "Cardápio salvo disponível": [
    "Saved menu available",
    "Menú guardado disponible"
  ],
  "Atualização indisponível": [
    "Update unavailable",
    "Actualización no disponible"
  ],
  "Não foi possível verificar atualizações agora. O cardápio salvo continua disponível.": [
    "Could not check for updates now. Your saved menu is still available.",
    "No se pudieron buscar actualizaciones. El menú guardado sigue disponible."
  ],
  "Configuração salva": [
    "Settings saved",
    "Configuración guardada"
  ],
  "As preferências da impressora foram salvas neste aparelho.": [
    "Printer settings were saved on this device.",
    "La configuración de la impresora se guardó en este dispositivo."
  ],
  "Não foi possível salvar a configuração.": [
    "Could not save settings.",
    "No se pudo guardar la configuración."
  ],
  "Impressão aberta": [
    "Print dialog opened",
    "Impresión abierta"
  ],
  "Confirme o envio na janela de impressão.": [
    "Confirm sending in the print dialog.",
    "Confirme el envío en la ventana de impresión."
  ],
  "Impressão indisponível": [
    "Printing unavailable",
    "Impresión no disponible"
  ],
  "Não foi possível iniciar a impressão.": [
    "Could not start printing.",
    "No se pudo iniciar la impresión."
  ],
  "Teste de impressão aberto": [
    "Print test opened",
    "Prueba de impresión abierta"
  ],
  "Selecione a impressora e confirme o envio na janela de impressão.": [
    "Select the printer and confirm in the print dialog.",
    "Seleccione la impresora y confirme el envío en la ventana de impresión."
  ],
  "Teste não iniciado": [
    "Test not started",
    "Prueba no iniciada"
  ],
  "Não foi possível iniciar o teste de impressão.": [
    "Could not start the print test.",
    "No se pudo iniciar la prueba de impresión."
  ],
  "Comanda vazia": [
    "Empty order",
    "Comanda vacía"
  ],
  "Adicione pelo menos um item antes de enviar.": [
    "Add at least one item before sending.",
    "Agregue al menos un producto antes de enviar."
  ],
  "Cliente obrigatório": [
    "Customer required",
    "Cliente obligatorio"
  ],
  "Informe o nome do cliente antes de enviar a comanda.": [
    "Enter the customer's name before sending the order.",
    "Ingrese el nombre del cliente antes de enviar la comanda."
  ],
  "Seu pedido foi mantido. Tente enviar novamente. A impressão não foi iniciada.": [
    "Your order was kept. Try sending again. Printing has not started.",
    "Su pedido se conservó. Intente enviarlo de nuevo. La impresión no se inició."
  ],
  "Consulte suas comandas e reimprima quando precisar.": [
    "View your orders and reprint when needed.",
    "Consulte sus comandas y reimprima cuando lo necesite."
  ],
  "Seu histórico começa aqui": [
    "Your history starts here",
    "Su historial comienza aquí"
  ],
  "As comandas salvas aparecerão nesta tela.": [
    "Saved orders will appear here.",
    "Las comandas guardadas aparecerán aquí."
  ],
  "Mesa": [
    "Table",
    "Mesa"
  ],
  "Pedido nº": [
    "Order #",
    "Pedido n.º"
  ],
  "Mesa ": [
    "Table ",
    "Mesa "
  ],
  "Cliente não informado": [
    "Customer not provided",
    "Cliente no informado"
  ],
  "item": [
    "item",
    "producto"
  ],
  "itens": [
    "items",
    "productos"
  ],
  "Reimprimir": [
    "Reprint",
    "Reimprimir"
  ],
  "BOM ATENDIMENTO COMEÇA AQUI": [
    "GREAT SERVICE STARTS HERE",
    "EL BUEN SERVICIO EMPIEZA AQUÍ"
  ],
  "Tudo pronto para o próximo pedido.": [
    "Ready for the next order.",
    "Todo listo para el próximo pedido."
  ],
  "Monte a comanda, confira os detalhes e envie para a cozinha.": [
    "Create the order, check the details and send it to the kitchen.",
    "Prepare la comanda, revise los detalles y envíela a la cocina."
  ],
  "Iniciar pedido": [
    "Start order",
    "Iniciar pedido"
  ],
  "Acesso rápido": [
    "Quick access",
    "Acceso rápido"
  ],
  " pedido salvo": [
    " saved order",
    " pedido guardado"
  ],
  " pedidos salvos": [
    " saved orders",
    " pedidos guardados"
  ],
  "Seu cardápio e seu histórico ficam salvos neste aparelho.": [
    "Your menu and history are saved on this device.",
    "Su menú e historial se guardan en este dispositivo."
  ],
  "Organize os produtos e as categorias do seu cardápio.": [
    "Manage your menu's products and categories.",
    "Organice los productos y las categorías de su menú."
  ],
  "Carregar cardápio Seabra": [
    "Load Seabra menu",
    "Cargar menú Seabra"
  ],
  "Substituir os produtos deste aparelho pelo cardápio das fotos? O histórico será mantido.": [
    "Replace this device's products with the photographed menu? History will be kept.",
    "¿Reemplazar los productos por el menú de las fotos? Se conservará el historial."
  ],
  "Carregar": [
    "Load",
    "Cargar"
  ],
  "Tente salvar o cardápio novamente.": [
    "Try saving the menu again.",
    "Intente guardar el menú nuevamente."
  ],
  "Nome do produto": [
    "Product name",
    "Nombre del producto"
  ],
  "Ex.: pizza de calabresa": [
    "E.g. pizza de calabresa",
    "Ej.: pizza de calabresa"
  ],
  "Categoria": [
    "Category",
    "Categoría"
  ],
  "Categoria do produto": [
    "Product category",
    "Categoría del producto"
  ],
  "Ex.: pizzas": [
    "E.g. pizzas",
    "Ej.: pizzas"
  ],
  "✓ Pizza": [
    "✓ Pizza",
    "✓ Pizza"
  ],
  "Marcar como pizza": [
    "Mark as pizza",
    "Marcar como pizza"
  ],
  "Excluir": [
    "Delete",
    "Eliminar"
  ],
  "+ Adicionar produto": [
    "+ Add product",
    "+ Agregar producto"
  ],
  "Salvar": ["Save", "Guardar"],
  "Editar produto": ["Edit product", "Editar producto"],
  "Excluir este produto do cardápio?": ["Delete this product from the menu?", "¿Eliminar este producto del menú?"],
  "Salvar cardápio": [
    "Save menu",
    "Guardar menú"
  ],
  "Identificação": [
    "Order details",
    "Identificación"
  ],
  "Produtos": [
    "Products",
    "Productos"
  ],
  "Revisão": [
    "Review",
    "Revisión"
  ],
  "Revisão do pedido": [
    "Order review",
    "Revisión del pedido"
  ],
  "Finalizar pedido": [
    "Finish order",
    "Finalizar pedido"
  ],
  "Revisar pedido": [
    "Review order",
    "Revisar pedido"
  ],
  "Conferir antes de enviar": [
    "Review before sending",
    "Revisar antes de enviar"
  ],
  "Confira os dados e toque em Finalizar pedido para enviar.": [
    "Check the details and tap Finish order to send.",
    "Revise los datos y toque Finalizar pedido para enviar."
  ],
  "Editar": [
    "Edit",
    "Editar"
  ],
  "Salvando e abrindo prévia…": [
    "Saving and opening preview…",
    "Guardando y abriendo vista previa…"
  ],
  "Salvar e conferir impressão": [
    "Save and check printout",
    "Guardar y revisar impresión"
  ],
  "Outro número de mesa": [
    "Other table number",
    "Otro número de mesa"
  ],
  "Outro número de mesa (opcional)": [
    "Other table number (optional)",
    "Otro número de mesa (opcional)"
  ],
  "Cliente": [
    "Customer",
    "Cliente"
  ],
  "(obrigatório)": [
    "(required)",
    "(obligatorio)"
  ],
  "(opcional)": [
    "(optional)",
    "(opcional)"
  ],
  "Nome do cliente, obrigatório": [
    "Customer name, required",
    "Nombre del cliente, obligatorio"
  ],
  "Nome do cliente, opcional": [
    "Customer name, optional",
    "Nombre del cliente, opcional"
  ],
  "Nome do cliente": [
    "Customer name",
    "Nombre del cliente"
  ],
  "Escolha os produtos": [
    "Choose products",
    "Elija los productos"
  ],
  "Nenhum produto nesta categoria.": [
    "No products in this category.",
    "No hay productos en esta categoría."
  ],
  "Adicionar ": [
    "Add ",
    "Agregar "
  ],
  "Pedido atual": [
    "Current order",
    "Pedido actual"
  ],
  "Vamos montar uma comanda?": [
    "Let's create an order",
    "¿Preparamos una comanda?"
  ],
  "Toque em um produto do cardápio para adicioná-lo ao pedido.": [
    "Tap a product to add it to the order.",
    "Toque un producto del menú para agregarlo al pedido."
  ],
  "Diminuir quantidade de ": [
    "Decrease quantity of ",
    "Reducir cantidad de "
  ],
  "Aumentar quantidade de ": [
    "Increase quantity of ",
    "Aumentar cantidad de "
  ],
  "Observação de ": [
    "Notes for ",
    "Observaciones de "
  ],
  "Observação do item": [
    "Item notes",
    "Observaciones del producto"
  ],
  "Salvando e abrindo impressão…": [
    "Saving and opening print dialog…",
    "Guardando y abriendo impresión…"
  ],
  "Enviar comanda": [
    "Send order",
    "Enviar comanda"
  ],
  "Salvar e abrir a impressão": [
    "Save and open print dialog",
    "Guardar y abrir impresión"
  ],
  "Pedidos": [
    "Orders",
    "Pedidos"
  ],
  "Obrigar informar cliente": [
    "Require customer name",
    "Exigir nombre del cliente"
  ],
  "Salvando…": [
    "Saving…",
    "Guardando…"
  ],
  "Salvo automaticamente. Quando ativado, exige o nome do cliente antes de enviar a comanda.": [
    "Saved automatically. When enabled, requires a customer name before sending the order.",
    "Se guarda automáticamente. Si está activado, exige el nombre del cliente antes de enviar la comanda."
  ],
  "Impressora": [
    "Printer",
    "Impresora"
  ],
  "Escolha a conexão e a largura do papel para suas comandas.": [
    "Choose the connection and paper width for your orders.",
    "Elija la conexión y el ancho del papel para sus comandas."
  ],
  "Método de conexão": [
    "Connection method",
    "Método de conexión"
  ],
  "Nome da impressora": [
    "Printer name",
    "Nombre de la impresora"
  ],
  "Opcional": [
    "Optional",
    "Opcional"
  ],
  "Endereço ou identificador": [
    "Address or identifier",
    "Dirección o identificador"
  ],
  "Endereço da impressora": [
    "Printer address",
    "Dirección de la impresora"
  ],
  "Endereço IP da impressora": [
    "Printer IP address",
    "Dirección IP de la impresora"
  ],
  "Endereço, MAC ou identificador": [
    "Address, MAC or identifier",
    "Dirección, MAC o identificador"
  ],
  "Porta de rede": [
    "Network port",
    "Puerto de red"
  ],
  "Largura do papel": [
    "Paper width",
    "Ancho del papel"
  ],
  "Salvar configurações": [
    "Save settings",
    "Guardar configuración"
  ],
  "Testar impressora": [
    "Test printer",
    "Probar impresora"
  ],
  "Cardápio online": [
    "Online menu",
    "Menú en línea"
  ],
  "Verificamos atualizações ao abrir o aplicativo. Você também pode atualizar quando quiser.": [
    "We check for updates when the app opens. You can also update at any time.",
    "Buscamos actualizaciones al abrir la aplicación. También puede actualizar cuando quiera."
  ],
  "Seu cardápio fica disponível mesmo sem internet.": [
    "Your menu is available even offline.",
    "Su menú está disponible incluso sin internet."
  ],
  "Verificando…": [
    "Checking…",
    "Verificando…"
  ],
  "Atualizar cardápio": [
    "Update menu",
    "Actualizar menú"
  ],
  "Comanda de produção": [
    "Kitchen order",
    "Comanda de producción"
  ],
  "COMANDA DE PRODUÇÃO": [
    "KITCHEN ORDER",
    "COMANDA DE PRODUCCIÓN"
  ],
  "COZINHA": [
    "KITCHEN",
    "COCINA"
  ],
  "Não informado": [
    "Not provided",
    "No informado"
  ],
  "Data": [
    "Date",
    "Fecha"
  ],
  "Obs": [
    "Notes",
    "Obs"
  ],
  "Teste de impressão": [
    "Print test",
    "Prueba de impresión"
  ],
  "TESTE DE IMPRESSÃO": [
    "PRINT TEST",
    "PRUEBA DE IMPRESIÓN"
  ],
  "Impressora configurada com sucesso": [
    "Printer configured successfully",
    "Impresora configurada correctamente"
  ],
  "Conexão direta indisponível. Use a impressão pelo sistema.": [
    "Direct connection unavailable. Use system printing.",
    "Conexión directa no disponible. Use la impresión del sistema."
  ],
  "Escolha pizza inteira ou dois sabores.": [
    "Choose whole pizza or two flavors.",
    "Elija pizza entera o dos sabores."
  ],
  "Escolha outro sabor não promocional para a segunda metade.": [
    "Choose another non-promotional flavor for the second half.",
    "Elija otro sabor sin promoción para la segunda mitad."
  ],
  "Extras por metade exigem uma pizza de dois sabores.": [
    "Half-specific extras require a two-flavor pizza.",
    "Los extras por mitad requieren una pizza de dos sabores."
  ],
  "Aperitivos": [
    "Appetizers",
    "Aperitivos"
  ],
  "Lanches": [
    "Sandwiches",
    "Sándwiches"
  ],
  "Hambúrgueres": [
    "Burgers",
    "Hamburguesas"
  ],
  "Salgados": [
    "Savory snacks",
    "Bocadillos"
  ],
  "Pizzas promocionais": [
    "Promotional pizzas",
    "Pizzas en promoción"
  ],
  "Pizzas regulares": [
    "Regular pizzas",
    "Pizzas regulares"
  ],
  "Pizzas especiais": [
    "Special pizzas",
    "Pizzas especiales"
  ],
  "Fatias": [
    "Slices",
    "Porciones"
  ],
  "Idioma": [
    "Language",
    "Idioma"
  ],
  "Sair do sistema": [
    "Sign out",
    "Cerrar sesión"
  ],
  "Usuário": [
    "Username",
    "Usuario"
  ],
  "Senha": [
    "Password",
    "Contraseña"
  ],
  "Entrar": [
    "Sign in",
    "Iniciar sesión"
  ],
  "Criar acesso": [
    "Create access",
    "Crear acceso"
  ],
  "Primeiro acesso": [
    "First-time setup",
    "Primer acceso"
  ],
  "Defina o usuário, a senha de entrada e uma senha para Configurações.": [
    "Set a username, a sign-in password and a Settings password.",
    "Defina un usuario, una contraseña de acceso y otra para Configuración."
  ],
  "Confirmar senha": [
    "Confirm password",
    "Confirmar contraseña"
  ],
  "Senha de Configurações": [
    "Settings password",
    "Contraseña de Configuración"
  ],
  "Confirmar senha de Configurações": [
    "Confirm Settings password",
    "Confirmar contraseña de Configuración"
  ],
  "Acesso protegido": [
    "Protected access",
    "Acceso protegido"
  ],
  "Digite a senha de Configurações para continuar.": [
    "Enter the Settings password to continue.",
    "Ingrese la contraseña de Configuración para continuar."
  ],
  "Desbloquear": [
    "Unlock",
    "Desbloquear"
  ],
  "Voltar": [
    "Back",
    "Volver"
  ],
  "Usuário ou senha incorretos.": [
    "Incorrect username or password.",
    "Usuario o contraseña incorrectos."
  ],
  "Senha incorreta.": [
    "Incorrect password.",
    "Contraseña incorrecta."
  ],
  "As senhas precisam ter pelo menos 8 caracteres e coincidir com a confirmação.": [
    "Passwords must be at least 8 characters long and match their confirmation.",
    "Las contraseñas deben tener al menos 8 caracteres y coincidir con la confirmación."
  ],
  "Informe um usuário.": [
    "Enter a username.",
    "Ingrese un usuario."
  ],
  "Não foi possível acessar o armazenamento seguro. Tente novamente.": [
    "Could not access secure storage. Try again.",
    "No se pudo acceder al almacenamiento seguro. Intente nuevamente."
  ],
  "Tente novamente": [
    "Try again",
    "Intentar de nuevo"
  ],
  "Muitas tentativas. Aguarde um minuto.": [
    "Too many attempts. Wait one minute.",
    "Demasiados intentos. Espere un minuto."
  ],
  "Alterar senhas": [
    "Change passwords",
    "Cambiar contraseñas"
  ],
  "Nova senha de entrada": [
    "New sign-in password",
    "Nueva contraseña de acceso"
  ],
  "Nova senha de Configurações": [
    "New Settings password",
    "Nueva contraseña de Configuración"
  ],
  "Senhas alteradas": [
    "Passwords changed",
    "Contraseñas cambiadas"
  ],
  "Guarde suas senhas. Não há recuperação por e-mail para o acesso local.": [
    "Keep your passwords safe. Local access has no email recovery.",
    "Guarde sus contraseñas. El acceso local no tiene recuperación por correo."
  ],
  "Acesso local indisponível no navegador. Use o aplicativo Android ou iPad.": [
    "Local access is unavailable in the browser. Use the Android or iPad app.",
    "El acceso local no está disponible en el navegador. Use la aplicación Android o iPad."
  ]
};

Object.assign(translations, {
  'Som de pedido novo: ligado': ['New order sound: on', 'Sonido de nuevo pedido: activado'],
  'Som de pedido novo: desligado': ['New order sound: off', 'Sonido de nuevo pedido: desactivado'],
  'Testar som': ['Test sound', 'Probar sonido'],
  'Mantenha este painel aberto para receber avisos de novos pedidos.': ['Keep this panel open to receive new order alerts.', 'Mantenga este panel abierto para recibir avisos de nuevos pedidos.'],
  'Novos pedidos': ['New orders', 'Nuevos pedidos'],
  'Ver e confirmar recebimento': ['View and acknowledge', 'Ver y confirmar recepción'],
  'Pedido novo': ['New order', 'Nuevo pedido'],
  'Início do preparo': ['Preparation started', 'Inicio de preparación'],
  'Tempo de preparo': ['Preparation time', 'Tiempo de preparación'],
  'Imprimir automaticamente ao enviar': ['Print automatically when sending', 'Imprimir automáticamente al enviar'],
  'Opcional por tablet, somente pela rede. Salve as configurações. O pedido é salvo antes da impressão; em falha, a prévia permite tentar novamente sem reenviar os destinos confirmados.': ['Optional per tablet, network printing only. Save the settings. The order is saved before printing; on failure, the preview allows a retry without resending to acknowledged destinations.', 'Opcional por tablet, solo por red. Guarda la configuración. El pedido se guarda antes de imprimir; si falla, la vista previa permite reintentar sin reenviar a los destinos confirmados.'],
  'Impressão automática exige impressoras de rede configuradas.': ['Automatic printing requires configured network printers.', 'La impresión automática requiere impresoras de red configuradas.'],
  'Impressão em andamento': ['Printing in progress', 'Impresión en curso'],
  'Aguarde a impressão em andamento.': ['Wait for the current print job.', 'Espera a que termine la impresión actual.'],
  'Entre novamente para registrar o operador do preparo.': ['Sign in again to record the preparation operator.', 'Inicia sesión de nuevo para registrar el operador de preparación.'],
  'Tempo até pronto': ['Time until ready', 'Tiempo hasta estar listo'],
  'Tempo não registrado': ['Time not recorded', 'Tiempo no registrado'],
  'Confira a etapa e a data/hora do tablet antes de avançar o preparo.': ['Check the stage and tablet date/time before advancing preparation.', 'Revise la etapa y la fecha/hora de la tableta antes de avanzar la preparación.'],
  'Mostrando os dez primeiros clientes. Refine a busca.': ['Showing the first ten customers. Refine your search.', 'Se muestran los primeros diez clientes. Refine la búsqueda.'],
  'Mostrando os 100 primeiros clientes. Refine a busca para encontrar outros.': ['Showing the first 100 customers. Refine your search to find others.', 'Se muestran los primeros 100 clientes. Refine la búsqueda para encontrar otros.'],
  'Carregando pedidos…': ['Loading orders…', 'Cargando pedidos…'],
  'Carregar mais pedidos': ['Load more orders', 'Cargar más pedidos'],
  'Não foi possível consultar os pedidos. Toque para tentar novamente.': ['Could not load orders. Tap to try again.', 'No se pudieron consultar los pedidos. Toca para reintentar.'],
  'Registros recebidos': ['Records received', 'Registros recibidos'],
  'Não foi possível sincronizar. Toque para tentar novamente.': ['Could not synchronize. Tap to try again.', 'No se pudo sincronizar. Toca para reintentar.'],
  "Sincronizando…": [
    "Synchronizing…",
    "Sincronizando…"
  ],
  "Dados sincronizados": [
    "Data synchronized",
    "Datos sincronizados"
  ],
  "Alterações em conflito": [
    "Conflicting changes",
    "Cambios en conflicto"
  ],
  "Entre na nuvem para sincronizar": [
    "Sign in online to synchronize",
    "Inicie sesión en línea para sincronizar"
  ],
  "Falha no armazenamento local": [
    "Local storage error",
    "Error de almacenamiento local"
  ],
  "Pendente de sincronização": [
    "Pending synchronization",
    "Pendiente de sincronización"
  ],
  "Sincronização": [
    "Synchronization",
    "Sincronización"
  ],
  "Entre novamente com internet para conectar este tablet. Os pedidos locais serão mantidos.": [
    "Sign in again with internet to connect this tablet. Local orders will be kept.",
    "Inicie sesión de nuevo con internet para conectar este dispositivo. Se conservarán los pedidos locales."
  ],
  "Este cadastro foi alterado em outro tablet. Escolha qual versão manter. Para pedidos, manter local preserva as duas comandas.": [
    "This record was changed on another tablet. Choose which version to keep. For orders, keeping local preserves both orders.",
    "Este registro cambió en otra tablet. Elija qué versión conservar. Para pedidos, conservar local mantiene ambas comandas."
  ],
  "Usar servidor": [
    "Use server version",
    "Usar versión del servidor"
  ],
  "Manter local": [
    "Keep local version",
    "Conservar versión local"
  ],
  "Última sincronização": [
    "Last synchronization",
    "Última sincronización"
  ],
  "Salvo no servidor": [
    "Saved on server",
    "Guardado en el servidor"
  ],
  "Tablet": [
    "Tablet",
    "Tablet"
  ],
  "Entre como admin para gerenciar os usuários compartilhados.": [
    "Sign in as admin to manage shared users.",
    "Entre como admin para gestionar los usuarios compartidos."
  ],
  "Usuários são compartilhados entre tablets após sincronizar. Offline, ficam disponíveis os acessos já recebidos neste aparelho.": [
    "Users are shared between tablets after synchronization. Offline access is available for accounts already received on this device.",
    "Los usuarios se comparten entre tablets al sincronizar. Sin conexión, están disponibles las cuentas ya recibidas en este dispositivo."
  ],
  "Este tablet": [
    "This tablet",
    "Esta tablet"
  ],
  "Nome do tablet": [
    "Tablet name",
    "Nombre de la tablet"
  ],
  "Salvar nome do tablet": [
    "Save tablet name",
    "Guardar nombre de la tablet"
  ],
  "Informe um nome para o tablet.": [
    "Enter a tablet name.",
    "Introduzca un nombre para la tablet."
  ],
  "Copiar preferências": [
    "Copy preferences",
    "Copiar preferencias"
  ],
  "Copiar": [
    "Copy",
    "Copiar"
  ],
  "Impressora e idioma são separados por tablet. Após reinstalar, você pode copiar as preferências do aparelho anterior.": [
    "Printer and language are separate for each tablet. After reinstalling, you can copy preferences from the previous device.",
    "La impresora y el idioma son independientes por tablet. Al reinstalar, puede copiar las preferencias del dispositivo anterior."
  ],
  "Produtos salvos. Alterações sem conexão ficam pendentes de sincronização.": [
    "Products saved. Offline changes remain pending synchronization.",
    "Productos guardados. Los cambios sin conexión quedan pendientes de sincronización."
  ],
  "Salve as alterações do cardápio antes de atualizar.": [
    "Save menu edits before refreshing.",
    "Guarde los cambios del menú antes de actualizar."
  ],
  "Escolha uma imagem menor para sincronizar o logotipo.": [
    "Choose a smaller image to synchronize the logo.",
    "Elija una imagen más pequeña para sincronizar el logotipo."
  ]
});

Object.assign(translations, {
  'O admin já está configurado. Use a senha de entrada.': ['Admin is already configured. Use the sign-in password.', 'Admin ya está configurado. Use la contraseña de acceso.'],
  'Chave de recuperação incorreta.': ['Incorrect recovery key.', 'Clave de recuperación incorrecta.'],
  'Chave de recuperação': ['Recovery key', 'Clave de recuperación'],
  'Senha temporária': ['Temporary password', 'Contraseña temporal'],
  'Recuperar sem internet': ['Recover offline', 'Recuperar sin internet'],
  'Ativar acesso offline': ['Activate offline access', 'Activar acceso sin internet'],
  'Acesso do admin não encontrado. Recupere pela internet ou use sua chave de recuperação offline.': ['Admin access not found. Recover online or use your offline recovery key.', 'No se encontró el acceso del admin. Recupérelo por internet o use su clave de recuperación sin conexión.'],
  'Informe a chave de recuperação guardada fora do aparelho e crie uma senha temporária de sua escolha. Ao conectar, o admin voltará a usar a senha semanal. Pedidos e usuários apagados não serão recuperados.': ['Enter the recovery key kept outside this device and create a temporary password of your choice. After connecting, admin will use the weekly password again. Deleted orders and users will not be restored.', 'Introduzca la clave de recuperación guardada fuera del dispositivo y cree una contraseña temporal de su elección. Al conectarse, admin volverá a usar la contraseña semanal. Los pedidos y usuarios eliminados no se recuperarán.'],
  'Observações': ['Notes', 'Observaciones'],
  'Ver detalhes': ['View details', 'Ver detalles'],
  'Ocultar detalhes': ['Hide details', 'Ocultar detalles'],
  'Informe uma senha e confirme a mesma senha.': ['Enter a password and confirm it.', 'Introduzca una contraseña y confírmela.'],
  'A verificação demorou demais. Tente novamente.': ['Verification took too long. Try again.', 'La verificación tardó demasiado. Inténtelo de nuevo.'],
  'Não foi possível verificar a senha. Tente novamente.': ['Could not verify the password. Try again.', 'No se pudo verificar la contraseña. Inténtelo de nuevo.'],
  'Recupere o acesso do admin antes de entrar.': ['Recover admin access before signing in.', 'Recupere el acceso del admin antes de entrar.'],
  'Use de 3 a 24 letras, números, ponto, hífen ou sublinhado. Admin é reservado.': ['Use 3 to 24 letters, numbers, dots, hyphens or underscores. Admin is reserved.', 'Use de 3 a 24 letras, números, puntos, guiones o guiones bajos. Admin está reservado.'],
  'Este usuário já existe.': ['This user already exists.', 'Este usuario ya existe.'],
  'Limite de 30 usuários neste aparelho.': ['Limit of 30 users on this device.', 'Límite de 30 usuarios en este dispositivo.'],
  'Usuário não encontrado.': ['User not found.', 'Usuario no encontrado.'],
  'Não é possível desativar o usuário conectado.': ['You cannot deactivate the signed-in user.', 'No se puede desactivar el usuario conectado.'],
  'Não foi possível recuperar o acesso. Conecte à internet e tente novamente.': ['Could not recover access. Connect to the internet and try again.', 'No se pudo recuperar el acceso. Conéctese a internet e inténtelo de nuevo.'],
  'Acesso do admin não encontrado neste aparelho. Recupere a senha vigente sem criar outra senha.': ['Admin access was not found on this device. Recover the current password without creating another one.', 'No se encontró el acceso del admin en este dispositivo. Recupere la contraseña vigente sin crear otra.'],
  'Recuperar acesso do admin': ['Recover admin access', 'Recuperar acceso del admin'],
  'Usuários': ['Users', 'Usuarios'],
  'Usuários deste aparelho funcionam sem internet. O admin usa a senha semanal e não pode ser removido.': ['Users on this device work offline. Admin uses the weekly password and cannot be removed.', 'Los usuarios de este dispositivo funcionan sin internet. Admin usa la contraseña semanal y no se puede eliminar.'],
  'Usuário ativo': ['Active user', 'Usuario activo'],
  'Redefinir senha': ['Reset password', 'Restablecer contraseña'],
  'Cadastrar usuário': ['Create user', 'Crear usuario'],
  'Salvar usuário': ['Save user', 'Guardar usuario'],
});

Object.assign(translations, {
  'Gerenciar usuários': ['Manage users', 'Administrar usuarios'],
  'Usuários cadastrados': ['Registered users', 'Usuarios registrados'],
  'Ativo': ['Active', 'Activo'], 'Inativo': ['Inactive', 'Inactivo'],
  'Administrador protegido. Senha semanal gerenciada pelo painel online.': ['Protected administrator. Weekly password managed in the online panel.', 'Administrador protegido. Contraseña semanal administrada en el panel online.'],
  'Nenhum usuário adicional cadastrado.': ['No additional users registered.', 'No hay usuarios adicionales registrados.'],
  'Não foi possível carregar os usuários. Reabra os ajustes para tentar novamente.': ['Could not load users. Reopen settings to try again.', 'No se pudieron cargar los usuarios. Vuelva a abrir ajustes para intentarlo de nuevo.'],
  'Alterar minha senha': ['Change my password', 'Cambiar mi contraseña'],
  'Selecionar usuário': ['Select user', 'Seleccionar usuario'],
  'Você só pode alterar sua própria senha.': ['You can only change your own password.', 'Solo puede cambiar su propia contraseña.'],
  'Senha atual': ['Current password', 'Contraseña actual'],
  'Nova senha': ['New password', 'Nueva contraseña'],
  'Salvar nova senha': ['Save new password', 'Guardar nueva contraseña'],
  'Senha atual incorreta.': ['Current password is incorrect.', 'La contraseña actual es incorrecta.'],
  'Senha alterada': ['Password changed', 'Contraseña cambiada'],
  'Sua nova senha já está disponível nos tablets sincronizados.': ['Your new password is available on synced tablets.', 'Su nueva contraseña está disponible en las tabletas sincronizadas.'],
  'Sua nova senha foi salva neste tablet. A sincronização está pendente.': ['Your new password was saved on this tablet. Sync is pending.', 'Su nueva contraseña se guardó en esta tableta. La sincronización está pendiente.'],
  'A senha semanal do admin é gerenciada pelo painel online.': ['The weekly admin password is managed in the online panel.', 'La contraseña semanal del admin se administra en el panel en línea.'],
  'Ingredientes / descrição': ['Ingredients / description', 'Ingredientes / descripción'],
  'Ingredientes do produto': ['Product ingredients', 'Ingredientes del producto'],
  'Já existe uma impressão em andamento.': ['A print job is already in progress.', 'Ya hay una impresión en curso.'],
  'A impressão não respondeu. Confira a impressora antes de tentar novamente pelo histórico.': ['Printing did not respond. Check the printer before retrying from history.', 'La impresión no respondió. Revise la impresora antes de reintentar desde el historial.'],
  'Impressão enviada': ['Print job sent', 'Impresión enviada'],
  'Pedido salvo': ['Order saved', 'Pedido guardado'],
  'Pedido salvo. Você pode reimprimir pelo histórico.': ['Order saved. You can reprint it from history.', 'Pedido guardado. Puede reimprimirlo desde el historial.'],
});

Object.assign(translations, {
  'Grupo': ['Group', 'Grupo'], 'Subgrupos': ['Subgroups', 'Subgrupos'],
  'Grupo do produto': ['Product group', 'Grupo del producto'],
  'Subgrupo do produto': ['Product subgroup', 'Subgrupo del producto'],
  'Subgrupo (opcional)': ['Subgroup (optional)', 'Subgrupo (opcional)'],
  'Ex.: especiais': ['E.g.: specials', 'Ej.: especiales'],
  'Organize os produtos em grupos e subgrupos.': ['Organize products into groups and subgroups.', 'Organice los productos en grupos y subgrupos.'],
  'Promocionais': ['Promotional', 'Promocionales'], 'Regulares': ['Regular', 'Regulares'], 'Especiais': ['Specials', 'Especiales'],
  'Prévia da comanda': ['Order preview', 'Vista previa de la comanda'],
  'Fechar prévia': ['Close preview', 'Cerrar vista previa'],
  'Reduzir zoom': ['Zoom out', 'Reducir zoom'],
  'Ampliar zoom': ['Zoom in', 'Ampliar zoom'],
  'Imprimir comanda': ['Print order', 'Imprimir comanda'],
  'Abrindo impressão…': ['Opening print dialog…', 'Abriendo impresión…'],
  'Salvando e abrindo prévia…': ['Saving and opening preview…', 'Guardando y abriendo vista previa…'],
  'Salvar e conferir impressão': ['Save and preview print', 'Guardar y revisar impresión'],
});

Object.assign(translations, {
  'Conecte o aparelho à mesma rede da impressora. Informe o IP e a porta, salve e use Testar impressora.': ['Connect the device to the same network as the printer. Enter its IP and port, save and use Test printer.', 'Conecte el dispositivo a la misma red que la impresora. Introduzca su IP y puerto, guarde y use Probar impresora.'],
  'Informe um endereço IP válido para a impressora.': ['Enter a valid printer IP address.', 'Introduzca una dirección IP válida para la impresora.'],
  'Informe uma porta de rede entre 1 e 65535.': ['Enter a network port between 1 and 65535.', 'Introduzca un puerto de red entre 1 y 65535.'],
  'A impressão pela rede exige o aplicativo atualizado instalado no aparelho.': ['Network printing requires the updated app installed on the device.', 'La impresión por red requiere la aplicación actualizada instalada en el dispositivo.'],
  'Não foi possível conectar à impressora. Confira o IP, a porta e a conexão com a rede local.': ['Could not connect to the printer. Check the IP, port and local network connection.', 'No se pudo conectar a la impresora. Revise la IP, el puerto y la conexión a la red local.'],
  'Não foi possível confirmar o envio. Confira a impressora antes de reimprimir pelo histórico.': ['Could not confirm sending. Check the printer before reprinting from history.', 'No se pudo confirmar el envío. Revise la impresora antes de reimprimir desde el historial.'],
  'Comanda enviada à impressora pela rede. Confira a saída do papel.': ['Order sent to the printer over the network. Check the paper output.', 'Comanda enviada a la impresora por la red. Compruebe la salida del papel.'],
  'Teste enviado à impressora pela rede. Confira a saída do papel.': ['Test sent to the printer over the network. Check the paper output.', 'Prueba enviada a la impresora por la red. Compruebe la salida del papel.'],
  'Enviando impressão…': ['Sending print job…', 'Enviando impresión…'],
});

Object.assign(translations, {
  'Encomendas': ['Scheduled orders', 'Pedidos programados'],
  'Módulos da empresa': ['Company modules', 'Módulos de la empresa'],
  'A habilitação de módulos é gerenciada no portal da empresa e atualizada pela sincronização.': ['Modules are enabled in the company portal and updated through sync.', 'Los módulos se habilitan en el portal de la empresa y se actualizan mediante sincronización.'],
  'Habilitado': ['Enabled', 'Habilitado'], 'Desabilitado': ['Disabled', 'Deshabilitado'],
  'Caixa': ['Cash register', 'Caja'],
  'Retiradas e entregas agendadas': ['Scheduled pickup and delivery', 'Recogidas y entregas programadas'],
  'Abertura, recebimentos e fechamento': ['Opening, payments and closing', 'Apertura, cobros y cierre'],
  'Módulo não habilitado para esta empresa.': ['Module not enabled for this company.', 'Módulo no habilitado para esta empresa.'],
  'Agende retiradas e entregas sem alterar as comandas do dia.': ['Schedule pickup and delivery alongside daily kitchen orders.', 'Programe recogidas y entregas junto con las comandas del día.'],
  'Fechar cadastro': ['Close form', 'Cerrar formulario'],
  'Nova encomenda': ['New scheduled order', 'Nuevo pedido programado'],
  'Contato': ['Contact', 'Contacto'],
  'Data (AAAA-MM-DD)': ['Date (YYYY-MM-DD)', 'Fecha (AAAA-MM-DD)'],
  'Hora local (HH:MM)': ['Local time (HH:MM)', 'Hora local (HH:MM)'],
  'Retirada': ['Pickup', 'Recogida'], 'Entrega': ['Delivery', 'Entrega'],
  'Endereço de entrega': ['Delivery address', 'Dirección de entrega'],
  'Salvar encomenda': ['Save scheduled order', 'Guardar pedido programado'],
  'Informe cliente, contato, itens e endereço para entrega.': ['Enter customer, contact, items and a delivery address.', 'Indique cliente, contacto, artículos y dirección de entrega.'],
  'Informe a data em AAAA-MM-DD e a hora em HH:MM.': ['Enter the date as YYYY-MM-DD and the time as HH:MM.', 'Introduzca la fecha en AAAA-MM-DD y la hora en HH:MM.'],
  'Escolha uma data e hora futuras válidas.': ['Choose a valid future date and time.', 'Elija una fecha y hora futuras válidas.'],
  'Agendada': ['Scheduled', 'Programado'], 'Em preparo': ['Preparing', 'En preparación'],
  'Pronta': ['Ready', 'Listo'], 'Concluída': ['Completed', 'Completado'], 'Cancelada': ['Cancelled', 'Cancelado'],
  'Alterar status': ['Change status', 'Cambiar estado'], 'Confirmar': ['Confirm', 'Confirmar'],
  'Nenhuma encomenda cadastrada.': ['No scheduled orders yet.', 'No hay pedidos programados.'],
  'Encomenda não encontrada.': ['Scheduled order not found.', 'Pedido programado no encontrado.'],
  'Aguarde a operação em andamento.': ['Wait for the current operation.', 'Espere a que termine la operación actual.'],
  'Itens': ['Items', 'Artículos'], 'Buscar produto': ['Search products', 'Buscar productos'],
  'Aumentar quantidade': ['Increase quantity', 'Aumentar cantidad'], 'Diminuir quantidade': ['Decrease quantity', 'Reducir cantidad'],
  'Preço unitário (USD)': ['Unit price (USD)', 'Precio unitario (USD)'],
  'Preço do produto (USD)': ['Product price (USD)', 'Precio del producto (USD)'],
  'Nos módulos, use as observações para informar sabores e adicionais. O preço unitário é o valor final do item.': ['Use notes for flavors and extras. The unit price is the final item price.', 'Use las observaciones para sabores y extras. El precio unitario es el precio final del artículo.'],
  'Limite de itens atingido.': ['Item limit reached.', 'Se alcanzó el límite de artículos.'],
  'Caixa em USD: dinheiro, cartão e Zelle. Cada tablet tem sua própria abertura e fechamento.': ['Register in USD: cash, card and Zelle. Each tablet has its own opening and closing.', 'Caja en USD: efectivo, tarjeta y Zelle. Cada tableta tiene su propia apertura y cierre.'],
  'Movimentações do caixa exigem conexão. As comandas e encomendas continuam disponíveis sem depender do caixa.': ['Register transactions require a connection. Kitchen and scheduled orders work independently of the register.', 'Los movimientos de caja requieren conexión. Las comandas y los pedidos programados funcionan de forma independiente de la caja.'],
  'Atualizar caixa': ['Refresh register', 'Actualizar caja'],
  'Há uma operação sem confirmação. Consulte seu resultado antes de movimentar o caixa novamente.': ['An operation is awaiting confirmation. Check its result before another register transaction.', 'Una operación está pendiente de confirmación. Consulte su resultado antes de otro movimiento de caja.'],
  'Consultar operação pendente': ['Check pending operation', 'Consultar operación pendiente'],
  'Consulte a operação pendente antes de iniciar outra movimentação.': ['Check the pending operation before starting another transaction.', 'Consulte la operación pendiente antes de iniciar otro movimiento.'],
  'Recebimento registrado': ['Payment recorded', 'Cobro registrado'],
  'Troco': ['Change', 'Cambio'],
  'Imprimir recibo não fiscal': ['Print non-fiscal receipt', 'Imprimir recibo no fiscal'],
  'Abertura de caixa': ['Register opening', 'Apertura de caja'],
  'Dinheiro inicial (USD)': ['Opening cash (USD)', 'Efectivo inicial (USD)'],
  'Abrir caixa': ['Open register', 'Abrir caja'], 'Caixa aberto': ['Register open', 'Caja abierta'],
  'Saldo esperado em dinheiro': ['Expected cash balance', 'Saldo esperado en efectivo'],
  'Dinheiro': ['Cash', 'Efectivo'], 'Cartão': ['Card', 'Tarjeta'], 'Zelle': ['Zelle', 'Zelle'],
  'Registrar recebimento': ['Record payment', 'Registrar cobro'],
  'Cliente (opcional)': ['Customer (optional)', 'Cliente (opcional)'], 'Total': ['Total', 'Total'],
  'Recebido em dinheiro (USD)': ['Cash received (USD)', 'Efectivo recibido (USD)'],
  'Confirme o pagamento no terminal do cartão ou no Zelle antes de registrar. Este aplicativo registra o recebimento.': ['Confirm payment on the card terminal or Zelle before recording it. This app records the payment.', 'Confirme el pago en el terminal de tarjeta o Zelle antes de registrarlo. Esta aplicación registra el cobro.'],
  'Entradas e saídas': ['Cash in and out', 'Entradas y salidas'],
  'Valor (USD)': ['Amount (USD)', 'Importe (USD)'], 'Motivo': ['Reason', 'Motivo'],
  'Entrada de dinheiro': ['Cash in', 'Entrada de efectivo'], 'Saída de dinheiro': ['Cash out', 'Salida de efectivo'],
  'Fechamento de caixa': ['Register closing', 'Cierre de caja'],
  'Dinheiro contado (USD)': ['Counted cash (USD)', 'Efectivo contado (USD)'],
  'Fechar caixa': ['Close register', 'Cerrar caja'], 'Fechamentos recentes': ['Recent closings', 'Cierres recientes'],
  'Esperado': ['Expected', 'Esperado'], 'Contado': ['Counted', 'Contado'], 'Diferença': ['Difference', 'Diferencia'],
  'Movimentações recentes': ['Recent transactions', 'Movimientos recientes'], 'Recebimento': ['Payment', 'Cobro'],
  'Abra o caixa antes de registrar movimentações.': ['Open the register before recording transactions.', 'Abra la caja antes de registrar movimientos.'],
  'Este tablet já tem um caixa aberto.': ['This tablet already has an open register.', 'Esta tableta ya tiene una caja abierta.'],
  'O saldo em dinheiro é insuficiente para esta saída.': ['Insufficient cash balance for this withdrawal.', 'Saldo en efectivo insuficiente para esta salida.'],
  'O valor recebido é menor que o total.': ['The received amount is less than the total.', 'El importe recibido es menor que el total.'],
  'A operação já foi registrada com outros dados.': ['This operation was already recorded with different data.', 'Esta operación ya se registró con otros datos.'],
  'Este pedido já foi recebido no caixa.': ['Payment for this order has already been recorded.', 'El cobro de este pedido ya se registró.'],
  'Sincronize o pedido antes de receber no caixa.': ['Sync the order before recording its payment.', 'Sincronice el pedido antes de registrar su cobro.'],
  'Confira os valores e os itens da operação.': ['Check the amounts and items in this transaction.', 'Revise los importes y artículos de esta operación.'],
  'Conecte à internet e entre na nuvem para movimentar o caixa.': ['Connect to the internet and sign in to the cloud to use the register.', 'Conéctese a internet e inicie sesión en la nube para usar la caja.'],
  'Informe um valor em dólares com até duas casas decimais.': ['Enter a dollar amount with up to two decimal places.', 'Introduzca un importe en dólares con hasta dos decimales.'],
  'Valor acima do limite permitido.': ['Amount exceeds the allowed limit.', 'El importe supera el límite permitido.'],
  'Confira os preços e as quantidades dos itens.': ['Check item prices and quantities.', 'Revise los precios y las cantidades.'],
  'O total deve ser maior que zero e estar dentro do limite permitido.': ['The total must be greater than zero and within the allowed limit.', 'El total debe ser mayor que cero y estar dentro del límite permitido.'],
  'Recibo não fiscal': ['Non-fiscal receipt', 'Recibo no fiscal'],
  'RECIBO NÃO FISCAL': ['NON-FISCAL RECEIPT', 'RECIBO NO FISCAL'],
  'Pagamento': ['Payment', 'Pago'], 'Recebido': ['Received', 'Recibido'],
  'Recibo enviado à impressora pela rede. Confira a saída do papel.': ['Receipt sent to the network printer. Check the paper output.', 'Recibo enviado a la impresora por la red. Compruebe la salida del papel.'],
});

Object.assign(translations, {
  'Relatórios do Caixa': ['Register reports', 'Informes de caja'],
  'A tela mostra os primeiros 100 registros. O CSV inclui todos os detalhes do período.': ['The screen shows the first 100 records. The CSV includes all period details.', 'La pantalla muestra los primeros 100 registros. El CSV incluye todos los detalles del período.'],
  'Desconto': ['Discount', 'Descuento'], 'Descontos': ['Discounts', 'Descuentos'],
  'Desconto autorizado': ['Authorized discount', 'Descuento autorizado'],
  'Percentual (%)': ['Percentage (%)', 'Porcentaje (%)'], 'Motivo do desconto': ['Discount reason', 'Motivo del descuento'],
  'Cancelar venda': ['Void sale', 'Cancelar venta'], 'Estornar venda': ['Refund sale', 'Reembolsar venta'],
  'Confirme a devolução em dinheiro, cartão ou Zelle antes de registrar. O aplicativo registra a devolução integral.': ['Confirm the cash, card or Zelle return before recording it. The app records a full return.', 'Confirme la devolución en efectivo, tarjeta o Zelle antes de registrarla. La aplicación registra la devolución íntegra.'],
  'Motivo obrigatório': ['Required reason', 'Motivo obligatorio'],
  'Confirmar devolução integral': ['Confirm full return', 'Confirmar devolución íntegra'],
  'Venda cancelada': ['Sale voided', 'Venta cancelada'], 'Venda estornada': ['Sale refunded', 'Venta reembolsada'],
  'Cancelamento': ['Void', 'Cancelación'], 'Estorno': ['Refund', 'Reembolso'],
  'VENDA CANCELADA': ['SALE VOIDED', 'VENTA CANCELADA'], 'ESTORNO INTEGRAL': ['FULL REFUND', 'REEMBOLSO ÍNTEGRO'],
  'Devolvido': ['Returned', 'Devuelto'], 'Subtotal': ['Subtotal', 'Subtotal'],
  'Somente gerentes e administradores podem autorizar esta operação.': ['Only managers and administrators can authorize this operation.', 'Solo los gerentes y administradores pueden autorizar esta operación.'],
  'Somente gerentes e administradores podem consultar relatórios.': ['Only managers and administrators can view reports.', 'Solo los gerentes y administradores pueden consultar informes.'],
  'Somente gerentes e administradores podem alterar preços no cardápio.': ['Only managers and administrators can change menu prices.', 'Solo los gerentes y administradores pueden cambiar los precios del menú.'],
  'O preço ou produto mudou. Atualize os itens ou peça autorização de um gerente.': ['The price or product changed. Refresh the items or ask a manager to authorize it.', 'El precio o producto cambió. Actualice los artículos o solicite la autorización de un gerente.'],
  'Preços e descontos são autorizados por gerentes ou administradores.': ['Prices and discounts are authorized by managers or administrators.', 'Los precios y descuentos son autorizados por gerentes o administradores.'],
  'Preço ajustado por': ['Price adjusted by', 'Precio ajustado por'],
  'O desconto deve ser menor que o subtotal.': ['The discount must be less than the subtotal.', 'El descuento debe ser menor que el subtotal.'],
  'A taxa mudou. Atualize o caixa e confira o total antes de receber.': ['The tax rate changed. Refresh the register and check the total before accepting payment.', 'La tasa cambió. Actualice la caja y revise el total antes de cobrar.'],
  'Esta venda já foi cancelada ou estornada.': ['This sale was already voided or refunded.', 'Esta venta ya fue cancelada o reembolsada.'],
  'Venda não encontrada nesta empresa.': ['Sale not found in this company.', 'Venta no encontrada en esta empresa.'],
  'Para cancelar, use o caixa original aberto. Após o fechamento, registre um estorno.': ['Void the sale in its original open register. After closing, record a refund.', 'Cancele la venta en su caja original abierta. Después del cierre, registre un reembolso.'],
  'Relatório da empresa com todos os tablets. As datas seguem o fuso horário deste aparelho.': ['Company report across all tablets. Dates use this device’s time zone.', 'Informe de la empresa con todas las tabletas. Las fechas usan la zona horaria de este dispositivo.'],
  'Data inicial (AAAA-MM-DD)': ['Start date (YYYY-MM-DD)', 'Fecha inicial (AAAA-MM-DD)'],
  'Data final (AAAA-MM-DD)': ['End date (YYYY-MM-DD)', 'Fecha final (AAAA-MM-DD)'],
  'Informe um período válido em AAAA-MM-DD.': ['Enter a valid period as YYYY-MM-DD.', 'Introduzca un período válido en AAAA-MM-DD.'],
  'Escolha um período de até 366 dias.': ['Choose a period of up to 366 days.', 'Elija un período de hasta 366 días.'],
  'O período contém muitos registros. Selecione um intervalo menor.': ['The period contains too many records. Choose a shorter range.', 'El período contiene demasiados registros. Elija un intervalo menor.'],
  'Conecte à internet para consultar o relatório.': ['Connect to the internet to view the report.', 'Conéctese a internet para consultar el informe.'],
  'Entre na nuvem para consultar o relatório.': ['Sign in to the cloud to view the report.', 'Inicie sesión en la nube para consultar el informe.'],
  'Carregando…': ['Loading…', 'Cargando…'], 'Consultar relatório': ['View report', 'Consultar informe'],
  'Exportar CSV': ['Export CSV', 'Exportar CSV'], 'Resumo do período': ['Period summary', 'Resumen del período'],
  'Vendas brutas': ['Gross sales', 'Ventas brutas'], 'Imposto recebido': ['Tax collected', 'Impuesto cobrado'],
  'Cancelamentos e estornos': ['Voids and refunds', 'Cancelaciones y reembolsos'],
  'Imposto devolvido': ['Tax returned', 'Impuesto devuelto'],
  'Vendas líquidas sem imposto': ['Net sales excluding tax', 'Ventas netas sin impuesto'],
  'Imposto líquido': ['Net tax', 'Impuesto neto'],
  'Recebimentos líquidos com imposto': ['Net receipts including tax', 'Cobros netos con impuesto'],
  'Por forma de pagamento': ['By payment method', 'Por forma de pago'], 'Por dia': ['By day', 'Por día'],
  'Por produto': ['By product', 'Por producto'], 'Vendas': ['Sales', 'Ventas'],
  'Quantidade vendida': ['Quantity sold', 'Cantidad vendida'], 'Quantidade devolvida': ['Quantity returned', 'Cantidad devuelta'],
  'Fechamentos e diferenças': ['Closings and differences', 'Cierres y diferencias'],
  'Registro de operações': ['Operation log', 'Registro de operaciones'],
  'Nenhuma movimentação neste período.': ['No transactions in this period.', 'No hay movimientos en este período.'],
  'Compartilhamento de arquivos indisponível neste aparelho.': ['File sharing is unavailable on this device.', 'El uso compartido de archivos no está disponible en este dispositivo.'],
});

Object.assign(translations, {
  "Cadastro de Clientes": [
    "Customer directory",
    "Registro de clientes"
  ],
  "Contatos, endereços e histórico": [
    "Contacts, addresses and history",
    "Contactos, direcciones e historial"
  ],
  "Cadastre contatos e endereços. Este módulo pode ser usado sozinho.": [
    "Save contacts and addresses. This module can be used on its own.",
    "Registre contactos y direcciones. Este módulo puede usarse por separado."
  ],
  "Novo cliente": [
    "New customer",
    "Nuevo cliente"
  ],
  "Buscar cliente": [
    "Find customer",
    "Buscar cliente"
  ],
  "Mostrar arquivados": [
    "Show archived",
    "Mostrar archivados"
  ],
  "Ocultar arquivados": [
    "Hide archived",
    "Ocultar archivados"
  ],
  "Nome": [
    "Name",
    "Nombre"
  ],
  "Telefone": [
    "Phone",
    "Teléfono"
  ],
  "E-mail": [
    "Email",
    "Correo electrónico"
  ],
  "Endereços (um por linha)": [
    "Addresses (one per line)",
    "Direcciones (una por línea)"
  ],
  "Observações": [
    "Notes",
    "Notas"
  ],
  "Salvar cliente": [
    "Save customer",
    "Guardar cliente"
  ],
  "Arquivado": [
    "Archived",
    "Archivado"
  ],
  "Arquivar cliente": [
    "Archive customer",
    "Archivar cliente"
  ],
  "Reativar cliente": [
    "Reactivate customer",
    "Reactivar cliente"
  ],
  "Arquivar": [
    "Archive",
    "Archivar"
  ],
  "Reativar": [
    "Reactivate",
    "Reactivar"
  ],
  "Histórico do cliente": [
    "Customer history",
    "Historial del cliente"
  ],
  "Nenhum pedido vinculado a este cliente.": [
    "No orders linked to this customer.",
    "No hay pedidos vinculados a este cliente."
  ],
  "Mostrando os 100 registros mais recentes.": [
    "Showing the 100 most recent records.",
    "Se muestran los 100 registros más recientes."
  ],
  "Nenhum cliente encontrado.": [
    "No customers found.",
    "No se encontraron clientes."
  ],
  "Selecionar cliente cadastrado (opcional)": [
    "Select a saved customer (optional)",
    "Seleccionar un cliente registrado (opcional)"
  ],
  "Desvincular cliente": [
    "Unlink customer",
    "Desvincular cliente"
  ],
  "Cliente não encontrado.": [
    "Customer not found.",
    "Cliente no encontrado."
  ],
  "Informe nome e telefone ou e-mail, com até dez endereços.": [
    "Enter a name and phone or email, with up to ten addresses.",
    "Indique nombre y teléfono o correo, con hasta diez direcciones."
  ],
  "Conecte à internet para consultar o histórico completo. As encomendas salvas neste tablet aparecem abaixo.": [
    "Connect to view the full history. Scheduled orders saved on this tablet appear below.",
    "Conéctese para consultar el historial completo. Los pedidos programados guardados en esta tablet aparecen abajo."
  ],
  "Taxa de entrega (USD)": [
    "Delivery fee (USD)",
    "Cargo de entrega (USD)"
  ],
  "Taxa de entrega": [
    "Delivery fee",
    "Cargo de entrega"
  ],
  "Responsável pela entrega": [
    "Delivery driver",
    "Responsable de la entrega"
  ],
  "Aguardando entrega": [
    "Waiting for delivery",
    "Esperando entrega"
  ],
  "Saiu para entrega": [
    "Out for delivery",
    "En reparto"
  ],
  "Entregue": [
    "Delivered",
    "Entregado"
  ],
  "Salvar entrega": [
    "Save delivery",
    "Guardar entrega"
  ],
  "Informe o responsável pela entrega.": [
    "Enter the delivery driver.",
    "Indique el responsable de la entrega."
  ],
  "Entrega já concluída.": [
    "Delivery already completed.",
    "La entrega ya está completada."
  ],
  "Encomenda indisponível para alterar entrega.": [
    "Delivery cannot be changed for this scheduled order.",
    "No se puede modificar la entrega de este pedido programado."
  ],
  "Marque a entrega como entregue antes de concluir a encomenda.": [
    "Mark the delivery as delivered before completing the scheduled order.",
    "Marque la entrega como entregada antes de completar el pedido programado."
  ],
  "Gorjeta voluntária (USD)": [
    "Voluntary tip (USD)",
    "Propina voluntaria (USD)"
  ],
  "Gorjeta": [
    "Tip",
    "Propina"
  ],
  "Gorjeta não entra no sales tax. A taxa de entrega usa a taxa configurada da empresa.": [
    "Tips are excluded from sales tax. Delivery fees use the company tax rate.",
    "Las propinas no están sujetas al impuesto sobre ventas. La tarifa de entrega utiliza la tasa configurada de la empresa."
  ],
  "Dividir pagamento": [
    "Split payment",
    "Dividir pago"
  ],
  "Usar uma forma de pagamento": [
    "Use one payment method",
    "Usar una forma de pago"
  ],
  "Valor acima do total": [
    "Amount over total",
    "Importe superior al total"
  ],
  "Falta receber": [
    "Remaining to collect",
    "Falta cobrar"
  ],
  "Pagamento dividido": [
    "Split payment",
    "Pago dividido"
  ],
  "Estorno parcial": [
    "Partial refund",
    "Reembolso parcial"
  ],
  "ESTORNO PARCIAL": [
    "PARTIAL REFUND",
    "REEMBOLSO PARCIAL"
  ],
  "Saldo restante": [
    "Remaining balance",
    "Saldo restante"
  ],
  "Saldo disponível": [
    "Available balance",
    "Saldo disponible"
  ],
  "Saldo integral": [
    "Full remaining balance",
    "Saldo restante completo"
  ],
  "Parte do valor": [
    "Partial amount",
    "Parte del importe"
  ],
  "Selecionar itens": [
    "Select items",
    "Seleccionar artículos"
  ],
  "Valor a devolver (USD)": [
    "Refund amount (USD)",
    "Importe a reembolsar (USD)"
  ],
  "Quantidade disponível": [
    "Available quantity",
    "Cantidad disponible"
  ],
  "Quantidade a devolver": [
    "Quantity to return",
    "Cantidad a devolver"
  ],
  "Devolver gorjeta": [
    "Refund tip",
    "Reembolsar propina"
  ],
  "Devolver taxa de entrega e seu imposto": [
    "Refund delivery fee and its tax",
    "Reembolsar entrega y su impuesto"
  ],
  "Devolução": [
    "Refund",
    "Reembolso"
  ],
  "Confirmar devolução": [
    "Confirm refund",
    "Confirmar reembolso"
  ],
  "Confira as quantidades a devolver.": [
    "Check the quantities to return.",
    "Revise las cantidades a devolver."
  ],
  "Confirme a devolução no dinheiro, cartão ou Zelle antes de registrar. As formas de pagamento seguem proporcionalmente o saldo da venda.": [
    "Confirm the cash, card or Zelle refund before recording it. Refund methods are proportional to the remaining sale balance.",
    "Confirme el reembolso en efectivo, tarjeta o Zelle antes de registrarlo. Se distribuye proporcionalmente al saldo de la venta."
  ],
  "Estorno por valor distribui a devolução entre produtos, imposto, gorjeta e entrega, sem registrar quantidade devolvida.": [
    "An amount refund is allocated across products, tax, tip and delivery, without recording returned quantities.",
    "El reembolso por importe se distribuye entre productos, impuesto, propina y entrega, sin registrar cantidades devueltas."
  ],
  "Gorjetas recebidas": [
    "Tips received",
    "Propinas recibidas"
  ],
  "Gorjetas devolvidas": [
    "Tips refunded",
    "Propinas reembolsadas"
  ],
  "Gorjetas líquidas": [
    "Net tips",
    "Propinas netas"
  ],
  "Taxas de entrega recebidas": [
    "Delivery fees received",
    "Cargos de entrega recibidos"
  ],
  "Taxas de entrega devolvidas": [
    "Delivery fees refunded",
    "Cargos de entrega reembolsados"
  ],
  "Taxas de entrega líquidas": [
    "Net delivery fees",
    "Cargos de entrega netos"
  ],
  "Recebimentos líquidos com imposto, gorjeta e entrega": [
    "Net receipts including tax, tips and delivery",
    "Cobros netos con impuesto, propina y entrega"
  ],
  "Confira as formas e valores de pagamento.": [
    "Check the payment methods and amounts.",
    "Revise las formas y los importes de pago."
  ],
  "A soma dos pagamentos deve ser igual ao total.": [
    "Payments must add up to the total.",
    "La suma de los pagos debe ser igual al total."
  ],
  "Selecione um cliente ativo desta empresa.": [
    "Select an active customer from this company.",
    "Seleccione un cliente activo de esta empresa."
  ],
  "Confira os itens ou o valor a devolver.": [
    "Check the items or refund amount.",
    "Revise los artículos o el importe a devolver."
  ],
  "Outra devolução foi registrada. Atualize o caixa e confira o saldo restante.": [
    "Another refund was recorded. Refresh the register and check the remaining balance.",
    "Se registró otro reembolso. Actualice la caja y revise el saldo restante."
  ],
  "Esta venda tem estorno parcial. Devolva o saldo restante pelo estorno.": [
    "This sale has a partial refund. Refund the remaining balance.",
    "Esta venta tiene un reembolso parcial. Reembolse el saldo restante."
  ]
});

Object.assign(translations, {
  "Usuário sem permissão para esta ação.": [
    "User is not authorized for this action.",
    "Usuario sin permiso para esta acción."
  ],
  "Acesso restrito": [
    "Restricted access",
    "Acceso restringido"
  ],
  "Recuperação de dados": [
    "Data recovery",
    "Recuperación de datos"
  ],
  "1. Tablet substituto ou dados da nuvem": [
    "1. Replacement tablet or cloud data",
    "1. Tablet de reemplazo o datos de la nube"
  ],
  "Vincule o novo tablet à mesma empresa e entre na nuvem. Recupere os registros sincronizados mantendo a identidade e as preferências deste aparelho.": [
    "Link the new tablet to the same company and sign in to the cloud. Recover synced records while keeping this device’s identity and preferences.",
    "Vincule la nueva tablet a la misma empresa e inicie sesión en la nube. Recupere los registros sincronizados conservando la identidad y preferencias de este dispositivo."
  ],
  "Recuperar da nuvem": [
    "Recover from cloud",
    "Recuperar de la nube"
  ],
  "A recuperação mantém dados atuais e operações pendentes.": [
    "Recovery keeps current data and pending operations.",
    "La recuperación conserva los datos actuales y las operaciones pendientes."
  ],
  "Dados da nuvem consultados. Confira o histórico e as pendências.": [
    "Cloud data retrieved. Check history and pending operations.",
    "Datos de la nube consultados. Revise el historial y las operaciones pendientes."
  ],
  "2. Verificar cópias locais": [
    "2. Verify local backups",
    "2. Verificar copias locales"
  ],
  "As cópias locais são criptografadas e pertencem a este tablet. A verificação testa leitura, integridade e fila. No tablet substituto, use os dados da nuvem; cópias locais não sincronizadas continuam no aparelho original.": [
    "Local backups are encrypted and belong to this tablet. Verification checks readability, integrity and the pending queue. Use cloud data on a replacement tablet; unsynced local backups remain on the original device.",
    "Las copias locales están cifradas y pertenecen a esta tablet. La verificación comprueba lectura, integridad y cola pendiente. Use los datos de la nube en una tablet de reemplazo; las copias locales sin sincronizar permanecen en el dispositivo original."
  ],
  "Verificar backups": [
    "Verify backups",
    "Verificar copias"
  ],
  "Backup verificado": [
    "Backup verified",
    "Copia verificada"
  ],
  "Backup indisponível": [
    "Backup unavailable",
    "Copia no disponible"
  ],
  "Operação de caixa pendente": [
    "Pending register operation",
    "Operación de caja pendiente"
  ],
  "Recuperar registros ausentes": [
    "Recover missing records",
    "Recuperar registros faltantes"
  ],
  "Os registros atuais prevalecem. Operações financeiras pendentes recuperadas exigem consulta do resultado no Caixa.": [
    "Current records take precedence. Check the result of recovered pending financial operations in Cash.",
    "Los registros actuales prevalecen. Consulte en Caja el resultado de las operaciones financieras pendientes recuperadas."
  ],
  "Registros recuperados": [
    "Records recovered",
    "Registros recuperados"
  ],
  "Registros": [
    "Records",
    "Registros"
  ],
  "Consulte a operação pendente no Caixa antes de recuperar dados.": [
    "Check the pending Cash operation before recovering data.",
    "Consulte la operación pendiente en Caja antes de recuperar datos."
  ],
  "Entre na nuvem antes de recuperar dados.": [
    "Sign in to the cloud before recovering data.",
    "Inicie sesión en la nube antes de recuperar datos."
  ],
  "Não foi possível recuperar agora. Confira conexão e armazenamento.": [
    "Recovery is currently unavailable. Check connection and storage.",
    "No se pudo recuperar ahora. Revise la conexión y el almacenamiento."
  ],
  "Backup inválido ou de outra empresa/tablet.": [
    "Invalid backup or backup from another company/tablet.",
    "Copia inválida o de otra empresa/tablet."
  ],
  "Backup contém registros inválidos.": [
    "Backup contains invalid records.",
    "La copia contiene registros inválidos."
  ],
  "Backup contém uma fila inválida.": [
    "Backup contains an invalid pending queue.",
    "La copia contiene una cola pendiente inválida."
  ],
  "Backup contém operação de caixa inválida.": [
    "Backup contains an invalid register operation.",
    "La copia contiene una operación de caja inválida."
  ],
  "Painel de preparo": [
    "Preparation panel",
    "Panel de preparación"
  ],
  "Recebido": [
    "Received",
    "Recibido"
  ],
  "Pronto": [
    "Ready",
    "Listo"
  ],
  "Finalizado": [
    "Completed",
    "Finalizado"
  ],
  "Acompanhe o preparo das comandas sem alterar seus itens ou impressão.": [
    "Track kitchen order preparation without changing items or printing.",
    "Siga la preparación de las comandas sin cambiar sus artículos ni su impresión."
  ],
  "Dia anterior": [
    "Previous day",
    "Día anterior"
  ],
  "Próximo dia": [
    "Next day",
    "Día siguiente"
  ],
  "Ocultar finalizados": [
    "Hide completed",
    "Ocultar finalizados"
  ],
  "Mostrar finalizados": [
    "Show completed",
    "Mostrar finalizados"
  ],
  "Informe a data em AAAA-MM-DD.": [
    "Enter the date as YYYY-MM-DD.",
    "Ingrese la fecha en AAAA-MM-DD."
  ],
  "Destacar atraso após (minutos)": [
    "Highlight delays after (minutes)",
    "Destacar retrasos después de (minutos)"
  ],
  "Atualizar pedidos": [
    "Refresh orders",
    "Actualizar pedidos"
  ],
  "Atrasado": [
    "Overdue",
    "Atrasado"
  ],
  "Atrasada": [
    "Overdue",
    "Atrasada"
  ],
  "Atrasadas": [
    "Overdue",
    "Atrasadas"
  ],
  "Nenhuma comanda neste período.": [
    "No kitchen orders in this period.",
    "No hay comandas en este período."
  ],
  "Próxima hora": [
    "Next hour",
    "Próxima hora"
  ],
  "Agenda de encomendas": [
    "Preorder calendar",
    "Agenda de pedidos programados"
  ],
  "Todas": [
    "All",
    "Todas"
  ],
  "Dia": [
    "Day",
    "Día"
  ],
  "Semana": [
    "Week",
    "Semana"
  ],
  "Anterior": [
    "Previous",
    "Anterior"
  ],
  "Próximo": [
    "Next",
    "Siguiente"
  ],
  "Impressoras por destino": [
    "Printer destinations",
    "Destinos de impresión"
  ],
  "Distribua categorias entre impressoras de rede. Categorias sem destino usam a impressora principal.": [
    "Route categories to network printers. Categories without a destination use the main printer.",
    "Distribuya categorías entre impresoras de red. Las categorías sin destino usan la impresora principal."
  ],
  "Desativar destinos": [
    "Disable destinations",
    "Desactivar destinos"
  ],
  "Ativar destinos": [
    "Enable destinations",
    "Activar destinos"
  ],
  "Nome do destino": [
    "Destination name",
    "Nombre del destino"
  ],
  "Categorias deste destino": [
    "Categories for this destination",
    "Categorías de este destino"
  ],
  "✓ Recibos neste destino": [
    "✓ Receipts at this destination",
    "✓ Recibos en este destino"
  ],
  "Usar para recibos do cliente": [
    "Use for customer receipts",
    "Usar para recibos del cliente"
  ],
  "Testar destino": [
    "Test destination",
    "Probar destino"
  ],
  "Adicionar destino": [
    "Add destination",
    "Agregar destino"
  ],
  "Destino": [
    "Destination",
    "Destino"
  ],
  "Use Salvar configurações para confirmar os destinos neste tablet.": [
    "Use Save settings to confirm destinations on this tablet.",
    "Use Guardar configuración para confirmar los destinos en esta tablet."
  ],
  "Confira os destinos, categorias e endereços das impressoras.": [
    "Check printer destinations, categories and addresses.",
    "Revise los destinos, categorías y direcciones de las impresoras."
  ],
  "Impressora principal": [
    "Main printer",
    "Impresora principal"
  ],
  "Marcar disponível": [
    "Mark available",
    "Marcar disponible"
  ],
  "Marcar esgotado": [
    "Mark sold out",
    "Marcar agotado"
  ],
  "Remover favorito": [
    "Remove favorite",
    "Quitar favorito"
  ],
  "Marcar favorito": [
    "Mark favorite",
    "Marcar favorito"
  ],
  "Mostrar todos": [
    "Show all",
    "Mostrar todos"
  ],
  "Somente favoritos": [
    "Favorites only",
    "Solo favoritos"
  ],
  "Favoritos": [
    "Favorites",
    "Favoritos"
  ],
  "Esgotado": [
    "Sold out",
    "Agotado"
  ],
  "Buscar produto": [
    "Search products",
    "Buscar productos"
  ],
  "Produto esgotado": [
    "Product sold out",
    "Producto agotado"
  ],
  "Produto esgotado. Escolha outro produto.": [
    "Product sold out. Choose another product.",
    "Producto agotado. Elija otro producto."
  ],
  "PRODUCT_UNAVAILABLE": [
    "Product sold out. Refresh the menu and choose another product.",
    "Producto agotado. Actualice el menú y elija otro producto."
  ],
  "ACCESS_DENIED": [
    "User is not authorized for this action.",
    "Usuario sin permiso para esta acción."
  ]
});

Object.assign(translations, {
  'Pedidos recebidos, em preparo e prontos': ['Orders received, in preparation and ready', 'Pedidos recibidos, en preparación y listos'],
  'Backup inválido.': ['Invalid backup.', 'Copia inválida.'],
  'Backup não encontrado.': ['Backup not found.', 'Copia no encontrada.'],
});

export function translate(text: string, language: Language = 'pt'): string {
  const source = Object.hasOwn(translations, text) ? text : Object.keys(translations).find((key) => translations[key].includes(text)) || text;
  return language === 'pt' ? source : Object.hasOwn(translations, source) ? translations[source][language === 'en' ? 0 : 1] : text;
}

export function itemName(name: string, language: Language) {
  if (name.startsWith('Pizza inteira — ')) return `${translate('Pizza inteira', language)} — ${name.slice('Pizza inteira — '.length)}`;
  return name === 'Pizza de dois sabores' ? translate(name, language) : name;
}

export function translatedNote(note: string, language: Language) {
  const presets = ['Sem cebola', 'Sem pimenta', 'Bem passado', 'Pouco sal'];
  return note.split(', ').map((part) => {
    const key = presets.find((preset) => preset === part || translations[preset].includes(part));
    return key ? translate(key, language) : part;
  }).join(', ');
}

Object.assign(translations, {
  'Dados do pedido': ['Order details', 'Datos del pedido'],
  'Atendimento': ['Service', 'Servicio'],
  'Outra mesa': ['Other table', 'Otra mesa'],
  'Confirmar dados': ['Confirm details', 'Confirmar datos'],
  'Número': ['Number', 'Número'],
});

Object.assign(translations, {
  "Data da retirada/entrega": [
    "Pickup/delivery date",
    "Fecha de retiro/entrega"
  ],
  "Horário da retirada/entrega": [
    "Pickup/delivery time",
    "Hora de retiro/entrega"
  ],
  "Data da agenda": [
    "Schedule date",
    "Fecha de la agenda"
  ],
  "Formato de 24 horas, no horário deste tablet.": [
    "24-hour format, using this tablet’s local time.",
    "Formato de 24 horas, según la hora local de esta tablet."
  ],
  "Mês": [
    "Month",
    "Mes"
  ],
  "Dia": [
    "Day",
    "Día"
  ],
  "Ano": [
    "Year",
    "Año"
  ],
  "Hora": [
    "Hour",
    "Hora"
  ],
  "Minuto": [
    "Minute",
    "Minuto"
  ],
  "Campo obrigatório.": [
    "Required field.",
    "Campo obligatorio."
  ],
  "Valor inválido.": [
    "Invalid value.",
    "Valor no válido."
  ],
  "Confira a data e o horário da retirada/entrega.": [
    "Check the pickup/delivery date and time.",
    "Revisa la fecha y hora de retiro/entrega."
  ],
  "Confira a data da agenda.": [
    "Check the schedule date.",
    "Revisa la fecha de la agenda."
  ],
  "Toque no produto para escolher opções e observações.": [
    "Tap a product to choose options and add notes.",
    "Toca un producto para elegir opciones y agregar notas."
  ],
  "Observações acima do limite permitido.": [
    "Notes exceed the allowed length.",
    "Las notas superan la longitud permitida."
  ],
  "ADICIONAR À ENCOMENDA": [
    "ADD TO SCHEDULED ORDER",
    "AGREGAR AL PEDIDO PROGRAMADO"
  ],
  "Adicionar à encomenda": [
    "Add to scheduled order",
    "Agregar al pedido programado"
  ],
  "Adicionar item": [
    "Add item",
    "Agregar artículo"
  ],
  "Adicione ao menos um produto.": [
    "Add at least one product.",
    "Agrega al menos un producto."
  ],
  "Cancelar encomendas": [
    "Cancel scheduled orders",
    "Cancelar pedidos programados"
  ],
  "Cancelar encomenda": [
    "Cancel scheduled order",
    "Cancelar pedido programado"
  ],
  "Admin e Gerente sempre podem autorizar cancelamentos de encomendas.": [
    "Admins and managers can always authorize scheduled order cancellations.",
    "Los administradores y gerentes siempre pueden autorizar cancelaciones de pedidos programados."
  ],
  "O cancelamento exige usuário e senha.": [
    "Cancellation requires a username and password.",
    "La cancelación requiere usuario y contraseña."
  ],
  "Usuário sem permissão para cancelar encomendas.": [
    "This user cannot cancel scheduled orders.",
    "Este usuario no tiene permiso para cancelar pedidos programados."
  ],
  "Atualize a lista antes de cancelar outra encomenda.": [
    "Refresh the list before cancelling another scheduled order.",
    "Actualiza la lista antes de cancelar otro pedido programado."
  ],
  "Sincronize a encomenda antes de cancelar.": [
    "Sync the scheduled order before cancelling.",
    "Sincroniza el pedido programado antes de cancelarlo."
  ],
  "Encomenda alterada. Atualize a lista e tente novamente.": [
    "The scheduled order changed. Refresh the list and try again.",
    "El pedido programado cambió. Actualiza la lista e inténtalo de nuevo."
  ],
  "Esta encomenda já foi concluída ou cancelada.": [
    "This scheduled order is already completed or cancelled.",
    "Este pedido programado ya se completó o canceló."
  ],
  "Entre novamente na nuvem.": [
    "Sign in to the cloud again.",
    "Inicia sesión en la nube de nuevo."
  ],
  "Conecte à internet para autorizar o cancelamento.": [
    "Connect to the internet to authorize cancellation.",
    "Conéctate a internet para autorizar la cancelación."
  ],
  "Selecione quem autoriza e informe a senha desse usuário.": [
    "Select the authorizing user and enter their password.",
    "Selecciona quién autoriza e ingresa su contraseña."
  ],
  "Confirmar cancelamento": [
    "Confirm cancellation",
    "Confirmar cancelación"
  ],
  "Cancelamento autorizado por": [
    "Cancellation authorized by",
    "Cancelación autorizada por"
  ],
  "Solicitado por": [
    "Requested by",
    "Solicitado por"
  ],
  "Carregando…": [
    "Loading…",
    "Cargando…"
  ]
});

Object.assign(translations, { 'Avançar': ['Continue', 'Continuar'] });

Object.assign(translations, { 'Do caixa à cozinha.': ['From register to kitchen.', 'De la caja a la cocina.'] });

Object.assign(translations, {
  "Corrigir etapa do preparo": [
    "Correct kitchen stage",
    "Corregir etapa de cocina"
  ],
  "Admin e Gerente sempre podem autorizar correções do preparo.": [
    "Admin and Manager can always authorize kitchen corrections.",
    "Admin y Gerente siempre pueden autorizar correcciones de cocina."
  ],
  "O prazo de um minuto terminou ou esta alteração exige autorização.": [
    "The one-minute window has ended or this change requires authorization.",
    "El plazo de un minuto terminó o este cambio requiere autorización."
  ],
  "Usuário sem permissão para corrigir o preparo.": [
    "User is not allowed to correct kitchen stages.",
    "El usuario no tiene permiso para corregir etapas de cocina."
  ],
  "A etapa mudou em outro tablet. Atualize os pedidos e tente novamente.": [
    "The stage changed on another tablet. Refresh the orders and try again.",
    "La etapa cambió en otra tablet. Actualice los pedidos e inténtelo de nuevo."
  ],
  "Sincronize o pedido antes de corrigir o preparo.": [
    "Sync the order before correcting its kitchen stage.",
    "Sincronice el pedido antes de corregir su etapa de cocina."
  ],
  "Atualize os pedidos para conferir a correção anterior.": [
    "Refresh the orders to check the previous correction.",
    "Actualice los pedidos para comprobar la corrección anterior."
  ],
  "Escolha uma etapa anterior à atual.": [
    "Choose an earlier stage.",
    "Elija una etapa anterior a la actual."
  ],
  "Conecte à internet para corrigir a etapa do preparo.": [
    "Connect to the internet to correct the kitchen stage.",
    "Conéctese a internet para corregir la etapa de cocina."
  ],
  "Etapa alterada": [
    "Stage changed",
    "Etapa modificada"
  ],
  "Desfazer última alteração": [
    "Undo last change",
    "Deshacer último cambio"
  ],
  "Após um minuto, a correção exige usuário e senha de alguém autorizado.": [
    "After one minute, correction requires an authorized user and password.",
    "Después de un minuto, la corrección requiere un usuario autorizado y su contraseña."
  ],
  "Voltar para {stage}": [
    "Return to {stage}",
    "Volver a {stage}"
  ],
  "Última correção": [
    "Last correction",
    "Última corrección"
  ],
  "Autorizar correção do preparo": [
    "Authorize kitchen correction",
    "Autorizar corrección de cocina"
  ],
  "Usuário autorizado": [
    "Authorized user",
    "Usuario autorizado"
  ],
  "Confirmar correção": [
    "Confirm correction",
    "Confirmar corrección"
  ]
});

Object.assign(translations, { 'Desfazer': ['Undo', 'Deshacer'], 's': ['s', 's'] });

Object.assign(translations, { 'Após um minuto, quem tem permissão corrige diretamente. Os demais precisam de autorização local.': ['After one minute, users with permission can correct directly. Others need local authorization.', 'Después de un minuto, quienes tienen permiso corrigen directamente. Los demás necesitan autorización local.'], 'Não foi possível carregar os usuários deste tablet.': ['Could not load users from this tablet.', 'No se pudieron cargar los usuarios de esta tablet.'], 'Não foi possível salvar a correção do preparo neste tablet.': ['Could not save the kitchen correction on this tablet.', 'No se pudo guardar la corrección de cocina en esta tablet.'], 'Confira a etapa atual antes de refazer a correção do preparo.': ['Check the current stage before retrying the kitchen correction.', 'Revise la etapa actual antes de volver a corregir la cocina.'] });

Object.assign(translations, { 'Confira a data e a hora deste tablet.': ['Check this tablet’s date and time.', 'Revise la fecha y la hora de esta tablet.'] });
