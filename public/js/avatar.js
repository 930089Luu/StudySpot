/*
 * Avatar de StudySpot (27-11): creador de personajes parte por parte, como un Memoji. La base es
 * el estilo "Toon Head" de Johan Melin (CC BY 4.0) generado por DiceBear (MIT), en
 * vendor/dicebear-toon-head.js; encima se añaden piezas propias con el mismo trazo (gafas, gorros,
 * pendientes, pecas) y una luz suave que da volumen. La cuenta guarda solo las elecciones
 * (src/Usuarios/avatar.php, mismas partes y totales). Sin avatar, iniciales.
 */
import { createAvatar, toonHead } from './vendor/dicebear-toon-head.js';

// null = "ninguno" en las partes que se pueden quitar.
const PIELES = ['fde0cc', 'f1c3a5', 'e3ac8a', 'c68e7a', 'b98e6a', 'a36b4f', '8d5524', '5c3829'];
const PEINADOS = [null, 'sideComed', 'undercut', 'spiky', 'bun'];
const MELENAS = [null, 'neckHigh', 'shoulderHigh', 'longStraight', 'longWavy'];
const COLORES_PELO = ['2c1b18', '724133', 'a55728', 'b58143', 'd6b370', 'ecdcb4', 'b93a2e', '9a9a9e', 'f2f2f2', 'e86aa6', '4a6cf7'];
const CEJAS = ['neutral', 'happy', 'raised', 'sad', 'angry'];
const OJOS = ['happy', 'wide', 'humble', 'bow', 'wink'];
const BOCAS = ['smile', 'laugh', 'agape', 'sad', 'angry'];
const BARBAS = [null, 'chin', 'moustacheTwirl', 'chinMoustache', 'fullBeard', 'longBeard'];
const ROPAS = ['tShirt', 'shirt', 'turtleNeck', 'openJacket', 'dress'];
const COLORES_ROPA = ['0b3286', '3d3bf3', '147f3c', 'b11f1f', 'eab308', '731ac3', 'ec4899', 'f97316', '545454', '151613', 'e8e9e6'];
export const FONDOS = ['dfe3ff', 'ffe1d6', 'd8f3e4', 'fff2c7', 'f2dcff', 'd6eefc', 'e9e9ef'];

// Chica (0) o chico (1): punto de partida, como en Memoji y Mii. Luego todo se puede cambiar.
export const GENEROS = ['Chica', 'Chico'];
const PRESETS = [
  { peinado: 4, melena: 3, barba: 0, ropa: 4, cejas: 1, pendientes: 1 },
  { peinado: 1, melena: 0, ropa: 0, cejas: 0, pendientes: 0 },
];

/** Partes y cuántas opciones tiene cada una (igual que AVATAR_OPCIONES en PHP). */
export const AVATAR_OPCIONES = {
  genero: GENEROS.length, fondo: FONDOS.length, piel: PIELES.length, peinado: PEINADOS.length,
  melena: MELENAS.length, colorPelo: COLORES_PELO.length, cejas: CEJAS.length, ojos: OJOS.length,
  boca: BOCAS.length, barba: BARBAS.length, ropa: ROPAS.length, colorRopa: COLORES_ROPA.length,
  gafas: 5, gorro: 5, pendientes: 3, pecas: 2,
};

/** Un primer personaje para empezar a editar. */
export const AVATAR_INICIAL = {
  genero: 1, fondo: 0, piel: 1, peinado: 1, melena: 0, colorPelo: 1, cejas: 0, ojos: 0, boca: 0, barba: 0,
  ropa: 0, colorRopa: 0, gafas: 0, gorro: 0, pendientes: 0, pecas: 0,
};

/** Al cambiar de chica a chico (o al revés) se aplica su punto de partida. */
export function aplicarGenero(avatar, genero) {
  return { ...avatar, ...PRESETS[genero], genero };
}

const conAlmohadilla = (lista) => lista.map((c) => `#${c}`);

/**
 * Pestañas del editor, en el orden de Memoji. colores: solo muestras de color; color: muestras
 * encima de las miniaturas. encuadre: viewBox (el dibujo mide 768×768) para acercarse a esa parte.
 * soloSi: la pestaña solo sale para ese personaje (la barba, para chico).
 */
