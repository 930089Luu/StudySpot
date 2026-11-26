<?php
/*
 * Tests funcionales de la biblioteca favorita (mejora de US03, 22-11): el mapa se abre en ella.
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';
require_once __DIR__ . '/../src/Usuarios/usuarios.php';
require_once __DIR__ . '/../src/Usuarios/favorita.php';

return function (PDO $pdo): array {
    return [
        ['T112', 'Favorita: un usuario nuevo no tiene; al marcar una biblioteca queda guardada',
            function () use ($pdo): bool {
                $usuario = crearUsuarioPruebaConId($pdo);
                $biblioteca = crearBibliotecaFavoritaPrueba($pdo);
                $sinFavorita = getBibliotecaFavorita($pdo, $usuario) === null;
                return $sinFavorita && guardarBibliotecaFavorita($pdo, $usuario, $biblioteca)
                    && getBibliotecaFavorita($pdo, $usuario) === $biblioteca;
            }],
        ['T113', 'Favorita: marcar otra sustituye a la anterior y null la quita',
            function () use ($pdo): bool {
                $usuario = crearUsuarioPruebaConId($pdo);
                guardarBibliotecaFavorita($pdo, $usuario, crearBibliotecaFavoritaPrueba($pdo));
                $otra = crearBibliotecaFavoritaPrueba($pdo);
                guardarBibliotecaFavorita($pdo, $usuario, $otra);
                $sustituida = getBibliotecaFavorita($pdo, $usuario) === $otra;
                guardarBibliotecaFavorita($pdo, $usuario, null);
                return $sustituida && getBibliotecaFavorita($pdo, $usuario) === null;
            }],
        ['T114', 'Favorita: una biblioteca que no existe → false (404) y no cambia la que había',
            function () use ($pdo): bool {
                $usuario = crearUsuarioPruebaConId($pdo);
                $biblioteca = crearBibliotecaFavoritaPrueba($pdo);
                guardarBibliotecaFavorita($pdo, $usuario, $biblioteca);
                return guardarBibliotecaFavorita($pdo, $usuario, PHP_INT_MAX) === false
                    && getBibliotecaFavorita($pdo, $usuario) === $biblioteca;
            }],
        ['T115', 'Favorita: si se borra la biblioteca, el usuario se queda sin favorita (no falla)',
            function () use ($pdo): bool {
                $usuario = crearUsuarioPruebaConId($pdo);
                $biblioteca = crearBibliotecaFavoritaPrueba($pdo);
                guardarBibliotecaFavorita($pdo, $usuario, $biblioteca);
                $pdo->prepare('DELETE FROM biblioteca WHERE id = :id')->execute(['id' => $biblioteca]);
                return getBibliotecaFavorita($pdo, $usuario) === null;
            }],
        ['T116', 'Favorita: findBibliotecaFavorita da id y nombre de la actual (para avisar al cambiarla); sin favorita, null',
            function () use ($pdo): bool {
                $usuario = crearUsuarioPruebaConId($pdo);
                $sinFavorita = findBibliotecaFavorita($pdo, $usuario) === null;
                $biblioteca = crearBibliotecaFavoritaPrueba($pdo);
                guardarBibliotecaFavorita($pdo, $usuario, $biblioteca);
                $favorita = findBibliotecaFavorita($pdo, $usuario);
                return $sinFavorita && $favorita['id'] === $biblioteca
                    && str_starts_with($favorita['nombre'], TEST_BIBLIOTECA_PREFIJO);
            }],
    ];
};

/** Crea una biblioteca de prueba (con su zona) y devuelve el id de la biblioteca. */
function crearBibliotecaFavoritaPrueba(PDO $pdo): int
{
    $zona = crearZonaPrueba($pdo);
    $consulta = $pdo->prepare('SELECT biblioteca_id FROM zona WHERE id = :id');
    $consulta->execute(['id' => $zona['id']]);
    return (int) $consulta->fetchColumn();
}
