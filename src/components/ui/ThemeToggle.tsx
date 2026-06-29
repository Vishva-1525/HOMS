import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeProvider'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'theme-toggle relative inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white/50',
        className,
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <Sun
        className={cn(
          'h-[1.125rem] w-[1.125rem] transition-all',
          isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
        )}
        strokeWidth={1.75}
      />
      <Moon
        className={cn(
          'absolute h-[1.125rem] w-[1.125rem] transition-all',
          isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0',
        )}
        strokeWidth={1.75}
      />
    </button>
  )
}
