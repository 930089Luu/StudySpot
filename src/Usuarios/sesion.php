<?php
/*
 * Sesión PHP del usuario (cookie de sesión).
 */
declare(strict_types=1);

function iniciarSesionPhp(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => isPeticionHttps(),
    ]);
    session_start();
}

function isPeticionHttps(): bool
{
    return ($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off';
}

/** Guarda en la sesión al usuario autenticado. */
function abrirSesionUsuario(array $usuario): void
{
    iniciarSesionPhp();
    // Nuevo identificador de sesión al autenticarse: evita la fijación de sesión.
    session_regenerate_id(true);
    $_SESSION['usuario_id'] = (int) $usuario['id'];
    $_SESSION['rol'] = $usuario['rol'];
}

/**
 * Cierra la sesión del usuario: vacía sus datos, borra la sesión del servidor
 * y caduca la cookie en el navegador. Si no había sesión no pasa nada.
 */
function cerrarSesionUsuario(): void
{
    iniciarSesionPhp();
    $_SESSION = [];
    borrarCookieSesion();
    session_destroy();
}

/** Manda la cookie de sesión con fecha pasada para que el navegador la borre. */
function borrarCookieSesion(): void
{
    if (headers_sent()) {
        return;
    }
    $parametros = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires'  => 1,
        'path'     => $parametros['path'],
        'domain'   => $parametros['domain'],
        'secure'   => $parametros['secure'],
        'httponly' => $parametros['httponly'],
        'samesite' => $parametros['samesite'],
    ]);
}

/** Id del usuario con sesión iniciada, o null si no ha iniciado sesión. */
function getUsuarioIdSesion(): ?int
{
    iniciarSesionPhp();
    $id = $_SESSION['usuario_id'] ?? null;
    return is_int($id) ? $id : null;
}
