/*
 * Avatar de StudySpot (27-11): el proceso de un Memoji, con dibujos propios en SVG con aspecto 3D
 * (degradados, luces y sombras suaves, sin contorno), como el acabado de los Memoji. La cuenta guarda solo las
 * elecciones { fondo, piel, cabeza, … } (src/Usuarios/avatar.php, mismas partes y totales);
 * aquí se dibujan. Sin avatar se enseñan las iniciales.
 */
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
  { parte: 'peinado', titulo: 'Peinado', color: { parte: 'colorPelo', colores: PELOS }, encuadre: '20 12 160 160' },
  { parte: 'cejas', titulo: 'Cejas', color: { parte: 'colorPelo', colores: PELOS }, encuadre: '55 68 90 60' },
  { parte: 'ojos', titulo: 'Ojos', color: { parte: 'colorOjos', colores: COLORES_OJOS }, encuadre: '55 80 90 60' },
  { parte: 'cabeza', titulo: 'Cabeza', encuadre: '20 28 160 160' },
  { parte: 'nariz', titulo: 'Nariz', encuadre: '65 96 70 50' },
  { parte: 'boca', titulo: 'Boca', encuadre: '62 114 76 54' },
  { parte: 'orejas', titulo: 'Orejas', encuadre: '30 72 140 80' },
  { parte: 'vello', titulo: 'Vello facial', color: { parte: 'colorPelo', colores: PELOS }, encuadre: '36 98 128 90' },
  { parte: 'gafas', titulo: 'Gafas', encuadre: '40 74 120 70' },
  { parte: 'gorro', titulo: 'Gorros', encuadre: '0 0 200 200' },
  { parte: 'fondo', titulo: 'Fondo', colores: FONDOS },
];

let contador = 0;

/**
 * SVG del avatar (texto), con aspecto 3D como un Memoji: sin contorno, volumen con degradados
 * (luz arriba a la izquierda), ojos brillantes, mejillas, pelo con brillo y la cabeza grande.
 * viewBox para acercarse a una parte en las miniaturas del editor.
 */
