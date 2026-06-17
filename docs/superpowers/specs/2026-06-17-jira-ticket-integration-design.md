# Jira Cloud Ticket Entegrasyonu — Tasarım

**Tarih:** 2026-06-17
**Kapsam:** Telegram botundan (Edge Function) onaylı şekilde Jira Cloud'da ticket açma.

## Amaç

Telegram'a düşen bir not, tek tıkla Jira Cloud'da bir "Task" olarak açılabilsin. AI not içeriğini düzgün bir başlık + açıklamaya dönüştürsün. Not toss'ta kalmaya devam etsin; Jira'ya gönderim ek bir aksiyon olsun.

Birincil kullanım: iş görüşmesi demosu — AI'ın canlı çıktısını ve temiz bir entegrasyon akışını göstermek.

## Kararlar (özet)

| Konu | Karar |
|------|-------|
| Tetikleme | Onay ile — her notun altında "🎫 Jira'ya gönder" butonu |
| Ticket içeriği | AI yapılandırır (summary + description) |
| Hedef | Tek sabit proje + her zaman issue type "Task" |
| Buton kapsamı | Tekil notlarda var; `create_multiple` (toplu) notlarda **yok** |
| Önizleme | Yok — butona basınca direkt açılır, sonuç (ticket linki) gösterilir |
| Dil | summary/description **Türkçe** |
| toss kaydı | Korunur — Jira'ya gönderim ek aksiyon, notu silmez |

## Yapılandırma & Auth

Jira Cloud REST API'si email + API token ile Basic Auth kullanır. Mevcut secrets pattern'ine uygun olarak 4 yeni env Supabase secrets'a eklenir (koda gömülmez):

- `JIRA_BASE_URL` — `https://rudukan.atlassian.net` (sondaki `/` kodda trim edilir)
- `JIRA_EMAIL` — `kaplandu@gmail.com`
- `JIRA_API_TOKEN` — id.atlassian.com'dan üretilen token
- `JIRA_PROJECT_KEY` — `SCRUM`

Auth header: `Authorization: Basic base64(JIRA_EMAIL:JIRA_API_TOKEN)`.

Secrets şu komutla set edilir:
```
npx supabase secrets set \
  JIRA_BASE_URL="https://rudukan.atlassian.net" \
  JIRA_EMAIL="kaplandu@gmail.com" \
  JIRA_API_TOKEN="<token>" \
  JIRA_PROJECT_KEY="SCRUM"
```

> Güvenlik notu: API token bu projenin geliştirme sohbetinde düz metin paylaşıldı. Demo sonrası id.atlassian.com üzerinden revoke edilip yenisiyle değiştirilmesi önerilir (tek komutla güncellenir).

## Akış (Data Flow)

```
Telegram mesajı → classifyMessage (mevcut) → not toss'a kaydedilir
   → kayıt mesajının reply_markup'ına "🎫 Jira'ya gönder" butonu eklenir
        callback_data: jira:<note_id>

Butona basınca (callback_query, action="jira"):
   1. Not içeriğini DB'den çek (id ile)
   2. buildJiraTicket(content) → Claude Haiku → { summary, description }
   3. description'ı ADF'ye sar
   4. POST {JIRA_BASE_URL}/rest/api/3/issue
        body: { fields: { project:{key}, issuetype:{name:"Task"}, summary, description(ADF) } }
   5. Başarı → mesajı güncelle: "✅ <KEY> açıldı → <browse-url>"
   6. Hata → mesajı güncelle: "⚠️ Jira'ya gönderilemedi: <kısa sebep>" (not toss'ta durur)
   7. answerCallbackQuery ile loading kapatılır
```

Buton, tekil not kaydeden tüm dallara eklenir: `create`, `due_date`'li `create`, `needs_time`'lı `create` (text ve voice yolları). `create_multiple` dalına **eklenmez**.

Browse URL formatı: `{JIRA_BASE_URL}/browse/{issueKey}`.

## Bileşenler

### `buildJiraTicket(content: string): Promise<{ summary: string; description: string }>`

- `classifyMessage` ile aynı pattern (Claude Haiku `claude-haiku-4-5-20251001`, fetch ile Anthropic API).
- Prompt: not içeriğini al, Türkçe bir `summary` (kısa, net, tek satır) ve `description` (birkaç cümle, bağlam) üret. Sadece JSON döndür.
- Markdown code-fence temizleme mevcut `classifyMessage`'daki ile aynı (```json sarmalı + ilk `{` / son `}` arası).
- Dönen `description` düz metindir; ADF'ye çağıran taraf çevirir.

### `descriptionToADF(text: string): object`

Düz metni minimal ADF doc'a sarar:
```json
{ "type": "doc", "version": 1,
  "content": [{ "type": "paragraph",
                "content": [{ "type": "text", "text": "<text>" }] }] }
```
Claude'a ADF ürettirmek kırılgan olur; bu yüzden düz metin alınıp burada çevrilir.

### `createJiraIssue(summary, description): Promise<{ key, url } | { error }>`

- `POST {base}/rest/api/3/issue`, Basic Auth header.
- Body: `{ fields: { project: { key }, issuetype: { name: "Task" }, summary, description: descriptionToADF(description) } }`.
- 201 → `{ key, url }` döner. Hata → response body'den kısa mesaj çıkarıp `{ error }` döner.

### Callback handler (`action === "jira"`)

`index.ts` içindeki mevcut `callback_query` bloğuna yeni dal: noteId ile içeriği çeker, `buildJiraTicket` → `createJiraIssue` çağırır, `editMessageText` ile sonucu gösterir.

## Hata Yönetimi

- Jira API hata dönerse (401 auth, 400 alan, 404 proje vs.): butonlu mesaj `⚠️ Jira'ya gönderilemedi: <kısa sebep>` ile güncellenir. Not toss'ta durur, tekrar denenebilir.
- `buildJiraTicket` (Claude) hatası: fallback olarak summary = ham not içeriği, description = boş ile ticket yine de açılmaya çalışılır. Böylece AI çökse bile ticket kaybolmaz.
- Aynı nota iki kez basılırsa iki ayrı ticket açılır. Idempotency kontrolü kapsam dışı (YAGNI) — gerekirse sonra not'a `jira_issue_key` kolonu eklenir.

## Kapsam Dışı (YAGNI)

- AI'ın Bug/Story/Task ayrımı yapması (her zaman Task).
- Çoklu proje seçimi.
- Önizleme/onay ekranı (direkt açılır).
- "Zaten açıldı" idempotency kontrolü.
- Jira → toss ters senkron.

## Test / Doğrulama

- Token + proje doğruyken bir notta butona basıp gerçek SCRUM ticket'ının açıldığını ve linkin çalıştığını doğrula.
- Yanlış token ile anlaşılır hata mesajı geldiğini doğrula.
- `create_multiple` notunda buton çıkmadığını doğrula.
