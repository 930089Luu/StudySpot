<?php
/*
 * Amistades entre estudiantes (US06).
 * Estados de una fila de amistad: pending (esperando), accepted (amigos), rejected (rechazada).
 * Solo SQL con sentencias preparadas.
 */
declare(strict_types=1);

require_once __DIR__ . '/../Usuarios/avatar.php';
require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/../Database/conexion.php';
require_once __DIR__ . '/bloqueo.php';

const AMISTAD_PENDIENTE = 'pending';
const AMISTAD_ACEPTADA = 'accepted';
const AMISTAD_RECHAZADA = 'rejected';

// Resultado de solicitarAmistad
const SOLICITUD_ENVIADA = 'enviada';
const SOLICITUD_DUPLICADA = 'duplicada';
const SOLICITUD_A_BLOQUEADO = 'a_bloqueado';   // el solicitante tiene bloqueado al destinatario
const SOLICITUD_OCULTA = 'oculta';             // el destinatario tiene bloqueado al solicitante

/**
 * Envía una solicitud de amistad. Cada pareja tiene como mucho una fila en la tabla:
 * si la anterior se rechazó, se reutiliza como solicitud nueva (pendiente) en el sentido
 * de quien la envía ahora. Si está pendiente o aceptada, es un duplicado.
 * Si el destinatario ha bloqueado al solicitante no se guarda nada (SOLICITUD_OCULTA):
 * el endpoint responde como si esa cuenta no existiera (404) para no revelar el bloqueo.
 */
function solicitarAmistad(PDO $pdo, int $solicitanteId, int $destinatarioId): string
{
    if (isBloqueado($pdo, $solicitanteId, $destinatarioId)) {
        return SOLICITUD_A_BLOQUEADO;
    }
    if (isBloqueado($pdo, $destinatarioId, $solicitanteId)) {
        return SOLICITUD_OCULTA;
    }
    $estadoPrevio = findEstadoAmistadEntre($pdo, $solicitanteId, $destinatarioId);
    if ($estadoPrevio === AMISTAD_RECHAZADA) {
        reabrirSolicitudRechazada($pdo, $solicitanteId, $destinatarioId);
        return SOLICITUD_ENVIADA;
    }
    // Un envío simultáneo de la misma pareja lo para la UNIQUE de la BD (insert devuelve false).
    if ($estadoPrevio !== null || !insertSolicitudAmistad($pdo, $solicitanteId, $destinatarioId)) {
        return SOLICITUD_DUPLICADA;
    }
    return SOLICITUD_ENVIADA;
}

/** Indica si ya hay una solicitud o una amistad entre dos usuarios, en cualquier sentido. */
function existeAmistadEntre(PDO $pdo, int $usuarioA, int $usuarioB): bool
{
    return findEstadoAmistadEntre($pdo, $usuarioA, $usuarioB) !== null;
}

/** Estado de la relación entre dos usuarios (en cualquier sentido), o null si no hay ninguna. */
function findEstadoAmistadEntre(PDO $pdo, int $usuarioA, int $usuarioB): ?string
{
    $consulta = $pdo->prepare(
        'SELECT estado FROM amistad
         WHERE (solicitante_id = :a1 AND destinatario_id = :b1)
            OR (solicitante_id = :b2 AND destinatario_id = :a2)
         LIMIT 1'
    );
    $consulta->execute(['a1' => $usuarioA, 'b1' => $usuarioB, 'b2' => $usuarioB, 'a2' => $usuarioA]);
    $estado = $consulta->fetchColumn();
    return $estado === false ? null : $estado;
}

/** Convierte la solicitud rechazada de la pareja en una pendiente de solicitante a destinatario. */
function reabrirSolicitudRechazada(PDO $pdo, int $solicitanteId, int $destinatarioId): void
{
    $consulta = $pdo->prepare(
        'UPDATE amistad
         SET solicitante_id = :solicitante, destinatario_id = :destinatario,
             estado = :pendiente, fecha_solicitud = NOW()
         WHERE estado = :rechazada
           AND ((solicitante_id = :a1 AND destinatario_id = :b1)
             OR (solicitante_id = :b2 AND destinatario_id = :a2))'
    );
    $consulta->execute([
        'solicitante' => $solicitanteId,
        'destinatario' => $destinatarioId,
        'pendiente' => AMISTAD_PENDIENTE,
        'rechazada' => AMISTAD_RECHAZADA,
        'a1' => $solicitanteId,
        'b1' => $destinatarioId,
        'b2' => $destinatarioId,
        'a2' => $solicitanteId,
    ]);
}

/**
 * Crea una solicitud pendiente. Devuelve false si la pareja ya tiene una fila, en cualquier
 * sentido (la UNIQUE uq_amistad_pareja de la BD también para dos envíos a la vez).
 */
