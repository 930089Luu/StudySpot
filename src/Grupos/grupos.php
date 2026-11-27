<?php
/*
 * Grupos del ranking semanal (US07, 26-11). Una persona puede estar en varios grupos y cada
 * grupo tiene su objetivo semanal. Reglas (decididas por Lucía):
 * - Solo se invita a amigos aceptados, y la invitación hay que aceptarla.
 * - El administrador cambia nombre y objetivo, invita, quita gente y nombra administradores.
 * - Siempre queda al menos un administrador: si el último se va, lo es quien lleva más tiempo;
 *   si no queda nadie, el grupo se borra.
 * Sin salida HTTP: devuelve estados GRUPO_* y el endpoint decide el código. Solo SQL preparado.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/../Database/conexion.php';
require_once __DIR__ . '/../Sesiones/estudio.php';
require_once __DIR__ . '/../Usuarios/avatar.php';
require_once __DIR__ . '/../Amigos/amistad.php';

const GRUPO_ROL_ADMIN = 'admin';
const GRUPO_ROL_MIEMBRO = 'member';
const GRUPO_INVITADO = 'invited';
const GRUPO_DENTRO = 'member';

const GRUPO_OK = 'ok';
const GRUPO_NO_EXISTE = 'no_existe';          // o no eres miembro: no se distingue (privacidad)
const GRUPO_NO_ADMIN = 'no_admin';
const GRUPO_NO_AMIGO = 'no_amigo';
const GRUPO_YA_ESTA = 'ya_esta';
const GRUPO_LLENO = 'lleno';
const GRUPO_ULTIMO_ADMIN = 'ultimo_admin';
const GRUPO_DATOS_NO_VALIDOS = 'datos_no_validos';

/* ---------- validación ---------- */

function isNombreGrupoValido(string $nombre): bool
{
    $nombre = trim($nombre);
    return $nombre !== '' && (int) preg_match_all('/./su', $nombre) <= GRUPO_NOMBRE_MAX_LENGTH;
}

function isObjetivoValido(int $objetivo): bool
{
    return $objetivo >= GRUPO_OBJETIVO_MIN && $objetivo <= GRUPO_OBJETIVO_MAX;
}

/* ---------- consultas ---------- */

/** Rol de la persona en el grupo si está dentro (no vale con estar invitada), o null. */
function getRolEnGrupo(PDO $pdo, int $grupoId, int $usuarioId): ?string
{
    $consulta = $pdo->prepare(
        'SELECT rol FROM grupo_miembro WHERE grupo_id = :grupo AND usuario_id = :usuario AND estado = :dentro'
    );
    $consulta->execute(['grupo' => $grupoId, 'usuario' => $usuarioId, 'dentro' => GRUPO_DENTRO]);
    $rol = $consulta->fetchColumn();
    return $rol === false ? null : $rol;
}

/** Grupos en los que estás dentro, con cuántas personas tienen y si eres administradora. */
function findGruposDe(PDO $pdo, int $usuarioId): array
{
    $consulta = $pdo->prepare(
        'SELECT g.id, g.nombre, g.objetivo_semanal, yo.rol,
                (SELECT COUNT(*) FROM grupo_miembro m WHERE m.grupo_id = g.id AND m.estado = :dentro_m) AS personas
         FROM grupo g
         JOIN grupo_miembro yo ON yo.grupo_id = g.id AND yo.usuario_id = :usuario AND yo.estado = :dentro
         ORDER BY g.nombre'
    );
    $consulta->execute(['usuario' => $usuarioId, 'dentro' => GRUPO_DENTRO, 'dentro_m' => GRUPO_DENTRO]);
    return array_map(static fn (array $fila): array => [
        'id' => (int) $fila['id'],
        'nombre' => $fila['nombre'],
        'objetivo' => (int) $fila['objetivo_semanal'],
        'personas' => (int) $fila['personas'],
        'es_admin' => $fila['rol'] === GRUPO_ROL_ADMIN,
    ], $consulta->fetchAll());
}

