import { useEffect, useRef } from 'react';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import { Outlet, useLocation } from 'react-router-dom';
import { SiteHeader } from '@/components/SiteHeader';

const TITLES: Record<string, string> = {
  '/': 'AI Engineering Challenge',
  '/how-it-was-built': 'How it was built · AI Engineering Challenge',
};

export function Layout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);

  // SPA navigation: name the page (WCAG 2.4.2), reset scroll, and move focus to
  // the content so keyboard and screen-reader users are not stranded.
  useEffect(() => {
    document.title = TITLES[pathname] ?? 'AI Engineering Challenge';
    window.scrollTo(0, 0);
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-full">
        <SiteHeader />
        <div ref={mainRef} tabIndex={-1} className="outline-none">
          <Outlet />
        </div>
        <footer className="border-t border-border px-5 py-6 text-center sm:px-8">
          <p className="text-sm text-muted">
            Built by <span className="font-medium text-foreground">Louis H</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            Demo runs on a small provider budget; heavy use may briefly pause new generations.
          </p>
        </footer>
        <Toaster theme="system" position="top-right" richColors />
      </div>
    </MotionConfig>
  );
}
