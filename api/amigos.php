<?php
/*
 * /api/amigos.php — US06
 * GET:  amigos aceptados y, si comparten ubicación, dónde estudian.
 * POST: envía una solicitud de amistad por correo (friend_email).
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Usuarios/usuarios.php';
require_once __DIR__ . '/../src/Usuarios/validacion.php';
require_once __DIR__ . '/../src/Amigos/amistad.php';

// Va antes de ejecutarEndpoint: una const de PHP no existe hasta que se ejecuta su línea.
// El mismo texto sirve para un correo sin cuenta y para alguien que te ha bloqueado.
const MENSAJE_USUARIO_NO_DISPONIBLE = 'Usuario no disponible. Comprueba que el correo es correcto.';

ejecutarEndpoint(function (): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($metodo !== 'GET' && $metodo !== 'POST') {
        header('Allow: GET, POST');
        responderJson(HTTP_METHOD_NOT_ALLOWED, ['error' => 'Método no permitido.']);
    }

    $usuarioId = exigirSesion();
    $pdo = getConexion();

    if ($metodo === 'GET') {
        responderJson(HTTP_OK, ['amigos' => findAmigos($pdo, $usuarioId)]);
    }
    enviarSolicitud($pdo, $usuarioId);
});

/** Envía una solicitud de amistad al correo indicado. Siempre responde y termina. */
function enviarSolicitud(PDO $pdo, int $usuarioId): never
{
    $datos = leerCuerpoJson();
    // Igual que en el registro y el login: los correos se guardan en minúsculas y sin espacios.
    $correo = normalizarEmail(leerCampoTexto($datos, 'friend_email'));
    if ($correo === '') {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Escribe el correo de tu amigo.']);
    }

    $destinatario = findUsuarioPorEmail($pdo, $correo);
    if ($destinatario === null) {
        responderJson(HTTP_NOT_FOUND, ['error' => MENSAJE_USUARIO_NO_DISPONIBLE]);
    }
    $destinatarioId = (int) $destinatario['id'];
    if ($destinatarioId === $usuarioId) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'No puedes enviarte una solicitud a ti mismo.']);
    }

    // Tras un rechazo se puede volver a pedir; si hay una pendiente o ya sois amigos, es un conflicto.
    $resultado = solicitarAmistad($pdo, $usuarioId, $destinatarioId);
    if ($resultado === SOLICITUD_OCULTA) {
        // Te han bloqueado: la misma respuesta que si la cuenta no existiera, para no revelarlo.
        responderJson(HTTP_NOT_FOUND, ['error' => MENSAJE_USUARIO_NO_DISPONIBLE]);
    }
    if ($resultado === SOLICITUD_A_BLOQUEADO) {
        responderJson(HTTP_CONFLICT, ['error' => 'Has bloqueado a esta persona. Desbloquéala para enviarle una solicitud.']);
    }
    if ($resultado === SOLICITUD_DUPLICADA) {
        responderJson(HTTP_CONFLICT, ['error' => 'Ya hay una solicitud o una amistad con esa persona.']);
    }
    responderJson(HTTP_CREATED, ['mensaje' => 'Solicitud enviada.']);
}