export function dibujarAvatar(a, viewBox = '0 0 200 200') {
  contador += 1;
  const id = `av${contador}`;
  const piel = PIELES[a.piel];
  const pelo = PELOS[a.colorPelo];
  const c = {
    id,
    piel: `url(#${id}-piel)`,
    pelo: `url(#${id}-pelo)`,
    sombra: oscurecer(piel, 0.22),
    sombraSuave: oscurecer(piel, 0.12),
    peloOscuro: oscurecer(pelo, 0.35),
    iris: `url(#${id}-iris)`,
  };
  return `<svg class="avatar-svg" viewBox="${viewBox}" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="${id}-clip"><circle cx="100" cy="100" r="100"/></clipPath>
      <radialGradient id="${id}-fondo" cx="50%" cy="38%" r="70%">
        <stop offset="0" stop-color="${aclarar(FONDOS[a.fondo], 0.5)}"/><stop offset="1" stop-color="${FONDOS[a.fondo]}"/>
      </radialGradient>
      <radialGradient id="${id}-piel" cx="38%" cy="30%" r="80%">
        <stop offset="0" stop-color="${aclarar(piel, 0.22)}"/><stop offset="0.55" stop-color="${piel}"/><stop offset="1" stop-color="${oscurecer(piel, 0.2)}"/>
      </radialGradient>
      <linearGradient id="${id}-pelo" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="${aclarar(pelo, 0.28)}"/><stop offset="0.5" stop-color="${pelo}"/><stop offset="1" stop-color="${oscurecer(pelo, 0.3)}"/>
      </linearGradient>
      <radialGradient id="${id}-iris" cx="45%" cy="40%" r="60%">
        <stop offset="0" stop-color="${aclarar(COLORES_OJOS[a.colorOjos], 0.45)}"/><stop offset="1" stop-color="${oscurecer(COLORES_OJOS[a.colorOjos], 0.25)}"/>
      </radialGradient>
      <linearGradient id="${id}-ropa" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6f6dff"/><stop offset="1" stop-color="#2d2bd0"/>
      </linearGradient>
      <filter id="${id}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
      <filter id="${id}-sombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity="0.22"/></filter>
    </defs>
    <g clip-path="url(#${id}-clip)" stroke-linecap="round" stroke-linejoin="round">
      <rect width="200" height="200" fill="url(#${id}-fondo)"/>
      <path d="M34 214 Q38 176 100 170 Q162 176 166 214 Z" fill="url(#${id}-ropa)"/>
      <path d="M86 150 V174 Q100 182 114 174 V150 Z" fill="${c.sombra}"/>
      <g transform="translate(100 112) scale(1.06) translate(-100 -104)" filter="url(#${id}-sombra)">
        ${peloDetras(a.peinado, c)}
        ${orejas(a.orejas, a.cabeza, c)}
        ${cabeza(a.cabeza, c)}
      </g>
      <g transform="translate(100 112) scale(1.06) translate(-100 -104)">
        <ellipse cx="74" cy="120" rx="10" ry="6" fill="#ff7a7a" opacity="0.28" filter="url(#${id}-blur)"/>
        <ellipse cx="126" cy="120" rx="10" ry="6" fill="#ff7a7a" opacity="0.28" filter="url(#${id}-blur)"/>
        ${vello(a.vello, c)}
        ${boca(a.boca, c)}
        ${nariz(a.nariz, c)}
        ${ojos(a.ojos, c)}
        ${cejas(a.cejas, pelo)}
        ${peloDelante(a.peinado, c)}
        ${gafas(a.gafas, id)}
        ${gorro(a.gorro, id)}
      </g>
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

/* ---------- partes (con volumen, sin contorno) ---------- */

function cabeza(tipo, c) {
  if (tipo === 1) return `<ellipse cx="100" cy="103" rx="45" ry="60" fill="${c.piel}"/>`;
  if (tipo === 2) return `<path d="M52 72 Q52 44 82 44 H118 Q148 44 148 72 V112 Q148 158 100 160 Q52 158 52 112 Z" fill="${c.piel}"/>`;
  return `<ellipse cx="100" cy="101" rx="50" ry="57" fill="${c.piel}"/>`;
}

function orejas(tamano, tipoCabeza, c) {
  const separacion = [50, 45, 48][tipoCabeza];
  const [rx, ry] = [[7, 10], [9, 13], [12, 16]][tamano];
  return [-1, 1].map((lado) => {
    const x = 100 + lado * separacion;
    return `<ellipse cx="${x}" cy="106" rx="${rx}" ry="${ry}" fill="${c.piel}"/>
      <ellipse cx="${x + lado * rx * 0.15}" cy="106" rx="${rx * 0.45}" ry="${ry * 0.55}" fill="${c.sombraSuave}"/>`;
  }).join('');
}

function ojo(tipo, x, c) {
  const y = 100;
  const brillos = `<circle cx="${x + 2.6}" cy="${y - 2.6}" r="2.4" fill="#ffffff"/><circle cx="${x - 2.2}" cy="${y + 2.8}" r="1.1" fill="#ffffff" opacity="0.8"/>`;
  const abierto = (rx, ry, iris) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#ffffff"/>
    <ellipse cx="${x}" cy="${y - ry + 2}" rx="${rx - 1}" ry="3" fill="${c.sombraSuave}" opacity="0.35"/>
    <circle cx="${x}" cy="${y + 0.8}" r="${iris}" fill="${c.iris}"/>
    <circle cx="${x}" cy="${y + 0.8}" r="${iris * 0.48}" fill="#14131c"/>${brillos}`;
  const cerrado = `<path d="M${x - 8} ${y + 2} Q${x} ${y - 6} ${x + 8} ${y + 2}" fill="none" stroke="#2a2433" stroke-width="3.2"/>`;
  if (tipo === 0) return abierto(7, 7.5, 5.6);
  if (tipo === 2) return cerrado;
  if (tipo === 3) return abierto(10, 6.5, 5);
  if (tipo === 4) {
    return `${abierto(9.5, 10.5, 6.8)}<path d="M${x - 9} ${y - 7} l-4 -3 M${x - 5} ${y - 10} l-2 -4 M${x} ${y - 11} l0 -4" stroke="#2a2433" stroke-width="2"/>`;
  }
  return abierto(9.5, 10.5, 6.8);
}

function ojos(tipo, c) {
  // 5 = guiño: el izquierdo abierto y el derecho cerrado.
  if (tipo === 5) return ojo(1, 80, c) + ojo(2, 120, c);
  return ojo(tipo, 80, c) + ojo(tipo, 120, c);
}

