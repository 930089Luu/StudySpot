<?php
/*
 * POST /api/registro.php — US01
 * Entrada (JSON): nombre, email, password, password_repetida
 * 201 cuenta creada · 400 datos inválidos o correo no institucional · 409 correo ya registrado
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';

const CODIGO_POR_ESTADO_REGISTRO = [
    REGISTRO_CREADO    => HTTP_CREATED,
    REGISTRO_INVALIDO  => HTTP_BAD_REQUEST,
    REGISTRO_DUPLICADO => HTTP_CONFLICT,
];

ejecutarEndpoint(function (): void {
    exigirMetodo('POST');
    $datos = leerCuerpoJson();

    $resultado = registrarUsuario(
        getConexion(),
        leerCampoTexto($datos, 'nombre'),
        leerCampoTexto($datos, 'email'),
        leerCampoTexto($datos, 'password'),
        leerCampoTexto($datos, 'password_repetida')
    );

    $codigo = CODIGO_POR_ESTADO_REGISTRO[$resultado['estado']];
    if ($codigo === HTTP_CREATED) {
        responderJson($codigo, ['mensaje' => 'Cuenta creada.']);
    }
    responderJson($codigo, ['errores' => $resultado['errores']]);
});