export const PESTANAS = [
  { parte: 'genero', titulo: 'Persona', nombres: GENEROS },
  { parte: 'piel', titulo: 'Piel', colores: conAlmohadilla(PIELES) },
  { parte: 'peinado', titulo: 'Peinado', color: { parte: 'colorPelo', colores: conAlmohadilla(COLORES_PELO) }, encuadre: '84 0 600 600' },
  { parte: 'melena', titulo: 'Pelo largo', color: { parte: 'colorPelo', colores: conAlmohadilla(COLORES_PELO) } },
  { parte: 'cejas', titulo: 'Cejas', color: { parte: 'colorPelo', colores: conAlmohadilla(COLORES_PELO) }, encuadre: '200 230 368 260' },
  { parte: 'ojos', titulo: 'Ojos', encuadre: '200 270 368 260' },
  { parte: 'boca', titulo: 'Boca', encuadre: '230 380 308 220' },
  { parte: 'barba', titulo: 'Barba', color: { parte: 'colorPelo', colores: conAlmohadilla(COLORES_PELO) }, encuadre: '134 250 500 430', soloSi: (a) => a.genero === 1 },
  { parte: 'pecas', titulo: 'Pecas', encuadre: '200 300 368 260' },
  { parte: 'gafas', titulo: 'Gafas', encuadre: '160 260 448 300' },
  { parte: 'gorro', titulo: 'Gorros', encuadre: '84 0 600 600' },
  { parte: 'pendientes', titulo: 'Pendientes', encuadre: '134 330 500 260' },
  { parte: 'ropa', titulo: 'Ropa', color: { parte: 'colorRopa', colores: conAlmohadilla(COLORES_ROPA) }, encuadre: '0 300 768 468' },
  { parte: 'fondo', titulo: 'Fondo', colores: conAlmohadilla(FONDOS) },
];

let contador = 0;

/** SVG del avatar (texto). viewBox para acercarse a una parte en las miniaturas del editor. */
export function dibujarAvatar(a, viewBox = null) {
  contador += 1;
  const id = `av${contador}`;
  const peinado = PEINADOS[a.peinado];
  const melena = MELENAS[a.melena];
  const barba = a.genero === 1 ? BARBAS[a.barba] : null;
  const base = createAvatar(toonHead, {
    seed: 'studyspot',
    backgroundColor: [FONDOS[a.fondo]],
    skinColor: [PIELES[a.piel]],
    // La gorra y el gorro de lana tapan el peinado de arriba; auriculares y cinta, no.
    hair: [peinado ?? 'sideComed'],
    hairProbability: peinado && a.gorro !== 1 && a.gorro !== 2 ? 100 : 0,
    rearHair: [melena ?? 'neckHigh'],
    rearHairProbability: melena ? 100 : 0,
    hairColor: [COLORES_PELO[a.colorPelo]],
    eyebrows: [CEJAS[a.cejas]],
    eyes: [OJOS[a.ojos]],
    mouth: [BOCAS[a.boca]],
    beard: [barba ?? 'chin'],
    beardProbability: barba ? 100 : 0,
    clothes: [ROPAS[a.ropa]],
    clothesColor: [COLORES_ROPA[a.colorRopa]],
  }).toString();
  const extras = pecas(a.pecas) + pendientes(a.pendientes) + gafas(a.gafas) + gorro(a.gorro, COLORES_PELO[a.colorPelo]) + volumen(id);
  const svg = base
    .replace('<svg ', '<svg class="avatar-svg" aria-hidden="true" focusable="false" ')
    .replace(/<\/svg>\s*$/, `${extras}</svg>`);
  return viewBox ? svg.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`) : svg;
}

/**
 * Pone en el contenedor el avatar o, si no hay, las iniciales. Sirve para cualquier círculo de
 * persona (perfil, mapa, grupos…): el contenedor añade la clase con-avatar para quitar su fondo.
 */
export function pintarAvatar(contenedor, avatar, iniciales = '') {
  contenedor.classList.toggle('con-avatar', Boolean(avatar));
  if (avatar) contenedor.innerHTML = dibujarAvatar(avatar);
  else contenedor.textContent = iniciales;
}

/* ---------- piezas propias, con el trazo de Toon Head (coordenadas de 768×768) ---------- */

const TRAZO = '#1d1a1a';

function pecas(tipo) {
  if (!tipo) return '';
  const puntos = [[286, 470], [306, 486], [272, 492], [322, 466], [482, 470], [462, 486], [496, 492], [446, 466]];
  return puntos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#9a5b3f" opacity="0.55"/>`).join('');
}

function pendientes(tipo) {
  if (!tipo) return '';
  if (tipo === 1) {
    return [205, 563].map((x) => `<circle cx="${x}" cy="488" r="11" fill="#f2c94c" stroke="${TRAZO}" stroke-width="3"/>
      <circle cx="${x - 3}" cy="485" r="3" fill="#fff6cf"/>`).join('');
  }
  return [205, 563].map((x) => `<path d="M${x} 478 v18" stroke="#d9a520" stroke-width="4"/>
    <circle cx="${x}" cy="512" r="15" fill="none" stroke="#f2c94c" stroke-width="6"/>`).join('');
}

