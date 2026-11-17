/*
 * Lector de códigos QR con la cámara (wireframe 4A) (US02).
 *
 * Reparto del trabajo:
 * - Nuestro código abre la cámara (getUserMedia), copia cada fotograma del vídeo a un
 *   <canvas> invisible y saca sus píxeles.
 * - jsQR (public/js/vendor/jsQR.js, v1.4.0, licencia Apache-2.0) busca un QR en esos
 *   píxeles y, si lo encuentra, devuelve el texto que lleva dentro.
 * jsQR es un archivo UMD: checkin.html lo carga con <script> antes que los módulos y
 * queda disponible como globalThis.jsQR. Es el único sitio que lo usa.
 */

// El fotograma se reduce a este ancho antes de analizarlo: basta para leer un QR y va rápido en el móvil.
const ANCHO_MAX_ANALISIS = 640;
// Cámara trasera si la hay (en el portátil se usa la webcam). Sin audio.
const RESTRICCIONES_CAMARA = { video: { facingMode: { ideal: 'environment' } }, audio: false };

/** La cámara solo se puede usar en contexto seguro (HTTPS, localhost o 127.0.0.1). */
export function isCamaraDisponible() {
  return window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia);
}

/**
 * Muestra la cámara en el <video> y llama a alLeer(texto) cada vez que encuentra un QR.
 * Devuelve una función que apaga la cámara. Si no hay permiso o cámara, lanza el error del navegador.
 */
export async function iniciarEscaner(video, alLeer) {
  const stream = await navigator.mediaDevices.getUserMedia(RESTRICCIONES_CAMARA);
  video.srcObject = stream;
  await video.play();

  const lienzo = document.createElement('canvas');
  const contexto = lienzo.getContext('2d', { willReadFrequently: true });
  let isActivo = true;

  const analizar = () => {
    if (!isActivo) return;
    const texto = leerFotograma(video, lienzo, contexto);
    if (texto !== null) alLeer(texto);
    // alLeer puede haber apagado la cámara: solo se sigue si todavía está activa.
    if (isActivo) requestAnimationFrame(analizar);
  };
  requestAnimationFrame(analizar);

  return () => {
    isActivo = false;
    stream.getTracks().forEach((pista) => pista.stop());
    video.srcObject = null;
  };
}

/** Copia el fotograma actual al canvas y se lo pasa a jsQR. Devuelve el texto del QR o null. */
function leerFotograma(video, lienzo, contexto) {
  if (video.readyState < video.HAVE_ENOUGH_DATA || video.videoWidth === 0) return null;

  const escala = Math.min(1, ANCHO_MAX_ANALISIS / video.videoWidth);
  lienzo.width = Math.round(video.videoWidth * escala);
  lienzo.height = Math.round(video.videoHeight * escala);
  contexto.drawImage(video, 0, 0, lienzo.width, lienzo.height);

  const { data, width, height } = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
  // 'dontInvert': solo se buscan QR oscuros sobre fondo claro (como los nuestros); la mitad de trabajo.
  const codigo = globalThis.jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
  return codigo ? codigo.data : null;
}
