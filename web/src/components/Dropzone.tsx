import { useRef, useState, type DragEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropzoneProps {
  label: string;
  hint: string;
  onFiles: (files: File[]) => void;
}

const imagesOnly = (list: FileList | null): File[] =>
  list ? Array.from(list).filter((f) => f.type.startsWith('image/')) : [];

export function Dropzone({ label, hint, onFiles }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    setOver(false);
    onFiles(imagesOnly(e.dataTransfer.files));
  };

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface/40 px-4 py-7 text-center transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
          over && 'border-primary bg-primary/10',
        )}
      >
        <ImagePlus className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted">{hint}</span>
      </button>
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
    </>
  );
}
