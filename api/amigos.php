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
require_once __DIR__ . '/../src/Amigos/amistad.php';

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
    $correo = trim(leerCampoTexto($datos, 'friend_email'));
    if ($correo === '') {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Escribe el correo de tu amigo.']);
    }

    $destinatario = findUsuarioPorEmail($pdo, $correo);
    if ($destinatario === null) {
        responderJson(HTTP_NOT_FOUND, ['error' => 'No existe ninguna cuenta con ese correo.']);
    }
    $destinatarioId = (int) $destinatario['id'];
    if ($destinatarioId === $usuarioId) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'No puedes enviarte una solicitud a ti mismo.']);
    }

    // Hay conflicto si ya existe una relación en cualquier sentido o si otro envío se adelantó.
    $yaExiste = existeAmistadEntre($pdo, $usuarioId, $destinatarioId);
    if ($yaExiste || !insertSolicitudAmistad($pdo, $usuarioId, $destinatarioId)) {
        responderJson(HTTP_CONFLICT, ['error' => 'Ya hay una solicitud o una amistad con esa persona.']);
    }
    responderJson(HTTP_CREATED, ['mensaje' => 'Solicitud enviada.']);
}
