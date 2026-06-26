import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Plus, X } from '@phosphor-icons/react';
import { Dropzone } from './Dropzone';
import type { Sample } from '@/lib/samples';
import { cn } from '@/lib/utils';

const nameOf = (url: string): string => url.split('/').pop()?.split('?')[0] ?? '';

interface ImagePickerProps {
  samples: Sample[];
  files: File[];
  max: number;
  uploadLabel: string;
  onToggleSample: (url: string) => void;
  onUpload: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}

/** Built-in samples toggle in/out; uploads sit alongside. Selected = ringed. */
export function ImagePicker({
  samples,
  files,
  max,
  uploadLabel,
  onToggleSample,
  onUpload,
  onRemoveFile,
}: ImagePickerProps) {
  const sampleNames = useMemo(() => new Set(samples.map((s) => nameOf(s.url))), [samples]);
  const uploads = files
    .map((f, index) => ({ f, index }))
    .filter(({ f }) => !sampleNames.has(f.name));
  const full = files.length >= max;

  const [uploadUrls, setUploadUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = uploads.map(({ f }) => URL.createObjectURL(f));
    setUploadUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  return (
    <div className="flex flex-wrap gap-3">
      {samples.map((s) => {
        const selected = files.some((f) => f.name === nameOf(s.url));
        const disabled = !selected && full;
        return (
          <button
            key={s.url}
            type="button"
            aria-pressed={selected}
            aria-label={`${selected ? 'Remove' : 'Add'} ${s.label}`}
            disabled={disabled}
            onClick={() => onToggleSample(s.url)}
            className={cn(
              'group relative h-20 w-20 overflow-hidden rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selected
                ? 'border-primary ring-2 ring-primary/50'
                : 'border-border opacity-50 hover:border-primary/60 hover:opacity-100',
              disabled && 'cursor-not-allowed opacity-25 hover:border-border hover:opacity-25',
            )}
          >
            <img src={s.url} alt={s.label} className="h-full w-full object-cover" />
            {selected ? (
              <span className="absolute right-1 top-1 text-primary drop-shadow">
                <CheckCircle size={18} weight="fill" />
              </span>
            ) : (
              !disabled && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/40 text-foreground opacity-0 transition group-hover:opacity-100">
                  <Plus size={16} weight="bold" />
                </span>
              )
            )}
          </button>
        );
      })}

      {uploads.map(({ index }, k) => (
        <div
          key={`upload-${String(index)}`}
          className="group relative h-20 w-20 overflow-hidden rounded-xl border border-primary ring-2 ring-primary/50"
        >
          <img src={uploadUrls[k]} alt="Uploaded" className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="Remove uploaded image"
            onClick={() => onRemoveFile(index)}
            className="absolute inset-0 flex items-center justify-center bg-background/55 text-foreground opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      ))}

      {!full && <Dropzone compact label={uploadLabel} onFiles={onUpload} />}
    </div>
  );
}
