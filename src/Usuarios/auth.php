<?php
/*
 * Registro y autenticación de usuarios (US01).
 */
declare(strict_types=1);

require_once __DIR__ . '/validacion.php';
require_once __DIR__ . '/usuarios.php';

const REGISTRO_CREADO = 'creado';
const REGISTRO_INVALIDO = 'invalido';
const REGISTRO_DUPLICADO = 'duplicado';

const ERROR_EMAIL_DUPLICADO = 'Ya existe una cuenta con este correo.';

/**
 * Registra un usuario nuevo.
 * Devuelve ['estado' => REGISTRO_*, 'errores' => [campo => mensaje]].
 */
function registrarUsuario(PDO $pdo, string $nombre, string $email, string $password, string $passwordRepetida): array
{
    $nombre = trim($nombre);
    $email = normalizarEmail($email);

    $errores = validarRegistro($nombre, $email, $password, $passwordRepetida);
    if ($errores !== []) {
        return crearResultadoRegistro(REGISTRO_INVALIDO, $errores);
    }
    if (existeEmail($pdo, $email)) {
        return crearResultadoRegistro(REGISTRO_DUPLICADO, ['email' => ERROR_EMAIL_DUPLICADO]);
    }

    $id = insertUsuario($pdo, $nombre, $email, password_hash($password, PASSWORD_DEFAULT));
    if ($id === null) {
        return crearResultadoRegistro(REGISTRO_DUPLICADO, ['email' => ERROR_EMAIL_DUPLICADO]);
    }
    return crearResultadoRegistro(REGISTRO_CREADO, []);
}

function crearResultadoRegistro(string $estado, array $errores): array
{
    return ['estado' => $estado, 'errores' => $errores];
}

/**
 * Comprueba correo y contraseña. Devuelve el usuario (sin hash) o null.
 */
function autenticarUsuario(PDO $pdo, string $email, string $password): ?array
{
    $usuario = findUsuarioPorEmail($pdo, normalizarEmail($email));

    // Si el correo no existe se verifica igualmente contra un hash ficticio,
    // para que el tiempo de respuesta no revele qué correos están registrados.
    $hash = $usuario['password_hash'] ?? getHashFicticio();
    $isPasswordCorrecta = password_verify($password, $hash);

    if ($usuario === null || !$isPasswordCorrecta) {
        return null;
    }
    unset($usuario['password_hash']);
    return $usuario;
}

function getHashFicticio(): string
{
    static $hash = null;
    $hash ??= password_hash('contraseña-ficticia', PASSWORD_DEFAULT);
    return $hash;
}
