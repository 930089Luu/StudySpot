/*
 * Información legal: el botón de volver regresa a la pantalla de la que vienes (Ajustes,
 * registro…) y, si se ha abierto suelta, a Ajustes.
 */
if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
  document.getElementById('volver').addEventListener('click', (evento) => {
    evento.preventDefault();
    window.history.back();
  });
}
