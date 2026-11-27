<?php
/*
 * Tests funcionales de US06: amigos, solicitudes y ubicación compartida.
 * Prueban las funciones de src/Amigos/amistad.php. Los endpoints solo traducen
 * esos resultados a códigos HTTP (400, 404, 409).
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';
require_once __DIR__ . '/../src/Usuarios/usuarios.php';
require_once __DIR__ . '/../src/Sesiones/estudio.php';
require_once __DIR__ . '/../src/Amigos/amistad.php';
require_once __DIR__ . '/../src/Amigos/perfil_contacto.php';

return function (PDO $pdo): array {
    $zona = crearZonaPrueba($pdo);

    return [
        ['T46', 'Enviar una solicitud a un usuario existente → queda pendiente en su bandeja',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                return insertSolicitudAmistad($pdo, $ana, $luis)
                    && count(findSolicitudesRecibidas($pdo, $luis)) === 1;
            }],
        ['T47', 'Auto-solicitud → no se guarda (la BD la rechaza con CHECK)',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                return insertSolicitudAmistad($pdo, $ana, $ana) === false
                    && count(findSolicitudesRecibidas($pdo, $ana)) === 0;
            }],
        ['T48', 'Solicitud a un correo sin cuenta → no hay usuario con ese correo',
            function () use ($pdo): bool {
                return findUsuarioPorEmail($pdo, crearEmailPrueba('unizar.es')) === null;
            }],
        ['T49', 'Solicitud repetida, en el mismo sentido o en el contrario → se detecta',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                insertSolicitudAmistad($pdo, $ana, $luis);
                return existeAmistadEntre($pdo, $luis, $ana)
                    && insertSolicitudAmistad($pdo, $ana, $luis) === false;
            }],
        ['T50', 'Aceptar una solicitud → son amigos los dos y deja de estar pendiente',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                insertSolicitudAmistad($pdo, $ana, $luis);
                actualizarEstadoAmistad($pdo, idSolicitudPendiente($pdo, $luis), AMISTAD_ACEPTADA);
                return count(findAmigos($pdo, $ana)) === 1
                    && count(findAmigos($pdo, $luis)) === 1
                    && count(findSolicitudesRecibidas($pdo, $luis)) === 0;
            }],
        ['T51', 'Rechazar una solicitud → no son amigos y deja de estar pendiente',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                insertSolicitudAmistad($pdo, $ana, $luis);
                actualizarEstadoAmistad($pdo, idSolicitudPendiente($pdo, $luis), AMISTAD_RECHAZADA);
                return count(findAmigos($pdo, $ana)) === 0
                    && count(findSolicitudesRecibidas($pdo, $luis)) === 0;
            }],
        ['T52', 'Solo el destinatario puede responder una solicitud',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                $pablo = crearUsuarioPruebaConId($pdo);
                insertSolicitudAmistad($pdo, $ana, $luis);
                $solicitud = idSolicitudPendiente($pdo, $luis);
                return findSolicitudRecibida($pdo, $solicitud, $pablo) === null
                    && findSolicitudRecibida($pdo, $solicitud, $luis) !== null;
            }],
        ['T53', 'El interruptor de compartir ubicación está desactivado por defecto',
            function () use ($pdo): bool {
                return getComparteUbicacion($pdo, crearUsuarioPruebaConId($pdo)) === false;
            }],
        ['T54', 'Amigo que comparte ubicación y está estudiando → se ve su biblioteca',
            function () use ($pdo, $zona): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_ACEPTADA);
                guardarComparteUbicacion($pdo, $luis, true);
                $estudia = hacerCheckinEnZonaPrueba($pdo, $luis, $zona);
                $amigos = findAmigos($pdo, $ana);
                return $estudia && count($amigos) === 1
                    && str_starts_with((string) $amigos[0]['biblioteca'], TEST_BIBLIOTECA_PREFIJO);
            }],
        ['T55', 'Amigo que estudia pero no comparte ubicación → aparece sin biblioteca',
            function () use ($pdo, $zona): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_ACEPTADA);
                $estudia = hacerCheckinEnZonaPrueba($pdo, $luis, $zona);
                $amigos = findAmigos($pdo, $ana);
                return $estudia && count($amigos) === 1 && $amigos[0]['biblioteca'] === null;
            }],
        ['T56', 'Solicitud pendiente o rechazada → esa persona no aparece como amiga',
            function () use ($pdo, $zona): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                $marta = crearUsuarioPruebaConId($pdo);
                guardarComparteUbicacion($pdo, $luis, true);
                guardarComparteUbicacion($pdo, $marta, true);
                $estudiaLuis = hacerCheckinEnZonaPrueba($pdo, $luis, $zona);
                $estudiaMarta = hacerCheckinEnZonaPrueba($pdo, $marta, $zona);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_PENDIENTE);
                crearAmistadEnBD($pdo, $ana, $marta, AMISTAD_RECHAZADA);
                return $estudiaLuis && $estudiaMarta && findAmigos($pdo, $ana) === [];
            }],
        ['T57', 'Sesión activa de más de 4 h → ya no se muestra como estudiando',
            function () use ($pdo, $zona): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_ACEPTADA);
                guardarComparteUbicacion($pdo, $luis, true);
                $estudia = hacerCheckinEnZonaPrueba($pdo, $luis, $zona);
                retrasarSesionActiva($pdo, $luis, DURACION_MAX_SESION_MINUTOS + 1);
                $amigos = findAmigos($pdo, $ana);
                return $estudia && count($amigos) === 1 && $amigos[0]['biblioteca'] === null;
            }],
        ['T58', 'El interruptor de compartir ubicación se guarda y se lee correctamente',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                guardarComparteUbicacion($pdo, $ana, true);
                $activado = getComparteUbicacion($pdo, $ana) === true;
                guardarComparteUbicacion($pdo, $ana, false);
                return $activado && getComparteUbicacion($pdo, $ana) === false;
            }],
        // T59–T62 son las pruebas manuales de la pantalla de amigos.
        ['T63', 'Solicitud rechazada → quien la envió puede volver a pedirla y queda pendiente (una sola fila)',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_RECHAZADA);
                return solicitarAmistad($pdo, $ana, $luis) === SOLICITUD_ENVIADA
                    && count(findSolicitudesRecibidas($pdo, $luis)) === 1
                    && contarFilasAmistad($pdo, $ana, $luis) === 1;
            }],
        ['T64', 'Solicitud rechazada → quien la rechazó también puede pedirla después (sentido contrario)',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_RECHAZADA);
                return solicitarAmistad($pdo, $luis, $ana) === SOLICITUD_ENVIADA
                    && count(findSolicitudesRecibidas($pdo, $ana)) === 1
                    && count(findSolicitudesRecibidas($pdo, $luis)) === 0;
            }],
        ['T65', 'Solicitud pendiente o amistad aceptada → una solicitud nueva es un duplicado (409)',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                $marta = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_PENDIENTE);
                crearAmistadEnBD($pdo, $ana, $marta, AMISTAD_ACEPTADA);
                return solicitarAmistad($pdo, $luis, $ana) === SOLICITUD_DUPLICADA
                    && solicitarAmistad($pdo, $ana, $marta) === SOLICITUD_DUPLICADA;
            }],
        ['T66', 'La BD no deja guardar B→A si ya existe A→B (envíos cruzados a la vez)',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                // insertSolicitudAmistad no consulta antes: solo la UNIQUE de la BD puede pararlo.
                return insertSolicitudAmistad($pdo, $ana, $luis)
                    && insertSolicitudAmistad($pdo, $luis, $ana) === false
                    && contarFilasAmistad($pdo, $ana, $luis) === 1;
            }],
        ['T67', 'Correo del amigo escrito con mayúsculas y espacios → se encuentra su cuenta',
            function () use ($pdo): bool {
                $correo = crearUsuarioPrueba($pdo);
                $escrito = '  ' . strtoupper($correo) . ' ';
                return findUsuarioPorEmail($pdo, normalizarEmail($escrito)) !== null;
            }],
        ['T68', 'Bloquear a un amigo → dejáis de ser amigos (los dos) y aparece en tus bloqueados',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_ACEPTADA);
                bloquearPersona($pdo, $ana, $luis);
                $bloqueados = findBloqueados($pdo, $ana);
                return findAmigos($pdo, $ana) === [] && findAmigos($pdo, $luis) === []
                    && count($bloqueados) === 1 && (int) $bloqueados[0]['usuario_id'] === $luis;
            }],
        ['T69', 'Bloquear a quien te ha enviado una solicitud → la solicitud desaparece',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                insertSolicitudAmistad($pdo, $luis, $ana);
                bloquearPersona($pdo, $ana, $luis);
                return findSolicitudesRecibidas($pdo, $ana) === [] && contarFilasAmistad($pdo, $ana, $luis) === 0;
            }],
        ['T70', 'Persona bloqueada envía una solicitud → no se guarda y no se le revela el bloqueo',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                bloquearPersona($pdo, $ana, $luis);
                // El endpoint responde a SOLICITUD_OCULTA con el mismo 404 que a un correo sin cuenta.
                return solicitarAmistad($pdo, $luis, $ana) === SOLICITUD_OCULTA
                    && findSolicitudesRecibidas($pdo, $ana) === [];
            }],
        ['T71', 'Quien bloquea no puede enviar solicitud a esa persona hasta desbloquearla',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                bloquearPersona($pdo, $ana, $luis);
                $antes = solicitarAmistad($pdo, $ana, $luis);
                desbloquearPersona($pdo, $ana, $luis);
                return $antes === SOLICITUD_A_BLOQUEADO
                    && solicitarAmistad($pdo, $ana, $luis) === SOLICITUD_ENVIADA;
            }],
        ['T72', 'Desbloquear → sale de bloqueados, pero no se recupera la amistad',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_ACEPTADA);
                bloquearPersona($pdo, $ana, $luis);
                desbloquearPersona($pdo, $ana, $luis);
                return findBloqueados($pdo, $ana) === [] && findAmigos($pdo, $ana) === [];
            }],
        ['T73', 'Perfil de un amigo → nombre, puntos y relación "amigo", pero nunca el correo',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_ACEPTADA);
                $perfil = getPerfilContacto($pdo, $ana, $luis);
                return $perfil !== null && $perfil['relacion'] === RELACION_AMIGO
                    && $perfil['puntos_totales'] === 0 && !array_key_exists('email', $perfil);
            }],
        ['T74', 'Solicitud pendiente → quien la recibe ve el perfil de quien la envía, pero no al revés',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                insertSolicitudAmistad($pdo, $luis, $ana);
                $perfil = getPerfilContacto($pdo, $ana, $luis);
                return $perfil !== null && $perfil['relacion'] === RELACION_SOLICITUD
                    && getPerfilContacto($pdo, $luis, $ana) === null;
            }],
        ['T75', 'Persona sin amistad ni solicitud, o solicitud rechazada → su perfil no se puede ver (404)',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                $marta = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $marta, $ana, AMISTAD_RECHAZADA);
                return getPerfilContacto($pdo, $ana, $luis) === null
                    && getPerfilContacto($pdo, $ana, $marta) === null;
            }],
        ['T76', 'Bloqueo → ni quien bloquea ni la persona bloqueada pueden ver el perfil del otro',
            function () use ($pdo): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_ACEPTADA);
                bloquearPersona($pdo, $ana, $luis);
                return getPerfilContacto($pdo, $luis, $ana) === null
                    && getPerfilContacto($pdo, $ana, $luis) === null;
            }],
        ['T144', 'Mapa de amigos: quien comparte y estudia trae el id de su biblioteca; quien no comparte → null',
            function () use ($pdo, $zona): bool {
                $ana = crearUsuarioPruebaConId($pdo);
                $luis = crearUsuarioPruebaConId($pdo);
                $marta = crearUsuarioPruebaConId($pdo);
                crearAmistadEnBD($pdo, $ana, $luis, AMISTAD_ACEPTADA);
                crearAmistadEnBD($pdo, $ana, $marta, AMISTAD_ACEPTADA);
                guardarComparteUbicacion($pdo, $luis, true);
                $estudian = hacerCheckinEnZonaPrueba($pdo, $luis, $zona) && hacerCheckinEnZonaPrueba($pdo, $marta, $zona);
                $porId = array_column(findAmigos($pdo, $ana), 'biblioteca_id', 'usuario_id');
                return $estudian && $porId[$luis] === $zona['biblioteca_id'] && $porId[$marta] === null;
            }],
    ];
};

/** Filas de la tabla amistad entre dos usuarios, en cualquier sentido. */
function contarFilasAmistad(PDO $pdo, int $usuarioA, int $usuarioB): int
{
    $consulta = $pdo->prepare(
        'SELECT COUNT(*) FROM amistad
         WHERE (solicitante_id = :a1 AND destinatario_id = :b1)
            OR (solicitante_id = :b2 AND destinatario_id = :a2)'
    );
    $consulta->execute(['a1' => $usuarioA, 'b1' => $usuarioB, 'b2' => $usuarioB, 'a2' => $usuarioA]);
    return (int) $consulta->fetchColumn();
}

