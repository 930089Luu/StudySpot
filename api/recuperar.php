<?php
/*
 * POST /api/recuperar.php — US09
 * Entrada (JSON): email
 * 200 siempre que el correo tenga formato válido (exista o no la cuenta) · 400 formato inválido
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Usuarios/recuperacion.php';
require_once __DIR__ . '/../src/Correo/correo.php';

const MENSAJE_RECUPERACION = 'Si hay una cuenta con ese correo, te hemos enviado un enlace para crear una nueva contraseña.';

ejecutarEndpoint(function (): void {
    exigirMetodo('POST');
    $email = leerCampoTexto(leerCuerpoJson(), 'email');

    if (!isEmailValido(normalizarEmail($email))) {
        responderJson(HTTP_BAD_REQUEST, ['errores' => ['email' => 'Introduce un correo válido.']]);
    }

    // Un fallo de envío solo se registra en el log: si devolviera un error, el cliente
    // sabría que el correo pertenece a una cuenta (solo a esas se les envía).
    $enviarEnlace = function (array $usuario, string $token): void {
        try {
            enviarCorreoRecuperacion($usuario, $token);
        } catch (Throwable $error) {
            error_log('[StudySpot] No se pudo enviar el correo de recuperación: ' . $error->getMessage());
        }
    };

    solicitarRecuperacion(getConexion(), $email, $enviarEnlace);
    responderJson(HTTP_OK, ['mensaje' => MENSAJE_RECUPERACION]);
});
