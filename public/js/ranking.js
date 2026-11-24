/*
 * Pantalla de ranking semanal y objetivo compartido (US07).
 * El servidor calcula la semana, el orden y el objetivo; aquí solo se pinta.
 */
import { getRanking } from './api.js';
import { MENSAJE_ERROR_GENERICO, mostrarAlerta } from './formulario.js';
import { RUTA_LOGIN } from './rutas.js';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const TEXTO_TU_FILA = ' (tú)';

async function init() {
  try {
    const respuesta = await getRanking();
    if (respuesta.estado === HTTP_UNAUTHORIZED) {
      window.location.assign(RUTA_LOGIN);
      return;
    }
    if (respuesta.estado !== HTTP_OK) {
      mostrarError(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
      return;
    }
    mostrarRanking(respuesta.cuerpo);
  } catch (error) {
    console.error(error);
    mostrarError(MENSAJE_SIN_CONEXION);
  }
}

function mostrarRanking({ ranking, objetivo }) {
  document.getElementById('objetivo-barra').value = objetivo.porcentaje;
  document.getElementById('objetivo-texto').textContent =
    `${objetivo.puntos} / ${objetivo.meta} puntos · ${objetivo.porcentaje} %`;
  document.getElementById('ranking-lista').replaceChildren(...ranking.map(crearFila));
  // Si solo estás tú en el ranking, se muestra el aviso para añadir amigos.
  document.getElementById('ranking-vacio').hidden = ranking.length > 1;
  document.getElementById('ranking-cargando').hidden = true;
  document.getElementById('ranking-contenido').hidden = false;
}

function crearFila({ nombre, puntos, es_yo: esYo }) {
  const item = crearElemento('li', esYo ? 'rank-list__item rank-list__item--yo' : 'rank-list__item');
  item.append(
    crearTexto('span', 'rank-list__name', esYo ? `${nombre}${TEXTO_TU_FILA}` : nombre),
    crearTexto('span', 'rank-list__points', `${puntos} puntos`),
  );
  return item;
}

function crearElemento(etiqueta, clases) {
  const elemento = document.createElement(etiqueta);
  elemento.className = clases;
  return elemento;
}

function crearTexto(etiqueta, clases, texto) {
  const elemento = crearElemento(etiqueta, clases);
  elemento.textContent = texto;
  return elemento;
}

function mostrarError(mensaje) {
  document.getElementById('ranking-cargando').hidden = true;
  mostrarAlerta(document.getElementById('ranking-alerta'), mensaje);
}

init();