/** Inserta una fila de amistad con un estado concreto, para preparar el escenario de un test. */
function crearAmistadEnBD(PDO $pdo, int $solicitanteId, int $destinatarioId, string $estado): void
{
    $consulta = $pdo->prepare(
        'INSERT INTO amistad (solicitante_id, destinatario_id, estado)
         VALUES (:solicitante, :destinatario, :estado)'
    );
    $consulta->execute([
        'solicitante'  => $solicitanteId,
        'destinatario' => $destinatarioId,
        'estado'       => $estado,
    ]);
}

/** Id de la primera solicitud pendiente que recibe el usuario, o null si no tiene ninguna. */
function idSolicitudPendiente(PDO $pdo, int $destinatarioId): ?int
{
    $solicitudes = findSolicitudesRecibidas($pdo, $destinatarioId);
    return $solicitudes === [] ? null : (int) $solicitudes[0]['id'];
}

/** Hace el check-in del usuario en la zona de prueba. Devuelve true si la sesión se crea. */
function hacerCheckinEnZonaPrueba(PDO $pdo, int $usuarioId, array $zona): bool
{
    $resultado = hacerCheckin($pdo, $usuarioId, $zona['id'], $zona['token'], $zona['latitud'], $zona['longitud']);
    return $resultado['estado'] === CHECKIN_CREADO;
}
