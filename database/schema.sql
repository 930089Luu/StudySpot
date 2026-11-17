-- StudySpot — esquema de la base de datos (MySQL / MariaDB de XAMPP)
-- Uso: mysql -u root < database/schema.sql
-- Las tablas del resto de User Stories se añadirán al implementarlas.

CREATE DATABASE IF NOT EXISTS studyspot
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE studyspot;

-- US01: cuentas de estudiantes y administradores.
-- La colación *_ci hace que el UNIQUE de email no distinga mayúsculas.
CREATE TABLE IF NOT EXISTS usuario (
    id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre             VARCHAR(100) NOT NULL,
    email              VARCHAR(254) NOT NULL,
    password_hash      VARCHAR(255) NOT NULL,
    rol                ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    comparte_ubicacion BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_registro     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuario_email (email)
) ENGINE = InnoDB;

-- US09: solicitudes de recuperación de contraseña.
-- Solo se guarda el SHA-256 del token: si se filtrara la tabla, los enlaces no servirían.
-- Cada token sirve una vez (usado) y caduca (fecha_caducidad, hora de MySQL).
CREATE TABLE IF NOT EXISTS recuperacion_password (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED NOT NULL,
    token_hash      CHAR(64) NOT NULL,
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_caducidad DATETIME NOT NULL,
    usado           BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id),
    UNIQUE KEY uq_recuperacion_token (token_hash),
    KEY idx_recuperacion_usuario (usuario_id, fecha_creacion),
    CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE CASCADE
) ENGINE = InnoDB;
