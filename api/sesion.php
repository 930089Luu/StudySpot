<?php
/*
 * GET /api/sesion.php — US02 (divergencia del contrato del Sprint 1, ver .readmeAI)
 * Devuelve la sesión de estudio activa del usuario, para que la pantalla de check-in
 * sepa al recargar si hay una abierta. Solo zona, biblioteca y hora de inicio:
 * nunca puntos, que solo existen al terminar la sesión.
 * 200 {sesion: {...}} o {sesion: null} · 401 sin sesión iniciada
 * (No confundir con src/Usuarios/sesion.php, que es la sesión PHP del login.)
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Sesiones/estudio.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('GET');
    $usuarioId = exigirSesion();
    responderJson(HTTP_OK, ['sesion' => getSesionActiva(getConexion(), $usuarioId)]);
});
