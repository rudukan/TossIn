'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const features = [
  {
    title: 'Semantic task reconciliation',
    user: '"auth PR\'ı merge edildi"',
    bot: '✓ "auth modülünü bitir" tamamlandı',
    description: 'Mesajını mevcut görevlerinle eşleştirir ve durumu günceller. CRUD değil, context-aware execution.',
  },
  {
    title: 'Akıllı tarih & hatırlatma',
    user: '"yarın 2\'de Ali ile API review"',
    bot: '✓ kaydedildi — 5 Nis 14:00',
    description: 'Tarih ve saati otomatik çıkarır. 15 dk önce Telegram\'dan bildirir. Cevap yoksa beklemede\'ye alır.',
  },
  {
    title: 'Çoklu görev ayıklama',
    user: '"dark mode, rate limiting, docs"',
    bot: '✓ 3 görev oluşturuldu',
    description: 'Tek mesajdan birden fazla görev entity\'si çıkarır. LLM-powered intent separation.',
  },
  {
    title: 'Sesli kayıt + anlam',
    user: '🎤 "deploy pipeline\'ı hallettim"',
    bot: '✓ "CI/CD kur" tamamlandı',
    description: 'Whisper ile transcribe, Claude ile semantic match. Ses kaydından fuzzy completion.',
  },
]

const stack = [
  { label: 'Capture', value: 'Telegram' },
  { label: 'Transcribe', value: 'Whisper' },
  { label: 'Classify', value: 'Claude' },
  { label: 'Store', value: 'Supabase' },
  { label: 'Remind', value: 'pg_cron' },
  { label: 'Deploy', value: 'Vercel' },
]

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-terminal-border bg-terminal-surface p-6 transition-all duration-700 hover:border-terminal-green/40 hover:bg-terminal-surface-hover ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <h3 className="mb-4 text-sm font-semibold text-white">{feature.title}</h3>

      {/* Chat bubbles */}
      <div className="space-y-2 mb-4">
        {/* User message — right aligned, blue */}
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-terminal-green px-3 py-2 text-[12px] text-white">
            {feature.user}
          </div>
        </div>
        {/* Bot reply — left aligned, surface */}
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-terminal-surface-hover px-3 py-2 text-[12px] text-white">
            {feature.bot}
          </div>
        </div>
      </div>

      <p className="text-xs text-terminal-muted leading-relaxed">{feature.description}</p>
    </div>
  )
}

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleWaitlist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-[#17212b] text-white overflow-x-hidden">

      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6">
        {/* Subtle blue radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(42,171,238,0.08)_0%,transparent_60%)]" />

        <div className="relative z-10 w-full max-w-2xl text-center sm:text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-terminal-green/30 bg-terminal-green/10 px-3 py-1 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-terminal-green animate-pulse" />
            <span className="text-[11px] font-medium text-terminal-green">AI task agent · running live</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl mb-4">
            Toss<span className="text-terminal-green">In</span>
          </h1>

          <p className="text-xl text-white/90 leading-relaxed sm:text-2xl mb-3 max-w-lg mx-auto sm:mx-0">
            Telegram&apos;a sesli veya yazılı mesaj at.
            <br />
            <span className="text-terminal-green font-medium">AI gerisini halleder.</span>
          </p>

          <p className="text-sm text-terminal-muted mb-8 max-w-md mx-auto sm:mx-0">
            Not almak kolay — o nota geri dönmek zor. TossIn dağınık düşünceyi eyleme çevirir.
          </p>

          {/* Pipeline visual */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-[11px] mb-8">
            {['capture', 'understand', 'reconcile', 'remind', 'close'].map((step, i) => (
              <span key={step} className="flex items-center gap-1.5">
                <span className="rounded-full bg-terminal-surface px-3 py-1 text-white/80 font-medium">{step}</span>
                {i < 4 && <svg className="h-3 w-3 text-terminal-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-center sm:justify-start">
            <Link
              href="/"
              className="group inline-flex items-center justify-center rounded-full bg-terminal-green px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-terminal-green-dim hover:scale-[1.02]"
            >
              Demo&apos;yu gör
              <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="https://github.com/rudukan/TossIn"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-terminal-border bg-terminal-surface px-6 py-3 text-sm font-medium text-white transition-all hover:bg-terminal-surface-hover"
            >
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-xs font-semibold text-terminal-green tracking-widest uppercase mb-3">Nasıl çalışıyor</h2>
          <p className="text-2xl font-bold text-white sm:text-3xl">Telegram&apos;a yaz. AI yönetsin.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </section>

      {/* ═══ STACK ═══ */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-xs font-semibold text-terminal-green tracking-widest uppercase mb-3">Stack</h2>
          <p className="text-sm text-terminal-muted">Modern, ucuz, hızlı.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stack.map((item) => (
            <div key={item.label} className="rounded-2xl border border-terminal-border bg-terminal-surface px-4 py-4 text-center hover:border-terminal-green/30 hover:bg-terminal-surface-hover transition-all">
              <div className="text-[10px] text-terminal-muted uppercase tracking-wider mb-1">{item.label}</div>
              <div className="text-sm font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-terminal-muted">
          Aylık maliyet: <span className="text-terminal-green font-semibold">&lt; $1</span> — Claude Haiku + Groq free tier + Supabase free plan
        </p>
      </section>

      {/* ═══ WAITLIST ═══ */}
      <section className="mx-auto max-w-2xl px-6 py-24">
        <div className="rounded-3xl border border-terminal-green/20 bg-gradient-to-br from-terminal-surface to-terminal-surface-hover p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-terminal-green/10 rounded-full blur-3xl" />

          <div className="relative z-10 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl mb-3">
              Erken erişim
            </h2>
            <p className="text-sm text-terminal-muted mb-6 max-w-md mx-auto">
              Şu an sadece ben kullanıyorum. İlgilenen olursa waitlist&apos;e yazılsın — açınca haber vereceğim.
            </p>

            {submitted ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-terminal-green/15 px-4 py-2 text-sm text-terminal-green">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Kaydedildi. Haber vereceğim.
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="flex flex-col gap-2 sm:flex-row max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@adresin.com"
                  className="flex-1 rounded-full bg-[#17212b] px-5 py-3 text-sm text-white placeholder:text-terminal-muted border border-terminal-border focus:border-terminal-green"
                  required
                />
                <button
                  type="submit"
                  className="rounded-full bg-terminal-green px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-terminal-green-dim hover:scale-[1.02]"
                >
                  Katıl
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="mx-auto max-w-3xl px-6 py-8 border-t border-terminal-border">
        <div className="flex items-center justify-between text-xs text-terminal-muted">
          <span>TossIn — built by <a href="https://github.com/rudukan" className="text-terminal-green hover:underline">@rudukan</a></span>
          <span>2026</span>
        </div>
      </footer>
    </div>
  )
}
