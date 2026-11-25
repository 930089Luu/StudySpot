<?php
/*
 * Ejecutor de los tests funcionales de StudySpot.
 * Uso: php tests/run_tests.php   (necesita MySQL en marcha y config.php)
 * Imprime una línea PASS/FAIL por test y un resumen; sale con código 1 si alguno falla.
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Database/conexion.php';

const ARCHIVOS_DE_TESTS = [
    'us01_registro_login.php',
    'us09_recuperar_password.php',
    'us02_checkin.php',
    'us04_puntos_perfil.php',
    'us06_amigos.php',
    'us03_us05_ocupacion.php',
    'us08_horarios.php',
];

function ejecutarArchivo(PDO $pdo, string $archivo): array
{
    $crearTests = require __DIR__ . '/' . $archivo;
    $resultados = [];
    foreach ($crearTests($pdo) as [$id, $descripcion, $test]) {
        $resultados[] = ejecutarTest($id, $descripcion, $test);
    }
    return $resultados;
}

function main(): int
{
    $pdo = getConexion();
    $resultados = [];
    try {
        foreach (ARCHIVOS_DE_TESTS as $archivo) {
            $resultados = [...$resultados, ...ejecutarArchivo($pdo, $archivo)];
        }
    } finally {
        borrarUsuariosPrueba($pdo);
        borrarBibliotecasPrueba($pdo);
    }

    $aprobados = count(array_filter($resultados));
    $total = count($resultados);
    printf("\nResumen: %d/%d tests pasados, %d fallados.\n", $aprobados, $total, $total - $aprobados);
    return $aprobados === $total ? 0 : 1;
}

exit(main());
