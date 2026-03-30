# Telegram Bot — Phase 2 + 2.5 Design Spec

> Telegram'dan not yakala + mevcut notları akıllı tamamla

## Overview

Supabase Edge Function olarak çalışan bir Telegram webhook handler. Kullanıcı tossinBot'a mesaj attığında:

- **Text mesaj** → Claude API ile sınıflandır (yeni not / mevcut not tamamlama)
- **Ses mesajı** → Groq Whisper ile transcribe → Claude API ile temizle + sınıflandır
- **Confirmation callback** → Inline keyboard yanıtını işle

Tek kullanıcı. Tek Edge Function. Mevcut DB şeması yeterli.

## Architecture

```
Telegram (tossinBot)
    │
    ▼
Supabase Edge Function: telegram-webhook
    │
    ├─ message.text ──────────────────────┐
    │                                     │
    ├─ message.voice ─► Groq Whisper ─► transcript
    │                                     │
    │                                     ▼
    │                              Claude API (Haiku)
    │                    Input: mesaj + açık notlar (inbox/actionable)
    │                    Output: { action, matched_note_id?, confidence?, content? }
    │                                     │
    │                    ┌────────────────┼────────────────┐
    │                    ▼                ▼                ▼
    │              complete          complete          create
    │           confidence>0.8    confidence<0.8
    │                    │                │                │
    │               notu done        inline keyboard   inbox'a kaydet
    │             "✓ tamamlandı"    "Bunu mu?"         "✓ kaydedildi"
    │
    └─ callback_query
         ├─ confirm:UUID → notu done yap
         └─ reject:UUID → inbox'a yeni not kaydet
```

## Edge Function: `telegram-webhook`

**Runtime:** Deno (Supabase Edge Functions)
**Path:** `supabase/functions/telegram-webhook/index.ts`
**Single file** — ayrı modüllere bölmeye gerek yok.

### Request handling

Telegram webhook 3 tür update gönderir:

| Update türü | Tetikleyici | İşlem |
|-------------|-------------|-------|
| `message.text` | Kullanıcı text yazar | Claude'a gönder |
| `message.voice` | Kullanıcı ses kaydı gönderir | Whisper → Claude |
| `callback_query` | Inline button tıklanır | Notu tamamla veya yeni not oluştur |

### Güvenlik

- `TELEGRAM_OWNER_CHAT_ID` ile sadece tek kullanıcıdan gelen mesajlar işlenir
- Eşleşmeyen chat_id → sessizce ignore (yanıt yok)
- Webhook secret: Telegram `X-Telegram-Bot-Api-Secret-Token` header'ı ile doğrulama

### Multi-user geçiş notu

