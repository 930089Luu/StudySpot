<?php
/*
 * POST /api/checkin.php — US02
 * Entrada (JSON): zona, token (los dos vienen en el QR), latitud, longitud
 * 201 sesión iniciada · 400 sin ubicación o QR inválido · 401 sin sesión
 * 403 a más de RADIO_CHECKIN_METROS o biblioteca cerrada ahora (US08) · 409 ya hay una sesión activa
 * La latitud y la longitud solo se usan para validar la distancia: no se guardan.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Sesiones/estudio.php';

const RESPUESTAS_CHECKIN = [
    CHECKIN_SIN_UBICACION    => [HTTP_BAD_REQUEST, 'No hemos podido obtener tu ubicación. Activa el permiso de ubicación e inténtalo de nuevo.'],
    CHECKIN_QR_INVALIDO      => [HTTP_BAD_REQUEST, 'Este código QR no es válido. Escanea el QR de tu zona de estudio.'],
    CHECKIN_FUERA_DEL_RADIO  => [HTTP_FORBIDDEN, 'Parece que estás demasiado lejos de la biblioteca.'],
    CHECKIN_BIBLIOTECA_CERRADA => [HTTP_FORBIDDEN, 'La biblioteca está cerrada ahora. Consulta su horario en el mapa.'],
    CHECKIN_SESION_YA_ACTIVA => [HTTP_CONFLICT, 'Ya tienes una sesión de estudio activa. Haz check-out antes de empezar otra.'],
];

ejecutarEndpoint(function (): void {
    exigirMetodo('POST');
    $usuarioId = exigirSesion();
    $datos = leerCuerpoJson();

    $resultado = hacerCheckin(
        getConexion(),
        $usuarioId,
        leerCampoEntero($datos, 'zona'),
        leerCampoTexto($datos, 'token'),
        leerCampoDecimal($datos, 'latitud'),
        leerCampoDecimal($datos, 'longitud')
    );

    if ($resultado['estado'] === CHECKIN_CREADO) {
        responderJson(HTTP_CREATED, ['sesion' => $resultado['sesion']]);
    }
    [$codigo, $mensaje] = RESPUESTAS_CHECKIN[$resultado['estado']];
    // La biblioteca solo viene si está demasiado lejos: la pantalla dice a cuál acercarse.
    responderJson($codigo, array_filter(['error' => $mensaje, 'biblioteca' => $resultado['biblioteca'] ?? null]));
});
