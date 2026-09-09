#!/usr/bin/env python
"""Lector por secciones del manual de referencia de ciberseguridad.

El libro (Stallings & Brown, *Computer Security: Principles and Practice*,
Pearson 2018) es material con derechos y NO está en el repositorio: vive en
Docs/ y lo excluye .gitignore, igual que los manuales de razonamiento. Este
script sólo sirve para consultarlo mientras se redacta el curso, que se escribe
con palabras propias en Docs/8.- *.md.

    python scripts/read_book.py --toc
    python scripts/read_book.py --section "1.4"
    python scripts/read_book.py --pages 40-46
    python scripts/read_book.py --grep "attack surface"
"""
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
BOOK = next(ROOT.joinpath("Docs").glob("Stallings*Computer Security*.pdf"), None)


def open_book():
    if BOOK is None or not BOOK.exists():
        sys.exit(
            "No se encuentra el manual en Docs/. Es material con derechos y no se\n"
            "versiona: hay que colocarlo a mano para poder consultarlo."
        )
    import pymupdf

    return pymupdf.open(BOOK)


def clean(text: str) -> str:
    # El PDF trae guiones de partición de línea y espacios finos de maquetación
    # que ensucian cualquier búsqueda.
    text = text.replace(" ", " ").replace("­", "")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    return re.sub(r"\n{3,}", "\n\n", text)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--toc", action="store_true", help="índice del libro con sus páginas")
    ap.add_argument("--section", help="número de sección, p. ej. 1.4 o 13.2")
    ap.add_argument("--pages", help="rango de páginas del PDF, p. ej. 40-46")
    ap.add_argument("--grep", help="buscar un término y mostrar dónde aparece")
    ap.add_argument("--chars", type=int, default=8000, help="máximo de caracteres a imprimir")
    args = ap.parse_args()

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    doc = open_book()
    toc = doc.get_toc()

    if args.toc:
        for level, title, page in toc:
            print(f"{'  ' * (level - 1)}{title}  …{page}")
        return

    if args.grep:
        needle = args.grep.lower()
        hits = 0
        for i in range(doc.page_count):
            text = doc[i].get_text()
            if needle in text.lower():
                for line in clean(text).splitlines():
                    if needle in line.lower():
                        print(f"p.{i + 1}: {line.strip()}")
                        hits += 1
                        if hits >= 60:
                            print("…")
                            return
        if not hits:
            print("sin resultados")
        return

    if args.section:
        # Se localiza la sección por su entrada de índice y se lee hasta la
        # siguiente, que es donde termina.
        entries = [(t, p) for _, t, p in toc]
        start = end = None
        for i, (title, page) in enumerate(entries):
            if title.strip().startswith(args.section + " "):
                start = page
                end = entries[i + 1][1] if i + 1 < len(entries) else page + 12
                print(f"# {title.strip()}  (pp. {start}–{end})\n", file=sys.stderr)
                break
        if start is None:
            sys.exit(f"No hay una sección '{args.section}' en el índice.")
    elif args.pages:
        a, _, b = args.pages.partition("-")
        start, end = int(a), int(b or a)
    else:
        ap.error("hace falta --toc, --section, --pages o --grep")

    text = "".join(doc[p].get_text() for p in range(start - 1, min(end, doc.page_count)))
    print(clean(text)[: args.chars])


if __name__ == "__main__":
    main()
