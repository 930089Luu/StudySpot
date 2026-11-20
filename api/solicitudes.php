<?php
/*
 * /api/solicitudes.php — US06
 * GET:  solicitudes pendientes que ha recibido el usuario.
 * POST: acepta o rechaza una solicitud (request_id, action = accept | reject).
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Amigos/amistad.php';

const ACCION_ACEPTAR = 'accept';
const ACCION_RECHAZAR = 'reject';

ejecutarEndpoint(function (): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($metodo !== 'GET' && $metodo !== 'POST') {
        header('Allow: GET, POST');
        responderJson(HTTP_METHOD_NOT_ALLOWED, ['error' => 'Método no permitido.']);
    }

    $usuarioId = exigirSesion();
    $pdo = getConexion();

    if ($metodo === 'GET') {
        responderJson(HTTP_OK, ['solicitudes' => findSolicitudesRecibidas($pdo, $usuarioId)]);
    }
    responderSolicitud($pdo, $usuarioId);
});

/** Acepta o rechaza una solicitud recibida por el usuario. Siempre responde y termina. */
function responderSolicitud(PDO $pdo, int $usuarioId): never
{
    $datos = leerCuerpoJson();
    $solicitudId = leerCampoEntero($datos, 'request_id');
    $accion = leerCampoTexto($datos, 'action');
    if ($solicitudId <= 0 || ($accion !== ACCION_ACEPTAR && $accion !== ACCION_RECHAZAR)) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Datos de la solicitud no válidos.']);
    }

    // Solo responde el destinatario. Para cualquier otro caso la respuesta es "no encontrada".
    if (findSolicitudRecibida($pdo, $solicitudId, $usuarioId) === null) {
        responderJson(HTTP_NOT_FOUND, ['error' => 'Solicitud no encontrada.']);
    }

    $aceptada = $accion === ACCION_ACEPTAR;
    actualizarEstadoAmistad($pdo, $solicitudId, $aceptada ? AMISTAD_ACEPTADA : AMISTAD_RECHAZADA);
    responderJson(HTTP_OK, ['mensaje' => $aceptada ? 'Solicitud aceptada.' : 'Solicitud rechazada.']);
}
