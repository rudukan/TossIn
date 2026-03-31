# Security

## Secret Management

- API key'ler **asla** kodda hardcode edilmez
- Web app secret'ları: `.env.local` (gitignored)
- Edge Function secret'ları: `npx supabase secrets set KEY=VALUE`
- Secret listesi: `.env.example` dosyasına bakın

## Webhook Security

- Telegram webhook'u `X-Telegram-Bot-Api-Secret-Token` header'ı ile doğrulanır
- Eşleşmeyen secret → 401 Unauthorized
- Edge Function JWT doğrulaması kapalı (`--no-verify-jwt`) — Telegram kendi doğrulamasını kullanır

## Access Control

- `TELEGRAM_OWNER_CHAT_ID` ile sadece tek kullanıcıdan gelen mesajlar işlenir
- Eşleşmeyen chat ID → sessizce ignore edilir (yanıt yok)
- Supabase RLS şu an devre dışı (geliştirme aşaması) — auth eklenince aktif edilecek

## API Key Rotation

Bir key sızdığında:
1. İlgili serviste yeni key oluştur
2. `npx supabase secrets set KEY=NEW_VALUE`
3. `npx supabase functions deploy telegram-webhook --no-verify-jwt`
4. Eski key'i revoke et

## Reporting

Güvenlik açığı bulursanız: GitHub Issues (private repo)
