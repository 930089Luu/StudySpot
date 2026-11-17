<?php
/*
 * Lógica de las sesiones de estudio (US02): check-in por QR, check-out y caducidad.
 * Sin salida HTTP: devuelve ['estado' => CHECKIN_* / CHECKOUT_*, ...] y el endpoint
 * decide el código HTTP.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/../Gamificacion/puntos.php';
require_once __DIR__ . '/distancia.php';
require_once __DIR__ . '/zonas.php';
require_once __DIR__ . '/sesiones.php';

const CHECKIN_CREADO = 'creado';
const CHECKIN_SIN_UBICACION = 'sin_ubicacion';
const CHECKIN_QR_INVALIDO = 'qr_invalido';
const CHECKIN_FUERA_DEL_RADIO = 'fuera_del_radio';
const CHECKIN_SESION_YA_ACTIVA = 'sesion_ya_activa';

const CHECKOUT_TERMINADA = 'terminada';
const CHECKOUT_SIN_SESION = 'sin_sesion';

/**
 * Cierra las sesiones que han superado las 4 h. No hay tarea programada: se llama
 * siempre antes de leer o cambiar sesiones, así nadie ve una sesión vencida como activa.
 */
function cerrarSesionesCaducadas(PDO $pdo): void
{
    updateSesionesCaducadas($pdo, calcularPuntos(DURACION_MAX_SESION_MINUTOS));
}

/** Sesión activa del usuario (zona, biblioteca, hora de inicio y segundos), o null. Sin puntos. */
function getSesionActiva(PDO $pdo, int $usuarioId): ?array
{
    cerrarSesionesCaducadas($pdo);
    $sesion = findSesionActiva($pdo, $usuarioId);
    return $sesion === null ? null : formatearSesionActiva($sesion);
}

function formatearSesionActiva(array $sesion): array
{
    return [
        'zona'        => $sesion['zona'],
        'biblioteca'  => $sesion['biblioteca'],
        'hora_inicio' => $sesion['hora_inicio'],
        'segundos'    => (int) $sesion['segundos'],
    ];
}

/**
 * Check-in: valida ubicación, QR y distancia, y abre la sesión.
 * Las coordenadas solo se usan aquí para calcular la distancia: nunca se guardan.
 */
function hacerCheckin(PDO $pdo, int $usuarioId, int $zonaId, string $token, ?float $latitud, ?float $longitud): array
{
    if (!isCoordenadaValida($latitud, $longitud)) {
        return ['estado' => CHECKIN_SIN_UBICACION];
    }
    $zona = findZonaValida($pdo, $zonaId, $token);
    if ($zona === null) {
        return ['estado' => CHECKIN_QR_INVALIDO];
    }
    $distancia = calcularDistanciaMetros($latitud, $longitud, (float) $zona['latitud'], (float) $zona['longitud']);
    if (!isDentroDelRadio($distancia)) {
        return ['estado' => CHECKIN_FUERA_DEL_RADIO, 'biblioteca' => $zona['biblioteca']];
    }
    return abrirSesion($pdo, $usuarioId, $zonaId);
}

/** La zona solo vale si existe y el token coincide con el de su QR. */
function findZonaValida(PDO $pdo, int $zonaId, string $token): ?array
{
    $zona = $zonaId > 0 ? findZonaConBiblioteca($pdo, $zonaId) : null;
    // hash_equals compara en tiempo constante: el tiempo de respuesta no da pistas del token.
    if ($zona === null || !hash_equals($zona['token_qr'], $token)) {
        return null;
    }
    return $zona;
}

function abrirSesion(PDO $pdo, int $usuarioId, int $zonaId): array
{
    cerrarSesionesCaducadas($pdo);
    return ejecutarEnTransaccion($pdo, function () use ($pdo, $usuarioId, $zonaId): array {
        bloquearUsuario($pdo, $usuarioId);
        if (findSesionActiva($pdo, $usuarioId) !== null) {
            return ['estado' => CHECKIN_SESION_YA_ACTIVA];
        }
        insertSesion($pdo, $usuarioId, $zonaId);
        return ['estado' => CHECKIN_CREADO, 'sesion' => formatearSesionActiva(findSesionActiva($pdo, $usuarioId))];
    });
}

/** Check-out: cierra la sesión activa y calcula sus puntos. */
function hacerCheckout(PDO $pdo, int $usuarioId): array
{
    cerrarSesionesCaducadas($pdo);
    return ejecutarEnTransaccion($pdo, function () use ($pdo, $usuarioId): array {
        bloquearUsuario($pdo, $usuarioId);
        $sesion = findSesionActiva($pdo, $usuarioId);
        if ($sesion === null) {
            return ['estado' => CHECKOUT_SIN_SESION];
        }
        $minutos = min(intdiv((int) $sesion['segundos'], 60), DURACION_MAX_SESION_MINUTOS);
        $puntos = calcularPuntos($minutos);
        updateSesionTerminada($pdo, (int) $sesion['id'], $puntos);
        return ['estado' => CHECKOUT_TERMINADA, 'minutos' => $minutos, 'puntos' => $puntos];
    });
}

/** Ejecuta $operacion en una transacción: commit si termina bien, rollback si lanza un error. */
function ejecutarEnTransaccion(PDO $pdo, callable $operacion): array
{
    $pdo->beginTransaction();
    try {
        $resultado = $operacion();
        $pdo->commit();
        return $resultado;
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}
