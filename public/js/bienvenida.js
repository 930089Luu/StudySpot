/*
 * Bienvenida con Sito (mejora de la experiencia, 23-11). Seis pasos; en los del medio hay que
 * hacer algo para seguir, sobre trozos reales de la interfaz: elegir en la lista la biblioteca más
 * tranquila, escanear un QR en el visor, ver cómo se cierra el anillo de puntos y (27-11) añadir a
 * una amiga, que aparece en el globo del mapa y en el ranking del grupo.
 * Todo es de prueba: no se llama a la API.
 * Al terminar o al omitirla, se recuerda en el navegador y no vuelve a salir.
 */
import { AVATAR_INICIAL, aplicarGenero, dibujarAvatar } from './avatar.js';
import { crearAnilloOcupacion, crearElementoSvg, getNivelOcupacion } from './ocupacion.js';
import { marcarBienvenidaVista } from './primera-vez.js';
import { RUTA_LOGIN, RUTA_REGISTRO } from './rutas.js';

const RUTA_POSES = 'img/mascota/';
const POSE = Object.freeze({
  saludando: 'saludando',
  senalando: 'senalando',
  escaneando: 'escaneando',
  celebrando: 'celebrando',
  pensando: 'pensando',
});
// Al acertar la biblioteca, lo que dura la celebración antes de pasar solo al paso siguiente.
const ESPERA_AUTOAVANCE_MS = 1500;
// Paso del QR: lo que tarda en pasar la línea de escaneo (igual que la animación del CSS).
const DURACION_ESCANEO_MS = 1400;
// Paso de los puntos: una hora de estudio contada en un par de segundos. El anillo se cierra al
// llegar al máximo de una sesión (16 puntos), como los anillos de actividad.
const MINUTOS_DE_PRUEBA = 60;
const MINUTOS_POR_PUNTO = 15;
const MAX_PUNTOS_SESION = 16;
const DURACION_CONTADOR_MS = 2000;
// Bibliotecas de prueba del paso de la lista: la más vacía es la respuesta buena.
const BIBLIOTECAS_PRUEBA = [
  { nombre: 'Central', ocupacion: 89 },
  { nombre: 'Letras', ocupacion: 47 },
  { nombre: 'Gaia', ocupacion: 13 },
];
// Paso social: amigos de prueba con su avatar (mismas piezas que el creador de avatar).
const CHICA = aplicarGenero(AVATAR_INICIAL, 0);
const CHICO = aplicarGenero(AVATAR_INICIAL, 1);
const AMIGOS_PRUEBA = {
  ana: { nombre: 'Ana', avatar: { ...CHICA, colorPelo: 4, gafas: 1, colorOjos: 3, fondo: 1 } },
  pablo: { nombre: 'Pablo', avatar: { ...CHICO, piel: 3, peinado: 3, colorPelo: 0, barba: 4, fondo: 2 } },
  marta: { nombre: 'Marta', avatar: { ...CHICA, piel: 6, peinado: 6, colorPelo: 0, fondo: 3, pendientes: 2 } },
};
// Ranking de prueba que sale al añadir a Marta (puntos de la semana).
const RANKING_PRUEBA = [
  { ...AMIGOS_PRUEBA.ana, puntos: 40 },
  { nombre: 'Tú', avatar: { ...AVATAR_INICIAL, fondo: 4 }, puntos: 26 },
  { ...AMIGOS_PRUEBA.marta, puntos: 20 },
];
const OCUPACION_PRUEBA_SOCIAL = 42;
const QR_PRUEBA = 'M2 2h7v7H2zM4 4v3h3V4zM15 2h7v7h-7zM17 4v3h3V4zM2 15h7v7H2zM4 17v3h3v-3zM11 2h2v2h-2zM11 6h2v4h-2zM11 12h4v2h-4zM17 11h2v2h-2zM20 13h2v4h-2zM15 16h3v2h-3zM12 15h2v3h-2zM11 20h3v2h-3zM16 20h6v2h-6z';
const CHECK = 'M7 12.5l3.2 3.2L17 9';
// Iconos del resumen final: Framework7 Icons (licencia MIT), dibujados al estilo de los iconos de
// iOS. Los de Apple (SF Symbols) no se pueden usar en una web por su licencia. Cuadrícula de 56.
const ICONO_MAPA = 'M34.188 51.414v-39.21l-11.579-7.08c-.398-.258-.867-.422-1.312-.54v39.751l11.812 6.61a6 6 0 0 0 1.079.468M6.273 50.71c.61 0 1.196-.187 1.97-.61l9.843-5.296V5.008c-.422.21-.867.445-1.312.703l-11.11 6.352c-1.406.796-2.062 1.921-2.062 3.492v32.46c0 1.735 1.007 2.696 2.672 2.696m31.126.656c.234-.07.468-.164.703-.328l12.257-6.96c1.383-.774 2.04-1.9 2.04-3.47V8.102c0-1.735-.985-2.672-2.672-2.672c-.586 0-1.195.164-1.946.586L37.4 11.78Z';
const ICONO_QR = 'M8.383 21.402c1.219 0 1.875-.68 1.875-1.922v-5.53c0-2.438 1.312-3.68 3.656-3.68h5.672c1.219 0 1.898-.68 1.898-1.899c0-1.195-.68-1.875-1.898-1.875h-5.742c-4.875 0-7.36 2.414-7.36 7.242v5.743c0 1.242.68 1.921 1.899 1.921m39.234 0c1.242 0 1.899-.68 1.899-1.922v-5.742c0-4.828-2.438-7.242-7.36-7.242h-5.719c-1.242 0-1.921.68-1.921 1.875c0 1.219.68 1.899 1.921 1.899h5.672c2.297 0 3.633 1.242 3.633 3.68v5.53c0 1.243.68 1.922 1.875 1.922m-20.625 4.57v-8.179c0-.562-.445-1.031-1.031-1.031h-8.156c-.586 0-1.032.468-1.032 1.031v8.18c0 .562.446 1.008 1.032 1.008h8.156c.586 0 1.031-.446 1.031-1.008m4.055-7.171h6.14v6.14h-6.14Zm4.36 4.36v-2.556h-2.555v2.555Zm-12.235 0v-2.556h-2.578v2.555Zm-4.36 7.898h6.141v6.14h-6.14Zm20.11.796v-2.554h-2.555v2.555Zm-7.055 0v-2.554h-2.555v2.555Zm-8.695 3.54V32.84h-2.578v2.554Zm12.234 0V32.84h-2.578v2.554Zm1.031 14.109h5.72c4.921 0 7.359-2.438 7.359-7.266V36.52c0-1.243-.68-1.922-1.899-1.922s-1.875.68-1.875 1.922v5.53c0 2.438-1.336 3.68-3.633 3.68h-5.672c-1.242 0-1.921.68-1.921 1.899c0 1.195.68 1.875 1.921 1.875m-22.593 0h5.742c1.219 0 1.898-.68 1.898-1.875c0-1.219-.68-1.898-1.898-1.898h-5.672c-2.344 0-3.656-1.243-3.656-3.68V36.52c0-1.243-.68-1.922-1.875-1.922c-1.242 0-1.899.68-1.899 1.922v5.718c0 4.852 2.485 7.266 7.36 7.266m18.023-10.57v-2.555h-2.555v2.555Zm7.055 0v-2.555h-2.555v2.555Zm.305-12.961v-8.18c0-.562-.446-1.031-1.032-1.031H30.04c-.586 0-1.031.468-1.031 1.031v8.18c0 .562.445 1.008 1.03 1.008h8.157c.586 0 1.032-.446 1.032-1.008M18.812 18.8h6.141v6.14h-6.14Zm8.18 19.406v-8.18c0-.562-.445-1.007-1.031-1.007h-8.156c-.586 0-1.032.445-1.032 1.007v8.18c0 .563.446 1.031 1.032 1.031h8.156c.586 0 1.031-.468 1.031-1.031';
const ICONO_ESTRELLA = 'M11.969 52.293c.96.727 2.18.469 3.633-.586L28 42.613l12.422 9.094c1.453 1.055 2.648 1.313 3.633.586c.96-.727 1.172-1.922.586-3.633l-4.899-14.578l12.516-9c1.453-1.031 2.039-2.11 1.664-3.281c-.375-1.125-1.477-1.688-3.281-1.664l-15.352.093l-4.664-14.648C30.063 3.848 29.22 2.981 28 2.981c-1.195 0-2.039.867-2.602 2.601L20.734 20.23l-15.351-.093c-1.805-.024-2.906.539-3.281 1.664c-.399 1.172.21 2.25 1.664 3.281l12.515 9l-4.898 14.578c-.586 1.711-.375 2.906.586 3.633';
// Dos personas (dibujado aquí, en la misma cuadrícula de 56 que los otros iconos).
const ICONO_AMIGOS = 'M21 10a8 8 0 1 1 0 16a8 8 0 1 1 0-16ZM5 46c0-9.5 7-15 16-15s16 5.5 16 15v2H5ZM38 12a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13ZM36.5 29.2C44.6 28.6 51 33 51 41v2H40.6c-.5-5.6-2.9-10.4-6.9-13.4c.9-.2 1.8-.4 2.8-.4Z';
// Resumen del último paso, como la pantalla de "Novedades" de las apps de Apple.
const RESUMEN = [
  { icono: ICONO_MAPA, titulo: 'Mira cuánta gente hay', texto: 'Elige la biblioteca con más sitio libre.' },
  { icono: ICONO_QR, titulo: 'Escanea al llegar', texto: 'El QR de tu sala hace el check-in.' },
  { icono: ICONO_ESTRELLA, titulo: 'Suma puntos', texto: 'Uno cada 15 minutos de estudio.' },
  { icono: ICONO_AMIGOS, titulo: 'Estudia con amigos', texto: 'Mira dónde están y competid en grupo.' },
];

