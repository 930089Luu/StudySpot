<?php
/*
 * Tests de la biblioteca abierta o cerrada ahora (revisión de US08, 26-11): estado de apertura,
 * ocupación con el horario de hoy (mapa, lista y tarjeta) y check-in bloqueado si está cerrada.
 * Las horas se pasan como parámetro para que el resultado no dependa de cuándo se ejecuta.
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';
require_once __DIR__ . '/../src/Sesiones/estudio.php';
require_once __DIR__ . '/../src/Ocupacion/ocupacion.php';
require_once __DIR__ . '/../src/Horarios/horarios.php';

// Un lunes cualquiera, con la hora de Portugal.
const TEST_APERTURA_DIA = '2099-03-02';

return function (PDO $pdo): array {
    $horario = ['cerrado' => false, 'apertura' => '09:00', 'cierre' => '21:00', 'motivo' => null];
    return [
        ['T117', 'Estado de apertura: antes de abrir → abre hoy; dentro → abierta; a la hora de cierre o después → cerrada; sin horario → null',
            fn (): bool => getEstadoApertura($horario, '08:59') === ESTADO_ABRE_HOY
                && getEstadoApertura($horario, '09:00') === ESTADO_ABIERTA
                && getEstadoApertura($horario, '20:59') === ESTADO_ABIERTA
                && getEstadoApertura($horario, '21:00') === ESTADO_CERRADA
                && getEstadoApertura(['cerrado' => true] + $horario, '12:00') === ESTADO_CERRADA
                && getEstadoApertura(null, '12:00') === null],
        ['T118', 'Mapa y lista: cada biblioteca trae su horario de hoy y si está abierta a esa hora',
            function () use ($pdo): bool {
                $biblioteca = crearBibliotecaConHorario($pdo, '09:00', '21:00');
                $abierta = findOcupacionDe(getOcupacionBibliotecas($pdo, horaPrueba('10:00')), $biblioteca);
                $cerrada = findOcupacionDe(getOcupacionBibliotecas($pdo, horaPrueba('22:00')), $biblioteca);
                return $abierta['estado_apertura'] === ESTADO_ABIERTA && $abierta['horario_hoy']['cierre'] === '21:00'
                    && $cerrada['estado_apertura'] === ESTADO_CERRADA;
            }],
        ['T119', 'Check-in con la biblioteca cerrada → rechazado (403); abierta o sin horario → se abre la sesión',
            function () use ($pdo): bool {
                $zona = crearZonaPrueba($pdo);
                guardarHorarioSemana($pdo, findBibliotecaDeZonaPrueba($pdo, $zona['id']), semanaAbierta('09:00', '21:00'));
                $sinHorario = crearZonaPrueba($pdo);
                $usuario = crearUsuarioPruebaConId($pdo);
                $checkin = fn (array $z, string $hora): string => hacerCheckin(
                    $pdo, $usuario, $z['id'], $z['token'], $z['latitud'], $z['longitud'], horaPrueba($hora)
                )['estado'];
                $cerrada = $checkin($zona, '07:00') === CHECKIN_BIBLIOTECA_CERRADA;
                $abierta = $checkin($zona, '10:00') === CHECKIN_CREADO;
                hacerCheckout($pdo, $usuario);
                return $cerrada && $abierta && $checkin($sinHorario, '03:00') === CHECKIN_CREADO;
            }],
        ['T120', 'Un periodo especial cerrado (Navidad) gana al horario normal: cerrada aunque sea hora de abrir',
            function () use ($pdo): bool {
                $biblioteca = crearBibliotecaConHorario($pdo, '09:00', '21:00');
                insertarEspecial($pdo, $biblioteca, [
                    'fecha_inicio' => TEST_APERTURA_DIA, 'fecha_fin' => TEST_APERTURA_DIA,
                    'descripcion' => 'Navidad', 'cerrado' => true, 'apertura' => null, 'cierre' => null,
                ]);
                $apertura = getAperturaBiblioteca($pdo, $biblioteca, ZONA_HORARIA_POR_DEFECTO, horaPrueba('12:00'));
                return $apertura['estado_apertura'] === ESTADO_CERRADA && $apertura['horario_hoy']['motivo'] === 'Navidad'
                    && isCerradaAhora($pdo, $biblioteca, ZONA_HORARIA_POR_DEFECTO, horaPrueba('12:00'));
            }],
        ['T121', 'Cada biblioteca con su hora local: a las 18:30 de Oporto (19:30 en Madrid), una de Madrid que cierra a las 19:00 está cerrada y una de Oporto, abierta',
            function () use ($pdo): bool {
                $oporto = crearBibliotecaConHorario($pdo, '09:00', '19:00');
                $madrid = crearBibliotecaConHorario($pdo, '09:00', '19:00', 'Europe/Madrid');
                $bibliotecas = getOcupacionBibliotecas($pdo, horaPrueba('18:30'));
                return findOcupacionDe($bibliotecas, $oporto)['estado_apertura'] === ESTADO_ABIERTA
                    && findOcupacionDe($bibliotecas, $madrid)['estado_apertura'] === ESTADO_CERRADA
                    && findOcupacionDe($bibliotecas, $madrid)['horario_hoy']['cierre'] === '19:00';
            }],
        ['T122', 'Zonas horarias de toda Europa (también Canarias, Azores e Islandia); fuera de Europa o mal escrita → Europe/Lisbon',
            fn (): bool => isZonaHorariaEuropea('Europe/Madrid') && isZonaHorariaEuropea('Europe/Helsinki')
                && isZonaHorariaEuropea('Atlantic/Canary') && isZonaHorariaEuropea('Atlantic/Azores')
                && isZonaHorariaEuropea('Atlantic/Reykjavik')
                && !isZonaHorariaEuropea('America/New_York') && !isZonaHorariaEuropea('Europa/Madrid')
                && @getHoraLocal(horaPrueba('12:00'), 'Mal/Escrita')->getTimezone()->getName() === ZONA_HORARIA_POR_DEFECTO],
    ];
};

/** Lunes TEST_APERTURA_DIA a la hora indicada ("HH:MM") de Oporto (ZONA_HORARIA_POR_DEFECTO). */
function horaPrueba(string $hora): DateTimeImmutable
{
    return new DateTimeImmutable(TEST_APERTURA_DIA . ' ' . $hora, new DateTimeZone(ZONA_HORARIA_POR_DEFECTO));
}

