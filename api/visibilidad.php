<?php
/*
 * /api/visibilidad.php — US06
 * GET:  si el usuario comparte ahora su ubicación con sus amigos.
 * POST: cambia el interruptor (share = yes | no). Desactivado por defecto.
 * El GET no está en el contrato del Sprint 1: es la divergencia D13 (el interruptor muestra el estado real).
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Amigos/amistad.php';

const VISIBILIDAD_SI = 'yes';
const VISIBILIDAD_NO = 'no';

ejecutarEndpoint(function (): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($metodo !== 'GET' && $metodo !== 'POST') {
        header('Allow: GET, POST');
        responderJson(HTTP_METHOD_NOT_ALLOWED, ['error' => 'Método no permitido.']);
    }

    $usuarioId = exigirSesion();
    $pdo = getConexion();

    if ($metodo === 'GET') {
        $compartida = getComparteUbicacion($pdo, $usuarioId);
        responderJson(HTTP_OK, ['share' => $compartida ? VISIBILIDAD_SI : VISIBILIDAD_NO]);
    }

    $valor = leerCampoTexto(leerCuerpoJson(), 'share');
    if ($valor !== VISIBILIDAD_SI && $valor !== VISIBILIDAD_NO) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'El valor debe ser yes o no.']);
    }
    guardarComparteUbicacion($pdo, $usuarioId, $valor === VISIBILIDAD_SI);
    responderJson(HTTP_OK, ['share' => $valor]);
});
