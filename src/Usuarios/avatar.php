<?php
/*
 * Avatar de cada persona (27-11), como un Memoji pero con dibujos propios de StudySpot.
 * Solo se guardan las elecciones (qué pieza de cada parte), en JSON en usuario.avatar; el dibujo
 * lo hace el navegador (public/js/avatar.js). null = sin avatar: se ven las iniciales.
 * Las partes y cuántas opciones tiene cada una deben coincidir con AVATAR_PARTES de avatar.js.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/../Database/conexion.php';

// parte => número de opciones (0 … n-1)
const AVATAR_OPCIONES = [
    'fondo' => 7,
    'piel' => 8,
    'cabeza' => 3,
    'orejas' => 3,
    'peinado' => 10,
    'colorPelo' => 12,
    'cejas' => 5,
    'ojos' => 6,
    'colorOjos' => 5,
    'nariz' => 5,
    'boca' => 6,
    'vello' => 5,
    'gafas' => 5,
    'gorro' => 5,
];

/** Comprueba un avatar: exactamente esas partes, cada una con un número entero dentro de su rango. */
function isAvatarValido(mixed $avatar): bool
{
    // Las mismas partes, en cualquier orden, sin ninguna de más.
    if (!is_array($avatar) || count($avatar) !== count(AVATAR_OPCIONES)
        || array_diff_key(AVATAR_OPCIONES, $avatar) !== []) {
        return false;
    }
    foreach (AVATAR_OPCIONES as $parte => $total) {
        $valor = $avatar[$parte];
        if (!is_int($valor) || $valor < 0 || $valor >= $total) {
            return false;
        }
    }
    return true;
}

/** Guarda el avatar (o lo quita con null). false si no es válido. */
function guardarAvatar(PDO $pdo, int $usuarioId, ?array $avatar): bool
{
    if ($avatar !== null && !isAvatarValido($avatar)) {
        return false;
    }
    $consulta = $pdo->prepare('UPDATE usuario SET avatar = :avatar WHERE id = :id');
    // Se guarda siempre en el orden de AVATAR_OPCIONES.
    $ordenado = $avatar === null ? null : array_merge(array_map(fn (): int => 0, AVATAR_OPCIONES), $avatar);
    $consulta->execute(['avatar' => $ordenado === null ? null : json_encode($ordenado), 'id' => $usuarioId]);
    return true;
}

/** Lo guardado en la BD → array de elecciones, o null si no hay avatar (o el dato está roto). */
function leerAvatar(?string $guardado): ?array
{
    if ($guardado === null || $guardado === '') {
        return null;
    }
    $avatar = json_decode($guardado, true);
    return isAvatarValido($avatar) ? $avatar : null;
}
