/*
 * Detalle de una biblioteca (wireframe 3).
 * US03: ocupación actual, nivel y fiabilidad; se pide de nuevo cada 60 s.
 * US05: ocupación típica de cada hora del día elegido (ley de Little, calculada en el servidor).
 */
import { getBiblioteca, getFranjas, guardarFavorita } from './api.js';
import { confirmar } from './dialogo.js';
import { MENSAJE_ERROR_GENERICO, mostrarAlerta } from './formulario.js';
import {
  CLASES_NIVEL,
  CLASE_CERRADA,
  getNivelOcupacion,
  getTextoActualizado,
  getTextoApertura,
  getTextoFiabilidad,
  isCerrada,
  pintarApertura,
} from './ocupacion.js';
import { PARAM_BIBLIOTECA, RUTA_LOGIN } from './rutas.js';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const INTERVALO_REFRESCO_MS = 60 * 1000;
const DIAS_POR_SEMANA = 7;
const MENSAJE_NO_ENCONTRADA = 'Esta biblioteca no está disponible.';
const TEXTO_MARCAR_FAVORITA = 'Marcar como favorita';
const TEXTO_ES_FAVORITA = 'Favorita';
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';

async function init() {
  const bibliotecaId = new URLSearchParams(window.location.search).get(PARAM_BIBLIOTECA);
  if (!bibliotecaId) {
    mostrarErrorPagina(MENSAJE_NO_ENCONTRADA);
    return;
  }
  // favorita: la que tiene ahora el usuario ({id, nombre} o null); nombre: el de esta biblioteca.
  const estado = { id: Number(bibliotecaId), nombre: '', favorita: null };
  if (!(await cargarDetalle(bibliotecaId, estado))) return;

  document.getElementById('boton-favorita').addEventListener('click', () => cambiarFavorita(estado));
  document.querySelectorAll('.day-picker__button').forEach((boton) => {
    boton.addEventListener('click', () => cargarFranjas(bibliotecaId, Number(boton.dataset.dia)));
  });
  cargarFranjas(bibliotecaId, getDiaDeHoy());
  window.setInterval(() => cargarDetalle(bibliotecaId, estado), INTERVALO_REFRESCO_MS);
}

