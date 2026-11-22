<?php
/*
 * POST /api/logout.php — cierre de sesión (cuentas, US01)
 * Sin entrada. 200 siempre: si no había sesión, el resultado es el mismo (sesión cerrada).
 * As built: no estaba en el contrato del Sprint 1.
 * Es POST y no GET para que un enlace o una imagen de otra web no pueda cerrar tu sesión.
 *
 * Si el usuario tenía una sesión de estudio activa, se cierra antes (check-out automático)
 * y gana los puntos de ese rato. Así no queda abierta hasta caducar a las 4 h (K06, decisión
 * de Lucía del 20-11). Respuesta: {mensaje, sesion_estudio: {minutos, puntos} | null}.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Sesiones/estudio.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('POST');
    $sesionEstudio = cerrarSesionEstudioAlSalir(getUsuarioIdSesion());
    cerrarSesionUsuario();
    responderJson(HTTP_OK, ['mensaje' => 'Sesión cerrada.', 'sesion_estudio' => $sesionEstudio]);
});

/** Hace el check-out si el usuario tiene una sesión de estudio activa. Devuelve sus minutos y puntos, o null. */
function cerrarSesionEstudioAlSalir(?int $usuarioId): ?array
{
    if ($usuarioId === null) {
        return null;
    }
    $resultado = hacerCheckout(getConexion(), $usuarioId);
    if ($resultado['estado'] !== CHECKOUT_TERMINADA) {
        return null;
    }
    return ['minutos' => $resultado['minutos'], 'puntos' => $resultado['puntos']];
}
