<?php
/*
 * Tests funcionales de US07: ranking semanal entre amigos y objetivo compartido.
 * Prueban src/Gamificacion/ranking.php con sesiones y amistades creadas directamente en la BD.
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Amigos/amistad.php';
require_once __DIR__ . '/../src/Gamificacion/ranking.php';

return function (PDO $pdo): array {
    return [
        ['T77', 'Ranking ordenado por puntos de la semana (de más a menos), con «es_yo» marcado',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                $yo = crearUsuarioConNombrePrueba($pdo, 'Ana');
                $luis = crearUsuarioConNombrePrueba($pdo, 'Luis');
                $marta = crearUsuarioConNombrePrueba($pdo, 'Marta');
                crearAmistadRanking($pdo, $yo, $luis, AMISTAD_ACEPTADA);
                crearAmistadRanking($pdo, $yo, $marta, AMISTAD_ACEPTADA);
                insertarSesionCerradaRanking($pdo, $yo, $zona, 3, 0);
                insertarSesionCerradaRanking($pdo, $luis, $zona, 10, 0);
                insertarSesionCerradaRanking($pdo, $marta, $zona, 5, 0);
                $ranking = getRanking($pdo, $yo)['ranking'];
                return array_column($ranking, 'puntos') === [10, 5, 3]
                    && array_column($ranking, 'es_yo') === [false, false, true];
            }],
        ['T78', 'Empate de puntos → orden alfabético por nombre',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                $yo = crearUsuarioConNombrePrueba($pdo, 'Zoe');
                $ana = crearUsuarioConNombrePrueba($pdo, 'Ana');
                crearAmistadRanking($pdo, $yo, $ana, AMISTAD_ACEPTADA);
                insertarSesionCerradaRanking($pdo, $yo, $zona, 5, 0);
                insertarSesionCerradaRanking($pdo, $ana, $zona, 5, 0);
                return array_column(getRanking($pdo, $yo)['ranking'], 'nombre') === ['Ana', 'Zoe'];
            }],
        ['T79', 'Puntos de la semana pasada no cuentan para esta semana',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                $yo = crearUsuarioConNombrePrueba($pdo, 'Ana');
                $luis = crearUsuarioConNombrePrueba($pdo, 'Luis');
                crearAmistadRanking($pdo, $yo, $luis, AMISTAD_ACEPTADA);
                insertarSesionCerradaRanking($pdo, $yo, $zona, 2, 0);
                insertarSesionCerradaRanking($pdo, $luis, $zona, 16, 8);
                return array_column(getRanking($pdo, $yo)['ranking'], 'puntos') === [2, 0];
            }],
        ['T80', 'Sesión activa de menos de 4 h no suma; una de más de 4 h se cierra al leer y suma 16',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                $yo = crearUsuarioConNombrePrueba($pdo, 'Ana');
                $activa = crearUsuarioConNombrePrueba($pdo, 'Activa');
                $caducada = crearUsuarioConNombrePrueba($pdo, 'Caducada');
                crearAmistadRanking($pdo, $yo, $activa, AMISTAD_ACEPTADA);
                crearAmistadRanking($pdo, $yo, $caducada, AMISTAD_ACEPTADA);
                insertarSesionActivaRanking($pdo, $activa, $zona, 60);
                insertarSesionActivaRanking($pdo, $caducada, $zona, 300);
                $puntos = array_column(getRanking($pdo, $yo)['ranking'], 'puntos', 'nombre');
                return $puntos['Activa'] === 0 && $puntos['Caducada'] === 16;
            }],
        ['T81', 'Solo cuentan amigos aceptados: pendientes y rechazados no aparecen',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                $yo = crearUsuarioConNombrePrueba($pdo, 'Ana');
                $aceptado = crearUsuarioConNombrePrueba($pdo, 'Aceptado');
                $pendiente = crearUsuarioConNombrePrueba($pdo, 'Pendiente');
                $rechazado = crearUsuarioConNombrePrueba($pdo, 'Rechazado');
                crearAmistadRanking($pdo, $yo, $aceptado, AMISTAD_ACEPTADA);
                crearAmistadRanking($pdo, $yo, $pendiente, AMISTAD_PENDIENTE);
                crearAmistadRanking($pdo, $yo, $rechazado, AMISTAD_RECHAZADA);
                insertarSesionCerradaRanking($pdo, $aceptado, $zona, 1, 0);
                insertarSesionCerradaRanking($pdo, $pendiente, $zona, 9, 0);
                insertarSesionCerradaRanking($pdo, $rechazado, $zona, 9, 0);
                return array_column(getRanking($pdo, $yo)['ranking'], 'nombre') === ['Aceptado', 'Ana'];
            }],
        ['T82', 'Objetivo compartido = suma de puntos del grupo (tú y amigos aceptados), con porcentaje',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                $yo = crearUsuarioConNombrePrueba($pdo, 'Ana');
                $luis = crearUsuarioConNombrePrueba($pdo, 'Luis');
                $pendiente = crearUsuarioConNombrePrueba($pdo, 'Pendiente');
                crearAmistadRanking($pdo, $yo, $luis, AMISTAD_ACEPTADA);
                crearAmistadRanking($pdo, $yo, $pendiente, AMISTAD_PENDIENTE);
                insertarSesionCerradaRanking($pdo, $yo, $zona, 10, 0);
                insertarSesionCerradaRanking($pdo, $luis, $zona, 25, 0);
                insertarSesionCerradaRanking($pdo, $pendiente, $zona, 9, 0);
                $objetivo = getRanking($pdo, $yo)['objetivo'];
                return $objetivo['puntos'] === 35
                    && $objetivo['meta'] === OBJETIVO_SEMANAL_PUNTOS
                    && $objetivo['porcentaje'] === intdiv(35 * 100, OBJETIVO_SEMANAL_PUNTOS);
            }],
        ['T83', 'Porcentaje del objetivo: 0 → 0 %, valor normal y tope del 100 %',
            function (): bool {
                return calcularPorcentajeObjetivo(0) === 0
                    && calcularPorcentajeObjetivo(35) === intdiv(35 * 100, OBJETIVO_SEMANAL_PUNTOS)
                    && calcularPorcentajeObjetivo(OBJETIVO_SEMANAL_PUNTOS) === 100
                    && calcularPorcentajeObjetivo(500) === 100;
            }],
        ['T84', 'Privacidad: cada fila del ranking trae solo nombre, puntos y «es_yo» (nunca correo ni id)',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                $yo = crearUsuarioConNombrePrueba($pdo, 'Ana');
                $luis = crearUsuarioConNombrePrueba($pdo, 'Luis');
                crearAmistadRanking($pdo, $yo, $luis, AMISTAD_ACEPTADA);
                insertarSesionCerradaRanking($pdo, $luis, $zona, 4, 0);
                $ranking = getRanking($pdo, $yo)['ranking'];
                foreach ($ranking as $fila) {
                    if (array_keys($fila) !== ['nombre', 'puntos', 'es_yo']) {
                        return false;
                    }
                }
                return count($ranking) === 2;
            }],
    ];
};

/** Estudiante con un nombre concreto (para probar el orden alfabético y el ranking). */
function crearUsuarioConNombrePrueba(PDO $pdo, string $nombre): int
{
    $consulta = $pdo->prepare(
        'INSERT INTO usuario (nombre, email, password_hash) VALUES (:nombre, :email, :hash)'
    );
    $consulta->execute([
        'nombre' => $nombre,
        'email'  => crearEmailPrueba('unizar.es'),
        'hash'   => 'sin-contrasena-de-prueba',
    ]);
    return (int) $pdo->lastInsertId();
}

