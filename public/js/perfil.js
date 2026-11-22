/*
 * Pantalla de perfil con los puntos totales (wireframe 6) (US04).
 * Los puntos los calcula el servidor (suma de los de cada sesión); aquí solo se muestran.
 */
import { cerrarSesion, getPerfil } from './api.js';
import { MENSAJE_ERROR_GENERICO, mostrarAlerta } from './formulario.js';
import { getIniciales } from './iniciales.js';
import {
  AVISO_SESION_CERRADA,
  RUTA_LOGIN,
  crearRutaLoginConAviso,
  crearRutaLoginConPuntos,
} from './rutas.js';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const formatoPuntos = new Intl.NumberFormat('es-ES');

async function init() {
  document.getElementById('boton-cerrar-sesion').addEventListener('click', handleCerrarSesion);
  try {
    const respuesta = await getPerfil();
    if (respuesta.estado === HTTP_UNAUTHORIZED) {
      window.location.assign(RUTA_LOGIN);
      return;
    }
    if (respuesta.estado !== HTTP_OK) {
      mostrarError(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
      return;
    }
    mostrarPerfil(respuesta.cuerpo);
  } catch (error) {
    console.error(error);
    mostrarError(MENSAJE_SIN_CONEXION);
  }
}

function mostrarPerfil({ nombre, email, puntos_totales: puntos }) {
  document.getElementById('perfil-iniciales').textContent = getIniciales(nombre);
  document.getElementById('perfil-nombre').textContent = nombre;
  document.getElementById('perfil-email').textContent = email;
  document.getElementById('perfil-puntos').textContent = formatoPuntos.format(puntos);
  document.getElementById('perfil-cargando').hidden = true;
  document.getElementById('perfil').hidden = false;
}

function mostrarError(mensaje) {
  document.getElementById('perfil-cargando').hidden = true;
  mostrarAlerta(document.getElementById('perfil-alerta'), mensaje);
}

/**
 * Cierra la sesión en el servidor y vuelve al login con el aviso "Has cerrado sesión".
 * Si el servidor ha cerrado también una sesión de estudio activa, el aviso lleva sus puntos.
 */
async function handleCerrarSesion(evento) {
  const boton = evento.currentTarget;
  const alerta = document.getElementById('cerrar-sesion-alerta');
  boton.disabled = true;
  mostrarAlerta(alerta, '');
  try {
    const respuesta = await cerrarSesion();
    if (respuesta.estado === HTTP_OK) {
      window.location.assign(crearRutaTrasCerrarSesion(respuesta.cuerpo.sesion_estudio));
      return;
    }
    mostrarAlerta(alerta, respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
  } catch (error) {
    console.error(error);
    mostrarAlerta(alerta, MENSAJE_SIN_CONEXION);
  }
  boton.disabled = false;
}

function crearRutaTrasCerrarSesion(sesionEstudio) {
  if (!sesionEstudio) return crearRutaLoginConAviso(AVISO_SESION_CERRADA);
  return crearRutaLoginConPuntos(AVISO_SESION_CERRADA, sesionEstudio.puntos);
}

init();
