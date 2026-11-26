/*
 * Traducción de StudySpot (Ajustes → Idioma): español (original), inglés y portugués de Portugal.
 * Script normal con "defer", antes de los módulos de cada página: traduce el HTML y, con un
 * MutationObserver, todo lo que los módulos pintan después (listas, avisos, mensajes del servidor,
 * los textos de Sito…). El texto en español es la clave, como en gettext: así el resto del código
 * no cambia. Los textos con datos (horas, nombres, números) se traducen con PATRONES.
 * El idioma sale de localStorage (studyspot.idioma, js/preferencias.js) o del navegador.
 */
(function iniciarTraduccion() {
  const IDIOMAS = ['es', 'en', 'pt'];
  const idioma = (() => {
    try {
      const guardado = window.localStorage.getItem('studyspot.idioma');
      if (IDIOMAS.includes(guardado)) return guardado;
    } catch { /* sin localStorage */ }
    const navegador = (navigator.language || '').slice(0, 2);
    return IDIOMAS.includes(navegador) ? navegador : 'es';
  })();
  document.documentElement.lang = idioma;
  if (idioma === 'es') return;
  const COL = idioma === 'en' ? 0 : 1;

  // 'texto en español': ['English', 'Português']
  const T = {
    // ---------- comunes ----------
    'Cargando…': ['Loading…', 'A carregar…'],
    'Algo ha fallado. Inténtalo de nuevo.': ['Something went wrong. Please try again.', 'Algo correu mal. Tenta de novo.'],
    'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.': ['Could not connect. Check your connection and try again.', 'Não foi possível ligar. Verifica a ligação e tenta de novo.'],
    'Error interno. Inténtalo de nuevo más tarde.': ['Internal error. Please try again later.', 'Erro interno. Tenta de novo mais tarde.'],
    'Método no permitido.': ['Method not allowed.', 'Método não permitido.'],
    'Acción no válida.': ['Invalid action.', 'Ação inválida.'],
    'Inicia sesión para continuar.': ['Sign in to continue.', 'Inicia sessão para continuar.'],
    'Navegación': ['Navigation', 'Navegação'],
    'Cancelar': ['Cancel', 'Cancelar'],
    'Aceptar': ['Accept', 'Aceitar'],
    'Rechazar': ['Decline', 'Recusar'],
    'Continuar': ['Continue', 'Continuar'],
    'Entrar': ['Enter', 'Entrar'],
    'Enviar': ['Send', 'Enviar'],
    'Crear': ['Create', 'Criar'],
    'Cambiar': ['Change', 'Alterar'],
    'Borrar': ['Delete', 'Apagar'],
    'Eliminar': ['Delete', 'Eliminar'],
    'Salir': ['Leave', 'Sair'],
    'Permitir': ['Allow', 'Permitir'],
    'Ahora no': ['Not now', 'Agora não'],
    'Omitir': ['Skip', 'Saltar'],
    'Empezar': ['Get started', 'Começar'],
    'Pruébalo': ['Try it', 'Experimenta'],
    'Intentar de nuevo': ['Try again', 'Tentar de novo'],
    'Volver al mapa': ['Back to map', 'Voltar ao mapa'],
    'Volver al inicio': ['Back to home', 'Voltar ao início'],
    'Volver a la lista': ['Back to list', 'Voltar à lista'],
    'Volver a iniciar sesión': ['Back to sign in', 'Voltar a iniciar sessão'],
    'Este campo es obligatorio.': ['This field is required.', 'Este campo é obrigatório.'],
    'Revisa los campos.': ['Check the fields.', 'Revê os campos.'],
    'Obligatoria': ['Required', 'Obrigatória'],
    'Tú': ['You', 'Tu'],
    '(tú)': ['(you)', '(tu)'],
    '¡Hecho!': ['Done!', 'Feito!'],
    'Mapa': ['Map', 'Mapa'],
    'Perfil': ['Profile', 'Perfil'],
    'Ajustes': ['Settings', 'Definições'],
    'Amigos': ['Friends', 'Amigos'],
    'Grupos': ['Groups', 'Grupos'],
    'Amigo': ['Friend', 'Amigo'],
    'Te ha enviado una solicitud': ['Sent you a request', 'Enviou-te um pedido'],
    'Tu perfil': ['Your profile', 'O teu perfil'],
    'Nombre': ['Name', 'Nome'],
    'Correo': ['Email', 'Email'],
    'Contraseña': ['Password', 'Palavra-passe'],
    'Actual': ['Current', 'Atual'],
    'Nueva': ['New', 'Nova'],
    'Repetir': ['Repeat', 'Repetir'],
    'nombre@universidad.es': ['name@university.edu', 'nome@universidade.pt'],
    'nombre@unizar.es': ['name@university.edu', 'nome@universidade.pt'],

    // ---------- títulos de las pestañas ----------
    'Iniciar sesión · StudySpot': ['Sign in · StudySpot', 'Iniciar sessão · StudySpot'],
    'Crear cuenta · StudySpot': ['Create account · StudySpot', 'Criar conta · StudySpot'],
    'Recuperar contraseña · StudySpot': ['Reset password · StudySpot', 'Recuperar palavra-passe · StudySpot'],
    'Nueva contraseña · StudySpot': ['New password · StudySpot', 'Nova palavra-passe · StudySpot'],
    'Mapa · StudySpot': ['Map · StudySpot', 'Mapa · StudySpot'],
    'Biblioteca · StudySpot': ['Library · StudySpot', 'Biblioteca · StudySpot'],
    'Check-in · StudySpot': ['Check-in · StudySpot', 'Check-in · StudySpot'],
    'Perfil · StudySpot': ['Profile · StudySpot', 'Perfil · StudySpot'],
    'Social · StudySpot': ['Social · StudySpot', 'Social · StudySpot'],
    'Grupo · StudySpot': ['Group · StudySpot', 'Grupo · StudySpot'],
    'Ajustes · StudySpot': ['Settings · StudySpot', 'Definições · StudySpot'],
    'Horarios · StudySpot': ['Opening hours · StudySpot', 'Horários · StudySpot'],
    'Información legal · StudySpot': ['Legal information · StudySpot', 'Informação legal · StudySpot'],
    'Bienvenida · StudySpot': ['Welcome · StudySpot', 'Boas-vindas · StudySpot'],

    // ---------- acceso: login, registro, recuperar ----------
    'Mira lo llenas que están las bibliotecas antes de salir de casa.': ['See how full the libraries are before you leave home.', 'Vê quão cheias estão as bibliotecas antes de saíres de casa.'],
    'Correo institucional': ['University email', 'Email institucional'],
    'Iniciar sesión': ['Sign in', 'Iniciar sessão'],
    '¿Has olvidado tu contraseña?': ['Forgot your password?', 'Esqueceste-te da palavra-passe?'],
    '¿No tienes cuenta?': ['No account?', 'Não tens conta?'],
    'Crear cuenta': ['Create account', 'Criar conta'],
    '¿Ya tienes cuenta?': ['Already have an account?', 'Já tens conta?'],
    'Ya tengo cuenta': ['I already have an account', 'Já tenho conta'],
    'Usa el correo de tu universidad para unirte a StudySpot.': ['Use your university email to join StudySpot.', 'Usa o email da tua universidade para te juntares ao StudySpot.'],
    'Repite la contraseña': ['Repeat the password', 'Repete a palavra-passe'],
    'Mínimo 8 caracteres.': ['At least 8 characters.', 'Mínimo 8 caracteres.'],
    'Mínimo 8 caracteres': ['At least 8 characters', 'Mínimo 8 caracteres'],
    'Otra vez la contraseña': ['Password again', 'A palavra-passe outra vez'],
    'Otra vez la nueva': ['New one again', 'A nova outra vez'],
    'Nombre y apellido': ['Name and surname', 'Nome e apelido'],
    'Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.': ['Enter your account email and we will send you a link to create a new one.', 'Escreve o email da tua conta e enviamos-te um link para criares uma nova.'],
    'Enviar enlace': ['Send link', 'Enviar link'],
    '¿Ya la recuerdas?': ['Remember it now?', 'Já te lembras?'],
    'Crea una contraseña nueva': ['Create a new password', 'Cria uma palavra-passe nova'],
    'Después podrás iniciar sesión con ella.': ['You can sign in with it afterwards.', 'Depois podes iniciar sessão com ela.'],
    'Contraseña nueva': ['New password', 'Palavra-passe nova'],
    'Guardar contraseña': ['Save password', 'Guardar palavra-passe'],
    'Este enlace no es válido. Pide uno nuevo.': ['This link is not valid. Ask for a new one.', 'Este link não é válido. Pede um novo.'],
    'Pedir un enlace nuevo': ['Ask for a new link', 'Pedir um link novo'],
    'El enlace no es válido o ha caducado. Pide uno nuevo.': ['The link is not valid or has expired. Ask for a new one.', 'O link não é válido ou expirou. Pede um novo.'],
    'Si hay una cuenta con ese correo, te hemos enviado un enlace para crear una nueva contraseña.': ['If there is an account with that email, we have sent you a link to create a new password.', 'Se houver uma conta com esse email, enviámos-te um link para criares uma nova palavra-passe.'],
    'Restablece tu contraseña de StudySpot': ['Reset your StudySpot password', 'Repõe a tua palavra-passe do StudySpot'],
    'Contraseña cambiada. Ya puedes iniciar sesión con la nueva.': ['Password changed. You can now sign in with the new one.', 'Palavra-passe alterada. Já podes iniciar sessão com a nova.'],
    'Cuenta creada. Ya puedes iniciar sesión.': ['Account created. You can now sign in.', 'Conta criada. Já podes iniciar sessão.'],
    'Cuenta creada.': ['Account created.', 'Conta criada.'],
    'Has cerrado sesión.': ['You have signed out.', 'Terminaste a sessão.'],
    'Sesión cerrada.': ['Signed out.', 'Sessão terminada.'],
    'Correo o contraseña incorrectos.': ['Wrong email or password.', 'Email ou palavra-passe incorretos.'],
    'Escribe tu correo y tu contraseña.': ['Enter your email and password.', 'Escreve o teu email e a tua palavra-passe.'],
    'Introduce un correo válido.': ['Enter a valid email.', 'Introduz um email válido.'],
    'Introduce un correo válido, por ejemplo nombre@unizar.es.': ['Enter a valid email, for example name@university.edu.', 'Introduz um email válido, por exemplo nome@universidade.pt.'],
    'Usa el correo de tu universidad.': ['Use your university email.', 'Usa o email da tua universidade.'],
    'Ya existe una cuenta con este correo.': ['There is already an account with this email.', 'Já existe uma conta com este email.'],
    'Las contraseñas no coinciden.': ["The passwords don't match.", 'As palavras-passe não coincidem.'],

    // ---------- mapa y bibliotecas ----------
    'Mapa de bibliotecas': ['Library map', 'Mapa de bibliotecas'],
    'Cargando mapa…': ['Loading map…', 'A carregar o mapa…'],
    'He llegado': ["I'm here", 'Cheguei'],
    'He llegado: hacer check-in con el QR de tu zona': ["I'm here: check in with your area's QR code", 'Cheguei: fazer check-in com o QR da tua zona'],
    'Bibliotecas': ['Libraries', 'Bibliotecas'],
    'Biblioteca': ['Library', 'Biblioteca'],
    'Buscar bibliotecas': ['Search libraries', 'Pesquisar bibliotecas'],
    'Buscar biblioteca por nombre o zona': ['Search a library by name or area', 'Pesquisar biblioteca por nome ou zona'],
    'Tu perfil ': ['Your profile', 'O teu perfil'],
    'Mostrar todas las bibliotecas': ['Show all libraries', 'Mostrar todas as bibliotecas'],
    'Ocultar la lista de bibliotecas': ['Hide the library list', 'Ocultar a lista de bibliotecas'],
    'Marca una biblioteca como favorita y el mapa se abrirá en ella.': ['Mark a library as your favourite and the map will open on it.', 'Marca uma biblioteca como favorita e o mapa abre nela.'],
    ', tu favorita': [', your favourite', ', a tua favorita'],
    'Actualizado ahora': ['Updated just now', 'Atualizado agora'],
    'Tranquila': ['Quiet', 'Calma'],
    'Bastante gente': ['Fairly busy', 'Bastante gente'],
    'Muy llena': ['Very full', 'Muito cheia'],
    'Sin gente': ['Empty', 'Sem gente'],
    'Baja': ['Low', 'Baixa'],
    'Media': ['Medium', 'Média'],
    'Alta': ['High', 'Alta'],
    'baja': ['low', 'baixa'],
    'media': ['medium', 'média'],
    'alta': ['high', 'alta'],
    'Abierta': ['Open', 'Aberta'],
    'Cerrada': ['Closed', 'Fechada'],
    'Cerrada hoy': ['Closed today', 'Fechada hoje'],
    'Cerrado': ['Closed', 'Fechado'],
    'Horario no disponible': ['Opening hours not available', 'Horário não disponível'],
    'Horario': ['Hours', 'Horário'],
    'Ocupación': ['Occupancy', 'Ocupação'],
    'Fiabilidad': ['Reliability', 'Fiabilidade'],
    'Cómo llegar': ['Directions', 'Como chegar'],
    'Detalles': ['Details', 'Detalhes'],
    '1 con la app': ['1 using the app', '1 com a app'],
    'No se ha podido cargar el mapa. Aquí tienes la lista de bibliotecas.': ["The map couldn't load. Here is the list of libraries.", 'Não foi possível carregar o mapa. Aqui tens a lista de bibliotecas.'],
    'El mapa no está configurado.': ['The map is not configured.', 'O mapa não está configurado.'],
    'Falta config.php: copia config.example.php y rellénalo.': ['config.php is missing: copy config.example.php and fill it in.', 'Falta o config.php: copia o config.example.php e preenche-o.'],
    'Favorita': ['Favourite', 'Favorita'],
    'Marcar como favorita': ['Mark as favourite', 'Marcar como favorita'],
    'Tu biblioteca favorita': ['Your favourite library', 'A tua biblioteca favorita'],
    '¿Cambiar de favorita?': ['Change favourite?', 'Mudar de favorita?'],
    'Dirección': ['Address', 'Morada'],
    'Ocupación actual': ['Current occupancy', 'Ocupação atual'],
    'Fiabilidad de los datos:': ['Data reliability:', 'Fiabilidade dos dados:'],
    'Ocupación típica': ['Typical occupancy', 'Ocupação habitual'],
    'Día de la semana': ['Day of the week', 'Dia da semana'],
    'Media de las semanas anteriores, calculada con la ley de Little (llegadas por hora × duración media de las sesiones).': ["Average of previous weeks, calculated with Little's law (arrivals per hour × average session length).", 'Média das semanas anteriores, calculada com a lei de Little (chegadas por hora × duração média das sessões).'],
    'Aún no hay datos suficientes para este día.': ['There is not enough data for this day yet.', 'Ainda não há dados suficientes para este dia.'],
    'Esta biblioteca no está disponible.': ['This library is not available.', 'Esta biblioteca não está disponível.'],
    'Biblioteca no encontrada.': ['Library not found.', 'Biblioteca não encontrada.'],
    'Biblioteca no válida.': ['Invalid library.', 'Biblioteca inválida.'],
    'Falta la biblioteca.': ['The library is missing.', 'Falta a biblioteca.'],
    'El día debe ser un número del 1 (lunes) al 7 (domingo).': ['The day must be a number from 1 (Monday) to 7 (Sunday).', 'O dia deve ser um número de 1 (segunda) a 7 (domingo).'],
    'L': ['M', 'S'], 'M': ['T', 'T'], 'X': ['W', 'Q'], 'J': ['T', 'Q'], 'V': ['F', 'S'], 'S': ['S', 'S'], 'D': ['S', 'D'],

    // ---------- check-in ----------
    'Escanea el QR de tu zona': ["Scan your area's QR code", 'Lê o QR da tua zona'],
    'Lo encontrarás en la entrada de la biblioteca.': ["You'll find it at the library entrance.", 'Vais encontrá-lo à entrada da biblioteca.'],
    'Activar cámara': ['Turn on camera', 'Ativar câmara'],
    'Imagen de la cámara para leer el QR': ['Camera image to read the QR code', 'Imagem da câmara para ler o QR'],
    'Permitir ubicación': ['Allow location', 'Permitir localização'],
    'StudySpot usa tu ubicación solo para comprobar que estás en la biblioteca. No la guardamos.': ["StudySpot only uses your location to check you're at the library. We don't store it.", 'O StudySpot só usa a tua localização para confirmar que estás na biblioteca. Não a guardamos.'],
    'No se ha podido hacer el check-in': ["Check-in didn't work", 'Não foi possível fazer o check-in'],
    'Biblioteca cerrada': ['Library closed', 'Biblioteca fechada'],
    'Vuelve en otro momento o revisa su horario en el mapa.': ['Come back later or check its hours on the map.', 'Volta noutra altura ou consulta o horário no mapa.'],
    'Sesión de estudio': ['Study session', 'Sessão de estudo'],
    'Check-in hecho': ['Checked in', 'Check-in feito'],
    'Tiempo de estudio': ['Study time', 'Tempo de estudo'],
    'Check-out': ['Check out', 'Check-out'],
    'Sesión terminada': ['Session finished', 'Sessão terminada'],
    'Ver mis puntos': ['See my points', 'Ver os meus pontos'],
    '0 min': ['0 min', '0 min'],
    '1 punto': ['1 point', '1 ponto'],
    'Parece que estás demasiado lejos de la biblioteca.': ['It looks like you are too far from the library.', 'Parece que estás demasiado longe da biblioteca.'],
    'Este código QR no es válido. Escanea el QR de tu zona de estudio.': ["This QR code isn't valid. Scan the QR code of your study area.", 'Este código QR não é válido. Lê o QR da tua zona de estudo.'],
    'Este código QR no es de StudySpot. Busca el QR de tu zona de estudio.': ["This QR code isn't from StudySpot. Look for your study area's QR code.", 'Este código QR não é do StudySpot. Procura o QR da tua zona de estudo.'],
    'No hemos podido obtener tu ubicación. Activa el permiso de ubicación e inténtalo de nuevo.': ["We couldn't get your location. Turn on location permission and try again.", 'Não conseguimos obter a tua localização. Ativa a permissão de localização e tenta de novo.'],
    'No hemos podido obtener tu ubicación. Inténtalo de nuevo.': ["We couldn't get your location. Please try again.", 'Não conseguimos obter a tua localização. Tenta de novo.'],
    'Sin permiso de ubicación no podemos comprobar que estás en la biblioteca.': ["Without location permission we can't check you're at the library.", 'Sem permissão de localização não podemos confirmar que estás na biblioteca.'],
    'Activa la ubicación para esta página en los ajustes del navegador y vuelve a intentarlo.': ['Turn on location for this page in your browser settings and try again.', 'Ativa a localização para esta página nas definições do navegador e tenta de novo.'],
    'Cuando quieras, pulsa "Intentar de nuevo".': ['Whenever you like, tap "Try again".', 'Quando quiseres, carrega em "Tentar de novo".'],
    'Este navegador no permite obtener tu ubicación en esta página (hace falta HTTPS).': ["This browser can't get your location on this page (HTTPS is required).", 'Este navegador não permite obter a tua localização nesta página (é preciso HTTPS).'],
    'Este navegador no permite usar la cámara en esta página (hace falta HTTPS). Escanea el QR con la cámara del móvil.': ["This browser can't use the camera on this page (HTTPS is required). Scan the QR code with your phone's camera.", 'Este navegador não permite usar a câmara nesta página (é preciso HTTPS). Lê o QR com a câmara do telemóvel.'],
    'No hemos encontrado ninguna cámara en este dispositivo.': ["We couldn't find a camera on this device.", 'Não encontrámos nenhuma câmara neste dispositivo.'],
    'No se ha podido abrir la cámara. Inténtalo de nuevo.': ["The camera couldn't open. Please try again.", 'Não foi possível abrir a câmara. Tenta de novo.'],
    'Sin permiso de cámara no podemos leer el QR. Actívalo en los ajustes del navegador y pulsa "Activar cámara".': ['Without camera permission we can\'t read the QR code. Turn it on in your browser settings and tap "Turn on camera".', 'Sem permissão de câmara não podemos ler o QR. Ativa-a nas definições do navegador e carrega em "Ativar câmara".'],
    'Ya tienes una sesión de estudio activa. Haz check-out antes de empezar otra.': ['You already have an active study session. Check out before starting another one.', 'Já tens uma sessão de estudo ativa. Faz check-out antes de começar outra.'],
    'No tienes ninguna sesión activa. Las sesiones se cierran solas a las 4 horas.': ["You don't have an active session. Sessions end automatically after 4 hours.", 'Não tens nenhuma sessão ativa. As sessões terminam sozinhas ao fim de 4 horas.'],

    // ---------- perfil ----------
    'Puntos totales': ['Total points', 'Pontos totais'],
    'Ganas puntos al terminar cada sesión de estudio: 1 punto cada 15 minutos.': ['You earn points when each study session ends: 1 point every 15 minutes.', 'Ganhas pontos ao terminar cada sessão de estudo: 1 ponto a cada 15 minutos.'],
    'Amigos y grupos': ['Friends and groups', 'Amigos e grupos'],
    'Cerrar sesión': ['Sign out', 'Terminar sessão'],
    'Este perfil no está disponible.': ['This profile is not available.', 'Este perfil não está disponível.'],
    'Perfil no válido.': ['Invalid profile.', 'Perfil inválido.'],

    // ---------- social y grupos ----------
    'Social': ['Social', 'Social'],
    'Crear grupo': ['Create group', 'Criar grupo'],
    'Añadir amigo': ['Add friend', 'Adicionar amigo'],
    'Invitaciones': ['Invitations', 'Convites'],
    'Tus grupos': ['Your groups', 'Os teus grupos'],
    'Cada grupo tiene su ranking de la semana (de lunes a domingo) y su objetivo.': ['Each group has its own weekly ranking (Monday to Sunday) and goal.', 'Cada grupo tem o seu ranking da semana (de segunda a domingo) e o seu objetivo.'],
    'Sin grupos todavía': ['No groups yet', 'Ainda sem grupos'],
    'Crea uno para tu clase, tus amigos del cole o solo con tu pareja, y competid por ver quién estudia más cada semana.': ['Create one for your class, your school friends or just your partner, and see who studies most each week.', 'Cria um para a tua turma, os teus amigos da escola ou só com o teu par, e vejam quem estuda mais cada semana.'],
    'Unirme': ['Join', 'Entrar'],
    'alguien del grupo': ['someone in the group', 'alguém do grupo'],
    'Solicitudes': ['Requests', 'Pedidos'],
    'No tienes solicitudes pendientes.': ["You don't have pending requests.", 'Não tens pedidos pendentes.'],
    'Tus amigos': ['Your friends', 'Os teus amigos'],
    'Todavía no tienes amigos. Añádelos con el + de arriba.': ["You don't have friends yet. Add them with the + above.", 'Ainda não tens amigos. Adiciona-os com o + lá em cima.'],
    'Solo ves dónde estudian los amigos que lo comparten y están en una sesión de estudio.': ['You only see where friends study if they share it and are in a study session.', 'Só vês onde estudam os amigos que o partilham e estão numa sessão de estudo.'],
    'Ubicación no disponible': ['Location not available', 'Localização não disponível'],
    'Privacidad': ['Privacy', 'Privacidade'],
    'Compartir dónde estudio': ['Share where I study', 'Partilhar onde estudo'],
    'Tus amigos solo ven en qué biblioteca estás, y solo mientras tengas una sesión activa.': ["Your friends only see which library you're in, and only while you have an active session.", 'Os teus amigos só veem em que biblioteca estás, e só enquanto tiveres uma sessão ativa.'],
    'Tus amigos solo ven en qué biblioteca estás, y solo mientras tengas una sesión activa. Tu ubicación exacta nunca se guarda.': ["Your friends only see which library you're in, and only while you have an active session. Your exact location is never stored.", 'Os teus amigos só veem em que biblioteca estás, e só enquanto tiveres uma sessão ativa. A tua localização exata nunca é guardada.'],
    'Bloqueados': ['Blocked', 'Bloqueados'],
    'No has bloqueado a nadie.': ["You haven't blocked anyone.", 'Não bloqueaste ninguém.'],
    'No pueden enviarte solicitudes ni ver dónde estudias. No se les avisa.': ["They can't send you requests or see where you study. They aren't notified.", 'Não te podem enviar pedidos nem ver onde estudas. Não são avisados.'],
    'Bloquear': ['Block', 'Bloquear'],
    'Desbloquear': ['Unblock', 'Desbloquear'],
    'Le llegará una solicitud. Cuando la acepte, podréis estar en los mismos grupos.': ["They'll get a request. Once they accept, you can be in the same groups.", 'Vai receber um pedido. Quando o aceitar, podem estar nos mesmos grupos.'],
    'Nuevo grupo': ['New group', 'Novo grupo'],
    'Clase de LP': ['LP class', 'Turma de LP'],
    'Objetivo semanal': ['Weekly goal', 'Objetivo semanal'],
    'Puntos que queréis sumar entre todos cada semana. 1 punto = 15 minutos de estudio, así que 40 puntos son 10 horas.': ['Points you want to earn together each week. 1 point = 15 minutes of study, so 40 points are 10 hours.', 'Pontos que querem somar entre todos cada semana. 1 ponto = 15 minutos de estudo, por isso 40 pontos são 10 horas.'],
    'Ranking de lunes a domingo. Empieza de cero cada lunes.': ['Ranking from Monday to Sunday. It starts from zero every Monday.', 'Ranking de segunda a domingo. Começa do zero todas as segundas.'],
    'Añadir personas': ['Add people', 'Adicionar pessoas'],
    'Podio de la semana': ["This week's podium", 'Pódio da semana'],
    'Nadie ha sumado puntos esta semana todavía.': ["Nobody has earned points this week yet.", 'Ainda ninguém somou pontos esta semana.'],
    'Clasificación': ['Leaderboard', 'Classificação'],
    'Objetivo del grupo': ['Group goal', 'Objetivo do grupo'],
    '¡Conseguido!': ['Achieved!', 'Conseguido!'],
    'Personas': ['People', 'Pessoas'],
    'Admin': ['Admin', 'Admin'],
    'Invitación pendiente': ['Invitation pending', 'Convite pendente'],
    'Toca a una persona para hacerla administradora o quitarla del grupo.': ['Tap a person to make them an admin or remove them from the group.', 'Toca numa pessoa para a tornar administradora ou tirá-la do grupo.'],
    'Solo la administración del grupo puede añadir o quitar personas.': ['Only the group admins can add or remove people.', 'Só a administração do grupo pode adicionar ou tirar pessoas.'],
    'Ajustes del grupo': ['Group settings', 'Definições do grupo'],
    'El objetivo son los puntos que queréis sumar entre todos cada semana (1 punto = 15 minutos).': ['The goal is the points you want to earn together each week (1 point = 15 minutes).', 'O objetivo são os pontos que querem somar entre todos cada semana (1 ponto = 15 minutos).'],
    'Solo la administración puede cambiar el nombre y el objetivo.': ['Only the admins can change the name and the goal.', 'Só a administração pode alterar o nome e o objetivo.'],
    'Salir del grupo': ['Leave group', 'Sair do grupo'],
    'Para volver te tendrán que invitar otra vez.': ["You'll need to be invited again to come back.", 'Para voltares terão de te convidar outra vez.'],
    'Les llegará una invitación y entrarán cuando la acepten.': ["They'll get an invitation and join when they accept it.", 'Vão receber um convite e entram quando o aceitarem.'],
    'Todos tus amigos ya están en el grupo o tienen la invitación.': ['All your friends are already in the group or have been invited.', 'Todos os teus amigos já estão no grupo ou têm o convite.'],
    '¿No está en la lista?': ["Not on the list?", 'Não está na lista?'],
    'Enviar solicitud de amistad': ['Send friend request', 'Enviar pedido de amizade'],
    'Solo se puede invitar a amigos. Cuando acepte tu solicitud, aparecerá arriba para invitarle.': ['You can only invite friends. Once they accept your request, they will appear above so you can invite them.', 'Só se pode convidar amigos. Quando aceitar o teu pedido, aparece lá em cima para o convidares.'],
    'Solicitud enviada. Cuando la acepte, aparecerá en "Tus amigos" para invitarle.': ['Request sent. Once they accept, they will appear in "Your friends" so you can invite them.', 'Pedido enviado. Quando o aceitar, aparece em "Os teus amigos" para o convidares.'],
    'Invitar': ['Invite', 'Convidar'],
    'Invitado': ['Invited', 'Convidado'],
    'Hacer administrador/a': ['Make admin', 'Tornar administrador/a'],
    'Quitar de la administración': ['Remove as admin', 'Tirar da administração'],
    'Dejar la administración': ['Stop being an admin', 'Deixar a administração'],
    'Quitar del grupo': ['Remove from group', 'Tirar do grupo'],
    'Anular la invitación': ['Cancel invitation', 'Anular o convite'],
    'Grupo': ['Group', 'Grupo'],
    'Grupo no encontrado.': ['Group not found.', 'Grupo não encontrado.'],
    'Grupo no válido.': ['Invalid group.', 'Grupo inválido.'],
    'Hecho.': ['Done.', 'Feito.'],
    'Ya estás en el grupo.': ["You're now in the group.", 'Já estás no grupo.'],
    'Invitación rechazada.': ['Invitation declined.', 'Convite recusado.'],
    'No tienes ninguna invitación a ese grupo.': ["You don't have an invitation to that group.", 'Não tens nenhum convite para esse grupo.'],
    'Solo la administración del grupo puede hacer esto.': ['Only the group admins can do this.', 'Só a administração do grupo pode fazer isto.'],
    'Solo puedes invitar a tus amigos.': ['You can only invite your friends.', 'Só podes convidar os teus amigos.'],
    'Esa persona ya está en el grupo o ya tiene la invitación.': ['That person is already in the group or already has the invitation.', 'Essa pessoa já está no grupo ou já tem o convite.'],
    'El grupo necesita al menos una persona administradora.': ['The group needs at least one admin.', 'O grupo precisa de pelo menos uma pessoa administradora.'],
    'Escribe el correo de tu amigo.': ["Enter your friend's email.", 'Escreve o email do teu amigo.'],
    'Solicitud enviada.': ['Request sent.', 'Pedido enviado.'],
    'Solicitud aceptada.': ['Request accepted.', 'Pedido aceite.'],
    'Solicitud rechazada.': ['Request declined.', 'Pedido recusado.'],
    'Solicitud no encontrada.': ['Request not found.', 'Pedido não encontrado.'],
    'Datos de la solicitud no válidos.': ['Invalid request data.', 'Dados do pedido inválidos.'],
    'Ya hay una solicitud o una amistad con esa persona.': ['There is already a request or friendship with that person.', 'Já há um pedido ou uma amizade com essa pessoa.'],
    'No puedes enviarte una solicitud a ti mismo.': ["You can't send a request to yourself.", 'Não podes enviar um pedido a ti próprio.'],
    'Usuario no disponible. Comprueba que el correo es correcto.': ['User not available. Check the email is correct.', 'Utilizador não disponível. Confirma que o email está correto.'],
    'Has bloqueado a esta persona. Desbloquéala para enviarle una solicitud.': ['You have blocked this person. Unblock them to send a request.', 'Bloqueaste esta pessoa. Desbloqueia-a para lhe enviar um pedido.'],
    'Usuario bloqueado.': ['User blocked.', 'Utilizador bloqueado.'],
    'Usuario desbloqueado.': ['User unblocked.', 'Utilizador desbloqueado.'],
    'Usuario no encontrado.': ['User not found.', 'Utilizador não encontrado.'],
    'Datos del bloqueo no válidos.': ['Invalid block data.', 'Dados do bloqueio inválidos.'],
    'No puedes bloquearte a ti mismo.': ["You can't block yourself.", 'Não te podes bloquear a ti próprio.'],
    'El valor debe ser yes o no.': ['The value must be yes or no.', 'O valor deve ser yes ou no.'],
    'Dejaréis de ser amigos y no podrá enviarte solicitudes ni ver dónde estudias. No se le avisará.': ["You'll stop being friends and they won't be able to send you requests or see where you study. They won't be notified.", 'Deixam de ser amigos e não te poderá enviar pedidos nem ver onde estudas. Não será avisado.'],

    // ---------- ajustes ----------
    'Cuenta': ['Account', 'Conta'],
    'Cambiar contraseña': ['Change password', 'Alterar palavra-passe'],
    'El correo es el de tu universidad y no se puede cambiar.': ["The email is your university one and can't be changed.", 'O email é o da tua universidade e não se pode alterar.'],
    'Preferencias': ['Preferences', 'Preferências'],
    'Idioma': ['Language', 'Idioma'],
    'Apariencia': ['Appearance', 'Aparência'],
    'Automática': ['Automatic', 'Automática'],
    'Clara': ['Light', 'Clara'],
    'Oscura': ['Dark', 'Escura'],
    'Personas bloqueadas': ['Blocked people', 'Pessoas bloqueadas'],
    'Tus datos': ['Your data', 'Os teus dados'],
    'Descargar mis datos': ['Download my data', 'Descarregar os meus dados'],
    'Eliminar mi cuenta': ['Delete my account', 'Eliminar a minha conta'],
    'Puedes descargar en un archivo todo lo que StudySpot guarda de ti, o borrar tu cuenta y todos tus datos para siempre.': ['You can download a file with everything StudySpot stores about you, or delete your account and all your data for good.', 'Podes descarregar num ficheiro tudo o que o StudySpot guarda de ti, ou apagar a tua conta e todos os teus dados para sempre.'],
    'Información legal': ['Legal information', 'Informação legal'],
    'Política de privacidad': ['Privacy policy', 'Política de privacidade'],
    'Términos de uso': ['Terms of use', 'Termos de utilização'],
    'Cookies': ['Cookies', 'Cookies'],
    'Ayuda': ['Help', 'Ajuda'],
    'Ver el tutorial de Sito': ["See Sito's tutorial", 'Ver o tutorial do Sito'],
    'Contacto': ['Contact', 'Contacto'],
    'Versión': ['Version', 'Versão'],
    'Administración': ['Administration', 'Administração'],
    'Horarios de las bibliotecas': ['Library opening hours', 'Horários das bibliotecas'],
    'Para entrar te pediremos tu contraseña una vez; después queda abierto hasta que cierres sesión.': ["We'll ask for your password once to enter; then it stays open until you sign out.", 'Para entrar pedimos-te a palavra-passe uma vez; depois fica aberto até terminares a sessão.'],
    'Confirma que eres tú. Solo te la pediremos una vez: después queda abierto hasta que cierres sesión.': ["Confirm it's you. We'll only ask once: then it stays open until you sign out.", 'Confirma que és tu. Só ta pedimos uma vez: depois fica aberto até terminares a sessão.'],
    'Escribe tu contraseña para confirmar.': ['Enter your password to confirm.', 'Escreve a tua palavra-passe para confirmar.'],
    'Eliminar cuenta': ['Delete account', 'Eliminar conta'],
    '¿Eliminar tu cuenta?': ['Delete your account?', 'Eliminar a tua conta?'],
    'Se borrarán para siempre tus puntos, sesiones, amigos y grupos. No se puede deshacer.': ["Your points, sessions, friends and groups will be deleted for good. This can't be undone.", 'Os teus pontos, sessões, amigos e grupos serão apagados para sempre. Não se pode desfazer.'],
    'Nombre guardado.': ['Name saved.', 'Nome guardado.'],
    'Contraseña cambiada.': ['Password changed.', 'Palavra-passe alterada.'],
    'Idioma guardado.': ['Language saved.', 'Idioma guardado.'],
    'Idioma no disponible.': ['Language not available.', 'Idioma não disponível.'],
    'La contraseña actual no es correcta.': ['The current password is not correct.', 'A palavra-passe atual não está correta.'],
    'La contraseña no es correcta.': ['The password is not correct.', 'A palavra-passe não está correta.'],
    'Tu cuenta no es de administración.': ['Your account is not an admin account.', 'A tua conta não é de administração.'],
    'Administración abierta.': ['Administration unlocked.', 'Administração aberta.'],
    'Cuenta eliminada.': ['Account deleted.', 'Conta eliminada.'],
    'Confirma tu contraseña para entrar en la administración.': ['Confirm your password to enter the administration.', 'Confirma a tua palavra-passe para entrar na administração.'],
    '0.2 · Sprint 2': ['0.2 · Sprint 2', '0.2 · Sprint 2'],

    // ---------- administración de horarios ----------
    'Horarios': ['Opening hours', 'Horários'],
    'Horario semanal': ['Weekly hours', 'Horário semanal'],
    'Horas en la hora local de la biblioteca. Marca "Cerrado" los días que no abre.': ['Times in the library\'s local time. Tick "Closed" on days it doesn\'t open.', 'Horas na hora local da biblioteca. Marca "Fechado" nos dias em que não abre.'],
    'Guardar horario semanal': ['Save weekly hours', 'Guardar horário semanal'],
    'Periodos especiales': ['Special periods', 'Períodos especiais'],
    'No hay periodos especiales para esta biblioteca.': ['There are no special periods for this library.', 'Não há períodos especiais para esta biblioteca.'],
    'Añadir periodo': ['Add period', 'Adicionar período'],
    'Desde': ['From', 'De'],
    'Hasta': ['To', 'Até'],
    'Motivo': ['Reason', 'Motivo'],
    'Exámenes, Navidad…': ['Exams, Christmas…', 'Exames, Natal…'],
    'Cerrada todo el periodo': ['Closed the whole period', 'Fechada todo o período'],
    'Apertura': ['Opening', 'Abertura'],
    'Cierre': ['Closing', 'Fecho'],
    'El horario de esos días vuelve a ser el normal.': ['Those days go back to the normal hours.', 'Esses dias voltam ao horário normal.'],
    'Pon las horas de apertura y cierre o marca "Cerrado" en los días sin horario.': ['Set opening and closing times or tick "Closed" on days without hours.', 'Indica as horas de abertura e fecho ou marca "Fechado" nos dias sem horário.'],
    'Horario semanal guardado.': ['Weekly hours saved.', 'Horário semanal guardado.'],
    'Periodo especial añadido.': ['Special period added.', 'Período especial adicionado.'],
    'Periodo especial borrado.': ['Special period deleted.', 'Período especial apagado.'],
    'Periodo especial no encontrado.': ['Special period not found.', 'Período especial não encontrado.'],
    'Periodo especial no válido.': ['Invalid special period.', 'Período especial inválido.'],
    'Ya hay un periodo especial en esas fechas.': ['There is already a special period on those dates.', 'Já há um período especial nessas datas.'],
    'Revisa las fechas, la descripción y las horas.': ['Check the dates, the description and the times.', 'Revê as datas, a descrição e as horas.'],
    'El horario semanal debe tener los 7 días, con horas válidas.': ['The weekly hours must have all 7 days with valid times.', 'O horário semanal deve ter os 7 dias, com horas válidas.'],
    'Solo los administradores pueden gestionar horarios.': ['Only admins can manage opening hours.', 'Só os administradores podem gerir horários.'],
    'Lunes': ['Monday', 'Segunda-feira'], 'Martes': ['Tuesday', 'Terça-feira'], 'Miércoles': ['Wednesday', 'Quarta-feira'],
    'Jueves': ['Thursday', 'Quinta-feira'], 'Viernes': ['Friday', 'Sexta-feira'], 'Sábado': ['Saturday', 'Sábado'], 'Domingo': ['Sunday', 'Domingo'],
    'Lun': ['Mon', 'Seg'], 'Mar': ['Tue', 'Ter'], 'Mié': ['Wed', 'Qua'], 'Jue': ['Thu', 'Qui'], 'Vie': ['Fri', 'Sex'], 'Sáb': ['Sat', 'Sáb'], 'Dom': ['Sun', 'Dom'],
    'Apertura del lunes': ['Monday opening', 'Abertura de segunda'], 'Cierre del lunes': ['Monday closing', 'Fecho de segunda'],
    'Apertura del martes': ['Tuesday opening', 'Abertura de terça'], 'Cierre del martes': ['Tuesday closing', 'Fecho de terça'],
    'Apertura del miércoles': ['Wednesday opening', 'Abertura de quarta'], 'Cierre del miércoles': ['Wednesday closing', 'Fecho de quarta'],
    'Apertura del jueves': ['Thursday opening', 'Abertura de quinta'], 'Cierre del jueves': ['Thursday closing', 'Fecho de quinta'],
    'Apertura del viernes': ['Friday opening', 'Abertura de sexta'], 'Cierre del viernes': ['Friday closing', 'Fecho de sexta'],
    'Apertura del sábado': ['Saturday opening', 'Abertura de sábado'], 'Cierre del sábado': ['Saturday closing', 'Fecho de sábado'],
    'Apertura del domingo': ['Sunday opening', 'Abertura de domingo'], 'Cierre del domingo': ['Sunday closing', 'Fecho de domingo'],

    // ---------- avatar ----------
    'Avatar · StudySpot': ['Avatar · StudySpot', 'Avatar · StudySpot'],
    'Avatar': ['Avatar', 'Avatar'],
    'Crear avatar': ['Create avatar', 'Criar avatar'],
    'Editar avatar': ['Edit avatar', 'Editar avatar'],
    'Vista previa de tu avatar': ['Preview of your avatar', 'Pré-visualização do teu avatar'],
    'Partes del avatar': ['Avatar parts', 'Partes do avatar'],
    'Piel': ['Skin', 'Pele'], 'Peinado': ['Hairstyle', 'Penteado'], 'Cejas': ['Brows', 'Sobrancelhas'],
    'Ojos': ['Eyes', 'Olhos'], 'Cabeza': ['Head', 'Cabeça'], 'Nariz': ['Nose', 'Nariz'], 'Boca': ['Mouth', 'Boca'],
    'Orejas': ['Ears', 'Orelhas'], 'Vello facial': ['Facial hair', 'Pelos faciais'], 'Gafas': ['Glasses', 'Óculos'],
    'Gorros': ['Headwear', 'Chapéus'], 'Fondo': ['Background', 'Fundo'],
    'Quitar avatar y usar mis iniciales': ['Remove avatar and use my initials', 'Remover avatar e usar as minhas iniciais'],
    '¿Quitar tu avatar?': ['Remove your avatar?', 'Remover o teu avatar?'],
    'Volverán a verse tus iniciales.': ['Your initials will show again.', 'Voltam a ver-se as tuas iniciais.'],
    'Quitar': ['Remove', 'Remover'],
    'Avatar guardado.': ['Avatar saved.', 'Avatar guardado.'],
    'Avatar no válido.': ['Invalid avatar.', 'Avatar inválido.'],

    // ---------- bienvenida con Sito ----------
    'Hola, soy': ["Hi, I'm", 'Olá, sou o'],
    'Te enseño StudySpot en menos de un minuto.': ["I'll show you StudySpot in under a minute.", 'Mostro-te o StudySpot em menos de um minuto.'],
    'Encuentra sitio': ['Find a spot', 'Encontra lugar'],
    'Cuanto más lleno el anillo, más gente hay. Toca la biblioteca más tranquila.': ['The fuller the ring, the more people there are. Tap the quietest library.', 'Quanto mais cheio o anel, mais gente há. Toca na biblioteca mais calma.'],
    'Escanea al llegar': ['Scan when you arrive', 'Lê o QR ao chegar'],
    'En cada sala hay un código QR. Escanéalo al sentarte para hacer check-in.': ['Every room has a QR code. Scan it when you sit down to check in.', 'Em cada sala há um código QR. Lê-o ao sentares-te para fazer check-in.'],
    'Suma puntos': ['Earn points', 'Soma pontos'],
    'Ganas 1 punto cada 15 minutos de estudio, hasta 16 por sesión.': ['You earn 1 point every 15 minutes of study, up to 16 per session.', 'Ganhas 1 ponto a cada 15 minutos de estudo, até 16 por sessão.'],
    'Todo listo': ['All set', 'Tudo pronto'],
    'Ya sabes usar StudySpot.': ['Now you know how to use StudySpot.', 'Já sabes usar o StudySpot.'],
    'Mira cuánta gente hay': ['See how many people there are', 'Vê quanta gente há'],
    'Elige la biblioteca con más sitio libre.': ['Pick the library with the most free space.', 'Escolhe a biblioteca com mais lugares livres.'],
    'El QR de tu sala hace el check-in.': ["Your room's QR code checks you in.", 'O QR da tua sala faz o check-in.'],
    'Uno cada 15 minutos de estudio.': ['One every 15 minutes of study.', 'Um a cada 15 minutos de estudo.'],
    'Es la que tiene más sitio libre.': ["It's the one with the most free space.", 'É a que tem mais lugares livres.'],
    'Esa está bastante llena. Busca el anillo más vacío.': ["That one's fairly full. Look for the emptiest ring.", 'Essa está bastante cheia. Procura o anel mais vazio.'],
    '¡Esa es!': ["That's the one!", 'É essa!'],
    'Mmm… casi': ['Hmm… almost', 'Hmm… quase'],
    'Escanear': ['Scan', 'Ler'],
    'Estudiar 1 hora': ['Study for 1 hour', 'Estudar 1 hora'],
    'Ya cuentas en la ocupación de esa biblioteca.': ["You now count towards that library's occupancy.", 'Já contas na ocupação dessa biblioteca.'],
    'Al irte, haz check-out y se guardan en tu perfil.': ['When you leave, check out and they are saved to your profile.', 'Quando saíres, faz check-out e ficam guardados no teu perfil.'],
    'Pasos de la bienvenida': ['Welcome steps', 'Passos das boas-vindas'],

    // ---------- información legal ----------
    'Borrador de un proyecto académico. Última actualización: 26 de noviembre de 2026.': ['Draft from an academic project. Last updated: 26 November 2026.', 'Rascunho de um projeto académico. Última atualização: 26 de novembro de 2026.'],
    'StudySpot te ayuda a ver lo llenas que están las bibliotecas y a estudiar con tus amigos. Aquí te contamos qué datos usamos, para qué y qué puedes hacer con ellos, según el Reglamento General de Protección de Datos (RGPD).': ['StudySpot helps you see how full libraries are and study with your friends. Here we explain what data we use, why, and what you can do with it, under the General Data Protection Regulation (GDPR).', 'O StudySpot ajuda-te a ver quão cheias estão as bibliotecas e a estudar com os teus amigos. Aqui explicamos que dados usamos, para quê e o que podes fazer com eles, segundo o Regulamento Geral sobre a Proteção de Dados (RGPD).'],
    'Quién es responsable': ['Who is responsible', 'Quem é o responsável'],
    'El equipo de StudySpot, un proyecto académico de estudiantes. Puedes escribirnos desde el apartado Contacto.': ['The StudySpot team, an academic project by students. You can write to us from the Contact section.', 'A equipa do StudySpot, um projeto académico de estudantes. Podes escrever-nos a partir da secção Contacto.'],
    'Qué datos guardamos': ['What data we store', 'Que dados guardamos'],
    'Tu cuenta:': ['Your account:', 'A tua conta:'],
    'nombre, correo de tu universidad, idioma y la fecha de registro. La contraseña se guarda cifrada: nadie, ni nosotros, puede leerla.': ['name, university email, language and sign-up date. The password is stored encrypted: nobody, not even us, can read it.', 'nome, email da universidade, idioma e data de registo. A palavra-passe é guardada cifrada: ninguém, nem nós, a pode ler.'],
    'Tus sesiones de estudio:': ['Your study sessions:', 'As tuas sessões de estudo:'],
    'en qué biblioteca y zona, cuándo empiezan y terminan, y los puntos que ganas.': ['which library and area, when they start and end, and the points you earn.', 'em que biblioteca e zona, quando começam e terminam, e os pontos que ganhas.'],
    'Lo social:': ['Social:', 'A parte social:'],
    'tus amistades y solicitudes, las personas que bloqueas, tus grupos y si compartes dónde estudias.': ['your friendships and requests, the people you block, your groups and whether you share where you study.', 'as tuas amizades e pedidos, as pessoas que bloqueias, os teus grupos e se partilhas onde estudas.'],
    ', si eliges una.': [', if you choose one.', ', se escolheres uma.'],
    'Tu ubicación': ['Your location', 'A tua localização'],
    'Solo la pedimos al hacer check-in, para comprobar que estás en la biblioteca. Se usa en ese momento para calcular la distancia y': ["We only ask for it when you check in, to make sure you're at the library. It's used at that moment to calculate the distance and", 'Só a pedimos ao fazer check-in, para confirmar que estás na biblioteca. É usada nesse momento para calcular a distância e'],
    'nunca se guarda': ['is never stored', 'nunca é guardada'],
    'Para qué los usamos': ['What we use it for', 'Para que os usamos'],
    'Para que funcione la app: tu cuenta, el check-in, los puntos, la ocupación de las bibliotecas y los rankings (base legal: el servicio que nos pides, art. 6.1.b RGPD).': ['To make the app work: your account, check-in, points, library occupancy and rankings (legal basis: the service you ask us for, art. 6.1.b GDPR).', 'Para a app funcionar: a tua conta, o check-in, os pontos, a ocupação das bibliotecas e os rankings (base legal: o serviço que nos pedes, art. 6.1.b RGPD).'],
    'Para enseñar a tus amigos dónde estudias, solo si activas "Compartir dónde estudio" (base legal: tu consentimiento, art. 6.1.a RGPD). Puedes desactivarlo cuando quieras.': ['To show your friends where you study, only if you turn on "Share where I study" (legal basis: your consent, art. 6.1.a GDPR). You can turn it off whenever you like.', 'Para mostrar aos teus amigos onde estudas, só se ativares "Partilhar onde estudo" (base legal: o teu consentimento, art. 6.1.a RGPD). Podes desativá-lo quando quiseres.'],
    'La ocupación que ve todo el mundo es un número total por biblioteca: nunca dice quién está.': ["The occupancy everyone sees is a total per library: it never says who's there.", 'A ocupação que todos veem é um número total por biblioteca: nunca diz quem lá está.'],
    'Quién ve qué': ['Who sees what', 'Quem vê o quê'],
    'Tus amigos ven tu nombre y tus puntos; y en qué biblioteca estás solo si lo compartes y tienes una sesión activa.': ["Your friends see your name and points, and which library you're in only if you share it and have an active session.", 'Os teus amigos veem o teu nome e os teus pontos; e em que biblioteca estás só se o partilhares e tiveres uma sessão ativa.'],
    'La gente de tus grupos ve tu nombre y tus puntos de la semana.': ['People in your groups see your name and your points for the week.', 'As pessoas dos teus grupos veem o teu nome e os teus pontos da semana.'],
    'Nadie ve tu correo, salvo quien recibe tu solicitud de amistad.': ['Nobody sees your email, except whoever receives your friend request.', 'Ninguém vê o teu email, exceto quem recebe o teu pedido de amizade.'],
    'No vendemos ni cedemos tus datos a nadie. El mapa lo dibuja Mapbox: al cargarlo, tu navegador le pide las imágenes del mapa y Mapbox ve tu dirección IP, como cualquier web que visitas.': ["We don't sell or give your data to anyone. The map is drawn by Mapbox: when it loads, your browser asks Mapbox for the map images and Mapbox sees your IP address, like any website you visit.", 'Não vendemos nem cedemos os teus dados a ninguém. O mapa é desenhado pela Mapbox: ao carregá-lo, o teu navegador pede-lhe as imagens do mapa e a Mapbox vê o teu endereço IP, como qualquer site que visitas.'],
    'Cuánto tiempo': ['How long', 'Durante quanto tempo'],
    'Mientras tengas cuenta. Si la eliminas, se borra todo de inmediato. Los enlaces para recuperar la contraseña caducan solos.': ['For as long as you have an account. If you delete it, everything is erased immediately. Password reset links expire on their own.', 'Enquanto tiveres conta. Se a eliminares, tudo é apagado de imediato. Os links para recuperar a palavra-passe expiram sozinhos.'],
    'Tus derechos': ['Your rights', 'Os teus direitos'],
    'Puedes ver y corregir tus datos, descargarlos ("Descargar mis datos" en Ajustes), borrarlos ("Eliminar mi cuenta"), oponerte a su uso o retirar tu consentimiento. Si crees que no los tratamos bien, puedes reclamar ante la autoridad de protección de datos (en España, la AEPD; en Portugal, la CNPD).': ['You can see and correct your data, download it ("Download my data" in Settings), delete it ("Delete my account"), object to its use or withdraw your consent. If you think we don\'t handle it properly, you can complain to the data protection authority (in Spain, the AEPD; in Portugal, the CNPD).', 'Podes ver e corrigir os teus dados, descarregá-los ("Descarregar os meus dados" nas Definições), apagá-los ("Eliminar a minha conta"), opor-te à sua utilização ou retirar o teu consentimento. Se achares que não os tratamos bem, podes reclamar junto da autoridade de proteção de dados (em Espanha, a AEPD; em Portugal, a CNPD).'],
    'Qué es:': ['What it is:', 'O que é:'],
    'StudySpot es un proyecto académico en pruebas. Puede tener fallos o cambiar sin aviso.': ['StudySpot is an academic project in testing. It may have bugs or change without notice.', 'O StudySpot é um projeto académico em testes. Pode ter falhas ou mudar sem aviso.'],
    'La ocupación es una estimación': ['Occupancy is an estimate', 'A ocupação é uma estimativa'],
    'a partir de las personas que hacen check-in. Úsala como orientación: puede no coincidir con la realidad.': ['based on the people who check in. Use it as a guide: it may not match reality.', 'a partir das pessoas que fazem check-in. Usa-a como orientação: pode não coincidir com a realidade.'],
    'Tu cuenta es personal.': ['Your account is personal.', 'A tua conta é pessoal.'],
    'Necesitas un correo de tu universidad y eres responsable de tu contraseña.': ['You need a university email and you are responsible for your password.', 'Precisas de um email da tua universidade e és responsável pela tua palavra-passe.'],
    'Juega limpio:': ['Play fair:', 'Joga limpo:'],
    'haz check-in solo cuando estés de verdad en la biblioteca, no hagas trampas con los puntos y trata con respeto al resto. Podemos suspender las cuentas que no lo hagan.': ["only check in when you're really at the library, don't cheat with points and treat others with respect. We may suspend accounts that don't.", 'faz check-in só quando estiveres mesmo na biblioteca, não faças batota com os pontos e trata os outros com respeito. Podemos suspender as contas que não o façam.'],
    'Los horarios': ['Opening hours', 'Os horários'],
    'los publican las bibliotecas y la administración de la app; confírmalos con la biblioteca si es importante.': ["are published by the libraries and the app's admins; confirm them with the library if it matters.", 'são publicados pelas bibliotecas e pela administração da app; confirma-os com a biblioteca se for importante.'],
    'Puedes dejar de usar StudySpot y eliminar tu cuenta cuando quieras desde Ajustes.': ['You can stop using StudySpot and delete your account whenever you like from Settings.', 'Podes deixar de usar o StudySpot e eliminar a tua conta quando quiseres nas Definições.'],
    'StudySpot solo usa lo imprescindible para funcionar, así que no necesita pedirte permiso:': ['StudySpot only uses what is strictly necessary to work, so it does not need to ask your permission:', 'O StudySpot só usa o imprescindível para funcionar, por isso não precisa de te pedir autorização:'],
    'Cookie de sesión': ['Session cookie', 'Cookie de sessão'],
    '(PHPSESSID): mantiene tu sesión iniciada. Se borra al cerrar sesión.': ['(PHPSESSID): keeps you signed in. It is deleted when you sign out.', '(PHPSESSID): mantém a tua sessão iniciada. É apagado ao terminar a sessão.'],
    'Preferencias en tu navegador': ['Preferences in your browser', 'Preferências no teu navegador'],
    '(almacenamiento local): tu idioma, la apariencia y si ya has visto el tutorial de Sito.': ["(local storage): your language, appearance and whether you've seen Sito's tutorial.", '(armazenamento local): o teu idioma, a aparência e se já viste o tutorial do Sito.'],
    'No usamos cookies de publicidad ni de analítica, ni rastreamos lo que haces fuera de StudySpot.': ["We don't use advertising or analytics cookies, and we don't track what you do outside StudySpot.", 'Não usamos cookies de publicidade nem de análise, nem seguimos o que fazes fora do StudySpot.'],
    '¿Dudas, un fallo o algo sobre tus datos? Escríbenos a': ['Questions, a bug or something about your data? Write to us at', 'Dúvidas, uma falha ou algo sobre os teus dados? Escreve-nos para'],
    '[correo de contacto del equipo]': ['[team contact email]', '[email de contacto da equipa]'],
  };

  // Textos con datos dentro. $1, $2… se traducen a su vez si están en T (p. ej. "alta" → "high").
  const PATRONES = [
    [/^(\d+) con la app$/, ['$1 using the app', '$1 com a app']],
    [/^(.+) · Fiabilidad (baja|media|alta)$/, ['$1 · Reliability $2', '$1 · Fiabilidade $2']],
    [/^(.+): (\d+) % de ocupación, fiabilidad (baja|media|alta)$/, ['$1: $2% occupancy, $3 reliability', '$1: $2% de ocupação, fiabilidade $3']],
    [/^(.+): (\d+) % de ocupación, (.+)$/, ['$1: $2% occupancy, $3', '$1: $2% de ocupação, $3']],
    [/^(.+), tu favorita: (.+)$/, ['$1, your favourite: $2', '$1, a tua favorita: $2']],
    [/^(.+): (Abierta|Cerrada|Cerrada hoy) · (.+)$/, ['$1: $2 · $3', '$1: $2 · $3']],
    [/^Abre a las (.+)$/, ['Opens at $1', 'Abre às $1']],
    [/^Cierra a las (.+)$/, ['Closes at $1', 'Fecha às $1']],
    [/^Hoy de (\S+) a (.+)$/, ['Today $1 to $2', 'Hoje das $1 às $2']],
    [/^(Abierta|Cerrada|Cerrada hoy) · (.+)$/, ['$1 · $2', '$1 · $2']],
    [/^Actualizado hace (\d+) min$/, ['Updated $1 min ago', 'Atualizado há $1 min']],
    [/^(\d+) (persona|personas) · (\d+) de (\d+) puntos esta semana$/, ['$1 $2 · $3 of $4 points this week', '$1 $2 · $3 de $4 pontos esta semana']],
    [/^persona$/, ['person', 'pessoa']], [/^personas$/, ['people', 'pessoas']],
    [/^(\d+) de (\d+) puntos$/, ['$1 of $2 points', '$1 de $2 pontos']],
    [/^(\d+) pts$/, ['$1 pts', '$1 pts']],
    [/^(\d+) puntos$/, ['$1 points', '$1 pontos']],
    [/^(.+) \(tú\)$/, ['$1 (you)', '$1 (tu)']],
    [/^Te invita (.+)$/, ['Invited by $1', 'Convite de $1']],
    [/^Estudiando en (.+)$/, ['Studying at $1', 'A estudar em $1']],
    [/^Bloquear a (.+)$/, ['Block $1', 'Bloquear $1']],
    [/^¿Bloquear a (.+)\?$/, ['Block $1?', 'Bloquear $1?']],
    [/^¿Salir de (.+)\?$/, ['Leave $1?', 'Sair de $1?']],
    [/^¿Borrar «(.+)»\?$/, ['Delete "$1"?', 'Apagar «$1»?']],
    [/^(.+) dejará de ser tu favorita\. Solo puedes tener una\.$/, ['$1 will no longer be your favourite. You can only have one.', '$1 deixará de ser a tua favorita. Só podes ter uma.']],
    [/^(.+) · Check-in a las (.+)$/, ['$1 · Checked in at $2', '$1 · Check-in às $2']],
    [/^Acércate a (.+) y vuelve a intentarlo\.$/, ['Get closer to $1 and try again.', 'Aproxima-te de $1 e tenta de novo.']],
    [/^Has estudiado (.+) y has ganado (.+)\.$/, ['You studied for $1 and earned $2.', 'Estudaste $1 e ganhaste $2.']],
    [/^(\d+) h (\d+) min$/, ['$1 h $2 min', '$1 h $2 min']],
    [/^Basada en (\d+) (estudiante|estudiantes) con sesión activa\. Con menos de 5, la estimación es poco fiable\.$/, ['Based on $1 students with an active session. With fewer than 5, the estimate is not very reliable.', 'Baseada em $1 estudantes com sessão ativa. Com menos de 5, a estimativa é pouco fiável.']],
    [/^No hay bibliotecas que coincidan con «(.+)»\.$/, ['No libraries match "$1".', 'Nenhuma biblioteca coincide com «$1».']],
    [/^Tu sesión de estudio se ha cerrado: \+(\d+) (punto|puntos)\.$/, ['Your study session has ended: +$1 points.', 'A tua sessão de estudo terminou: +$1 pontos.']],
    [/^Usa al menos (\d+) caracteres\.$/, ['Use at least $1 characters.', 'Usa pelo menos $1 caracteres.']],
    [/^Usa como máximo (\d+) caracteres\.$/, ['Use at most $1 characters.', 'Usa no máximo $1 caracteres.']],
    [/^La contraseña debe tener entre (\d+) y (\d+) caracteres\.$/, ['The password must be between $1 and $2 characters.', 'A palavra-passe deve ter entre $1 e $2 caracteres.']],
    [/^Escribe tu nombre \(máximo (\d+) caracteres\)\.$/, ['Enter your name (up to $1 characters).', 'Escreve o teu nome (máximo $1 caracteres).']],
    [/^El grupo ya tiene el máximo de (\d+) personas\.$/, ['The group already has the maximum of $1 people.', 'O grupo já tem o máximo de $1 pessoas.']],
    [/^Revisa los datos: nombre de (\d+) a (\d+) caracteres y objetivo de (\d+) a (\d+) puntos\.$/, ['Check the data: name of $1 to $2 characters and goal of $3 to $4 points.', 'Revê os dados: nome de $1 a $2 caracteres e objetivo de $3 a $4 pontos.']],
    [/^Color (\d+)$/, ['Colour $1', 'Cor $1']],
    [/^(Peinado|Cejas|Ojos|Cabeza|Nariz|Boca|Orejas|Vello facial|Gafas|Gorros) (\d+)$/, ['$1 $2', '$1 $2']],
    [/^(.+) · StudySpot$/, ['$1 · StudySpot', '$1 · StudySpot']],
  ];

  function traducir(texto) {
    const limpio = texto.replace(/\s+/g, ' ').trim();
    if (!limpio) return null;
    if (Object.prototype.hasOwnProperty.call(T, limpio)) return T[limpio][COL];
    for (const [patron, destinos] of PATRONES) {
      const coincide = limpio.match(patron);
      if (coincide) {
        return destinos[COL].replace(/\$(\d)/g, (_, n) => {
          const parte = coincide[Number(n)] ?? '';
          return traducir(parte) ?? parte;
        });
      }
    }
    return null;
  }

  // Lo que ya hemos puesto nosotros: no se vuelve a traducir (evita bucles con el observador).
  const puestos = new WeakMap();

  function traducirNodoTexto(nodo) {
    const valor = nodo.nodeValue;
    if (puestos.get(nodo) === valor) return;
    const traducido = traducir(valor);
    if (traducido === null || traducido === valor.trim()) return;
    const nuevo = valor.match(/^\s*/)[0] + traducido + valor.match(/\s*$/)[0];
    puestos.set(nodo, nuevo);
    nodo.nodeValue = nuevo;
  }

  const ATRIBUTOS = ['placeholder', 'aria-label', 'title', 'alt'];

  function traducirAtributos(elemento) {
    for (const atributo of ATRIBUTOS) {
      const valor = elemento.getAttribute(atributo);
      if (!valor) continue;
      const traducido = traducir(valor);
      if (traducido !== null && traducido !== valor) elemento.setAttribute(atributo, traducido);
    }
  }

  const IGNORAR = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

  function recorrer(raiz) {
    if (raiz.nodeType === Node.TEXT_NODE) {
      traducirNodoTexto(raiz);
      return;
    }
    if (raiz.nodeType !== Node.ELEMENT_NODE || IGNORAR.has(raiz.tagName)) return;
    traducirAtributos(raiz);
    const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (nodo) => (nodo.nodeType === Node.ELEMENT_NODE && IGNORAR.has(nodo.tagName)
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let nodo = caminante.nextNode(); nodo; nodo = caminante.nextNode()) {
      if (nodo.nodeType === Node.TEXT_NODE) traducirNodoTexto(nodo);
      else traducirAtributos(nodo);
    }
  }

  function traducirTitulo() {
    const traducido = traducir(document.title);
    if (traducido !== null && traducido !== document.title) document.title = traducido;
  }

  recorrer(document.documentElement);
  traducirTitulo();
  new MutationObserver((cambios) => {
    for (const cambio of cambios) {
      if (cambio.type === 'childList') cambio.addedNodes.forEach(recorrer);
      else if (cambio.type === 'characterData') traducirNodoTexto(cambio.target);
      else if (cambio.type === 'attributes') traducirAtributos(cambio.target);
    }
    traducirTitulo();
  }).observe(document.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS,
  });
}());
