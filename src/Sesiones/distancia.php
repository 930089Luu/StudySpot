<?php
/*
 * Distancia entre dos puntos de la Tierra (US02). Funciones puras, sin BD.
 */
declare(strict_types=1);

require_once __DIR__ . '/../constantes.php';

/**
 * Distancia en metros con la fórmula de haversine: trata la Tierra como una esfera
 * y mide el arco más corto entre los dos puntos (no una recta en un plano).
 * El error frente a la forma real de la Tierra es < 0,5 %, de sobra para un radio de 150 m.
 */
function calcularDistanciaMetros(float $latitud1, float $longitud1, float $latitud2, float $longitud2): float
{
    $diferenciaLatitud = deg2rad($latitud2 - $latitud1);
    $diferenciaLongitud = deg2rad($longitud2 - $longitud1);

    $a = sin($diferenciaLatitud / 2) ** 2
        + cos(deg2rad($latitud1)) * cos(deg2rad($latitud2)) * sin($diferenciaLongitud / 2) ** 2;

    return 2 * RADIO_TIERRA_METROS * asin(min(1.0, sqrt($a)));
}

function isDentroDelRadio(float $distanciaMetros): bool
{
    return $distanciaMetros <= RADIO_CHECKIN_METROS;
}

function isCoordenadaValida(?float $latitud, ?float $longitud): bool
{
    return $latitud !== null && $longitud !== null
        && abs($latitud) <= 90 && abs($longitud) <= 180;
}
