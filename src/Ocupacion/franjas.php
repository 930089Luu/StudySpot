<?php
/*
 * Franjas típicas de ocupación por día y hora (US05), con la ley de Little: L = λ · W.
 *
 * Para un día de la semana y una hora h de una biblioteca:
 *   λ = check-ins que empezaron a esa hora ese día de la semana ÷ cuántos de esos días hay en el
 *       histórico (media de llegadas por hora), ÷ factor_adopcion (como en la ocupación actual)
 *   W = duración media de las sesiones ya cerradas de la biblioteca, en horas
 *   L = λ · W = personas que se esperan en esa franja; % = L ÷ capacidad_maxima
 * Es la versión periódica de Little del Sprint 1 (Whitt y Zhang, 2019), simplificada: la gente
 * que llega a la hora h se cuenta en la franja h. Solo se usa aquí, no en la ocupación actual.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/../Database/conexion.php';
require_once __DIR__ . '/ocupacion.php';

/** Indica si $dia es un día de la semana válido (1 = lunes … 7 = domingo). */
function isDiaSemanaValido(int $dia): bool
{
    return $dia >= DIA_SEMANA_MIN && $dia <= DIA_SEMANA_MAX;
}

/**
 * Ocupación típica de cada hora de un día de la semana, o null si la biblioteca no existe.
 * Devuelve {dia, hay_datos, franjas: [{hora, ocupacion}], hora_mas_llena, hora_mas_tranquila}.
 * $hoy se puede fijar en los tests; por defecto es la fecha actual.
 */
function getFranjasTipicas(PDO $pdo, int $bibliotecaId, int $dia, ?DateTimeImmutable $hoy = null): ?array
{
    $biblioteca = findCapacidadBiblioteca($pdo, $bibliotecaId);
    if ($biblioteca === null) {
        return null;
    }
    $primerDia = findPrimerDiaHistorico($pdo, $bibliotecaId);
    $dias = $primerDia === null ? 0 : contarDiasSemanaEntre($primerDia, $hoy ?? new DateTimeImmutable('today'), $dia);
    $llegadas = findLlegadasPorHora($pdo, $bibliotecaId, $dia);
    $duracionMediaHoras = findDuracionMediaHoras($pdo, $bibliotecaId);

    $franjas = [];
    for ($hora = FRANJA_PRIMERA_HORA; $hora <= FRANJA_ULTIMA_HORA; $hora++) {
        $franjas[] = [
            'hora' => $hora,
            'ocupacion' => calcularOcupacionFranja(
                $llegadas[$hora] ?? 0, $dias, $duracionMediaHoras,
                $biblioteca['factor_adopcion'], $biblioteca['capacidad_maxima']
            ),
        ];
    }
    $hayDatos = array_sum(array_column($franjas, 'ocupacion')) > 0;
    return [
        'dia' => $dia,
        'hay_datos' => $hayDatos,
        'franjas' => $franjas,
        'hora_mas_llena' => $hayDatos ? findHoraExtrema($franjas, true) : null,
        'hora_mas_tranquila' => $hayDatos ? findHoraExtrema($franjas, false) : null,
    ];
}

/** L = λ · W convertido en % de la capacidad (como mucho OCUPACION_MAX_PORCENTAJE). */
function calcularOcupacionFranja(int $llegadas, int $dias, float $duracionMediaHoras, float $factorAdopcion, int $capacidad): int
{
    if ($dias <= 0 || $factorAdopcion <= 0 || $capacidad <= 0) {
        return 0;
    }
    $lambda = $llegadas / $dias / $factorAdopcion;   // llegadas por hora (estimadas, todos los estudiantes)
    $personas = $lambda * $duracionMediaHoras;        // L = λ · W
    return min((int) round($personas / $capacidad * 100), OCUPACION_MAX_PORCENTAJE);
}

