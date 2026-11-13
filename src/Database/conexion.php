<?php
/*
 * Conexión PDO a MySQL con las credenciales de config.php.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config.php';

function getConexion(): PDO
{
    // Una sola conexión por petición.
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', getConfig('db_host'), getConfig('db_name'));
    $pdo = new PDO($dsn, getConfig('db_user'), getConfig('db_pass'), [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}
