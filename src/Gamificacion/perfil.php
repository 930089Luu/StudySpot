<?php
/*
 * Perfil del estudiante con sus puntos totales (US04).
 * Los puntos totales no se guardan en ninguna columna: se calculan sumando los de
 * sus sesiones (modelo de datos del Sprint 1, sin datos redundantes).
 */
declare(strict_types=1);

require_once __DIR__ . '/puntuaciones.php';
require_once __DIR__ . '/../Usuarios/usuarios.php';
require_once __DIR__ . '/../Sesiones/estudio.php';

/** Nombre, correo y puntos totales del usuario, o null si no existe. */
function getPerfil(PDO $pdo, int $usuarioId): ?array
{
    $usuario = findUsuarioPorId($pdo, $usuarioId);
    if ($usuario === null) {
        return null;
    }
    // Antes de sumar se cierran las sesiones de más de 4 h: así sus 16 puntos ya cuentan,
    // aunque nadie haya consultado esa sesión desde que caducó.
    cerrarSesionesCaducadas($pdo);
    return [
        'nombre'         => $usuario['nombre'],
        'email'          => $usuario['email'],
        'puntos_totales' => sumPuntosUsuario($pdo, $usuarioId),
    ];
}
