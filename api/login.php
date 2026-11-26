<?php
/*
 * POST /api/login.php — US01
 * Entrada (JSON): email, password
 * 200 sesión iniciada · 400 faltan campos · 401 credenciales incorrectas
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';
require_once __DIR__ . '/../src/Usuarios/sesion.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('POST');
    $datos = leerCuerpoJson();
    $email = leerCampoTexto($datos, 'email');
    $password = leerCampoTexto($datos, 'password');

    if (trim($email) === '' || $password === '') {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Escribe tu correo y tu contraseña.']);
    }

    $usuario = autenticarUsuario(getConexion(), $email, $password);
    if ($usuario === null) {
        // Mismo mensaje para correo inexistente y contraseña errónea: no revela qué cuentas existen.
        responderJson(HTTP_UNAUTHORIZED, ['error' => 'Correo o contraseña incorrectos.']);
    }

    abrirSesionUsuario($usuario);
    // El idioma de la cuenta (Ajustes) se aplica en cualquier dispositivo nada más entrar.
    responderJson(HTTP_OK, ['usuario' => ['nombre' => $usuario['nombre'], 'idioma' => $usuario['idioma']]]);
});
