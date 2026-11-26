/*
 * Avatar de StudySpot (27-11): el proceso de un Memoji, con dibujos propios en SVG del estilo de
 * Sito (contorno azul marino, formas redondeadas, colores planos). La cuenta guarda solo las
 * elecciones { fondo, piel, cabeza, … } (src/Usuarios/avatar.php, mismas partes y totales);
 * aquí se dibujan. Sin avatar se enseñan las iniciales.
 */
const LINEA = '#16154a';
const ROPA = '#3d3bf3';

export const FONDOS = ['#dfe3ff', '#ffe1d6', '#d8f3e4', '#fff2c7', '#f2dcff', '#d6eefc', '#e9e9ef'];
export const PIELES = ['#ffe0c7', '#f6caa4', '#eab38a', '#d69b6c', '#bb7d50', '#925d3c', '#6d432b', '#4b2d1e'];
export const PELOS = ['#2b2118', '#4a3424', '#6e4527', '#9a6235', '#c48a4c', '#e0b86e', '#efd9a0', '#b4442b',
  '#d9653b', '#8d939c', '#f0f0f0', '#4d4bf5'];
export const COLORES_OJOS = ['#5b3a1e', '#2f6db5', '#3c8a4a', '#7a8a99', '#2b2118'];

/** Partes y cuántas opciones tiene cada una (igual que AVATAR_OPCIONES en PHP). */
export const AVATAR_OPCIONES = {
  fondo: 7, piel: 8, cabeza: 3, orejas: 3, peinado: 10, colorPelo: 12, cejas: 5, ojos: 6,
  colorOjos: 5, nariz: 5, boca: 6, vello: 5, gafas: 5, gorro: 5,
};

/** Un primer avatar para empezar a editar, como el que propone iOS. */
export const AVATAR_INICIAL = {
  fondo: 0, piel: 1, cabeza: 0, orejas: 1, peinado: 2, colorPelo: 2, cejas: 1, ojos: 1,
  colorOjos: 0, nariz: 0, boca: 0, vello: 0, gafas: 0, gorro: 0,
};

/**
 * Pestañas del editor, en el orden de Memoji. color: muestras de color encima de las miniaturas.
 * encuadre: viewBox de las miniaturas para acercarse a esa parte.
 */
export const PESTANAS = [
  { parte: 'piel', titulo: 'Piel', colores: PIELES },
  { parte: 'peinado', titulo: 'Peinado', color: { parte: 'colorPelo', colores: PELOS }, encuadre: '20 4 160 160' },
  { parte: 'cejas', titulo: 'Cejas', color: { parte: 'colorPelo', colores: PELOS }, encuadre: '55 60 90 60' },
  { parte: 'ojos', titulo: 'Ojos', color: { parte: 'colorOjos', colores: COLORES_OJOS }, encuadre: '55 72 90 60' },
  { parte: 'cabeza', titulo: 'Cabeza', encuadre: '20 20 160 160' },
  { parte: 'nariz', titulo: 'Nariz', encuadre: '65 88 70 50' },
  { parte: 'boca', titulo: 'Boca', encuadre: '62 106 76 54' },
  { parte: 'orejas', titulo: 'Orejas', encuadre: '30 64 140 80' },
  { parte: 'vello', titulo: 'Vello facial', color: { parte: 'colorPelo', colores: PELOS }, encuadre: '36 90 128 90' },
  { parte: 'gafas', titulo: 'Gafas', encuadre: '40 66 120 70' },
  { parte: 'gorro', titulo: 'Gorros', encuadre: '0 0 200 200' },
  { parte: 'fondo', titulo: 'Fondo', colores: FONDOS },
];

let contador = 0;

