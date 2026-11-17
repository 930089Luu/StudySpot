<?php
/*
 * Tests funcionales de US04: puntos totales del estudiante (suma de los puntos de sus sesiones).
 * Las sesiones se crean con el check-in y el check-out reales y se "envejecen" con retrasarSesionActiva.
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';
require_once __DIR__ . '/../src/Gamificacion/perfil.php';

return function (PDO $pdo): array {
    $zona = crearZonaPrueba($pdo);
    $usuarioId = crearUsuarioPruebaConId($pdo);
    $otroUsuarioId = crearUsuarioPruebaConId($pdo);
    $puntos = fn (int $id): ?int => getPerfil($pdo, $id)['puntos_totales'] ?? null;

    return [
        ['T39', 'Estudiante sin sesiones → 0 puntos totales',
            fn () => $puntos($usuarioId) === 0],
        ['T40', 'Dos sesiones terminadas (30 min + 15 min) → 3 puntos totales',
            fn () => hacerSesionCompleta($pdo, $usuarioId, $zona, 30)
                && hacerSesionCompleta($pdo, $usuarioId, $zona, 15)
                && $puntos($usuarioId) === 3],
        ['T41', 'Una sesión activa (60 min) todavía no suma puntos',
            fn () => abrirSesionHace($pdo, $usuarioId, $zona, 60) && $puntos($usuarioId) === 3],
        ['T42', 'Sesión de más de 4 h aún sin cerrar → al ver el perfil suma sus 16 puntos (3 + 16 = 19)',
            fn () => retrasarYContar($pdo, $usuarioId, $puntos) === 19],
        ['T43', 'Los puntos de otro estudiante no se suman',
            fn () => hacerSesionCompleta($pdo, $otroUsuarioId, $zona, 30)
                && $puntos($otroUsuarioId) === 2 && $puntos($usuarioId) === 19],
        ['T44', 'El perfil trae nombre y correo, pero nunca el hash de la contraseña',
            fn () => isPerfilSinHash(getPerfil($pdo, $usuarioId))],
    ];
};

/** Check-in en la zona, simula que han pasado $minutos y hace el check-out. */
function hacerSesionCompleta(PDO $pdo, int $usuarioId, array $zona, int $minutos): bool
{
    abrirSesionHace($pdo, $usuarioId, $zona, $minutos);
    return hacerCheckout($pdo, $usuarioId)['estado'] === CHECKOUT_TERMINADA;
}

/** Check-in en la zona (en sus mismas coordenadas) y simula que empezó hace $minutos. */
function abrirSesionHace(PDO $pdo, int $usuarioId, array $zona, int $minutos): bool
{
    $resultado = hacerCheckin($pdo, $usuarioId, $zona['id'], $zona['token'], $zona['latitud'], $zona['longitud']);
    retrasarSesionActiva($pdo, $usuarioId, $minutos);
    return $resultado['estado'] === CHECKIN_CREADO;
}

/** Lleva la sesión activa a más de 4 h y lee los puntos totales (sin check-out). */
function retrasarYContar(PDO $pdo, int $usuarioId, callable $puntos): ?int
{
    retrasarSesionActiva($pdo, $usuarioId, DURACION_MAX_SESION_MINUTOS + 1);
    return $puntos($usuarioId);
}

function isPerfilSinHash(?array $perfil): bool
{
    return $perfil !== null && $perfil['nombre'] !== '' && str_contains($perfil['email'], '@')
        && !array_key_exists('password_hash', $perfil);
}
