/*
 * Editor del avatar (27-11), con el proceso de un Memoji: eliges una categoría, tocas un color o
 * una miniatura y la vista previa cambia al momento. OK guarda en la cuenta (api/cuenta.php,
 * acción "avatar"); Cancelar vuelve sin guardar. Los dibujos están en js/avatar.js.
 */
import { accionCuenta, getCuenta } from './api.js';
import { AVATAR_INICIAL, AVATAR_OPCIONES, PESTANAS, aplicarGenero, dibujarAvatar } from './avatar.js';
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
  activarInclinacion();
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
  pintarCategorias();
  pintarTodo();
  return null;
}

function pintarTodo() {
  document.getElementById('avatar-vista').innerHTML = dibujarAvatar(avatar);
  pintarPanel();
}

/* ---------- categorías ---------- */

/** Las pestañas de este personaje (la barba solo sale si es chico). */
function pestanasVisibles() {
  return PESTANAS.filter((p) => !p.soloSi || p.soloSi(avatar));
}

function pintarCategorias() {
  const barra = document.getElementById('avatar-categorias');
  barra.replaceChildren(...pestanasVisibles().map((p) => {
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
  const visibles = pestanasVisibles();
  [...document.getElementById('avatar-categorias').children].forEach((boton, indice) => {
    boton.setAttribute('aria-selected', String(visibles[indice] === pestana));
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
  // Chica / Chico: dos opciones, a media anchura cada una (sin hueco vacío)
  opciones.classList.toggle('editor-avatar__opciones--dos', Boolean(pestana.nombres));
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
  if (pestana.nombres) {
    // Chica / Chico: su punto de partida, con el nombre debajo
    boton.classList.add('editor-avatar__miniatura--nombre');
    boton.innerHTML = `${dibujarAvatar(aplicarGenero(avatar, indice))}<span>${pestana.nombres[indice]}</span>`;
    boton.setAttribute('aria-label', pestana.nombres[indice]);
  } else {
    boton.innerHTML = dibujarAvatar({ ...avatar, [pestana.parte]: indice }, pestana.encuadre);
  }
  boton.addEventListener('click', () => elegir(pestana.parte, indice));
  return boton;
}

function elegir(parte, indice) {
  if (parte === 'genero') {
    if (avatar.genero !== indice) avatar = aplicarGenero(avatar, indice);
    pintarCategorias();
  } else {
    avatar = { ...avatar, [parte]: indice };
  }
  pintarTodo();
  // Un saltito de la vista previa, como cuando cambias algo en un Memoji.
  const vista = document.getElementById('avatar-vista');
  vista.classList.remove('editor-avatar__vista--salta');
  void vista.offsetWidth;
  vista.classList.add('editor-avatar__vista--salta');
}

/* ---------- inclinación en 3D ---------- */

/**
 * El personaje se inclina hacia el dedo o el ratón, con un brillo que se mueve, como las tarjetas
 * de Apple; al soltar vuelve a su sitio y se balancea suave. Sin movimiento si el sistema lo pide.
 */
function activarInclinacion() {
  const vista = document.getElementById('avatar-vista');
  const escena = vista.parentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  vista.classList.add('editor-avatar__vista--reposo');
  const inclinar = (evento) => {
    const caja = vista.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((evento.clientX - caja.left) / caja.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((evento.clientY - caja.top) / caja.height) * 2 - 1));
    vista.classList.remove('editor-avatar__vista--reposo');
    vista.style.setProperty('--giro-x', `${(-y * 16).toFixed(1)}deg`);
    vista.style.setProperty('--giro-y', `${(x * 20).toFixed(1)}deg`);
    vista.style.setProperty('--brillo-x', `${50 + x * 30}%`);
    vista.style.setProperty('--brillo-y', `${40 + y * 30}%`);
  };
  const soltar = () => {
    ['--giro-x', '--giro-y', '--brillo-x', '--brillo-y'].forEach((v) => vista.style.removeProperty(v));
    vista.classList.add('editor-avatar__vista--reposo');
  };
  escena.addEventListener('pointermove', inclinar);
  escena.addEventListener('pointerdown', inclinar);
  escena.addEventListener('pointerleave', soltar);
  escena.addEventListener('pointerup', (evento) => { if (evento.pointerType !== 'mouse') soltar(); });
  escena.addEventListener('pointercancel', soltar);
}

/* ---------- guardar y quitar ---------- */

async function guardar(evento) {
  await enviar(evento.currentTarget, avatar);
}

async function quitar(evento) {
  // El botón se guarda antes de esperar: después del await, evento.currentTarget ya es null.
  const boton = evento.currentTarget;
  const seguro = await confirmar({
    titulo: '¿Quitar tu avatar?',
    texto: 'Volverán a verse tus iniciales.',
    accion: 'Quitar',
    destructiva: true,
  });
  if (seguro) await enviar(boton, null);
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
