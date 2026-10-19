import { LANGUAGE_FLAGS } from './language-flags.mjs';
export const LANGUAGES = Object.freeze({ pt: 'pt-BR', en: 'en-US', es: 'es-ES' });
export const LANGUAGE_COOKIE = '__Host-bistro_manager_language';
export const LANGUAGE_CHOICE_COOKIE = '__Host-bistro_manager_language_choice';
export const validLanguage = value => typeof value === 'string' && Object.hasOwn(LANGUAGES, value);

// English terms follow restaurant/KDS reporting (fulfillment time, prep time,
// average check). Every time metric still states its exact recorded interval.
export const TRANSLATIONS = {
  "A média considera somente os pedidos com o intervalo registrado no período selecionado.": ["The average includes only orders with the selected time interval recorded within the selected period.", "El promedio incluye solo los pedidos con el intervalo registrado dentro del período seleccionado."],
  "Ano atual": ["This year", "Año actual"],
  "Filtros do TMA": ["Average time filters", "Filtros del tiempo medio"],
  "TMA do período": ["Average time for the period", "Tiempo medio del período"],
  "Filtros": ["Filters", "Filtros"],
  "TMA por hora": ["Average fulfillment time by hour", "Tiempo medio de atención por hora"],
  "Período": ["Period", "Período"],
  "Usuários no gráfico: {shown} de {count}.": ["Users in chart: {shown} of {count}.", "Usuarios en el gráfico: {shown} de {count}."],
  "Outros": ["Other", "Otros"],
  "Personalizado": ["Custom", "Personalizado"],
  "Nenhum pedido neste período.": ["No orders in this period.", "No hay pedidos en este período."],
  "Pedidos iniciados e prontos por usuário. Detalhes incluem o tempo médio de preparo.": ["Started and ready orders by user. Details include average prep time.", "Pedidos iniciados y listos por usuario. Los detalles incluyen el tiempo promedio de preparación."],
  "Média de pedidos por hora no período selecionado.": ["Average orders per hour over the selected period.", "Promedio de pedidos por hora del período seleccionado."],
  "Pedidos por hora no dia selecionado.": ["Orders by hour on the selected day.", "Pedidos por hora del día seleccionado."],
  "Pedidos marcados prontos por usuário no período.": ["Orders marked ready by each user during the period.", "Pedidos marcados como listos por cada usuario en el período."],
  "Produtividade da cozinha por usuário": ["Kitchen productivity by user", "Productividad de cocina por usuario"],
  "Pedidos por hora": ["Orders by hour", "Pedidos por hora"],
  'Usuários App': ['App users', 'Usuarios de la app'],
  'Usuários Painel do gestor': ['Manager Dashboard users', 'Usuarios del Panel de gestión'],
  'Usuários, senhas e perfis de acesso ao aplicativo desta loja.': ['Users, passwords and app access profiles for this store.', 'Usuarios, contraseñas y perfiles de acceso a la app de esta tienda.'],
  'Gerencie os acessos por e-mail ao Painel do gestor deste cliente.': ['Manage email access to this client’s Manager Dashboard.', 'Gestione los accesos por correo electrónico al Panel de gestión de este cliente.'],
  'Voltar ao cliente': ['Back to client', 'Volver al cliente'],
  'Escolha um cliente para editar o cadastro.': ['Choose a client to edit their registration.', 'Elija un cliente para editar su registro.'],
  "Entre com seu e-mail e sua senha.": ["Sign in with your email and password.", "Ingrese con su correo electrónico y su contraseña."],
  "Confira o e-mail, o cliente e a senha (mínimo de 8 caracteres).": ["Check the email, client and password (at least 8 characters).", "Revise el correo electrónico, el cliente y la contraseña (mínimo 8 caracteres)."],
  "Este e-mail já possui acesso ao portal.": ["This email already has portal access.", "Este correo electrónico ya tiene acceso al portal."],
  "E-mail ou senha incorretos.": ["Incorrect email or password.", "Correo electrónico o contraseña incorrectos."],
  "Envio de convites indisponível. Configure o serviço de e-mail.": ["Invitation delivery is unavailable. Configure the email service.", "El envío de invitaciones no está disponible. Configure el servicio de correo electrónico."],
  "Confira o e-mail, a situação e a versão do acesso antes de enviar o convite.": ["Check the email, status and access version before sending the invitation.", "Revise el correo electrónico, el estado y la versión del acceso antes de enviar la invitación."],
  "Ative o cliente antes de enviar um convite.": ["Activate the client before sending an invitation.", "Active el cliente antes de enviar una invitación."],
  "Ative o cliente e o acesso antes de enviar um convite.": ["Activate the client and account before sending an invitation.", "Active el cliente y el acceso antes de enviar una invitación."],
  "Aguarde um minuto antes de reenviar o convite.": ["Wait one minute before resending the invitation.", "Espere un minuto antes de reenviar la invitación."],
  "Defina uma senha ou envie um convite para este acesso.": ["Set a password or send an invitation for this account.", "Defina una contraseña o envíe una invitación para este acceso."],
  "Convite para o Portal do cliente · BistroHub": ["Invitation to the Customer Portal · BistroHub", "Invitación al Portal del cliente · BistroHub"],
  "Você recebeu um convite para acessar o Portal do cliente BistroHub.": ["You have been invited to access the BistroHub Customer Portal.", "Ha recibido una invitación para acceder al Portal del cliente BistroHub."],
  "Crie sua senha pelo link abaixo:": ["Create your password using the link below:", "Cree su contraseña usando el siguiente enlace:"],
  "O convite expira em 24 horas e pode ser usado uma única vez.": ["The invitation expires in 24 hours and can be used only once.", "La invitación vence en 24 horas y solo se puede usar una vez."],
  "Se você não reconhece este convite, ignore este e-mail.": ["If you do not recognize this invitation, ignore this email.", "Si no reconoce esta invitación, ignore este correo electrónico."],
  "Convite inválido ou expirado. Peça um novo convite ao administrador.": ["Invalid or expired invitation. Ask the administrator for a new invitation.", "Invitación inválida o vencida. Solicite una nueva invitación al administrador."],
  "Use pelo menos 8 caracteres e confirme a mesma senha.": ["Use at least 8 characters and confirm the same password.", "Use al menos 8 caracteres y confirme la misma contraseña."],
  "Senha criada. Entre com seu e-mail.": ["Password created. Sign in with your email.", "Contraseña creada. Ingrese con su correo electrónico."],
  "Como liberar o acesso": ["How to grant access", "Cómo habilitar el acceso"],
  "Enviar convite por e-mail": ["Send email invitation", "Enviar invitación por correo electrónico"],
  "Definir senha": ["Set password", "Definir contraseña"],
  "Você pode definir uma senha ou convidar o cliente para criar a própria. Use pelo menos 8 caracteres.": ["You can set a password or invite the client to create their own. Use at least 8 characters.", "Puede definir una contraseña o invitar al cliente a crear la suya. Use al menos 8 caracteres."],
  "Convite enviado": ["Invitation sent", "Invitación enviada"],
  "Falha no envio do convite": ["Invitation delivery failed", "Error al enviar la invitación"],
  "Convite pendente": ["Invitation pending", "Invitación pendiente"],
  "Convite expirado": ["Invitation expired", "Invitación vencida"],
  "Senha definida": ["Password set", "Contraseña definida"],
  "Salvar e enviar convite": ["Save and send invitation", "Guardar y enviar invitación"],
  "Reenviar convite": ["Resend invitation", "Reenviar invitación"],
  "Cadastro salvo, mas o convite não foi enviado. Tente reenviar.": ["Account saved, but the invitation was not sent. Try resending it.", "Registro guardado, pero la invitación no se envió. Intente reenviarla."],
  "Crie sua senha": ["Create your password", "Cree su contraseña"],
  "Criar senha": ["Create password", "Crear contraseña"],
  "Voltar para o portal": ["Back to the portal", "Volver al portal"],
  "E-mail pendente": ["Email required", "Correo electrónico pendiente"],

  'Entre com o usuário e a senha fornecidos pela administração do BistroHub.': ['Sign in with the username and password provided by BistroHub administration.', 'Ingrese con el usuario y la contraseña proporcionados por la administración de BistroHub.'],
  "Corrigir etapa do preparo": ["Correct kitchen stage", "Corregir etapa de cocina"],
  "Admin e Gerente sempre podem autorizar correções do preparo.": ["Admin and Manager can always authorize kitchen corrections.", "Admin y Gerente siempre pueden autorizar correcciones de cocina."],

  'Do caixa à cozinha.': ['From register to kitchen.', 'De la caja a la cocina.'],
"Utilizar o botão finalizar no fluxo de preparo":["Use the Finish button in the kitchen workflow", "Utilizar el botón Finalizar en el flujo de cocina"],"Ativado: Finalizar confirma a entrega após Pronto. Desativado: Pronto finaliza o pedido automaticamente.":["Enabled: Finish confirms handoff after Ready. Disabled: Ready completes the order automatically.", "Activado: Finalizar confirma la entrega después de Listo. Desactivado: Listo finaliza el pedido automáticamente."],
  'Cancelar encomendas': ['Cancel scheduled orders', 'Cancelar pedidos programados'],
  'Aparência': ['Appearance', 'Apariencia'],
  'Claro': ['Light', 'Claro'],
  'Escuro': ['Dark', 'Oscuro'],
  'Ative o módulo de caixa para editar estas configurações.': ['Enable Cash Management to edit these settings.', 'Activa el módulo de Caja para editar esta configuración.'],
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
  ...ADMIN_TRANSLATIONS,
  'Escolha a loja abaixo para consultar a senha semanal.': ['Choose a location below to view its weekly password.', 'Elige un local a continuación para consultar su contraseña semanal.'],
  "Cadastro do cliente": ["Customer details", "Datos del cliente"],
  "Gerencie este cliente e seus usuários. Os módulos são habilitados nas configurações de cada loja.": ["Manage this customer and their users. Enable modules in each location’s settings.", "Administra este cliente y sus usuarios. Los módulos se habilitan en la configuración de cada local."],
  "Escolha um cliente para gerenciar seus usuários.": ["Choose a customer to manage their users.", "Elige un cliente para administrar sus usuarios."],
  "Um cliente de loja única pode ter apenas uma loja.": ["A single-location customer can have only one location.", "Un cliente de un solo local solo puede tener un local."],
  "Escolha loja única ou grupo de lojas.": ["Choose a single location or a group of locations.", "Elige un solo local o un grupo de locales."],
  "Escolha um cliente antes de selecionar a loja.": ["Choose a customer before selecting a location.", "Elige un cliente antes de seleccionar el local."],
  "Cadastre uma loja para este cliente.": ["Add a location for this customer.", "Registra un local para este cliente."],
  "Nenhuma loja cadastrada.": ["No locations registered.", "No hay locales registrados."],
  "Cadastro e usuários": ["Customer details and users", "Datos del cliente y usuarios"],
  "Acesse a loja deste cliente.": ["Open this customer’s location.", "Accede al local de este cliente."],
  "Selecione uma loja existente ou cadastre uma nova após salvar o cliente.": ["Select an existing location or add a new one after saving the customer.", "Selecciona un local existente o registra uno nuevo después de guardar el cliente."],
  "Lojas existentes sem vínculo": ["Existing unassigned locations", "Locales existentes sin asignar"],
  "Loja sem vínculo": ["Unassigned location", "Local sin asignar"],
  "Tipo de cliente": ["Customer type", "Tipo de cliente"],
  "Loja única": ["Single location", "Un solo local"],
  "Gerencie clientes com uma loja ou grupos com várias lojas.": ["Manage customers with one location or groups with multiple locations.", "Administra clientes con un local o grupos con varios locales."],
  'Clientes': ['Clients', 'Clientes'],
  'Cliente': ['Client', 'Cliente'],
  'Cadastrar cliente': ['Add client', 'Registrar cliente'],
  'Nome do cliente': ['Client name', 'Nombre del cliente'],
  'Salvar cliente': ['Save client', 'Guardar cliente'],
  'Abrir cliente': ['Open client', 'Abrir cliente'],
  'Nenhum cliente cadastrado.': ['No clients registered.', 'No hay clientes registrados.'],
  'Cadastre um cliente para organizar seus grupos e lojas.': ['Add a client to organize its groups and locations.', 'Registra un cliente para organizar sus grupos y locales.'],
  'Grupos sem cliente': ['Groups without a client', 'Grupos sin cliente'],
  'Grupos: {count}': ['Groups: {count}', 'Grupos: {count}'],
  'Escolha um cliente para administrar seus grupos e lojas.': ['Choose a client to manage its groups and locations.', 'Elige un cliente para gestionar sus grupos y locales.'],
  'Grupos do cliente': ['Client groups', 'Grupos del cliente'],
  'Escolha um grupo para administrar suas lojas.': ['Choose a group to manage its locations.', 'Elige un grupo para gestionar sus locales.'],
  'Cadastrar loja': ['Add location', 'Registrar local'],
  'Abrir loja': ['Open location', 'Abrir local'],
  'Escolha a loja que deseja administrar.': ['Choose the location you want to manage.', 'Elige el local que deseas administrar.'],
  'Cadastre a primeira loja neste grupo.': ['Add the first location to this group.', 'Registra el primer local de este grupo.'],
  'Todos os clientes': ['All clients', 'Todos los clientes'],
  'Voltar aos grupos': ['Back to groups', 'Volver a los grupos'],
  'Voltar às lojas': ['Back to locations', 'Volver a los locales'],
  'Minha conta': ['My account', 'Mi cuenta'],
  'Acesso à minha conta': ['My account access', 'Acceso a mi cuenta'],
  'Altere a senha da sua conta administrativa.': ['Change your administrative account password.', 'Cambia la contraseña de tu cuenta administrativa.'],
  'Administração da loja': ['Location administration', 'Administración del local'],
  'Consulte a senha semanal e a senha de Ajustes desta loja.': ['View this location’s weekly password and Settings password.', 'Consulta la contraseña semanal y la contraseña de Ajustes de este local.'],
  'Administre os módulos e as permissões desta loja.': ['Manage this location’s modules and permissions.', 'Gestiona los módulos y permisos de este local.'],
  'Cadastre a loja no grupo selecionado.': ['Add the location to the selected group.', 'Registra el local en el grupo seleccionado.'],
  'Escolha uma loja para consultar os registros.': ['Choose a location to view its records.', 'Elige un local para consultar sus registros.'],
  'Este cliente ainda não tem grupos.': ['This client has no groups yet.', 'Este cliente aún no tiene grupos.'],
  'Cadastre o primeiro grupo deste cliente.': ['Add this client’s first group.', 'Registra el primer grupo de este cliente.'],
  'Organizar grupos existentes': ['Organize existing groups', 'Organizar grupos existentes'],
  'Vincular ao cliente': ['Link to client', 'Vincular al cliente'],
  'Nenhum grupo sem cliente.': ['No groups without a client.', 'No hay grupos sin cliente.'],
  'Grupo vinculado ao cliente.': ['Group linked to client.', 'Grupo vinculado al cliente.'],
  'Vincule um grupo existente a este cliente sem alterar suas lojas ou seus usuários.': ['Link an existing group to this client without changing its locations or users.', 'Vincula un grupo existente a este cliente sin cambiar sus locales ni sus usuarios.'],
  'Grupos e lojas ainda sem cliente cadastrado.': ['Groups and locations not yet assigned to a client.', 'Grupos y locales aún sin cliente asignado.'],
  'Selecione um cliente para vincular este grupo.': ['Select a client to link this group.', 'Selecciona un cliente para vincular este grupo.'],
  'Lojas do grupo': ['Group locations', 'Locales del grupo'],
  'Voltar ao cliente': ['Back to client', 'Volver al cliente'],
  'Escolha um cliente para gerenciar grupos e usuários.': ['Choose a client to manage its groups and users.', 'Elige un cliente para gestionar sus grupos y usuarios.'],
  'Cadastre os grupos deste cliente e os usuários gestores. Os módulos são habilitados nas configurações de cada loja.': ['Add this client’s groups and manager accounts. Modules are enabled in each location’s settings.', 'Registra los grupos de este cliente y las cuentas de gestores. Los módulos se habilitan en la configuración de cada local.'],
  'Gerencie este grupo e seus usuários. Os módulos são habilitados nas configurações de cada loja.': ['Manage this group and its users. Modules are enabled in each location’s settings.', 'Gestiona este grupo y sus usuarios. Los módulos se habilitan en la configuración de cada local.'],
  'Escolha um grupo para gerenciar seus usuários.': ['Choose a group to manage its users.', 'Elige un grupo para gestionar sus usuarios.'],
  'Cada usuário consulta somente as lojas autorizadas do seu grupo.': ['Each user can view only their group’s authorized locations.', 'Cada usuario consulta solo los locales autorizados de su grupo.'],
  'Alterar lojas, desativar um acesso ou redefinir uma senha encerra as sessões anteriores.': ['Changing locations, disabling access or resetting a password ends previous sessions.', 'Cambiar los locales, desactivar un acceso o restablecer una contraseña cierra las sesiones anteriores.'],
  'Nenhuma loja cadastrada neste cliente.': ['No locations registered for this client.', 'No hay locales registrados para este cliente.'],
  'Este grupo não pertence ao cliente selecionado.': ['This group does not belong to the selected client.', 'Este grupo no pertenece al cliente seleccionado.'],
  'Escolha um grupo antes de selecionar a loja.': ['Choose a group before selecting a location.', 'Elige un grupo antes de seleccionar el local.'],
  'Escolha um cliente.': ['Choose a client.', 'Elige un cliente.'],
  'Informe um nome de cliente com até 100 caracteres.': ['Enter a client name of up to 100 characters.', 'Introduce un nombre de cliente de hasta 100 caracteres.'],
  'Não foi possível salvar o cliente.': ['Unable to save the client.', 'No se pudo guardar el cliente.'],
  'Não foi possível salvar o cliente. Confira a conexão.': ['Unable to save the client. Check your connection.', 'No se pudo guardar el cliente. Comprueba la conexión.'],
  'Painel do Gestor': ['Manager Dashboard', 'Panel de gestión'],
  'BistroHub · Painel do Gestor': ['BistroHub · Manager Dashboard', 'BistroHub · Panel de gestión'],
  'Idioma': ['Language', 'Idioma'], 'Sair': ['Sign out', 'Cerrar sesión'], 'Entrar': ['Sign in', 'Iniciar sesión'],
  'Usuário': ['Username', 'Usuario'], 'Senha': ['Password', 'Contraseña'],
  'O acesso é cadastrado pela administração do BistroHub.': ['Your access is set up by the BistroHub administration.', 'La administración de BistroHub crea tu acceso.'],
  'Atendimento e produção': ['Service and kitchen operations', 'Servicio y producción'], 'Vendas e caixa': ['Sales and cash management', 'Ventas y caja'],
  'Indicadores das lojas com o módulo de preparo habilitado.': ['Metrics for locations with the Kitchen module enabled.', 'Indicadores de los locales con el módulo de Cocina habilitado.'],
  'Indicadores das lojas com o módulo Caixa habilitado.': ['Metrics for locations with the Cash Management module enabled.', 'Indicadores de los locales con el módulo de Caja habilitado.'],
  'Loja': ['Location', 'Local'], 'Todas as lojas autorizadas': ['All authorized locations', 'Todos los locales autorizados'],
  'De': ['From', 'Desde'], 'Até': ['To', 'Hasta'], 'Fuso dos horários': ['Time zone', 'Zona horaria'],
  'Intervalo do TMA': ['Average time metric', 'Intervalo del tiempo medio'],
  'Emissão até finalização': ['Order sent to completed', 'Envío del pedido hasta finalización'],
  'Emissão até pronto': ['Order sent to ready', 'Envío del pedido hasta listo'],
  'Início do preparo até pronto': ['Prep started to ready', 'Inicio de preparación hasta listo'],
  'emissão até finalização': ['order sent to completed', 'envío del pedido hasta finalización'],
  'emissão até pronto': ['order sent to ready', 'envío del pedido hasta listo'],
  'início do preparo até pronto': ['prep started to ready', 'inicio de preparación hasta listo'],
  'Hoje': ['Today', 'Hoy'], 'Últimos 7 dias': ['Last 7 days', 'Últimos 7 días'], 'Mês atual': ['This month', 'Mes actual'], 'Mês anterior': ['Last month', 'Mes anterior'],
  'Escolher mês': ['Select month', 'Elegir mes'], 'Consultar mês': ['View month', 'Consultar mes'], 'Consultar período': ['View period', 'Consultar período'],
  'Comparar horários e períodos': ['Compare hours and periods', 'Comparar horarios y períodos'], 'Recorte': ['Group by', 'Agrupar por'],
  'Por hora do dia': ['Hour of day', 'Hora del día'], 'Por dia da semana': ['Day of week', 'Día de la semana'], 'Por dia': ['Day', 'Día'], 'Por mês': ['Month', 'Mes'],
  'Indicador do gráfico': ['Chart metric', 'Indicador del gráfico'], 'Indicador': ['Metric', 'Indicador'], 'Quantidade de pedidos': ['Order count', 'Número de pedidos'], 'Média de pedidos': ['Average order volume', 'Media de pedidos'],
  'TMA': ['Average fulfillment time', 'Tiempo medio de servicio del pedido'],
  'TMA até pronto': ['Average time to ready', 'Tiempo medio hasta listo'], 'TMA de preparo': ['Average prep time', 'Tiempo medio de preparación'],
  'Hora': ['Hour', 'Hora'], 'Dia da semana': ['Day of week', 'Día de la semana'], 'Dia': ['Day', 'Día'], 'Mês': ['Month', 'Mes'],
  'Pedidos': ['Orders', 'Pedidos'], 'Média de pedidos/hora': ['Average orders/hour', 'Media de pedidos/hora'], 'Média de pedidos/dia': ['Average orders/day', 'Media de pedidos/día'],
  'Pedidos com tempo registrado': ['Orders with recorded times', 'Pedidos con tiempos registrados'], 'Horas no período': ['Hours in period', 'Horas del período'], 'Dias no período': ['Days in period', 'Días del período'],
  'Por loja': ['By location', 'Por local'], 'Recebidos': ['Received', 'Recibidos'], 'Recebido': ['Received', 'Recibido'], 'Em preparo': ['In progress', 'En preparación'], 'Prontos': ['Ready', 'Listos'], 'Finalizados': ['Completed', 'Finalizados'], 'Finalizado': ['Completed', 'Finalizado'],
  'Espera média': ['Average wait time', 'Tiempo medio de espera'], 'Preparo médio': ['Average prep time', 'Tiempo medio de preparación'], 'Total até pronto': ['Average time to ready', 'Tiempo medio hasta listo'],
  'Detalhamento dos pedidos': ['Order details', 'Detalle de los pedidos'],
  'Pedidos emitidos no período; status atual. Tempos sem registro aparecem como —.': ['Orders sent in the selected period, showing their current status. Unrecorded times appear as —.', 'Pedidos enviados en el período, con su estado actual. Los tiempos sin registro aparecen como —.'],
  'Pedido': ['Order', 'Pedido'], 'Emissão': ['Sent at', 'Enviado'], 'Início do preparo': ['Prep started', 'Inicio de preparación'], 'Pronto': ['Ready', 'Listo'], 'Finalização': ['Completed at', 'Finalización'], 'Status': ['Status', 'Estado'], 'Espera': ['Wait time', 'Espera'], 'Preparo': ['Prep time', 'Preparación'],
  'Produtos mais pedidos': ['Most ordered items', 'Productos más pedidos'], 'Produto': ['Item', 'Producto'], 'Categoria': ['Category', 'Categoría'], 'Quantidade': ['Quantity', 'Cantidad'], 'Pedidos com o produto': ['Orders containing item', 'Pedidos con el producto'],
  'Quantidades dos itens emitidos para a cozinha. Combinações de sabores contam como um item com o nome registrado; adicionais não viram produtos separados.': ['Quantities sent to the kitchen. Flavor combinations count as one item under the recorded name; modifiers are not counted as separate items.', 'Cantidades enviadas a cocina. Las combinaciones de sabores cuentan como un producto con el nombre registrado; los extras no cuentan como productos separados.'],
  'Categorias mais pedidas': ['Most ordered categories', 'Categorías más pedidas'], 'Pedidos com a categoria': ['Orders containing category', 'Pedidos con la categoría'],
  'Produtividade por operador': ['Staff activity', 'Actividad por empleado'],
  'Quem iniciou, marcou pronto e finalizou cada pedido. Um mesmo pedido pode passar por vários operadores. O tempo de preparo pertence ao registro de pronto; o TMA, ao registro de finalização.': ['Who started, marked ready and completed each order. One order can involve several staff members. Prep time is attributed to the ready action; completed-order average time is attributed to the completion action.', 'Quién inició, marcó listo y finalizó cada pedido. Un pedido puede pasar por varios empleados. El tiempo de preparación se atribuye a quien marcó listo; el tiempo medio de los pedidos finalizados, a quien los finalizó.'],
  'Operadores são os usuários informados pelo tablet em cada etapa, inclusive offline. Registros antigos sem operador aparecem separados; um login compartilhado reúne os registros desse login.': ['Staff usernames are recorded by the tablet at each stage, including offline. Older records without a staff member appear separately; shared logins group all activity under that login.', 'El tablet registra el usuario en cada etapa, incluso sin conexión. Los registros antiguos sin empleado aparecen separados; un acceso compartido agrupa toda su actividad.'],
  'Operador': ['Staff member', 'Empleado'], 'Iniciados': ['Started', 'Iniciados'], 'Marcados prontos': ['Marked ready', 'Marcados listos'], 'TMA dos finalizados': ['Average fulfillment time of completed orders', 'Tiempo medio de servicio de pedidos finalizados'],
  '{metric} dos finalizados': ['{metric} of completed orders', '{metric} de pedidos finalizados'],
  'Pedidos no período': ['Orders in period', 'Pedidos del período'], 'Horário com mais pedidos': ['Peak order hour', 'Hora con más pedidos'], 'Sem operador registrado': ['No staff member recorded', 'Sin empleado registrado'],
  'Vendas ao longo do período': ['Sales over time', 'Ventas a lo largo del período'], 'Vendas líquidas': ['Net sales', 'Ventas netas'], 'Quantidade de vendas': ['Sale count', 'Número de ventas'], 'Recebimentos líquidos': ['Net payments', 'Cobros netos'],
  'Vendas líquidas descontam as devoluções e excluem imposto, gorjeta e entrega. Devoluções entram na data em que foram registradas. Valores negativos aparecem em vermelho no gráfico.': ['Net sales deduct refunds and exclude tax, tips and delivery fees. Refunds count on the date recorded. Negative values appear in red on the chart.', 'Las ventas netas descuentan devoluciones y excluyen impuestos, propinas y entrega. Las devoluciones se cuentan en la fecha registrada. Los valores negativos aparecen en rojo.'],
  'Vendas': ['Sales', 'Ventas'], 'Bruto': ['Gross sales', 'Bruto'], 'Descontos': ['Discounts', 'Descuentos'], 'Devoluções': ['Refunded amount', 'Importe devuelto'],
  'Formas de pagamento': ['Payment methods', 'Formas de pago'], 'Forma': ['Method', 'Forma'], 'Devolvido': ['Refunded', 'Devuelto'], 'Líquido': ['Net', 'Neto'],
  'Vendas por loja': ['Sales by location', 'Ventas por local'], 'Ticket médio': ['Average check', 'Ticket medio'], 'Imposto líquido': ['Net sales tax', 'Impuesto neto'], 'Gorjetas líquidas': ['Net tips', 'Propinas netas'], 'Entrega líquida': ['Net delivery fees', 'Tarifas de entrega netas'],
  'Produtos vendidos': ['Items sold', 'Productos vendidos'], 'Quantidade vendida': ['Quantity sold', 'Cantidad vendida'], 'Quantidade devolvida': ['Quantity returned', 'Cantidad devuelta'], 'Quantidade líquida': ['Net quantity', 'Cantidad neta'],
  'Estorno por valor devolve dinheiro sem declarar quantidade física devolvida.': ['Amount-based refunds return money without recording physical quantities returned.', 'Las devoluciones por importe devuelven dinero sin registrar cantidades físicas devueltas.'],
  'Vendas por categoria': ['Sales by category', 'Ventas por categoría'], 'Operações por operador': ['Transactions by staff member', 'Operaciones por empleado'],
  'Cada operação pertence ao usuário que a registrou. Um login compartilhado reúne os registros desse login.': ['Each transaction is attributed to the user who recorded it. Shared logins group all transactions under that login.', 'Cada operación se atribuye al usuario que la registró. Un acceso compartido agrupa todas sus operaciones.'],
  'Cancelamentos': ['Voids', 'Anulaciones'], 'Estornos': ['Refunds', 'Devoluciones'], 'Entradas': ['Cash paid in', 'Entradas de efectivo'], 'Saídas': ['Cash paid out', 'Salidas de efectivo'],
  'Fechamentos de caixa': ['Cash drawer closeouts', 'Cierres de caja'], 'Fechamento': ['Closed at', 'Cierre'], 'Dinheiro esperado': ['Expected cash', 'Efectivo esperado'], 'Dinheiro contado': ['Counted cash', 'Efectivo contado'], 'Diferença': ['Over/short', 'Diferencia'],
  'Últimas operações no período': ['Latest transactions in period', 'Últimas operaciones del período'], 'Data': ['Date', 'Fecha'], 'Operação': ['Transaction', 'Operación'], 'Valor': ['Amount', 'Importe'],
  'Dinheiro': ['Cash', 'Efectivo'], 'Cartão': ['Card', 'Tarjeta'], 'Zelle': ['Zelle', 'Zelle'], 'Dividido': ['Split payment', 'Pago dividido'], 'Venda': ['Sale', 'Venta'], 'Entrada': ['Cash paid in', 'Entrada de efectivo'], 'Saída': ['Cash paid out', 'Salida de efectivo'], 'Cancelamento': ['Void', 'Anulación'], 'Estorno': ['Refund', 'Devolución'],
  'Vendas no período': ['Sales in period', 'Ventas del período'], 'Ticket médio das vendas': ['Average check', 'Ticket medio por venta'], 'Vendas brutas': ['Gross sales', 'Ventas brutas'], 'Entradas de dinheiro': ['Cash paid in', 'Entradas de efectivo'], 'Saídas de dinheiro': ['Cash paid out', 'Salidas de efectivo'], 'Diferença nos fechamentos': ['Closeout over/short', 'Diferencia en los cierres'],
  'Após descontos e devoluções, sem imposto, gorjeta ou entrega': ['After discounts and refunds; excludes tax, tips and delivery fees', 'Tras descuentos y devoluciones; sin impuestos, propinas ni entrega'],
  'Inclui imposto, gorjeta e entrega; exclui entradas e saídas': ['Includes tax, tips and delivery fees; excludes cash paid in/out', 'Incluye impuestos, propinas y entrega; excluye entradas y salidas de efectivo'],
  'Valor dos produtos após desconto por venda, antes de devoluções, sem imposto, gorjeta ou entrega': ['Item value after discounts per sale, before refunds; excludes tax, tips and delivery fees', 'Valor de productos tras descuentos por venta, antes de devoluciones; sin impuestos, propinas ni entrega'],
  'Indicadores por período': ['Metrics by period', 'Indicadores por período'], 'Áreas do painel': ['Dashboard areas', 'Áreas del panel'], 'Vendas por período': ['Sales by period', 'Ventas por período'],
  'Domingo': ['Sunday', 'Domingo'], 'Segunda-feira': ['Monday', 'Lunes'], 'Terça-feira': ['Tuesday', 'Martes'], 'Quarta-feira': ['Wednesday', 'Miércoles'], 'Quinta-feira': ['Thursday', 'Jueves'], 'Sexta-feira': ['Friday', 'Viernes'], 'Sábado': ['Saturday', 'Sábado'],
  'Nova York · Eastern': ['New York · Eastern', 'Nueva York · Este'], 'Chicago · Central': ['Chicago · Central', 'Chicago · Centro'], 'Denver · Mountain': ['Denver · Mountain', 'Denver · Montaña'], 'Los Angeles · Pacific': ['Los Angeles · Pacific', 'Los Ángeles · Pacífico'], 'Phoenix · sem horário de verão': ['Phoenix · no daylight saving time', 'Phoenix · sin horario de verano'], 'Alasca': ['Alaska', 'Alaska'], 'Havaí': ['Hawaii', 'Hawái'], 'Madri · Espanha': ['Madrid · Spain', 'Madrid · España'],
  'Fuso do navegador · {zone}': ['Browser time zone · {zone}', 'Zona horaria del navegador · {zone}'],
  '{count} registros': ['{count} records', '{count} registros'], '{count} pedidos com tempo registrado': ['{count} orders with recorded times', '{count} pedidos con tiempos registrados'], '{count} pedidos no período': ['{count} orders in period', '{count} pedidos del período'],
  '{count} fechamentos no período': ['{count} closeouts in period', '{count} cierres en el período'],
  'hora': ['hour', 'hora'], 'dia': ['day', 'día'],
  'TMA em minutos: {basis}. Apenas pedidos com o intervalo registrado.': ['Average time in minutes: {basis}. Only orders with the selected interval recorded.', 'Tiempo medio en minutos: {basis}. Solo pedidos con el intervalo registrado.'],
  'Pedidos por {unit} abrangido pelo período, incluindo horários ou dias sem pedidos.': ['Orders per {unit} covered by the period, including hours or days with no orders.', 'Pedidos por {unit} del período, incluidas las horas o días sin pedidos.'],
  'Quantidade de pedidos emitidos em cada faixa do período.': ['Orders sent in each period bucket.', 'Pedidos enviados en cada franja del período.'],
  'Horários no fuso {zone}. Clique em uma barra para ver os valores.': ['Times use {zone}. Select a bar to see its values.', 'Horarios en {zone}. Selecciona una barra para ver sus valores.'],
  '{bucket}: {count} pedidos · média {rate} pedidos/{unit} · {metric} {time}': ['{bucket}: {count} orders · average {rate} orders/{unit} · {metric} {time}', '{bucket}: {count} pedidos · media {rate} pedidos/{unit} · {metric} {time}'],
  'Maior volume neste recorte: {bucket} · {count} pedidos.': ['Peak volume in this view: {bucket} · {count} orders.', 'Mayor volumen en esta vista: {bucket} · {count} pedidos.'],
  'Exibindo {shown} de {count} produtos, ordenados por quantidade. As métricas consideram todos os pedidos.': ['Showing {shown} of {count} items, ranked by quantity. Metrics include all orders.', 'Mostrando {shown} de {count} productos por cantidad. Los indicadores incluyen todos los pedidos.'],
  'Exibindo {shown} de {count} categorias.': ['Showing {shown} of {count} categories.', 'Mostrando {shown} de {count} categorías.'],
  'Exibindo {shown} de {count} registros de loja/operador. O recorte usa a emissão dos pedidos no período.': ['Showing {shown} of {count} location/staff records. Orders are selected by their sent date.', 'Mostrando {shown} de {count} registros de local/empleado. Los pedidos se seleccionan por su fecha de envío.'],
  'Exibindo {shown} de {count} pedidos. Totais, médias e gráficos consideram todos os pedidos da consulta.': ['Showing {shown} of {count} orders. Totals, averages and charts include all orders in the query.', 'Mostrando {shown} de {count} pedidos. Totales, medias y gráficos incluyen todos los pedidos de la consulta.'],
  'Período: {from} a {to} · fuso {zone}.': ['Period: {from} to {to} · time zone {zone}.', 'Período: {from} a {to} · zona horaria {zone}.'],
  '{metric}: {basis}. Médias de volume incluem períodos sem pedidos; horários repetidos no horário de verão contam as horas efetivas.': ['{metric}: {basis}. Volume averages include periods with no orders; repeated daylight-saving hours count the actual hours.', '{metric}: {basis}. Las medias de volumen incluyen períodos sin pedidos; las horas repetidas por cambio de horario cuentan las horas reales.'],
  'Atualizado em {time}. Consulta de até 12 meses; depende da sincronização dos tablets.': ['Updated {time}. Query up to 12 months; depends on tablet synchronization.', 'Actualizado {time}. Consulta de hasta 12 meses; depende de la sincronización de los tablets.'],
  'Preparo desabilitado: {stores}.': ['Kitchen module disabled: {stores}.', 'Cocina deshabilitada: {stores}.'], 'Caixa desabilitado: {stores}.': ['Cash Management disabled: {stores}.', 'Caja deshabilitada: {stores}.'],
  'Exibindo {shown} de {count} produtos, ordenados por vendas líquidas. Todos os produtos entram nos totais.': ['Showing {shown} of {count} items, ranked by net sales. Totals include all items.', 'Mostrando {shown} de {count} productos por ventas netas. Los totales incluyen todos los productos.'],
  'Exibindo {shown} de {count} fechamentos. A diferença total considera todos os fechamentos.': ['Showing {shown} of {count} closeouts. Total over/short includes all closeouts.', 'Mostrando {shown} de {count} cierres. La diferencia total incluye todos los cierres.'],
  'Exibindo {shown} de {count} operações. Todos os registros da consulta entram nos cálculos.': ['Showing {shown} of {count} transactions. Calculations include all records in the query.', 'Mostrando {shown} de {count} operaciones. Los cálculos incluyen todos los registros de la consulta.'],
  'Devoluções entram na data da devolução, mesmo quando a venda ocorreu antes do período.': ['Refunds count on the refund date, even if the sale was before the period.', 'Las devoluciones se cuentan en su fecha, aunque la venta sea anterior al período.'],
  'Atualizado em {time}. Valores em USD.': ['Updated {time}. Amounts in USD.', 'Actualizado {time}. Importes en USD.'],
  'Nenhum indicador disponível para esta seleção. A administração libera os módulos por loja.': ['No metrics available for this selection. Administration enables modules per location.', 'No hay indicadores para esta selección. La administración habilita los módulos por local.'],
  'Loja indisponível': ['Location unavailable', 'Local no disponible'], 'Escolha o mês.': ['Select a month.', 'Elige un mes.'],
  'Sessão encerrada.': ['Your session has ended.', 'La sesión ha finalizado.'], 'Não foi possível concluir.': ['Unable to complete the request.', 'No se pudo completar la solicitud.'],
  'Idioma salvo.': ['Language saved.', 'Idioma guardado.'], 'Não foi possível salvar o idioma. Tente novamente.': ['Unable to save the language. Try again.', 'No se pudo guardar el idioma. Inténtalo de nuevo.'],
  'Idioma inválido.': ['Invalid language.', 'Idioma no válido.'], 'Portal indisponível.': ['Dashboard unavailable.', 'Panel no disponible.'],
  'Formulário inválido. Entre novamente.': ['Invalid form. Sign in again.', 'Formulario no válido. Inicia sesión de nuevo.'], 'Sessão de login expirada. Entre novamente.': ['The sign-in session expired. Sign in again.', 'La sesión de acceso ha caducado. Inicia sesión de nuevo.'],
  'Usuário ou senha incorretos.': ['Incorrect username or password.', 'Usuario o contraseña incorrectos.'], 'Muitas tentativas. Aguarde 15 minutos.': ['Too many attempts. Wait 15 minutes.', 'Demasiados intentos. Espera 15 minutos.'],
  'Muitas tentativas. Tente novamente em {count} segundos.': ['Too many attempts. Try again in {count} seconds.', 'Demasiados intentos. Inténtalo de nuevo en {count} segundos.'],
  'Você já pode tentar novamente.': ['You can try again now.', 'Ya puedes volver a intentarlo.'],
  'Método indisponível.': ['Method not available.', 'Método no disponible.'], 'Recurso indisponível.': ['Resource not available.', 'Recurso no disponible.'], 'Loja não autorizada.': ['Location not authorized.', 'Local no autorizado.'],
  'Intervalo do TMA inválido.': ['Invalid average time metric.', 'Intervalo del tiempo medio no válido.'], 'Portal temporariamente indisponível.': ['Dashboard temporarily unavailable.', 'Panel temporalmente no disponible.'],
  'Fuso horário inválido.': ['Invalid time zone.', 'Zona horaria no válida.'], 'Informe datas válidas.': ['Enter valid dates.', 'Introduce fechas válidas.'], 'Selecione um período de até 12 meses (366 dias).': ['Select a period of up to 12 months (366 days).', 'Selecciona un período de hasta 12 meses (366 días).'],
  'O período excede 10.000 operações ou fechamentos. Escolha um intervalo menor ou uma loja.': ['The period exceeds 10,000 transactions or closeouts. Select a shorter period or one location.', 'El período supera 10.000 operaciones o cierres. Selecciona un período más corto o un local.'],
  'Formulário muito grande.': ['Form too large.', 'Formulario demasiado grande.'], 'Formulário inválido.': ['Invalid form.', 'Formulario no válido.'],
  'Acesso não autorizado.': ['Unauthorized.', 'Acceso no autorizado.'], 'Acesso não permitido.': ['Access denied.', 'Acceso no permitido.'],
};