function cejas(tipo, pelo) {
  const recta = 'M70 84 Q80 82 90 83 M110 83 Q120 82 130 84';
  const arco = 'M70 86 Q80 78 90 84 M110 84 Q120 78 130 86';
  const formas = [[recta, 4.5], [arco, 4.2], [recta, 7.5], [arco, 2.6]];
  if (tipo === 4) return '';
  const [d, grosor] = formas[tipo];
  const color = pelo === '#f0f0f0' ? '#c8c8cc' : oscurecer(pelo, 0.1);
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${grosor}" opacity="0.95"/>`;
}

function nariz(tipo, c) {
  const luz = '<ellipse cx="98" cy="109" rx="2.2" ry="3.5" fill="#ffffff" opacity="0.35"/>';
  const sombraBase = (ancho) => `<path d="M${100 - ancho} 117 Q100 ${123 + ancho * 0.15} ${100 + ancho} 117" fill="none" stroke="${c.sombra}" stroke-width="3" opacity="0.8"/>`;
  if (tipo === 1) return `<path d="M101 100 Q97 112 96 117" fill="none" stroke="${c.sombraSuave}" stroke-width="3"/>${sombraBase(5)}`;
  if (tipo === 2) return `<ellipse cx="100" cy="114" rx="7" ry="6" fill="${c.sombraSuave}"/>${luz}`;
  if (tipo === 3) return `<path d="M97 116 Q100 119 103 116" fill="none" stroke="${c.sombra}" stroke-width="2.6"/>`;
  if (tipo === 4) return `${sombraBase(8)}<circle cx="95" cy="117" r="1.8" fill="${c.sombra}"/><circle cx="105" cy="117" r="1.8" fill="${c.sombra}"/>${luz}`;
  return `${sombraBase(5)}${luz}`;
}

function boca(tipo, c) {
  const interior = '#6b2233';
  const labio = 'rgb(190 70 80 / 0.55)';
  const abierta = `<path d="M84 127 Q100 151 116 127 Q100 132 84 127 Z" fill="${interior}"/>
    <path d="M87 128.5 Q100 133 113 128.5 L112 132 Q100 136 88 132 Z" fill="#ffffff"/>
    <path d="M92 143 Q100 147 108 143" fill="none" stroke="#ff8f9c" stroke-width="3" opacity="0.6"/>`;
  if (tipo === 1) return abierta;
  if (tipo === 2) return `<path d="M88 134 Q100 136 112 134" fill="none" stroke="${labio}" stroke-width="4"/>`;
  if (tipo === 3) return `<ellipse cx="100" cy="135" rx="6.5" ry="8.5" fill="${interior}"/><ellipse cx="100" cy="139" rx="4" ry="3" fill="#ff8f9c" opacity="0.7"/>`;
  if (tipo === 4) return `<path d="M88 134 Q102 139 113 128" fill="none" stroke="${labio}" stroke-width="4"/>`;
  if (tipo === 5) return `${abierta}<path d="M93 140 Q100 151 107 140 Q100 137 93 140 Z" fill="#ff7a8a"/>`;
  return `<path d="M85 129 Q100 143 115 129" fill="none" stroke="${labio}" stroke-width="4"/>
    <path d="M89 131 Q100 139 111 131" fill="none" stroke="${interior}" stroke-width="2" opacity="0.5"/>`;
}

function vello(tipo, c) {
  const bigote = `<path d="M84 127 Q92 118 100 124 Q108 118 116 127 Q108 125 100 128 Q92 125 84 127 Z" fill="${c.pelo}"/>`;
  if (tipo === 1) return bigote;
  if (tipo === 2) return `<path d="M91 143 Q100 162 109 143 Q100 148 91 143 Z" fill="${c.pelo}"/>`;
  if (tipo === 3) return `<path d="M54 114 Q56 162 100 165 Q144 162 146 114 Q140 144 100 148 Q60 144 54 114 Z" fill="${c.peloOscuro}" opacity="0.35"/>`;
  if (tipo === 4) {
    return `<path d="M51 102 Q48 174 100 178 Q152 174 149 102 Q146 140 128 143 Q114 124 100 126 Q86 124 72 143 Q54 140 51 102 Z" fill="${c.pelo}"/>${bigote}`;
  }
  return '';
}

