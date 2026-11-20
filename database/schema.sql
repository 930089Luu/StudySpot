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

-- US02: bibliotecas. Las coordenadas son las del edificio: el check-in solo vale a
-- RADIO_CHECKIN_METROS de este punto (src/constantes.php).
-- factor_adopcion (0–1] = fracción estimada de estudiantes que usan la app (US03).
CREATE TABLE IF NOT EXISTS biblioteca (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre           VARCHAR(150) NOT NULL,
    direccion        VARCHAR(255) NOT NULL,
    foto_url         VARCHAR(255) NULL,
    latitud          DECIMAL(9, 6) NOT NULL,
    longitud         DECIMAL(9, 6) NOT NULL,
    capacidad_maxima INT UNSIGNED NOT NULL,
    factor_adopcion  DECIMAL(4, 3) NOT NULL DEFAULT 1.000,
    PRIMARY KEY (id)
) ENGINE = InnoDB;

-- US02: zonas de cada biblioteca. Cada zona tiene un QR impreso con su token_qr.
CREATE TABLE IF NOT EXISTS zona (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    biblioteca_id INT UNSIGNED NOT NULL,
    nombre        VARCHAR(100) NOT NULL,
    token_qr      CHAR(32) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_zona_token (token_qr),
    CONSTRAINT fk_zona_biblioteca FOREIGN KEY (biblioteca_id)
        REFERENCES biblioteca (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- US02: sesiones de estudio. A propósito NO hay columnas de latitud ni longitud:
-- las coordenadas del móvil solo se usan para validar el check-in (RGPD).
-- hora_fin y puntos_otorgados son NULL mientras la sesión está activa.
CREATE TABLE IF NOT EXISTS sesion_estudio (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id       INT UNSIGNED NOT NULL,
    zona_id          INT UNSIGNED NOT NULL,
    hora_inicio      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hora_fin         DATETIME NULL,
    estado           ENUM('active', 'finished', 'expired') NOT NULL DEFAULT 'active',
    puntos_otorgados TINYINT UNSIGNED NULL,
    PRIMARY KEY (id),
    KEY idx_sesion_usuario_estado (usuario_id, estado),
    KEY idx_sesion_zona_estado (zona_id, estado),
    KEY idx_sesion_estado_inicio (estado, hora_inicio),
    CONSTRAINT fk_sesion_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_sesion_zona FOREIGN KEY (zona_id)
        REFERENCES zona (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- US06: amistades entre estudiantes (relación N:N entre usuarios).
-- estado: pending (esperando respuesta), accepted (amigos), rejected (rechazada).
-- Cada pareja tiene como mucho una fila, en cualquier sentido: usuario_menor y usuario_mayor
-- ordenan la pareja (A-B y B-A dan lo mismo) y la UNIQUE impide la segunda fila.
-- Una solicitud rechazada se reutiliza si alguno de los dos vuelve a pedir amistad.
CREATE TABLE IF NOT EXISTS amistad (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    solicitante_id  INT UNSIGNED NOT NULL,
    destinatario_id INT UNSIGNED NOT NULL,
    estado          ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_menor   INT UNSIGNED AS (LEAST(solicitante_id, destinatario_id)) STORED,
    usuario_mayor   INT UNSIGNED AS (GREATEST(solicitante_id, destinatario_id)) STORED,
    PRIMARY KEY (id),
    UNIQUE KEY uq_amistad_pareja (usuario_menor, usuario_mayor),
    KEY idx_amistad_solicitante (solicitante_id),
    KEY idx_amistad_destinatario (destinatario_id, estado),
    CONSTRAINT fk_amistad_solicitante FOREIGN KEY (solicitante_id)
        REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_amistad_destinatario FOREIGN KEY (destinatario_id)
        REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT chk_amistad_no_uno_mismo CHECK (solicitante_id <> destinatario_id)
) ENGINE = InnoDB;
