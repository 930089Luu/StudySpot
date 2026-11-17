<?php
/*
 * POST /api/checkout.php — US02 / US04
 * Sin entrada: cierra la sesión activa del usuario con sesión iniciada.
 * 200 sesión cerrada con minutos y puntos · 401 sin sesión · 404 no hay sesión activa
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Sesiones/estudio.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('POST');
    $usuarioId = exigirSesion();

    $resultado = hacerCheckout(getConexion(), $usuarioId);
    if ($resultado['estado'] === CHECKOUT_SIN_SESION) {
        responderJson(HTTP_NOT_FOUND, [
            'error' => 'No tienes ninguna sesión activa. Las sesiones se cierran solas a las 4 horas.',
        ]);
    }
    responderJson(HTTP_OK, ['minutos' => $resultado['minutos'], 'puntos' => $resultado['puntos']]);
});
