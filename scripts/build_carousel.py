"""Build LinkedIn carousel PPTX from screenshots."""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from PIL import Image
import os

prs = Presentation()
prs.slide_width = Inches(10)
prs.slide_height = Inches(10)

NAVY = RGBColor(23, 33, 43)
SURFACE = RGBColor(35, 46, 60)
BLUE = RGBColor(42, 171, 238)
WHITE = RGBColor(255, 255, 255)
MUTED = RGBColor(112, 132, 153)


def set_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_title(slide, text, size=20, top=0.5, color=WHITE, bold=True, align_center=False):
    box = slide.shapes.add_textbox(Inches(0.6), Inches(top), Inches(8.8), Inches(0.7))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = 'Inter'
    if align_center:
        p.alignment = PP_ALIGN.CENTER


def add_subtitle(slide, text, size=11, top=1.2, color=MUTED, align_center=False):
    box = slide.shapes.add_textbox(Inches(0.6), Inches(top), Inches(8.8), Inches(0.5))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.name = 'Inter'
    if align_center:
        p.alignment = PP_ALIGN.CENTER


def add_image_centered(slide, image_path, top_inches=1.7, max_h_inches=7.6):
    if not os.path.exists(image_path):
        print(f'MISSING: {image_path}')
        return
    img = Image.open(image_path)
    iw, ih = img.size
    ratio = iw / ih
    max_w_inches = 8.8
    w = max_w_inches
    h = w / ratio
    if h > max_h_inches:
        h = max_h_inches
        w = h * ratio
    left = (10 - w) / 2
    slide.shapes.add_picture(image_path, Inches(left), Inches(top_inches), Inches(w), Inches(h))


# ─── SLIDE 1 — COVER ───
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, NAVY)

box = slide.shapes.add_textbox(Inches(0.6), Inches(3.5), Inches(8.8), Inches(2))
tf = box.text_frame
p = tf.paragraphs[0]
p.text = 'Toss'
p.font.size = Pt(96)
p.font.bold = True
p.font.color.rgb = WHITE
p.font.name = 'Inter'
p.alignment = PP_ALIGN.CENTER
run2 = p.add_run()
run2.text = 'In'
run2.font.size = Pt(96)
run2.font.bold = True
run2.font.color.rgb = BLUE
run2.font.name = 'Inter'

add_subtitle(slide, 'AI task agent', size=20, top=5.5, color=BLUE, align_center=True)
add_subtitle(slide, "Telegram'a sesli veya yazili mesaj at. AI gerisini halleder.", size=14, top=6.2, color=MUTED, align_center=True)
add_subtitle(slide, 'capture  >  understand  >  reconcile  >  remind  >  close', size=11, top=7.0, color=BLUE, align_center=True)


# ─── SLIDE 2 — PROBLEM ───
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, NAVY)
add_subtitle(slide, 'PROBLEM', size=11, top=0.6, color=BLUE)

box = slide.shapes.add_textbox(Inches(0.6), Inches(3.5), Inches(8.8), Inches(3))
tf = box.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = 'Dusunce ile kayit arasindaki surtunme verimliligi oldurur.'
p.font.size = Pt(28)
p.font.bold = True
p.font.color.rgb = WHITE
p.font.name = 'Inter'

p2 = tf.add_paragraph()
p2.text = ''
p3 = tf.add_paragraph()
p3.text = 'Araba sururken, toplantidan cikarken, yururken — bir formu doldurmakla ugrasamazsiniz.'
p3.font.size = Pt(16)
p3.font.color.rgb = MUTED
p3.font.name = 'Inter'


# ─── SLIDE 3 — LANDING HERO ───
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, NAVY)
add_title(slide, 'TossIn', size=22, top=0.5, color=WHITE)
add_subtitle(slide, 'AI-powered personal execution assistant', top=1.0, color=BLUE)
add_image_centered(slide, 'public/slides/landing-hero.png', top_inches=1.8)


# ─── SLIDE 4 — KILIT OZELLIK ───
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, NAVY)
add_subtitle(slide, 'KILIT OZELLIK', size=11, top=0.6, color=BLUE)

box = slide.shapes.add_textbox(Inches(0.6), Inches(1.2), Inches(8.8), Inches(1))
tf = box.text_frame
p = tf.paragraphs[0]
p.text = 'Semantic Task Reconciliation'
p.font.size = Pt(28)
p.font.bold = True
p.font.color.rgb = WHITE
p.font.name = 'Inter'

box = slide.shapes.add_textbox(Inches(0.6), Inches(2.5), Inches(8.8), Inches(7))
tf = box.text_frame
tf.word_wrap = True

lines = [
    ("Diger todo app'lerden farki:", WHITE, 14, False),
    ('onlar not alir, bu yonetir.', BLUE, 16, True),
    ('', WHITE, 8, False),
    ("Telegram'a 'fatura odendi' yaziyorsun", MUTED, 13, False),
    ('  > AI niyetini analiz ediyor', MUTED, 13, False),
    ('  > Mevcut gorevlerini tariyor', MUTED, 13, False),
    ("  > 'fatura ode' notunu bulup DONE'a cekiyor", BLUE, 13, True),
    ('', WHITE, 8, False),
    ('Belirsizlik varsa inline keyboard ile dogrulama soruyor.', MUTED, 13, False),
    ('Koru korune islemiyor.', MUTED, 13, False),
    ('', WHITE, 8, False),
    ('Capture degil — reconciliation.', WHITE, 16, True),
]

