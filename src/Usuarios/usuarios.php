<?php
/*
 * Acceso a datos de la tabla usuario. Solo SQL con sentencias preparadas.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';

function findUsuarioPorEmail(PDO $pdo, string $email): ?array
{
    $consulta = $pdo->prepare(
        'SELECT id, nombre, email, password_hash, rol FROM usuario WHERE email = :email'
    );
    $consulta->execute(['email' => $email]);
    $usuario = $consulta->fetch();
    return $usuario === false ? null : $usuario;
}

function existeEmail(PDO $pdo, string $email): bool
{
    $consulta = $pdo->prepare('SELECT 1 FROM usuario WHERE email = :email');
    $consulta->execute(['email' => $email]);
    return $consulta->fetchColumn() !== false;
}

function updatePasswordHash(PDO $pdo, int $usuarioId, string $passwordHash): void
{
    $consulta = $pdo->prepare('UPDATE usuario SET password_hash = :password_hash WHERE id = :id');
    $consulta->execute(['password_hash' => $passwordHash, 'id' => $usuarioId]);
}

/**
 * Inserta un usuario y devuelve su id, o null si el correo ya existe.
 * El UNIQUE de la BD es la garantía final: cubre dos registros simultáneos
 * con el mismo correo que hayan pasado los dos la comprobación previa.
 */
function insertUsuario(PDO $pdo, string $nombre, string $email, string $passwordHash): ?int
{
    $consulta = $pdo->prepare(
        'INSERT INTO usuario (nombre, email, password_hash) VALUES (:nombre, :email, :password_hash)'
    );
    try {
        $consulta->execute([
            'nombre'        => $nombre,
            'email'         => $email,
            'password_hash' => $passwordHash,
        ]);
    } catch (PDOException $error) {
        if ($error->getCode() === SQLSTATE_INTEGRITY_VIOLATION) {
            return null;
        }
        throw $error;
    }
    return (int) $pdo->lastInsertId();
}
