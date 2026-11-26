<?php
/*
 * Tests funcionales de US03 (ocupación actual y fiabilidad) y US05 (franjas típicas, ley de Little).
 * La biblioteca de prueba tiene capacidad 100 y factor de adopción 1: n sesiones activas = n %.
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';
require_once __DIR__ . '/../src/Usuarios/usuarios.php';
require_once __DIR__ . '/../src/Ocupacion/ocupacion.php';
require_once __DIR__ . '/../src/Ocupacion/franjas.php';

// Un lunes fijo para que los tests de franjas no dependan del día en que se ejecutan.
const TEST_LUNES = '2026-11-02';

return function (PDO $pdo): array {
    return [
        ['T101', 'Fiabilidad: 4 usuarios → baja, 5 → media, 14 → media, 15 → alta',
            function (): bool {
                return calcularFiabilidad(4) === FIABILIDAD_BAJA
                    && calcularFiabilidad(5) === FIABILIDAD_MEDIA
                    && calcularFiabilidad(14) === FIABILIDAD_MEDIA
                    && calcularFiabilidad(15) === FIABILIDAD_ALTA;
            }],
        ['T102', 'Ocupación = sesiones ÷ factor ÷ capacidad: 3 sesiones, factor 0,3, capacidad 40 → 25 %; nunca más de 100 %',
            function (): bool {
                return calcularPorcentajeOcupacion(3, 0.3, 40) === 25
                    && calcularPorcentajeOcupacion(0, 0.3, 40) === 0
                    && calcularPorcentajeOcupacion(50, 0.3, 40) === 100;
            }],
        ['T103', 'Biblioteca con 3 sesiones activas → 3 %, fiabilidad baja, 3 usuarios activos y su dirección (buscador)',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo);
                for ($i = 0; $i < 3; $i++) {
                    insertSesionPrueba($pdo, crearUsuarioPruebaConId($pdo), $zona['id'], 'NOW()', 'active');
                }
                $biblioteca = findOcupacionDeZona($pdo, $zona['id']);
                return $biblioteca['ocupacion'] === 3 && $biblioteca['fiabilidad'] === FIABILIDAD_BAJA
                    && $biblioteca['usuarios_activos'] === 3 && $biblioteca['direccion'] === 'Dirección de prueba';
            }],
        ['T104', 'Sesión activa de más de 4 h → se cierra antes de contar y no suma ocupación',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo);
                $usuario = crearUsuarioPruebaConId($pdo);
                insertSesionPrueba($pdo, $usuario, $zona['id'], 'NOW() - INTERVAL 241 MINUTE', 'active');
                $biblioteca = findOcupacionDeZona($pdo, $zona['id']);
                return $biblioteca['ocupacion'] === 0 && findUltimaSesion($pdo, $usuario)['estado'] === 'expired';
            }],
        ['T105', 'Sesiones terminadas no cuentan para la ocupación actual',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo);
                insertSesionPrueba($pdo, crearUsuarioPruebaConId($pdo), $zona['id'], 'NOW() - INTERVAL 60 MINUTE', 'finished', 30);
                return findOcupacionDeZona($pdo, $zona['id'])['usuarios_activos'] === 0;
            }],
        ['T106', 'Detalle de biblioteca: trae dirección y horario (null hasta US08); si no existe → null (404)',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo);
                $detalle = getDetalleBiblioteca($pdo, findBibliotecaDeZona($pdo, $zona['id']));
                return $detalle !== null && $detalle['direccion'] !== '' && $detalle['horario_hoy'] === null
                    && getDetalleBiblioteca($pdo, PHP_INT_MAX) === null;
            }],
        ['T107', 'Día de la semana: 1 (lunes) a 7 (domingo) válidos; 0 y 8 no (400)',
            function (): bool {
                return isDiaSemanaValido(1) && isDiaSemanaValido(7)
                    && !isDiaSemanaValido(0) && !isDiaSemanaValido(8);
            }],
        ['T108', 'Días de histórico: del lunes 2 al lunes 16 hay 3 lunes y 2 martes',
            function (): bool {
                $desde = new DateTimeImmutable(TEST_LUNES);
                $hasta = $desde->modify('+14 days');
                return contarDiasSemanaEntre($desde, $hasta, 1) === 3
                    && contarDiasSemanaEntre($desde, $hasta, 2) === 2
                    && contarDiasSemanaEntre($hasta, $desde, 1) === 0;
            }],
        ['T109', 'Little: 10 llegadas en 2 días, W = 1,5 h, factor 0,5, capacidad 40 → λ = 10, L = 15 → 38 %',
            function (): bool {
                return calcularOcupacionFranja(10, 2, 1.5, 0.5, 40) === 38
                    && calcularOcupacionFranja(10, 0, 1.5, 0.5, 40) === 0;
            }],
        ['T110', 'Franjas con histórico: 2 sesiones de 1 h un lunes a las 10 → lunes 10 h = 2 %, la hora más llena',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo);
                foreach ([0, 1] as $i) {
                    insertSesionPrueba($pdo, crearUsuarioPruebaConId($pdo), $zona['id'], "'" . TEST_LUNES . " 10:0{$i}:00'", 'finished', 60);
                }
                $franjas = getFranjasTipicas($pdo, findBibliotecaDeZona($pdo, $zona['id']), 1, new DateTimeImmutable(TEST_LUNES));
                $diez = array_values(array_filter($franjas['franjas'], fn (array $f): bool => $f['hora'] === 10))[0];
                return $franjas['hay_datos'] && $diez['ocupacion'] === 2 && $franjas['hora_mas_llena'] === 10;
            }],
        ['T111', 'Franjas sin histórico → sin datos y todo a 0; biblioteca que no existe → null (404)',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo);
                $franjas = getFranjasTipicas($pdo, findBibliotecaDeZona($pdo, $zona['id']), 3);
                return $franjas['hay_datos'] === false && $franjas['hora_mas_llena'] === null
                    && array_sum(array_column($franjas['franjas'], 'ocupacion')) === 0
                    && getFranjasTipicas($pdo, PHP_INT_MAX, 3) === null;
            }],
    ];
};

/**
 * Inserta una sesión de prueba. $inicioSql es una expresión SQL fija escrita en el propio test
 * (NOW() - INTERVAL …, o una fecha entre comillas), nunca datos de fuera.
 */
