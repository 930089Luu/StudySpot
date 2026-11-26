-- StudySpot — ocupación DE EJEMPLO ahora mismo, para enseñar el mapa en la demo (US03).
-- Uso (después de historico_ejemplo.sql, que crea los usuarios de ejemplo):
--   mysql -u root < database/demo_ocupacion_ahora.sql
-- Ejecutarlo poco antes de la demo: las sesiones activas caducan solas a las 4 h.
--
-- NO son datos reales. Abre sesiones activas a usuarios de ejemplo (todas con factor 0,3):
--   zona 1 ISLA Gaia          (cap.  60): 16 sesiones → ≈ 53 personas → 89 %, fiabilidad alta
--   zona 2 Kadora             (cap.  40):  4 sesiones → ≈ 13 personas → 33 %, fiabilidad baja
--   zona 3 Almeida Garrett    (cap. 120): 22 sesiones → ≈ 73 personas → 61 %, fiabilidad alta
--   zona 4 Pública do Porto   (cap. 150):  6 sesiones → ≈ 20 personas → 13 %, fiabilidad media
--   zona 5 FLUP               (cap. 200): 48 sesiones → ≈ 160 personas → 80 %, fiabilidad alta
--   zona 6 FFUP-ICBAS         (cap. 100): 14 sesiones → ≈ 47 personas → 47 %, fiabilidad media
--   zona 7 Municipal de Gaia  (cap.  80):  8 sesiones → ≈ 27 personas → 33 %, fiabilidad media
--   zona 8 ISPGaya            (cap.  50):  2 sesiones → ≈  7 personas → 13 %, fiabilidad baja
SET NAMES utf8mb4;
USE studyspot;

-- Quita las sesiones activas de ejemplo de una ejecución anterior.
DELETE s FROM sesion_estudio s
JOIN usuario u ON u.id = s.usuario_id
WHERE s.estado = 'active' AND u.email LIKE 'ejemplo.historico.%@ejemplo.invalid';

-- Un usuario de ejemplo distinto por sesión: nadie puede tener dos sesiones activas.
-- Los usuarios 1–16 van a la zona 1, 17–20 a la 2, 21–42 a la 3… (hasta = último usuario de la zona).
INSERT INTO sesion_estudio (usuario_id, zona_id, hora_inicio, estado)
WITH
    reparto (zona_id, desde, hasta) AS (
        SELECT 1, 1, 16 UNION ALL SELECT 2, 17, 20 UNION ALL SELECT 3, 21, 42
        UNION ALL SELECT 4, 43, 48 UNION ALL SELECT 5, 49, 96 UNION ALL SELECT 6, 97, 110
        UNION ALL SELECT 7, 111, 118 UNION ALL SELECT 8, 119, 120
    ),
    ejemplo (id, n) AS (
        SELECT id, CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(email, '@', 1), '.', -1) AS UNSIGNED)
        FROM usuario
        WHERE email LIKE 'ejemplo.historico.%@ejemplo.invalid'
    )
SELECT e.id, r.zona_id, NOW() - INTERVAL (5 + e.id % 90) MINUTE, 'active'
FROM ejemplo e
JOIN reparto r ON e.n BETWEEN r.desde AND r.hasta;

SELECT z.biblioteca_id, COUNT(*) AS sesiones_activas_de_ejemplo
FROM sesion_estudio s JOIN zona z ON z.id = s.zona_id
JOIN usuario u ON u.id = s.usuario_id AND u.email LIKE 'ejemplo.historico.%'
WHERE s.estado = 'active'
GROUP BY z.biblioteca_id;
