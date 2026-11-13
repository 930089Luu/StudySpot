<?php
/*
 * Validación de los datos de registro y login. Funciones puras: sin BD ni HTTP.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';

function normalizarEmail(string $email): string
{
    return strtolower(trim($email));
}

function isEmailValido(string $email): bool
{
    return strlen($email) <= EMAIL_MAX_LENGTH
        && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function getDominioEmail(string $email): string
{
    return substr($email, strrpos($email, '@') + 1);
}

/*
 * Se compara por igualdad exacta o por sufijo "." + dominio.
 * Un str_ends_with($dominio, 'unizar.es') a secas aceptaría "fakeunizar.es".
 */
function isDominioInstitucional(string $dominio): bool
{
    foreach (ALLOWED_EMAIL_DOMAINS as $permitido) {
        if ($dominio === $permitido || str_ends_with($dominio, '.' . $permitido)) {
            return true;
        }
    }
    return false;
}

function isNombreValido(string $nombre): bool
{
    $longitud = mb_strlen(trim($nombre));
    return $longitud > 0 && $longitud <= NOMBRE_MAX_LENGTH;
}

function isPasswordValida(string $password): bool
{
    $longitud = strlen($password);
    return $longitud >= PASSWORD_MIN_LENGTH && $longitud <= PASSWORD_MAX_LENGTH;
}

/** Devuelve el error del correo, o null si es válido e institucional. */
function validarEmailRegistro(string $email): ?string
{
    if (!isEmailValido($email)) {
        return 'Introduce un correo válido.';
    }
    if (!isDominioInstitucional(getDominioEmail($email))) {
        return 'Usa el correo de tu universidad.';
    }
    return null;
}

/**
 * Valida una contraseña nueva y su repetición (registro y restablecimiento).
 * Devuelve [campo => mensaje]; vacío si todo es correcto.
 */
function validarPasswordNueva(string $password, string $passwordRepetida): array
{
    $errores = [];
    if (!isPasswordValida($password)) {
        $errores['password'] = 'La contraseña debe tener entre ' . PASSWORD_MIN_LENGTH
            . ' y ' . PASSWORD_MAX_LENGTH . ' caracteres.';
    }
    if ($password !== $passwordRepetida) {
        $errores['password_repetida'] = 'Las contraseñas no coinciden.';
    }
    return $errores;
}

/**
 * Valida todos los campos del registro.
 * Devuelve [campo => mensaje]; vacío si todo es correcto.
 */
function validarRegistro(string $nombre, string $email, string $password, string $passwordRepetida): array
{
    $errores = [];
    if (!isNombreValido($nombre)) {
        $errores['nombre'] = 'Escribe tu nombre (máximo ' . NOMBRE_MAX_LENGTH . ' caracteres).';
    }
    $errorEmail = validarEmailRegistro($email);
    if ($errorEmail !== null) {
        $errores['email'] = $errorEmail;
    }
    return $errores + validarPasswordNueva($password, $passwordRepetida);
}
