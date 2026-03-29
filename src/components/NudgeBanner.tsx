export default function NudgeBanner({ count }: { count: number }) {
  if (count < 5) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <strong>{count} not</strong> inbox&apos;te bekliyor. Biraz temizlik vakti!
    </div>
  )
}
