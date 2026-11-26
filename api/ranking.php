<?php
/*
 * GET /api/ranking.php — US07
 * Ranking semanal entre el usuario y sus amigos, y progreso del objetivo compartido.
 * 200 {ranking: [{nombre, puntos, es_yo}], objetivo: {puntos, meta, porcentaje}} · 401 sin sesión
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Gamificacion/ranking.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('GET');
    $usuarioId = exigirSesion();
    responderJson(HTTP_OK, getRanking(getConexion(), $usuarioId));
});
