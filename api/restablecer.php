<?php
/*
 * POST /api/restablecer.php — US09
 * Entrada (JSON): token, password, password_repetida
 * 200 contraseña cambiada · 400 contraseña inválida ({errores}) o enlace inválido/caducado/usado ({error})
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Usuarios/recuperacion.php';

const ERROR_ENLACE_INVALIDO = 'El enlace no es válido o ha caducado. Pide uno nuevo.';

ejecutarEndpoint(function (): void {
    exigirMetodo('POST');
    $datos = leerCuerpoJson();

    $resultado = restablecerPassword(
        getConexion(),
        leerCampoTexto($datos, 'token'),
        leerCampoTexto($datos, 'password'),
        leerCampoTexto($datos, 'password_repetida')
    );

    if ($resultado['estado'] === RESTABLECER_OK) {
        responderJson(HTTP_OK, ['mensaje' => 'Contraseña cambiada.']);
    }
    if ($resultado['estado'] === RESTABLECER_TOKEN_INVALIDO) {
        responderJson(HTTP_BAD_REQUEST, ['error' => ERROR_ENLACE_INVALIDO]);
    }
    responderJson(HTTP_BAD_REQUEST, ['errores' => $resultado['errores']]);
});
