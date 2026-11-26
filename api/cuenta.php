<?php
/*
 * /api/cuenta.php — Ajustes de la cuenta (26-11)
 * GET → 200 {nombre, email, idioma, avatar, es_admin, admin_confirmado}
 * POST {accion, …}:
 *   "nombre"    nombre                                   → 200 · 400
 *   "idioma"    idioma (es | en | pt)                     → 200 · 400
 *   "avatar"    avatar: {fondo, piel, … gorro} o null (quitarlo) → 200 · 400
 *   "password"  password_actual, password, password_repetida → 200 · 400 {errores}
 *   "admin"     password: abre la administración el resto de la sesión → 200 · 401 contraseña incorrecta · 403 no admin
 *   "eliminar"  password: borra la cuenta y cierra la sesión (RGPD, derecho de supresión) → 200 · 401
 * 401 sin sesión. Los datos para descargar están en api/mis-datos.php.
 */
declare(strict_types=1);

require_once __DIR__ . '/_http.php';
require_once __DIR__ . '/../src/Database/conexion.php';
require_once __DIR__ . '/../src/Usuarios/cuenta.php';

const MENSAJE_PASSWORD_INCORRECTA = 'La contraseña no es correcta.';

ejecutarEndpoint(function (): void {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($metodo !== 'GET' && $metodo !== 'POST') {
        header('Allow: GET, POST');
        responderJson(HTTP_METHOD_NOT_ALLOWED, ['error' => 'Método no permitido.']);
    }
    $usuarioId = exigirSesion();
    $pdo = getConexion();
    if ($metodo === 'GET') {
        responderJson(HTTP_OK, getCuenta($pdo, $usuarioId) ?? []);
    }
    $datos = leerCuerpoJson();
    match (leerCampoTexto($datos, 'accion')) {
        'nombre' => responderEstado(cambiarNombre($pdo, $usuarioId, leerCampoTexto($datos, 'nombre')),
            'Nombre guardado.', 'Escribe tu nombre (máximo ' . NOMBRE_MAX_LENGTH . ' caracteres).'),
        'idioma' => responderEstado(guardarIdioma($pdo, $usuarioId, leerCampoTexto($datos, 'idioma')),
            'Idioma guardado.', 'Idioma no disponible.'),
        'password' => responderCambioPassword($pdo, $usuarioId, $datos),
        'avatar' => responderEstado(guardarAvatar($pdo, $usuarioId, $datos['avatar'] ?? null) ? CUENTA_OK : CUENTA_DATOS_NO_VALIDOS,
            'Avatar guardado.', 'Avatar no válido.'),
        'admin' => responderAdmin($pdo, $usuarioId, leerCampoTexto($datos, 'password')),
        'eliminar' => responderEliminar($pdo, $usuarioId, leerCampoTexto($datos, 'password')),
        default => responderJson(HTTP_BAD_REQUEST, ['error' => 'Acción no válida.']),
    };
});

function responderEstado(string $estado, string $ok, string $error): never
{
    if ($estado !== CUENTA_OK) {
        responderJson(HTTP_BAD_REQUEST, ['error' => $error]);
    }
    responderJson(HTTP_OK, ['mensaje' => $ok]);
}

function responderCambioPassword(PDO $pdo, int $usuarioId, array $datos): never
{
    $resultado = cambiarPassword($pdo, $usuarioId, leerCampoTexto($datos, 'password_actual'),
        leerCampoTexto($datos, 'password'), leerCampoTexto($datos, 'password_repetida'));
    if ($resultado['estado'] !== CUENTA_OK) {
        responderJson(HTTP_BAD_REQUEST, ['error' => 'Revisa los campos.', 'errores' => $resultado['errores']]);
    }
    responderJson(HTTP_OK, ['mensaje' => 'Contraseña cambiada.']);
}

function responderAdmin(PDO $pdo, int $usuarioId, string $password): never
{
    $estado = confirmarAccesoAdmin($pdo, $usuarioId, $password);
    if ($estado === CUENTA_NO_ADMIN) {
        responderJson(HTTP_FORBIDDEN, ['error' => 'Tu cuenta no es de administración.']);
    }
    if ($estado === CUENTA_PASSWORD_INCORRECTA) {
        responderJson(HTTP_UNAUTHORIZED, ['error' => MENSAJE_PASSWORD_INCORRECTA]);
    }
    responderJson(HTTP_OK, ['mensaje' => 'Administración abierta.']);
}

function responderEliminar(PDO $pdo, int $usuarioId, string $password): never
{
    if (eliminarCuenta($pdo, $usuarioId, $password) !== CUENTA_OK) {
        responderJson(HTTP_UNAUTHORIZED, ['error' => MENSAJE_PASSWORD_INCORRECTA]);
    }
    cerrarSesionUsuario();
    responderJson(HTTP_OK, ['mensaje' => 'Cuenta eliminada.']);
}
