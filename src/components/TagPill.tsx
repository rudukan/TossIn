export default function TagPill({
  tag,
  onClick,
  removable,
  onRemove,
}: {
  tag: string
  onClick?: () => void
  removable?: boolean
  onRemove?: () => void
}) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 ${
        onClick ? 'cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700' : ''
      }`}
    >
      {tag}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className="ml-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          &times;
        </button>
      )}
    </span>
  )
}