for i, (text, color, size, bold) in enumerate(lines):
    if i == 0:
        p = tf.paragraphs[0]
    else:
        p = tf.add_paragraph()
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = 'Inter'
    p.space_after = Pt(2)


# ─── SLIDE 5 — TELEGRAM ───
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, NAVY)
add_title(slide, "Telegram'dan akilli komutlar", size=20, top=0.5)
add_subtitle(slide, 'Ses & metin > Whisper > Claude > state update', top=1.05)
add_image_centered(slide, 'public/slides/telegram.png', top_inches=1.8)


# ─── SLIDE 6 — FEATURES ───
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, NAVY)
add_title(slide, 'Ne yapiyor?', size=20, top=0.5)
add_subtitle(slide, "Telegram'a yaz. AI analiz etsin. Dogru aksiyonu alsin.", top=1.05)
add_image_centered(slide, 'public/slides/landing-features.png', top_inches=1.8)


# ─── SLIDE 7 — BOARD ───
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, NAVY)
add_title(slide, 'Kanban Board', size=20, top=0.5)
add_subtitle(slide, 'Inbox  >  Yapiliyor  >  Beklemede  >  Bitti — real-time sync', top=1.05)
add_image_centered(slide, 'public/slides/toss-in-v3xp.vercel.app_ (1).png', top_inches=1.8)


# ─── SLIDE 8 — INBOX ───
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, NAVY)
add_title(slide, 'Inbox', size=20, top=0.5)
add_subtitle(slide, 'Etiketler, due dates, overdue tracking', top=1.05)
add_image_centered(slide, 'public/slides/toss-in-v3xp.vercel.app_.png', top_inches=1.8)


# ─── SLIDE 9 — STACK ───
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, NAVY)
add_subtitle(slide, 'STACK', size=11, top=0.6, color=BLUE)

box = slide.shapes.add_textbox(Inches(0.6), Inches(1.2), Inches(8.8), Inches(1))
tf = box.text_frame
p = tf.paragraphs[0]
p.text = 'Modern, ucuz, hizli'
p.font.size = Pt(28)
p.font.bold = True
p.font.color.rgb = WHITE
p.font.name = 'Inter'

stack_items = [
    ('CAPTURE', 'Telegram Bot API'),
    ('TRANSCRIBE', 'Groq Whisper'),
    ('CLASSIFY', 'Claude Haiku 4.5'),
    ('STORE', 'Supabase Postgres'),
    ('REMIND', 'pg_cron + Edge Functions'),
    ('DEPLOY', 'Vercel + Next.js 16'),
]

for i, (label, value) in enumerate(stack_items):
    row = i // 2
    col = i % 2
    left = Inches(0.6 + col * 4.5)
    top = Inches(2.7 + row * 1.6)

    box = slide.shapes.add_textbox(left, top, Inches(4.2), Inches(0.4))
    tf = box.text_frame
    p = tf.paragraphs[0]
    p.text = label
    p.font.size = Pt(10)
    p.font.color.rgb = MUTED
    p.font.bold = True
    p.font.name = 'Inter'

    box = slide.shapes.add_textbox(left, top + Inches(0.35), Inches(4.2), Inches(0.5))
    tf = box.text_frame
    p = tf.paragraphs[0]
    p.text = value
    p.font.size = Pt(18)
    p.font.color.rgb = WHITE
    p.font.bold = True
    p.font.name = 'Inter'

box = slide.shapes.add_textbox(Inches(0.6), Inches(8.4), Inches(8.8), Inches(1))
tf = box.text_frame
p = tf.paragraphs[0]
p.text = 'Aylik maliyet'
p.font.size = Pt(11)
p.font.color.rgb = MUTED
p.font.name = 'Inter'
p.alignment = PP_ALIGN.CENTER

p2 = tf.add_paragraph()
p2.text = '< $1'
p2.font.size = Pt(28)
p2.font.color.rgb = BLUE
p2.font.bold = True
p2.font.name = 'Inter'
p2.alignment = PP_ALIGN.CENTER


# ─── SLIDE 10 — CTA ───
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, NAVY)

box = slide.shapes.add_textbox(Inches(0.6), Inches(3.5), Inches(8.8), Inches(2))
tf = box.text_frame
p = tf.paragraphs[0]
p.text = 'Erken erisim'
p.font.size = Pt(48)
p.font.bold = True
p.font.color.rgb = WHITE
p.font.name = 'Inter'
p.alignment = PP_ALIGN.CENTER

box = slide.shapes.add_textbox(Inches(0.6), Inches(5.2), Inches(8.8), Inches(2))
tf = box.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = 'Su an sadece ben kullaniyorum.'
p.font.size = Pt(16)
p.font.color.rgb = MUTED
p.font.name = 'Inter'
p.alignment = PP_ALIGN.CENTER

p2 = tf.add_paragraph()
p2.text = 'Ilgilenen olursa DM atsin.'
p2.font.size = Pt(16)
p2.font.color.rgb = BLUE
p2.font.name = 'Inter'
p2.alignment = PP_ALIGN.CENTER

box = slide.shapes.add_textbox(Inches(0.6), Inches(8.5), Inches(8.8), Inches(0.5))
tf = box.text_frame
p = tf.paragraphs[0]
p.text = 'github.com/rudukan/TossIn'
p.font.size = Pt(12)
p.font.color.rgb = MUTED
p.font.name = 'Inter'
p.alignment = PP_ALIGN.CENTER


prs.save('public/TossIn_Carousel.pptx')
print(f'Done: public/TossIn_Carousel.pptx')
print(f'Slide count: {len(prs.slides)}')