/** Invitaciones a grupos que tienes sin responder, con quién te invitó. */
function findInvitacionesDe(PDO $pdo, int $usuarioId): array
{
    $consulta = $pdo->prepare(
        'SELECT g.id, g.nombre, u.nombre AS invitado_por
         FROM grupo_miembro yo
         JOIN grupo g ON g.id = yo.grupo_id
         LEFT JOIN usuario u ON u.id = yo.invitado_por
         WHERE yo.usuario_id = :usuario AND yo.estado = :invitado
         ORDER BY yo.fecha DESC'
    );
    $consulta->execute(['usuario' => $usuarioId, 'invitado' => GRUPO_INVITADO]);
    return array_map(static fn (array $fila): array => [
        'grupo_id' => (int) $fila['id'],
        'nombre' => $fila['nombre'],
        'invitado_por' => $fila['invitado_por'],
    ], $consulta->fetchAll());
}

/**
 * Detalle del grupo para quien está dentro: nombre, objetivo, si eres admin y las personas
 * (dentro e invitadas). usuario_id hace falta para que el admin pueda quitar o nombrar admin.
 * null si no existe o no estás dentro.
 */
function getDetalleGrupo(PDO $pdo, int $grupoId, int $usuarioId): ?array
{
    $rol = getRolEnGrupo($pdo, $grupoId, $usuarioId);
    if ($rol === null) {
        return null;
    }
    $grupo = $pdo->prepare('SELECT nombre, objetivo_semanal FROM grupo WHERE id = :id');
    $grupo->execute(['id' => $grupoId]);
    $fila = $grupo->fetch();
    $miembros = $pdo->prepare(
        'SELECT u.id, u.nombre, u.avatar, m.rol, m.estado FROM grupo_miembro m JOIN usuario u ON u.id = m.usuario_id
         WHERE m.grupo_id = :grupo ORDER BY m.estado DESC, m.rol, u.nombre'
    );
    $miembros->execute(['grupo' => $grupoId]);
    return [
        'id' => $grupoId,
        'nombre' => $fila['nombre'],
        'objetivo' => (int) $fila['objetivo_semanal'],
        'es_admin' => $rol === GRUPO_ROL_ADMIN,
        'miembros' => array_map(static fn (array $m): array => [
            'usuario_id' => (int) $m['id'],
            'nombre' => $m['nombre'],
            'avatar' => leerAvatar($m['avatar']),
            'es_admin' => $m['rol'] === GRUPO_ROL_ADMIN,
            'invitado' => $m['estado'] === GRUPO_INVITADO,
            'es_yo' => (int) $m['id'] === $usuarioId,
        ], $miembros->fetchAll()),
    ];
}

function contarPersonasGrupo(PDO $pdo, int $grupoId): int
{
    $consulta = $pdo->prepare('SELECT COUNT(*) FROM grupo_miembro WHERE grupo_id = :grupo');
    $consulta->execute(['grupo' => $grupoId]);
    return (int) $consulta->fetchColumn();
}

/* ---------- acciones ---------- */

/** Crea el grupo con quien lo crea como administradora. Devuelve el id, o null si los datos no valen. */
function crearGrupo(PDO $pdo, int $usuarioId, string $nombre, int $objetivo = OBJETIVO_SEMANAL_PUNTOS): ?int
{
    if (!isNombreGrupoValido($nombre) || !isObjetivoValido($objetivo)) {
        return null;
    }
    return ejecutarEnTransaccion($pdo, function () use ($pdo, $usuarioId, $nombre, $objetivo): array {
        $grupo = $pdo->prepare('INSERT INTO grupo (nombre, objetivo_semanal) VALUES (:nombre, :objetivo)');
        $grupo->execute(['nombre' => trim($nombre), 'objetivo' => $objetivo]);
        $grupoId = (int) $pdo->lastInsertId();
        insertarPersonaGrupo($pdo, $grupoId, $usuarioId, GRUPO_ROL_ADMIN, GRUPO_DENTRO, null);
        return [$grupoId];
    })[0];
}

