import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import type { ItemResult } from '@app/contracts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadName } from '@/lib/status';

function ResultCard({ result }: { result: ItemResult }) {
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
              <img src={p.url} alt={`${result.id} ${p.format} post`} className="max-h-72 w-auto" />
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <a href={p.url} download={downloadName(result.id, p.format)}>
                <Download className="h-3.5 w-3.5" /> Download {p.format}
              </a>
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
