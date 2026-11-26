<?php
/*
 * Horarios de las bibliotecas (US08): horario semanal y calendario especial (exámenes, Navidad…).
 * Solo los administradores los cambian; su rol se lee de la BD en cada petición.
 * Solo SQL con sentencias preparadas.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/../Database/conexion.php';
require_once __DIR__ . '/../Usuarios/favorita.php'; // existeBiblioteca

const ROL_ADMIN = 'admin';
const HORA_FORMATO = '/^([01]\d|2[0-3]):[0-5]\d$/';
// Estado de apertura en este momento (mapa, lista, tarjeta y detalle).
const ESTADO_ABIERTA = 'abierta';
const ESTADO_ABRE_HOY = 'abre_hoy';
const ESTADO_CERRADA = 'cerrada';

/** true si el usuario es administrador. Se consulta la BD en cada petición, no la sesión. */
function esAdministrador(PDO $pdo, int $usuarioId): bool
{
    $consulta = $pdo->prepare('SELECT rol FROM usuario WHERE id = :id');
    $consulta->execute(['id' => $usuarioId]);
    return $consulta->fetchColumn() === ROL_ADMIN;
}

/** Horas de un día: las dos a null = cerrado; si no, HH:MM y apertura antes que cierre. */
function validarHoras(mixed $apertura, mixed $cierre): bool
{
    if ($apertura === null && $cierre === null) {
        return true;
    }
    return is_string($apertura) && is_string($cierre)
        && preg_match(HORA_FORMATO, $apertura) === 1
        && preg_match(HORA_FORMATO, $cierre) === 1
        && $apertura < $cierre;
}

/** Semana completa: cada día de 1 a 7 una sola vez, con horas válidas. */
function validarSemana(array $semana): bool
{
    $dias = [];
    foreach ($semana as $entrada) {
        $dia = is_array($entrada) ? ($entrada['dia'] ?? null) : null;
        if (!is_int($dia) || $dia < DIA_SEMANA_MIN || $dia > DIA_SEMANA_MAX || in_array($dia, $dias, true)) {
            return false;
        }
        if (!validarHoras($entrada['apertura'] ?? null, $entrada['cierre'] ?? null)) {
            return false;
        }
        $dias[] = $dia;
    }
    return count($dias) === DIA_SEMANA_MAX - DIA_SEMANA_MIN + 1;
}

/** Número de caracteres (no de bytes) de un texto UTF-8, sin depender de mbstring. */
function longitudCaracteres(string $texto): int
{
    return (int) preg_match_all('/./su', $texto);
}

function esFechaValida(string $fecha): bool
{
    $fechaObjeto = DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
    return $fechaObjeto !== false && $fechaObjeto->format('Y-m-d') === $fecha;
}

/** Periodo especial: fechas válidas y en orden, descripción y horas coherentes con "cerrado". */
function validarEspecial(array $especial): bool
{
    $inicio = $especial['fecha_inicio'] ?? null;
    $fin = $especial['fecha_fin'] ?? null;
    $descripcion = $especial['descripcion'] ?? null;
    $cerrado = $especial['cerrado'] ?? null;
    if (!is_string($inicio) || !is_string($fin) || !esFechaValida($inicio) || !esFechaValida($fin) || $inicio > $fin) {
        return false;
    }
    if (!is_string($descripcion) || trim($descripcion) === '' || longitudCaracteres($descripcion) > DESCRIPCION_ESPECIAL_MAX_LENGTH) {
        return false;
    }
    return is_bool($cerrado) && validarHorasEspecial($cerrado, $especial['apertura'] ?? null, $especial['cierre'] ?? null);
}

/** Un día cerrado no lleva horas; un día con horario especial sí, y deben ser válidas. */
function validarHorasEspecial(bool $cerrado, mixed $apertura, mixed $cierre): bool
{
    if ($cerrado) {
        return $apertura === null && $cierre === null;
    }
    return is_string($apertura) && is_string($cierre) && validarHoras($apertura, $cierre);
}

/** Hora de MySQL ("08:00:00") a "08:00"; null se queda null. */
function formatearHora(?string $hora): ?string
{
    return $hora === null ? null : substr($hora, 0, 5);
}

/** Los 7 días de la semana con sus horas; los días sin fila salen cerrados. */
function findHorarioSemana(PDO $pdo, int $bibliotecaId): array
{
    $consulta = $pdo->prepare(
        'SELECT dia_semana, hora_apertura, hora_cierre FROM horario_biblioteca WHERE biblioteca_id = :id'
    );
    $consulta->execute(['id' => $bibliotecaId]);
    $porDia = [];
    foreach ($consulta->fetchAll() as $fila) {
        $porDia[(int) $fila['dia_semana']] = $fila;
    }
    $semana = [];
    for ($dia = DIA_SEMANA_MIN; $dia <= DIA_SEMANA_MAX; $dia++) {
        $fila = $porDia[$dia] ?? null;
        $semana[] = [
            'dia' => $dia,
            'apertura' => formatearHora($fila['hora_apertura'] ?? null),
            'cierre' => formatearHora($fila['hora_cierre'] ?? null),
        ];
    }
    return $semana;
}

