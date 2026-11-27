<?php
/*
 * Tests del avatar tipo Memoji (27-11): qué se acepta, guardar y quitar, y que llega a quien
 * tiene que verlo (perfil y ranking del grupo).
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Usuarios/avatar.php';
require_once __DIR__ . '/../src/Gamificacion/perfil.php';
require_once __DIR__ . '/../src/Gamificacion/ranking.php';

return function (PDO $pdo): array {
    $valido = array_map(fn (int $total): int => $total - 1, AVATAR_OPCIONES);
    return [
        ['T141', 'Avatar válido: todas las partes y cada una dentro de su rango; falta una, sobra otra o se sale → no',
            function () use ($valido): bool {
                $sinParte = $valido;
                unset($sinParte['fondo']);
                $deMas = $valido + ['alas' => 1];
                $fuera = ['peinado' => AVATAR_OPCIONES['peinado']] + $valido;
                $texto = ['piel' => '2'] + $valido;
                return isAvatarValido($valido) && isAvatarValido(array_map(fn (): int => 0, AVATAR_OPCIONES))
                    && !isAvatarValido($sinParte) && !isAvatarValido($deMas)
                    && !isAvatarValido(array_replace($valido, ['peinado' => AVATAR_OPCIONES['peinado']]))
                    && !isAvatarValido(array_replace($valido, ['piel' => '2'])) && !isAvatarValido(null)
                    && is_array($fuera) && is_array($texto);
            }],
        ['T142', 'Guardar y quitar el avatar: se ve en el perfil; uno no válido no se guarda; sin avatar → null (iniciales)',
            function () use ($pdo, $valido): bool {
                $yo = crearUsuarioPruebaConId($pdo);
                $sinAvatar = getPerfil($pdo, $yo)['avatar'] === null;
                $guardado = guardarAvatar($pdo, $yo, $valido) && getPerfil($pdo, $yo)['avatar'] === $valido;
                $rechazado = !guardarAvatar($pdo, $yo, ['piel' => 99]) && getPerfil($pdo, $yo)['avatar'] === $valido;
                return $sinAvatar && $guardado && $rechazado
                    && guardarAvatar($pdo, $yo, null) && getPerfil($pdo, $yo)['avatar'] === null;
            }],
        ['T143', 'El ranking del grupo trae el avatar de cada persona (o null) para dibujarlo en el podio',
            function () use ($pdo, $valido): bool {
                $yo = crearUsuarioPruebaConId($pdo);
                guardarAvatar($pdo, $yo, $valido);
                $grupo = crearGrupo($pdo, $yo, 'Avatares');
                return getRanking($pdo, $grupo, $yo)['personas'][0]['avatar'] === $valido;
            }],
    ];
};
