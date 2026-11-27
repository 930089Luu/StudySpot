<?php
/*
 * Ajustes de la cuenta (26-11): nombre, contraseña, idioma, descargar tus datos y eliminar la
 * cuenta (derechos de acceso, portabilidad y supresión del RGPD), y la confirmación de la
 * contraseña para entrar en la administración. Solo SQL con sentencias preparadas.
 * La contraseña nunca se devuelve ni se guarda en claro: solo su hash (password_hash).
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/../Database/conexion.php';
require_once __DIR__ . '/sesion.php';
require_once __DIR__ . '/usuarios.php';
require_once __DIR__ . '/validacion.php';
require_once __DIR__ . '/avatar.php';
require_once __DIR__ . '/../Grupos/grupos.php';

const CUENTA_OK = 'ok';
const CUENTA_PASSWORD_INCORRECTA = 'password_incorrecta';
const CUENTA_DATOS_NO_VALIDOS = 'datos_no_validos';
const CUENTA_NO_ADMIN = 'no_admin';
const ROL_ADMINISTRADOR = 'admin';
// Clave de la sesión PHP: la persona admin ha confirmado su contraseña en esta sesión.
// Sin límite de tiempo (decisión de Lucía): dura hasta cerrar sesión.
const SESION_ADMIN_CONFIRMADO = 'admin_confirmado';

/** Datos que enseña Ajustes. Nunca el hash. */
function getCuenta(PDO $pdo, int $usuarioId): ?array
{
    $consulta = $pdo->prepare('SELECT nombre, email, rol, idioma, avatar FROM usuario WHERE id = :id');
    $consulta->execute(['id' => $usuarioId]);
    $fila = $consulta->fetch();
    if ($fila === false) {
        return null;
    }
    return [
        'nombre' => $fila['nombre'],
        'email' => $fila['email'],
        'idioma' => $fila['idioma'],
        'avatar' => leerAvatar($fila['avatar']),
        'es_admin' => $fila['rol'] === ROL_ADMINISTRADOR,
        'admin_confirmado' => isAccesoAdminConfirmado(),
    ];
}

function cambiarNombre(PDO $pdo, int $usuarioId, string $nombre): string
{
    if (!isNombreValido($nombre)) {
        return CUENTA_DATOS_NO_VALIDOS;
    }
    $consulta = $pdo->prepare('UPDATE usuario SET nombre = :nombre WHERE id = :id');
    $consulta->execute(['nombre' => trim($nombre), 'id' => $usuarioId]);
    return CUENTA_OK;
}

function guardarIdioma(PDO $pdo, int $usuarioId, string $idioma): string
{
    if (!in_array($idioma, IDIOMAS_DISPONIBLES, true)) {
        return CUENTA_DATOS_NO_VALIDOS;
    }
    $consulta = $pdo->prepare('UPDATE usuario SET idioma = :idioma WHERE id = :id');
    $consulta->execute(['idioma' => $idioma, 'id' => $usuarioId]);
    return CUENTA_OK;
}

/** true si la contraseña es la de esta cuenta (tiempo constante con password_verify). */
function isPasswordDelUsuario(PDO $pdo, int $usuarioId, string $password): bool
{
    $consulta = $pdo->prepare('SELECT password_hash FROM usuario WHERE id = :id');
    $consulta->execute(['id' => $usuarioId]);
    $hash = $consulta->fetchColumn();
    return is_string($hash) && password_verify($password, $hash);
}

/**
 * Cambia la contraseña pidiendo la actual. Devuelve ['estado' => …, 'errores' => [campo => mensaje]].
 */
function cambiarPassword(PDO $pdo, int $usuarioId, string $actual, string $nueva, string $repetida): array
{
    if (!isPasswordDelUsuario($pdo, $usuarioId, $actual)) {
        return ['estado' => CUENTA_PASSWORD_INCORRECTA, 'errores' => ['password_actual' => 'La contraseña actual no es correcta.']];
    }
    $errores = validarPasswordNueva($nueva, $repetida);
    if ($errores !== []) {
        return ['estado' => CUENTA_DATOS_NO_VALIDOS, 'errores' => $errores];
    }
    updatePasswordHash($pdo, $usuarioId, password_hash($nueva, PASSWORD_DEFAULT));
    return ['estado' => CUENTA_OK, 'errores' => []];
}

