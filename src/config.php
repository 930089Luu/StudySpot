<?php
/*
 * Lectura de config.php (raíz del repo, fuera de git). Lo usan la BD y el correo.
 */
declare(strict_types=1);

const CONFIG_PATH = __DIR__ . '/../config.php';

function leerConfig(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }
    if (!is_file(CONFIG_PATH)) {
        throw new RuntimeException('Falta config.php: copia config.example.php y rellénalo.');
    }
    $config = require CONFIG_PATH;
    return $config;
}

/** Devuelve una clave obligatoria de config.php; falla con un mensaje claro si no está. */
function getConfig(string $clave): string
{
    $config = leerConfig();
    if (!array_key_exists($clave, $config)) {
        throw new RuntimeException("Falta la clave '$clave' en config.php (ver config.example.php).");
    }
    return (string) $config[$clave];
}