function insertSesionPrueba(PDO $pdo, int $usuarioId, int $zonaId, string $inicioSql, string $estado, int $minutos = 0): void
{
    $fin = $estado === 'active' ? 'NULL' : "{$inicioSql} + INTERVAL :minutos MINUTE";
    $consulta = $pdo->prepare(
        "INSERT INTO sesion_estudio (usuario_id, zona_id, hora_inicio, hora_fin, estado)
         VALUES (:usuario, :zona, {$inicioSql}, {$fin}, :estado)"
    );
    $parametros = ['usuario' => $usuarioId, 'zona' => $zonaId, 'estado' => $estado];
    if ($estado !== 'active') {
        $parametros['minutos'] = $minutos;
    }
    $consulta->execute($parametros);
}

function findBibliotecaDeZona(PDO $pdo, int $zonaId): int
{
    $consulta = $pdo->prepare('SELECT biblioteca_id FROM zona WHERE id = :id');
    $consulta->execute(['id' => $zonaId]);
    return (int) $consulta->fetchColumn();
}

/** Ocupación (como la devuelve getOcupacionBibliotecas) de la biblioteca de esa zona. */
function findOcupacionDeZona(PDO $pdo, int $zonaId): array
{
    $bibliotecaId = findBibliotecaDeZona($pdo, $zonaId);
    foreach (getOcupacionBibliotecas($pdo) as $biblioteca) {
        if ($biblioteca['id'] === $bibliotecaId) {
            return $biblioteca;
        }
    }
    return [];
}
