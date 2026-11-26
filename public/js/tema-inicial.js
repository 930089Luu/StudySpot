/*
 * Aplica la apariencia elegida en Ajustes (clara u oscura) antes de pintar la página, para que
 * no haya un parpadeo con el tema del sistema. Script normal (no módulo) y en el <head>.
 * La misma clave que js/preferencias.js.
 */
(function aplicarTemaGuardado() {
  try {
    const tema = window.localStorage.getItem('studyspot.apariencia');
    if (tema === 'claro' || tema === 'oscuro') document.documentElement.setAttribute('data-tema', tema);
  } catch {
    /* sin localStorage: se sigue el tema del sistema */
  }
}());