function insertSolicitudAmistad(PDO $pdo, int $solicitanteId, int $destinatarioId): bool
{
    $consulta = $pdo->prepare(
        'INSERT INTO amistad (solicitante_id, destinatario_id) VALUES (:solicitante, :destinatario)'
    );
    try {
        $consulta->execute(['solicitante' => $solicitanteId, 'destinatario' => $destinatarioId]);
    } catch (PDOException $error) {
        if ($error->getCode() === SQLSTATE_INTEGRITY_VIOLATION) {
            return false;
        }
        throw $error;
    }
    return true;
}

/** Solicitudes pendientes que ha recibido el usuario. */
function findSolicitudesRecibidas(PDO $pdo, int $usuarioId): array
{
    $consulta = $pdo->prepare(
        'SELECT a.id, u.id AS usuario_id, u.nombre, u.email
         FROM amistad a
         JOIN usuario u ON u.id = a.solicitante_id
         WHERE a.destinatario_id = :usuario AND a.estado = :estado
         ORDER BY a.fecha_solicitud'
    );
    $consulta->execute(['usuario' => $usuarioId, 'estado' => AMISTAD_PENDIENTE]);
    return $consulta->fetchAll(PDO::FETCH_ASSOC);
}

/** Solicitud pendiente dirigida a este usuario, o null si no existe o no es suya. */
function findSolicitudRecibida(PDO $pdo, int $solicitudId, int $usuarioId): ?array
{
    $consulta = $pdo->prepare(
        'SELECT id FROM amistad
         WHERE id = :id AND destinatario_id = :usuario AND estado = :estado'
    );
    $consulta->execute(['id' => $solicitudId, 'usuario' => $usuarioId, 'estado' => AMISTAD_PENDIENTE]);
    $fila = $consulta->fetch();
    return $fila === false ? null : $fila;
}

/** Cambia el estado de una solicitud a AMISTAD_ACEPTADA o a 'rejected'. */
function actualizarEstadoAmistad(PDO $pdo, int $solicitudId, string $estado): void
{
    $consulta = $pdo->prepare('UPDATE amistad SET estado = :estado WHERE id = :id');
    $consulta->execute(['estado' => $estado, 'id' => $solicitudId]);
}

/**
 * Amigos aceptados del usuario, con dónde estudian (nombre e id de la biblioteca: el id sirve
 * para ponerlos en su globo del mapa).
 * Privacidad (NF04): la biblioteca solo se muestra si el amigo ha activado compartir
 * ubicación. Una sesión activa de más de 4 h ya no cuenta como estudio.
 */
function findAmigos(PDO $pdo, int $usuarioId): array
{
    $consulta = $pdo->prepare(
        'SELECT u.id, u.nombre, u.avatar, u.comparte_ubicacion, b.nombre AS biblioteca, b.id AS biblioteca_id
         FROM amistad a
         JOIN usuario u
           ON u.id = CASE WHEN a.solicitante_id = :yo1 THEN a.destinatario_id ELSE a.solicitante_id END
         LEFT JOIN sesion_estudio s
           ON s.usuario_id = u.id
          AND s.estado = :activa
          AND s.hora_inicio > NOW() - INTERVAL :minutos MINUTE
         LEFT JOIN zona z ON z.id = s.zona_id
         LEFT JOIN biblioteca b ON b.id = z.biblioteca_id
         WHERE a.estado = :aceptada
           AND (a.solicitante_id = :yo2 OR a.destinatario_id = :yo3)
         ORDER BY u.nombre'
    );
    $consulta->execute([
        'yo1' => $usuarioId,
        'yo2' => $usuarioId,
        'yo3' => $usuarioId,
        'activa' => 'active',
        'aceptada' => AMISTAD_ACEPTADA,
        'minutos' => DURACION_MAX_SESION_MINUTOS,
    ]);

    $amigos = [];
    foreach ($consulta->fetchAll() as $fila) {
        $comparte = (int) $fila['comparte_ubicacion'] === 1 && $fila['biblioteca_id'] !== null;
        $amigos[] = [
            'usuario_id' => (int) $fila['id'],
            'nombre' => $fila['nombre'],
            'avatar' => leerAvatar($fila['avatar']),
            'biblioteca' => $comparte ? $fila['biblioteca'] : null,
            'biblioteca_id' => $comparte ? (int) $fila['biblioteca_id'] : null,
        ];
    }
    return $amigos;
}

/** Guarda si el usuario comparte su ubicación con sus amigos (desactivado por defecto). */
function guardarComparteUbicacion(PDO $pdo, int $usuarioId, bool $comparte): void
{
    $consulta = $pdo->prepare('UPDATE usuario SET comparte_ubicacion = :comparte WHERE id = :id');
    $consulta->execute(['comparte' => $comparte ? 1 : 0, 'id' => $usuarioId]);
}

/** Indica si el usuario comparte ahora su ubicación con sus amigos. */
function getComparteUbicacion(PDO $pdo, int $usuarioId): bool
{
    $consulta = $pdo->prepare('SELECT comparte_ubicacion FROM usuario WHERE id = :id');
    $consulta->execute(['id' => $usuarioId]);
    return (int) $consulta->fetchColumn() === 1;
}
