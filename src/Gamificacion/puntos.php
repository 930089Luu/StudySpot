<?php
/*
 * Cálculo de puntos de una sesión de estudio (US04).
 * Los puntos solo se calculan al terminar la sesión (check-out o caducidad).
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';

/** 1 punto por cada MINUTOS_POR_PUNTO completos, con un máximo de MAX_PUNTOS_SESION. */
function calcularPuntos(int $minutos): int
{
    $puntos = intdiv(max(0, $minutos), MINUTOS_POR_PUNTO);
    return min($puntos, MAX_PUNTOS_SESION);
}
