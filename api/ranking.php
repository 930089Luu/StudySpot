<?php
/*
 * GET /api/ranking.php?grupo=N — US07
 * Ranking semanal de un grupo (lunes a domingo) y progreso de su objetivo compartido.
 * 200 {grupo: {id, nombre, es_admin}, personas: [{nombre, iniciales, puntos, posicion, color (0–7), es_yo}],
 *      podio: [las 3 primeras personas con puntos], total, objetivo, porcentaje}
 * 400 grupo no válido · 401 sin sesión · 404 el grupo no existe o no estás dentro (no se distingue).
 * Nunca devuelve id, correo ni ubicación de nadie.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Gamificacion/ranking.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('GET');
    $usuarioId = exigirSesion();
    $grupoId = leerCampoEntero($_GET, 'grupo');
    if ($grupoId <= 0) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Grupo no válido.']);
    }
    $ranking = getRanking(getConexion(), $grupoId, $usuarioId);
    if ($ranking === null) {
        responderJson(HTTP_NOT_FOUND, ['error' => 'Grupo no encontrado.']);
    }
    responderJson(HTTP_OK, $ranking);
});
