<?php
/*
 * GET /api/usuario.php?id=N — perfil de otra persona (mejora de US06, no estaba en el contrato del Sprint 1).
 * 200 {usuario_id, nombre, puntos_totales, relacion: friend | request} · 400 id no válido
 * 401 sin sesión · 404 no existe, no es tu amigo, no te ha enviado solicitud o te ha bloqueado
 * (el mismo 404 en todos los casos para no revelar un bloqueo).
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Amigos/perfil_contacto.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('GET');
    $usuarioId = exigirSesion();

    $otroId = filter_var($_GET['id'] ?? '', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($otroId === false) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Perfil no válido.']);
    }

    $perfil = getPerfilContacto(getConexion(), $usuarioId, $otroId);
    if ($perfil === null) {
        responderJson(HTTP_NOT_FOUND, ['error' => 'Este perfil no está disponible.']);
    }
    responderJson(HTTP_OK, $perfil);
});