export const SINGULAR_TRANSLATIONS = {
  'Muitas tentativas. Tente novamente em {count} segundos.': ['Muitas tentativas. Tente novamente em {count} segundo.', 'Too many attempts. Try again in {count} second.', 'Demasiados intentos. Inténtalo de nuevo en {count} segundo.'],
  '{count} registros': ['{count} registro', '{count} record', '{count} registro'],
  '{count} pedidos com tempo registrado': ['{count} pedido com tempo registrado', '{count} order with recorded times', '{count} pedido con tiempos registrados'],
  '{count} pedidos no período': ['{count} pedido no período', '{count} order in period', '{count} pedido del período'],
  '{count} fechamentos no período': ['{count} fechamento no período', '{count} closeout in period', '{count} cierre en el período'],
  '{bucket}: {count} pedidos · média {rate} pedidos/{unit} · {metric} {time}': ['{bucket}: {count} pedido · média {rate} pedidos/{unit} · {metric} {time}', '{bucket}: {count} order · average {rate} orders/{unit} · {metric} {time}', '{bucket}: {count} pedido · media {rate} pedidos/{unit} · {metric} {time}'],
  'Maior volume neste recorte: {bucket} · {count} pedidos.': ['Maior volume neste recorte: {bucket} · {count} pedido.', 'Peak volume in this view: {bucket} · {count} order.', 'Mayor volumen en esta vista: {bucket} · {count} pedido.'],
  'Exibindo {shown} de {count} produtos, ordenados por quantidade. As métricas consideram todos os pedidos.': ['Exibindo {shown} de {count} produto, ordenado por quantidade. As métricas consideram todos os pedidos.', 'Showing {shown} of {count} item, ranked by quantity. Metrics include all orders.', 'Mostrando {shown} de {count} producto por cantidad. Los indicadores incluyen todos los pedidos.'],
  'Exibindo {shown} de {count} categorias.': ['Exibindo {shown} de {count} categoria.', 'Showing {shown} of {count} category.', 'Mostrando {shown} de {count} categoría.'],
  'Exibindo {shown} de {count} registros de loja/operador. O recorte usa a emissão dos pedidos no período.': ['Exibindo {shown} de {count} registro de loja/operador. O recorte usa a emissão dos pedidos no período.', 'Showing {shown} of {count} location/staff record. Orders are selected by their sent date.', 'Mostrando {shown} de {count} registro de local/empleado. Los pedidos se seleccionan por su fecha de envío.'],
  'Exibindo {shown} de {count} pedidos. Totais, médias e gráficos consideram todos os pedidos da consulta.': ['Exibindo {shown} de {count} pedido. Totais, médias e gráficos consideram todos os pedidos da consulta.', 'Showing {shown} of {count} order. Totals, averages and charts include all orders in the query.', 'Mostrando {shown} de {count} pedido. Totales, medias y gráficos incluyen todos los pedidos de la consulta.'],
  'Exibindo {shown} de {count} produtos, ordenados por vendas líquidas. Todos os produtos entram nos totais.': ['Exibindo {shown} de {count} produto, ordenado por vendas líquidas. Todos os produtos entram nos totais.', 'Showing {shown} of {count} item, ranked by net sales. Totals include all items.', 'Mostrando {shown} de {count} producto por ventas netas. Los totales incluyen todos los productos.'],
  'Exibindo {shown} de {count} fechamentos. A diferença total considera todos os fechamentos.': ['Exibindo {shown} de {count} fechamento. A diferença total considera todos os fechamentos.', 'Showing {shown} of {count} closeout. Total over/short includes all closeouts.', 'Mostrando {shown} de {count} cierre. La diferencia total incluye todos los cierres.'],
  'Exibindo {shown} de {count} operações. Todos os registros da consulta entram nos cálculos.': ['Exibindo {shown} de {count} operação. Todos os registros da consulta entram nos cálculos.', 'Showing {shown} of {count} transaction. Calculations include all records in the query.', 'Mostrando {shown} de {count} operación. Los cálculos incluyen todos los registros de la consulta.'],
};

