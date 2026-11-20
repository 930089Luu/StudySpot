<?php
/*
 * /api/bloqueos.php — mejora de privacidad de US06 (no estaba en el contrato del Sprint 1).
 * GET:  personas que ha bloqueado el usuario.
 * POST: bloquea o desbloquea a una persona (user_id, action = block | unblock).
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Usuarios/usuarios.php';
require_once __DIR__ . '/../src/Amigos/bloqueo.php';

const ACCION_BLOQUEAR = 'block';
const ACCION_DESBLOQUEAR = 'unblock';

ejecutarEndpoint(function (): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($metodo !== 'GET' && $metodo !== 'POST') {
        header('Allow: GET, POST');
        responderJson(HTTP_METHOD_NOT_ALLOWED, ['error' => 'Método no permitido.']);
    }

    $usuarioId = exigirSesion();
    $pdo = getConexion();

    if ($metodo === 'GET') {
        responderJson(HTTP_OK, ['bloqueados' => findBloqueados($pdo, $usuarioId)]);
    }
    cambiarBloqueo($pdo, $usuarioId);
});

/** Bloquea o desbloquea a la persona indicada. Siempre responde y termina. */
function cambiarBloqueo(PDO $pdo, int $usuarioId): never
{
    $datos = leerCuerpoJson();
    $otroId = leerCampoEntero($datos, 'user_id');
    $accion = leerCampoTexto($datos, 'action');
    if ($otroId <= 0 || ($accion !== ACCION_BLOQUEAR && $accion !== ACCION_DESBLOQUEAR)) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Datos del bloqueo no válidos.']);
    }
    if ($otroId === $usuarioId) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'No puedes bloquearte a ti mismo.']);
    }
    if (findUsuarioPorId($pdo, $otroId) === null) {
        responderJson(HTTP_NOT_FOUND, ['error' => 'Usuario no encontrado.']);
    }

    if ($accion === ACCION_BLOQUEAR) {
        bloquearPersona($pdo, $usuarioId, $otroId);
        responderJson(HTTP_OK, ['mensaje' => 'Usuario bloqueado.']);
    }
    desbloquearPersona($pdo, $usuarioId, $otroId);
    responderJson(HTTP_OK, ['mensaje' => 'Usuario desbloqueado.']);
}
