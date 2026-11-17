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
