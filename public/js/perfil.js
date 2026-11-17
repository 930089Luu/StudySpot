/*
 * Pantalla de perfil con los puntos totales (wireframe 6) (US04).
 * Los puntos los calcula el servidor (suma de los de cada sesión); aquí solo se muestran.
 */
import { getPerfil } from './api.js';
import { MENSAJE_ERROR_GENERICO, mostrarAlerta } from './formulario.js';
import { RUTA_LOGIN } from './rutas.js';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const MAX_INICIALES = 2;
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const formatoPuntos = new Intl.NumberFormat('es-ES');

async function init() {
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

/** "Lucía Claver Bolea" → "LC". */
function getIniciales(nombre) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_INICIALES)
    .map((palabra) => palabra[0].toUpperCase())
    .join('');
}

init();
