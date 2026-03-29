# toss — Proje Planı

> Aklına geleni at. Sonra unutma.
> Toss it. Review it. Keep it.

---

## Problem

Aklına bir şey geliyor, bir yere yazıyorsun, sonra o not ya kayboluyor ya da bir yığının içinde çürüyor. Sorun not almak değil — aldığın nota geri dönememek.

## Çözüm

Çok hızlı not yakalama + notları tekrar önüne getiren review sistemi. Web, Telegram (text + ses) üzerinden capture. Tek bir inbox'a düşer, oradan işlenir.

---

## Mimari

```
[Web App (Next.js)]
        ↓
   Supabase (DB + Auth + Edge Functions)
        ↑
[Telegram Bot (Edge Function)]
        ↑
   Ses → Whisper/Groq → Text
```

## Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| Telegram Bot | Supabase Edge Function (Deno) |
| Ses → Text | Groq Whisper API (hızlı + ucuz) |
| Hosting | Vercel |
| PWA | next-pwa (mobilde app hissi) |

## Veri Modeli

```sql
-- notes tablosu
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  content text not null,
  type text default 'inbox' check (type in ('inbox', 'actionable', 'reference', 'done')),
  tags text[] default '{}',
  is_starred boolean default false,
  source text default 'web' check (source in ('web', 'telegram', 'voice')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table notes enable row level security;

create policy "Users see own notes"
  on notes for all
  using (auth.uid() = user_id);

-- Index
create index idx_notes_user_type on notes(user_id, type);
create index idx_notes_tags on notes using gin(tags);
create index idx_notes_content on notes using gin(to_tsvector('turkish', content));
```

### Type Sistemi (3 tip, fazlası gereksiz)

| Type | Anlam | Akış |
|------|-------|------|
| `inbox` | Ham, işlenmemiş | Yeni her not buraya düşer |
| `actionable` | Yapılacak bir şey var | Review'da seçilir |
| `reference` | Sakla, geri dön | Review'da seçilir |
| `done` | Bitti / artık gerekli değil | Kapanış |

### Source Tracking

Her notun nereden geldiğini biliyoruz: `web`, `telegram`, `voice`. Analytics için lazım olacak — hangi kanaldan daha çok capture yapıyorsun?

---

## Ekranlar (3 ekran + sabit capture bar)

### Sabit: Capture Bar
- Her ekranın üstünde
- Tek input, Enter ile kaydet
- 2 saniyede not al, kategorize etme

### 1. Inbox
- `type = 'inbox'` olan notlar
- Swipe veya tıkla ile type değiştir
- Tag ekle
- 5+ not birikince nudge badge

### 2. Board
- `actionable` ve `reference` notları göster
- Tag'e göre filtrele
- Starred önce

### 3. Search
- Full-text arama (Postgres `to_tsvector`)
- Tag'e tıkla → filtrele
- Tüm type'lar dahil

---

## Fazlar

### Phase 1 — Çekirdek (1-2 hafta)
> Hedef: Kendim her gün kullanıyorum

- [ ] Next.js proje setup (App Router + Tailwind)
- [ ] Supabase Auth (magic link veya Google)
- [ ] Notes CRUD (Supabase client)
- [ ] Capture bar (sabit, her sayfada)
- [ ] Inbox ekranı (listele, type değiştir, tag ekle)
- [ ] Board ekranı (actionable + reference)
- [ ] Search (full-text + tag filter)
- [ ] Star/unstar
- [ ] Nudge sistemi (inbox 5+ → badge)
- [ ] PWA config (mobilde home screen'e ekle)
- [ ] Vercel'e deploy

### Phase 2 — Telegram (3-5 gün)
> Hedef: Telefondan Telegram'a yazınca inbox'a düşsün

- [ ] Telegram Bot oluştur (@BotFather)
- [ ] Supabase Edge Function: webhook handler
- [ ] Text mesaj → notes tablosuna insert (source: 'telegram')
- [ ] Ses mesajı → Groq Whisper API → text → insert (source: 'voice')
- [ ] Telegram'dan onay mesajı: "✓ kaydedildi"
- [ ] User matching (telegram_id ↔ supabase user_id)

```
-- user_integrations tablosu
create table user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  platform text not null, -- 'telegram'
  platform_user_id text not null,
  created_at timestamptz default now(),
  unique(platform, platform_user_id)
);
```

### Phase 3 — Disiplin Katmanı (1 hafta)
> Hedef: Uygulama seni geri çağırıyor

- [ ] Review nudge: inbox'ta 3+ gün duran notlar için uyarı
- [ ] Günlük özet: "bugün 4 not aldın, 7 hala inbox'ta"
- [ ] Telegram üzerinden günlük push: "inbox'ta X not var"
- [ ] Keyboard shortcuts (n: yeni not, /: search, 1-2-3: type değiştir)
- [ ] Dark/light mode toggle

### Phase 4 — Güçlendirme (sonra)
> Hedef: Ürün karakter kazanıyor

- [ ] AI tag önerisi (not içeriğinden)
- [ ] Benzer notları grupla
- [ ] Haftalık review summary
- [ ] Telegram inline mode (herhangi bir chat'ten @bot ile not al)
- [ ] Chrome extension (web'den hızlı capture)
- [ ] Dışa aktarma (markdown / JSON)

---

## Yapılmayacaklar (Bilinçli Kararlar)

- ❌ Sosyal özellikler
- ❌ Markdown editör
- ❌ Karmaşık taxonomy / klasörler
- ❌ Takvim senkronizasyonu
- ❌ Team collaboration
- ❌ Notion-vari blok sistemi
- ❌ Önceden tanımlı sabit etiketler

Ürünün gücü sadelikte. Karmaşıklık öldürür.

---

## Dosya Yapısı (Phase 1)

```
toss/
├── app/
│   ├── layout.tsx          # Root layout + Supabase provider
│   ├── page.tsx            # Ana sayfa → Inbox
│   ├── board/
│   │   └── page.tsx        # Actionable + Reference
│   ├── search/
│   │   └── page.tsx        # Arama
│   ├── login/
│   │   └── page.tsx        # Auth
│   └── api/
│       └── telegram/
│           └── route.ts    # Telegram webhook (Phase 2)
├── components/
│   ├── CaptureBar.tsx      # Sabit input
│   ├── NoteCard.tsx        # Not kartı
│   ├── NavBar.tsx          # Alt navigasyon
│   ├── NudgeBanner.tsx     # Inbox uyarısı
│   └── TagPill.tsx         # Etiket componenti
├── lib/
│   ├── supabase.ts         # Client init
│   ├── types.ts            # TypeScript tipleri
│   └── hooks/
│       ├── useNotes.ts     # Notes CRUD hook
│       └── useAuth.ts      # Auth hook
├── public/
│   └── manifest.json       # PWA manifest
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## Başarı Kriterleri

Phase 1 tamamlandığında şu soruyu sor:
**"Son 3 gündür her gün kullandım mı?"**

Evet → Phase 2'ye geç
Hayır → UX'te bir şey yanlış, düzelt

---

## Notlar

- Offline-first sonra düşünülecek. Supabase realtime zaten hızlı, önce online çalışsın.
- Telegram bot'u ayrı bir repo'ya koymak yerine Edge Function olarak Supabase içinde yaşasın. Tek yönetim noktası.
- Groq Whisper API seçimi: OpenAI Whisper'dan ~10x hızlı, ücretsiz tier var, Türkçe destekliyor.
