<?php
/*
 * GET /api/franjas.php?biblioteca=N&dia=D — US05
 * Ocupación típica por hora de un día de la semana (D: 1 = lunes … 7 = domingo), con la ley de Little.
 * 200 {dia, hay_datos, franjas: [{hora, ocupacion}], hora_mas_llena, hora_mas_tranquila}
 * 400 biblioteca o día no válidos · 401 sin sesión · 404 la biblioteca no existe.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Ocupacion/franjas.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('GET');
    exigirSesion();

    $opciones = ['options' => ['min_range' => 1]];
    $bibliotecaId = filter_var($_GET['biblioteca'] ?? '', FILTER_VALIDATE_INT, $opciones);
    $dia = filter_var($_GET['dia'] ?? '', FILTER_VALIDATE_INT);
    if ($bibliotecaId === false) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Biblioteca no válida.']);
    }
    if ($dia === false || !isDiaSemanaValido($dia)) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'El día debe ser un número del 1 (lunes) al 7 (domingo).']);
    }
    $franjas = getFranjasTipicas(getConexion(), $bibliotecaId, $dia);
    if ($franjas === null) {
        responderJson(HTTP_NOT_FOUND, ['error' => 'Biblioteca no encontrada.']);
    }
    responderJson(HTTP_OK, $franjas);
});
