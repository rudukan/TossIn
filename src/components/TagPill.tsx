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
      className={`inline-flex items-center gap-1 rounded-full bg-terminal-surface-hover px-2.5 py-0.5 text-[10px] font-medium text-terminal-cyan ${
        onClick ? 'cursor-pointer hover:bg-terminal-green/20 hover:text-terminal-green' : ''
      }`}
    >
      #{tag}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className="ml-0.5 text-terminal-muted hover:text-terminal-red"
        >
          ×
        </button>
      )}
    </span>
  )
}
