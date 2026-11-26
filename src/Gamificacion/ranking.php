<?php
/*
 * Ranking semanal entre el usuario y sus amigos aceptados, y objetivo compartido (US07).
 * La semana es la ISO (lunes a domingo) según el reloj de MySQL. Solo cuentan las sesiones ya cerradas.
 * Solo SQL con sentencias preparadas.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/../Database/conexion.php';
require_once __DIR__ . '/../Sesiones/estudio.php';
require_once __DIR__ . '/../Amigos/amistad.php';

const RANKING_SESION_FINALIZADA = 'finished';
const RANKING_SESION_CADUCADA = 'expired';

/**
 * Ranking de la semana y objetivo compartido. Antes de sumar se cierran las sesiones caducadas,
 * igual que en getPerfil: así sus puntos ya cuentan aunque nadie las haya consultado.
 */
function getRanking(PDO $pdo, int $usuarioId): array
{
    cerrarSesionesCaducadas($pdo);
    $ranking = [];
    foreach (findPuntosSemanaGrupo($pdo, $usuarioId) as $fila) {
        $ranking[] = [
            'nombre' => $fila['nombre'],
            'puntos' => (int) $fila['puntos'],
            'es_yo'  => (int) $fila['id'] === $usuarioId,
        ];
    }
    $total = array_sum(array_column($ranking, 'puntos'));
    return [
        'ranking'  => $ranking,
        'objetivo' => [
            'puntos'     => $total,
            'meta'       => OBJETIVO_SEMANAL_PUNTOS,
            'porcentaje' => calcularPorcentajeObjetivo($total),
        ],
    ];
}

/** Porcentaje del objetivo alcanzado, entero y nunca por encima de OBJETIVO_MAX_PORCENTAJE. */
function calcularPorcentajeObjetivo(int $puntos): int
{
    return min(OBJETIVO_MAX_PORCENTAJE, intdiv($puntos * 100, OBJETIVO_SEMANAL_PUNTOS));
}

/**
 * Usuario y amigos aceptados con sus puntos de esta semana.
 * Orden: más puntos primero y, en empate, por nombre.
 */
function findPuntosSemanaGrupo(PDO $pdo, int $usuarioId): array
{
    // "grupo" reúne al usuario y a la otra persona de cada amistad aceptada, sea quien sea quien la pidió.
    $consulta = $pdo->prepare(
        'SELECT u.id, u.nombre, COALESCE(SUM(s.puntos_otorgados), 0) AS puntos
         FROM (
             SELECT :yo AS id
             UNION
             SELECT CASE WHEN a.solicitante_id = :yo_sol THEN a.destinatario_id ELSE a.solicitante_id END
             FROM amistad a
             WHERE a.estado = :aceptada AND (a.solicitante_id = :yo_a OR a.destinatario_id = :yo_b)
         ) grupo
         JOIN usuario u ON u.id = grupo.id
         LEFT JOIN sesion_estudio s
           ON s.usuario_id = u.id
          AND s.estado IN (:finalizada, :caducada)
          AND YEARWEEK(s.hora_fin, 3) = YEARWEEK(CURDATE(), 3)
         GROUP BY u.id, u.nombre
         ORDER BY puntos DESC, u.nombre ASC'
    );
    $consulta->execute([
        'yo'        => $usuarioId,
        'yo_sol'    => $usuarioId,
        'yo_a'      => $usuarioId,
        'yo_b'      => $usuarioId,
        'aceptada'  => AMISTAD_ACEPTADA,
        'finalizada' => RANKING_SESION_FINALIZADA,
        'caducada'  => RANKING_SESION_CADUCADA,
    ]);
    return $consulta->fetchAll();
}
