<?php
/*
 * Perfil de otra persona (mejora de US06): se abre desde la lista de amigos o desde una
 * solicitud recibida, y desde ahí se puede bloquear. No hay buscador de usuarios.
 * Privacidad: solo se ve el nombre y los puntos totales, nunca el correo ni dónde estudia.
 */
declare(strict_types=1);

require_once __DIR__ . '/../Usuarios/avatar.php';
require_once __DIR__ . '/../Database/conexion.php';
require_once __DIR__ . '/../Usuarios/usuarios.php';
require_once __DIR__ . '/../Gamificacion/puntuaciones.php';
require_once __DIR__ . '/amistad.php';
require_once __DIR__ . '/bloqueo.php';

const RELACION_AMIGO = 'friend';
const RELACION_SOLICITUD = 'request';   // esa persona te ha enviado una solicitud pendiente

/**
 * Perfil de $otroId visto por $usuarioId, o null si no puede verlo: solo amigos y quien
 * le ha enviado una solicitud pendiente. Si esa persona le ha bloqueado, también null,
 * así el endpoint responde 404 igual que para alguien que no existe.
 */
function getPerfilContacto(PDO $pdo, int $usuarioId, int $otroId): ?array
{
    if ($otroId === $usuarioId || isBloqueado($pdo, $otroId, $usuarioId)) {
        return null;
    }
    $relacion = findRelacionVisible($pdo, $usuarioId, $otroId);
    $otro = $relacion === null ? null : findUsuarioPorId($pdo, $otroId);
    if ($otro === null) {
        return null;
    }
    // Suma de las sesiones ya cerradas: la caducidad de una sesión de más de 4 h la aplica
    // el perfil propio o el check-in de esa persona, no quien mira su perfil.
    return [
        'usuario_id' => $otroId,
        'nombre' => $otro['nombre'],
        'avatar' => leerAvatar($otro['avatar']),
        'puntos_totales' => sumPuntosUsuario($pdo, $otroId),
        'relacion' => $relacion,
    ];
}

/** RELACION_AMIGO, RELACION_SOLICITUD o null si $usuarioId no puede ver el perfil de $otroId. */
function findRelacionVisible(PDO $pdo, int $usuarioId, int $otroId): ?string
{
    $consulta = $pdo->prepare(
        'SELECT estado, destinatario_id FROM amistad
         WHERE (solicitante_id = :a1 AND destinatario_id = :b1)
            OR (solicitante_id = :b2 AND destinatario_id = :a2)'
    );
    $consulta->execute(['a1' => $usuarioId, 'b1' => $otroId, 'b2' => $otroId, 'a2' => $usuarioId]);
    $fila = $consulta->fetch(PDO::FETCH_ASSOC);
    if ($fila === false) {
        return null;
    }
    if ($fila['estado'] === AMISTAD_ACEPTADA) {
        return RELACION_AMIGO;
    }
    $meLaHanEnviado = $fila['estado'] === AMISTAD_PENDIENTE && (int) $fila['destinatario_id'] === $usuarioId;
    return $meLaHanEnviado ? RELACION_SOLICITUD : null;
}
