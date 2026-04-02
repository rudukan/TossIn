# Board Sadeleştirme + Due Date & Hatırlatma Spec

> Board kolonlarını sadeleştir, due_date desteği ekle, Telegram'dan board yönetimi + hatırlatma sistemi

## Overview

İki bağlantılı değişiklik:
1. **Board sadeleştirme:** `actionable`→`in_progress`, `reference`→`waiting`. 4 kolon korunur ama anlam değişir.
2. **Due date + hatırlatma:** Notlara tarih/saat ekle, 15 dk önce Telegram push, cevap gelmezse beklemede'ye al.

## 1. Data Model Değişikliği

### Type değişikliği

| Eski | Yeni | Anlam |
|------|------|-------|
| `inbox` | `inbox` | Yeni, işlenmemiş |
| `actionable` | `in_progress` | Üzerinde çalışılıyor |
| `reference` | `waiting` | Beklemede (ertelendi, başkasını bekliyor) |
| `done` | `done` | Tamamlandı |

### Migration SQL

```sql
ALTER TABLE notes DROP CONSTRAINT notes_type_check;
ALTER TABLE notes ADD CONSTRAINT notes_type_check 
  CHECK (type IN ('inbox', 'in_progress', 'waiting', 'done'));

UPDATE notes SET type = 'in_progress' WHERE type = 'actionable';
UPDATE notes SET type = 'waiting' WHERE type = 'reference';

ALTER TABLE notes ADD COLUMN due_date TIMESTAMPTZ;
ALTER TABLE notes ADD COLUMN reminded BOOLEAN DEFAULT false;
ALTER TABLE notes ADD COLUMN reminded_at TIMESTAMPTZ;
```

### TypeScript type

```typescript
type NoteType = 'inbox' | 'in_progress' | 'waiting' | 'done'
```

### Note interface güncellemesi

```typescript
interface Note {
  id: string
  user_id: string
  content: string
  type: NoteType
  tags: string[]
  is_starred: boolean
  source: NoteSource
  due_date: string | null
  reminded: boolean
  reminded_at: string | null
  created_at: string
  updated_at: string
}
```

## 2. Board UI Değişikliği

### Kolonlar

```typescript
const columns = [
  { id: 'inbox', label: 'Inbox', color: 'text-blue-400' },
  { id: 'in_progress', label: 'Yapılıyor', color: 'text-orange-400' },
  { id: 'waiting', label: 'Beklemede', color: 'text-purple-400' },
  { id: 'done', label: 'Bitti', color: 'text-green-400' },
]
```

### Not kartlarında due_date gösterimi

Due date olan notlarda tarih/saat gösterilir:
- `⏰ Yarın 15:00` — gelecekte
- `🔴 Bugün 15:00` — bugün
- `⚠️ Dün 15:00` — geçmiş (kaçırılmış)

## 3. Claude Prompt Güncellemesi

### Yeni action'lar

Mevcut action'lara (`complete`, `create`, `create_multiple`) ek olarak:

#### move — board geçişi
```json
{ "action": "move", "matched_note_id": "uuid", "target_type": "in_progress", "confidence": 0.95 }
```

Örnekler:
- "doktora git'e başlıyorum" → `move` → `in_progress`
- "kargoyu erteledim" → `move` → `waiting`
- "beklemedeki market'i yapıyorum" → `move` → `in_progress`

#### query — not sorgulama
```json
{ "action": "query", "query_type": "today" | "waiting" | "in_progress" | "all_open" }
```

Örnekler:
- "bugün ne var?" → `query` → `today` (due_date bugün olan + tüm in_progress)
- "beklemedekiler ne?" → `query` → `waiting`
- "ne yapıyorum?" → `query` → `in_progress`

#### create + due_date
```json
{ "action": "create", "content": "doktora git", "due_date": "2026-04-03T15:00:00" }
```

Claude tarih/saat bilgisi çıkarır:
- "yarın 3'te doktora git" → `due_date: "2026-04-03T15:00:00"`
- "market alışverişi" → `due_date: null`
- "cuma fatura öde" → `due_date: "2026-04-04"` (saat yok → `needs_time: true`)

### Saatsiz due_date — kullanıcıya sor

```json
{ "action": "create", "content": "fatura öde", "due_date": "2026-04-04", "needs_time": true }
```

Bot yanıtı:
```
✓ kaydedildi (📅 Cuma)
Saat kaçta hatırlatayım?
[09:00] [12:00] [15:00] [Hatırlatma istemiyorum]
```

Callback data: `settime:<note_id>:<HH:MM>` veya `noreminder:<note_id>`

