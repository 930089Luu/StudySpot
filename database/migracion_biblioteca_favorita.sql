-- Añade la biblioteca favorita a una tabla usuario creada antes del 22-11-2026.
-- Solo hace falta si la BD ya existía; en una BD nueva basta con schema.sql.
-- Se puede ejecutar más de una vez: cada paso comprueba si ya está hecho.
USE studyspot;

ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS biblioteca_favorita_id INT UNSIGNED NULL AFTER comparte_ubicacion,
    ADD FOREIGN KEY IF NOT EXISTS fk_usuario_biblioteca_favorita (biblioteca_favorita_id)
        REFERENCES biblioteca (id) ON DELETE SET NULL;
