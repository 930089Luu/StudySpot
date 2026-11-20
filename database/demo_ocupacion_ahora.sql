-- StudySpot — ocupación DE EJEMPLO ahora mismo, para enseñar el mapa en la demo (US03).
-- Uso (después de historico_ejemplo.sql, que crea los usuarios de ejemplo):
--   mysql -u root < database/demo_ocupacion_ahora.sql
-- Ejecutarlo poco antes de la demo: las sesiones activas caducan solas a las 4 h.
--
-- NO son datos reales. Abre sesiones activas a usuarios de ejemplo:
--   ISLA Gaia (capacidad 80, factor 0,3): 16 sesiones → 16 ÷ 0,3 ≈ 53 personas → 67 %, fiabilidad alta
--   Kadora    (capacidad 40, factor 0,3):  4 sesiones →  4 ÷ 0,3 ≈ 13 personas → 33 %, fiabilidad baja
SET NAMES utf8mb4;
USE studyspot;

-- Quita las sesiones activas de ejemplo de una ejecución anterior.
DELETE s FROM sesion_estudio s
JOIN usuario u ON u.id = s.usuario_id
WHERE s.estado = 'active' AND u.email LIKE 'ejemplo.historico.%@ejemplo.invalid';

-- Un usuario de ejemplo distinto por sesión: nadie puede tener dos sesiones activas.
INSERT INTO sesion_estudio (usuario_id, zona_id, hora_inicio, estado)
SELECT u.id,
       CASE WHEN CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(u.email, '@', 1), '.', -1) AS UNSIGNED) <= 16 THEN 1 ELSE 2 END,
       NOW() - INTERVAL (5 + u.id % 90) MINUTE,
       'active'
FROM usuario u
WHERE u.email LIKE 'ejemplo.historico.%@ejemplo.invalid'
  AND CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(u.email, '@', 1), '.', -1) AS UNSIGNED) <= 20;

SELECT z.biblioteca_id, COUNT(*) AS sesiones_activas_de_ejemplo
FROM sesion_estudio s JOIN zona z ON z.id = s.zona_id
JOIN usuario u ON u.id = s.usuario_id AND u.email LIKE 'ejemplo.historico.%'
WHERE s.estado = 'active'
GROUP BY z.biblioteca_id;
