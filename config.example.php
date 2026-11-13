<?php
/*
 * Plantilla de configuración local.
 * Copiar como config.php (en la misma carpeta) y rellenar los valores.
 * config.php está en .gitignore: nunca se sube al repositorio.
 */
return [
    // Base de datos
    'db_host'      => 'localhost',
    'db_name'      => 'studyspot',
    'db_user'      => 'root',
    'db_pass'      => '',

    // Mapa
    'mapbox_token' => '',

    // Dirección pública de la app (sin barra final). Se usa en los enlaces de los correos.
    'app_url'      => 'http://localhost/studyspot',

    // Correo. 'archivo' guarda cada correo como .eml en storage/correos/ (para desarrollo, sin enviar);
    // 'smtp' lo envía de verdad con la cuenta de Gmail del proyecto.
    'mail_transporte' => 'archivo',
    'mail_from'       => 'cuenta-del-proyecto@gmail.com',
    'mail_from_name'  => 'StudySpot',
    'smtp_host'       => 'smtp.gmail.com',
    'smtp_port'       => '587',
    'smtp_user'       => 'cuenta-del-proyecto@gmail.com',
    // Contraseña de aplicación de Google (16 letras), NO la contraseña normal de la cuenta.
    'smtp_pass'       => '',
];
