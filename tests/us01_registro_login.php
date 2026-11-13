<?php
/*
 * Tests funcionales de US01: registro con correo institucional e inicio de sesión.
 * Devuelve la lista de tests: [id, descripción, función que devuelve true si pasa].
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';

return function (PDO $pdo): array {
    $emailValido = crearEmailPrueba('unizar.es');
    $registrar = fn (string $email, string $password = TEST_PASSWORD, ?string $repetida = null): array =>
        registrarUsuario($pdo, 'Estudiante de prueba', $email, $password, $repetida ?? $password);

    return [
        ['T01', 'Registro válido con correo unizar.es → creado',
            fn () => $registrar($emailValido)['estado'] === REGISTRO_CREADO],
        ['T02', 'Registro con correo ya registrado → duplicado (409)',
            fn () => $registrar($emailValido)['estado'] === REGISTRO_DUPLICADO],
        ['T03', 'Registro con el mismo correo en mayúsculas → duplicado',
            fn () => $registrar(strtoupper($emailValido))['estado'] === REGISTRO_DUPLICADO],
        ['T04', 'Registro con dominio no permitido (gmail.com) → inválido',
            fn () => isset($registrar(crearEmailPrueba('gmail.com'))['errores']['email'])],
        ['T05', 'Registro con subdominio permitido (alumnos.upm.es) → creado',
            fn () => $registrar(crearEmailPrueba('alumnos.upm.es'))['estado'] === REGISTRO_CREADO],
        ['T06', 'Registro con dominio parecido (fakeunizar.es) → inválido',
            fn () => isset($registrar(crearEmailPrueba('fakeunizar.es'))['errores']['email'])],
        ['T07', 'Registro con contraseña de 7 caracteres → inválido',
            fn () => isset($registrar(crearEmailPrueba('unizar.es'), 'corta12')['errores']['password'])],
        ['T08', 'Registro con contraseñas que no coinciden → inválido',
            fn () => isset($registrar(crearEmailPrueba('unizar.es'), TEST_PASSWORD, 'otra-clave-123')['errores']['password_repetida'])],
        ['T09', 'La contraseña se guarda con hash, no en claro',
            fn () => esHashDe(findUsuarioPorEmail($pdo, $emailValido)['password_hash'], TEST_PASSWORD)],
        ['T10', 'Login correcto tras registrarse → devuelve el usuario sin hash',
            fn () => esUsuarioSinHash(autenticarUsuario($pdo, $emailValido, TEST_PASSWORD))],
        ['T11', 'Login con contraseña incorrecta → rechazado (401)',
            fn () => autenticarUsuario($pdo, $emailValido, 'contraseña-mal') === null],
        ['T12', 'Login con correo no registrado → rechazado (401)',
            fn () => autenticarUsuario($pdo, crearEmailPrueba('unizar.es'), TEST_PASSWORD) === null],
    ];
};

function esHashDe(string $hash, string $password): bool
{
    return $hash !== $password && password_verify($password, $hash);
}

function esUsuarioSinHash(?array $usuario): bool
{
    return $usuario !== null && !array_key_exists('password_hash', $usuario);
}
