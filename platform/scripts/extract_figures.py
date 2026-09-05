"""Recorta del escaneo del libro la figura de cada pregunta de razonamiento abstracto.

El banco real (`abs-real-1` … `abs-real-120`) viene de un libro cuyo PDF es una
FOTO de cada página: sin capa de texto, el fondo gris, la hoja inclinada un par
de grados y la sombra del canto metida en el margen. La transcripción en prosa
que lee `abstractFigure.ts` no alcanza para decenas de preguntas (un elefante,
una cara de gato, un muro de ladrillos), y para ésas la única figura fiel es la
del propio libro.

Cada página trae tres preguntas y cada pregunta dos tiras: la secuencia del
enunciado y la fila de opciones A–E. De ahí salen dos imágenes por pregunta.

    python scripts/extract_figures.py            # todas
    python scripts/extract_figures.py 5 6 7      # solo esas preguntas

El PDF no está en el repositorio (`Docs/*.pdf` está en .gitignore); las imágenes
que genera este script sí, porque son lo que sirve la aplicación.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pymupdf
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "Docs" / "5.-Abstract_20reasoning_20Q&A.pdf"
OUT = ROOT / "platform" / "public" / "figures" / "abstract"
MANIFEST = ROOT / "platform" / "src" / "data" / "scannedFigures.generated.ts"

DPI = 200
INK = 200          # sobre la imagen ya aplanada: 55 niveles por debajo del fondo local
MIN_STRIP = 115
MAX_STRIP = 560
MAX_WIDTH = 1400   # ancho final de la imagen; por encima solo se gana peso
# Los recortes son fotos de papel, llenas de grano: en PNG el grano pesa más
# que el dibujo (22 MB en total). WebP a esta calidad es indistinguible a 1:1
# y baja el conjunto a menos de un tercio.
WEBP_QUALITY = 82
PAD = 10

# El libro numera 120 preguntas. La primera página lleva la portada del capítulo
# y solo la pregunta 1; la última, la 119 y la 120; las de en medio, tres.
PAGE_QUESTIONS = [[1]] + [[2 + i * 3, 3 + i * 3, 4 + i * 3] for i in range(39)] + [[119, 120]]


def page_image(doc, index):
    pix = doc[index].get_pixmap(dpi=DPI)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("L")


def flatten(im, maxr=9, blur=20):
    """Corrige la iluminación desigual de la foto.

    Un lado de la página sale más claro que el otro, así que NO hay un umbral de
    gris válido para toda la página: la misma raya impresa queda más oscura que
    el fondo en un extremo y más clara que el fondo en el otro. Se estima el
    fondo local (un máximo, que borra la tinta, suavizado) y se resta. A partir
    de ahí «tinta» significa «más oscuro que su entorno», que sí tiene respuesta.
    """
    bg = im.filter(ImageFilter.MaxFilter(maxr)).filter(ImageFilter.GaussianBlur(blur))
    return ImageChops.subtract(im, bg, 1, 255)


def profile(im, axis):
    """Fracción de tinta (0..255) por fila (axis="y") o por columna (axis="x")."""
    mask = im.point(lambda v: 255 if v < INK else 0)
    size = (1, im.height) if axis == "y" else (im.width, 1)
    return list(mask.resize(size, Image.BOX).get_flattened_data())


def edge_box(im):
    """Caja de la página sin el borde de la foto ni la sombra del canto.

    La sombra es una franja oscura vertical que recorre TODA la altura: mientras
    esté ahí no hay ni una fila en blanco, y sin filas en blanco no hay forma de
    saber dónde acaba una tira y empieza la siguiente. Se devuelve la caja, no la
    imagen, porque hay que aplicar el mismo recorte a dos versiones de la página.
    """
    w, h = im.size
    box = [int(w * 0.02), int(h * 0.015), int(w * 0.98), int(h * 0.985)]
    im = im.crop(tuple(box))
    for _ in range(2):
        raw = im.point(lambda v: 255 if v < 110 else 0)
        cols = list(raw.resize((raw.width, 1), Image.BOX).get_flattened_data())
        rows = list(raw.resize((1, raw.height), Image.BOX).get_flattened_data())
        # Una columna de contenido rara vez lleva tinta en más de un cuarto de su
        # altura; una sombra de canto la lleva en casi toda.
        left, right = 0, len(cols)
        while left < right - 1 and cols[left] > 60:
            left += 1
        while right > left + 1 and cols[right - 1] > 60:
            right -= 1
        top, bottom = 0, len(rows)
        while top < bottom - 1 and rows[top] > 90:
            top += 1
        while bottom > top + 1 and rows[bottom - 1] > 90:
            bottom -= 1
        if (left, top, right, bottom) == (0, 0, im.width, im.height):
            break
        box = [box[0] + left, box[1] + top, box[0] + right, box[1] + bottom]
        im = im.crop((left, top, right, bottom))
    return tuple(box)


def skew_angle(im, span=3.0, step=0.25):
    """Inclinación de la foto, en grados.

    Un par de grados bastan para que el marco de un panel invada la franja en
    blanco de debajo y dos tiras se fundan en una.
    """
    small = im.resize((im.width // 2, im.height // 2), Image.BILINEAR)
    best, angle = -1, 0.0
    a = -span
    while a <= span + 1e-9:
        cand = small.rotate(a, resample=Image.BILINEAR, fillcolor=255) if a else small
        score = sum(1 for v in profile(cand, "y") if v == 0)
        if score > best:
            best, angle = score, a
        a += step
    return angle


def bands(prof, gap=14, thr=1, minlen=3):
    raw, start = [], None
    for i, v in enumerate(prof):
        if v > thr and start is None:
            start = i
        elif v <= thr and start is not None:
            if i - start >= minlen:
                raw.append((start, i))
            start = None
    if start is not None:
        raw.append((start, len(prof)))
    out = []
    for a, b in raw:
        if out and a - out[-1][1] < gap:
            out[-1] = (out[-1][0], b)
        else:
            out.append((a, b))
    return out


def _split_tallest(prof, strips):
    """Parte la tira más alta por su fila más limpia.

    Cuando el enunciado y las opciones quedan pegados (la raya que los separa
    toca el marco de un panel), la banda resultante mide el doble que las demás.
    """
    i = max(range(len(strips)), key=lambda k: strips[k][1] - strips[k][0])
    a, b = strips[i]
    lo, hi = a + int((b - a) * 0.25), a + int((b - a) * 0.75)
    cut = min(range(lo, hi), key=lambda y: prof[y])
    return strips[:i] + [(a, cut), (cut, b)] + strips[i + 1:]


def _merge_closest(strips):
    """Une las dos tiras contiguas con menos hueco entre ellas: es donde una sola
    tira se ha partido en dos por un espacio interno más ancho de lo normal."""
    i = min(range(len(strips) - 1), key=lambda k: strips[k + 1][0] - strips[k][1])
    return strips[:i] + [(strips[i][0], strips[i + 1][1])] + strips[i + 2:]


def find_strips(im, expected):
    """Las tiras de figuras de una página.

    El hueco en blanco entre tiras no mide lo mismo en todas las páginas — cada
    foto tiene su contraste —, así que en vez de fijar un valor se prueban todos
    y se acepta el primero que da el número esperado. Si ninguno lo consigue, se
    parte o se une hasta llegar a él: cuántas preguntas trae cada página es un
    dato conocido, y forzar esa estructura acierta más que cualquier umbral.
    """
    prof = profile(im, "y")
    # De mayor a menor: con un hueco grande se funden primero los espacios
    # INTERNOS de un panel (los de la pregunta 17 llevan dos filas dentro del
    # mismo marco) y solo después los que separan tiras de verdad. Buscando al
    # revés, la primera coincidencia partía un panel por su mitad y descolocaba
    # todas las tiras de la página.
    for gap in range(60, 5, -1):
        found = [(a, b) for a, b in bands(prof, gap) if MIN_STRIP <= b - a <= MAX_STRIP]
        if len(found) == expected:
            return found
    found = [(a, b) for a, b in bands(prof, 12) if b - a >= MIN_STRIP]
    for _ in range(12):
        if len(found) == expected:
            break
        found = _split_tallest(prof, found) if len(found) < expected else _merge_closest(found)
    return found


def absorb_orphans(prof, strips, gap=12):
    """Devuelve a su tira las bandas de contenido que se han quedado fuera.

    Una fila entera de paneles puede partirse en dos bandas separadas por más
    hueco del que admite la búsqueda (los paneles de la pregunta 116 están casi
    vacíos por dentro). El trozo que sobra es demasiado bajo para contar como
    tira, así que se descartaba: la opción salía recortada por la mitad, con
    solo el borde superior de los marcos.
    """
    if not strips:
        return strips
    strips = [list(s) for s in strips]
    for a, b in bands(prof, gap):
        if b - a < 65 or b - a >= MIN_STRIP:
            continue
        if any(a >= s[0] and b <= s[1] for s in strips):
            continue
        best = min(strips, key=lambda s: min(abs(a - s[1]), abs(s[0] - b)))
        if a - best[1] >= 0 and a - best[1] < 120:
            best[1] = b
        elif best[0] - b >= 0 and best[0] - b < 120:
            best[0] = a
    return [tuple(s) for s in strips]


def percentile(hist, frac):
    total = sum(hist)
    if total == 0:
        return 128
    target, acc = total * frac, 0
    for value, count in enumerate(hist):
        acc += count
        if acc >= target:
            return value
    return 255


def normalise(strip):
    """Lleva el papel a blanco puro y la tinta a negro, estirando lo de en medio.

    Se hace sobre el recorte ORIGINAL, no sobre el aplanado: restar el fondo
    local sirve para encontrar las tiras, pero se come el interior de las
    figuras rellenas de negro — dentro de un cuadrado negro grande el «fondo
    local» también es negro — y el relleno es justo lo que muchas preguntas
    comparan. Cada tira es lo bastante pequeña como para tener una iluminación
    casi uniforme, así que aquí basta con estirar su propio histograma.
    """
    hist = strip.histogram()
    # El papel es el gris DOMINANTE de la mitad clara del histograma, no un
    # percentil: en una tira con mucha tinta el percentil 90 todavía cae dentro
    # de las figuras y el fondo se queda gris sucio.
    mid = percentile(hist, 0.5)
    paper = max(range(mid, 256), key=lambda v: hist[v])
    ink = percentile(hist, 0.02)
    if paper - ink < 24:            # tira casi vacía: no hay nada que estirar
        return strip
    # El gris intermedio del libro (círculos grises frente a negros) es parte de
    # la regla en muchas preguntas, así que el estirado deja el centro intacto:
    # solo lleva el papel a blanco y la tinta más oscura a negro.
    floor = ink + (paper - ink) * 0.12
    ceiling = paper - (paper - ink) * 0.06
    scale = 255.0 / max(1.0, ceiling - floor)
    return strip.point(
        lambda v: 0 if v <= floor else (255 if v >= ceiling else int((v - floor) * scale))
    )


def column_clusters(im, gap=40):
    """Grupos de columnas con tinta, separados por huecos anchos."""
    cols = profile(im, "x")
    out, start, blank = [], None, 0
    for i, v in enumerate(cols):
        if v > 1:
            if start is None:
                start = i
            blank = 0
        elif start is not None:
            blank += 1
            if blank >= gap:
                out.append((start, i - blank))
                start = None
    if start is not None:
        out.append((start, len(cols)))
    return out


def drop_headings(analysis, top, bottom):
    """Quita de la tira la línea «N Which figure completes the series below?»
    cuando ha quedado pegada a ella, por arriba o por abajo.

    Es texto, no figura: repite lo que la aplicación ya escribe encima del
    dibujo y deja unas tiras más altas que otras sin motivo. Se comprueba que
    de verdad sea texto y no la fila de arriba de los paneles: el enunciado es
    UN bloque pegado al margen izquierdo, mientras que una fila de figuras se
    reparte en seis grupos a lo ancho de la tira. Sin esa comprobación se
    perdía, por ejemplo, la esquina superior de los paneles de la pregunta 12,
    que es justo lo que esa pregunta compara.
    """
    inner = bands(profile(analysis.crop((0, top, analysis.width, bottom)), "y"), gap=6)
    if len(inner) < 2:
        return top, bottom

    def is_text(band, neighbour_gap):
        # La prueba es deliberadamente estricta. Aflojarla se llevó por delante
        # la fila de flechas del enunciado de la pregunta 4: una fila de figuras
        # poco poblada se parece mucho a una línea de texto, y equivocarse aquí
        # borra parte de la figura sin que nada lo avise.
        if band[1] - band[0] > 60 or neighbour_gap < 12:
            return False
        strip = analysis.crop((0, top + band[0], analysis.width, top + band[1]))
        clusters = column_clusters(strip)
        if not clusters or len(clusters) > 2:
            return False
        return clusters[0][0] < analysis.width * 0.2 and clusters[-1][1] < analysis.width * 0.85

    def is_watermark(band, neighbour_gap):
        """La marca «Scanned by CamScanner» del pie de página, cuando se ha
        quedado pegada a la fila de opciones. A diferencia del enunciado va
        alineada a la derecha, así que no la reconoce `is_text`."""
        if band[1] - band[0] > 60 or neighbour_gap < 6:
            return False
        strip = analysis.crop((0, top + band[0], analysis.width, top + band[1]))
        clusters = column_clusters(strip)
        return bool(clusters) and len(clusters) <= 4 and clusters[0][0] > analysis.width * 0.45

    new_top, new_bottom = top, bottom
    if is_text(inner[0], inner[1][0] - inner[0][1]):
        new_top = top + inner[1][0]
    # También por abajo: el enunciado de la pregunta SIGUIENTE, o la marca del
    # escáner, se pegan muchas veces al pie de la fila de opciones.
    if len(inner) > 2:
        gap = inner[-1][0] - inner[-2][1]
        if is_text(inner[-1], gap) or is_watermark(inner[-1], gap):
            new_bottom = top + inner[-1][0]
    return new_top, new_bottom


def footer_top(analysis):
    """Dónde empieza la marca «Scanned by CamScanner» del pie, si está.

    No es contenido del libro y en alguna página se pega a la tira de opciones,
    que entonces sale con media página gris debajo.
    """
    rows = bands(profile(analysis, "y"), gap=12)
    if not rows:
        return None
    top, bottom = rows[-1]
    if bottom - top <= 80 and top > analysis.height * 0.9:
        return top - 8
    return None


def crop_strip(analysis, output, top, bottom, trim_heading=True):
    """Recorta una tira: los límites se buscan en la imagen aplanada y el recorte
    se hace sobre la original."""
    if trim_heading:
        top, bottom = drop_headings(analysis, top, bottom)
    top, bottom = max(0, top - PAD), min(analysis.height, bottom + PAD)
    cols = profile(analysis.crop((0, top, analysis.width, bottom)), "x")
    xs = [i for i, v in enumerate(cols) if v > 1]
    left = max(0, xs[0] - PAD) if xs else 0
    right = min(analysis.width, xs[-1] + PAD) if xs else analysis.width
    strip = output.crop((left, top, right, bottom))
    # Restos de la sombra del canto que hayan sobrevivido al recorte de página:
    # una columna casi entera de tinta pegada al borde de la tira.
    guide = analysis.crop((left, top, right, bottom))
    gcols = profile(guide, "x")
    a, b = 0, len(gcols)
    while a < b - 1 and gcols[a] > 120:
        a += 1
    while b > a + 1 and gcols[b - 1] > 120:
        b -= 1
    if (a, b) != (0, len(gcols)):
        strip = strip.crop((a, 0, b, strip.height))
    return normalise(strip)


# La primera página del capítulo lleva encima el título y las instrucciones: son
# una banda de texto más, que hay que descartar antes de las dos tiras de la
# pregunta 1.
LEADING_TEXT_STRIPS = {0: 1}

# Cinco páginas cuyos paneles están tan vacíos por dentro (o cuya foto está tan
# torcida) que el hueco entre dos tiras no se distingue del hueco entre la fila
# de arriba y la de abajo DENTRO de un panel. Ahí no hay umbral que valga: los
# límites están medidos a mano sobre la página ya recortada y enderezada, que
# es determinista. Cubren las preguntas 56-58, 65-67, 80-82, 83-85 y 107-109.
MANUAL_STRIPS = {
    19: [(129, 307), (465, 674), (884, 1045), (1216, 1420), (1560, 1800), (1879, 2130)],
    22: [(250, 505), (620, 895), (1000, 1220), (1330, 1575), (1625, 1920), (1970, 2205)],
    27: [(155, 415), (505, 815), (930, 1145), (1265, 1500), (1595, 1845), (1875, 2185)],
    28: [(170, 430), (545, 825), (935, 1165), (1270, 1515), (1600, 1820), (1895, 2170)],
    36: [(215, 460), (570, 830), (945, 1185), (1290, 1535), (1615, 1840), (1920, 2145)],
}


def main(argv):
    wanted = {int(a) for a in argv} if argv else None
    if not PDF.exists():
        print("falta el PDF de referencia: " + str(PDF))
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(PDF)
    written, failed = 0, []
    for page_index, numbers in enumerate(PAGE_QUESTIONS):
        if wanted and not wanted & set(numbers):
            continue
        raw = page_image(doc, page_index)
        box = edge_box(raw)
        raw = raw.crop(box)
        flat = flatten(raw)
        angle = skew_angle(flat)
        if angle:
            flat = flat.rotate(angle, resample=Image.BILINEAR, fillcolor=255)
            raw = raw.rotate(angle, resample=Image.BILINEAR, fillcolor=255)
        cut = footer_top(flat)
        if cut:
            flat, raw = flat.crop((0, 0, flat.width, cut)), raw.crop((0, 0, raw.width, cut))
        manual = MANUAL_STRIPS.get(page_index)
        if manual:
            strips, skip = manual, 0
        else:
            skip = LEADING_TEXT_STRIPS.get(page_index, 0)
            strips = find_strips(flat, len(numbers) * 2 + skip)
            if len(strips) != len(numbers) * 2 + skip:
                failed.append(page_index + 1)
                continue
            strips = absorb_orphans(profile(flat, "y"), strips)
        strips = strips[skip:]
        for k, number in enumerate(numbers):
            if wanted and number not in wanted:
                continue
            for kind, (top, bottom) in zip(("prompt", "options"), strips[k * 2:k * 2 + 2]):
                img = crop_strip(flat, raw, top, bottom, trim_heading=manual is None)
                if img.width > MAX_WIDTH:
                    img = img.resize(
                        (MAX_WIDTH, round(img.height * MAX_WIDTH / img.width)), Image.LANCZOS
                    )
                img.save(
                    OUT / ("abs-real-%d-%s.webp" % (number, kind)),
                    quality=WEBP_QUALITY,
                    method=6,
                )
                written += 1
    doc.close()
    write_manifest()
    print("%d imagenes en %s" % (written, OUT))
    if failed:
        print("paginas sin segmentar:", failed)
    return 0


def write_manifest():
    """Lista de preguntas que tienen figura escaneada.

    La aplicación no puede comprobar si un PNG existe antes de pintarlo, así
    que la lista se genera aquí, junto a los ficheros, y no a mano: si alguna
    vez falla el recorte de una página, esas preguntas desaparecen de la lista
    y vuelven solas al dibujo vectorial en vez de dejar un hueco roto.
    """
    ids = sorted(
        {f.name.rsplit("-", 1)[0] for f in OUT.glob("*-prompt.webp")
         if (OUT / (f.name.rsplit("-", 1)[0] + "-options.webp")).exists()},
        key=lambda name: int(name.rsplit("-", 1)[1]),
    )
    lines = [
        "// GENERADO por scripts/extract_figures.py — no editar a mano.",
        "//",
        "// Preguntas cuyo enunciado y opciones se sirven como recorte del libro",
        "// de referencia (public/figures/abstract/) en vez de redibujarse a",
        "// partir de la notación de texto.",
        "export const SCANNED_FIGURES: ReadonlySet<string> = new Set([",
    ]
    lines += ["  '%s'," % i for i in ids]
    lines += ["])", ""]
    MANIFEST.write_text(chr(10).join(lines), encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