function gafas(tipo) {
  if (!tipo) return '';
  const patillas = `<path d="M240 392 L200 376 M528 392 L568 376" stroke="${TRAZO}" stroke-width="9" stroke-linecap="round"/>`;
  const puente = `<path d="M368 398 Q384 384 400 398" fill="none" stroke="${TRAZO}" stroke-width="9" stroke-linecap="round"/>`;
  const reflejo = (x) => `<path d="M${x - 34} 380 L${x - 14} 360" stroke="#ffffff" stroke-width="9" stroke-linecap="round" opacity="0.6"/>`;
  if (tipo === 1) {
    return `${patillas}${puente}${[310, 458].map((x) => `<circle cx="${x}" cy="405" r="60" fill="#ffffff" fill-opacity="0.12" stroke="${TRAZO}" stroke-width="9"/>${reflejo(x)}`).join('')}`;
  }
  if (tipo === 2) {
    return `${patillas}${puente}${[310, 458].map((x) => `<rect x="${x - 66}" y="352" width="132" height="104" rx="26" fill="#ffffff" fill-opacity="0.12" stroke="${TRAZO}" stroke-width="9"/>${reflejo(x)}`).join('')}`;
  }
  if (tipo === 3) {
    return `${patillas}${puente}${[310, 458].map((x) => `<path d="M${x - 70} 360 H${x + 66} Q${x + 66} 452 ${x} 456 Q${x - 70} 452 ${x - 70} 360 Z" fill="#1f1f29" stroke="${TRAZO}" stroke-width="7"/>${reflejo(x)}`).join('')}`;
  }
  // 4: pasta gruesa de color
  return `<path d="M240 392 L200 376 M528 392 L568 376" stroke="#e8505b" stroke-width="12" stroke-linecap="round"/>
    <path d="M368 398 Q384 384 400 398" fill="none" stroke="#e8505b" stroke-width="12" stroke-linecap="round"/>
    ${[310, 458].map((x) => `<rect x="${x - 66}" y="350" width="132" height="108" rx="44" fill="#ffffff" fill-opacity="0.12" stroke="#e8505b" stroke-width="15"/>${reflejo(x)}`).join('')}`;
}

function gorro(tipo, colorPelo) {
  if (!tipo) return '';
  if (tipo === 1) {
    // Gorra con visera
    return `<path d="M196 300 Q196 104 384 100 Q572 104 572 300 Z" fill="#3d3bf3" stroke="${TRAZO}" stroke-width="4"/>
      <path d="M262 170 Q320 128 392 124" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity="0.18"/>
      <path d="M190 300 Q384 252 610 296 Q640 326 384 330 Q160 330 190 300 Z" fill="#2321b5" stroke="${TRAZO}" stroke-width="4"/>
      <circle cx="384" cy="104" r="14" fill="#2321b5" stroke="${TRAZO}" stroke-width="4"/>`;
  }
  if (tipo === 2) {
    // Gorro de lana con pompón
    return `<path d="M194 318 Q194 92 384 88 Q574 92 574 318 Z" fill="#e8505b" stroke="${TRAZO}" stroke-width="4"/>
      ${[250, 300, 350, 400, 450, 500].map((x) => `<path d="M${x} 130 Q${x + 6} 220 ${x} 280" stroke="#c43c47" stroke-width="8" fill="none" opacity="0.6"/>`).join('')}
      <rect x="180" y="270" width="408" height="66" rx="33" fill="#c43c47" stroke="${TRAZO}" stroke-width="4"/>
      <circle cx="384" cy="80" r="48" fill="#f5f5f5" stroke="${TRAZO}" stroke-width="4"/>`;
  }
  if (tipo === 3) {
    // Auriculares
    return `<path d="M178 430 Q168 116 384 108 Q600 116 590 430" fill="none" stroke="${TRAZO}" stroke-width="34" stroke-linecap="round"/>
      <path d="M178 430 Q168 116 384 108 Q600 116 590 430" fill="none" stroke="#f2f3f7" stroke-width="22" stroke-linecap="round"/>
      <rect x="146" y="372" width="74" height="128" rx="37" fill="#f2f3f7" stroke="${TRAZO}" stroke-width="5"/>
      <rect x="548" y="372" width="74" height="128" rx="37" fill="#f2f3f7" stroke="${TRAZO}" stroke-width="5"/>`;
  }
  // 4: cinta del pelo, del color que contrasta con el pelo
  const cinta = colorPelo === 'e86aa6' ? '#3d3bf3' : '#e86aa6';
  return `<path d="M214 262 Q384 150 554 262" fill="none" stroke="${TRAZO}" stroke-width="40" stroke-linecap="round"/>
    <path d="M214 262 Q384 150 554 262" fill="none" stroke="${cinta}" stroke-width="30" stroke-linecap="round"/>`;
}

/** Luz suave de arriba a la izquierda y sombra abajo: da volumen al dibujo plano. */
function volumen(id) {
  return `<defs>
      <radialGradient id="${id}-luz" cx="36%" cy="24%" r="45%"><stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}-sombra" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0.55" stop-color="#1b1a3a" stop-opacity="0"/><stop offset="1" stop-color="#1b1a3a" stop-opacity="0.16"/></linearGradient>
    </defs>
    <rect width="768" height="768" fill="url(#${id}-luz)"/>
    <rect width="768" height="768" fill="url(#${id}-sombra)"/>`;
}