export function translate(language, source, values = {}) {
  const index = language === 'en' ? 0 : language === 'es' ? 1 : -1;
  const text = String(values.count) === '1' && Object.hasOwn(SINGULAR_TRANSLATIONS, source) ? SINGULAR_TRANSLATIONS[source][index + 1] : index < 0 || !Object.hasOwn(TRANSLATIONS, source) ? source : TRANSLATIONS[source][index];
  return text.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match));
}
export function requestLanguage(request, readCookie, cookieName = LANGUAGE_COOKIE, fallback = 'en') {
  const remembered = readCookie(request, cookieName);
  if (validLanguage(remembered)) return remembered;
  const preferred = (request.headers.get('Accept-Language') || '').split(',').map((value, index) => {
    const [tag, ...parameters] = value.trim().split(';'), quality = parameters.find(part => part.trim().startsWith('q='));
    return { language: tag.toLowerCase().split('-')[0], quality: quality ? Number(quality.trim().slice(2)) : 1, index };
  }).filter(item => validLanguage(item.language) && Number.isFinite(item.quality) && item.quality > 0 && item.quality <= 1).sort((a, b) => b.quality - a.quality || a.index - b.index);
  return preferred[0]?.language || fallback;
}
export function localizeMarkup(content, language) {
  // Only trusted static template text/attributes are translated. Report values
  // are rendered later with textContent and keep their historical names.
  return content.replace(/(<[^>]+>)([^<>]+)(?=<)/g, (match, opening, text) => {
    if (opening.includes('data-original-text')) return match;
    const key = text.trim();
    return Object.hasOwn(TRANSLATIONS, key) ? opening + text.replace(key, translate(language, key)) : match;
  }).replace(/(aria-label|title|placeholder)=(["'])([^"']*)\2/g, (match, attribute, quote, text) => Object.hasOwn(TRANSLATIONS, text) ? `${attribute}=${quote}${translate(language, text)}${quote}` : match);
}
export function languageSelector(language) {
  const choices = [['pt', 'Português'], ['en', 'English'], ['es', 'Español']];
  return `<div id='language' class='language-picker' role='group' aria-label='${translate(language, 'Idioma')}'>${choices.map(([value, label]) => `<button type='button' class='language-button' data-language='${value}' aria-label='${label}' title='${label}' aria-pressed='${language === value}'>${LANGUAGE_FLAGS[value]}</button>`).join('')}</div><p id='language-message' role='status' aria-live='polite'></p>`;
}
export const languageSelectorCss = `.language-corner{display:flex;justify-content:flex-end;margin:0 0 12px}.language-picker{display:flex;align-items:center;justify-content:flex-end;gap:4px;margin:0}.language-picker .language-button{display:flex;align-items:center;justify-content:center;flex:none;width:44px;height:44px;min-width:44px;min-height:44px;margin:0;padding:0;border:1px solid transparent;border-radius:8px;background:transparent;cursor:pointer}.language-picker .language-button[aria-pressed=true]{background:#e8f1ec;border-color:#214b40}.language-picker .language-button:focus-visible{outline:3px solid #ae4328;outline-offset:2px}.language-picker .language-button:disabled{opacity:.55;cursor:wait}.language-button svg{display:block;width:20px;height:15px;border-radius:2px;pointer-events:none}.topbar>.language-corner{margin:0 0 0 auto}.topbar>.nav{flex-basis:100%;margin-left:0}#language-message:empty{display:none}#language-message{color:#a22828}@media(max-width:640px){.topbar>.language-corner{order:-1;flex-basis:100%}}`;
export function languageScript(language, userId = '', scope = 'manager', signIn = false) {
  const index = language === 'en' ? 0 : language === 'es' ? 1 : -1;
  const signInKeys = ['Não foi possível salvar o idioma. Tente novamente.', 'Muitas tentativas. Tente novamente em {count} segundos.', 'Você já pode tentar novamente.'];
  const entries = signIn ? signInKeys.map(key => [key, TRANSLATIONS[key]]) : Object.entries(TRANSLATIONS);
  const translations = Object.fromEntries(entries.map(([key, values]) => [key, index < 0 ? key : values[index]]));
  const serialized = JSON.stringify(translations).replace(/</g, '\\u003c');
  const singular = JSON.stringify(Object.fromEntries(Object.entries(SINGULAR_TRANSLATIONS).filter(([key]) => !signIn || signInKeys.includes(key)).map(([key, values]) => [key, values[index + 1]]))).replace(/</g, '\\u003c');
  return `const language=${JSON.stringify(language)},locale=${JSON.stringify(LANGUAGES[language])},translations=${serialized},singularTranslations=${singular},viewKey=${JSON.stringify('bistro-manager-view:' + userId)};
function tr(source,values={}){const text=String(values.count)==='1'&&Object.hasOwn(singularTranslations,source)?singularTranslations[source]:Object.hasOwn(translations,source)?translations[source]:source;return text.replace(/\\{(\\w+)\\}/g,(match,key)=>String(values[key]??match))}
function tmaLabel(basis){return tr(basis==='preparation'?'TMA de preparo':basis==='ready'?'TMA até pronto':'TMA')}
function saveView(){if(!document.querySelector('#filters'))return;try{const view={};for(const id of ['store','tma-basis','sales-breakdown','sales-chart-metric']){const field=document.querySelector('#'+id);if(field)view[id]=field.value};view.area=activeArea;sessionStorage.setItem(viewKey,JSON.stringify(view))}catch{}}
function languageTarget(nextLanguage){
const target=new URL(location.href);
if(target.pathname==='/admin/login')target.pathname='/admin';
if(target.pathname==='/gestor/login')target.pathname='/gestor';
if(target.pathname==='/admin/reset-password'&&!target.searchParams.has('token')){const input=document.querySelector('form[action="/admin/reset-password"] input[name="token"]');if(input&&/^[a-f0-9]{64}$/.test(input.value))target.searchParams.set('token',input.value)}
// A different search also forces a document GET when the current URL has a hash.
// Explicit navigation replaces POST history without submitting a form again.
target.searchParams.set('_language',nextLanguage);
if(target.pathname===location.pathname&&target.search===location.search)target.searchParams.set('_language',nextLanguage+'-'+crypto.randomUUID());
return target.href;
}
const languageButtons=document.querySelectorAll('#language [data-language]');let savingLanguage=false;
for(const button of languageButtons)button.addEventListener('click',async()=>{if(savingLanguage||button.dataset.language===language)return;savingLanguage=true;for(const choice of languageButtons)choice.disabled=true;document.querySelector('#language-message').textContent='';try{const response=await fetch(${JSON.stringify(scope === 'admin' ? '/admin/language' : '/gestor/language')},{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:button.dataset.language})});if(!response.ok)throw Error();saveView();location.replace(languageTarget(button.dataset.language))}catch{document.querySelector('#language-message').textContent=tr('Não foi possível salvar o idioma. Tente novamente.');savingLanguage=false;for(const choice of languageButtons)choice.disabled=false}});
`;
}
import { ADMIN_TRANSLATIONS } from './admin-i18n.mjs';
