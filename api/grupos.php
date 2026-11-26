<?php
/*
 * /api/grupos.php — grupos del ranking (US07, 26-11)
 * GET              → 200 {grupos: [{id, nombre, objetivo, personas, es_admin, total (puntos de esta semana)}],
 *                         invitaciones: [{grupo_id, nombre, invitado_por}]}
 * GET ?grupo=N     → 200 {id, nombre, objetivo, es_admin, miembros: [{usuario_id, nombre, es_admin, invitado, es_yo}]}
 *                    · 404 si no existe o no estás dentro
 * POST {accion, …}:
 *   "crear"         nombre, objetivo (opcional)          → 201 {grupo_id} · 400
 *   "invitar"       grupo, usuario (un amigo aceptado)    → 201 · 400 no es amigo · 403 no eres admin · 409 ya está / lleno
 *   "aceptar"       grupo                                 → 200 · 404 sin invitación
 *   "rechazar"      grupo                                 → 200 · 404 sin invitación
 *   "editar"        grupo, nombre, objetivo (admin)       → 200 · 400 · 403
 *   "quitar"        grupo, usuario (admin)                → 200 · 400 · 403
 *   "hacer_admin"   grupo, usuario (admin)                → 200 · 400 · 403
 *   "quitar_admin"  grupo, usuario (admin)                → 200 · 400 · 403 · 409 último admin
 *   "salir"         grupo                                 → 200 · 404
 * 401 sin sesión · 404 el grupo no existe o no estás dentro (no se distingue) · 405 método no permitido
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Grupos/grupos.php';
require_once __DIR__ . '/../src/Gamificacion/ranking.php';

const RESPUESTAS_GRUPO = [
    GRUPO_NO_EXISTE        => [HTTP_NOT_FOUND, 'Grupo no encontrado.'],
    GRUPO_NO_ADMIN         => [HTTP_FORBIDDEN, 'Solo la administración del grupo puede hacer esto.'],
    GRUPO_NO_AMIGO         => [HTTP_BAD_REQUEST, 'Solo puedes invitar a tus amigos.'],
    GRUPO_YA_ESTA          => [HTTP_CONFLICT, 'Esa persona ya está en el grupo o ya tiene la invitación.'],
    GRUPO_LLENO            => [HTTP_CONFLICT, 'El grupo ya tiene el máximo de ' . GRUPO_MAX_PERSONAS . ' personas.'],
    GRUPO_ULTIMO_ADMIN     => [HTTP_CONFLICT, 'El grupo necesita al menos una persona administradora.'],
    GRUPO_DATOS_NO_VALIDOS => [HTTP_BAD_REQUEST, 'Revisa los datos: nombre de 1 a ' . GRUPO_NOMBRE_MAX_LENGTH
        . ' caracteres y objetivo de ' . GRUPO_OBJETIVO_MIN . ' a ' . GRUPO_OBJETIVO_MAX . ' puntos.'],
];

ejecutarEndpoint(function (): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($metodo !== 'GET' && $metodo !== 'POST') {
        header('Allow: GET, POST');
        responderJson(HTTP_METHOD_NOT_ALLOWED, ['error' => 'Método no permitido.']);
    }
    $usuarioId = exigirSesion();
    $pdo = getConexion();
    if ($metodo === 'GET') {
        responderGet($pdo, $usuarioId);
    }
    responderAccion($pdo, $usuarioId, leerCuerpoJson());
});

function responderGet(PDO $pdo, int $usuarioId): never
{
    if (!isset($_GET['grupo'])) {
        responderJson(HTTP_OK, [
            'grupos' => getGruposConProgreso($pdo, $usuarioId),
            'invitaciones' => findInvitacionesDe($pdo, $usuarioId),
        ]);
    }
    $detalle = getDetalleGrupo($pdo, leerCampoEntero($_GET, 'grupo'), $usuarioId);
    if ($detalle === null) {
        responderEstado(GRUPO_NO_EXISTE);
    }
    responderJson(HTTP_OK, $detalle);
}

function responderAccion(PDO $pdo, int $usuarioId, array $datos): never
{
    $accion = leerCampoTexto($datos, 'accion');
    $grupoId = leerCampoEntero($datos, 'grupo');
    $otraPersona = leerCampoEntero($datos, 'usuario');
    if ($accion === 'crear') {
        $objetivo = isset($datos['objetivo']) ? leerCampoEntero($datos, 'objetivo') : OBJETIVO_SEMANAL_PUNTOS;
        $nuevo = crearGrupo($pdo, $usuarioId, leerCampoTexto($datos, 'nombre'), $objetivo);
        if ($nuevo === null) {
            responderEstado(GRUPO_DATOS_NO_VALIDOS);
        }
        responderJson(HTTP_CREATED, ['grupo_id' => $nuevo]);
    }
    if ($accion === 'aceptar' || $accion === 'rechazar') {
        if (!responderInvitacion($pdo, $grupoId, $usuarioId, $accion === 'aceptar')) {
            responderJson(HTTP_NOT_FOUND, ['error' => 'No tienes ninguna invitación a ese grupo.']);
        }
        responderJson(HTTP_OK, ['mensaje' => $accion === 'aceptar' ? 'Ya estás en el grupo.' : 'Invitación rechazada.']);
    }
    $estado = match ($accion) {
        'invitar' => invitarAGrupo($pdo, $grupoId, $usuarioId, $otraPersona),
        'editar' => editarGrupo($pdo, $grupoId, $usuarioId, leerCampoTexto($datos, 'nombre'), leerCampoEntero($datos, 'objetivo')),
        'quitar' => quitarDeGrupo($pdo, $grupoId, $usuarioId, $otraPersona),
        'hacer_admin' => cambiarRolGrupo($pdo, $grupoId, $usuarioId, $otraPersona, true),
        'quitar_admin' => cambiarRolGrupo($pdo, $grupoId, $usuarioId, $otraPersona, false),
        'salir' => salirDeGrupo($pdo, $grupoId, $usuarioId),
        default => null,
    };
    if ($estado === null) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Acción no válida.']);
    }
    if ($estado !== GRUPO_OK) {
        responderEstado($estado);
    }
    responderJson($accion === 'invitar' ? HTTP_CREATED : HTTP_OK, ['mensaje' => 'Hecho.']);
}

function responderEstado(string $estado): never
{
    [$codigo, $mensaje] = RESPUESTAS_GRUPO[$estado];
    responderJson($codigo, ['error' => $mensaje]);
}
