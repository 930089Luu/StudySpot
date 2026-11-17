<?php
/*
 * Tests funcionales de US09: recuperación de contraseña por correo.
 * No se envía ningún correo: un "enviador" falso guarda el token que se habría mandado.
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';
require_once __DIR__ . '/../src/Usuarios/recuperacion.php';
require_once __DIR__ . '/../src/Correo/plantilla.php';

const TEST_PASSWORD_NUEVA = 'otra-clave-segura-456';

return function (PDO $pdo): array {
    $enviados = [];
    $enviador = function (array $usuario, string $token) use (&$enviados): void {
        $enviados[$usuario['email']][] = $token;
    };
    $pedir = fn (string $email) => solicitarRecuperacion($pdo, $email, $enviador);
    // Función normal (no flecha) para leer $enviados por referencia: una flecha lo copiaría vacío.
    $ultimoToken = function (string $email) use (&$enviados): string {
        $tokens = $enviados[$email] ?? [];
        return $tokens === [] ? '' : $tokens[array_key_last($tokens)];
    };
    $restablecer = fn (string $token, string $password = TEST_PASSWORD_NUEVA): array =>
        restablecerPassword($pdo, $token, $password, $password);

    $emailA = crearUsuarioPrueba($pdo);   // flujo completo
    $emailB = crearUsuarioPrueba($pdo);   // enlace caducado
    $emailC = crearUsuarioPrueba($pdo);   // contraseña nueva inválida

    return [
        ['T13', 'Pedir recuperación con correo registrado → se envía un enlace', function () use ($pedir, $emailA, &$enviados) {
            $pedir($emailA);
            return count($enviados[$emailA] ?? []) === 1;
        }],
        ['T14', 'Pedir recuperación con correo no registrado → no se envía nada ni da error', function () use ($pedir, &$enviados) {
            $email = crearEmailPrueba('unizar.es');
            $pedir($email);
            return !isset($enviados[$email]);
        }],
        ['T15', 'En la BD solo se guarda el hash del token, nunca el token', fn () =>
            !existeTokenEnClaro($pdo, $ultimoToken($emailA))
            && contarRecuperaciones($pdo, $emailA) === 1],
        ['T16', 'Segunda petición antes de 60 s → no se envía otro correo', function () use ($pedir, $emailA, &$enviados) {
            $pedir($emailA);
            return count($enviados[$emailA]) === 1;
        }],
        ['T17', 'Restablecer con enlace válido → contraseña cambiada; la nueva entra y la antigua no', fn () =>
            $restablecer($ultimoToken($emailA))['estado'] === RESTABLECER_OK
            && autenticarUsuario($pdo, $emailA, TEST_PASSWORD_NUEVA) !== null
            && autenticarUsuario($pdo, $emailA, TEST_PASSWORD) === null],
        ['T18', 'Reutilizar un enlace ya usado → rechazado', fn () =>
            $restablecer($ultimoToken($emailA))['estado'] === RESTABLECER_TOKEN_INVALIDO],
        ['T19', 'Enlace inventado → rechazado', fn () =>
            $restablecer(generarToken())['estado'] === RESTABLECER_TOKEN_INVALIDO],
        ['T20', 'Enlace caducado → rechazado y la contraseña no cambia', function () use ($pedir, $restablecer, $ultimoToken, $pdo, $emailB) {
            $pedir($emailB);
            caducarRecuperaciones($pdo, $emailB);
            return $restablecer($ultimoToken($emailB))['estado'] === RESTABLECER_TOKEN_INVALIDO
                && autenticarUsuario($pdo, $emailB, TEST_PASSWORD) !== null;
        }],
        ['T21', 'Contraseña nueva de 7 caracteres → error en el campo y el enlace sigue sirviendo', function () use ($pedir, $restablecer, $ultimoToken, $emailC) {
            $pedir($emailC);
            $token = $ultimoToken($emailC);
            return isset($restablecer($token, 'corta12')['errores']['password'])
                && $restablecer($token)['estado'] === RESTABLECER_OK;
        }],
        ['T22', 'La plantilla del correo escapa el nombre e incluye el enlace', function () {
            $html = renderPlantillaHtml('recuperar_password.html', [
                'nombre' => '<b>Ana</b>', 'enlace' => 'http://x/?token=abc', 'minutos' => '60', 'logo_cid' => 'logo',
            ]);
            return str_contains($html, '&lt;b&gt;Ana&lt;/b&gt;')
                && !str_contains($html, '<b>Ana</b>')
                && str_contains($html, 'http://x/?token=abc')
                && !str_contains($html, '{{');
        }],
    ];
};
