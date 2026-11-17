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

/** Id del usuario con sesión iniciada, o null si no ha iniciado sesión. */
function getUsuarioIdSesion(): ?int
{
    iniciarSesionPhp();
    $id = $_SESSION['usuario_id'] ?? null;
    return is_int($id) ? $id : null;
}
