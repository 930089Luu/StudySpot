<?php
/*
 * Tests funcionales de US02: check-in por QR (≤ 150 m), check-out, caducidad a las 4 h
 * y privacidad (las coordenadas del móvil no se guardan). Incluye el cálculo de puntos
 * que usa el check-out (US04).
 * Usa una biblioteca de prueba propia, que run_tests.php borra al terminar.
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';
require_once __DIR__ . '/../src/Sesiones/estudio.php';

// Metros que mide un grado de latitud con RADIO_TIERRA_METROS (circunferencia / 360).
const METROS_POR_GRADO_LATITUD = 2 * M_PI * RADIO_TIERRA_METROS / 360;

return function (PDO $pdo): array {
    $zona = crearZonaPrueba($pdo);
    $usuarioId = crearUsuarioPruebaConId($pdo);
    // Posición al norte de la biblioteca, a la distancia indicada en metros.
    $aMetros = fn (float $metros): float => $zona['latitud'] + $metros / METROS_POR_GRADO_LATITUD;
    $checkin = fn (float $latitud, ?string $token = null): array =>
        hacerCheckin($pdo, $usuarioId, $zona['id'], $token ?? $zona['token'], $latitud, $zona['longitud']);
    $latitudDentro = $aMetros(100);

    return [
        ['T23', 'Haversine: 1 grado de latitud mide ~111 195 m',
            fn () => abs(calcularDistanciaMetros(0, 0, 1, 0) - METROS_POR_GRADO_LATITUD) < 1],
        ['T24', 'Check-in a 200 m de la biblioteca → fuera del radio (403)',
            fn () => $checkin($aMetros(200))['estado'] === CHECKIN_FUERA_DEL_RADIO],
        ['T25', 'Check-in con token de QR incorrecto → QR inválido (400)',
            fn () => $checkin($latitudDentro, 'token-falso')['estado'] === CHECKIN_QR_INVALIDO],
        ['T26', 'Check-in en una zona que no existe → QR inválido (400)',
            fn () => hacerCheckin($pdo, $usuarioId, 0, $zona['token'], $latitudDentro, $zona['longitud'])['estado'] === CHECKIN_QR_INVALIDO],
        ['T27', 'Check-in sin ubicación (permiso denegado) → sin ubicación (400)',
            fn () => hacerCheckin($pdo, $usuarioId, $zona['id'], $zona['token'], null, null)['estado'] === CHECKIN_SIN_UBICACION],
        ['T28', 'Check-in a 100 m → sesión iniciada con su hora de inicio (201)',
            fn () => isSesionIniciada($checkin($latitudDentro))],
        ['T29', 'Privacidad: tras el check-in la BD no guarda la latitud ni la longitud del móvil',
            fn () => !guardaCoordenadas($pdo, $usuarioId, $latitudDentro, $zona['longitud'])],
        ['T30', 'Segundo check-in con una sesión ya activa → rechazado (409)',
            fn () => $checkin($latitudDentro)['estado'] === CHECKIN_SESION_YA_ACTIVA],
        ['T31', 'La sesión activa muestra zona y hora de inicio, pero no puntos',
            fn () => isSesionSinPuntos(getSesionActiva($pdo, $usuarioId))],
        ['T32', 'Check-out tras 30 min → sesión terminada con 30 min y 2 puntos (200)',
            fn () => hacerCheckoutTras($pdo, $usuarioId, 30) === ['estado' => CHECKOUT_TERMINADA, 'minutos' => 30, 'puntos' => 2]],
        ['T33', 'Check-out sin sesión activa → sin sesión (404)',
            fn () => hacerCheckout($pdo, $usuarioId)['estado'] === CHECKOUT_SIN_SESION],
        ['T34', 'Sesión de más de 4 h → caduca sola (expired) con 16 puntos',
            fn () => isCaducadaConPuntos($pdo, $usuarioId, $checkin, $latitudDentro)],
        ['T35', 'Tras la caducidad se puede volver a hacer check-in',
            fn () => isSesionIniciada($checkin($latitudDentro))],
        ['T36', 'Puntos: 14 min → 0 puntos',
            fn () => calcularPuntos(14) === 0],
        ['T37', 'Puntos: 15 min → 1 punto',
            fn () => calcularPuntos(15) === 1],
        ['T38', 'Puntos: 4 h → 16 puntos, y nunca más de 16',
            fn () => calcularPuntos(240) === 16 && calcularPuntos(300) === 16],
    ];
};

function isSesionIniciada(array $resultado): bool
{
    return $resultado['estado'] === CHECKIN_CREADO
        && preg_match('/^\d{2}:\d{2}$/', $resultado['sesion']['hora_inicio']) === 1;
}

function isSesionSinPuntos(?array $sesion): bool
{
    return $sesion !== null && $sesion['zona'] !== '' && !array_key_exists('puntos', $sesion);
}

/** Simula que la sesión empezó hace $minutos y hace el check-out. */
function hacerCheckoutTras(PDO $pdo, int $usuarioId, int $minutos): array
{
    retrasarSesionActiva($pdo, $usuarioId, $minutos);
    return hacerCheckout($pdo, $usuarioId);
}

/** Abre una sesión, la retrasa 4 h y 1 min y comprueba que al consultarla ya ha caducado. */
function isCaducadaConPuntos(PDO $pdo, int $usuarioId, callable $checkin, float $latitud): bool
{
    $checkin($latitud);
    retrasarSesionActiva($pdo, $usuarioId, DURACION_MAX_SESION_MINUTOS + 1);
    if (getSesionActiva($pdo, $usuarioId) !== null) {
        return false;
    }
    $ultima = findUltimaSesion($pdo, $usuarioId);
    return $ultima['estado'] === 'expired' && (int) $ultima['puntos_otorgados'] === MAX_PUNTOS_SESION;
}

/**
 * Busca en la última sesión del usuario cualquier columna de coordenadas
 * o cualquier valor igual a las coordenadas enviadas.
 */
function guardaCoordenadas(PDO $pdo, int $usuarioId, float $latitud, float $longitud): bool
{
    $sesion = findUltimaSesion($pdo, $usuarioId);
    if ($sesion === []) {
        throw new RuntimeException('No hay ninguna sesión que revisar.');
    }
    $hayColumnaCoordenadas = preg_grep('/lat|lon|coord/i', array_keys($sesion)) !== [];
    $valores = array_map('strval', array_values($sesion));
    $hayValorCoordenadas = array_intersect($valores, [(string) $latitud, (string) $longitud]) !== [];
    return $hayColumnaCoordenadas || $hayValorCoordenadas;
}
