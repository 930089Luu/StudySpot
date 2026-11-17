<?php
/*
 * Constantes de negocio de StudySpot (no secretas).
 * Única fuente de verdad: no repetir estos valores en ningún otro archivo.
 */
declare(strict_types=1);

// Correo institucional: se acepta el dominio exacto o cualquier subdominio.
const ALLOWED_EMAIL_DOMAINS = [
    'unizar.es', 'ucm.es', 'upm.es', 'uam.es', 'uc3m.es', 'ub.edu',
    'uv.es', 'upv.es', 'us.es', 'ugr.es', 'usal.es',
];

const EMAIL_MAX_LENGTH = 254;
const NOMBRE_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;
// bcrypt (PASSWORD_DEFAULT) ignora todo lo que pase de 72 bytes: se rechaza en vez de truncar en silencio.
const PASSWORD_MAX_LENGTH = 72;

// Recuperación de contraseña (US09)
const RECUPERACION_MINUTOS_VALIDEZ = 60;
// Tiempo mínimo entre dos correos de recuperación a la misma cuenta (evita usar la app para enviar spam).
const RECUPERACION_ESPERA_SEGUNDOS = 60;
const RECUPERACION_TOKEN_BYTES = 32;

// Código SQLSTATE de violación de restricción (p. ej. email UNIQUE repetido).
const SQLSTATE_INTEGRITY_VIOLATION = '23000';

// Check-in y sesiones de estudio (US02)
// El check-in solo vale a esta distancia (en metros) de las coordenadas de la biblioteca.
const RADIO_CHECKIN_METROS = 150;
// Una sesión activa caduca sola pasado este tiempo (4 h).
const DURACION_MAX_SESION_MINUTOS = 240;
// Radio medio de la Tierra para la fórmula de haversine.
const RADIO_TIERRA_METROS = 6371000;

// Puntos (US04): 1 punto por cada 15 minutos completos, como máximo 16 (= 4 h).
const MINUTOS_POR_PUNTO = 15;
const MAX_PUNTOS_SESION = 16;
