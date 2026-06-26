import { Sparkles, Zap } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

interface ControlsProps {
  concurrency: number;
  chaos: boolean;
  running: boolean;
  canRun: boolean;
  onConcurrency: (n: number) => void;
  onChaos: (v: boolean) => void;
  onRun: () => void;
}

export function Controls({
  concurrency,
  chaos,
  running,
  canRun,
  onConcurrency,
  onChaos,
  onRun,
}: ControlsProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted">Concurrency</span>
          <span className="font-mono text-foreground">{concurrency}</span>
        </div>
        <Slider
          min={1}
          max={16}
          step={1}
          value={[concurrency]}
          onValueChange={([v]) => {
            onConcurrency(v ?? 1);
          }}
          aria-label="Concurrency"
        />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-primary" />
          Chaos mode
          <span className="text-xs text-muted">force primary to fail</span>
        </span>
        <Switch checked={chaos} onCheckedChange={onChaos} aria-label="Chaos mode" />
      </label>

      <Button onClick={onRun} disabled={!canRun || running}>
        <Sparkles className="h-4 w-4" />
        {running ? 'Generating…' : 'Generate posts'}
      </Button>
    </div>
  );
}
