'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

const bootLines = [
  { text: '$ tossin --init', delay: 0, type: 'cmd' },
  { text: 'TossIn v2.5.0 — Personal Execution Assistant', delay: 300, type: 'info' },
  { text: '', delay: 500, type: 'blank' },
  { text: 'Loading modules...', delay: 600, type: 'info' },
  { text: '  [OK] Voice capture        (Groq Whisper)', delay: 900, type: 'ok' },
  { text: '  [OK] AI classification    (Claude Haiku)', delay: 1200, type: 'ok' },
  { text: '  [OK] Semantic matching    (task-state-engine)', delay: 1500, type: 'ok' },
  { text: '  [OK] Smart reminders      (pg_cron @ 1min)', delay: 1800, type: 'ok' },
  { text: '  [OK] Real-time sync       (Supabase WS)', delay: 2100, type: 'ok' },
  { text: '', delay: 2300, type: 'blank' },
  { text: 'All systems operational. Ready for input.', delay: 2400, type: 'ready' },
]

const features = [
  {
    command: '> "auth PR\'ı merge edildi"',
    response: '✓ "auth modülünü bitir" → DONE',
    description: 'Semantic task reconciliation. Mevcut task\'ları tarar, doğal dil eşleştirmesi yapar, state günceller.',
  },
  {
    command: '> "yarın 2\'de Ali ile API review"',
    response: '✓ kaydedildi (⏰ 5 Nis 14:00)',
    description: 'NLP date extraction + pg_cron scheduling. 15 dk önce push. Cevapsız → auto-waiting.',
  },
  {
    command: '> "dark mode, rate limiting, docs"',
    response: '✓ 3 task oluşturuldu\n  • dark mode\n  • rate limiting\n  • docs',
    description: 'Multi-task parsing. Tek input → N ayrı task entity. LLM-powered intent separation.',
  },
  {
    command: '> 🎤 "deploy pipeline\'ı hallettim"',
    response: '✓ "CI/CD kur" → DONE',
    description: 'Voice → Whisper → Claude → semantic match → state update. Fuzzy completion with confidence scoring.',
  },
]