/** SVG del avatar (texto). viewBox para acercarse a una parte en las miniaturas del editor. */
export function dibujarAvatar(a, viewBox = '0 0 200 200') {
  contador += 1;
  const recorte = `av-${contador}`;
  const piel = PIELES[a.piel];
  const pelo = PELOS[a.colorPelo];
  const sombra = oscurecer(piel, 0.18);
  return `<svg class="avatar-svg" viewBox="${viewBox}" aria-hidden="true" focusable="false">
    <defs><clipPath id="${recorte}"><circle cx="100" cy="100" r="100"/></clipPath></defs>
    <g clip-path="url(#${recorte})" stroke-linejoin="round" stroke-linecap="round">
      <rect width="200" height="200" fill="${FONDOS[a.fondo]}"/>
      ${peloDetras(a.peinado, pelo)}
      <path d="M26 214 Q30 170 100 164 Q170 170 174 214 Z" fill="${ROPA}" stroke="${LINEA}" stroke-width="3"/>
      <path d="M84 136 V166 Q100 176 116 166 V136 Z" fill="${sombra}" stroke="${LINEA}" stroke-width="3"/>
      ${orejas(a.orejas, a.cabeza, piel, sombra)}
      ${cabeza(a.cabeza, piel)}
      ${vello(a.vello, pelo)}
      ${boca(a.boca)}
      ${nariz(a.nariz, sombra)}
      ${ojos(a.ojos, COLORES_OJOS[a.colorOjos])}
      ${cejas(a.cejas, pelo)}
      ${peloDelante(a.peinado, pelo)}
      ${gafas(a.gafas)}
      ${gorro(a.gorro)}
    </g>
  </svg>`;
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

/* ---------- partes ---------- */

const CONTORNO = `stroke="${LINEA}" stroke-width="3"`;

function cabeza(tipo, piel) {
  if (tipo === 1) return `<ellipse cx="100" cy="103" rx="45" ry="60" fill="${piel}" ${CONTORNO}/>`;
  if (tipo === 2) return `<path d="M52 70 Q52 44 80 44 H120 Q148 44 148 70 V112 Q148 158 100 160 Q52 158 52 112 Z" fill="${piel}" ${CONTORNO}/>`;
  return `<ellipse cx="100" cy="101" rx="50" ry="57" fill="${piel}" ${CONTORNO}/>`;
}

function orejas(tamano, tipoCabeza, piel, sombra) {
  const separacion = [50, 45, 48][tipoCabeza];
  const [rx, ry] = [[7, 10], [9, 13], [12, 16]][tamano];
  return [-1, 1].map((lado) => {
    const x = 100 + lado * separacion;
    return `<ellipse cx="${x}" cy="104" rx="${rx}" ry="${ry}" fill="${piel}" ${CONTORNO}/>
      <path d="M${x + lado * rx * 0.1} ${104 - ry * 0.5} Q${x + lado * rx * 0.55} 104 ${x + lado * rx * 0.1} ${104 + ry * 0.5}" fill="none" stroke="${sombra}" stroke-width="3"/>`;
  }).join('');
}

function ojo(tipo, x, color) {
  const y = 100;
  const brillo = `<circle cx="${x + 2}" cy="${y - 2.5}" r="1.8" fill="#ffffff"/>`;
  const grande = `<ellipse cx="${x}" cy="${y}" rx="9" ry="10" fill="#ffffff" stroke="${LINEA}" stroke-width="2.5"/>
    <circle cx="${x}" cy="${y + 1}" r="6" fill="${color}"/><circle cx="${x}" cy="${y + 1}" r="3" fill="${LINEA}"/>${brillo}`;
  const feliz = `<path d="M${x - 7} ${y + 3} Q${x} ${y - 6} ${x + 7} ${y + 3}" fill="none" stroke="${LINEA}" stroke-width="3.5"/>`;
  if (tipo === 1) return grande;
  if (tipo === 2) return feliz;
  if (tipo === 3) {
    return `<path d="M${x - 10} ${y} Q${x} ${y - 9} ${x + 10} ${y} Q${x} ${y + 7} ${x - 10} ${y} Z" fill="#ffffff" stroke="${LINEA}" stroke-width="2.5"/>
      <circle cx="${x}" cy="${y}" r="4.5" fill="${color}"/><circle cx="${x}" cy="${y}" r="2.2" fill="${LINEA}"/>`;
  }
  if (tipo === 4) {
    return `${grande}<path d="M${x - 8} ${y - 8} l-3 -4 M${x - 3} ${y - 10} l-1 -5 M${x + 3} ${y - 10} l1 -5" stroke="${LINEA}" stroke-width="2"/>`;
  }
  return `<circle cx="${x}" cy="${y}" r="5.5" fill="${LINEA}"/>${brillo}`;
}

function ojos(tipo, color) {
  // 5 = guiño: el izquierdo abierto y el derecho cerrado.
  if (tipo === 5) return ojo(1, 80, color) + ojo(2, 120, color);
  return ojo(tipo, 80, color) + ojo(tipo, 120, color);
}

function cejas(tipo, pelo) {
  const recta = 'M70 85 L90 84 M110 84 L130 85';
  const arco = 'M70 87 Q80 79 90 85 M110 85 Q120 79 130 87';
  const formas = [[recta, 4.5], [arco, 4], [recta, 8], [arco, 2.5]];
  if (tipo === 4) return '';
  const [d, grosor] = formas[tipo];
  return `<path d="${d}" fill="none" stroke="${pelo === '#f0f0f0' ? '#c8c8cc' : pelo}" stroke-width="${grosor}"/>`;
}

function nariz(tipo, sombra) {
  const trazo = `fill="none" stroke="${sombra}" stroke-width="3"`;
  if (tipo === 1) return `<path d="M100 102 L97 117 L103 118" ${trazo}/>`;
  if (tipo === 2) return `<ellipse cx="100" cy="115" rx="6" ry="5" fill="${sombra}"/>`;
  if (tipo === 3) return `<path d="M98 116 Q100 118 102 116" ${trazo}/>`;
  if (tipo === 4) return `<path d="M92 117 Q100 124 108 117" ${trazo}/><circle cx="95" cy="117" r="1.6" fill="${sombra}"/><circle cx="105" cy="117" r="1.6" fill="${sombra}"/>`;
  return `<path d="M95 116 Q100 122 105 116" ${trazo}/>`;
}

function boca(tipo) {
  const interior = '#5a1f2b';
  const abierta = `<path d="M84 128 Q100 150 116 128 Q100 133 84 128 Z" fill="${interior}" stroke="${LINEA}" stroke-width="3"/>
    <path d="M88 130 Q100 134 112 130 L111 133 Q100 136 89 133 Z" fill="#ffffff"/>`;
  if (tipo === 1) return abierta;
  if (tipo === 2) return `<path d="M89 134 L111 134" stroke="${LINEA}" stroke-width="3.5"/>`;
  if (tipo === 3) return `<ellipse cx="100" cy="135" rx="6" ry="8" fill="${interior}" stroke="${LINEA}" stroke-width="3"/>`;
  if (tipo === 4) return `<path d="M88 134 Q102 138 113 129" fill="none" stroke="${LINEA}" stroke-width="3.5"/>`;
  if (tipo === 5) return `${abierta}<path d="M94 141 Q100 148 106 141 Q100 138 94 141 Z" fill="#ff7a8a"/>`;
  return `<path d="M86 130 Q100 142 114 130" fill="none" stroke="${LINEA}" stroke-width="3.5"/>`;
}

function vello(tipo, pelo) {
  const relleno = `fill="${pelo}" ${CONTORNO}`;
  const bigote = `<path d="M84 127 Q92 119 100 125 Q108 119 116 127 Q108 126 100 129 Q92 126 84 127 Z" ${relleno}/>`;
  if (tipo === 1) return bigote;
  if (tipo === 2) return `<path d="M92 144 Q100 160 108 144 Q100 149 92 144 Z" ${relleno}/>`;
  if (tipo === 3) return `<path d="M54 116 Q56 160 100 163 Q144 160 146 116 Q140 142 100 146 Q60 142 54 116 Z" fill="${pelo}" opacity="0.55"/>`;
  if (tipo === 4) {
    return `<path d="M52 104 Q50 170 100 174 Q150 170 148 104 Q146 140 128 142 Q114 124 100 126 Q86 124 72 142 Q54 140 52 104 Z" ${relleno}/>${bigote}`;
  }
  return '';
}

function peloDetras(tipo, pelo) {
  const relleno = `fill="${pelo}" ${CONTORNO}`;
  if (tipo === 5) return `<path d="M46 90 Q40 28 100 26 Q160 28 154 90 L158 178 Q132 186 126 168 L124 120 H76 L74 168 Q68 186 42 178 Z" ${relleno}/>`;
  if (tipo === 6) return `<path d="M140 64 Q182 76 170 146 Q160 126 148 104 Z" ${relleno}/>`;
  if (tipo === 7) return `<circle cx="100" cy="30" r="19" ${relleno}/>`;
  if (tipo === 8) return `<circle cx="100" cy="84" r="66" ${relleno}/>`;
  if (tipo === 9) return `<path d="M48 90 Q40 28 100 26 Q160 28 152 90 L156 140 Q146 152 138 140 Q128 152 120 138 L118 110 H82 L80 138 Q72 152 62 140 Q54 152 44 140 Z" ${relleno}/>`;
  return '';
}

function peloDelante(tipo, pelo) {
  const relleno = `fill="${pelo}" ${CONTORNO}`;
  const corto = 'M47 98 Q42 32 100 30 Q158 32 153 98 Q147 66 128 58 Q104 72 74 58 Q54 66 47 98 Z';
  const raya = 'M48 96 Q44 30 100 28 Q156 30 152 96 Q140 58 100 50 Q60 58 48 96 Z';
  const ladeado = 'M48 98 Q44 30 100 28 Q156 30 152 98 Q148 64 120 56 Q90 78 54 74 Q50 84 48 98 Z';
  const casco = 'M52 92 Q50 40 100 38 Q150 40 148 92 Q140 60 100 56 Q60 60 52 92 Z';
  switch (tipo) {
    case 1: return `<path d="${casco}" fill="${pelo}" opacity="0.9"/>`;
    case 2: return `<path d="${corto}" ${relleno}/>`;
    case 3: return `<path d="M48 96 Q44 30 100 28 Q156 30 152 96 Q150 70 144 62 Q120 80 66 76 Q54 80 48 96 Z" ${relleno}/>`;
    case 4: return [[56, 76], [64, 56], [80, 43], [100, 38], [120, 43], [136, 56], [144, 76]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" ${relleno}/>`).join('');
    case 5: return `<path d="${raya}" ${relleno}/>`;
    case 6: return `<path d="${corto}" ${relleno}/>`;
    case 7: return `<path d="${casco}" ${relleno}/>`;
    case 8: return `<path d="M56 80 Q100 50 144 80 Q130 66 100 64 Q70 66 56 80 Z" ${relleno}/>`;
    case 9: return `<path d="${ladeado}" ${relleno}/>`;
    default: return '';
  }
}

function gafas(tipo) {
  const patillas = `<path d="M67 97 L52 94 M133 97 L148 94" stroke="${LINEA}" stroke-width="3"/>`;
  const puente = `<path d="M93 99 Q100 95 107 99" fill="none" stroke="${LINEA}" stroke-width="3"/>`;
  if (tipo === 1) {
    return `${patillas}${puente}<circle cx="80" cy="100" r="13" fill="#ffffff" fill-opacity="0.18" stroke="${LINEA}" stroke-width="3"/>
      <circle cx="120" cy="100" r="13" fill="#ffffff" fill-opacity="0.18" stroke="${LINEA}" stroke-width="3"/>`;
  }
  if (tipo === 2) {
    return `${patillas}${puente}<rect x="66" y="89" width="28" height="22" rx="5" fill="#ffffff" fill-opacity="0.18" stroke="${LINEA}" stroke-width="3"/>
      <rect x="106" y="89" width="28" height="22" rx="5" fill="#ffffff" fill-opacity="0.18" stroke="${LINEA}" stroke-width="3"/>`;
  }
  if (tipo === 3) {
    return `${patillas}${puente}<path d="M64 90 H95 Q96 108 82 110 Q66 110 64 90 Z M105 90 H136 Q134 110 118 110 Q104 108 105 90 Z" fill="${LINEA}" fill-opacity="0.88" stroke="${LINEA}" stroke-width="3"/>`;
  }
  if (tipo === 4) {
    return `${patillas}<rect x="65" y="88" width="30" height="24" rx="9" fill="none" stroke="${ROPA}" stroke-width="5"/>
      <rect x="105" y="88" width="30" height="24" rx="9" fill="none" stroke="${ROPA}" stroke-width="5"/>
      <path d="M95 98 Q100 94 105 98" fill="none" stroke="${ROPA}" stroke-width="5"/>`;
  }
  return '';
}

function gorro(tipo) {
  if (tipo === 1) {
    return `<path d="M44 84 Q44 18 100 16 Q156 18 156 84 Z" fill="#e8505b" ${CONTORNO}/>
      <rect x="40" y="70" width="120" height="22" rx="10" fill="#c43c47" ${CONTORNO}/>
      <circle cx="100" cy="14" r="12" fill="#f7f7f7" ${CONTORNO}/>`;
  }
  if (tipo === 2) {
    return `<path d="M46 74 Q48 20 100 18 Q152 20 154 74 Z" fill="${ROPA}" ${CONTORNO}/>
      <path d="M40 74 Q100 62 160 74 Q166 86 100 84 Q34 86 40 74 Z" fill="#2c2ab8" ${CONTORNO}/>
      <circle cx="100" cy="20" r="4" fill="#2c2ab8"/>`;
  }
  if (tipo === 3) {
    return `<path d="M50 98 Q48 22 100 20 Q152 22 150 98" fill="none" stroke="${LINEA}" stroke-width="10"/>
      <path d="M50 98 Q48 22 100 20 Q152 22 150 98" fill="none" stroke="#f2f3f7" stroke-width="5"/>
      <rect x="36" y="86" width="18" height="34" rx="9" fill="#f2f3f7" ${CONTORNO}/>
      <rect x="146" y="86" width="18" height="34" rx="9" fill="#f2f3f7" ${CONTORNO}/>`;
  }
  if (tipo === 4) {
    return `<ellipse cx="94" cy="46" rx="60" ry="19" fill="#2f2f45" ${CONTORNO}/>
      <circle cx="96" cy="26" r="4" fill="#2f2f45" ${CONTORNO}/>`;
  }
  return '';
}

/** Color más oscuro (para sombras de la piel: nariz, cuello, interior de las orejas). */
function oscurecer(hex, cantidad) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (desplazamiento) => Math.round(((n >> desplazamiento) & 255) * (1 - cantidad));
  return `#${[16, 8, 0].map((d) => canal(d).toString(16).padStart(2, '0')).join('')}`;
}