const PASOS = [
  {
    pose: POSE.saludando,
    titulo: 'Hola, soy',
    // Como "Te damos la bienvenida a Notas": el nombre en el color de la app.
    destacado: 'Sito',
    texto: 'Te enseño StudySpot en menos de un minuto.',
    boton: 'Empezar',
  },
  {
    pose: POSE.senalando,
    titulo: 'Encuentra sitio',
    texto: 'Cuanto más lleno el anillo, más gente hay. Toca la biblioteca más tranquila.',
    crearJuego: crearJuegoLista,
    // Al acertar pasa solo al siguiente (Lucía, 23-11): no hace falta "Continuar".
    isAutoAvance: true,
  },
  {
    pose: POSE.escaneando,
    titulo: 'Escanea al llegar',
    texto: 'En cada sala hay un código QR. Escanéalo al sentarte para hacer check-in.',
    crearJuego: crearJuegoQr,
  },
  {
    pose: POSE.pensando,
    titulo: 'Suma puntos',
    texto: 'Ganas 1 punto cada 15 minutos de estudio, hasta 16 por sesión.',
    crearJuego: crearJuegoPuntos,
  },
  {
    pose: POSE.senalando,
    titulo: 'Estudia con amigos',
    texto: 'Verás en qué biblioteca están tus amigos y competiréis en grupo cada semana.',
    crearJuego: crearJuegoAmigos,
  },
  {
    pose: POSE.celebrando,
    titulo: 'Todo listo',
    texto: 'Ya sabes usar StudySpot.',
    crearJuego: crearResumen,
    isFinal: true,
  },
];

