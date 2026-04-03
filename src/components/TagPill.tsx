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
      className={`inline-flex items-center gap-1 border border-terminal-muted/50 px-2 py-0.5 text-[10px] text-terminal-cyan ${
        onClick ? 'cursor-pointer hover:border-terminal-cyan/50 hover:bg-terminal-cyan/5' : ''
      }`}
    >
      #{tag}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className="text-terminal-muted hover:text-terminal-red ml-0.5"
        >
          x
        </button>
      )}
    </span>
  )
}
