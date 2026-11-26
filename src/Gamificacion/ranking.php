<?php
/*
 * Ranking semanal de un grupo y su objetivo compartido (US07). Cada persona puede estar en
 * varios grupos (src/Grupos/grupos.php) y cada grupo tiene su objetivo. Solo lo ve quien está
 * dentro, y solo cuentan quienes están dentro (no los invitados). Los puntos se suman de
 * sesion_estudio de esta semana: no se guardan en ninguna tabla.
 *
 * - Semana: de lunes 00:00 a domingo 23:59 con la hora de ZONA_HORARIA_POR_DEFECTO (Portugal),
 *   no la del servidor. Solo cuentan las sesiones ya cerradas (finalizadas o caducadas).
 * - Empates: misma posición y la siguiente salta (1, 1, 3). Dentro de un empate va antes quien
 *   llegó antes a esos puntos (cerró antes su última sesión de la semana); si no, quien sumó más
 *   en las semanas anteriores; y, si no, por nombre.
 * - Podio: los tres primeros con algún punto esta semana.
 * - Color de cada persona: fijo según su id (id % RANKING_NUM_COLORES); el CSS elige el tono.
 * Por persona solo se devuelve nombre, iniciales, avatar, puntos, posición, color y si eres tú:
 * nunca id, correo ni ubicación. Solo SQL con sentencias preparadas.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/../Database/conexion.php';
require_once __DIR__ . '/../Sesiones/estudio.php';
require_once __DIR__ . '/../Usuarios/avatar.php';
require_once __DIR__ . '/../Grupos/grupos.php';
require_once __DIR__ . '/../Horarios/horarios.php';

const RANKING_SESION_FINALIZADA = 'finished';
const RANKING_SESION_CADUCADA = 'expired';
const RANKING_TAM_PODIO = 3;
const MAX_INICIALES = 2;

/**
 * Ranking de la semana del grupo y su objetivo, o null si el grupo no existe o no estás dentro.
 * Antes de sumar se cierran las sesiones caducadas, igual que en getPerfil: así sus puntos ya
 * cuentan aunque nadie las haya consultado. $ahora solo se pasa en los tests.
 */
function getRanking(PDO $pdo, int $grupoId, int $usuarioId, ?DateTimeImmutable $ahora = null): ?array
{
    $grupo = getDetalleGrupo($pdo, $grupoId, $usuarioId);
    if ($grupo === null) {
        return null;
    }
    cerrarSesionesCaducadas($pdo);
    [$desde, $hasta] = getLimitesSemanaBd($pdo, $ahora ?? getAhora());
    $personas = formatearRanking(findPuntosSemanaGrupo($pdo, $grupoId, $desde, $hasta), $usuarioId);
    $total = array_sum(array_column($personas, 'puntos'));
    return [
        'grupo'      => ['id' => $grupoId, 'nombre' => $grupo['nombre'], 'es_admin' => $grupo['es_admin']],
        'personas'   => $personas,
        'podio'      => getPodio($personas),
        'total'      => $total,
        'objetivo'   => $grupo['objetivo'],
        'porcentaje' => calcularPorcentajeObjetivo($total, $grupo['objetivo']),
    ];
}

/** Tus grupos (findGruposDe) con los puntos que lleva cada uno esta semana, para la lista de Social. */
function getGruposConProgreso(PDO $pdo, int $usuarioId, ?DateTimeImmutable $ahora = null): array
{
    cerrarSesionesCaducadas($pdo);
    [$desde, $hasta] = getLimitesSemanaBd($pdo, $ahora ?? getAhora());
    return array_map(static function (array $grupo) use ($pdo, $desde, $hasta): array {
        $filas = findPuntosSemanaGrupo($pdo, $grupo['id'], $desde, $hasta);
        return $grupo + ['total' => array_sum(array_map('intval', array_column($filas, 'puntos')))];
    }, findGruposDe($pdo, $usuarioId));
}

/** Porcentaje del objetivo alcanzado, entero y nunca por encima de OBJETIVO_MAX_PORCENTAJE. */
function calcularPorcentajeObjetivo(int $puntos, int $objetivo): int
{
    return min(OBJETIVO_MAX_PORCENTAJE, intdiv($puntos * 100, max(1, $objetivo)));
}

/**
 * Filas ya ordenadas → personas con su posición. Con empate, la misma posición; la siguiente
 * persona con menos puntos va en (número de personas por delante + 1).
 */
