<?php
/*
 * Tests funcionales de US08: horarios de las bibliotecas y periodos especiales (solo administradores).
 * Prueban src/Horarios/horarios.php. La parte HTTP (401, 403, 400, 409, 404) se comprueba en el navegador.
 */
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../src/Usuarios/auth.php';
require_once __DIR__ . '/../src/Usuarios/usuarios.php';
require_once __DIR__ . '/../src/Horarios/horarios.php';

return function (PDO $pdo): array {
    return [
        ['T85', 'Solo un administrador puede cambiar horarios: estudiante → no; administrador → sí',
            function () use ($pdo): bool {
                $alumno = crearUsuarioPruebaConId($pdo);
                $admin = crearUsuarioPruebaConId($pdo);
                ponerRolPrueba($pdo, $admin, ROL_ADMIN);
                return !esAdministrador($pdo, $alumno) && esAdministrador($pdo, $admin);
            }],
        ['T86', 'El rol se comprueba en cada petición: quitar el rol de admin corta el acceso al momento',
            function () use ($pdo): bool {
                $admin = crearUsuarioPruebaConId($pdo);
                ponerRolPrueba($pdo, $admin, ROL_ADMIN);
                $antes = esAdministrador($pdo, $admin);
                ponerRolPrueba($pdo, $admin, 'student');
                return $antes && !esAdministrador($pdo, $admin);
            }],
        ['T87', 'Guardar el horario semanal y leerlo de vuelta: los días sin horas salen cerrados',
            function () use ($pdo): bool {
                $biblioteca = crearBibliotecaPrueba($pdo);
                $semana = semanaPrueba('08:00', '21:00');
                $semana[6] = ['dia' => 7, 'apertura' => null, 'cierre' => null];
                guardarHorarioSemana($pdo, $biblioteca, $semana);
                $leido = findHorarioSemana($pdo, $biblioteca);
                return count($leido) === 7 && $leido[0]['apertura'] === '08:00' && $leido[6]['apertura'] === null;
            }],
        ['T88', 'Guardar otra vez reemplaza el horario anterior: siguen siendo 7 filas',
            function () use ($pdo): bool {
                $biblioteca = crearBibliotecaPrueba($pdo);
                guardarHorarioSemana($pdo, $biblioteca, semanaPrueba('08:00', '21:00'));
                guardarHorarioSemana($pdo, $biblioteca, semanaPrueba('09:00', '18:00'));
                return contarFilasHorarioPrueba($pdo, $biblioteca) === 7
                    && findHorarioSemana($pdo, $biblioteca)[0]['cierre'] === '18:00';
            }],
        ['T89', 'Horas no válidas (apertura después del cierre, formato erróneo o solo una hora) → rechazadas',
            function (): bool {
                return validarHoras('08:00', '21:00') && validarHoras(null, null)
                    && !validarHoras('21:00', '08:00') && !validarHoras('8:00', '21:00')
                    && !validarHoras('08:00', null) && !validarHoras('08:00', '08:00');
            }],
        ['T90', 'Semana incompleta, día repetido o día fuera de 1–7 → rechazada',
            function (): bool {
                $completa = semanaPrueba('08:00', '21:00');
                $repetida = $completa;
                $repetida[1]['dia'] = 1;
                $fueraDeRango = $completa;
                $fueraDeRango[6]['dia'] = 8;
                return validarSemana($completa) && !validarSemana(array_slice($completa, 0, 6))
                    && !validarSemana($repetida) && !validarSemana($fueraDeRango);
            }],
        ['T91', 'Periodo especial cerrado (Navidad) → ese día aparece cerrado con su motivo',
            function (): bool {
                return resolverHorario(
                    ['cerrado' => true, 'apertura' => null, 'cierre' => null, 'descripcion' => 'Navidad'],
                    ['apertura' => '08:00', 'cierre' => '21:00']
                ) === ['cerrado' => true, 'apertura' => null, 'cierre' => null, 'motivo' => 'Navidad'];
            }],
        ['T92', 'Horario reducido en exámenes: gana al horario normal',
            function (): bool {
                return resolverHorario(
                    ['cerrado' => false, 'apertura' => '09:00', 'cierre' => '15:00', 'descripcion' => 'Exámenes'],
                    ['apertura' => '08:00', 'cierre' => '21:00']
                ) === ['cerrado' => false, 'apertura' => '09:00', 'cierre' => '15:00', 'motivo' => 'Exámenes'];
            }],
        ['T93', 'Sin periodo especial: horario normal; día cerrado en la semana; sin horario definido → null',
            function (): bool {
                return resolverHorario(null, ['apertura' => '08:00', 'cierre' => '21:00'])
                        === ['cerrado' => false, 'apertura' => '08:00', 'cierre' => '21:00', 'motivo' => null]
                    && resolverHorario(null, ['apertura' => null, 'cierre' => null])['cerrado'] === true
                    && resolverHorario(null, null) === null;
            }],
        ['T94', 'Periodos especiales que se solapan → el segundo se rechaza (409); uno aparte sí se guarda',
            function () use ($pdo): bool {
                $biblioteca = crearBibliotecaPrueba($pdo);
                $primero = insertarEspecial($pdo, $biblioteca, especialPrueba());
                $solapado = insertarEspecial($pdo, $biblioteca, especialPrueba([
                    'fecha_inicio' => '2099-12-26', 'fecha_fin' => '2099-12-31', 'descripcion' => 'Fin de año',
                ]));
                $distinto = insertarEspecial($pdo, $biblioteca, especialPrueba([
                    'fecha_inicio' => '2100-01-05', 'fecha_fin' => '2100-01-05', 'descripcion' => 'Otro',
                ]));
                return $primero && !$solapado && $distinto;
            }],
        ['T95', 'Validación de periodos: fechas al revés, fecha inexistente u horas incoherentes → rechazados',
            function (): bool {
                return validarEspecial(especialPrueba())
                    && !validarEspecial(especialPrueba(['fecha_inicio' => '2099-12-27', 'fecha_fin' => '2099-12-20']))
                    && !validarEspecial(especialPrueba(['fecha_inicio' => '2099-02-30']))
                    && !validarEspecial(especialPrueba(['cerrado' => false]))
                    && !validarEspecial(especialPrueba(['cerrado' => true, 'apertura' => '09:00', 'cierre' => '15:00']));
            }],
        ['T96', 'Borrar un periodo especial lo quita; borrarlo otra vez no encuentra nada (404)',
            function () use ($pdo): bool {
                $biblioteca = crearBibliotecaPrueba($pdo);
                insertarEspecial($pdo, $biblioteca, especialPrueba());
                $id = findCalendarioEspecial($pdo, $biblioteca)[0]['id'];
                return borrarEspecial($pdo, $biblioteca, $id)
                    && !borrarEspecial($pdo, $biblioteca, $id)
                    && findCalendarioEspecial($pdo, $biblioteca) === [];
            }],
        ['T97', 'Horario de hoy: sin horario definido → null; con horario semanal → las horas de hoy',
            function () use ($pdo): bool {
                $biblioteca = crearBibliotecaPrueba($pdo);
                $hoy = new DateTimeImmutable('today');
                $sinHorario = findHorarioHoy($pdo, $biblioteca, $hoy) === null;
                guardarHorarioSemana($pdo, $biblioteca, semanaPrueba('08:00', '21:00'));
                $conHorario = findHorarioHoy($pdo, $biblioteca, $hoy);
                return $sinHorario && $conHorario['apertura'] === '08:00' && $conHorario['cerrado'] === false;
            }],
    ];
};

