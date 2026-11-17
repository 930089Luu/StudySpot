<?php
/*
 * GET /api/perfil.php — US04
 * Perfil del usuario con sesión iniciada.
 * 200 {nombre, email, puntos_totales} · 401 sin sesión
 * As built: el contrato del Sprint 1 solo devolvía los puntos totales; se añaden nombre y
 * correo porque el wireframe 6 los muestra en la cabecera del perfil.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Gamificacion/perfil.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('GET');
    $usuarioId = exigirSesion();

    $perfil = getPerfil(getConexion(), $usuarioId);
    if ($perfil === null) {
        // La cuenta se ha borrado mientras la sesión PHP seguía abierta.
        responderJson(HTTP_UNAUTHORIZED, ['error' => 'Inicia sesión para continuar.']);
    }
    responderJson(HTTP_OK, $perfil);
});
