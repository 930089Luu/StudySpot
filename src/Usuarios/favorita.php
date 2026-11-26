<?php
/*
 * Biblioteca favorita del usuario (mejora de US03, 22-11): el mapa se abre en ella y sale la
 * primera de la lista. Como mucho una por usuario; null = sin favorita.
 */
declare(strict_types=1);

/** Id de la biblioteca favorita del usuario, o null si no tiene. */
function getBibliotecaFavorita(PDO $pdo, int $usuarioId): ?int
{
    $consulta = $pdo->prepare('SELECT biblioteca_favorita_id FROM usuario WHERE id = :id');
    $consulta->execute(['id' => $usuarioId]);
    $favorita = $consulta->fetchColumn();
    return $favorita === false || $favorita === null ? null : (int) $favorita;
}

/** Id y nombre de la favorita (para avisar de que se va a cambiar), o null si no tiene. */
function findBibliotecaFavorita(PDO $pdo, int $usuarioId): ?array
{
    $consulta = $pdo->prepare(
        'SELECT b.id, b.nombre FROM usuario u
         JOIN biblioteca b ON b.id = u.biblioteca_favorita_id
         WHERE u.id = :id'
    );
    $consulta->execute(['id' => $usuarioId]);
    $fila = $consulta->fetch(PDO::FETCH_ASSOC);
    return $fila === false ? null : ['id' => (int) $fila['id'], 'nombre' => $fila['nombre']];
}

/**
 * Guarda la favorita (sustituye a la anterior) o la quita con null.
 * Devuelve false si la biblioteca no existe (y no cambia nada).
 */
function guardarBibliotecaFavorita(PDO $pdo, int $usuarioId, ?int $bibliotecaId): bool
{
    if ($bibliotecaId !== null && !existeBiblioteca($pdo, $bibliotecaId)) {
        return false;
    }
    $consulta = $pdo->prepare('UPDATE usuario SET biblioteca_favorita_id = :biblioteca WHERE id = :id');
    $consulta->execute(['biblioteca' => $bibliotecaId, 'id' => $usuarioId]);
    return true;
}

function existeBiblioteca(PDO $pdo, int $bibliotecaId): bool
{
    $consulta = $pdo->prepare('SELECT 1 FROM biblioteca WHERE id = :id');
    $consulta->execute(['id' => $bibliotecaId]);
    return $consulta->fetchColumn() !== false;
}
