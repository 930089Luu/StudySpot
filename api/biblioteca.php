<?php
/*
 * GET /api/biblioteca.php?id=N — US03
 * Detalle de una biblioteca: nombre, dirección, foto, horario de hoy, ocupación y fiabilidad.
 * 200 {id, nombre, latitud, longitud, ocupacion, fiabilidad, usuarios_activos, direccion, foto_url, horario_hoy,
 *       estado_apertura, es_favorita, favorita: {id, nombre} | null}
 * es_favorita y favorita (22-11): si esta es la favorita del usuario y cuál es la que tiene ahora
 * (para avisar de que dejará de serlo si marca esta).
 * 400 id no válido · 401 sin sesión · 404 no existe.
 * horario_hoy (US08): {cerrado, apertura, cierre, motivo}, o null si no hay horario.
 * estado_apertura (US08): abierta | abre_hoy | cerrada con la hora de Portugal; null sin horario.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Ocupacion/ocupacion.php';
require_once __DIR__ . '/../src/Usuarios/favorita.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('GET');
    $usuarioId = exigirSesion();

    $bibliotecaId = filter_var($_GET['id'] ?? '', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($bibliotecaId === false) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Biblioteca no válida.']);
    }
    $pdo = getConexion();
    $detalle = getDetalleBiblioteca($pdo, $bibliotecaId);
    if ($detalle === null) {
        responderJson(HTTP_NOT_FOUND, ['error' => 'Biblioteca no encontrada.']);
    }
    $favorita = findBibliotecaFavorita($pdo, $usuarioId);
    responderJson(HTTP_OK, $detalle + [
        'es_favorita' => $favorita !== null && $favorita['id'] === $bibliotecaId,
        'favorita' => $favorita,
    ]);
});
