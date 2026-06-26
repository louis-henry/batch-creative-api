import { Sun, MoonStars } from '@phosphor-icons/react';
import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {dark ? <Sun size={17} weight="bold" /> : <MoonStars size={17} weight="bold" />}
    </button>
  );
}
