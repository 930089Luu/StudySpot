<?php
/*
 * Recuperación de contraseña por correo (US09).
 * Flujo: solicitarRecuperacion() crea un token y lo envía → el usuario abre el enlace →
 * restablecerPassword() comprueba el token y guarda la nueva contraseña.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/validacion.php';
require_once __DIR__ . '/usuarios.php';
require_once __DIR__ . '/recuperaciones.php';

const RESTABLECER_OK = 'ok';
const RESTABLECER_INVALIDO = 'invalido';
const RESTABLECER_TOKEN_INVALIDO = 'token_invalido';

function generarToken(): string
{
    return bin2hex(random_bytes(RECUPERACION_TOKEN_BYTES));
}

/*
 * SHA-256 y no password_hash(): el token ya es aleatorio de 256 bits (no se puede adivinar
 * por fuerza bruta) y hace falta buscarlo por igualdad en la BD, cosa que bcrypt no permite.
 */
function hashToken(string $token): string
{
    return hash('sha256', $token);
}

/**
 * Si el correo es de una cuenta, crea un enlace nuevo y llama a $enviarEnlace($usuario, $token).
 * No devuelve nada a propósito: la respuesta al cliente debe ser la misma exista o no la cuenta.
 */
function solicitarRecuperacion(PDO $pdo, string $email, callable $enviarEnlace): void
{
    $usuario = findUsuarioPorEmail($pdo, normalizarEmail($email));
    if ($usuario === null) {
        return;
    }
    $usuarioId = (int) $usuario['id'];
    if (haySolicitudReciente($pdo, $usuarioId, RECUPERACION_ESPERA_SEGUNDOS)) {
        return;
    }

    $token = generarToken();
    anularRecuperaciones($pdo, $usuarioId);
    insertRecuperacion($pdo, $usuarioId, hashToken($token), RECUPERACION_MINUTOS_VALIDEZ);
    $enviarEnlace($usuario, $token);
}

/**
 * Cambia la contraseña si el token es válido.
 * Devuelve ['estado' => RESTABLECER_*, 'errores' => [campo => mensaje]].
 */
function restablecerPassword(PDO $pdo, string $token, string $password, string $passwordRepetida): array
{
    $errores = validarPasswordNueva($password, $passwordRepetida);
    if ($errores !== []) {
        return ['estado' => RESTABLECER_INVALIDO, 'errores' => $errores];
    }

    $isCambiada = cambiarPasswordConToken($pdo, hashToken($token), $password);
    $estado = $isCambiada ? RESTABLECER_OK : RESTABLECER_TOKEN_INVALIDO;
    return ['estado' => $estado, 'errores' => []];
}

/**
 * En una sola transacción: consume el token, guarda el nuevo hash y anula los demás enlaces.
 * Devuelve false si el token no es válido (y no cambia nada).
 */
function cambiarPasswordConToken(PDO $pdo, string $tokenHash, string $password): bool
{
    $pdo->beginTransaction();
    try {
        $usuarioId = consumirRecuperacion($pdo, $tokenHash);
        if ($usuarioId === null) {
            $pdo->rollBack();
            return false;
        }
        updatePasswordHash($pdo, $usuarioId, password_hash($password, PASSWORD_DEFAULT));
        anularRecuperaciones($pdo, $usuarioId);
        $pdo->commit();
        return true;
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}
