-- StudySpot — horarios de las 8 bibliotecas de datos_ejemplo.sql (US08).
-- Uso (después de schema.sql y datos_ejemplo.sql):
--   mysql -u root < database/horarios_ejemplo.sql
-- Se puede repetir: borra y vuelve a crear los horarios de estas bibliotecas.
--
-- Fuentes del horario semanal (consultadas el 26-11-2026; confirmar en la web de cada biblioteca):
--   3 Almeida Garrett      iPorto / Porto Secreto: lun 14–21, mar–sáb 10–21
--   4 Pública do Porto     Porto Secreto: lun 10–18, mar–sáb 9–19:30
--   5 FLUP                 guía de la biblioteca (tiempo lectivo): lun–vie 8:15–19:45, sáb 9–13
--   6 FFUP-ICBAS           web de la biblioteca: lun–vie 8–19:30
--   7 Municipal de Gaia    agenda cultural del Porto (2025): lun–sáb 9–19
--   1 ISLA Gaia, 2 Kadora y 8 ISPGaya: no publicados → horario provisional, PENDIENTE DE CONFIRMAR.
-- Los periodos especiales (festivos y Navidad 2026) son de ejemplo, no oficiales.
SET NAMES utf8mb4;
USE studyspot;

DELETE FROM horario_biblioteca WHERE biblioteca_id BETWEEN 1 AND 8;
DELETE FROM calendario_especial WHERE biblioteca_id BETWEEN 1 AND 8;

-- dia_semana: 1 = lunes … 7 = domingo. Sin fila (o horas NULL) = cerrado.
INSERT INTO horario_biblioteca (biblioteca_id, dia_semana, hora_apertura, hora_cierre) VALUES
    -- 1 ISLA Gaia (provisional)
    (1, 1, '09:00', '21:00'), (1, 2, '09:00', '21:00'), (1, 3, '09:00', '21:00'),
    (1, 4, '09:00', '21:00'), (1, 5, '09:00', '21:00'), (1, 6, NULL, NULL), (1, 7, NULL, NULL),
    -- 2 Kadora Campus Street (provisional: sala de estudio de la residencia)
    (2, 1, '08:00', '23:00'), (2, 2, '08:00', '23:00'), (2, 3, '08:00', '23:00'),
    (2, 4, '08:00', '23:00'), (2, 5, '08:00', '23:00'), (2, 6, '08:00', '23:00'), (2, 7, '08:00', '23:00'),
    -- 3 Almeida Garrett
    (3, 1, '14:00', '21:00'), (3, 2, '10:00', '21:00'), (3, 3, '10:00', '21:00'),
    (3, 4, '10:00', '21:00'), (3, 5, '10:00', '21:00'), (3, 6, '10:00', '21:00'), (3, 7, NULL, NULL),
    -- 4 Pública Municipal do Porto
    (4, 1, '10:00', '18:00'), (4, 2, '09:00', '19:30'), (4, 3, '09:00', '19:30'),
    (4, 4, '09:00', '19:30'), (4, 5, '09:00', '19:30'), (4, 6, '09:00', '19:30'), (4, 7, NULL, NULL),
    -- 5 FLUP (tiempo lectivo)
    (5, 1, '08:15', '19:45'), (5, 2, '08:15', '19:45'), (5, 3, '08:15', '19:45'),
    (5, 4, '08:15', '19:45'), (5, 5, '08:15', '19:45'), (5, 6, '09:00', '13:00'), (5, 7, NULL, NULL),
    -- 6 FFUP-ICBAS
    (6, 1, '08:00', '19:30'), (6, 2, '08:00', '19:30'), (6, 3, '08:00', '19:30'),
    (6, 4, '08:00', '19:30'), (6, 5, '08:00', '19:30'), (6, 6, NULL, NULL), (6, 7, NULL, NULL),
    -- 7 Pública Municipal de Vila Nova de Gaia
    (7, 1, '09:00', '19:00'), (7, 2, '09:00', '19:00'), (7, 3, '09:00', '19:00'),
    (7, 4, '09:00', '19:00'), (7, 5, '09:00', '19:00'), (7, 6, '09:00', '19:00'), (7, 7, NULL, NULL),
    -- 8 ISPGaya (provisional)
    (8, 1, '09:00', '20:00'), (8, 2, '09:00', '20:00'), (8, 3, '09:00', '20:00'),
    (8, 4, '09:00', '20:00'), (8, 5, '09:00', '20:00'), (8, 6, NULL, NULL), (8, 7, NULL, NULL);

-- Periodos especiales de ejemplo. Dos periodos de la misma biblioteca no se solapan.
INSERT INTO calendario_especial (biblioteca_id, fecha_inicio, fecha_fin, descripcion, cerrado, hora_apertura, hora_cierre) VALUES
    -- Festivo nacional (8 de diciembre): todas cerradas salvo la residencia
    (1, '2026-12-08', '2026-12-08', 'Festivo', TRUE, NULL, NULL),
    (3, '2026-12-08', '2026-12-08', 'Festivo', TRUE, NULL, NULL),
    (4, '2026-12-08', '2026-12-08', 'Festivo', TRUE, NULL, NULL),
    (5, '2026-12-08', '2026-12-08', 'Festivo', TRUE, NULL, NULL),
    (6, '2026-12-08', '2026-12-08', 'Festivo', TRUE, NULL, NULL),
    (7, '2026-12-08', '2026-12-08', 'Festivo', TRUE, NULL, NULL),
    (8, '2026-12-08', '2026-12-08', 'Festivo', TRUE, NULL, NULL),
    -- Navidad: las universitarias cierran la semana entera; las municipales, los festivos
    (1, '2026-12-23', '2027-01-01', 'Navidad', TRUE, NULL, NULL),
    (5, '2026-12-23', '2027-01-01', 'Navidad', TRUE, NULL, NULL),
    (6, '2026-12-23', '2027-01-01', 'Navidad', TRUE, NULL, NULL),
    (8, '2026-12-23', '2027-01-01', 'Navidad', TRUE, NULL, NULL),
    (3, '2026-12-24', '2026-12-25', 'Navidad', TRUE, NULL, NULL),
    (4, '2026-12-24', '2026-12-25', 'Navidad', TRUE, NULL, NULL),
    (7, '2026-12-24', '2026-12-25', 'Navidad', TRUE, NULL, NULL),
    (3, '2026-12-31', '2027-01-01', 'Año Nuevo', TRUE, NULL, NULL),
    (4, '2026-12-31', '2027-01-01', 'Año Nuevo', TRUE, NULL, NULL),
    (7, '2026-12-31', '2027-01-01', 'Año Nuevo', TRUE, NULL, NULL),
    -- Exámenes: horario ampliado en FLUP
    (5, '2027-01-04', '2027-01-30', 'Época de exámenes', FALSE, '08:15', '21:00');
