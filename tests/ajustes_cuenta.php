<?php
/*
 * Tests de Ajustes (26-11): nombre, idioma, cambiar contraseña, administración con contraseña
 * (una vez por sesión, sin límite de tiempo), descargar tus datos y eliminar la cuenta (RGPD).
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';
require_once __DIR__ . '/../src/Usuarios/cuenta.php';
require_once __DIR__ . '/../src/Grupos/grupos.php';

return function (PDO $pdo): array {
    return [
        ['T136', 'Cambiar nombre e idioma: valores válidos se guardan; nombre vacío o idioma inventado no',
            function () use ($pdo): bool {
                $yo = crearUsuarioPruebaConId($pdo);
                return cambiarNombre($pdo, $yo, '  Lucía  ') === CUENTA_OK
                    && guardarIdioma($pdo, $yo, 'pt') === CUENTA_OK
                    && getCuenta($pdo, $yo)['nombre'] === 'Lucía' && getCuenta($pdo, $yo)['idioma'] === 'pt'
                    && cambiarNombre($pdo, $yo, '   ') === CUENTA_DATOS_NO_VALIDOS
                    && guardarIdioma($pdo, $yo, 'fr') === CUENTA_DATOS_NO_VALIDOS;
            }],
        ['T137', 'Cambiar contraseña: hace falta la actual; la nueva cumple las reglas y sirve para entrar',
            function () use ($pdo): bool {
                $email = crearUsuarioPrueba($pdo);
                $yo = (int) findUsuarioPorEmail($pdo, $email)['id'];
                $mala = cambiarPassword($pdo, $yo, 'no-es-esta', 'nueva-clave-1', 'nueva-clave-1')['estado'];
                $corta = cambiarPassword($pdo, $yo, TEST_PASSWORD, 'corta', 'corta')['estado'];
                $bien = cambiarPassword($pdo, $yo, TEST_PASSWORD, 'nueva-clave-1', 'nueva-clave-1')['estado'];
                return $mala === CUENTA_PASSWORD_INCORRECTA && $corta === CUENTA_DATOS_NO_VALIDOS && $bien === CUENTA_OK
                    && autenticarUsuario($pdo, $email, 'nueva-clave-1') !== null
                    && autenticarUsuario($pdo, $email, TEST_PASSWORD) === null;
            }],
        ['T138', 'Administración: solo cuentas admin y con su contraseña; una vez confirmada vale toda la sesión',
            function () use ($pdo): bool {
                $alumna = crearUsuarioPruebaConId($pdo);
                $admin = crearUsuarioPruebaConId($pdo);
                $pdo->prepare("UPDATE usuario SET rol = 'admin' WHERE id = :id")->execute(['id' => $admin]);
                $_SESSION = [];
                $antes = isAccesoAdminConfirmado();
                $resultado = confirmarAccesoAdmin($pdo, $alumna, TEST_PASSWORD) === CUENTA_NO_ADMIN
                    && confirmarAccesoAdmin($pdo, $admin, 'otra') === CUENTA_PASSWORD_INCORRECTA
                    && !isAccesoAdminConfirmado()
                    && confirmarAccesoAdmin($pdo, $admin, TEST_PASSWORD) === CUENTA_OK
                    && isAccesoAdminConfirmado();
                $_SESSION = [];
                return !$antes && $resultado;
            }],
        ['T139', 'Descargar mis datos: cuenta, sesiones, amistades, bloqueos y grupos; nunca la contraseña ni coordenadas',
            function () use ($pdo): bool {
                $yo = crearUsuarioPruebaConId($pdo);
                crearGrupo($pdo, $yo, 'Mi grupo');
                $datos = exportarDatos($pdo, $yo);
                $texto = json_encode($datos);
                return array_keys($datos) === ['exportado', 'cuenta', 'sesiones_de_estudio', 'amistades', 'bloqueos', 'grupos']
                    && $datos['grupos'][0]['nombre'] === 'Mi grupo'
                    && !str_contains($texto, 'password') && !str_contains($texto, 'latitud');
            }],
        ['T140', 'Eliminar cuenta: con contraseña incorrecta no; con la buena se borra y su grupo pasa a otra persona',
            function () use ($pdo): bool {
                $yo = crearUsuarioPruebaConId($pdo);
                $otra = crearUsuarioPruebaConId($pdo);
                $grupo = crearGrupo($pdo, $yo, 'Pareja');
                insertarPersonaGrupo($pdo, $grupo, $otra, GRUPO_ROL_MIEMBRO, GRUPO_DENTRO, $yo);
                $noBorra = eliminarCuenta($pdo, $yo, 'otra') === CUENTA_PASSWORD_INCORRECTA && getCuenta($pdo, $yo) !== null;
                return $noBorra && eliminarCuenta($pdo, $yo, TEST_PASSWORD) === CUENTA_OK
                    && getCuenta($pdo, $yo) === null && getRolEnGrupo($pdo, $grupo, $otra) === GRUPO_ROL_ADMIN;
            }],
    ];
};
