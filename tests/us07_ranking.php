<?php
/*
 * Tests funcionales de US07: grupos, ranking semanal de cada grupo y objetivo compartido.
 * Prueban src/Grupos/grupos.php y src/Gamificacion/ranking.php con datos creados en la BD.
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Amigos/amistad.php';
require_once __DIR__ . '/../src/Grupos/grupos.php';
require_once __DIR__ . '/../src/Gamificacion/ranking.php';

return function (PDO $pdo): array {
    $ranking = fn (int $grupo, int $yo): array => getRanking($pdo, $grupo, $yo);
    return [
        ['T77', 'Ranking del grupo ordenado por puntos de la semana (de más a menos), con «es_yo» marcado',
            function () use ($pdo, $ranking): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                [$yo, $luis, $marta] = crearPersonasPrueba($pdo, ['Ana', 'Luis', 'Marta']);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $luis, $marta]);
                insertarSesionCerradaRanking($pdo, $yo, $zona, 3, 0);
                insertarSesionCerradaRanking($pdo, $luis, $zona, 10, 0);
                insertarSesionCerradaRanking($pdo, $marta, $zona, 5, 0);
                $personas = $ranking($grupo, $yo)['personas'];
                return array_column($personas, 'puntos') === [10, 5, 3]
                    && array_column($personas, 'es_yo') === [false, false, true];
            }],
        ['T78', 'Empate de puntos terminados a la vez y sin semanas anteriores → orden alfabético por nombre',
            function () use ($pdo, $ranking): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                [$yo, $ana] = crearPersonasPrueba($pdo, ['Zoe', 'Ana']);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $ana]);
                insertarSesionCerradaRanking($pdo, $yo, $zona, 5, 0);
                insertarSesionCerradaRanking($pdo, $ana, $zona, 5, 0);
                return array_column($ranking($grupo, $yo)['personas'], 'nombre') === ['Ana', 'Zoe'];
            }],
        ['T79', 'Puntos de la semana pasada no cuentan para esta semana',
            function () use ($pdo, $ranking): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                [$yo, $luis] = crearPersonasPrueba($pdo, ['Ana', 'Luis']);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $luis]);
                insertarSesionCerradaRanking($pdo, $yo, $zona, 2, 0);
                insertarSesionCerradaRanking($pdo, $luis, $zona, 16, 8);
                return array_column($ranking($grupo, $yo)['personas'], 'puntos') === [2, 0];
            }],
        ['T80', 'Sesión activa de menos de 4 h no suma; una de más de 4 h se cierra al leer y suma 16',
            function () use ($pdo, $ranking): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                [$yo, $activa, $caducada] = crearPersonasPrueba($pdo, ['Ana', 'Activa', 'Caducada']);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $activa, $caducada]);
                insertarSesionActivaRanking($pdo, $activa, $zona, 60);
                insertarSesionActivaRanking($pdo, $caducada, $zona, 300);
                $puntos = array_column($ranking($grupo, $yo)['personas'], 'puntos', 'nombre');
                return $puntos['Activa'] === 0 && $puntos['Caducada'] === 16;
            }],
        ['T81', 'Solo cuenta quien está dentro del grupo: invitados sin aceptar y gente de fuera no aparecen',
            function () use ($pdo, $ranking): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                [$yo, $dentro, $invitado, $fuera] = crearPersonasPrueba($pdo, ['Ana', 'Dentro', 'Invitado', 'Fuera']);
                hacerAmigosPrueba($pdo, $yo, $invitado);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $dentro]);
                invitarAGrupo($pdo, $grupo, $yo, $invitado);
                foreach ([$dentro, $invitado, $fuera] as $persona) {
                    insertarSesionCerradaRanking($pdo, $persona, $zona, 9, 0);
                }
                return array_column($ranking($grupo, $yo)['personas'], 'nombre') === ['Dentro', 'Ana'];
            }],
        ['T82', 'Objetivo compartido = suma de puntos del grupo frente al objetivo de ESE grupo, con porcentaje',
            function () use ($pdo, $ranking): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                [$yo, $luis] = crearPersonasPrueba($pdo, ['Ana', 'Luis']);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $luis], 70);
                insertarSesionCerradaRanking($pdo, $yo, $zona, 10, 0);
                insertarSesionCerradaRanking($pdo, $luis, $zona, 25, 0);
                $datos = $ranking($grupo, $yo);
                return $datos['total'] === 35 && $datos['objetivo'] === 70 && $datos['porcentaje'] === 50;
            }],
        ['T83', 'Porcentaje del objetivo: 0 → 0 %, valor normal y tope del 100 %',
            fn (): bool => calcularPorcentajeObjetivo(0, 40) === 0
                && calcularPorcentajeObjetivo(10, 40) === 25
                && calcularPorcentajeObjetivo(40, 40) === 100
                && calcularPorcentajeObjetivo(500, 40) === 100],
        ['T84', 'Privacidad: cada persona trae solo nombre, iniciales, avatar, puntos, posición, color y «es_yo» (nunca correo, id ni ubicación)',
            function () use ($pdo, $ranking): bool {
                [$yo, $luis] = crearPersonasPrueba($pdo, ['Ana', 'Luis']);
                $personas = $ranking(crearGrupoConPersonas($pdo, [$yo, $luis]), $yo)['personas'];
                foreach ($personas as $fila) {
                    if (array_keys($fila) !== ['nombre', 'iniciales', 'avatar', 'puntos', 'posicion', 'color', 'es_yo']) {
                        return false;
                    }
                }
                return count($personas) === 2;
            }],
        ['T123', 'Empates: misma posición y la siguiente salta (1, 1, 3); dentro del empate va antes quien llegó antes a esos puntos',
            function () use ($pdo, $ranking): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                [$yo, $tarde, $pronto] = crearPersonasPrueba($pdo, ['Ana', 'Bea', 'Carla']);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $tarde, $pronto]);
                insertarSesionHaceMinutos($pdo, $tarde, $zona, 8, 10);
                insertarSesionHaceMinutos($pdo, $pronto, $zona, 8, 120);
                insertarSesionHaceMinutos($pdo, $yo, $zona, 2, 5);
                $personas = $ranking($grupo, $yo)['personas'];
                return array_column($personas, 'nombre') === ['Carla', 'Bea', 'Ana']
                    && array_column($personas, 'posicion') === [1, 1, 3];
            }],
        ['T124', 'Podio: las 3 primeras personas con algún punto; quien tiene 0 puntos no sube',
            function () use ($pdo, $ranking): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                $personas = crearPersonasPrueba($pdo, ['Ana', 'Bea', 'Carla', 'Dani', 'Eva']);
                foreach (array_combine($personas, [0, 9, 7, 5, 3]) as $persona => $puntos) {
                    insertarSesionCerradaRanking($pdo, $persona, $zona, $puntos, 0);
                }
                $podio = array_column($ranking(crearGrupoConPersonas($pdo, $personas), $personas[0])['podio'], 'nombre');
                $sola = crearPersonasPrueba($pdo, ['Sola'])[0];
                return $podio === ['Bea', 'Carla', 'Dani'] && $ranking(crearGrupoConPersonas($pdo, [$sola]), $sola)['podio'] === [];
            }],
        ['T125', 'Iniciales de las dos primeras palabras y color fijo de 0 a 7 según la persona',
            function () use ($pdo, $ranking): bool {
                $yo = crearPersonasPrueba($pdo, ['lucía claver bolea'])[0];
                $grupo = crearGrupoConPersonas($pdo, [$yo]);
                $primera = $ranking($grupo, $yo)['personas'][0];
                return getIniciales('Lucía Claver Bolea') === 'LC' && getIniciales('Óscar') === 'Ó'
                    && $primera['iniciales'] === 'LC'
                    && $primera['color'] === $yo % RANKING_NUM_COLORES
                    && $ranking($grupo, $yo)['personas'][0]['color'] === $primera['color'];
            }],
        ['T126', 'La semana va del lunes 00:00 al domingo 23:59 de Portugal: lo del domingo anterior y lo del lunes siguiente no cuenta',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                $yo = crearPersonasPrueba($pdo, ['Ana'])[0];
                $miercoles = new DateTimeImmutable('2099-03-04 12:00', new DateTimeZone(ZONA_HORARIA_POR_DEFECTO));
                [$desde, $hasta] = getLimitesSemanaBd($pdo, $miercoles);
                $mover = fn (string $hora, int $minutos): string =>
                    (new DateTimeImmutable($hora))->modify("$minutos minutes")->format('Y-m-d H:i:s');
                insertarSesionTerminadaEn($pdo, $yo, $zona, 1, $mover($desde, -1));
                insertarSesionTerminadaEn($pdo, $yo, $zona, 2, $desde);
                insertarSesionTerminadaEn($pdo, $yo, $zona, 4, $mover($hasta, -1));
                insertarSesionTerminadaEn($pdo, $yo, $zona, 8, $hasta);
                return getRanking($pdo, crearGrupoConPersonas($pdo, [$yo]), $yo, $miercoles)['total'] === 6;
            }],
        ['T127', 'Empate con la última sesión a la vez → va antes quien sumó más en las semanas anteriores',
            function () use ($pdo, $ranking): bool {
                $zona = crearZonaPrueba($pdo)['id'];
                [$yo, $constante] = crearPersonasPrueba($pdo, ['Ana', 'Zoe']);
                insertarSesionCerradaRanking($pdo, $yo, $zona, 5, 0);
                insertarSesionCerradaRanking($pdo, $constante, $zona, 5, 0);
                insertarSesionCerradaRanking($pdo, $constante, $zona, 12, 14);
                return array_column($ranking(crearGrupoConPersonas($pdo, [$yo, $constante]), $yo)['personas'], 'nombre')
                    === ['Zoe', 'Ana'];
            }],
        ['T128', 'Crear grupo: quien lo crea es admin, objetivo por defecto; nombre vacío o demasiado largo no vale',
            function () use ($pdo): bool {
                $yo = crearPersonasPrueba($pdo, ['Ana'])[0];
                $grupo = crearGrupo($pdo, $yo, '  Clase de LP  ');
                $detalle = getDetalleGrupo($pdo, $grupo, $yo);
                return $detalle['nombre'] === 'Clase de LP' && $detalle['es_admin']
                    && $detalle['objetivo'] === OBJETIVO_SEMANAL_PUNTOS
                    && crearGrupo($pdo, $yo, '   ') === null
                    && crearGrupo($pdo, $yo, str_repeat('a', GRUPO_NOMBRE_MAX_LENGTH + 1)) === null
                    && crearGrupo($pdo, $yo, 'Pareja', GRUPO_OBJETIVO_MAX + 1) === null;
            }],
        ['T129', 'Invitar: solo el admin y solo a amigos aceptados; dos veces a la misma persona → ya está',
            function () use ($pdo): bool {
                [$yo, $amiga, $desconocida, $miembro] = crearPersonasPrueba($pdo, ['Ana', 'Bea', 'Carla', 'Dani']);
                hacerAmigosPrueba($pdo, $yo, $amiga);
                hacerAmigosPrueba($pdo, $miembro, $amiga);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $miembro]);
                return invitarAGrupo($pdo, $grupo, $yo, $desconocida) === GRUPO_NO_AMIGO
                    && invitarAGrupo($pdo, $grupo, $miembro, $amiga) === GRUPO_NO_ADMIN
                    && invitarAGrupo($pdo, $grupo, $yo, $amiga) === GRUPO_OK
                    && invitarAGrupo($pdo, $grupo, $yo, $amiga) === GRUPO_YA_ESTA;
            }],
        ['T130', 'Invitación: aceptarla te mete en el grupo; rechazarla la borra; sin invitación no se puede aceptar',
            function () use ($pdo): bool {
                [$yo, $acepta, $rechaza] = crearPersonasPrueba($pdo, ['Ana', 'Bea', 'Carla']);
                hacerAmigosPrueba($pdo, $yo, $acepta);
                hacerAmigosPrueba($pdo, $yo, $rechaza);
                $grupo = crearGrupoConPersonas($pdo, [$yo]);
                invitarAGrupo($pdo, $grupo, $yo, $acepta);
                invitarAGrupo($pdo, $grupo, $yo, $rechaza);
                $invitaciones = count(findInvitacionesDe($pdo, $acepta));
                return $invitaciones === 1 && getRanking($pdo, $grupo, $acepta) === null
                    && responderInvitacion($pdo, $grupo, $acepta, true)
                    && getRolEnGrupo($pdo, $grupo, $acepta) === GRUPO_ROL_MIEMBRO
                    && responderInvitacion($pdo, $grupo, $rechaza, false)
                    && findEstadoEnGrupo($pdo, $grupo, $rechaza) === null
                    && !responderInvitacion($pdo, $grupo, $rechaza, true);
            }],
        ['T131', 'Editar nombre y objetivo: el admin sí; un miembro no; objetivo fuera de 1–2000 no',
            function () use ($pdo): bool {
                [$yo, $miembro] = crearPersonasPrueba($pdo, ['Ana', 'Bea']);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $miembro]);
                return editarGrupo($pdo, $grupo, $yo, 'Pareja', 120) === GRUPO_OK
                    && getDetalleGrupo($pdo, $grupo, $yo)['objetivo'] === 120
                    && editarGrupo($pdo, $grupo, $miembro, 'Otro', 10) === GRUPO_NO_ADMIN
                    && editarGrupo($pdo, $grupo, $yo, 'Pareja', 0) === GRUPO_DATOS_NO_VALIDOS;
            }],
        ['T132', 'Administración: el admin nombra a otro admin y le quita el cargo, pero nunca deja el grupo sin ninguno',
            function () use ($pdo): bool {
                [$yo, $miembro] = crearPersonasPrueba($pdo, ['Ana', 'Bea']);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $miembro]);
                return cambiarRolGrupo($pdo, $grupo, $yo, $yo, false) === GRUPO_ULTIMO_ADMIN
                    && cambiarRolGrupo($pdo, $grupo, $miembro, $yo, false) === GRUPO_NO_ADMIN
                    && cambiarRolGrupo($pdo, $grupo, $yo, $miembro, true) === GRUPO_OK
                    && cambiarRolGrupo($pdo, $grupo, $miembro, $yo, false) === GRUPO_OK
                    && getRolEnGrupo($pdo, $grupo, $yo) === GRUPO_ROL_MIEMBRO;
            }],
        ['T133', 'Salir: si se va el último admin, lo hereda quien lleva más tiempo; si no queda nadie, el grupo se borra',
            function () use ($pdo): bool {
                [$yo, $antigua, $nueva] = crearPersonasPrueba($pdo, ['Ana', 'Bea', 'Carla']);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $antigua, $nueva]);
                $pdo->prepare('UPDATE grupo_miembro SET fecha = NOW() - INTERVAL 1 DAY WHERE usuario_id = :id')
                    ->execute(['id' => $antigua]);
                $heredado = salirDeGrupo($pdo, $grupo, $yo) === GRUPO_OK
                    && getRolEnGrupo($pdo, $grupo, $antigua) === GRUPO_ROL_ADMIN;
                salirDeGrupo($pdo, $grupo, $antigua);
                salirDeGrupo($pdo, $grupo, $nueva);
                $existe = $pdo->prepare('SELECT COUNT(*) FROM grupo WHERE id = :id');
                $existe->execute(['id' => $grupo]);
                return $heredado && (int) $existe->fetchColumn() === 0;
            }],
        ['T134', 'Varios grupos: la misma persona ve un ranking distinto en cada uno y no ve los grupos en los que no está',
            function () use ($pdo): bool {
                [$yo, $clase, $pareja, $ajena] = crearPersonasPrueba($pdo, ['Ana', 'Bea', 'Carla', 'Dani']);
                $grupoClase = crearGrupoConPersonas($pdo, [$yo, $clase]);
                $grupoPareja = crearGrupoConPersonas($pdo, [$pareja, $yo]);
                $grupoAjeno = crearGrupoConPersonas($pdo, [$ajena]);
                $nombres = fn (int $grupo): array => array_column(getRanking($pdo, $grupo, $yo)['personas'], 'nombre');
                return count(findGruposDe($pdo, $yo)) === 2
                    && $nombres($grupoClase) === ['Ana', 'Bea'] && $nombres($grupoPareja) === ['Ana', 'Carla']
                    && getRanking($pdo, $grupoAjeno, $yo) === null && getDetalleGrupo($pdo, $grupoAjeno, $yo) === null;
            }],
        ['T135', 'Quitar: el admin saca a un miembro o anula una invitación; un miembro no puede quitar a nadie',
            function () use ($pdo): bool {
                [$yo, $miembro, $otro] = crearPersonasPrueba($pdo, ['Ana', 'Bea', 'Carla']);
                $grupo = crearGrupoConPersonas($pdo, [$yo, $miembro, $otro]);
                return quitarDeGrupo($pdo, $grupo, $miembro, $otro) === GRUPO_NO_ADMIN
                    && quitarDeGrupo($pdo, $grupo, $yo, $otro) === GRUPO_OK
                    && getRanking($pdo, $grupo, $otro) === null
                    && quitarDeGrupo($pdo, $grupo, $yo, $otro) === GRUPO_DATOS_NO_VALIDOS;
            }],
    ];
};

/** Estudiantes de prueba con estos nombres. Devuelve sus id en el mismo orden. */
function crearPersonasPrueba(PDO $pdo, array $nombres): array
{
    $consulta = $pdo->prepare('INSERT INTO usuario (nombre, email, password_hash) VALUES (:nombre, :email, :hash)');
    $ids = [];
    foreach ($nombres as $nombre) {
        $consulta->execute(['nombre' => $nombre, 'email' => crearEmailPrueba('unizar.es'), 'hash' => 'sin-contrasena-de-prueba']);
        $ids[] = (int) $pdo->lastInsertId();
    }
    return $ids;
}

