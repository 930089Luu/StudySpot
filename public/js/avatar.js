/*
 * Avatar de StudySpot (27-11): creador de personajes parte por parte, como un Memoji, con el
 * estilo "Toon Head" de Johan Melin (CC BY 4.0) generado por DiceBear (MIT), en
 * vendor/dicebear-toon-head.js. La cuenta guarda solo las elecciones { piel, peinado, … }
 * (src/Usuarios/avatar.php, mismas partes y totales); aquí se dibujan. Sin avatar, iniciales.
 */
import { createAvatar, toonHead } from './vendor/dicebear-toon-head.js';

// Opciones de Toon Head. null = "ninguno" en las partes que se pueden quitar.
const PIELES = ['f1c3a5', 'c68e7a', 'b98e6a', 'a36b4f', '5c3829'];
const PEINADOS = [null, 'sideComed', 'undercut', 'spiky', 'bun'];
const MELENAS = [null, 'neckHigh', 'shoulderHigh', 'longStraight', 'longWavy'];
const COLORES_PELO = ['2c1b18', '724133', 'a55728', 'b58143', 'd6b370'];
const CEJAS = ['neutral', 'happy', 'raised', 'sad', 'angry'];
const OJOS = ['happy', 'wide', 'humble', 'bow', 'wink'];
const BOCAS = ['smile', 'laugh', 'agape', 'sad', 'angry'];
const BARBAS = [null, 'chin', 'moustacheTwirl', 'chinMoustache', 'fullBeard', 'longBeard'];
const ROPAS = ['tShirt', 'shirt', 'turtleNeck', 'openJacket', 'dress'];
const COLORES_ROPA = ['0b3286', '147f3c', 'b11f1f', 'eab308', '731ac3', 'ec4899', 'f97316', '545454', '151613', 'e8e9e6'];
export const FONDOS = ['dfe3ff', 'ffe1d6', 'd8f3e4', 'fff2c7', 'f2dcff', 'd6eefc', 'e9e9ef'];

/** Partes y cuántas opciones tiene cada una (igual que AVATAR_OPCIONES en PHP). */
export const AVATAR_OPCIONES = {
  fondo: FONDOS.length, piel: PIELES.length, peinado: PEINADOS.length, melena: MELENAS.length,
  colorPelo: COLORES_PELO.length, cejas: CEJAS.length, ojos: OJOS.length, boca: BOCAS.length,
  barba: BARBAS.length, ropa: ROPAS.length, colorRopa: COLORES_ROPA.length,
};

/** Un primer personaje para empezar a editar. */
export const AVATAR_INICIAL = {
  fondo: 0, piel: 0, peinado: 1, melena: 0, colorPelo: 1, cejas: 0, ojos: 0, boca: 0, barba: 0, ropa: 0, colorRopa: 0,
};

const conAlmohadilla = (lista) => lista.map((c) => `#${c}`);

/**
 * Pestañas del editor, en el orden de Memoji. colores: solo muestras de color; color: muestras
 * encima de las miniaturas. encuadre: viewBox (el dibujo mide 768×768) para acercarse a esa parte.
 */
export const PESTANAS = [
  { parte: 'piel', titulo: 'Piel', colores: conAlmohadilla(PIELES) },
  { parte: 'peinado', titulo: 'Peinado', color: { parte: 'colorPelo', colores: conAlmohadilla(COLORES_PELO) }, encuadre: '84 0 600 600' },
  { parte: 'melena', titulo: 'Pelo largo', color: { parte: 'colorPelo', colores: conAlmohadilla(COLORES_PELO) } },
  { parte: 'cejas', titulo: 'Cejas', color: { parte: 'colorPelo', colores: conAlmohadilla(COLORES_PELO) }, encuadre: '200 200 368 260' },
  { parte: 'ojos', titulo: 'Ojos', encuadre: '200 230 368 260' },
  { parte: 'boca', titulo: 'Boca', encuadre: '214 330 340 250' },
  { parte: 'barba', titulo: 'Barba', color: { parte: 'colorPelo', colores: conAlmohadilla(COLORES_PELO) }, encuadre: '134 250 500 430' },
  { parte: 'ropa', titulo: 'Ropa', color: { parte: 'colorRopa', colores: conAlmohadilla(COLORES_ROPA) }, encuadre: '0 300 768 468' },
  { parte: 'fondo', titulo: 'Fondo', colores: conAlmohadilla(FONDOS) },
];

/** SVG del avatar (texto). viewBox para acercarse a una parte en las miniaturas del editor. */
export function dibujarAvatar(a, viewBox = null) {
  const peinado = PEINADOS[a.peinado];
  const melena = MELENAS[a.melena];
  const barba = BARBAS[a.barba];
  const svg = createAvatar(toonHead, {
    seed: 'studyspot',
    backgroundColor: [FONDOS[a.fondo]],
    skinColor: [PIELES[a.piel]],
    hair: [peinado ?? 'sideComed'],
    hairProbability: peinado ? 100 : 0,
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
  const conClase = svg.replace('<svg ', '<svg class="avatar-svg" aria-hidden="true" focusable="false" ');
  return viewBox ? conClase.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`) : conClase;
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
