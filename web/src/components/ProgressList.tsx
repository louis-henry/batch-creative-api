import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type { ItemView } from '@/lib/status';
import { Badge } from '@/components/ui/badge';

function StatusBadge({ item }: { item: ItemView }) {
  if (item.status === 'done') {
    return (
      <Badge tone="done">
        <CheckCircle2 aria-hidden="true" className="h-3 w-3" /> {item.result.providerUsed}
      </Badge>
    );
  }
  if (item.status === 'failed') {
    return (
      <Badge tone="failed">
        <XCircle aria-hidden="true" className="h-3 w-3" /> failed
      </Badge>
    );
  }
  return (
    <Badge tone="pending">
      <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" /> generating
    </Badge>
  );
}

// Note: status is announced via the single summary live region in App, not here —
// a per-row live region would spam assistive tech as many rows mutate at once.
export function ProgressList({ items }: { items: ItemView[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm"
          >
            <span className="font-mono text-xs text-muted">{item.id}</span>
            <StatusBadge item={item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
