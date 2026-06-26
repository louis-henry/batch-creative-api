import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface/60 shadow-xl shadow-black/20 backdrop-blur',
        className,
      )}
      {...props}
    />
  );
}
