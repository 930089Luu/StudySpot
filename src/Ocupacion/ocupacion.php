<?php
/*
 * Ocupación actual de las bibliotecas (US03).
 *
 * Cómo se estima (corrección del profesor en el Sprint 1: NO es la ley de Little):
 *   personas estimadas = sesiones activas ÷ factor_adopcion
 *   % de ocupación     = personas estimadas ÷ capacidad_maxima
 * El factor de adopción es la parte de los estudiantes que usa la app: con 0,3, cada sesión
 * activa representa a unas 3 personas. La ocupación no se guarda en la BD: se calcula al pedirla.
 *
 * Junto al % va siempre la fiabilidad: con pocos usuarios activos la estimación vale menos.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/../Database/conexion.php';
require_once __DIR__ . '/../Sesiones/estudio.php';

/** Ocupación de todas las bibliotecas, para el mapa y la lista. */
function getOcupacionBibliotecas(PDO $pdo): array
{
    // Las sesiones de más de 4 h no cuentan: se cierran antes de contar.
    cerrarSesionesCaducadas($pdo);
    return array_map('formatearOcupacion', findBibliotecasConSesionesActivas($pdo, null));
}

/** Detalle de una biblioteca con su ocupación, o null si no existe. */
function getDetalleBiblioteca(PDO $pdo, int $bibliotecaId): ?array
{
    cerrarSesionesCaducadas($pdo);
    $filas = findBibliotecasConSesionesActivas($pdo, $bibliotecaId);
    if ($filas === []) {
        return null;
    }
    $fila = $filas[0];
    return formatearOcupacion($fila) + [
        'direccion' => $fila['direccion'],
        'foto_url' => $fila['foto_url'],
        // Los horarios son de US08 (pendiente): hasta entonces la pantalla muestra "Horario no disponible".
        'horario_hoy' => null,
    ];
}

/** % de ocupación estimado, de 0 a OCUPACION_MAX_PORCENTAJE. */
function calcularPorcentajeOcupacion(int $sesionesActivas, float $factorAdopcion, int $capacidadMaxima): int
{
    if ($factorAdopcion <= 0 || $capacidadMaxima <= 0) {
        return 0;
    }
    $personasEstimadas = $sesionesActivas / $factorAdopcion;
    $porcentaje = (int) round($personasEstimadas / $capacidadMaxima * 100);
    return min($porcentaje, OCUPACION_MAX_PORCENTAJE);
}

/** Fiabilidad de la estimación según los usuarios activos: baja < 5 · media 5–14 · alta ≥ 15. */
function calcularFiabilidad(int $usuariosActivos): string
{
    if ($usuariosActivos >= UMBRAL_FIABILIDAD_ALTA) {
        return FIABILIDAD_ALTA;
    }
    return $usuariosActivos >= UMBRAL_FIABILIDAD_MEDIA ? FIABILIDAD_MEDIA : FIABILIDAD_BAJA;
}

function formatearOcupacion(array $fila): array
{
    $activas = (int) $fila['sesiones_activas'];
    return [
        'id' => (int) $fila['id'],
        'nombre' => $fila['nombre'],
        'latitud' => (float) $fila['latitud'],
        'longitud' => (float) $fila['longitud'],
        'ocupacion' => calcularPorcentajeOcupacion($activas, (float) $fila['factor_adopcion'], (int) $fila['capacidad_maxima']),
        'fiabilidad' => calcularFiabilidad($activas),
        'usuarios_activos' => $activas,
    ];
}

/**
 * Bibliotecas con su número de sesiones activas (una por usuario, así que también son los
 * usuarios activos). Con $bibliotecaId = null, todas.
 */
function findBibliotecasConSesionesActivas(PDO $pdo, ?int $bibliotecaId): array
{
    $consulta = $pdo->prepare(
        "SELECT b.id, b.nombre, b.direccion, b.foto_url, b.latitud, b.longitud,
                b.capacidad_maxima, b.factor_adopcion, COUNT(s.id) AS sesiones_activas
         FROM biblioteca b
         LEFT JOIN zona z ON z.biblioteca_id = b.id
         LEFT JOIN sesion_estudio s ON s.zona_id = z.id AND s.estado = 'active'
         WHERE :todas = 1 OR b.id = :id
         GROUP BY b.id
         ORDER BY b.nombre"
    );
    $consulta->execute(['todas' => $bibliotecaId === null ? 1 : 0, 'id' => $bibliotecaId ?? 0]);
    return $consulta->fetchAll(PDO::FETCH_ASSOC);
}
