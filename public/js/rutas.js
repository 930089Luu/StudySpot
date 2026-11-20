/*
 * Rutas entre pantallas y parámetros de URL compartidos.
 */

export const RUTA_LOGIN = 'index.html';
export const RUTA_INICIO = 'inicio.html';

// Parámetro con el que otras pantallas piden al login que muestre un aviso.
export const PARAM_AVISO = 'aviso';
export const AVISO_CUENTA_CREADA = 'cuenta-creada';
export const AVISO_PASSWORD_CAMBIADA = 'password-cambiada';
export const AVISO_SESION_CERRADA = 'sesion-cerrada';

export function crearRutaLoginConAviso(aviso) {
  return `${RUTA_LOGIN}?${PARAM_AVISO}=${encodeURIComponent(aviso)}`;
}

// Puntos de la sesión de estudio que se cerró al cerrar sesión (K06), para el aviso del login.
export const PARAM_PUNTOS = 'puntos';

export function crearRutaLoginConPuntos(aviso, puntos) {
  return `${crearRutaLoginConAviso(aviso)}&${PARAM_PUNTOS}=${encodeURIComponent(puntos)}`;
}

// El QR de cada zona lleva el enlace checkin.html?zona=<id>&token=<token_qr> (US02).
export const PARAM_ZONA = 'zona';
export const PARAM_TOKEN = 'token';

/**
 * Saca la zona y el token de un enlace de QR. Devuelve { zona, token } o null si el enlace
 * no tiene ese formato. Que el token sea el correcto lo comprueba solo el servidor.
 */
export function leerZonaDeUrl(url) {
  const zona = Number(url.searchParams.get(PARAM_ZONA));
  const token = url.searchParams.get(PARAM_TOKEN) ?? '';
  return Number.isInteger(zona) && zona > 0 && token !== '' ? { zona, token } : null;
}

/** Como leerZonaDeUrl, pero a partir del texto leído en un QR (puede no ser un enlace). */
export function leerZonaDeTexto(texto) {
  try {
    return leerZonaDeUrl(new URL(texto));
  } catch {
    return null;
  }
}
