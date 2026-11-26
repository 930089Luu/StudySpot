<?php
/*
 * GET /api/ocupacion.php — US03
 * Ocupación actual de todas las bibliotecas para el mapa.
 * 200 {bibliotecas: [{id, nombre, direccion, latitud, longitud, ocupacion (%), fiabilidad (low|medium|high),
 *       usuarios_activos, horario_hoy, estado_apertura}], favorita_id: N | null}
 * horario_hoy y estado_apertura (US08): como en api/biblioteca.php.
 * favorita_id (22-11): biblioteca favorita del usuario, para abrir el mapa en ella sin otra petición.
 * 401 sin sesión.
 * As built: el contrato del Sprint 1 admitía un parámetro biblioteca opcional; el detalle de una
 * biblioteca ya lo da api/biblioteca.php, así que aquí siempre se devuelven todas.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Ocupacion/ocupacion.php';
require_once __DIR__ . '/../src/Usuarios/favorita.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('GET');
    $usuarioId = exigirSesion();
    $pdo = getConexion();
    responderJson(HTTP_OK, [
        'bibliotecas' => getOcupacionBibliotecas($pdo),
        'favorita_id' => getBibliotecaFavorita($pdo, $usuarioId),
    ]);
});