- Kullanıcı saat seçer → due_date güncellenir
- "Hatırlatma istemiyorum" → due_date kalır ama hatırlatma yapılmaz (reminded = true olarak işaretlenir)

## 4. Telegram Yanıt Mesajları

### Board geçişi
```
📋 "doktora git" → Yapılıyor
```
```
⏸ "kargo takip" → Beklemede
```

### Due date ile kayıt
```
✓ kaydedildi (⏰ Yarın 15:00)
```

### Query yanıtı
```
📋 Bugünkü notların:
  ⏰ 15:00 — doktora git
  • market alışverişi
  • fatura öde

⏸ Beklemede:
  • kargo takip
```

### Hatırlatma
```
⏰ "doktora git" — 15 dakika kaldı!

[Tamamladım ✓]  [Ertele 1 saat]
```

## 5. Hatırlatma Sistemi

### Yeni Edge Function: `reminder-cron`

**Tetikleme:** Supabase cron, her 1 dakika.

**Akış:**
```
1. SELECT * FROM notes 
   WHERE due_date - interval '15 min' <= now() 
   AND reminded = false 
   AND type != 'done'

2. Her not için:
   - Telegram push: "⏰ ... 15 dakika kaldı!"
   - UPDATE reminded = true, reminded_at = now()

3. Cevapsız hatırlatma kontrolü:
   SELECT * FROM notes
   WHERE reminded = true
   AND reminded_at + interval '30 min' <= now()
   AND type NOT IN ('done', 'waiting')
   
4. Cevapsız notları waiting'e al:
   - UPDATE type = 'waiting'
   - Telegram push: "⏸ ... beklemede'ye alındı"
```

### Hatırlatma buton aksiyonları

| Callback | Aksiyon |
|----------|---------|
| `reminder_done:<note_id>` | Notu `done` yap |
| `reminder_snooze:<note_id>` | `due_date += 1 saat`, `reminded = false`, `reminded_at = null` |

### Saat seçimi buton aksiyonları

| Callback | Aksiyon |
|----------|---------|
| `settime:<note_id>:<HH:MM>` | `due_date` tarihine saat ekle |
| `noreminder:<note_id>` | `reminded = true` yap (hatırlatma atlanır) |

## 6. Callback Query Handler Güncellemesi

Mevcut `telegram-webhook` Edge Function'ına yeni callback'ler eklenir:

| Prefix | Aksiyon |
|--------|---------|
| `confirm:` | Mevcut — notu done yap |
| `reject:` | Mevcut — yeni not oluştur |
| `reminder_done:` | Yeni — hatırlatmadan done |
| `reminder_snooze:` | Yeni — 1 saat ertele |
| `settime:` | Yeni — due_date'e saat ekle |
| `noreminder:` | Yeni — hatırlatma iptal |

## 7. Cron Setup

```sql
SELECT cron.schedule(
  'check-reminders',
  '* * * * *',
  $$SELECT net.http_post(
    'https://fuctxjzkddlmwdqtzoiz.supabase.co/functions/v1/reminder-cron',
    '{}',
    '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'
  )$$
);
```

Alternatif: `pg_cron` doğrudan SQL çalıştırır, Edge Function'a gerek kalmaz. Ama Telegram API çağrısı için Edge Function daha uygun.

`reminder-cron` mevcut secret'ları kullanır: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Ek secret gerekmez.

## 8. Etkilenen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/lib/types.ts` | NoteType güncelle, Note interface'e due_date/reminded ekle |
| `src/components/KanbanBoard.tsx` | Kolon isimleri güncelle, due_date göster |
| `src/app/page.tsx` | Type filtre güncelle (inbox) |
| `src/app/board/page.tsx` | Type filtre güncelle |
| `src/lib/hooks/useNotes.ts` | Type filtre güncelle |
| `supabase/functions/telegram-webhook/index.ts` | Prompt, yeni action'lar, callback'ler |
| `supabase/functions/reminder-cron/index.ts` | Yeni — hatırlatma Edge Function |

## 9. Error Handling

| Hata | Davranış |
|------|----------|
| Claude due_date parse edemez | Tarihsiz not olarak kaydet |
| Cron Telegram push başarısız | Log, bir sonraki döngüde tekrar dene (reminded = false kalır) |
| Geçmiş tarihli due_date | Hemen hatırlat, beklemeden |

## 10. Scope Dışı

- Recurring hatırlatma ("her pazartesi")
- Akıllı reminder_offset (Claude'un görev tipine göre öncelik belirlemesi)
- Takvim entegrasyonu
- Çoklu hatırlatma (5 dk, 15 dk, 1 saat önce)
