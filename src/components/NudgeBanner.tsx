export default function NudgeBanner({ count }: { count: number }) {
  if (count < 5) return null

  return (
    <div className="rounded-2xl border border-terminal-amber/30 bg-terminal-amber/10 px-4 py-3 text-sm text-terminal-amber">
      <strong>{count} not</strong> inbox&apos;te bekliyor. Biraz temizlik vakti!
    </div>
  )
}