/** Grupo con la primera persona de admin y el resto ya dentro (sin pasar por la invitación). */
function crearGrupoConPersonas(PDO $pdo, array $personas, int $objetivo = OBJETIVO_SEMANAL_PUNTOS): int
{
    $grupo = crearGrupo($pdo, $personas[0], 'Grupo de prueba', $objetivo);
    foreach (array_slice($personas, 1) as $persona) {
        insertarPersonaGrupo($pdo, $grupo, $persona, GRUPO_ROL_MIEMBRO, GRUPO_DENTRO, $personas[0]);
    }
    return $grupo;
}

function hacerAmigosPrueba(PDO $pdo, int $usuarioA, int $usuarioB): void
{
    $consulta = $pdo->prepare(
        'INSERT INTO amistad (solicitante_id, destinatario_id, estado) VALUES (:a, :b, :estado)'
    );
    $consulta->execute(['a' => $usuarioA, 'b' => $usuarioB, 'estado' => AMISTAD_ACEPTADA]);
}

/** Sesión ya cerrada en la zona, con sus puntos. $diasAtras = 0 la deja en esta semana. */
function insertarSesionCerradaRanking(PDO $pdo, int $usuarioId, int $zonaId, int $puntos, int $diasAtras): void
{
    $consulta = $pdo->prepare(
        'INSERT INTO sesion_estudio (usuario_id, zona_id, hora_inicio, hora_fin, estado, puntos_otorgados)
         VALUES (:usuario, :zona, NOW() - INTERVAL :dias_inicio DAY - INTERVAL 1 HOUR, NOW() - INTERVAL :dias_fin DAY,
                 :estado, :puntos)'
    );
    $consulta->execute([
        'usuario' => $usuarioId, 'zona' => $zonaId, 'dias_inicio' => $diasAtras, 'dias_fin' => $diasAtras,
        'estado' => RANKING_SESION_FINALIZADA, 'puntos' => $puntos,
    ]);
}