/** Sustituye el horario semanal entero de la biblioteca. Todo o nada (transacción). */
function guardarHorarioSemana(PDO $pdo, int $bibliotecaId, array $semana): void
{
    $pdo->beginTransaction();
    try {
        $borrar = $pdo->prepare('DELETE FROM horario_biblioteca WHERE biblioteca_id = :id');
        $borrar->execute(['id' => $bibliotecaId]);
        $insertar = $pdo->prepare(
            'INSERT INTO horario_biblioteca (biblioteca_id, dia_semana, hora_apertura, hora_cierre)
             VALUES (:id, :dia, :apertura, :cierre)'
        );
        foreach ($semana as $dia) {
            $insertar->execute([
                'id' => $bibliotecaId,
                'dia' => $dia['dia'],
                'apertura' => $dia['apertura'] ?? null,
                'cierre' => $dia['cierre'] ?? null,
            ]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}

function findCalendarioEspecial(PDO $pdo, int $bibliotecaId): array
{
    $consulta = $pdo->prepare(
        'SELECT id, fecha_inicio, fecha_fin, descripcion, cerrado, hora_apertura, hora_cierre
         FROM calendario_especial WHERE biblioteca_id = :id ORDER BY fecha_inicio'
    );
    $consulta->execute(['id' => $bibliotecaId]);
    return array_map(static fn (array $fila): array => [
        'id' => (int) $fila['id'],
        'fecha_inicio' => $fila['fecha_inicio'],
        'fecha_fin' => $fila['fecha_fin'],
        'descripcion' => $fila['descripcion'],
        'cerrado' => (bool) $fila['cerrado'],
        'apertura' => formatearHora($fila['hora_apertura']),
        'cierre' => formatearHora($fila['hora_cierre']),
    ], $consulta->fetchAll());
}

/** true si ya hay un periodo especial que toca alguno de los días de [inicio, fin]. */
function existeSolapeEspecial(PDO $pdo, int $bibliotecaId, string $inicio, string $fin): bool
{
    $consulta = $pdo->prepare(
        'SELECT 1 FROM calendario_especial
         WHERE biblioteca_id = :id AND fecha_inicio <= :fin AND fecha_fin >= :inicio LIMIT 1'
    );
    $consulta->execute(['id' => $bibliotecaId, 'inicio' => $inicio, 'fin' => $fin]);
    return $consulta->fetchColumn() !== false;
}

/** Añade un periodo especial. Devuelve false si se solapa con otro de la misma biblioteca. */
function insertarEspecial(PDO $pdo, int $bibliotecaId, array $especial): bool
{
    if (existeSolapeEspecial($pdo, $bibliotecaId, $especial['fecha_inicio'], $especial['fecha_fin'])) {
        return false;
    }
    $consulta = $pdo->prepare(
        'INSERT INTO calendario_especial
            (biblioteca_id, fecha_inicio, fecha_fin, descripcion, cerrado, hora_apertura, hora_cierre)
         VALUES (:id, :inicio, :fin, :descripcion, :cerrado, :apertura, :cierre)'
    );
    $consulta->execute([
        'id' => $bibliotecaId,
        'inicio' => $especial['fecha_inicio'],
        'fin' => $especial['fecha_fin'],
        'descripcion' => $especial['descripcion'],
        'cerrado' => $especial['cerrado'] ? 1 : 0,
        'apertura' => $especial['apertura'],
        'cierre' => $especial['cierre'],
    ]);
    return true;
}

/** Borra un periodo especial de esa biblioteca. false si no existía. */
function borrarEspecial(PDO $pdo, int $bibliotecaId, int $especialId): bool
{
    $consulta = $pdo->prepare('DELETE FROM calendario_especial WHERE id = :id AND biblioteca_id = :biblioteca');
    $consulta->execute(['id' => $especialId, 'biblioteca' => $bibliotecaId]);
    return $consulta->rowCount() === 1;
}

/** Periodo especial que cubre esa fecha (Y-m-d), o null. */
function findEspecialQueCubre(PDO $pdo, int $bibliotecaId, string $fecha): ?array
{
    $consulta = $pdo->prepare(
        'SELECT descripcion, cerrado, hora_apertura, hora_cierre FROM calendario_especial
         WHERE biblioteca_id = :id AND :fecha BETWEEN fecha_inicio AND fecha_fin LIMIT 1'
    );
    $consulta->execute(['id' => $bibliotecaId, 'fecha' => $fecha]);
    $fila = $consulta->fetch();
    if ($fila === false) {
        return null;
    }
    return [
        'descripcion' => $fila['descripcion'],
        'cerrado' => (bool) $fila['cerrado'],
        'apertura' => formatearHora($fila['hora_apertura']),
        'cierre' => formatearHora($fila['hora_cierre']),
    ];
}

/** Horario normal de un día de la semana (1 = lunes … 7 = domingo), o null si no está definido. */
function findHorarioDia(PDO $pdo, int $bibliotecaId, int $dia): ?array
{
    $consulta = $pdo->prepare(
        'SELECT hora_apertura, hora_cierre FROM horario_biblioteca WHERE biblioteca_id = :id AND dia_semana = :dia'
    );
    $consulta->execute(['id' => $bibliotecaId, 'dia' => $dia]);
    $fila = $consulta->fetch();
    if ($fila === false) {
        return null;
    }
    return [
        'apertura' => formatearHora($fila['hora_apertura']),
        'cierre' => formatearHora($fila['hora_cierre']),
    ];
}

/**
 * Horario que se muestra para un día. Un periodo especial gana al horario normal.
 * Devuelve cerrado, apertura, cierre y motivo, o null si no hay horario para ese día.
 */
function resolverHorario(?array $especial, ?array $regular): ?array
{
    if ($especial !== null) {
        return [
            'cerrado' => $especial['cerrado'],
            'apertura' => $especial['apertura'],
            'cierre' => $especial['cierre'],
            'motivo' => $especial['descripcion'],
        ];
    }
    if ($regular === null) {
        return null;
    }
    return [
        'cerrado' => $regular['apertura'] === null,
        'apertura' => $regular['apertura'],
        'cierre' => $regular['cierre'],
        'motivo' => null,
    ];
}

/** Horario de hoy de una biblioteca, para la pantalla de detalle. */
function findHorarioHoy(PDO $pdo, int $bibliotecaId, DateTimeImmutable $hoy): ?array
{
    $especial = findEspecialQueCubre($pdo, $bibliotecaId, $hoy->format('Y-m-d'));
    $regular = findHorarioDia($pdo, $bibliotecaId, (int) $hoy->format('N'));
    return resolverHorario($especial, $regular);
}

/** El momento actual. Se pasa a la hora local de cada biblioteca con getHoraLocal. */
function getAhora(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('UTC'));
}

/** true si es una zona horaria de Europa: "Europe/…" o una de ZONAS_HORARIAS_EUROPA_ATLANTICO. */
function isZonaHorariaEuropea(string $zona): bool
{
    return in_array($zona, DateTimeZone::listIdentifiers(DateTimeZone::EUROPE), true)
        || in_array($zona, ZONAS_HORARIAS_EUROPA_ATLANTICO, true);
}

/**
 * Ese momento en la hora local de la biblioteca. Si su zona horaria no es europea válida (dato
 * mal escrito en la BD) se usa ZONA_HORARIA_POR_DEFECTO y se deja aviso en el log: así no se
 * rompe el mapa de todas las bibliotecas por una.
 */
function getHoraLocal(DateTimeImmutable $momento, string $zonaHoraria): DateTimeImmutable
{
    if (!isZonaHorariaEuropea($zonaHoraria)) {
        error_log("StudySpot: zona horaria no válida '$zonaHoraria'; se usa " . ZONA_HORARIA_POR_DEFECTO);
        $zonaHoraria = ZONA_HORARIA_POR_DEFECTO;
    }
    return $momento->setTimezone(new DateTimeZone($zonaHoraria));
}

/**
 * Estado de la biblioteca a una hora ("HH:MM") según su horario de hoy:
 * ESTADO_ABIERTA, ESTADO_ABRE_HOY (aún no ha abierto), ESTADO_CERRADA (ya cerró o no abre hoy),
 * o null si no hay horario (no se sabe: no se marca como cerrada).
 */
function getEstadoApertura(?array $horarioHoy, string $hora): ?string
{
    if ($horarioHoy === null) {
        return null;
    }
    if ($horarioHoy['cerrado']) {
        return ESTADO_CERRADA;
    }
    if ($hora < $horarioHoy['apertura']) {
        return ESTADO_ABRE_HOY;
    }
    return $hora < $horarioHoy['cierre'] ? ESTADO_ABIERTA : ESTADO_CERRADA;
}

/**
 * Horario de hoy y estado de apertura de una biblioteca en un momento dado. "Hoy" y la hora son
 * los de la biblioteca (su zona horaria): el horario se muestra en su hora local, como en Apple Maps.
 */
function getAperturaBiblioteca(PDO $pdo, int $bibliotecaId, string $zonaHoraria, DateTimeImmutable $ahora): array
{
    $local = getHoraLocal($ahora, $zonaHoraria);
    $horario = findHorarioHoy($pdo, $bibliotecaId, $local);
    return ['horario_hoy' => $horario, 'estado_apertura' => getEstadoApertura($horario, $local->format('H:i'))];
}

/** true solo si se sabe que está cerrada ahora; sin horario no se impide nada. */
function isCerradaAhora(PDO $pdo, int $bibliotecaId, string $zonaHoraria, DateTimeImmutable $ahora): bool
{
    $estado = getAperturaBiblioteca($pdo, $bibliotecaId, $zonaHoraria, $ahora)['estado_apertura'];
    return $estado === ESTADO_CERRADA || $estado === ESTADO_ABRE_HOY;
}
