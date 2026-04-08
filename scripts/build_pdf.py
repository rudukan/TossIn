"""Build a clean image-only PDF carousel for LinkedIn.

Sabit canvas boyutu (1080x1350) — LinkedIn ideal.
Görsel orijinal cozunurlukte kalir, downscale yok, upscale yok.
Buyuk gorseller: aspect korunarak fit.
Kucuk gorseller: olduklari boyutta ortalanir (upscale yok = kalip kayb yok).
"""
from PIL import Image
import os

SLIDE_W = 1080
SLIDE_H = 1350
BG = (23, 33, 43)
PADDING = 40

slides = [
    'public/slides/landing-hero.png',
    'public/slides/landing-features.png',
    'public/slides/telegram.png',
    'public/slides/toss-in-v3xp.vercel.app_ (1).png',
    'public/slides/toss-in-v3xp.vercel.app_.png',
]

pages = []

for path in slides:
    if not os.path.exists(path):
        print(f'MISSING: {path}')
        continue

    img = Image.open(path).convert('RGB')
    iw, ih = img.size
    avail_w = SLIDE_W - PADDING * 2
    avail_h = SLIDE_H - PADDING * 2

    # Yalnizca buyukse kucult, kucukse oldugu boyutta birak
    if iw > avail_w or ih > avail_h:
        ratio = min(avail_w / iw, avail_h / ih)
        new_w = int(iw * ratio)
        new_h = int(ih * ratio)
        resized = img.resize((new_w, new_h), Image.LANCZOS)
    else:
        new_w, new_h = iw, ih
        resized = img

    slide = Image.new('RGB', (SLIDE_W, SLIDE_H), BG)
    x = (SLIDE_W - new_w) // 2
    y = (SLIDE_H - new_h) // 2
    slide.paste(resized, (x, y))

    pages.append(slide)
    print(f'  {os.path.basename(path)}: {iw}x{ih} -> placed at {new_w}x{new_h}')

if not pages:
    raise SystemExit('No slides!')

out_path = 'public/TossIn_Carousel.pdf'
pages[0].save(
    out_path,
    save_all=True,
    append_images=pages[1:],
    format='PDF',
    resolution=300.0,
)

print(f'\nDone: {out_path}')
print(f'Pages: {len(pages)}')
