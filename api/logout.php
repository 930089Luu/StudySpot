<?php
/*
 * POST /api/logout.php — cierre de sesión (cuentas, US01)
 * Sin entrada. 200 siempre: si no había sesión, el resultado es el mismo (sesión cerrada).
 * As built: no estaba en el contrato del Sprint 1.
 * Es POST y no GET para que un enlace o una imagen de otra web no pueda cerrar tu sesión.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';

ejecutarEndpoint(function (): void {
    exigirMetodo('POST');
    cerrarSesionUsuario();
    responderJson(HTTP_OK, ['mensaje' => 'Sesión cerrada.']);
});
