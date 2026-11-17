/*
 * Rutas entre pantallas y parámetros de URL compartidos.
 */

export const RUTA_LOGIN = 'index.html';
export const RUTA_INICIO = 'inicio.html';

// Parámetro con el que otras pantallas piden al login que muestre un aviso.
export const PARAM_AVISO = 'aviso';
export const AVISO_CUENTA_CREADA = 'cuenta-creada';
export const AVISO_PASSWORD_CAMBIADA = 'password-cambiada';

export function crearRutaLoginConAviso(aviso) {
  return `${RUTA_LOGIN}?${PARAM_AVISO}=${encodeURIComponent(aviso)}`;
}