/** El admin invita a un amigo aceptado. La persona entra cuando acepta. */
function invitarAGrupo(PDO $pdo, int $grupoId, int $adminId, int $amigoId): string
{
    if (getRolEnGrupo($pdo, $grupoId, $adminId) === null) {
        return GRUPO_NO_EXISTE;
    }
    if (getRolEnGrupo($pdo, $grupoId, $adminId) !== GRUPO_ROL_ADMIN) {
        return GRUPO_NO_ADMIN;
    }
    if (findEstadoAmistadEntre($pdo, $adminId, $amigoId) !== AMISTAD_ACEPTADA) {
        return GRUPO_NO_AMIGO;
    }
    if (findEstadoEnGrupo($pdo, $grupoId, $amigoId) !== null) {
        return GRUPO_YA_ESTA;
    }
    if (contarPersonasGrupo($pdo, $grupoId) >= GRUPO_MAX_PERSONAS) {
        return GRUPO_LLENO;
    }
    insertarPersonaGrupo($pdo, $grupoId, $amigoId, GRUPO_ROL_MIEMBRO, GRUPO_INVITADO, $adminId);
    return GRUPO_OK;
}

/** Aceptar entra en el grupo; rechazar borra la invitación. false si no había invitación. */
function responderInvitacion(PDO $pdo, int $grupoId, int $usuarioId, bool $acepta): bool
{
    $sql = $acepta
        ? 'UPDATE grupo_miembro SET estado = :dentro, fecha = NOW()
           WHERE grupo_id = :grupo AND usuario_id = :usuario AND estado = :invitado'
        : 'DELETE FROM grupo_miembro WHERE grupo_id = :grupo AND usuario_id = :usuario AND estado = :invitado';
    $consulta = $pdo->prepare($sql);
    $parametros = ['grupo' => $grupoId, 'usuario' => $usuarioId, 'invitado' => GRUPO_INVITADO];
    $consulta->execute($acepta ? $parametros + ['dentro' => GRUPO_DENTRO] : $parametros);
    return $consulta->rowCount() === 1;
}

/** El admin cambia nombre y objetivo. */
function editarGrupo(PDO $pdo, int $grupoId, int $adminId, string $nombre, int $objetivo): string
{
    $error = comprobarAdmin($pdo, $grupoId, $adminId);
    if ($error !== null) {
        return $error;
    }
    if (!isNombreGrupoValido($nombre) || !isObjetivoValido($objetivo)) {
        return GRUPO_DATOS_NO_VALIDOS;
    }
    $consulta = $pdo->prepare('UPDATE grupo SET nombre = :nombre, objetivo_semanal = :objetivo WHERE id = :id');
    $consulta->execute(['nombre' => trim($nombre), 'objetivo' => $objetivo, 'id' => $grupoId]);
    return GRUPO_OK;
}

/** El admin quita a alguien (dentro o invitado). Para irte tú, salirDeGrupo. */
function quitarDeGrupo(PDO $pdo, int $grupoId, int $adminId, int $usuarioId): string
{
    $error = comprobarAdmin($pdo, $grupoId, $adminId);
    if ($error !== null) {
        return $error;
    }
    if ($usuarioId === $adminId || findEstadoEnGrupo($pdo, $grupoId, $usuarioId) === null) {
        return GRUPO_DATOS_NO_VALIDOS;
    }
    borrarPersonaGrupo($pdo, $grupoId, $usuarioId);
    return GRUPO_OK;
}

/** El admin nombra o quita administradores. Nunca deja el grupo sin ninguno. */
function cambiarRolGrupo(PDO $pdo, int $grupoId, int $adminId, int $usuarioId, bool $hacerAdmin): string
{
    $error = comprobarAdmin($pdo, $grupoId, $adminId);
    if ($error !== null) {
        return $error;
    }
    if (getRolEnGrupo($pdo, $grupoId, $usuarioId) === null) {
        return GRUPO_DATOS_NO_VALIDOS;
    }
    if (!$hacerAdmin && contarAdmins($pdo, $grupoId) === 1 && getRolEnGrupo($pdo, $grupoId, $usuarioId) === GRUPO_ROL_ADMIN) {
        return GRUPO_ULTIMO_ADMIN;
    }
    $consulta = $pdo->prepare('UPDATE grupo_miembro SET rol = :rol WHERE grupo_id = :grupo AND usuario_id = :usuario');
    $consulta->execute([
        'rol' => $hacerAdmin ? GRUPO_ROL_ADMIN : GRUPO_ROL_MIEMBRO, 'grupo' => $grupoId, 'usuario' => $usuarioId,
    ]);
    return GRUPO_OK;
}