/** Relación entre dos usuarios de prueba con un estado concreto (accepted, pending o rejected). */
function crearAmistadRanking(PDO $pdo, int $solicitanteId, int $destinatarioId, string $estado): void
{
    $consulta = $pdo->prepare(
        'INSERT INTO amistad (solicitante_id, destinatario_id, estado)
         VALUES (:solicitante, :destinatario, :estado)'
    );
    $consulta->execute([
        'solicitante'  => $solicitanteId,
        'destinatario' => $destinatarioId,
        'estado'       => $estado,
    ]);
}

/** Sesión ya cerrada en la zona, con sus puntos. $diasAtras = 0 la deja en esta semana. */
function insertarSesionCerradaRanking(PDO $pdo, int $usuarioId, int $zonaId, int $puntos, int $diasAtras): void
{
    $consulta = $pdo->prepare(
        'INSERT INTO sesion_estudio (usuario_id, zona_id, hora_inicio, hora_fin, estado, puntos_otorgados)
         VALUES (:usuario, :zona,
                 NOW() - INTERVAL :dias_inicio DAY - INTERVAL 1 HOUR,
                 NOW() - INTERVAL :dias_fin DAY,
                 :estado, :puntos)'
    );
    $consulta->execute([
        'usuario'     => $usuarioId,
        'zona'        => $zonaId,
        'dias_inicio' => $diasAtras,
        'dias_fin'    => $diasAtras,
        'estado'      => RANKING_SESION_FINALIZADA,
        'puntos'      => $puntos,
    ]);
}

/** Sesión todavía abierta que empezó hace $minutos (para probar la caducidad al leer). */
function insertarSesionActivaRanking(PDO $pdo, int $usuarioId, int $zonaId, int $minutos): void
{
    $consulta = $pdo->prepare(
        'INSERT INTO sesion_estudio (usuario_id, zona_id, hora_inicio, estado)
         VALUES (:usuario, :zona, NOW() - INTERVAL :minutos MINUTE, :estado)'
    );
    $consulta->execute([
        'usuario' => $usuarioId,
        'zona'    => $zonaId,
        'minutos' => $minutos,
        'estado'  => 'active',
    ]);
}
