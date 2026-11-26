/*
 * Preferencias del dispositivo (Ajustes): idioma y apariencia. Se guardan en localStorage para
 * aplicarlas al instante en todas las pantallas; el idioma también se guarda en la cuenta.
 * La apariencia se aplica con data-tema en <html> (lo lee css/tokens.css); "auto" sigue al sistema.
 */
export const IDIOMAS = [
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'English' },
  { codigo: 'pt', nombre: 'Português' },
];
export const APARIENCIAS = ['auto', 'claro', 'oscuro'];

const CLAVE_IDIOMA = 'studyspot.idioma';
const CLAVE_APARIENCIA = 'studyspot.apariencia';
const IDIOMA_POR_DEFECTO = 'es';

/** Idioma guardado; si no hay, el del navegador si es uno de los nuestros; si no, español. */
export function getIdioma() {
  const guardado = leer(CLAVE_IDIOMA);
  if (IDIOMAS.some(({ codigo }) => codigo === guardado)) return guardado;
  const delNavegador = (navigator.language || '').slice(0, 2);
  return IDIOMAS.some(({ codigo }) => codigo === delNavegador) ? delNavegador : IDIOMA_POR_DEFECTO;
}

export function setIdioma(codigo) {
  escribir(CLAVE_IDIOMA, codigo);
}

export function getApariencia() {
  const guardada = leer(CLAVE_APARIENCIA);
  return APARIENCIAS.includes(guardada) ? guardada : 'auto';
}

export function setApariencia(valor) {
  escribir(CLAVE_APARIENCIA, valor);
  aplicarApariencia(valor);
}

/** Pone data-tema="claro" u "oscuro" en <html>; en "auto" lo quita y manda el sistema. */
export function aplicarApariencia(valor = getApariencia()) {
  const raiz = document.documentElement;
  if (valor === 'auto') raiz.removeAttribute('data-tema');
  else raiz.setAttribute('data-tema', valor);
}

// localStorage puede no estar disponible (modo privado estricto): entonces no se recuerda nada.
function leer(clave) {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave, valor) {
  try {
    window.localStorage.setItem(clave, valor);
  } catch {
    /* sin localStorage: la preferencia dura hasta recargar */
  }
}
