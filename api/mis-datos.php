<?php
/*
 * GET /api/mis-datos.php — descarga de todos tus datos en JSON (RGPD: acceso y portabilidad).
 * 200 archivo studyspot-mis-datos.json · 401 sin sesión. Las coordenadas nunca se guardan.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Usuarios/cuenta.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('GET');
    $usuarioId = exigirSesion();
    header('Content-Disposition: attachment; filename="studyspot-mis-datos.json"');
    responderJson(HTTP_OK, exportarDatos(getConexion(), $usuarioId));
});
