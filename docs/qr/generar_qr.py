"""
Regenera los QR de las zonas de ejemplo (docs/qr/*.png) con la dirección de la app que se indique.

Uso (desde la carpeta codigo/):
    python docs/qr/generar_qr.py https://xxxx.trycloudflare.com

Hace falta: pip install segno

Por qué: el túnel HTTPS gratuito de Cloudflare cambia de dirección cada vez que se abre, y la
cámara del móvil abre la dirección que lleva el QR. El escáner de la propia app (checkin.html)
solo lee zona y token, así que dentro de la app un QR con otra dirección también funciona.
Los tokens son los de database/datos_ejemplo.sql: si cambian allí, hay que cambiarlos aquí.
"""
import sys
from pathlib import Path
from urllib.parse import urlencode

import segno

ZONAS = [
    (1, "4cabd192590ee77b3a1d915aac49d6a7", "zona-1-isla-gaia.png"),
    (2, "5ad62b2cd7e2258af79058aec5a298c8", "zona-2-kadora-campus-street.png"),
    (3, "ef0fc335a1ebc721af42534b10227094", "zona-3-almeida-garrett.png"),
    (4, "38bf4d7efb284d59829ac25060ea6482", "zona-4-publica-porto.png"),
    (5, "6fcb8d5466c8c1f2cf67fc51898592a4", "zona-5-flup.png"),
    (6, "2abf8c9dcc706bec66a2db14b77e213f", "zona-6-ffup-icbas.png"),
    (7, "258bedf735dde9594254c217a77f694e", "zona-7-municipal-gaia.png"),
    (8, "e1c577062cc855a707e9cfa9a4eaa1f8", "zona-8-ispgaya.png"),
]
RUTA_CHECKIN = "/public/checkin.html"
ESCALA_PNG = 12  # píxeles por módulo: unos 400 px, se imprime bien en A6
CARPETA = Path(__file__).resolve().parent


def crear_url(base, zona, token):
    return f"{base.rstrip('/')}{RUTA_CHECKIN}?{urlencode({'zona': zona, 'token': token})}"


def main():
    if len(sys.argv) != 2 or not sys.argv[1].startswith(("http://", "https://")):
        sys.exit("Uso: python docs/qr/generar_qr.py https://direccion-de-la-app")
    base = sys.argv[1]
    for zona, token, archivo in ZONAS:
        url = crear_url(base, zona, token)
        segno.make(url, error="m").save(CARPETA / archivo, scale=ESCALA_PNG, border=4)
        print(f"{archivo}: {url}")


if __name__ == "__main__":
    main()