/**
 * Confirma la contraseña de una cuenta admin y abre la administración para el resto de la sesión.
 */
function confirmarAccesoAdmin(PDO $pdo, int $usuarioId, string $password): string
{
    $cuenta = getCuenta($pdo, $usuarioId);
    if ($cuenta === null || !$cuenta['es_admin']) {
        return CUENTA_NO_ADMIN;
    }
    if (!isPasswordDelUsuario($pdo, $usuarioId, $password)) {
        return CUENTA_PASSWORD_INCORRECTA;
    }
    iniciarSesionPhp();
    $_SESSION[SESION_ADMIN_CONFIRMADO] = true;
    return CUENTA_OK;
}

function isAccesoAdminConfirmado(): bool
{
    iniciarSesionPhp();
    return ($_SESSION[SESION_ADMIN_CONFIRMADO] ?? false) === true;
}

/**
 * Elimina la cuenta y todo lo suyo (sesiones, amistades, bloqueos, recuperaciones: ON DELETE
 * CASCADE). Antes sale de sus grupos con las reglas de siempre, para que ninguno se quede sin
 * administración. Pide la contraseña. Devuelve CUENTA_OK o CUENTA_PASSWORD_INCORRECTA.
 */
function eliminarCuenta(PDO $pdo, int $usuarioId, string $password): string
{
    if (!isPasswordDelUsuario($pdo, $usuarioId, $password)) {
        return CUENTA_PASSWORD_INCORRECTA;
    }
    foreach (findGruposDe($pdo, $usuarioId) as $grupo) {
        salirDeGrupo($pdo, $grupo['id'], $usuarioId);
    }
    $consulta = $pdo->prepare('DELETE FROM usuario WHERE id = :id');
    $consulta->execute(['id' => $usuarioId]);
    return CUENTA_OK;
}

/**
 * Todos tus datos en un JSON (derecho de acceso y portabilidad, RGPD arts. 15 y 20).
 * Las coordenadas del móvil no aparecen porque nunca se guardan.
 */
function exportarDatos(PDO $pdo, int $usuarioId): array
{
    // Cada :id1, :id2… es el mismo usuario: la conexión no deja repetir un nombre de parámetro.
    $consultar = function (string $sql) use ($pdo, $usuarioId): array {
        preg_match_all('/:(id\d*)\b/', $sql, $nombres);
        $consulta = $pdo->prepare($sql);
        $consulta->execute(array_fill_keys(array_unique($nombres[1]), $usuarioId));
        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    };
    $cuenta = $consultar(
        'SELECT u.nombre, u.email, u.rol, u.idioma, u.avatar, u.comparte_ubicacion, u.fecha_registro,
                b.nombre AS biblioteca_favorita
         FROM usuario u LEFT JOIN biblioteca b ON b.id = u.biblioteca_favorita_id WHERE u.id = :id'
    )[0] ?? [];
    return [
        'exportado' => gmdate('c'),
        'cuenta' => $cuenta,
        'sesiones_de_estudio' => $consultar(
            'SELECT b.nombre AS biblioteca, z.nombre AS zona, s.hora_inicio, s.hora_fin, s.estado, s.puntos_otorgados
             FROM sesion_estudio s JOIN zona z ON z.id = s.zona_id JOIN biblioteca b ON b.id = z.biblioteca_id
             WHERE s.usuario_id = :id ORDER BY s.hora_inicio'
        ),
        'amistades' => $consultar(
            'SELECT u.nombre AS persona, a.estado, a.fecha_solicitud,
                    IF(a.solicitante_id = :id1, \'enviada\', \'recibida\') AS solicitud
             FROM amistad a JOIN usuario u ON u.id = IF(a.solicitante_id = :id2, a.destinatario_id, a.solicitante_id)
             WHERE a.solicitante_id = :id3 OR a.destinatario_id = :id4'
        ),
        'bloqueos' => $consultar(
            'SELECT u.nombre AS persona, k.fecha_bloqueo FROM bloqueo k JOIN usuario u ON u.id = k.bloqueado_id
             WHERE k.bloqueador_id = :id'
        ),
        'grupos' => $consultar(
            'SELECT g.nombre, g.objetivo_semanal, m.rol, m.estado, m.fecha
             FROM grupo_miembro m JOIN grupo g ON g.id = m.grupo_id WHERE m.usuario_id = :id'
        ),
    ];
}