function init() {
  document.getElementById('bienvenida-saltar').addEventListener('click', marcarBienvenidaVista);
  pintarProgreso();
  mostrarPaso(0);
}

function mostrarPaso(indice) {
  const paso = PASOS[indice];
  cambiarPose(paso.pose);
  decir(paso.titulo, paso.texto, paso.destacado);
  marcarProgreso(indice);
  if (paso.isFinal) marcarBienvenidaVista();
  // En el último paso ya no hay nada que omitir.
  document.getElementById('bienvenida-saltar').hidden = Boolean(paso.isFinal);
  const siguiente = () => mostrarPaso(indice + 1);
  document.getElementById('bienvenida-acciones').replaceChildren(...crearAcciones(paso, siguiente));
  const juego = document.getElementById('bienvenida-juego');
  juego.replaceChildren();
  juego.hidden = !paso.crearJuego;
  if (!paso.crearJuego) return;
  const alLograr = paso.isAutoAvance
    ? () => window.setTimeout(siguiente, getDuracion(ESPERA_AUTOAVANCE_MS))
    : activarSiguiente;
  juego.append(paso.crearJuego(alLograr));
  reiniciarAnimacion(juego, 'onboarding__entra');
}

/** Botones de abajo: los del final, ninguno si el paso avanza solo, o "Continuar". */
function crearAcciones(paso, onSiguiente) {
  if (paso.isFinal) return crearAccionesFinales();
  if (paso.isAutoAvance) return [];
  return [crearBotonSiguiente(paso, onSiguiente)];
}

