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
