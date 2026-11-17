<?php
/*
 * Acceso a datos de sesion_estudio (US02). Solo SQL con sentencias preparadas.
 * Todas las horas salen de NOW() de MySQL, para no mezclar el reloj de PHP con el de la BD.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';

/**
 * Bloquea la fila del usuario hasta el final de la transacción.
 * Si llegan dos check-in del mismo usuario a la vez, el segundo espera aquí
 * y ya ve la sesión creada por el primero: así nunca hay dos sesiones activas.
 */
function bloquearUsuario(PDO $pdo, int $usuarioId): void
{
    $consulta = $pdo->prepare('SELECT id FROM usuario WHERE id = :id FOR UPDATE');
    $consulta->execute(['id' => $usuarioId]);
}

/** Sesión activa del usuario con los minutos transcurridos, o null. */
function findSesionActiva(PDO $pdo, int $usuarioId): ?array
{
    $consulta = $pdo->prepare(
        "SELECT s.id, DATE_FORMAT(s.hora_inicio, '%H:%i') AS hora_inicio,
                TIMESTAMPDIFF(SECOND, s.hora_inicio, NOW()) AS segundos,
                z.nombre AS zona, b.nombre AS biblioteca
         FROM sesion_estudio s
         JOIN zona z ON z.id = s.zona_id
         JOIN biblioteca b ON b.id = z.biblioteca_id
         WHERE s.usuario_id = :usuario_id AND s.estado = 'active'"
    );
    $consulta->execute(['usuario_id' => $usuarioId]);
    $sesion = $consulta->fetch();
    return $sesion === false ? null : $sesion;
}

function insertSesion(PDO $pdo, int $usuarioId, int $zonaId): void
{
    $consulta = $pdo->prepare('INSERT INTO sesion_estudio (usuario_id, zona_id) VALUES (:usuario_id, :zona_id)');
    $consulta->execute(['usuario_id' => $usuarioId, 'zona_id' => $zonaId]);
}

function updateSesionTerminada(PDO $pdo, int $sesionId, int $puntos): void
{
    $consulta = $pdo->prepare(
        "UPDATE sesion_estudio SET hora_fin = NOW(), estado = 'finished', puntos_otorgados = :puntos
         WHERE id = :id AND estado = 'active'"
    );
    $consulta->execute(['puntos' => $puntos, 'id' => $sesionId]);
}

/**
 * Marca como caducadas las sesiones activas de más de DURACION_MAX_SESION_MINUTOS.
 * La hora de fin es la de caducidad (inicio + 4 h), no la de ahora: solo cuentan 4 h.
 */
function updateSesionesCaducadas(PDO $pdo, int $puntos): void
{
    $consulta = $pdo->prepare(
        "UPDATE sesion_estudio
         SET estado = 'expired',
             hora_fin = hora_inicio + INTERVAL :minutos_fin MINUTE,
             puntos_otorgados = :puntos
         WHERE estado = 'active' AND hora_inicio <= NOW() - INTERVAL :minutos MINUTE"
    );
    $consulta->execute([
        'minutos_fin' => DURACION_MAX_SESION_MINUTOS,
        'puntos'      => $puntos,
        'minutos'     => DURACION_MAX_SESION_MINUTOS,
    ]);
}
