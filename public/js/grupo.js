/*
 * Pantalla de un grupo (US07): ranking de la semana (podio, clasificación, objetivo), personas,
 * ajustes y salir. La administración ve "Añadir personas", toca a una persona para gestionarla y
 * cambia nombre y objetivo (se guardan al salir del campo, como en Ajustes de iOS).
 * Quien decide es el servidor: api/grupos.php comprueba el rol en cada acción.
 */
import { accionGrupo, enviarSolicitudAmistad, getAmigos, getGrupo, getRanking } from './api.js';
import { MENSAJE_ERROR_GENERICO, enviarFormulario, mostrarAlerta, mostrarErrorRespuesta } from './formulario.js';
import { getIniciales } from './iniciales.js';
import { PARAM_GRUPO, RUTA_LOGIN } from './rutas.js';

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_UNAUTHORIZED = 401;
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const RUTA_SOCIAL = 'social.html';
const NUM_COLORES = 8;
// En el podio el 1.º va en el centro: se pintan en el orden 2.º, 1.º, 3.º.
const ORDEN_PODIO = [1, 0, 2];
// Columna de cada puesto del podio (1.º al centro, 2.º a la izquierda, 3.º a la derecha).
const COLUMNA_PODIO = [2, 1, 3];
const PORCENTAJE_MAXIMO = 100;

const grupoId = Number(new URLSearchParams(window.location.search).get(PARAM_GRUPO));
let datosGrupo = null;
let personaElegida = null;

function init() {
  document.getElementById('boton-anadir-personas').addEventListener('click', abrirAnadir);
  document.getElementById('cerrar-anadir').addEventListener('click', () => document.getElementById('hoja-anadir').close());
  document.getElementById('boton-salir').addEventListener('click', handleSalir);
  document.getElementById('form-nuevo-amigo').addEventListener('submit', handleNuevoAmigo);
  prepararAjustes();
  prepararHojaPersona();
  for (const id of ['hoja-anadir', 'hoja-persona']) {
    const hoja = document.getElementById(id);
    hoja.addEventListener('click', (evento) => { if (evento.target === hoja) hoja.close(); });
  }
  cargar().catch((error) => {
    console.error(error);
    mostrarError(MENSAJE_SIN_CONEXION);
  });
}