/** Los 7 días abiertos en el mismo horario. */
function semanaAbierta(string $apertura, string $cierre): array
{
    return array_map(
        fn (int $dia): array => ['dia' => $dia, 'apertura' => $apertura, 'cierre' => $cierre],
        range(DIA_SEMANA_MIN, DIA_SEMANA_MAX)
    );
}

function findBibliotecaDeZonaPrueba(PDO $pdo, int $zonaId): int
{
    $consulta = $pdo->prepare('SELECT biblioteca_id FROM zona WHERE id = :id');
    $consulta->execute(['id' => $zonaId]);
    return (int) $consulta->fetchColumn();
}

/** Biblioteca de prueba abierta todos los días de $apertura a $cierre (hora local de $zonaHoraria). */
function crearBibliotecaConHorario(
    PDO $pdo, string $apertura, string $cierre, string $zonaHoraria = ZONA_HORARIA_POR_DEFECTO
): int {
    $biblioteca = findBibliotecaDeZonaPrueba($pdo, crearZonaPrueba($pdo)['id']);
    $consulta = $pdo->prepare('UPDATE biblioteca SET zona_horaria = :zona WHERE id = :id');
    $consulta->execute(['zona' => $zonaHoraria, 'id' => $biblioteca]);
    guardarHorarioSemana($pdo, $biblioteca, semanaAbierta($apertura, $cierre));
    return $biblioteca;
}

/** La fila de una biblioteca dentro de la respuesta de getOcupacionBibliotecas. */
function findOcupacionDe(array $bibliotecas, int $bibliotecaId): ?array
{
    foreach ($bibliotecas as $biblioteca) {
        if ($biblioteca['id'] === $bibliotecaId) {
            return $biblioteca;
        }
    }
    return null;
}
