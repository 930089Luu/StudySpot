/*
 * Iniciales para el avatar de un perfil (el propio y el de otra persona).
 */
const MAX_INICIALES = 2;

/** "Lucía Claver Bolea" → "LC". */
export function getIniciales(nombre) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_INICIALES)
    .map((palabra) => palabra[0].toUpperCase())
    .join('');
}
