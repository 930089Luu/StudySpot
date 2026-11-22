-- StudySpot — datos de ejemplo para desarrollo y para la demo.
-- Uso (después de schema.sql): mysql -u root < database/datos_ejemplo.sql
-- Se puede ejecutar varias veces: los ids son fijos y se actualizan.
--
-- Coordenadas tomadas de OpenStreetMap (entrada del edificio). Capacidad y factor de
-- adopción son valores de ejemplo. Para probar el check-in desde otro sitio, cambiar
-- latitud/longitud de la biblioteca.
-- Capacidad de ISLA Gaia (60 plazas): contada por Lucía en la sala el 20-11-2026. La del resto
-- de bibliotecas y el factor de adopción (0,3) siguen siendo valores de ejemplo hasta medirlos.
-- Bibliotecas 3–8 (22-11-2026): bibliotecas reales de Oporto y Gaia, con nombre, calle y
-- coordenadas de OpenStreetMap. Cada una tiene una zona de ejemplo con su QR.
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
        41.182063, -8.610648, 40, 0.300),
    (3, 'Biblioteca Municipal Almeida Garrett', 'Rua de Entre Quintas 328, Massarelos, Porto',
        41.148246, -8.626897, 120, 0.300),
    (4, 'Biblioteca Pública Municipal do Porto', 'Rua Dom João IV 17, Bonfim, Porto',
        41.146162, -8.601393, 150, 0.300),
    (5, 'Biblioteca FLUP', 'Via Panorâmica Edgar Cardoso, Massarelos, Porto',
        41.150369, -8.633038, 200, 0.300),
    (6, 'Biblioteca FFUP-ICBAS', 'Rua de Jorge Viterbo Ferreira 228, Massarelos, Porto',
        41.147666, -8.623479, 100, 0.300),
    (7, 'Biblioteca Pública Municipal de Vila Nova de Gaia', 'Rua de Angola, Mafamude, Vila Nova de Gaia',
        41.122835, -8.603675, 80, 0.300),
    (8, 'Biblioteca ISPGaya', 'Avenida dos Descobrimentos 333, Santa Marinha, Vila Nova de Gaia',
        41.119902, -8.623508, 50, 0.300)
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre), direccion = VALUES(direccion),
    latitud = VALUES(latitud), longitud = VALUES(longitud),
    capacidad_maxima = VALUES(capacidad_maxima), factor_adopcion = VALUES(factor_adopcion);

-- Quita zonas de ejemplo antiguas de estas bibliotecas que ya no están en la lista.
DELETE FROM zona WHERE biblioteca_id BETWEEN 1 AND 8 AND id NOT BETWEEN 1 AND 8;

INSERT INTO zona (id, biblioteca_id, nombre, token_qr)
VALUES
    (1, 1, 'Sala de lectura', '4cabd192590ee77b3a1d915aac49d6a7'),
    (2, 2, 'Sala de estudio', '5ad62b2cd7e2258af79058aec5a298c8'),
    (3, 3, 'Sala de lectura', 'ef0fc335a1ebc721af42534b10227094'),
    (4, 4, 'Sala de lectura', '38bf4d7efb284d59829ac25060ea6482'),
    (5, 5, 'Sala de estudio', '6fcb8d5466c8c1f2cf67fc51898592a4'),
    (6, 6, 'Sala de estudio', '2abf8c9dcc706bec66a2db14b77e213f'),
    (7, 7, 'Sala de lectura', '258bedf735dde9594254c217a77f694e'),
    (8, 8, 'Sala de estudio', 'e1c577062cc855a707e9cfa9a4eaa1f8')
ON DUPLICATE KEY UPDATE
    biblioteca_id = VALUES(biblioteca_id), nombre = VALUES(nombre), token_qr = VALUES(token_qr);
