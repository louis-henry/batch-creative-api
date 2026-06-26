import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ThumbsProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function Thumbs({ files, onRemove }: ThumbsProps) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  if (files.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {files.map((file, i) => (
        <div
          key={`${file.name}-${String(i)}`}
          className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border"
        >
          <img src={urls[i]} alt={file.name} className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label={`Remove ${file.name}`}
            onClick={() => onRemove(i)}
            className="absolute right-0 top-0 rounded-bl bg-black/70 p-0.5 text-foreground opacity-70 transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <X aria-hidden="true" className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
