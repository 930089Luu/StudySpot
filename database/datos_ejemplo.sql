-- StudySpot — datos de ejemplo para desarrollo y para la demo.
-- Uso (después de schema.sql): mysql -u root < database/datos_ejemplo.sql
-- Se puede ejecutar varias veces: los ids son fijos y se actualizan.
--
-- Coordenadas tomadas de OpenStreetMap (entrada del edificio). Capacidad y factor de
-- adopción son valores de ejemplo. Para probar el check-in desde otro sitio, cambiar
-- latitud/longitud de la biblioteca.
-- Capacidad de ISLA Gaia (60 plazas): contada por Lucía en la sala el 20-11-2026. La de Kadora
-- y el factor de adopción (0,3) siguen siendo valores de ejemplo hasta medirlos.
-- Los QR de cada zona codifican la URL:
--   <app_url>/public/checkin.html?zona=<id>&token=<token_qr>

-- SET NAMES: sin esto, el cliente mysql de Windows lee las tildes con otra codificación.
SET NAMES utf8mb4;
USE studyspot;

INSERT INTO biblioteca (id, nombre, direccion, latitud, longitud, capacidad_maxima, factor_adopcion)
VALUES
    (1, 'Biblioteca ISLA Gaia', 'Rua Diogo Macedo 192, 4400-107 Vila Nova de Gaia',
        41.124563, -8.613560, 60, 0.300),
    (2, 'Biblioteca Kadora Campus Street', 'Rua Alberto Malafaya Baptista 171, Paranhos, Porto',
        41.182063, -8.610648, 40, 0.300)
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre), direccion = VALUES(direccion),
    latitud = VALUES(latitud), longitud = VALUES(longitud),
    capacidad_maxima = VALUES(capacidad_maxima), factor_adopcion = VALUES(factor_adopcion);

-- Quita zonas de ejemplo antiguas de estas bibliotecas que ya no están en la lista.
DELETE FROM zona WHERE biblioteca_id IN (1, 2) AND id NOT IN (1, 2);

INSERT INTO zona (id, biblioteca_id, nombre, token_qr)
VALUES
    (1, 1, 'Sala de lectura', '4cabd192590ee77b3a1d915aac49d6a7'),
    (2, 2, 'Sala de estudio', '5ad62b2cd7e2258af79058aec5a298c8')
ON DUPLICATE KEY UPDATE
    biblioteca_id = VALUES(biblioteca_id), nombre = VALUES(nombre), token_qr = VALUES(token_qr);
