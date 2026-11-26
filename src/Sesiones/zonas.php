<?php
/*
 * Acceso a datos de zona y biblioteca para el check-in (US02).
 */
declare(strict_types=1);

/** Devuelve la zona con las coordenadas de su biblioteca, o null si no existe. */
function findZonaConBiblioteca(PDO $pdo, int $zonaId): ?array
{
    $consulta = $pdo->prepare(
        'SELECT z.id, z.nombre, z.token_qr, b.id AS biblioteca_id, b.nombre AS biblioteca, b.zona_horaria,
                b.latitud, b.longitud
         FROM zona z JOIN biblioteca b ON b.id = z.biblioteca_id
         WHERE z.id = :id'
    );
    $consulta->execute(['id' => $zonaId]);
    $zona = $consulta->fetch();
    return $zona === false ? null : $zona;
}