/** En los pasos con algo que hacer, "Continuar" se activa al hacerlo. */
function crearBotonSiguiente(paso, onSiguiente) {
  const boton = crearBoton('button button--neutral button--ios', paso.boton ?? 'Continuar', onSiguiente);
  boton.id = 'bienvenida-siguiente';
  boton.disabled = Boolean(paso.crearJuego);
  return boton;
}

function activarSiguiente() {
  document.getElementById('bienvenida-siguiente').disabled = false;
}

function crearAccionesFinales() {
  return [
    crearEnlace('button button--neutral button--ios', RUTA_REGISTRO, 'Crear cuenta'),
    crearEnlace('button button--plain button--ios', RUTA_LOGIN, 'Ya tengo cuenta'),
  ];
}

function crearEnlace(clase, ruta, texto) {
  const enlace = document.createElement('a');
  enlace.className = clase;
  enlace.href = ruta;
  enlace.textContent = texto;
  return enlace;
}

function crearBoton(clase, texto, onClick) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = clase;
  boton.textContent = texto;
  boton.addEventListener('click', onClick);
  return boton;
}

// ---------- Sito y textos ----------

/** Cambia de pose con un saltito de entrada. */
function cambiarPose(pose, clase = 'mascot--entra') {
  const sito = document.getElementById('sito');
  sito.src = `${RUTA_POSES}${pose}.png`;
  sito.classList.remove('mascot--entra', 'mascot--celebra');
  reiniciarAnimacion(sito, clase);
}

function celebrar(titulo, texto) {
  cambiarPose(POSE.celebrando, 'mascot--celebra');
  decir(titulo, texto);
}

function decir(titulo, texto, destacado = '') {
  const encabezado = document.getElementById('sito-titulo');
  encabezado.textContent = destacado ? `${titulo} ` : titulo;
  if (destacado) encabezado.append(crearTexto('span', 'onboarding__title-accent', destacado));
  document.getElementById('sito-dice').textContent = texto;
  reiniciarAnimacion(document.getElementById('sito-texto'), 'onboarding__entra');
}

/** Quita y vuelve a poner la clase para que la animación se repita aunque ya estuviera. */
function reiniciarAnimacion(elemento, clase) {
  elemento.classList.remove(clase);
  void elemento.offsetWidth; // obliga al navegador a ver la clase quitada
  elemento.classList.add(clase);
}

function pintarProgreso() {
  const puntos = PASOS.map(() => {
    const punto = document.createElement('li');
    punto.className = 'onboarding__dot';
    return punto;
  });
  document.getElementById('bienvenida-progreso').replaceChildren(...puntos);
}

function marcarProgreso(indice) {
  document.querySelectorAll('.onboarding__dot').forEach((punto, posicion) => {
    if (posicion === indice) punto.setAttribute('aria-current', 'step');
    else punto.removeAttribute('aria-current');
  });
}

// ---------- Paso 2: la lista real de la app, elegir la más tranquila ----------

function crearJuegoLista(alLograr) {
  const lista = document.createElement('ul');
  lista.className = 'demo-list';
  const masTranquila = Math.min(...BIBLIOTECAS_PRUEBA.map((biblioteca) => biblioteca.ocupacion));
  BIBLIOTECAS_PRUEBA.forEach((biblioteca) => {
    const fila = crearFilaPrueba(biblioteca);
    fila.querySelector('button').addEventListener('click', () => {
      if (biblioteca.ocupacion !== masTranquila) {
        cambiarPose(POSE.pensando);
        decir('Mmm… casi', 'Esa está bastante llena. Busca el anillo más vacío.');
        return;
      }
      fila.classList.add('demo-list__row--acierto');
      celebrar('¡Esa es!', 'Es la que tiene más sitio libre.');
      alLograr();
    });
    lista.append(fila);
  });
  return lista;
}