async function cargar() {
  const [grupo, ranking] = await Promise.all([getGrupo(grupoId), getRanking(grupoId)]);
  if ([grupo, ranking].some(({ estado }) => estado === HTTP_UNAUTHORIZED)) return window.location.assign(RUTA_LOGIN);
  if (grupo.estado !== HTTP_OK) return mostrarError(grupo.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
  datosGrupo = grupo.cuerpo;
  document.title = `${datosGrupo.nombre} · StudySpot`;
  document.getElementById('grupo-titulo').textContent = datosGrupo.nombre;
  document.getElementById('bloque-anadir').hidden = !datosGrupo.es_admin;
  if (ranking.estado === HTTP_OK) mostrarRanking(ranking.cuerpo);
  mostrarPersonas(datosGrupo);
  mostrarAjustes(datosGrupo);
  document.getElementById('grupo-cargando').hidden = true;
  document.getElementById('grupo-contenido').hidden = false;
  return null;
}

/* ---------- ranking ---------- */

function mostrarRanking({ personas, podio, total, objetivo, porcentaje }) {
  // Cada puesto del podio va siempre en su columna (1.º en el centro), aunque falten personas.
  const escalones = ORDEN_PODIO.filter((indice) => podio[indice]).map((indice) => {
    const escalon = crearEscalon(podio[indice]);
    escalon.style.gridColumn = String(COLUMNA_PODIO[indice]);
    return escalon;
  });
  document.getElementById('ranking-podio').replaceChildren(...escalones);
  document.getElementById('ranking-podio').hidden = podio.length === 0;
  document.getElementById('ranking-podio-vacio').hidden = podio.length > 0;
  document.getElementById('ranking-lista').replaceChildren(...personas.map(crearFilaRanking));
  mostrarObjetivo(personas, total, objetivo, porcentaje);
}

function crearEscalon(persona) {
  const { nombre, puntos, posicion } = persona;
  const escalon = crearElemento('li', `ios-podium__step ios-podium__step--${posicion}`);
  escalon.setAttribute('aria-label', `${posicion}.º ${nombre}${persona.es_yo ? ' (tú)' : ''}, ${puntos} puntos`);
  const avatar = crearElemento('span', 'ios-podium__avatar');
  avatar.append(crearAvatar(persona.iniciales, persona.color), crearTexto('span', 'ios-podium__position', `${posicion}`));
  escalon.append(
    avatar,
    crearTexto('span', 'ios-podium__name', persona.es_yo ? 'Tú' : getNombrePila(nombre)),
    crearTexto('span', 'ios-podium__points', `${puntos} pts`),
  );
  return escalon;
}

function crearFilaRanking(persona) {
  const fila = crearElemento('div', persona.es_yo ? 'ios-row ios-row--yo' : 'ios-row');
  const nombre = crearTexto('span', 'ios-row__title', persona.nombre);
  if (persona.es_yo) nombre.append(crearTexto('span', 'ios-badge', 'Tú'));
  const cuerpo = crearElemento('span', 'ios-row__body');
  cuerpo.append(nombre);
  fila.append(
    crearTexto('span', 'ios-row__position', `${persona.posicion}`),
    crearAvatar(persona.iniciales, persona.color),
    cuerpo,
    crearTexto('span', 'ios-row__value', `${persona.puntos} pts`),
  );
  return envolverEnLi(fila);
}

function mostrarObjetivo(personas, total, objetivo, porcentaje) {
  document.getElementById('objetivo-puntos').textContent = `${total} de ${objetivo} puntos`;
  document.getElementById('objetivo-porcentaje').textContent = total >= objetivo ? '¡Conseguido!' : `${porcentaje} %`;
  const conPuntos = personas.filter(({ puntos }) => puntos > 0);
  // Si el grupo pasa del objetivo, los tramos se reparten la barra entera en proporción.
  const escala = Math.max(total, objetivo);
  const barra = document.getElementById('objetivo-barra');
  barra.replaceChildren(...conPuntos.map(({ puntos, color }) => {
    const tramo = crearElemento('span', `goal-bar__tramo persona--${color}`);
    tramo.style.setProperty('--ancho', `${(puntos / escala) * PORCENTAJE_MAXIMO}%`);
    return tramo;
  }));
  barra.setAttribute('aria-label', `${total} de ${objetivo} puntos. `
    + conPuntos.map(({ nombre, puntos }) => `${nombre}, ${puntos}`).join('; '));
  document.getElementById('objetivo-leyenda').replaceChildren(...conPuntos.map((persona) => {
    const item = crearElemento('li', 'goal-legend__item');
    item.append(
      crearTexto('span', `goal-legend__dot persona--${persona.color}`, persona.iniciales),
      crearTexto('span', '', persona.es_yo ? 'Tú' : getNombrePila(persona.nombre)),
      crearTexto('span', 'goal-legend__points', `${persona.puntos}`),
    );
    return item;
  }));
}

/* ---------- personas ---------- */

function mostrarPersonas({ miembros, es_admin: soyAdmin }) {
  document.getElementById('miembros-lista').replaceChildren(...miembros.map((m) => crearFilaPersona(m, soyAdmin)));
  document.getElementById('miembros-ayuda').textContent = soyAdmin
    ? 'Toca a una persona para hacerla administradora o quitarla del grupo.'
    : 'Solo la administración del grupo puede añadir o quitar personas.';
}

function crearFilaPersona(miembro, soyAdmin) {
  const { usuario_id: usuarioId, nombre, es_admin: esAdmin, invitado, es_yo: esYo } = miembro;
  const gestionable = soyAdmin && !esYo;
  const fila = crearElemento(gestionable ? 'button' : 'div', 'ios-row');
  if (gestionable) {
    fila.type = 'button';
    fila.addEventListener('click', () => abrirHojaPersona(miembro));
  }
  const cuerpo = crearElemento('span', 'ios-row__body');
  cuerpo.append(crearTexto('span', 'ios-row__title', esYo ? `${nombre} (tú)` : nombre));
  if (invitado) cuerpo.append(crearTexto('span', 'ios-row__subtitle', 'Invitación pendiente'));
  fila.append(crearAvatar(getIniciales(nombre), usuarioId % NUM_COLORES), cuerpo);
  if (esAdmin) fila.append(crearTexto('span', 'ios-row__value', 'Admin'));
  return envolverEnLi(fila);
}

function prepararHojaPersona() {
  const hoja = document.getElementById('hoja-persona');
  document.getElementById('accion-cancelar').addEventListener('click', () => hoja.close());
  document.getElementById('accion-admin').addEventListener('click', () => {
    hoja.close();
    accionSobrePersona(personaElegida.es_admin ? 'quitar_admin' : 'hacer_admin');
  });
  document.getElementById('accion-quitar').addEventListener('click', () => {
    hoja.close();
    accionSobrePersona('quitar');
  });
}

function abrirHojaPersona(miembro) {
  personaElegida = miembro;
  document.getElementById('titulo-hoja-persona').textContent = miembro.nombre;
  const botonAdmin = document.getElementById('accion-admin');
  botonAdmin.hidden = miembro.invitado;
  botonAdmin.textContent = miembro.es_admin ? 'Quitar de la administración' : 'Hacer administrador/a';
  document.getElementById('accion-quitar').textContent = miembro.invitado ? 'Anular la invitación' : 'Quitar del grupo';
  document.getElementById('hoja-persona').showModal();
}

async function accionSobrePersona(accion) {
  await ejecutar(() => accionGrupo(accion, { grupo: grupoId, usuario: personaElegida.usuario_id }));
}

/* ---------- añadir personas ---------- */

async function abrirAnadir() {
  document.getElementById('hoja-anadir').showModal();
  await pintarInvitables();
}

async function pintarInvitables() {
  const respuesta = await getAmigos();
  if (respuesta.estado !== HTTP_OK) return;
  const yaEstan = new Set(datosGrupo.miembros.map(({ usuario_id: id }) => id));
  const invitables = respuesta.cuerpo.amigos.filter(({ usuario_id: id }) => !yaEstan.has(id));
  document.getElementById('invitar-lista').replaceChildren(...invitables.map(crearFilaInvitable));
  document.getElementById('invitar-lista').hidden = invitables.length === 0;
  document.getElementById('invitar-ayuda').textContent = invitables.length === 0
    ? 'Todos tus amigos ya están en el grupo o tienen la invitación.'
    : 'Les llegará una invitación y entrarán cuando la acepten.';
}

function crearFilaInvitable({ usuario_id: usuarioId, nombre }) {
  const fila = crearElemento('div', 'ios-row');
  const cuerpo = crearElemento('span', 'ios-row__body');
  cuerpo.append(crearTexto('span', 'ios-row__title', nombre));
  const boton = crearTexto('button', 'ios-pill', 'Invitar');
  boton.type = 'button';
  boton.addEventListener('click', async () => {
    boton.disabled = true;
    const respuesta = await accionGrupo('invitar', { grupo: grupoId, usuario: usuarioId });
    if (respuesta.estado === HTTP_CREATED) {
      boton.textContent = 'Invitado';
      await cargar();
    } else {
      boton.disabled = false;
      mostrarError(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
    }
  });
  fila.append(crearAvatar(getIniciales(nombre), usuarioId % NUM_COLORES), cuerpo, boton);
  return envolverEnLi(fila);
}

async function handleNuevoAmigo(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const ayuda = document.getElementById('nuevo-amigo-ayuda');
  const respuesta = await enviarFormulario(formulario, ({ friend_email: correo }) => enviarSolicitudAmistad(correo));
  if (respuesta === null) return;
  if (respuesta.estado === HTTP_UNAUTHORIZED) return window.location.assign(RUTA_LOGIN);
  if (respuesta.estado !== HTTP_OK && respuesta.estado !== HTTP_CREATED) {
    return mostrarErrorRespuesta(formulario, respuesta.cuerpo);
  }
  formulario.reset();
  ayuda.textContent = 'Solicitud enviada. Cuando la acepte, aparecerá en "Tus amigos" para invitarle.';
}

/* ---------- ajustes ---------- */

function mostrarAjustes({ nombre, objetivo, es_admin: esAdmin }) {
  const formulario = document.getElementById('form-ajustes');
  formulario.elements.namedItem('nombre').value = nombre;
  formulario.elements.namedItem('objetivo').value = objetivo;
  [...formulario.elements].forEach((campo) => { campo.disabled = !esAdmin; });
  document.getElementById('ajustes-ayuda').textContent = esAdmin
    ? 'El objetivo son los puntos que queréis sumar entre todos cada semana (1 punto = 15 minutos).'
    : 'Solo la administración puede cambiar el nombre y el objetivo.';
}

/** Se guarda al salir del campo o pulsar Intro, como en Ajustes de iOS. */
function prepararAjustes() {
  const formulario = document.getElementById('form-ajustes');
  formulario.addEventListener('change', guardarAjustes);
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    document.activeElement?.blur();
  });
}