const stats = [
  { label: 'Capture', value: 'Telegram' },
  { label: 'Transcribe', value: 'Whisper' },
  { label: 'Classify', value: 'Claude' },
  { label: 'Store', value: 'Supabase' },
  { label: 'Remind', value: 'pg_cron' },
  { label: 'Deploy', value: 'Vercel' },
]

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    bootLines.forEach((_, i) => {
      setTimeout(() => {
        setVisibleLines(i + 1)
        if (i === bootLines.length - 1) {
          setTimeout(() => onCompleteRef.current(), 400)
        }
      }, bootLines[i].delay)
    })
  }, [])

  return (
    <div className="text-[11px] leading-relaxed sm:text-xs">
      {bootLines.slice(0, visibleLines).map((line, i) => (
        <div
          key={i}
          className={`${
            line.type === 'cmd' ? 'text-terminal-green font-bold glow-green' :
            line.type === 'ok' ? 'text-terminal-green' :
            line.type === 'ready' ? 'text-terminal-green font-bold glow-green mt-1' :
            line.type === 'blank' ? 'h-3' :
            'text-zinc-500'
          }`}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          {line.text}
        </div>
      ))}
      {visibleLines < bootLines.length && (
        <span className="cursor-blink text-terminal-green">█</span>
      )}
    </div>
  )
}

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.2 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`border border-terminal-border bg-terminal-surface/50 p-5 transition-all duration-700 hover:border-terminal-green/20 hover:bg-terminal-surface ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="space-y-3">
        <div className="text-terminal-green text-xs font-bold tracking-wide">{feature.command}</div>
        <div className="border-l border-terminal-green/40 pl-3 text-[11px] text-foreground whitespace-pre-line font-medium">
          {feature.response}
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">{feature.description}</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [bootDone, setBootDone] = useState(false)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleComplete = useCallback(() => setBootDone(true), [])

  const handleWaitlist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-foreground overflow-x-hidden">

      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,255,65,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.4) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Radial fade */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a0f_70%)]" />

        <div className="relative z-10 w-full max-w-xl">
          {/* Boot */}
          <div className={`rounded border border-terminal-border/50 bg-[#0d0d14] p-5 backdrop-blur transition-all duration-700 ${bootDone ? 'opacity-40 scale-[0.97]' : 'opacity-100'}`}>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-terminal-border/30">
              <div className="w-2 h-2 rounded-full bg-terminal-red/70" />
              <div className="w-2 h-2 rounded-full bg-terminal-amber/70" />
              <div className="w-2 h-2 rounded-full bg-terminal-green/70" />
              <span className="ml-2 text-[9px] text-zinc-500 tracking-widest">TOSSIN — TERMINAL</span>
            </div>
            <BootSequence onComplete={handleComplete} />
          </div>

          {/* Hero content */}
          <div className={`mt-12 space-y-6 transition-all duration-1000 ease-out ${bootDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h1 className="text-5xl font-bold tracking-tighter text-terminal-green sm:text-7xl" style={{ textShadow: '0 0 30px rgba(0,255,65,0.3), 0 0 60px rgba(0,255,65,0.1)' }}>
              TossIn_
            </h1>

            <div className="space-y-3 max-w-md">
              <p className="text-base text-foreground leading-relaxed sm:text-lg">
                {"Telegram'a sesli veya yazılı mesaj at."}
                <br />
                <span className="text-terminal-green font-medium">AI gerisini halleder.</span>
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Not almak kolay — o nota geri dönmek zor.
                <br />
                toss dağınık düşünceyi eyleme çevirir.
              </p>
            </div>

            {/* Pipeline visual */}
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 overflow-x-auto py-2">
              {['capture', 'understand', 'reconcile', 'remind', 'close'].map((step, i) => (
                <span key={step} className="flex items-center gap-1 whitespace-nowrap">
                  <span className="border border-terminal-green/30 px-2 py-0.5 text-terminal-green/90">{step}</span>
                  {i < 4 && <span className="text-terminal-green/40 mx-0.5">›››</span>}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center pt-2">
              <Link
                href="/"
                className="group inline-flex items-center justify-center border border-terminal-green text-terminal-green px-6 py-3 text-xs font-bold tracking-widest hover:bg-terminal-green hover:text-black transition-all duration-300"
              >
                {"DEMO'YU GOR"}
                <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <span className="text-[10px] text-zinc-500">veya aşağı scroll et ↓</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="mx-auto max-w-xl px-6 py-24">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-terminal-border" />
          <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.3em]">FEATURES</h2>
          <div className="h-px flex-1 bg-terminal-border" />
        </div>
        <p className="mb-10 text-xs text-zinc-500 text-center">
          {"Telegram'a yaz. AI analiz etsin. Doğru aksiyonu alsın."}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </section>

      {/* ═══ STACK ═══ */}
      <section className="mx-auto max-w-xl px-6 py-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-terminal-border" />
          <h2 className="text-[10px] font-bold text-zinc-500 tracking-[0.3em]">STACK</h2>
          <div className="h-px flex-1 bg-terminal-border" />
        </div>

        <div className="grid grid-cols-3 gap-px bg-terminal-border/30 border border-terminal-border">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-[#0a0a0f] px-4 py-3 text-center hover:bg-terminal-surface transition-colors">
              <div className="text-[9px] text-zinc-500 tracking-widest mb-1">{stat.label.toUpperCase()}</div>
              <div className="text-xs text-terminal-green font-medium">{stat.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ WAITLIST ═══ */}
      <section className="mx-auto max-w-xl px-6 py-24">
        <div className="border border-terminal-green/20 p-8 relative overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-terminal-green/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="text-[9px] text-zinc-500 tracking-[0.3em] mb-1">EARLY ACCESS</div>
            <h2 className="text-lg font-bold text-terminal-green glow-green mb-2">
              Erken erişim
            </h2>
            <p className="text-xs text-zinc-500 mb-6 max-w-sm">
              {"Şu an sadece ben kullanıyorum. İlgilenen olursa waitlist'e yazılsın — açınca haber vereceğim."}
            </p>

            {submitted ? (
              <div className="flex items-center gap-2 text-sm text-terminal-green glow-green">
                <span>✓</span>
                <span>Kaydedildi. Haber vereceğim.</span>
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="flex gap-2">
                <div className="flex flex-1 items-center border border-terminal-border bg-[#0d0d14] hover:border-terminal-muted transition-colors">
                  <span className="px-3 text-terminal-green select-none text-xs">{">"}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@adresin.com"
                    className="flex-1 bg-transparent py-2.5 text-xs text-terminal-green placeholder:text-zinc-500/50 caret-terminal-green border-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="border border-terminal-green text-terminal-green px-5 text-[11px] font-bold tracking-widest hover:bg-terminal-green hover:text-black transition-all duration-300"
                >
                  JOIN
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="mx-auto max-w-xl px-6 py-6 border-t border-terminal-border/30">
        <div className="flex items-center justify-between text-[9px] text-zinc-500 tracking-wide">
          <span>{"TossIn v2.5.0 — built by "}<a href="https://github.com/rudukan" className="text-terminal-green/70 hover:text-terminal-green transition-colors">@rudukan</a></span>
          <span>2026</span>
        </div>
      </footer>
    </div>
  )
}
