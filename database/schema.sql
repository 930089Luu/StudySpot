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
    -- Mejora de US03 (22-11): el mapa se abre en esta biblioteca. La clave ajena va más abajo,
    -- después de crear la tabla biblioteca.
    biblioteca_favorita_id INT UNSIGNED NULL,
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
    -- Zona horaria del edificio (nombre IANA, p. ej. Europe/Madrid): su horario está en esa hora local.
    zona_horaria     VARCHAR(64) NOT NULL DEFAULT 'Europe/Lisbon',
    PRIMARY KEY (id)
) ENGINE = InnoDB;

-- La zona horaria se añadió el 26-11-2026: en una BD anterior se crea aquí (las bibliotecas
-- que ya había están en Portugal, así que les vale el valor por defecto).
ALTER TABLE biblioteca
    ADD COLUMN IF NOT EXISTS zona_horaria VARCHAR(64) NOT NULL DEFAULT 'Europe/Lisbon' AFTER factor_adopcion;

-- Biblioteca favorita de cada usuario: si se borra la biblioteca, se queda sin favorita.
ALTER TABLE usuario
    ADD FOREIGN KEY IF NOT EXISTS fk_usuario_biblioteca_favorita (biblioteca_favorita_id)
        REFERENCES biblioteca (id) ON DELETE SET NULL;

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

-- Bloqueos entre estudiantes (mejora de privacidad de US06, añadida en el Sprint 2).
-- Si A bloquea a B: se borra lo que hubiera entre ellos en amistad, B no puede enviar
-- solicitudes a A (la API le contesta como si la cuenta no existiera) y A no puede enviárselas
-- a B hasta desbloquearlo. Desbloquear no recupera la amistad.
CREATE TABLE IF NOT EXISTS bloqueo (
    bloqueador_id INT UNSIGNED NOT NULL,
    bloqueado_id  INT UNSIGNED NOT NULL,
    fecha_bloqueo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (bloqueador_id, bloqueado_id),
    KEY idx_bloqueo_bloqueado (bloqueado_id),
    CONSTRAINT fk_bloqueo_bloqueador FOREIGN KEY (bloqueador_id)
        REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_bloqueo_bloqueado FOREIGN KEY (bloqueado_id)
        REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT chk_bloqueo_no_uno_mismo CHECK (bloqueador_id <> bloqueado_id)
) ENGINE = InnoDB;

-- US08: horario semanal de cada biblioteca. dia_semana: 1 = lunes … 7 = domingo (ISO-8601).
-- Dos horas a NULL = cerrado ese día. Después de guardar la semana siempre hay 7 filas.
CREATE TABLE IF NOT EXISTS horario_biblioteca (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    biblioteca_id INT UNSIGNED NOT NULL,
    dia_semana    TINYINT UNSIGNED NOT NULL,
    hora_apertura TIME NULL,
    hora_cierre   TIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_horario_dia (biblioteca_id, dia_semana),
    CONSTRAINT fk_horario_biblioteca FOREIGN KEY (biblioteca_id)
        REFERENCES biblioteca (id) ON DELETE CASCADE,
    CONSTRAINT chk_horario_dia CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT chk_horario_horas CHECK (
        (hora_apertura IS NULL AND hora_cierre IS NULL)
        OR (hora_apertura IS NOT NULL AND hora_cierre IS NOT NULL AND hora_apertura < hora_cierre))
) ENGINE = InnoDB;

-- US08: periodos especiales (exámenes, Navidad…). cerrado = TRUE: la biblioteca no abre esos días.
-- cerrado = FALSE con horas: horario especial. Dos periodos de la misma biblioteca no se solapan.
CREATE TABLE IF NOT EXISTS calendario_especial (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    biblioteca_id INT UNSIGNED NOT NULL,
    fecha_inicio  DATE NOT NULL,
    fecha_fin     DATE NOT NULL,
    descripcion   VARCHAR(100) NOT NULL,
    cerrado       BOOLEAN NOT NULL DEFAULT FALSE,
    hora_apertura TIME NULL,
    hora_cierre   TIME NULL,
    PRIMARY KEY (id),
    KEY idx_calendario_biblioteca (biblioteca_id, fecha_inicio),
    CONSTRAINT fk_calendario_biblioteca FOREIGN KEY (biblioteca_id)
        REFERENCES biblioteca (id) ON DELETE CASCADE,
    CONSTRAINT chk_calendario_fechas CHECK (fecha_inicio <= fecha_fin),
    CONSTRAINT chk_calendario_horas CHECK (
        (cerrado = TRUE AND hora_apertura IS NULL AND hora_cierre IS NULL)
        OR (cerrado = FALSE AND hora_apertura IS NOT NULL AND hora_cierre IS NOT NULL
            AND hora_apertura < hora_cierre))
) ENGINE = InnoDB;

-- US07 (26-11): grupos para el ranking semanal. Una persona puede estar en varios (clase,
-- amigos del cole, pareja…). Cada grupo tiene su objetivo semanal, que ajusta su administrador.
CREATE TABLE IF NOT EXISTS grupo (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre           VARCHAR(50) NOT NULL,
    objetivo_semanal SMALLINT UNSIGNED NOT NULL DEFAULT 40,
    fecha_creacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_grupo_objetivo CHECK (objetivo_semanal BETWEEN 1 AND 2000)
) ENGINE = InnoDB;

-- Quién está en cada grupo. estado: invited (invitación sin responder) o member (dentro).
-- rol: admin (cambia nombre y objetivo, invita, quita gente y nombra administradores) o member.
-- Solo se invita a amigos aceptados. Siempre queda al menos un admin: si el último se va,
-- pasa a serlo quien lleva más tiempo dentro; si no queda nadie, el grupo se borra.
CREATE TABLE IF NOT EXISTS grupo_miembro (
    grupo_id     INT UNSIGNED NOT NULL,
    usuario_id   INT UNSIGNED NOT NULL,
    rol          ENUM('admin', 'member') NOT NULL DEFAULT 'member',
    estado       ENUM('invited', 'member') NOT NULL DEFAULT 'invited',
    invitado_por INT UNSIGNED NULL,
    fecha        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (grupo_id, usuario_id),
    KEY idx_grupo_miembro_usuario (usuario_id, estado),
    CONSTRAINT fk_grupo_miembro_grupo FOREIGN KEY (grupo_id)
        REFERENCES grupo (id) ON DELETE CASCADE,
    CONSTRAINT fk_grupo_miembro_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_grupo_miembro_invitador FOREIGN KEY (invitado_por)
        REFERENCES usuario (id) ON DELETE SET NULL
) ENGINE = InnoDB;
