export default function NudgeBanner({ count }: { count: number }) {
  if (count < 5) return null

  return (
    <div className="border border-terminal-amber/30 bg-terminal-amber/5 px-4 py-2.5 text-xs text-terminal-amber glow-amber">
      <span className="text-terminal-amber/60">WARNING:</span> {count} not inbox&apos;te bekliyor. <span className="text-terminal-amber/60">// temizlik vakti</span>
    </div>
  )
}
