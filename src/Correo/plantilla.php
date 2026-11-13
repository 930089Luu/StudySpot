<?php
/*
 * Plantillas de correo: archivos en src/Correo/plantillas/ con variables {{nombre}}.
 */
declare(strict_types=1);

const CORREO_PLANTILLAS_DIR = __DIR__ . '/plantillas';

/** Rellena una plantilla HTML. Los valores se escapan: un nombre como "<b>Ana</b>" se muestra como texto. */
function renderPlantillaHtml(string $archivo, array $variables): string
{
    $escapadas = array_map(
        fn (string $valor): string => htmlspecialchars($valor, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
        $variables
    );
    return sustituirVariables(leerPlantilla($archivo), $escapadas);
}

function renderPlantillaTexto(string $archivo, array $variables): string
{
    return sustituirVariables(leerPlantilla($archivo), $variables);
}

function leerPlantilla(string $archivo): string
{
    $contenido = file_get_contents(CORREO_PLANTILLAS_DIR . '/' . $archivo);
    if ($contenido === false) {
        throw new RuntimeException("No existe la plantilla de correo $archivo.");
    }
    return $contenido;
}

function sustituirVariables(string $plantilla, array $variables): string
{
    $reemplazos = [];
    foreach ($variables as $clave => $valor) {
        $reemplazos['{{' . $clave . '}}'] = $valor;
    }
    return strtr($plantilla, $reemplazos);
}
