<?php
/*
 * Bloqueos entre estudiantes (mejora de privacidad de US06).
 * Quien bloquea deja de recibir solicitudes de esa persona y deja de ser su amigo.
 * La persona bloqueada no se entera: la API le responde como a cualquier otra solicitud.
 * Solo SQL con sentencias preparadas.
 */
declare(strict_types=1);

require_once __DIR__ . '/../Database/conexion.php';
require_once __DIR__ . '/../Sesiones/estudio.php';

/**
 * Bloquea a un usuario. En la misma transacción borra la solicitud o la amistad que hubiera
 * entre los dos, en cualquier sentido. Bloquear dos veces no hace nada más.
 */
function bloquearPersona(PDO $pdo, int $bloqueadorId, int $bloqueadoId): void
{
    ejecutarEnTransaccion($pdo, function () use ($pdo, $bloqueadorId, $bloqueadoId): array {
        borrarAmistadEntre($pdo, $bloqueadorId, $bloqueadoId);
        $consulta = $pdo->prepare(
            'INSERT IGNORE INTO bloqueo (bloqueador_id, bloqueado_id) VALUES (:bloqueador, :bloqueado)'
        );
        $consulta->execute(['bloqueador' => $bloqueadorId, 'bloqueado' => $bloqueadoId]);
        return [];
    });
}

/** Quita el bloqueo. No recupera la amistad: hay que volver a enviar una solicitud. */
function desbloquearPersona(PDO $pdo, int $bloqueadorId, int $bloqueadoId): void
{
    $consulta = $pdo->prepare(
        'DELETE FROM bloqueo WHERE bloqueador_id = :bloqueador AND bloqueado_id = :bloqueado'
    );
    $consulta->execute(['bloqueador' => $bloqueadorId, 'bloqueado' => $bloqueadoId]);
}

/** Indica si $bloqueadorId tiene bloqueado a $bloqueadoId (solo en ese sentido). */
function isBloqueado(PDO $pdo, int $bloqueadorId, int $bloqueadoId): bool
{
    $consulta = $pdo->prepare(
        'SELECT 1 FROM bloqueo WHERE bloqueador_id = :bloqueador AND bloqueado_id = :bloqueado'
    );
    $consulta->execute(['bloqueador' => $bloqueadorId, 'bloqueado' => $bloqueadoId]);
    return $consulta->fetchColumn() !== false;
}

/** Personas que ha bloqueado el usuario, para poder desbloquearlas. */
function findBloqueados(PDO $pdo, int $usuarioId): array
{
    $consulta = $pdo->prepare(
        'SELECT u.id AS usuario_id, u.nombre, u.email
         FROM bloqueo b
         JOIN usuario u ON u.id = b.bloqueado_id
         WHERE b.bloqueador_id = :usuario
         ORDER BY u.nombre'
    );
    $consulta->execute(['usuario' => $usuarioId]);
    return $consulta->fetchAll(PDO::FETCH_ASSOC);
}

/** Borra la solicitud o la amistad entre dos usuarios, en cualquier sentido. */
function borrarAmistadEntre(PDO $pdo, int $usuarioA, int $usuarioB): void
{
    $consulta = $pdo->prepare(
        'DELETE FROM amistad
         WHERE (solicitante_id = :a1 AND destinatario_id = :b1)
            OR (solicitante_id = :b2 AND destinatario_id = :a2)'
    );
    $consulta->execute(['a1' => $usuarioA, 'b1' => $usuarioB, 'b2' => $usuarioB, 'a2' => $usuarioA]);
}