function formatearRanking(array $filas, int $usuarioId): array
{
    $personas = [];
    $posicion = 0;
    $puntosAnteriores = null;
    foreach ($filas as $indice => $fila) {
        $puntos = (int) $fila['puntos'];
        if ($puntos !== $puntosAnteriores) {
            $posicion = $indice + 1;
            $puntosAnteriores = $puntos;
        }
        $personas[] = [
            'nombre'    => $fila['nombre'],
            'iniciales' => getIniciales($fila['nombre']),
            'avatar'    => leerAvatar($fila['avatar'] ?? null),
            'puntos'    => $puntos,
            'posicion'  => $posicion,
            'color'     => (int) $fila['id'] % RANKING_NUM_COLORES,
            'es_yo'     => (int) $fila['id'] === $usuarioId,
        ];
    }
    return $personas;
}

/** Los RANKING_TAM_PODIO primeros que tienen algún punto esta semana (puede haber menos). */
function getPodio(array $personas): array
{
    $conPuntos = array_values(array_filter($personas, fn (array $persona): bool => $persona['puntos'] > 0));
    return array_slice($conPuntos, 0, RANKING_TAM_PODIO);
}

/** "Lucía Claver Bolea" → "LC": primera letra de las dos primeras palabras, en mayúsculas. */
function getIniciales(string $nombre): string
{
    preg_match_all('/(?<!\S)\S/u', trim($nombre), $letras);
    return mb_strtoupper(implode('', array_slice($letras[0], 0, MAX_INICIALES)), 'UTF-8');
}

/**
 * Lunes 00:00 de esta semana y el lunes siguiente (hora de Portugal), escritos con la hora de
 * la BD: hora_fin se guarda con el reloj de MySQL, que puede estar en otra zona (en España, una
 * hora más). El desfase se le pregunta a MySQL (NOW() − UTC_TIMESTAMP()).
 */
function getLimitesSemanaBd(PDO $pdo, DateTimeImmutable $ahora): array
{
    $local = $ahora->setTimezone(new DateTimeZone(ZONA_HORARIA_POR_DEFECTO));
    $lunes = $local->modify('monday this week')->setTime(0, 0);
    $desfase = (int) $pdo->query('SELECT TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW())')->fetchColumn();
    $aHoraBd = fn (DateTimeImmutable $momento): string => $momento
        ->setTimezone(new DateTimeZone('UTC'))
        ->modify(sprintf('%+d seconds', $desfase))
        ->format('Y-m-d H:i:s');
    return [$aHoraBd($lunes), $aHoraBd($lunes->modify('+1 week'))];
}

/**
 * Personas dentro del grupo con sus puntos entre $desde y $hasta (hora de la BD), ordenadas:
 * más puntos primero; en empate, quien cerró antes su última sesión; después, quien sumó más
 * antes de esta semana; y por último, por nombre.
 */
function findPuntosSemanaGrupo(PDO $pdo, int $grupoId, string $desde, string $hasta): array
{
    $consulta = $pdo->prepare(
        'SELECT u.id, u.nombre, u.avatar, COALESCE(SUM(s.puntos_otorgados), 0) AS puntos,
                COALESCE(MAX(s.hora_fin), :sin_sesion) AS ultima_sesion,
                (SELECT COALESCE(SUM(p.puntos_otorgados), 0) FROM sesion_estudio p
                  WHERE p.usuario_id = u.id AND p.estado IN (:fin_antes, :cad_antes)
                    AND p.hora_fin < :desde_antes) AS puntos_antes
         FROM grupo_miembro m
         JOIN usuario u ON u.id = m.usuario_id
         LEFT JOIN sesion_estudio s
           ON s.usuario_id = u.id
          AND s.estado IN (:finalizada, :caducada)
          AND s.hora_fin >= :desde AND s.hora_fin < :hasta
         WHERE m.grupo_id = :grupo AND m.estado = :dentro
         GROUP BY u.id, u.nombre, u.avatar
         ORDER BY puntos DESC, ultima_sesion ASC, puntos_antes DESC, u.nombre ASC'
    );
    $consulta->execute([
        'sin_sesion' => '9999-12-31 23:59:59',
        'grupo'      => $grupoId,
        'dentro'     => GRUPO_DENTRO,
        'finalizada' => RANKING_SESION_FINALIZADA,
        'caducada'   => RANKING_SESION_CADUCADA,
        'desde'      => $desde,
        'desde_antes' => $desde,
        'fin_antes'  => RANKING_SESION_FINALIZADA,
        'cad_antes'  => RANKING_SESION_CADUCADA,
        'hasta'      => $hasta,
    ]);
    return $consulta->fetchAll();
}
