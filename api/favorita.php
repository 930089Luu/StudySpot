<?php
/*
 * POST /api/favorita.php — mejora de US03 (22-11), no estaba en el contrato del Sprint 1.
 * Marca la biblioteca favorita del usuario (sustituye a la anterior) o la quita.
 * JSON {biblioteca_id: N} o {biblioteca_id: null}.
 * 200 {favorita_id: N | null} · 400 valor no válido · 401 sin sesión · 404 biblioteca no existe · 405.
 * Para leerla no hace falta otro endpoint: ocupacion.php devuelve favorita_id y biblioteca.php, es_favorita.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Usuarios/favorita.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('POST');
    $usuarioId = exigirSesion();

    $datos = leerCuerpoJson();
    if (!array_key_exists('biblioteca_id', $datos)) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Falta la biblioteca.']);
    }
    $bibliotecaId = null;
    if ($datos['biblioteca_id'] !== null) {
        $bibliotecaId = filter_var($datos['biblioteca_id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($bibliotecaId === false) {
            responderJson(HTTP_BAD_REQUEST, ['error' => 'Biblioteca no válida.']);
        }
    }
    if (!guardarBibliotecaFavorita(getConexion(), $usuarioId, $bibliotecaId)) {
        responderJson(HTTP_NOT_FOUND, ['error' => 'Biblioteca no encontrada.']);
    }
    responderJson(HTTP_OK, ['favorita_id' => $bibliotecaId]);
});
