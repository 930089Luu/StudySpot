/*
 * Alerta de confirmación con el aspecto de iOS (tarjeta centrada, título, texto y dos botones),
 * en lugar del window.confirm del navegador, que muestra "127.0.0.1 dice…" y queda poco cuidado.
 * Estilos en css/ios.css (.ios-alert). Devuelve una promesa: true si se confirma.
 *
 *   if (await confirmar({ titulo: '¿Bloquear a Ana?', texto: '…', accion: 'Bloquear', destructiva: true })) …
 */
export function confirmar({ titulo, texto = '', accion, cancelar = 'Cancelar', destructiva = false }) {
  return new Promise((resolver) => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'ios-alert';
    dialogo.setAttribute('aria-labelledby', 'ios-alert-titulo');
    const cuerpo = crear('div', 'ios-alert__body');
    const tituloElemento = crear('h2', 'ios-alert__title', titulo);
    tituloElemento.id = 'ios-alert-titulo';
    cuerpo.append(tituloElemento);
    if (texto) cuerpo.append(crear('p', 'ios-alert__text', texto));
    const botonCancelar = crear('button', 'ios-alert__button', cancelar);
    const botonAccion = crear('button', `ios-alert__button ios-alert__button--accion${destructiva ? ' ios-alert__button--destructiva' : ''}`, accion);
    const botones = crear('div', 'ios-alert__buttons');
    botones.append(botonCancelar, botonAccion);
    dialogo.append(cuerpo, botones);

    const cerrar = (resultado) => {
      dialogo.close();
      dialogo.remove();
      resolver(resultado);
    };
    botonCancelar.type = 'button';
    botonAccion.type = 'button';
    botonCancelar.addEventListener('click', () => cerrar(false));
    botonAccion.addEventListener('click', () => cerrar(true));
    // Escape cierra como "Cancelar".
    dialogo.addEventListener('cancel', (evento) => {
      evento.preventDefault();
      cerrar(false);
    });
    document.body.append(dialogo);
    dialogo.showModal();
    botonCancelar.focus();
  });
}

function crear(etiqueta, clases, texto = '') {
  const elemento = document.createElement(etiqueta);
  elemento.className = clases;
  if (texto) elemento.textContent = texto;
  return elemento;
}