/**
 * Salir del grupo. Si eras el último admin, pasa a serlo quien lleva más tiempo dentro; si no
 * queda nadie dentro, el grupo se borra (con sus invitaciones).
 */
function salirDeGrupo(PDO $pdo, int $grupoId, int $usuarioId): string
{
    if (getRolEnGrupo($pdo, $grupoId, $usuarioId) === null) {
        return GRUPO_NO_EXISTE;
    }
    return ejecutarEnTransaccion($pdo, function () use ($pdo, $grupoId, $usuarioId): array {
        borrarPersonaGrupo($pdo, $grupoId, $usuarioId);
        $siguiente = $pdo->prepare(
            'SELECT usuario_id FROM grupo_miembro WHERE grupo_id = :grupo AND estado = :dentro
             ORDER BY fecha, usuario_id LIMIT 1'
        );
        $siguiente->execute(['grupo' => $grupoId, 'dentro' => GRUPO_DENTRO]);
        $heredero = $siguiente->fetchColumn();
        if ($heredero === false) {
            $pdo->prepare('DELETE FROM grupo WHERE id = :id')->execute(['id' => $grupoId]);
        } elseif (contarAdmins($pdo, $grupoId) === 0) {
            $pdo->prepare('UPDATE grupo_miembro SET rol = :rol WHERE grupo_id = :grupo AND usuario_id = :usuario')
                ->execute(['rol' => GRUPO_ROL_ADMIN, 'grupo' => $grupoId, 'usuario' => (int) $heredero]);
        }
        return [GRUPO_OK];
    })[0];
}

/* ---------- auxiliares ---------- */

/** null si es admin del grupo; si no, el estado de error. */
function comprobarAdmin(PDO $pdo, int $grupoId, int $usuarioId): ?string
{
    $rol = getRolEnGrupo($pdo, $grupoId, $usuarioId);
    if ($rol === null) {
        return GRUPO_NO_EXISTE;
    }
    return $rol === GRUPO_ROL_ADMIN ? null : GRUPO_NO_ADMIN;
}

/** invited, member o null si no tiene nada que ver con el grupo. */
function findEstadoEnGrupo(PDO $pdo, int $grupoId, int $usuarioId): ?string
{
    $consulta = $pdo->prepare('SELECT estado FROM grupo_miembro WHERE grupo_id = :grupo AND usuario_id = :usuario');
    $consulta->execute(['grupo' => $grupoId, 'usuario' => $usuarioId]);
    $estado = $consulta->fetchColumn();
    return $estado === false ? null : $estado;
}

function contarAdmins(PDO $pdo, int $grupoId): int
{
    $consulta = $pdo->prepare(
        'SELECT COUNT(*) FROM grupo_miembro WHERE grupo_id = :grupo AND rol = :admin AND estado = :dentro'
    );
    $consulta->execute(['grupo' => $grupoId, 'admin' => GRUPO_ROL_ADMIN, 'dentro' => GRUPO_DENTRO]);
    return (int) $consulta->fetchColumn();
}

function insertarPersonaGrupo(PDO $pdo, int $grupoId, int $usuarioId, string $rol, string $estado, ?int $invitadoPor): void
{
    $consulta = $pdo->prepare(
        'INSERT INTO grupo_miembro (grupo_id, usuario_id, rol, estado, invitado_por)
         VALUES (:grupo, :usuario, :rol, :estado, :invitado_por)'
    );
    $consulta->execute([
        'grupo' => $grupoId, 'usuario' => $usuarioId, 'rol' => $rol, 'estado' => $estado, 'invitado_por' => $invitadoPor,
    ]);
}

function borrarPersonaGrupo(PDO $pdo, int $grupoId, int $usuarioId): void
{
    $consulta = $pdo->prepare('DELETE FROM grupo_miembro WHERE grupo_id = :grupo AND usuario_id = :usuario');
    $consulta->execute(['grupo' => $grupoId, 'usuario' => $usuarioId]);
}
