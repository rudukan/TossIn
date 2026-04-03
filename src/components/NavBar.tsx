'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: '/inbox', shortcut: '1' },
  { href: '/board', label: '/board', shortcut: '2' },
  { href: '/search', label: '/search', shortcut: '3' },
] as const

export default function NavBar({ inboxCount }: { inboxCount?: number }) {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 z-20 border-t border-terminal-border bg-black/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-around">
        {tabs.map(({ href, label, shortcut }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-1 items-center justify-center gap-2 py-3.5 text-xs transition-colors ${
                active
                  ? 'text-terminal-green glow-green'
                  : 'text-terminal-muted hover:text-foreground'
              }`}
            >
              <span className="text-terminal-muted text-[10px]">[{shortcut}]</span>
              <span className="font-medium">{label}</span>
              {href === '/' && inboxCount !== undefined && inboxCount >= 5 && (
                <span className="flex h-4 min-w-4 items-center justify-center border border-terminal-amber/50 px-1 text-[10px] font-bold text-terminal-amber">
                  {inboxCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
