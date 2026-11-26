-- StudySpot — histórico de sesiones DE EJEMPLO para ver las franjas típicas (US05) en la demo.
-- Uso (después de schema.sql y datos_ejemplo.sql): mysql -u root < database/historico_ejemplo.sql
-- Se puede ejecutar varias veces: borra lo generado antes y lo vuelve a crear.
--
-- NO son datos reales. Crea 130 usuarios de ejemplo (correo @ejemplo.invalid, sin contraseña
-- válida: no pueden iniciar sesión) y les asigna sesiones terminadas de los últimos 28 días
-- en las zonas 1–8 (una por biblioteca), con un patrón inventado pero creíble:
-- picos a media mañana y a media tarde, menos gente el fin de semana. Cada zona tiene su escala
-- respecto a ISLA Gaia (1,0), más o menos según su tamaño (Kadora, la mitad).
-- 130 usuarios: demo_ocupacion_ahora.sql necesita uno distinto por sesión activa.
SET NAMES utf8mb4;
USE studyspot;

-- Al borrar los usuarios de ejemplo se borran sus sesiones (ON DELETE CASCADE).
DELETE FROM usuario WHERE email LIKE 'ejemplo.historico.%@ejemplo.invalid';

INSERT INTO usuario (nombre, email, password_hash)
WITH RECURSIVE numeros (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM numeros WHERE n < 130)
SELECT CONCAT('Estudiante de ejemplo ', n), CONCAT('ejemplo.historico.', n, '@ejemplo.invalid'), '!'
FROM numeros;

INSERT INTO sesion_estudio (usuario_id, zona_id, hora_inicio, hora_fin, estado, puntos_otorgados)
WITH RECURSIVE
    dias (d) AS (SELECT 1 UNION ALL SELECT d + 1 FROM dias WHERE d < 28),
    horas (h) AS (SELECT 8 UNION ALL SELECT h + 1 FROM horas WHERE h < 21),
    repeticiones (k) AS (SELECT 1 UNION ALL SELECT k + 1 FROM repeticiones WHERE k < 16),
    -- Llegadas por hora (usuarios de la app) en un día laborable en ISLA Gaia.
    patron (h, llegadas) AS (
        SELECT 8, 3 UNION ALL SELECT 9, 6 UNION ALL SELECT 10, 8 UNION ALL SELECT 11, 7
        UNION ALL SELECT 12, 5 UNION ALL SELECT 13, 3 UNION ALL SELECT 14, 4 UNION ALL SELECT 15, 6
        UNION ALL SELECT 16, 7 UNION ALL SELECT 17, 6 UNION ALL SELECT 18, 5 UNION ALL SELECT 19, 3
        UNION ALL SELECT 20, 2 UNION ALL SELECT 21, 1
    ),
    zonas (zona_id, escala) AS (
        SELECT 1, 1.0 UNION ALL SELECT 2, 0.5 UNION ALL SELECT 3, 1.2 UNION ALL SELECT 4, 0.8
        UNION ALL SELECT 5, 1.6 UNION ALL SELECT 6, 1.0 UNION ALL SELECT 7, 0.7 UNION ALL SELECT 8, 0.4
    ),
    franjas AS (
        SELECT dias.d, horas.h, zonas.zona_id,
               DATE(NOW()) - INTERVAL dias.d DAY + INTERVAL horas.h HOUR AS inicio_franja,
               -- Sábado (WEEKDAY 5) al 40 %, domingo (6) al 25 %; ±1 de variación fija por franja.
               GREATEST(0, ROUND(patron.llegadas * zonas.escala * CASE WEEKDAY(DATE(NOW()) - INTERVAL dias.d DAY)
                   WHEN 5 THEN 0.4 WHEN 6 THEN 0.25 ELSE 1 END)
                   + CRC32(CONCAT(dias.d, '-', horas.h, '-', zonas.zona_id)) % 3 - 1) AS llegadas
        FROM dias JOIN horas JOIN zonas JOIN patron ON patron.h = horas.h
    ),
    sesiones AS (
        SELECT f.zona_id,
               f.inicio_franja + INTERVAL CRC32(CONCAT(f.d, f.h, f.zona_id, r.k, 'm')) % 60 MINUTE AS inicio,
               60 + CRC32(CONCAT(f.d, f.h, f.zona_id, r.k, 'd')) % 120 AS minutos,
               CRC32(CONCAT(f.d, f.h, f.zona_id, r.k, 'u')) % 130 AS usuario_n
        FROM franjas f JOIN repeticiones r ON r.k <= f.llegadas
    )
SELECT u.id, s.zona_id, s.inicio, s.inicio + INTERVAL s.minutos MINUTE, 'finished', LEAST(16, FLOOR(s.minutos / 15))
FROM sesiones s
JOIN usuario u ON u.email = CONCAT('ejemplo.historico.', s.usuario_n + 1, '@ejemplo.invalid');

SELECT z.biblioteca_id, COUNT(*) AS sesiones_de_ejemplo
FROM sesion_estudio s JOIN zona z ON z.id = s.zona_id
JOIN usuario u ON u.id = s.usuario_id AND u.email LIKE 'ejemplo.historico.%'
GROUP BY z.biblioteca_id;
