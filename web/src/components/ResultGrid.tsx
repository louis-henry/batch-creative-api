import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ImageOff } from 'lucide-react';
import type { ItemResult, PostResult } from '@app/contracts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadImage } from '@/lib/api';
import { downloadName } from '@/lib/status';

function PostImage({ post, alt }: { post: PostResult; alt: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 text-muted">
        <ImageOff aria-hidden="true" className="h-5 w-5" />
        <span className="text-xs">image unavailable</span>
      </div>
    );
  }
  return (
    <img
      src={post.url}
      alt={alt}
      className="max-h-72 w-auto"
      onError={() => {
        setBroken(true);
      }}
    />
  );
}

function ResultCard({ result }: { result: ItemResult }) {
  const download = (post: PostResult): void => {
    downloadImage(post.url, downloadName(result.id, post.format)).catch(() => undefined);
  };

  return (
    <Card className="overflow-hidden p-3">
      <Tabs defaultValue={result.posts[0]?.format ?? 'square'}>
        <div className="mb-2 flex items-center justify-between">
          <TabsList>
            {result.posts.map((p) => (
              <TabsTrigger key={p.format} value={p.format}>
                {p.format}
              </TabsTrigger>
            ))}
          </TabsList>
          <span className="text-[10px] uppercase tracking-wide text-muted">
            {result.providerUsed}
          </span>
        </div>
        {result.posts.map((p) => (
          <TabsContent key={p.format} value={p.format} className="space-y-2">
            <div className="flex justify-center overflow-hidden rounded-lg border border-border bg-black/30">
              <PostImage post={p} alt={`${result.id} ${p.format} post`} />
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => download(p)}>
              <Download aria-hidden="true" className="h-3.5 w-3.5" /> Download {p.format}
            </Button>
          </TabsContent>
        ))}
      </Tabs>
      <p className="mt-2 line-clamp-2 text-xs text-muted">
        “{result.copy.headline}” — {result.copy.cta}
      </p>
    </Card>
  );
}

export function ResultGrid({ results }: { results: ItemResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {results.map((result) => (
        <motion.div
          key={result.id}
          layout
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <ResultCard result={result} />
        </motion.div>
      ))}
    </div>
  );
}