/* Pelo: degradado con brillo y unos mechones claros, como el pelo de un Memoji */
function mechones(d) {
  return `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.18"/>`;
}

function peloDetras(tipo, c) {
  if (tipo === 5) return `<path d="M46 90 Q40 26 100 24 Q160 26 154 90 L160 178 Q132 188 126 168 L124 120 H76 L74 168 Q68 188 40 178 Z" fill="${c.pelo}"/>`;
  if (tipo === 6) return `<path d="M138 62 Q186 74 172 150 Q160 128 146 104 Z" fill="${c.pelo}"/>`;
  if (tipo === 7) return `<circle cx="100" cy="28" r="20" fill="${c.pelo}"/>`;
  if (tipo === 8) return `<circle cx="100" cy="84" r="67" fill="${c.pelo}"/>`;
  if (tipo === 9) return `<path d="M48 90 Q40 26 100 24 Q160 26 152 90 L157 142 Q147 154 138 142 Q128 154 120 140 L118 110 H82 L80 140 Q72 154 62 142 Q53 154 43 142 Z" fill="${c.pelo}"/>`;
  return '';
}

function peloDelante(tipo, c) {
  const corto = 'M47 98 Q42 30 100 28 Q158 30 153 98 Q147 64 128 57 Q104 72 74 57 Q54 64 47 98 Z';
  const raya = 'M48 96 Q44 28 100 26 Q156 28 152 96 Q140 56 100 48 Q60 56 48 96 Z';
  const ladeado = 'M48 98 Q44 28 100 26 Q156 28 152 98 Q148 62 120 55 Q90 78 54 73 Q50 84 48 98 Z';
  const casco = 'M52 92 Q50 38 100 36 Q150 38 148 92 Q140 58 100 54 Q60 58 52 92 Z';
  const brilloArriba = mechones('M66 50 Q86 36 112 38 M74 58 Q96 46 124 48');
  switch (tipo) {
    case 1: return `<path d="${casco}" fill="${c.pelo}" opacity="0.92"/>`;
    case 2: return `<path d="${corto}" fill="${c.pelo}"/>${brilloArriba}`;
    case 3: return `<path d="M48 96 Q44 28 100 26 Q156 28 152 96 Q150 68 144 60 Q120 80 66 75 Q54 80 48 96 Z" fill="${c.pelo}"/>${brilloArriba}`;
    case 4: return [[56, 76], [64, 55], [80, 42], [100, 37], [120, 42], [136, 55], [144, 76]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="${c.pelo}"/><circle cx="${x - 4}" cy="${y - 5}" r="5" fill="#ffffff" opacity="0.14"/>`).join('');
    case 5: return `<path d="${raya}" fill="${c.pelo}"/>${mechones('M60 70 Q72 46 96 38 M140 70 Q128 46 104 38')}`;
    case 6: return `<path d="${corto}" fill="${c.pelo}"/>${brilloArriba}`;
    case 7: return `<path d="${casco}" fill="${c.pelo}"/>${mechones('M70 52 Q100 40 130 52')}`;
    case 8: return `<path d="M56 80 Q100 48 144 80 Q130 64 100 62 Q70 64 56 80 Z" fill="${c.pelo}"/>`;
    case 9: return `<path d="${ladeado}" fill="${c.pelo}"/>${mechones('M60 66 Q90 42 132 44')}`;
    default: return '';
  }
}

function gafas(tipo, id) {
  const montura = '#2a2a33';
  const cristal = `fill="#ffffff" fill-opacity="0.16"`;
  const reflejo = (x) => `<path d="M${x - 7} ${95} L${x - 2} ${90}" stroke="#ffffff" stroke-width="2.5" opacity="0.6"/>`;
  const patillas = `<path d="M66 97 L50 94 M134 97 L150 94" stroke="${montura}" stroke-width="3"/>`;
  const puente = `<path d="M93 99 Q100 95 107 99" fill="none" stroke="${montura}" stroke-width="3"/>`;
  if (tipo === 1) {
    return `${patillas}${puente}<circle cx="80" cy="100" r="13" ${cristal} stroke="${montura}" stroke-width="3"/>
      <circle cx="120" cy="100" r="13" ${cristal} stroke="${montura}" stroke-width="3"/>${reflejo(80)}${reflejo(120)}`;
  }
  if (tipo === 2) {
    return `${patillas}${puente}<rect x="66" y="89" width="28" height="22" rx="6" ${cristal} stroke="${montura}" stroke-width="3"/>
      <rect x="106" y="89" width="28" height="22" rx="6" ${cristal} stroke="${montura}" stroke-width="3"/>${reflejo(80)}${reflejo(120)}`;
  }
  if (tipo === 3) {
    return `${patillas}${puente}<path d="M64 89 H96 Q97 109 82 111 Q65 111 64 89 Z M104 89 H136 Q135 111 118 111 Q103 109 104 89 Z" fill="url(#${id}-gafasol)"/>
      <defs><linearGradient id="${id}-gafasol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a48"/><stop offset="1" stop-color="#0e0e14"/></linearGradient></defs>
      ${reflejo(78)}${reflejo(118)}`;
  }
  if (tipo === 4) {
    return `<path d="M65 97 L50 94 M135 97 L150 94" stroke="${ROPA}" stroke-width="4"/>
      <rect x="65" y="88" width="30" height="24" rx="10" ${cristal} stroke="${ROPA}" stroke-width="5"/>
      <rect x="105" y="88" width="30" height="24" rx="10" ${cristal} stroke="${ROPA}" stroke-width="5"/>
      <path d="M95 98 Q100 94 105 98" fill="none" stroke="${ROPA}" stroke-width="5"/>${reflejo(80)}${reflejo(120)}`;
  }
  return '';
}

function gorro(tipo, id) {
  const degradado = (nombre, claro, oscuro) => `<defs><linearGradient id="${id}-${nombre}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${claro}"/><stop offset="1" stop-color="${oscuro}"/></linearGradient></defs>`;
  if (tipo === 1) {
    return `${degradado('lana', '#ff7b84', '#c93a46')}<path d="M44 84 Q44 16 100 14 Q156 16 156 84 Z" fill="url(#${id}-lana)"/>
      <rect x="40" y="70" width="120" height="22" rx="11" fill="#b8323d"/>
      <path d="M48 76 H152" stroke="#ffffff" stroke-width="2" opacity="0.15"/>
      <circle cx="100" cy="13" r="12" fill="#f7f7f7"/><circle cx="96" cy="9" r="4" fill="#ffffff"/>`;
  }
  if (tipo === 2) {
    return `${degradado('gorra', '#6f6dff', '#2d2bd0')}<path d="M46 74 Q48 18 100 16 Q152 18 154 74 Z" fill="url(#${id}-gorra)"/>
      <path d="M40 74 Q100 61 160 74 Q166 87 100 85 Q34 87 40 74 Z" fill="#2422a8"/>
      <circle cx="100" cy="18" r="4" fill="#2422a8"/><path d="M70 34 Q86 24 106 24" stroke="#ffffff" stroke-width="3" opacity="0.2"/>`;
  }
  if (tipo === 3) {
    return `<path d="M50 98 Q48 20 100 18 Q152 20 150 98" fill="none" stroke="#d9dbe3" stroke-width="9"/>
      <path d="M50 98 Q48 20 100 18 Q152 20 150 98" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.7"/>
      ${degradado('cascos', '#ffffff', '#c9ccd6')}<rect x="35" y="84" width="19" height="36" rx="9.5" fill="url(#${id}-cascos)"/>
      <rect x="146" y="84" width="19" height="36" rx="9.5" fill="url(#${id}-cascos)"/>`;
  }
  if (tipo === 4) {
    return `${degradado('boina', '#4a4a64', '#24243a')}<ellipse cx="94" cy="46" rx="60" ry="19" fill="url(#${id}-boina)"/>
      <circle cx="96" cy="26" r="4" fill="#24243a"/>`;
  }
  return '';
}

/** Color más claro (luces) y más oscuro (sombras) a partir de uno base. */
function aclarar(hex, cantidad) {
  return mezclar(hex, 255, cantidad);
}

function oscurecer(hex, cantidad) {
  return mezclar(hex, 0, cantidad);
}

function mezclar(hex, destino, cantidad) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (desplazamiento) => {
    const valor = (n >> desplazamiento) & 255;
    return Math.round(valor + (destino - valor) * cantidad);
  };
  return `#${[16, 8, 0].map((d) => canal(d).toString(16).padStart(2, '0')).join('')}`;
}
