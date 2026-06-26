import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleNotch } from '@phosphor-icons/react';

const MESSAGES = [
  'Reading the reference style…',
  'Placing your product in the scene…',
  'Writing the copy…',
  'Composing square, story, and banner…',
  'Almost there…',
];

export function LoadingView({ done, total }: { done: number; total: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % MESSAGES.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <CircleNotch size={36} weight="bold" className="animate-spin text-primary" />
      <div className="space-y-2">
        <p className="font-display text-xl font-semibold tracking-tight">
          Generating your post set
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-sm text-muted"
          >
            {MESSAGES[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      {total > 0 && (
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          {done} / {total} ready
        </p>
      )}
    </div>
  );
}
