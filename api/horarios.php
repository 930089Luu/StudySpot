<?php
/*
 * /api/horarios.php — US08 (solo administradores)
 * GET  ?biblioteca=N → 200 {horario_semanal: [{dia, apertura, cierre}], calendario: [{id, fecha_inicio, fecha_fin, descripcion, cerrado, apertura, cierre}]}
 * POST {biblioteca, accion}, con accion:
 *   "semana"          horario_semanal: los 7 días          → 200 · 400
 *   "especial"        fecha_inicio, fecha_fin, descripcion, cerrado, apertura, cierre → 201 · 400 · 409 (se solapa)
 *   "borrar_especial" especial_id                          → 200 · 404
 * 400 datos no válidos · 401 sin sesión · 403 no es administrador · 404 biblioteca no existe · 405 método no permitido
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Horarios/horarios.php';

const ACCION_SEMANA = 'semana';
const ACCION_ESPECIAL = 'especial';
const ACCION_BORRAR_ESPECIAL = 'borrar_especial';

ejecutarEndpoint(function (): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($metodo !== 'GET' && $metodo !== 'POST') {
        header('Allow: GET, POST');
        responderJson(HTTP_METHOD_NOT_ALLOWED, ['error' => 'Método no permitido.']);
    }

    $usuarioId = exigirSesion();
    $pdo = getConexion();
    if (!esAdministrador($pdo, $usuarioId)) {
        responderJson(HTTP_FORBIDDEN, ['error' => 'Solo los administradores pueden gestionar horarios.']);
    }

    $datos = $metodo === 'GET' ? $_GET : leerCuerpoJson();
    $bibliotecaId = leerCampoEntero($datos, 'biblioteca');
    if ($bibliotecaId <= 0) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Biblioteca no válida.']);
    }
    if (!existeBiblioteca($pdo, $bibliotecaId)) {
        responderJson(HTTP_NOT_FOUND, ['error' => 'Biblioteca no encontrada.']);
    }

    if ($metodo === 'GET') {
        responderJson(HTTP_OK, [
            'horario_semanal' => findHorarioSemana($pdo, $bibliotecaId),
            'calendario' => findCalendarioEspecial($pdo, $bibliotecaId),
        ]);
    }
    ejecutarAccionHorario($pdo, $bibliotecaId, $datos);
});

/** Ejecuta la acción de un POST y responde. Siempre termina. */
function ejecutarAccionHorario(PDO $pdo, int $bibliotecaId, array $datos): never
{
    $accion = leerCampoTexto($datos, 'accion');
    if ($accion === ACCION_SEMANA) {
        responderSemana($pdo, $bibliotecaId, $datos);
    }
    if ($accion === ACCION_ESPECIAL) {
        responderEspecial($pdo, $bibliotecaId, $datos);
    }
    if ($accion === ACCION_BORRAR_ESPECIAL) {
        responderBorrarEspecial($pdo, $bibliotecaId, $datos);
    }
    responderJson(HTTP_BAD_REQUEST, ['error' => 'Acción no válida.']);
}

function responderSemana(PDO $pdo, int $bibliotecaId, array $datos): never
{
    $semana = $datos['horario_semanal'] ?? null;
    if (!is_array($semana) || !validarSemana($semana)) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'El horario semanal debe tener los 7 días, con horas válidas.']);
    }
    guardarHorarioSemana($pdo, $bibliotecaId, $semana);
    responderJson(HTTP_OK, ['mensaje' => 'Horario semanal guardado.']);
}

function responderEspecial(PDO $pdo, int $bibliotecaId, array $datos): never
{
    $especial = [
        'fecha_inicio' => leerCampoTexto($datos, 'fecha_inicio'),
        'fecha_fin' => leerCampoTexto($datos, 'fecha_fin'),
        'descripcion' => leerCampoTexto($datos, 'descripcion'),
        'cerrado' => $datos['cerrado'] ?? null,
        'apertura' => $datos['apertura'] ?? null,
        'cierre' => $datos['cierre'] ?? null,
    ];
    if (!validarEspecial($especial)) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Revisa las fechas, la descripción y las horas.']);
    }
    if (!insertarEspecial($pdo, $bibliotecaId, $especial)) {
        responderJson(HTTP_CONFLICT, ['error' => 'Ya hay un periodo especial en esas fechas.']);
    }
    responderJson(HTTP_CREATED, ['mensaje' => 'Periodo especial añadido.']);
}

function responderBorrarEspecial(PDO $pdo, int $bibliotecaId, array $datos): never
{
    $especialId = leerCampoEntero($datos, 'especial_id');
    if ($especialId <= 0) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Periodo especial no válido.']);
    }
    if (!borrarEspecial($pdo, $bibliotecaId, $especialId)) {
        responderJson(HTTP_NOT_FOUND, ['error' => 'Periodo especial no encontrado.']);
    }
    responderJson(HTTP_OK, ['mensaje' => 'Periodo especial borrado.']);
}
