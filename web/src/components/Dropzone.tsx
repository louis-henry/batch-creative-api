import { useId, useRef, useState, type DragEvent } from 'react';
import { ImageSquare, Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface DropzoneProps {
  label: string;
  hint?: string;
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

const imagesOnly = (list: FileList | null): File[] =>
  list ? Array.from(list).filter((f) => f.type.startsWith('image/')) : [];

export function Dropzone({ label, hint, onFiles, compact = false }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [over, setOver] = useState(false);

  const open = (): void => inputRef.current?.click();
  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    setOver(false);
    onFiles(imagesOnly(e.dataTransfer.files));
  };
  const dragProps = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop,
  };
  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      hidden
      onChange={(e) => {
        onFiles(imagesOnly(e.target.files));
      }}
    />
  );

  if (compact) {
    return (
      <>
        <button
          type="button"
          aria-label={label}
          onClick={open}
          {...dragProps}
          className={cn(
            'flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted transition hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            over && 'border-primary bg-primary/10 text-foreground',
          )}
        >
          <Plus size={20} weight="bold" />
          <span className="font-mono text-[9px] uppercase tracking-wide">Upload</span>
        </button>
        {input}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-describedby={hint ? hintId : undefined}
        onClick={open}
        {...dragProps}
        className={cn(
          'group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center transition hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          over && 'border-primary bg-primary/10',
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition group-hover:scale-105">
          <ImageSquare size={24} weight="duotone" />
        </span>
        <span className="font-display text-base font-semibold">{label}</span>
        {hint && (
          <span id={hintId} className="text-sm text-muted">
            {hint}
          </span>
        )}
      </button>
      {input}
    </>
  );
}
