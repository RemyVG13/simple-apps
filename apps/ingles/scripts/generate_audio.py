"""Crea los mp3 de cards.json con la voz neural en-US-JennyNeural.

Uso, desde cualquier carpeta:
    py -3 -m pip install edge-tts
    py -3 apps/ingles/scripts/generate_audio.py

Si el mp3 de una palabra ya existe, no lo vuelve a generar.
"""

import asyncio
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "images"
CARDS_PATH = ROOT / "data" / "cards.json"
AUDIO_DIR = ROOT / "audio"
VOICE = "en-US-JennyNeural"
RATE = "-20%"
IMAGE_EXTS = {".jpg", ".jpeg"}


def slug(word):
    text = word.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def cards_from_images():
    images = [
        path
        for path in IMAGE_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTS
    ]
    images.sort(key=lambda path: path.name.lower())
    return [
        {"word": path.stem, "image": f"images/{path.name}"}
        for path in images
        if path.stem.strip()
    ]


async def synthesize(word, dest):
    import edge_tts

    communicate = edge_tts.Communicate(word, VOICE, rate=RATE)
    await communicate.save(str(dest))


async def main():
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        sys.exit("Falta edge-tts. Instálalo con: py -3 -m pip install edge-tts")

    cards = cards_from_images()
    CARDS_PATH.write_text(
        json.dumps(cards, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(cards)} tarjetas")

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    seen = set()

    for card in cards:
        if not isinstance(card, dict):
            continue
        word = str(card.get("word", "")).strip()
        name = slug(word)
        if not name or name in seen:
            continue
        seen.add(name)
        dest = AUDIO_DIR / f"{name}.mp3"
        if dest.exists() and dest.stat().st_size > 0:
            print(f"ya existe {dest.name}")
            continue
        try:
            await synthesize(word, dest)
        except Exception as error:
            print(f"No se pudo crear {dest.name}: {error}", file=sys.stderr)
            sys.exit(1)
        print(f"listo {dest.name}")


if __name__ == "__main__":
    asyncio.run(main())
