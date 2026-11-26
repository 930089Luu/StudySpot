/*
 * Si ya se ha visto la bienvenida de Sito en este navegador. Se guarda en localStorage: es solo
 * una comodidad de este dispositivo, no hace falta en la base de datos.
 * Si el navegador no deja guardar (modo privado, almacenamiento bloqueado), se da por vista:
 * mejor no enseñarla que enseñarla cada vez.
 */
const CLAVE_BIENVENIDA = 'studyspot.bienvenidaVista';

export function isBienvenidaVista() {
  try {
    return window.localStorage.getItem(CLAVE_BIENVENIDA) === '1';
  } catch (error) {
    console.error(error);
    return true;
  }
}

export function marcarBienvenidaVista() {
  try {
    window.localStorage.setItem(CLAVE_BIENVENIDA, '1');
  } catch (error) {
    console.error(error);
  }
}
