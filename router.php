<?php
/*
 * Router para el servidor de desarrollo de PHP (sin Apache):
 *   C:\xampp\php\php.exe -S 127.0.0.1:8765 -t . router.php
 *
 * 1. Solo sirve la web (public/) y los endpoints (api/*.php). Todo lo demás da 404: sin este
 *    router, el servidor deja descargar cualquier archivo de la carpeta (.git/, storage/ con los
 *    correos de recuperación, notas locales…), y eso importa en cuanto se abre un túnel HTTPS.
 * 2. Detrás del túnel HTTPS (cloudflared), PHP recibe la petición por http desde 127.0.0.1 con la
 *    cabecera X-Forwarded-Proto: https. Se marca como HTTPS para que la cookie de sesión sea Secure.
 *    Solo se confía en esa cabecera si la conexión viene de este mismo equipo (el túnel).
 */
declare(strict_types=1);

const RUTA_INICIO_WEB = '/public/';
const DIRECCIONES_LOCALES = ['127.0.0.1', '::1'];

$ruta = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');

if (in_array($_SERVER['REMOTE_ADDR'] ?? '', DIRECCIONES_LOCALES, true)
    && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') {
    $_SERVER['HTTPS'] = 'on';
}

if ($ruta === '/') {
    header('Location: ' . RUTA_INICIO_WEB, true, 302);
    return true;
}

// Rutas permitidas: cualquier archivo de public/ y los endpoints de api/ (no _http.php).
$esWeb = str_starts_with($ruta, '/public/') && !str_contains($ruta, '..');
$esEndpoint = preg_match('#^/api/[a-z]+\.php$#', $ruta) === 1;

if ($esWeb || $esEndpoint) {
    return false;   // el servidor de PHP sirve el archivo (o ejecuta el .php) como siempre
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'No encontrado.';
return true;