/** Biblioteca de prueba (con su zona) y devuelve su id. */
function crearBibliotecaPrueba(PDO $pdo): int
{
    $zona = crearZonaPrueba($pdo);
    $consulta = $pdo->prepare('SELECT biblioteca_id FROM zona WHERE id = :id');
    $consulta->execute(['id' => $zona['id']]);
    return (int) $consulta->fetchColumn();
}

function ponerRolPrueba(PDO $pdo, int $usuarioId, string $rol): void
{
    $consulta = $pdo->prepare('UPDATE usuario SET rol = :rol WHERE id = :id');
    $consulta->execute(['rol' => $rol, 'id' => $usuarioId]);
}

/** Semana con los 7 días abiertos en el mismo horario. */
function semanaPrueba(string $apertura, string $cierre): array
{
    return array_map(
        fn (int $dia): array => ['dia' => $dia, 'apertura' => $apertura, 'cierre' => $cierre],
        range(DIA_SEMANA_MIN, DIA_SEMANA_MAX)
    );
}

function contarFilasHorarioPrueba(PDO $pdo, int $bibliotecaId): int
{
    $consulta = $pdo->prepare('SELECT COUNT(*) FROM horario_biblioteca WHERE biblioteca_id = :id');
    $consulta->execute(['id' => $bibliotecaId]);
    return (int) $consulta->fetchColumn();
}

/** Periodo especial de prueba (Navidad 2099, cerrado), con los cambios que se indiquen. */
function especialPrueba(array $cambios = []): array
{
    return array_merge([
        'fecha_inicio' => '2099-12-24',
        'fecha_fin' => '2099-12-26',
        'descripcion' => 'Navidad',
        'cerrado' => true,
        'apertura' => null,
        'cierre' => null,
    ], $cambios);
}
