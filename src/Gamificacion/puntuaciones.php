<?php
/*
 * Acceso a datos de los puntos (US04). Solo SQL con sentencias preparadas.
 */
declare(strict_types=1);

/**
 * Suma de los puntos de las sesiones terminadas o caducadas del usuario.
 * Las sesiones activas tienen puntos_otorgados = NULL y SUM las ignora;
 * COALESCE devuelve 0 si el usuario todavía no tiene ninguna sesión con puntos.
 */
function sumPuntosUsuario(PDO $pdo, int $usuarioId): int
{
    $consulta = $pdo->prepare(
        'SELECT COALESCE(SUM(puntos_otorgados), 0) FROM sesion_estudio WHERE usuario_id = :usuario_id'
    );
    $consulta->execute(['usuario_id' => $usuarioId]);
    return (int) $consulta->fetchColumn();
}