Şimdi `TELEGRAM_OWNER_CHAT_ID` env var ile tek kullanıcı. İleride multi-user gerekirse:
1. `user_integrations` tablosu oluştur (plan.md'deki şema)
2. Chat ID kontrolünü DB lookup'a çevir
3. Bitti — mimari değişikliği yok

## Ses Mesajı Pipeline

```
1. Telegram voice message (OGG/Opus format)
2. getFile API → dosya URL'i al
3. fetch ile dosyayı indir
4. Groq Whisper API'ye gönder (model: whisper-large-v3, language: tr)
5. Ham transcript → Claude API'ye gönder (temizleme + sınıflandırma birlikte)
```

Claude ses transcript'ini hem temizler ("eee şey elektrik faturası ödedim bugün" → "Elektrik faturası ödendi") hem de aynı prompt'ta eşleştirme kararını verir.

## Claude API Entegrasyonu

**Model:** claude-haiku-4-5-20251001 (hızlı, ucuz, yeterli)

### Prompt yapısı

```
Sen bir not asistanısın. Kullanıcının mesajını analiz et.

Kullanıcının açık notları:
{{notes listesi — id + content}}

Gelen mesaj: "{{mesaj}}"

Görev:
1. Bu mesaj mevcut bir notu tamamlıyor mu, yoksa yeni bir not mu?
2. Eğer ses kaydından geldiyse, metni düzgün bir cümleye dönüştür.

JSON döndür (başka bir şey yazma):
{ "action": "complete", "matched_note_id": "uuid", "confidence": 0.95 }
veya
{ "action": "create", "content": "temizlenmiş not metni" }
```

### Açık notları çekme

DB'den `type IN ('inbox', 'actionable')` olan notları çek. `done` ve `reference` notlar eşleştirmeye dahil değil.

### Sınıflandırma kararları

| Claude output | Koşul | Aksiyon |
|---------------|-------|---------|
| `action: "complete"` | `confidence >= 0.8` | Notu `type = 'done'` yap, `updated_at = now()` |
| `action: "complete"` | `confidence < 0.8` | Telegram inline keyboard ile onayla |
| `action: "create"` | — | Yeni not: `type = 'inbox'`, `source = 'telegram'` veya `'voice'` |

## Telegram Yanıtları

### Başarılı tamamlama (confidence >= 0.8)
```
✓ "elektrik faturasını öde" tamamlandı
```

### Belirsiz eşleşme (confidence < 0.8)
```
Bunu mu tamamladın?

[elektrik faturasını öde]

[Evet ✓]  [Hayır, yeni not]
```

Inline keyboard callback data:
- Evet: `confirm:<note_id>`
- Hayır: `reject:<note_id>`

Reject durumunda orijinal mesaj metni, kullanıcının yazdığı Telegram mesajından alınır (reply_to_message veya mesaj zincirinden). Edge Function, confirmation mesajı gönderirken orijinal metni reply olarak gönderir — böylece reject'te geri çekilebilir.

### Yeni not kaydedildi
```
✓ kaydedildi
```

### Ses mesajı kaydedildi
```
🎤 "temizlenmiş transcript" — kaydedildi
```

### Ses mesajı tamamlama
```
🎤 ✓ "elektrik faturasını öde" tamamlandı
```

## Callback Query Handler

Inline button tıklandığında:

| Callback data | Aksiyon |
|---------------|---------|
| `confirm:<note_id>` | Notu `done` yap, mesajı güncelle: `✓ tamamlandı` |
| `reject:<note_id>` | Orijinal mesajı inbox'a kaydet, mesajı güncelle: `✓ yeni not olarak kaydedildi` |

Callback sonrası `answerCallbackQuery` çağrılır (Telegram'ın "loading" göstergesini kapatmak için).
Orijinal mesaj `editMessageText` ile güncellenir (butonlar kaybolur).

## Secrets

| Secret | Kullanım |
|--------|----------|
| `TELEGRAM_BOT_TOKEN` | Telegram API çağrıları (sendMessage, getFile, answerCallbackQuery) |
| `TELEGRAM_OWNER_CHAT_ID` | Tek kullanıcı doğrulama |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook header doğrulama |
| `ANTHROPIC_API_KEY` | Claude API (sınıflandırma) |
| `GROQ_API_KEY` | Groq Whisper API (ses transcription) |
| `SUPABASE_SERVICE_ROLE_KEY` | DB erişimi (RLS bypass) — zaten mevcut |

## DB Değişiklikleri

**Yok.** Mevcut `notes` tablosu yeterli:
- `source = 'telegram'` — text mesajdan gelen not
- `source = 'voice'` — ses mesajından gelen not
- `type = 'done'` — tamamlanan not

## Error Handling

| Hata | Davranış |
|------|----------|
| Groq Whisper başarısız | Telegram'a "Ses işlenemedi, tekrar dene" mesajı |
| Claude API başarısız | Mesajı olduğu gibi inbox'a kaydet (fallback), "kaydedildi (sınıflandırma yapılamadı)" |
| DB hatası | Telegram'a "Bir hata oluştu" mesajı |
| Boş ses / çok kısa | "Ses kaydı çok kısa, tekrar dene" |

## Gelecek Fikirler (Phase 2.5b)

- **Çoklu not oluşturma:** ✅ Tamamlandı — max 7 not, text + ses destekli
- **Telegram'dan sorgulama:** "Bugün ne yapmam lazım?" → açık notları listele, aciliyete göre sırala. Claude'a `action: "query"` eklenir.
- **Deadline/tarih çıkarma:** "yarın akşam annemi ara" → `due_date` kolonu + hatırlatma sistemi. DB migration gerekir.
- **Hatırlatma push:** Due date yaklaşınca Telegram'dan push notification

## Scope Dışı (Bilinçli)

- Multi-user desteği
- Grup chat desteği (sadece private mesaj)
- Medya/fotoğraf/dosya desteği
- Telegram inline mode (@tossinBot ile başka chat'lerden)
- Mevcut notları düzenleme (sadece tamamlama — done'a çekme)
- Rate limiting (tek kullanıcı, gerek yok)
