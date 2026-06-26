import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import { Outlet } from 'react-router-dom';
import { SiteHeader } from '@/components/SiteHeader';

export function Layout() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-full">
        <SiteHeader />
        <Outlet />
        <Toaster theme="system" position="top-right" richColors />
      </div>
    </MotionConfig>
  );
}