/** Pide y pinta la ocupación actual. Devuelve false si no se pudo (el error ya se muestra). */
async function cargarDetalle(bibliotecaId, estado) {
  try {
    const respuesta = await getBiblioteca(bibliotecaId);
    if (respuesta.estado === HTTP_UNAUTHORIZED) {
      window.location.assign(RUTA_LOGIN);
      return false;
    }
    if (respuesta.estado !== HTTP_OK) {
      mostrarErrorPagina(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
      return false;
    }
    Object.assign(estado, { nombre: respuesta.cuerpo.nombre, favorita: respuesta.cuerpo.favorita });
    mostrarDetalle(respuesta.cuerpo);
    return true;
  } catch (error) {
    console.error(error);
    mostrarErrorPagina(MENSAJE_SIN_CONEXION);
    return false;
  }
}

function mostrarDetalle(biblioteca) {
  document.title = `${biblioteca.nombre} · StudySpot`;
  document.getElementById('biblioteca-nombre').textContent = biblioteca.nombre;
  document.getElementById('biblioteca-direccion').textContent = biblioteca.direccion;
  // El mismo texto que la tarjeta del mapa: "Abierta · Cierra a las 21:00".
  pintarApertura(document.getElementById('biblioteca-horario'), biblioteca.horario_hoy, biblioteca.estado_apertura);
  mostrarFoto(biblioteca.foto_url);
  // Cerrada (US08): sin ocupación; la cabecera en gris dice cuándo abre.
  if (isCerrada(biblioteca.estado_apertura)) mostrarCerrada(biblioteca.horario_hoy, biblioteca.estado_apertura);
  else mostrarOcupacion(biblioteca.ocupacion);
  mostrarFiabilidad(biblioteca.fiabilidad, biblioteca.usuarios_activos);
  marcarFavorita(biblioteca.es_favorita);
  mostrarAlerta(document.getElementById('biblioteca-alerta'), '');
  document.getElementById('biblioteca-cargando').hidden = true;
  document.getElementById('biblioteca').hidden = false;
}

function mostrarFoto(url) {
  const foto = document.getElementById('biblioteca-foto');
  foto.hidden = !url;
  if (url) foto.src = url;
}

function mostrarOcupacion(porcentaje) {
  const nivel = getNivelOcupacion(porcentaje);
  const tarjeta = document.getElementById('ocupacion-tarjeta');
  tarjeta.classList.remove(...CLASES_NIVEL);
  tarjeta.classList.add(nivel.clase);
  mostrarPartesOcupacion(true);
  document.getElementById('ocupacion-valor').textContent = `${porcentaje} %`;
  document.getElementById('ocupacion-nivel').textContent = nivel.texto;
  const relleno = document.createElement('span');
  relleno.className = 'meter__fill';
  relleno.style.setProperty('--valor', `${porcentaje}%`);
  document.getElementById('ocupacion-barra').replaceChildren(relleno);
  document.getElementById('ocupacion-actualizado').textContent = getTextoActualizado(Date.now());
}

/**
 * Biblioteca cerrada: en lugar del % grande, "Cerrada" (o "Cerrada hoy") en gris y debajo cuándo
 * abre ("Abre a las 18:00", "Hoy de 09:00 a 20:00" o el motivo). Sin barra ni "Actualizado".
 */
function mostrarCerrada(horario, estadoApertura) {
  const { estado, detalle } = getTextoApertura(horario, estadoApertura);
  const tarjeta = document.getElementById('ocupacion-tarjeta');
  tarjeta.classList.remove(...CLASES_NIVEL);
  tarjeta.classList.add(CLASE_CERRADA);
  mostrarPartesOcupacion(false);
  document.getElementById('ocupacion-valor').textContent = estado || 'Cerrada';
  document.getElementById('ocupacion-nivel').textContent = detalle;
}

/** Lo que solo tiene sentido con la biblioteca abierta: barra, "Actualizado" y la línea de horario. */
function mostrarPartesOcupacion(abierta) {
  document.getElementById('ocupacion-valor').classList.toggle('biblio__valor--cerrada', !abierta);
  document.getElementById('ocupacion-barra').hidden = !abierta;
  document.getElementById('ocupacion-actualizado').hidden = !abierta;
  // Cerrada, el horario ya lo dice la línea de debajo de "Cerrada"
  document.getElementById('biblioteca-horario').hidden = !abierta;
}

function mostrarFiabilidad(fiabilidad, usuariosActivos) {
  document.getElementById('fiabilidad').className = `reliability reliability--${fiabilidad}`;
  document.getElementById('fiabilidad-texto').textContent = getTextoFiabilidad(fiabilidad);
  const estudiantes = usuariosActivos === 1 ? 'estudiante' : 'estudiantes';
  document.getElementById('fiabilidad-detalle').textContent =
    `Basada en ${usuariosActivos} ${estudiantes} con sesión activa. Con menos de 5, la estimación es poco fiable.`;
}

/**
 * Marca esta biblioteca como favorita, o la quita si ya lo era. Solo se puede tener una: si había
 * otra, antes se avisa de que dejará de serlo.
 */
async function cambiarFavorita(estado) {
  const isMarcar = estado.favorita?.id !== estado.id;
  if (isMarcar && estado.favorita && !(await confirmarCambioFavorita(estado.favorita.nombre))) return;
  const boton = document.getElementById('boton-favorita');
  boton.disabled = true;
  try {
    const respuesta = await guardarFavorita(isMarcar ? estado.id : null);
    if (respuesta.estado === HTTP_UNAUTHORIZED) {
      window.location.assign(RUTA_LOGIN);
      return;
    }
    if (respuesta.estado !== HTTP_OK) {
      mostrarAlerta(document.getElementById('biblioteca-alerta'), respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
      return;
    }
    estado.favorita = isMarcar ? { id: estado.id, nombre: estado.nombre } : null;
    marcarFavorita(isMarcar);
  } catch (error) {
    console.error(error);
    mostrarAlerta(document.getElementById('biblioteca-alerta'), MENSAJE_SIN_CONEXION);
  } finally {
    boton.disabled = false;
  }
}

function confirmarCambioFavorita(nombreAnterior) {
  return confirmar(
    document.getElementById('dialogo-favorita'),
    `${nombreAnterior} dejará de ser tu favorita. Solo puedes tener una.`,
  );
}

function marcarFavorita(isFavorita) {
  document.getElementById('boton-favorita').setAttribute('aria-pressed', String(isFavorita));
  document.getElementById('boton-favorita-texto').textContent = isFavorita ? TEXTO_ES_FAVORITA : TEXTO_MARCAR_FAVORITA;
}

/** Pide y pinta la ocupación típica de cada hora del día elegido (US05). */
async function cargarFranjas(bibliotecaId, dia) {
  marcarDia(dia);
  const alerta = document.getElementById('franjas-alerta');
  try {
    const respuesta = await getFranjas(bibliotecaId, dia);
    if (respuesta.estado !== HTTP_OK) {
      mostrarAlerta(alerta, respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
      return;
    }
    mostrarAlerta(alerta, '');
    mostrarFranjas(respuesta.cuerpo);
  } catch (error) {
    console.error(error);
    mostrarAlerta(alerta, MENSAJE_SIN_CONEXION);
  }
}

function marcarDia(dia) {
  document.querySelectorAll('.day-picker__button').forEach((boton) => {
    boton.setAttribute('aria-pressed', String(Number(boton.dataset.dia) === dia));
  });
}

function mostrarFranjas({ hay_datos: hayDatos, franjas, hora_mas_llena: masLlena, hora_mas_tranquila: masTranquila }) {
  document.getElementById('franjas-vacias').hidden = hayDatos;
  document.getElementById('franjas-contenido').hidden = !hayDatos;
  document.getElementById('franjas-resumen').textContent = hayDatos
    ? `Más llena: ${masLlena} h · Más tranquila: ${masTranquila} h`
    : '';
  if (!hayDatos) return;
  document.getElementById('grafico-franjas')
    .replaceChildren(...franjas.map((franja) => crearBarraFranja(franja, masLlena, masTranquila)));
  document.getElementById('eje-inicio').textContent = `${franjas[0].hora} h`;
  document.getElementById('eje-fin').textContent = `${franjas[franjas.length - 1].hora} h`;
}

function crearBarraFranja({ hora, ocupacion }, masLlena, masTranquila) {
  const barra = document.createElement('li');
  barra.className = 'chart__bar';
  if (hora === masLlena) barra.classList.add('chart__bar--max');
  if (hora === masTranquila) barra.classList.add('chart__bar--min');
  barra.style.setProperty('--valor', `${ocupacion}%`);
  barra.setAttribute('aria-label', `${hora} h: ${ocupacion} %`);
  return barra;
}

/** Día de hoy como en la API: 1 = lunes … 7 = domingo (getDay() empieza en domingo = 0). */
function getDiaDeHoy() {
  return ((new Date().getDay() + DIAS_POR_SEMANA - 1) % DIAS_POR_SEMANA) + 1;
}

function mostrarErrorPagina(mensaje) {
  document.getElementById('biblioteca-cargando').hidden = true;
  mostrarAlerta(document.getElementById('biblioteca-alerta'), mensaje);
}

init();
