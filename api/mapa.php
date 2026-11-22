<?php
/*
 * GET /api/mapa.php — US03 (no estaba en el contrato del Sprint 1)
 * Token público de Mapbox para pintar el mapa. 200 {token} · 401 sin sesión · 500 sin configurar.
 * El token vive solo en config.php (fuera de git). Es un token público (pk.): Mapbox lo pensó
 * para usarse en el navegador; conviene limitarlo a las URL de la app desde la cuenta de Mapbox.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('GET');
    exigirSesion();
    $token = getConfig('mapbox_token');
    if ($token === '') {
        responderJson(HTTP_INTERNAL_ERROR, ['error' => 'El mapa no está configurado.']);
    }
    responderJson(HTTP_OK, ['token' => $token]);
});