/** Una fila igual que las de la lista del mapa (anillo, nombre y estado). */
function crearFilaPrueba({ nombre, ocupacion }) {
  const nivel = getNivelOcupacion(ocupacion);
  const anillo = crearTexto('span', `library-row__ring ${nivel.clase}`, '');
  anillo.style.setProperty('--ocupacion', ocupacion);
  anillo.append(crearAnilloOcupacion(), crearTexto('span', 'library-row__value', `${ocupacion}`));
  const cuerpo = crearTexto('span', 'library-row__body', '');
  cuerpo.append(crearTexto('span', 'library-row__name', nombre), crearTexto('span', 'library-row__meta', nivel.texto));
  const boton = crearBoton('library-row', '', () => {});
  boton.setAttribute('aria-label', `${nombre}: ${ocupacion} % de ocupación, ${nivel.texto}`);
  boton.append(anillo, cuerpo);
  const fila = document.createElement('li');
  fila.className = 'demo-list__row';
  fila.append(boton);
  return fila;
}

function crearTexto(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  elemento.className = clase;
  elemento.textContent = texto;
  return elemento;
}

// ---------- Paso 3: visor de cámara, como el escáner de códigos de iOS ----------

function crearJuegoQr(alLograr) {
  const visor = crearTexto('div', 'demo-scanner', '');
  const qr = crearElementoSvg('svg', { class: 'demo-scanner__qr', viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  qr.append(crearElementoSvg('path', { d: QR_PRUEBA }));
  const check = crearElementoSvg('svg', { class: 'demo-scanner__check', viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  check.append(crearElementoSvg('circle', { cx: 12, cy: 12, r: 11 }), crearElementoSvg('path', { d: CHECK }));
  visor.append(qr, crearTexto('span', 'demo-scanner__line', ''), check);
  const boton = crearBoton('button button--tinted button--small', 'Escanear', () => escanear(visor, boton, alLograr));
  const juego = crearTexto('div', 'demo-play', '');
  juego.append(visor, boton);
  return juego;
}

function escanear(visor, boton, alLograr) {
  boton.disabled = true;
  visor.classList.add('demo-scanner--escaneando');
  window.setTimeout(() => {
    visor.classList.replace('demo-scanner--escaneando', 'demo-scanner--hecho');
    boton.textContent = 'Check-in hecho';
    celebrar('¡Hecho!', 'Ya cuentas en la ocupación de esa biblioteca.');
    alLograr();
  }, getDuracion(DURACION_ESCANEO_MS));
}

// ---------- Paso 4: anillo de puntos, como la app Fitness ----------

function crearJuegoPuntos(alLograr) {
  const anillo = crearTexto('div', 'demo-points', '');
  anillo.style.setProperty('--ocupacion', 0);
  const numero = crearTexto('span', 'demo-points__value', '0');
  const etiqueta = crearTexto('span', 'demo-points__label', 'puntos');
  anillo.append(crearAnilloOcupacion(), numero, etiqueta);
  const minutos = crearTexto('p', 'demo-points__time', '0 min');
  minutos.setAttribute('aria-live', 'polite');
  const boton = crearBoton('button button--tinted button--small', 'Estudiar 1 hora', () => {
    boton.disabled = true;
    contarPuntos({ anillo, numero, minutos }, alLograr);
  });
  const juego = crearTexto('div', 'demo-play', '');
  juego.append(anillo, minutos, boton);
  return juego;
}

/** Cuenta de 0 a 60 minutos en un par de segundos; cada 15 minutos sube un punto. */
function contarPuntos({ anillo, numero, minutos }, alLograr) {
  const duracion = getDuracion(DURACION_CONTADOR_MS);
  const inicio = performance.now();
  const avanzar = (ahora) => {
    const transcurridos = Math.min(MINUTOS_DE_PRUEBA, Math.round(((ahora - inicio) / duracion) * MINUTOS_DE_PRUEBA));
    const puntos = Math.floor(transcurridos / MINUTOS_POR_PUNTO);
    numero.textContent = puntos;
    minutos.textContent = `${transcurridos} min`;
    anillo.style.setProperty('--ocupacion', (transcurridos / MINUTOS_POR_PUNTO / MAX_PUNTOS_SESION) * 100);
    if (transcurridos < MINUTOS_DE_PRUEBA) {
      window.requestAnimationFrame(avanzar);
      return;
    }
    celebrar(`¡${puntos} puntos!`, 'Al irte, haz check-out y se guardan en tu perfil.');
    alLograr();
  };
  window.requestAnimationFrame(avanzar);
}

// ---------- Paso 5: amigos en el mapa y ranking del grupo ----------

function crearJuegoAmigos(alLograr) {
  // Un trozo de mapa con el globo de una biblioteca y las caras de quien estudia allí
  const globo = crearTexto('span', `map-pin ${getNivelOcupacion(OCUPACION_PRUEBA_SOCIAL).clase}`, '');
  globo.style.setProperty('--ocupacion', OCUPACION_PRUEBA_SOCIAL);
  const caras = crearTexto('span', 'map-pin__amigos', '');
  caras.append(crearCara(AMIGOS_PRUEBA.ana, 'map-pin__amigo'), crearCara(AMIGOS_PRUEBA.pablo, 'map-pin__amigo'));
  globo.append(crearAnilloOcupacion(), crearTexto('span', 'map-pin__numero', `${OCUPACION_PRUEBA_SOCIAL}`), caras);
  const mapa = crearTexto('div', 'demo-mapa', '');
  mapa.append(globo);

  const ranking = crearTexto('ol', 'demo-ranking', '');
  ranking.hidden = true;
  const boton = crearBoton('button button--tinted button--small', `Añadir a ${AMIGOS_PRUEBA.marta.nombre}`, () => {
    boton.disabled = true;
    const marta = crearCara(AMIGOS_PRUEBA.marta, 'map-pin__amigo demo-mapa__nueva');
    caras.append(marta);
    boton.textContent = 'Amiga añadida';
    ranking.replaceChildren(...RANKING_PRUEBA.map(crearFilaRanking));
    ranking.hidden = false;
    reiniciarAnimacion(ranking, 'onboarding__entra');
    celebrar('¡Ya sois un grupo!', 'Marta está estudiando contigo. Cada lunes empieza un ranking nuevo.');
    alLograr();
  });
  const juego = crearTexto('div', 'demo-play', '');
  juego.append(mapa, boton, ranking);
  return juego;
}

function crearCara({ nombre, avatar }, clase) {
  const cara = crearTexto('span', `${clase} con-avatar`, '');
  cara.innerHTML = dibujarAvatar(avatar);
  cara.setAttribute('title', nombre);
  return cara;
}

function crearFilaRanking({ nombre, avatar, puntos }, indice) {
  const fila = crearTexto('li', 'demo-ranking__fila', '');
  fila.append(
    crearTexto('span', 'demo-ranking__posicion', `${indice + 1}`),
    crearCara({ nombre, avatar }, 'demo-ranking__cara'),
    crearTexto('span', 'demo-ranking__nombre', nombre),
    crearTexto('span', 'demo-ranking__puntos', `${puntos} pts`),
  );
  return fila;
}

// ---------- Paso 6: resumen, como la pantalla de "Novedades" ----------

function crearResumen() {
  const lista = crearTexto('ul', 'feature-list', '');
  RESUMEN.forEach(({ icono, titulo, texto }) => {
    const dibujo = crearElementoSvg('svg', { class: 'feature-list__icon', viewBox: '0 0 56 56', 'aria-hidden': 'true' });
    dibujo.append(crearElementoSvg('path', { d: icono }));
    const cuerpo = crearTexto('div', 'feature-list__body', '');
    cuerpo.append(crearTexto('p', 'feature-list__title', titulo), crearTexto('p', 'feature-list__text', texto));
    const fila = crearTexto('li', 'feature-list__item', '');
    fila.append(dibujo, cuerpo);
    lista.append(fila);
  });
  return lista;
}

/** Sin animaciones (prefers-reduced-motion), las esperas de prueba son casi inmediatas. */
function getDuracion(milisegundos) {
  const isSinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return isSinMovimiento ? 1 : milisegundos;
}

init();
