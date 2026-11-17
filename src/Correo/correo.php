<?php
/*
 * Envío de correos de StudySpot con PHPMailer (lib/PHPMailer).
 * Transporte según config.php → 'mail_transporte':
 *   'smtp'    envía con la cuenta de Gmail del proyecto;
 *   'archivo' guarda el correo como .eml en storage/correos/ (desarrollo y demo sin red).
 */
declare(strict_types=1);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../constantes.php';
require_once __DIR__ . '/plantilla.php';
require_once __DIR__ . '/../../lib/PHPMailer/Exception.php';
require_once __DIR__ . '/../../lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../../lib/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;

const CORREO_TRANSPORTE_SMTP = 'smtp';
const CORREO_TRANSPORTE_ARCHIVO = 'archivo';
const CORREO_DIR_ARCHIVO = __DIR__ . '/../../storage/correos';
const CORREO_TIMEOUT_SEGUNDOS = 10;
const CORREO_LOGO_PATH = __DIR__ . '/../../public/img/studyspot-horizontal-color.png';
const CORREO_LOGO_CID = 'logo-studyspot';
const RUTA_RESTABLECER = '/public/restablecer.html';

const ASUNTO_RECUPERACION = 'Restablece tu contraseña de StudySpot';

function enviarCorreoRecuperacion(array $usuario, string $token): void
{
    $variables = [
        'nombre'   => $usuario['nombre'],
        'enlace'   => crearEnlaceRestablecer($token),
        'minutos'  => (string) RECUPERACION_MINUTOS_VALIDEZ,
        'logo_cid' => CORREO_LOGO_CID,
    ];
    $correo = crearCorreo($usuario['email'], $usuario['nombre'], ASUNTO_RECUPERACION);
    $correo->Body = renderPlantillaHtml('recuperar_password.html', $variables);
    $correo->AltBody = renderPlantillaTexto('recuperar_password.txt', $variables);
    enviarCorreo($correo);
}

function crearEnlaceRestablecer(string $token): string
{
    return getConfig('app_url') . RUTA_RESTABLECER . '?token=' . rawurlencode($token);
}

/** Correo base con remitente, destinatario, asunto y el logo incrustado (se ve sin descargar imágenes externas). */
function crearCorreo(string $email, string $nombre, string $asunto): PHPMailer
{
    $correo = new PHPMailer(true);
    $correo->CharSet = PHPMailer::CHARSET_UTF8;
    $correo->setFrom(getConfig('mail_from'), getConfig('mail_from_name'));
    $correo->addAddress($email, $nombre);
    $correo->Subject = $asunto;
    $correo->isHTML(true);
    $correo->addEmbeddedImage(CORREO_LOGO_PATH, CORREO_LOGO_CID, 'studyspot.png');
    return $correo;
}

function enviarCorreo(PHPMailer $correo): void
{
    $transporte = getConfig('mail_transporte');
    if ($transporte === CORREO_TRANSPORTE_SMTP) {
        configurarSmtp($correo);
        $correo->send();
        return;
    }
    if ($transporte === CORREO_TRANSPORTE_ARCHIVO) {
        guardarCorreoEnArchivo($correo);
        return;
    }
    throw new RuntimeException("mail_transporte desconocido en config.php: '$transporte'.");
}

function configurarSmtp(PHPMailer $correo): void
{
    $correo->isSMTP();
    $correo->Host = getConfig('smtp_host');
    $correo->Port = (int) getConfig('smtp_port');
    $correo->SMTPAuth = true;
    $correo->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $correo->Username = getConfig('smtp_user');
    $correo->Password = getConfig('smtp_pass');
    $correo->Timeout = CORREO_TIMEOUT_SEGUNDOS;
}

/** Genera el mensaje completo (MIME) sin enviarlo y lo guarda como .eml; devuelve la ruta. */
function guardarCorreoEnArchivo(PHPMailer $correo): string
{
    $correo->preSend();
    if (!is_dir(CORREO_DIR_ARCHIVO) && !mkdir(CORREO_DIR_ARCHIVO, 0775, true)) {
        throw new RuntimeException('No se puede crear ' . CORREO_DIR_ARCHIVO);
    }
    $ruta = CORREO_DIR_ARCHIVO . '/' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.eml';
    file_put_contents($ruta, $correo->getSentMIMEMessage());
    return $ruta;
}
