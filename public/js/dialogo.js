/*
 * Ventana de confirmación propia con <dialog> (en vez de window.confirm, que no sigue el diseño).
 * El <dialog> lleva un <form method="dialog"> con dos botones: value="aceptar" y value="cancelar".
 * Escape o "Cancelar" cuentan como no.
 */
const VALOR_ACEPTAR = 'aceptar';

/** Abre la ventana con ese texto. La promesa se cumple con true si se acepta. */
export function confirmar(dialogo, texto) {
  dialogo.querySelector('.dialog__text').textContent = texto;
  dialogo.returnValue = '';
  dialogo.showModal();
  return new Promise((resolver) => {
    dialogo.addEventListener('close', () => resolver(dialogo.returnValue === VALOR_ACEPTAR), { once: true });
  });
}