async function guardarAjustes() {
  const formulario = document.getElementById('form-ajustes');
  const nombre = formulario.elements.namedItem('nombre').value.trim();
  const objetivo = Number(formulario.elements.namedItem('objetivo').value);
  if (nombre === datosGrupo.nombre && objetivo === datosGrupo.objetivo) return;
  const respuesta = await enviarFormulario(formulario, () => accionGrupo('editar', { grupo: grupoId, nombre, objetivo }));
  if (respuesta === null) return;
  if (respuesta.estado !== HTTP_OK) {
    mostrarErrorRespuesta(formulario, respuesta.cuerpo);
    return;
  }
  await cargar();
}

/* ---------- salir ---------- */

async function handleSalir() {
  if (!window.confirm('¿Salir del grupo? Para volver te tendrán que invitar otra vez.')) return;
  const ok = await ejecutar(() => accionGrupo('salir', { grupo: grupoId }), false);
  if (ok) window.location.assign(RUTA_SOCIAL);
}

/* ---------- comunes ---------- */

/** Ejecuta una acción, avisa si falla y recarga la pantalla. true si ha ido bien. */
async function ejecutar(llamada, recargar = true) {
  mostrarAlerta(document.getElementById('grupo-alerta'), '');
  try {
    const respuesta = await llamada();
    if (respuesta.estado === HTTP_UNAUTHORIZED) {
      window.location.assign(RUTA_LOGIN);
      return false;
    }
    if (respuesta.estado !== HTTP_OK && respuesta.estado !== HTTP_CREATED) {
      mostrarError(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
      return false;
    }
    if (recargar) await cargar();
    return true;
  } catch (error) {
    console.error(error);
    mostrarError(MENSAJE_SIN_CONEXION);
    return false;
  }
}

/** Círculo de color con las iniciales: el color nunca va solo. */
function crearAvatar(iniciales, color) {
  const avatar = crearTexto('span', `avatar-persona persona--${color}`, iniciales);
  avatar.setAttribute('aria-hidden', 'true');
  return avatar;
}

function getNombrePila(nombre) {
  return nombre.trim().split(/\s+/)[0];
}

function envolverEnLi(contenido) {
  const item = document.createElement('li');
  item.append(contenido);
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
  document.getElementById('grupo-cargando').hidden = true;
  mostrarAlerta(document.getElementById('grupo-alerta'), mensaje);
  document.getElementById('grupo-alerta').scrollIntoView({ block: 'center' });
}

init();