/** Sesión todavía abierta que empezó hace $minutos (para probar la caducidad al leer). */
function insertarSesionActivaRanking(PDO $pdo, int $usuarioId, int $zonaId, int $minutos): void
{
    $consulta = $pdo->prepare(
        'INSERT INTO sesion_estudio (usuario_id, zona_id, hora_inicio, estado)
         VALUES (:usuario, :zona, NOW() - INTERVAL :minutos MINUTE, :estado)'
    );
    $consulta->execute(['usuario' => $usuarioId, 'zona' => $zonaId, 'minutos' => $minutos, 'estado' => 'active']);
}

/** Sesión cerrada hace $minutos con sus puntos (para el desempate por quién llegó antes). */
function insertarSesionHaceMinutos(PDO $pdo, int $usuarioId, int $zonaId, int $puntos, int $minutos): void
{
    $consulta = $pdo->prepare(
        'INSERT INTO sesion_estudio (usuario_id, zona_id, hora_inicio, hora_fin, estado, puntos_otorgados)
         VALUES (:usuario, :zona, NOW() - INTERVAL :inicio MINUTE, NOW() - INTERVAL :fin MINUTE, :estado, :puntos)'
    );
    $consulta->execute([
        'usuario' => $usuarioId, 'zona' => $zonaId, 'inicio' => $minutos + 60, 'fin' => $minutos,
        'estado' => RANKING_SESION_FINALIZADA, 'puntos' => $puntos,
    ]);
}

/** Sesión cerrada que terminó justo en $horaFin (hora de la BD). */
function insertarSesionTerminadaEn(PDO $pdo, int $usuarioId, int $zonaId, int $puntos, string $horaFin): void
{
    $consulta = $pdo->prepare(
        'INSERT INTO sesion_estudio (usuario_id, zona_id, hora_inicio, hora_fin, estado, puntos_otorgados)
         VALUES (:usuario, :zona, :inicio - INTERVAL 1 HOUR, :fin, :estado, :puntos)'
    );
    $consulta->execute([
        'usuario' => $usuarioId, 'zona' => $zonaId, 'inicio' => $horaFin, 'fin' => $horaFin,
        'estado' => RANKING_SESION_FINALIZADA, 'puntos' => $puntos,
    ]);
}
