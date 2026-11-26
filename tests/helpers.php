<?php
/*
 * Utilidades de los tests funcionales (sin PHPUnit).
 */
declare(strict_types=1);

const TEST_EMAIL_PREFIJO = 'test.studyspot.';
const TEST_PASSWORD = 'clave-segura-123';

/** Correo único para cada ejecución, para no chocar con datos reales ni con otros tests. */
function crearEmailPrueba(string $dominio): string
{
    return TEST_EMAIL_PREFIJO . bin2hex(random_bytes(4)) . '@' . $dominio;
}

/** Borra los usuarios creados por los tests (solo los que llevan el prefijo de prueba). */
function borrarUsuariosPrueba(PDO $pdo): void
{
    $consulta = $pdo->prepare('DELETE FROM usuario WHERE email LIKE :prefijo');
    $consulta->execute(['prefijo' => TEST_EMAIL_PREFIJO . '%']);
    // Los grupos de prueba se quedan sin nadie al borrar a sus personas: se borran también.
    $pdo->exec('DELETE FROM grupo WHERE NOT EXISTS (SELECT 1 FROM grupo_miembro m WHERE m.grupo_id = grupo.id)');
}

/** Crea un usuario de prueba con TEST_PASSWORD y devuelve su correo. */
function crearUsuarioPrueba(PDO $pdo): string
{
    $email = crearEmailPrueba('unizar.es');
    registrarUsuario($pdo, 'Estudiante de prueba', $email, TEST_PASSWORD, TEST_PASSWORD);
    return $email;
}

/** Simula que han pasado los minutos de validez de todos los enlaces del usuario. */
function caducarRecuperaciones(PDO $pdo, string $email): void
{
    $consulta = $pdo->prepare(
        'UPDATE recuperacion_password r JOIN usuario u ON u.id = r.usuario_id
         SET r.fecha_caducidad = NOW() - INTERVAL 1 MINUTE WHERE u.email = :email'
    );
    $consulta->execute(['email' => $email]);
}

function contarRecuperaciones(PDO $pdo, string $email): int
{
    $consulta = $pdo->prepare(
        'SELECT COUNT(*) FROM recuperacion_password r JOIN usuario u ON u.id = r.usuario_id WHERE u.email = :email'
    );
    $consulta->execute(['email' => $email]);
    return (int) $consulta->fetchColumn();
}

function existeTokenEnClaro(PDO $pdo, string $token): bool
{
    $consulta = $pdo->prepare('SELECT 1 FROM recuperacion_password WHERE token_hash = :token');
    $consulta->execute(['token' => $token]);
    return $consulta->fetchColumn() !== false;
}

// ---------- US02: biblioteca, zona y sesiones de prueba ----------

const TEST_BIBLIOTECA_PREFIJO = 'TEST StudySpot ';
const TEST_LATITUD = 41.6833;
const TEST_LONGITUD = -0.8875;

/** Crea un usuario de prueba y devuelve su id. */
function crearUsuarioPruebaConId(PDO $pdo): int
{
    return (int) findUsuarioPorEmail($pdo, crearUsuarioPrueba($pdo))['id'];
}

/** Crea una biblioteca y una zona de prueba. Devuelve id, token y coordenadas de la zona. */
function crearZonaPrueba(PDO $pdo): array
{
    $biblioteca = $pdo->prepare(
        'INSERT INTO biblioteca (nombre, direccion, latitud, longitud, capacidad_maxima)
         VALUES (:nombre, :direccion, :latitud, :longitud, 100)'
    );
    $biblioteca->execute([
        'nombre'    => TEST_BIBLIOTECA_PREFIJO . bin2hex(random_bytes(4)),
        'direccion' => 'Dirección de prueba',
        'latitud'   => TEST_LATITUD,
        'longitud'  => TEST_LONGITUD,
    ]);
    $token = bin2hex(random_bytes(16));
    $zona = $pdo->prepare('INSERT INTO zona (biblioteca_id, nombre, token_qr) VALUES (:biblioteca_id, :nombre, :token)');
    $zona->execute(['biblioteca_id' => $pdo->lastInsertId(), 'nombre' => 'Zona de prueba', 'token' => $token]);
    return ['id' => (int) $pdo->lastInsertId(), 'token' => $token, 'latitud' => TEST_LATITUD, 'longitud' => TEST_LONGITUD];
}

/** Borra las bibliotecas de prueba (sus zonas y sesiones se borran en cascada). */
function borrarBibliotecasPrueba(PDO $pdo): void
{
    $consulta = $pdo->prepare('DELETE FROM biblioteca WHERE nombre LIKE :prefijo');
    $consulta->execute(['prefijo' => TEST_BIBLIOTECA_PREFIJO . '%']);
}

/** Simula que la sesión activa del usuario empezó hace $minutos. */
function retrasarSesionActiva(PDO $pdo, int $usuarioId, int $minutos): void
{
    $consulta = $pdo->prepare(
        "UPDATE sesion_estudio SET hora_inicio = NOW() - INTERVAL :minutos MINUTE
         WHERE usuario_id = :usuario_id AND estado = 'active'"
    );
    $consulta->execute(['minutos' => $minutos, 'usuario_id' => $usuarioId]);
}

/** Fila completa (todas las columnas) de la última sesión del usuario, o [] si no tiene. */
function findUltimaSesion(PDO $pdo, int $usuarioId): array
{
    $consulta = $pdo->prepare('SELECT * FROM sesion_estudio WHERE usuario_id = :usuario_id ORDER BY id DESC LIMIT 1');
    $consulta->execute(['usuario_id' => $usuarioId]);
    return $consulta->fetch() ?: [];
}

/**
 * Ejecuta un test y devuelve true si pasa. Imprime una línea PASS/FAIL.
 * Una excepción dentro del test cuenta como FAIL y se muestra su mensaje.
 */
function ejecutarTest(string $id, string $descripcion, callable $test): bool
{
    try {
        $isCorrecto = $test() === true;
        $detalle = '';
    } catch (Throwable $error) {
        $isCorrecto = false;
        $detalle = ' — ' . $error->getMessage();
    }
    printf("%s  %s  %s%s\n", $isCorrecto ? 'PASS' : 'FAIL', $id, $descripcion, $detalle);
    return $isCorrecto;
}
