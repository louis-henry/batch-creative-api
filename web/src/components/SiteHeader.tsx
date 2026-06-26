import { Stack, GithubLogo } from '@phosphor-icons/react';
import { Link, NavLink } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  return (
    <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
      <Link
        to="/"
        className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Stack size={16} weight="fill" />
        </span>
        <span className="font-display text-sm font-semibold tracking-tight">
          AI Engineering Challenge
        </span>
      </Link>
      <div className="flex items-center gap-1.5">
        <NavLink
          to="/how-it-was-built"
          className={({ isActive }) =>
            cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong',
              isActive
                ? 'bg-surface-2 text-foreground'
                : 'text-muted hover:bg-surface-2 hover:text-foreground',
            )
          }
        >
          How it was built
        </NavLink>
        <a
          href="https://github.com/louis-henry/batch-creative-api"
          target="_blank"
          rel="noreferrer"
          aria-label="View the repository on GitHub"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
        >
          <GithubLogo size={17} weight="bold" />
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
