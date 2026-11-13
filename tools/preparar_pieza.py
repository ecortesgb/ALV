"""Prepara una pieza nueva del personaje a partir de un PNG con fondo transparente.

Uso:
    python tools/preparar_pieza.py <imagen.png> <tipo> <id>

    tipo: rostro | facial | cabello | torso | piernas | mano
    id:   nombre del archivo, por ejemplo  hp-rostro-harry  o  ironman-torso

Qué hace:
- Si la imagen ya mide 400x520 (el lienzo de las piezas), la usa tal cual.
- Si no, recorta lo transparente y la acomoda en la zona donde va ese tipo de pieza
  (medida sobre las piezas que ya existen), sin deformarla.
- Guarda public/piezas/<id>.webp (lienzo completo) y <id>_m.webp (miniatura 168x168).
- Imprime la línea para pegar en src/content/piezas-equipo.json.

Necesita Pillow (pip install pillow).
"""
import json
import sys
from pathlib import Path

from PIL import Image

LIENZO = (400, 520)
# Zona típica de cada tipo (izq, arriba, der, abajo), medida con las piezas actuales.
ZONAS = {
    "rostro": (173, 156, 228, 201),
    "facial": (156, 152, 244, 205),
    "cabello": (133, 87, 265, 194),
    "torso": (92, 208, 308, 341),
    "piernas": (126, 341, 274, 489),
    "mano": (261, 304, 318, 379),
}
CARPETA = Path(__file__).resolve().parent.parent / "public" / "piezas"


def acomodar(img: Image.Image, tipo: str) -> Image.Image:
    if img.size == LIENZO:
        return img
    caja = img.getbbox()
    if not caja:
        sys.exit("La imagen está vacía (todo transparente).")
    parte = img.crop(caja)
    x0, y0, x1, y1 = ZONAS[tipo]
    escala = min((x1 - x0) / parte.width, (y1 - y0) / parte.height)
    parte = parte.resize((max(1, round(parte.width * escala)), max(1, round(parte.height * escala))), Image.LANCZOS)
    lienzo = Image.new("RGBA", LIENZO)
    # Centrada a lo ancho; pegada abajo de su zona (el pelo y los sombreros crecen hacia arriba).
    x = x0 + ((x1 - x0) - parte.width) // 2
    y = y1 - parte.height
    lienzo.alpha_composite(parte, (x, y))
    return lienzo


def miniatura(img: Image.Image) -> Image.Image:
    caja = img.getbbox()
    parte = img.crop(caja)
    parte.thumbnail((112, 112), Image.LANCZOS)
    m = Image.new("RGBA", (168, 168))
    m.alpha_composite(parte, ((168 - parte.width) // 2, (168 - parte.height) // 2))
    return m


def main() -> None:
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    origen, tipo, ident = sys.argv[1], sys.argv[2], sys.argv[3]
    if tipo not in ZONAS:
        sys.exit(f"Tipo no válido: {tipo}. Usa uno de: {', '.join(ZONAS)}")
    if not ident.replace("-", "").isalnum() or ident != ident.lower():
        sys.exit("El id va en minúsculas, con letras, números y guiones (ej. hp-rostro-harry).")
    img = Image.open(origen).convert("RGBA")
    if img.getchannel("A").getextrema()[0] == 255:
        sys.exit("La imagen no tiene fondo transparente. Expórtala como PNG con transparencia.")
    lienzo = acomodar(img, tipo)
    CARPETA.mkdir(parents=True, exist_ok=True)
    lienzo.save(CARPETA / f"{ident}.webp", "WEBP", quality=90, method=6)
    miniatura(lienzo).save(CARPETA / f"{ident}_m.webp", "WEBP", quality=90, method=6)
    print(f"Listo: public/piezas/{ident}.webp y {ident}_m.webp")
    print("Agrega esto a src/content/piezas-equipo.json (cambia nombre, equipo y nivel):")
    print(json.dumps({"id": ident, "nombre": "Nombre visible", "paso": tipo, "equipo": "gryffindor", "nivel": 1}, ensure_ascii=False))


if __name__ == "__main__":
    main()