/** Cuántos días con ese día de la semana (1 = lunes … 7 = domingo) hay entre dos fechas, ambas incluidas. */
function contarDiasSemanaEntre(DateTimeImmutable $desde, DateTimeImmutable $hasta, int $dia): int
{
    if ($hasta < $desde) {
        return 0;
    }
    $saltoHastaElPrimero = ($dia - (int) $desde->format('N') + 7) % 7;
    $primero = $desde->modify("+{$saltoHastaElPrimero} days");
    if ($primero > $hasta) {
        return 0;
    }
    return intdiv((int) $primero->diff($hasta)->days, 7) + 1;
}

/** Hora con más (o con menos) ocupación. Si empatan, la primera. */
function findHoraExtrema(array $franjas, bool $mayor): int
{
    $elegida = $franjas[0];
    foreach ($franjas as $franja) {
        $esMejor = $mayor ? $franja['ocupacion'] > $elegida['ocupacion'] : $franja['ocupacion'] < $elegida['ocupacion'];
        if ($esMejor) {
            $elegida = $franja;
        }
    }
    return $elegida['hora'];
}

/** Capacidad y factor de adopción de la biblioteca, o null si no existe. */
function findCapacidadBiblioteca(PDO $pdo, int $bibliotecaId): ?array
{
    $consulta = $pdo->prepare('SELECT capacidad_maxima, factor_adopcion FROM biblioteca WHERE id = :id');
    $consulta->execute(['id' => $bibliotecaId]);
    $fila = $consulta->fetch(PDO::FETCH_ASSOC);
    if ($fila === false) {
        return null;
    }
    return ['capacidad_maxima' => (int) $fila['capacidad_maxima'], 'factor_adopcion' => (float) $fila['factor_adopcion']];
}

/** Fecha de la primera sesión de la biblioteca (inicio del histórico), o null si no tiene. */
function findPrimerDiaHistorico(PDO $pdo, int $bibliotecaId): ?DateTimeImmutable
{
    $consulta = $pdo->prepare(
        'SELECT MIN(DATE(s.hora_inicio)) FROM sesion_estudio s
         JOIN zona z ON z.id = s.zona_id WHERE z.biblioteca_id = :id'
    );
    $consulta->execute(['id' => $bibliotecaId]);
    $fecha = $consulta->fetchColumn();
    return $fecha ? new DateTimeImmutable($fecha) : null;
}

/** Check-ins de ese día de la semana agrupados por hora de inicio: [hora => número]. */
function findLlegadasPorHora(PDO $pdo, int $bibliotecaId, int $dia): array
{
    // WEEKDAY() de MySQL: 0 = lunes … 6 = domingo.
    $consulta = $pdo->prepare(
        'SELECT HOUR(s.hora_inicio) AS hora, COUNT(*) AS llegadas
         FROM sesion_estudio s
         JOIN zona z ON z.id = s.zona_id
         WHERE z.biblioteca_id = :id AND WEEKDAY(s.hora_inicio) = :weekday
         GROUP BY HOUR(s.hora_inicio)'
    );
    $consulta->execute(['id' => $bibliotecaId, 'weekday' => $dia - 1]);
    $llegadas = [];
    foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
        $llegadas[(int) $fila['hora']] = (int) $fila['llegadas'];
    }
    return $llegadas;
}

/** W: duración media en horas de las sesiones cerradas (finished o expired) de la biblioteca. */
function findDuracionMediaHoras(PDO $pdo, int $bibliotecaId): float
{
    $consulta = $pdo->prepare(
        "SELECT AVG(TIMESTAMPDIFF(SECOND, s.hora_inicio, s.hora_fin)) / 3600
         FROM sesion_estudio s
         JOIN zona z ON z.id = s.zona_id
         WHERE z.biblioteca_id = :id AND s.estado IN ('finished', 'expired')"
    );
    $consulta->execute(['id' => $bibliotecaId]);
    return (float) ($consulta->fetchColumn() ?: 0);
}
