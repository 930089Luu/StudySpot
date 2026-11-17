<?php
/*
 * Utilidades HTTP compartidas por los endpoints. No es un endpoint:
 * el guion bajo lo distingue y no produce salida si se abre directamente.
 */
declare(strict_types=1);

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_CONFLICT = 409;
const HTTP_INTERNAL_ERROR = 500;

function responderJson(int $codigo, array $cuerpo): never
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE);
    exit;
}

function exigirMetodo(string $metodo): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $metodo) {
        header('Allow: ' . $metodo);
        responderJson(HTTP_METHOD_NOT_ALLOWED, ['error' => 'Método no permitido.']);
    }
}

/** Lee el cuerpo JSON de la petición; si no es un objeto JSON devuelve []. */
function leerCuerpoJson(): array
{
    $datos = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($datos) ? $datos : [];
}

/** Devuelve el campo como texto, o '' si falta o no es texto. */
function leerCampoTexto(array $datos, string $campo): string
{
    $valor = $datos[$campo] ?? '';
    return is_string($valor) ? $valor : '';
}

/**
 * Ejecuta el endpoint y convierte cualquier error inesperado en un 500 genérico.
 * El detalle solo va al log del servidor, nunca al cliente.
 */
function ejecutarEndpoint(callable $endpoint): never
{
    try {
        $endpoint();
    } catch (Throwable $error) {
        error_log('[StudySpot] ' . $error);
    }
    responderJson(HTTP_INTERNAL_ERROR, ['error' => 'Error interno. Inténtalo de nuevo más tarde.']);
}
