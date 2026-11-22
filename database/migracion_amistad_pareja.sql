-- Actualiza una tabla amistad creada con la primera versión de US06 (PR #4).
-- Solo hace falta si la tabla ya existía antes de este cambio; en una BD nueva basta con schema.sql.
-- Se puede ejecutar más de una vez: cada paso comprueba si ya está hecho.
--
-- Antes la BD solo impedía duplicados en el mismo sentido (A→B dos veces).
-- Ahora impide dos filas para la misma pareja en cualquier sentido (A→B y B→A).
USE studyspot;

ALTER TABLE amistad
    ADD COLUMN IF NOT EXISTS usuario_menor INT UNSIGNED
        AS (LEAST(solicitante_id, destinatario_id)) STORED,
    ADD COLUMN IF NOT EXISTS usuario_mayor INT UNSIGNED
        AS (GREATEST(solicitante_id, destinatario_id)) STORED,
    ADD KEY IF NOT EXISTS idx_amistad_solicitante (solicitante_id),
    DROP INDEX IF EXISTS uq_amistad_par,
    ADD UNIQUE KEY IF NOT EXISTS uq_amistad_pareja (usuario_menor, usuario_mayor);
