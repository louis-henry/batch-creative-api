import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  DownloadSimple,
  Copy,
  ImageBroken,
  XCircle,
  CircleNotch,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import type { ItemResult, SocialPost } from '@app/contracts';
import type { ItemView } from '@/lib/status';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { downloadImage } from '@/lib/api';
import { downloadName } from '@/lib/status';

const hashtag = (tag: string): string => (tag.startsWith('#') ? tag : `#${tag}`);

function captionText(post: SocialPost): string {
  const tags = post.hashtags.map(hashtag).join(' ');
  return [post.title, post.caption, tags].filter(Boolean).join('\n\n');
}

function PostImage({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-[oklch(0_0_0/0.25)] text-muted">
        <ImageBroken size={22} weight="duotone" />
        <span className="font-mono text-[10px] uppercase tracking-wider">unavailable</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="aspect-square w-full bg-[oklch(0_0_0/0.25)] object-cover"
      onError={() => {
        setBroken(true);
      }}
    />
  );
}

function PostCard({ result }: { result: ItemResult }) {
  const { post } = result;
  const saveImage = (): void => {
    downloadImage(result.imageUrl, downloadName(result.id)).catch((e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    });
  };
  const copyText = (): void => {
    navigator.clipboard
      .writeText(captionText(post))
      .then(() => toast.success('Caption copied'))
      .catch(() => toast.error('Copy failed'));
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/60">
      <header className="flex items-center gap-2 px-4 py-3">
        <span className="grid size-7 place-items-center rounded-full bg-primary/15 font-mono text-[10px] font-bold uppercase text-primary">
          {result.id.replace(/\D/g, '')}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {result.providerUsed}
        </span>
      </header>

      <PostImage src={result.imageUrl} alt={post.title} />

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] font-display text-base font-semibold leading-tight text-foreground">
          {post.title}
        </h3>
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger asChild>
            <p className="line-clamp-3 min-h-[3.9rem] cursor-help text-sm leading-relaxed text-muted">
              {post.caption}
            </p>
          </HoverCardTrigger>
          <HoverCardContent>
            <div className="space-y-2">
              <h3 className="font-display text-base font-semibold leading-tight text-foreground">
                {post.title}
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                {post.caption}
              </p>
              {post.hashtags.length > 0 && (
                <p className="flex flex-wrap gap-x-2 gap-y-1 pt-1 text-sm font-medium text-primary">
                  {post.hashtags.map((tag) => (
                    <span key={tag}>{hashtag(tag)}</span>
                  ))}
                </p>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
        <p className="truncate pt-1 text-sm font-medium text-primary">
          {post.hashtags.map(hashtag).join(' ')}
        </p>
      </div>

      <div className="mt-auto flex gap-2 p-4 pt-0">
        <Button variant="outline" size="sm" className="flex-1" onClick={copyText}>
          <Copy size={14} weight="bold" /> Copy text
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={saveImage}>
          <DownloadSimple size={14} weight="bold" /> Save image
        </Button>
      </div>
    </article>
  );
}

function PendingCard({ id }: { id: string }) {
  return (
    <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface/40">
      <CircleNotch size={24} weight="bold" className="animate-spin text-primary" />
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {id} · generating
      </span>
    </div>
  );
}

function FailedCard({ id, reason }: { id: string; reason: string }) {
  return (
    <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-center">
      <XCircle size={24} weight="duotone" className="text-danger" />
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{id}</span>
      <span className="line-clamp-3 text-xs text-muted">{reason}</span>
    </div>
  );
}

export function Gallery({ items }: { items: ItemView[] }) {
  const track = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scroll = (dir: -1 | 1): void => {
    track.current?.scrollBy({ left: dir * 336, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {items.length > 1 && (
        <div className="mb-3 flex justify-center gap-2">
          <Button variant="outline" size="icon" aria-label="Scroll left" onClick={() => scroll(-1)}>
            <CaretLeft size={16} weight="bold" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Scroll right" onClick={() => scroll(1)}>
            <CaretRight size={16} weight="bold" />
          </Button>
        </div>
      )}

      <div
        ref={track}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-[18rem] shrink-0 snap-start"
          >
            {item.status === 'done' && <PostCard result={item.result} />}
            {item.status === 'pending' && <PendingCard id={item.id} />}
            {item.status === 'failed' && <FailedCard id={item.id} reason={item.failure.reason} />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
