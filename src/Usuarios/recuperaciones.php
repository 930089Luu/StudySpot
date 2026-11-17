<?php
/*
 * Acceso a datos de la tabla recuperacion_password (US09). Solo SQL con sentencias preparadas.
 * Las fechas se comparan siempre con NOW() de MySQL para no mezclar la hora de PHP y la de la BD.
 */
declare(strict_types=1);

function insertRecuperacion(PDO $pdo, int $usuarioId, string $tokenHash, int $minutosValidez): void
{
    $consulta = $pdo->prepare(
        'INSERT INTO recuperacion_password (usuario_id, token_hash, fecha_caducidad)
         VALUES (:usuario_id, :token_hash, NOW() + INTERVAL :minutos MINUTE)'
    );
    $consulta->execute([
        'usuario_id' => $usuarioId,
        'token_hash' => $tokenHash,
        'minutos'    => $minutosValidez,
    ]);
}

function haySolicitudReciente(PDO $pdo, int $usuarioId, int $segundos): bool
{
    $consulta = $pdo->prepare(
        'SELECT 1 FROM recuperacion_password
         WHERE usuario_id = :usuario_id AND fecha_creacion > NOW() - INTERVAL :segundos SECOND'
    );
    $consulta->execute(['usuario_id' => $usuarioId, 'segundos' => $segundos]);
    return $consulta->fetchColumn() !== false;
}

/**
 * Marca el token como usado si es válido (existe, sin usar y sin caducar) y devuelve su usuario_id;
 * si no es válido devuelve null. El UPDATE condicional es atómico: si llegan dos peticiones
 * con el mismo enlace a la vez, solo una consigue cambiar la fila.
 */
function consumirRecuperacion(PDO $pdo, string $tokenHash): ?int
{
    $marcar = $pdo->prepare(
        'UPDATE recuperacion_password SET usado = TRUE
         WHERE token_hash = :token_hash AND usado = FALSE AND fecha_caducidad > NOW()'
    );
    $marcar->execute(['token_hash' => $tokenHash]);
    if ($marcar->rowCount() !== 1) {
        return null;
    }

    $consulta = $pdo->prepare('SELECT usuario_id FROM recuperacion_password WHERE token_hash = :token_hash');
    $consulta->execute(['token_hash' => $tokenHash]);
    return (int) $consulta->fetchColumn();
}

/** Anula todos los enlaces pendientes del usuario (al pedir uno nuevo o al cambiar la contraseña). */
function anularRecuperaciones(PDO $pdo, int $usuarioId): void
{
    $consulta = $pdo->prepare(
        'UPDATE recuperacion_password SET usado = TRUE WHERE usuario_id = :usuario_id AND usado = FALSE'
    );
    $consulta->execute(['usuario_id' => $usuarioId]);
}
