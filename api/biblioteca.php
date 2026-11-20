<?php
/*
 * GET /api/biblioteca.php?id=N — US03
 * Detalle de una biblioteca: nombre, dirección, foto, horario de hoy, ocupación y fiabilidad.
 * 200 {id, nombre, latitud, longitud, ocupacion, fiabilidad, usuarios_activos, direccion, foto_url, horario_hoy}
 * 400 id no válido · 401 sin sesión · 404 no existe.
 * horario_hoy es null hasta US08 (horarios de las bibliotecas).
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Ocupacion/ocupacion.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('GET');
    exigirSesion();

    $bibliotecaId = filter_var($_GET['id'] ?? '', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($bibliotecaId === false) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Biblioteca no válida.']);
    }
    $detalle = getDetalleBiblioteca(getConexion(), $bibliotecaId);
    if ($detalle === null) {
        responderJson(HTTP_NOT_FOUND, ['error' => 'Biblioteca no encontrada.']);
    }
    responderJson(HTTP_OK, $detalle);
});
