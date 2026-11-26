/*
 * Editor del avatar (27-11), con el proceso de un Memoji: eliges una categoría, tocas un color o
 * una miniatura y la vista previa cambia al momento. OK guarda en la cuenta (api/cuenta.php,
 * acción "avatar"); Cancelar vuelve sin guardar. Los dibujos están en js/avatar.js.
 */
import { accionCuenta, getCuenta } from './api.js';
import { AVATAR_INICIAL, AVATAR_OPCIONES, PESTANAS, dibujarAvatar } from './avatar.js';
import { confirmar } from './confirmar.js';
import { MENSAJE_ERROR_GENERICO, mostrarAlerta } from './formulario.js';
import { RUTA_LOGIN } from './rutas.js';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const RUTA_VOLVER = 'perfil.html';

let avatar = { ...AVATAR_INICIAL };
let pestana = PESTANAS[0];
let teniaAvatar = false;

async function init() {
  document.getElementById('avatar-ok').addEventListener('click', guardar);
  document.getElementById('avatar-quitar').addEventListener('click', quitar);
  pintarCategorias();
  try {
    const respuesta = await getCuenta();
    if (respuesta.estado === HTTP_UNAUTHORIZED) return window.location.assign(RUTA_LOGIN);
    if (respuesta.estado === HTTP_OK && respuesta.cuerpo.avatar) {
      avatar = { ...respuesta.cuerpo.avatar };
      teniaAvatar = true;
    }
  } catch (error) {
    console.error(error);
  }
  document.getElementById('bloque-quitar').hidden = !teniaAvatar;
  pintarTodo();
  return null;
}

function pintarTodo() {
  document.getElementById('avatar-vista').innerHTML = dibujarAvatar(avatar);
  pintarPanel();
}

/* ---------- categorías ---------- */

function pintarCategorias() {
  const barra = document.getElementById('avatar-categorias');
  barra.replaceChildren(...PESTANAS.map((p) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'editor-avatar__categoria';
    boton.setAttribute('role', 'tab');
    boton.textContent = p.titulo;
    boton.addEventListener('click', () => {
      pestana = p;
      marcarCategoria();
      pintarPanel();
      boton.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    });
    return boton;
  }));
  marcarCategoria();
}

function marcarCategoria() {
  [...document.getElementById('avatar-categorias').children].forEach((boton, indice) => {
    boton.setAttribute('aria-selected', String(PESTANAS[indice] === pestana));
  });
}

/* ---------- colores y miniaturas de la categoría elegida ---------- */

function pintarPanel() {
  const colores = pestana.colores ? { parte: pestana.parte, colores: pestana.colores } : pestana.color;
  const filaColores = document.getElementById('avatar-colores');
  filaColores.hidden = !colores;
  if (colores) filaColores.replaceChildren(...colores.colores.map((color, indice) => crearMuestra(colores.parte, color, indice)));
  // Piel y fondo son solo color; el resto, miniaturas con cada opción puesta en tu avatar.
  const opciones = document.getElementById('avatar-opciones');
  opciones.hidden = Boolean(pestana.colores);
  if (!pestana.colores) {
    const total = AVATAR_OPCIONES[pestana.parte];
    opciones.replaceChildren(...Array.from({ length: total }, (_, indice) => crearMiniatura(indice)));
  }
}

function crearMuestra(parte, color, indice) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'editor-avatar__muestra';
  boton.style.setProperty('--muestra', color);
  boton.setAttribute('role', 'radio');
  boton.setAttribute('aria-checked', String(avatar[parte] === indice));
  boton.setAttribute('aria-label', `Color ${indice + 1}`);
  boton.addEventListener('click', () => elegir(parte, indice));
  return boton;
}

function crearMiniatura(indice) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'editor-avatar__miniatura';
  boton.setAttribute('role', 'radio');
  boton.setAttribute('aria-checked', String(avatar[pestana.parte] === indice));
  boton.setAttribute('aria-label', `${pestana.titulo} ${indice + 1}`);
  boton.innerHTML = dibujarAvatar({ ...avatar, [pestana.parte]: indice }, pestana.encuadre);
  boton.addEventListener('click', () => elegir(pestana.parte, indice));
  return boton;
}

function elegir(parte, indice) {
  avatar = { ...avatar, [parte]: indice };
  pintarTodo();
  // Un saltito de la vista previa, como cuando cambias algo en un Memoji.
  const vista = document.getElementById('avatar-vista');
  vista.classList.remove('editor-avatar__vista--salta');
  void vista.offsetWidth;
  vista.classList.add('editor-avatar__vista--salta');
}

/* ---------- guardar y quitar ---------- */

async function guardar(evento) {
  await enviar(evento.currentTarget, avatar);
}

async function quitar(evento) {
  const seguro = await confirmar({
    titulo: '¿Quitar tu avatar?',
    texto: 'Volverán a verse tus iniciales.',
    accion: 'Quitar',
    destructiva: true,
  });
  if (seguro) await enviar(evento.currentTarget, null);
}

async function enviar(boton, valor) {
  boton.disabled = true;
  mostrarAlerta(document.getElementById('avatar-alerta'), '');
  try {
    const respuesta = await accionCuenta('avatar', { avatar: valor });
    if (respuesta.estado === HTTP_UNAUTHORIZED) return window.location.assign(RUTA_LOGIN);
    if (respuesta.estado !== HTTP_OK) {
      boton.disabled = false;
      return mostrarAlerta(document.getElementById('avatar-alerta'), respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
    }
    return window.location.assign(RUTA_VOLVER);
  } catch (error) {
    console.error(error);
    boton.disabled = false;
    return mostrarAlerta(document.getElementById('avatar-alerta'), MENSAJE_SIN_CONEXION);
  }
}

init();
