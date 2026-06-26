import { useEffect, useState, type ReactNode } from 'react';
import { Cpu, Brain, Wrench, Code, GitBranch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * A walkthrough of how this app was built with Claude Code, drawn from the real
 * repo history and dev setup. Kept lean on purpose: lead with the bugs the review
 * caught and the calls that were mine, not a tool inventory.
 */

const SECTIONS = [
  { id: 'workflow', label: 'The workflow' },
  { id: 'review', label: 'Review & catches' },
  { id: 'tools', label: 'Tools' },
  { id: 'decisions', label: 'Decisions & overrides' },
] as const;

const SECTION_IDS = SECTIONS.map((s) => s.id);

function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0] ?? '');
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -45% 0px' },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => {
      observer.disconnect();
    };
  }, [ids]);
  return active;
}

function SideNav() {
  const active = useActiveSection(SECTION_IDS);
  return (
    <nav className="sticky top-6 hidden h-fit lg:block" aria-label="Page sections">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted">On this page</p>
      <ul className="space-y-1 border-l border-border">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? 'true' : undefined}
              className={cn(
                '-ml-px block border-l-2 py-1 pl-3 text-sm transition',
                active === s.id
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted hover:text-foreground',
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SectionHeading({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <div className="mb-5 scroll-mt-24 outline-none" id={id} tabIndex={-1}>
      <p className="font-mono text-[11px] uppercase tracking-wider text-accent-strong">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function GroupCard({
  icon,
  title,
  rows,
}: {
  icon: ReactNode;
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-4">
      <div className="flex items-center gap-2 text-accent-strong">
        {icon}
        <p className="font-display text-sm font-semibold text-foreground">{title}</p>
      </div>
      <dl className="mt-3 space-y-2">
        {rows.map(([name, use]) => (
          <div key={name}>
            <dt className="font-mono text-xs text-foreground">{name}</dt>
            <dd className="text-sm text-muted">{use}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const PHASES = [
  {
    n: '0',
    t: 'Foundation',
    d: 'Monorepo, strict TypeScript, lint and complexity caps, Husky hooks, CI, and a protected main.',
  },
  {
    n: '1',
    t: 'Contracts and domain',
    d: 'Shared Zod schemas plus pure domain logic, fully unit tested.',
  },
  {
    n: '2',
    t: 'Resilience executor',
    d: 'One generic core for retries, backoff, timeouts, and multi-provider failover.',
  },
  {
    n: '3',
    t: 'Adapters',
    d: 'Infrastructure ports (jobs, storage, env) and the provider clients for Gemini, OpenAI, and OpenRouter.',
  },
  {
    n: '4',
    t: 'Orchestration and API',
    d: 'A bounded-concurrency batch runner with partial success, behind a Hono API.',
  },
  {
    n: '5',
    t: 'Frontend',
    d: 'The Vite and React workspace: upload, run, and watch the results land.',
  },
  {
    n: '6',
    t: 'Overhaul and cleanup',
    d: 'Governance docs, the social-post overhaul, a full audit, and cleanup passes.',
  },
];

const LENSES =
  'correctness, types and architecture, security, accessibility, tests, and performance';

const CATCHES: [string, string][] = [
  [
    'A timeout classification race',
    'It could mark a timed-out attempt as non-retryable and quietly skip failover.',
  ],
  [
    'A job-store aliasing bug',
    'It handed live mutable arrays to pollers, so their snapshots shifted underneath them.',
  ],
  [
    'Missing Gemini responseModalities',
    'Without it the image model returns text, which would break every image call.',
  ],
  [
    'A seed above int32',
    'It made the Gemini primary return a 400 and silently fail over on roughly half of all batches.',
  ],
  [
    'An unbounded request body',
    'A denial-of-service vector, closed with a request body size limit.',
  ],
];

const MODELS: [string, string][] = [
  [
    'Claude Opus, via Claude Code',
    'The pair engineer that wrote, reviewed, and refactored the code.',
  ],
  ['Gemini 2.5 Flash Image', 'Primary image model: the product placed into the reference scene.'],
  ['OpenAI gpt-image-1', 'Failover image model, behind the same provider port.'],
  ['gemini-2.5-flash, via OpenRouter', 'The style read, the post copy, and the quality judge.'],
];

const HARNESS: [string, string][] = [
  [
    'review-panel skill',
    'The parallel reviewer panel, codified and shipped in this repo under .claude/skills.',
  ],
  [
    'brainstorming, writing-plans',
    'Agree a design, then a bite-size testable plan, before any code.',
  ],
  ['/code-review', 'A cloud review pass over a branch or PR.'],
];

const MCPS: [string, string][] = [
  ['context7', 'Current provider and library docs, instead of stale memory.'],
  ['serena', 'Move around the code by symbol rather than grep.'],
  ['playwright', 'Drive a real browser for QA and screenshots.'],
  ['basic-memory', 'Persist decisions and context across sessions.'],
];

const DECISIONS: [string, string][] = [
  [
    'Owned the layering',
    'Ports and adapters, a pure domain, and one generic executor that wraps every provider, so the resilience engineering stays visible instead of buried in a gateway.',
  ],
  [
    'TypeScript, not Python',
    'The AI here orchestrates hosted providers over HTTP, not training models. Node fits the I/O fan-out and lets the API and web share one language.',
  ],
  [
    'Hono, not Next.js',
    'The batch runs long, so a light long-lived server beats serverless timeout workarounds and keeps the API and UI cleanly apart.',
  ],
  [
    'Scrapped the first product cut',
    'The agent built a three-format compositor with burned-in copy. I cut it for one clean social post, which is what the brief actually asks for.',
  ],
  [
    'Fixed the primary, did not lean on failover',
    'When every batch quietly ran on the secondary, the healthy-looking failover was hiding a real bug in the primary. I had it reproduced against the live API and fixed.',
  ],
  [
    'Overruled the review panel where it was wrong',
    'I kept a resource policy the security pass wanted scoped, and rejected a separate warning on the muted text that I had computed was already fine. The panel advises, it does not decide.',
  ],
];

function WorkflowSection() {
  return (
    <section>
      <SectionHeading id="workflow" kicker="Process" title="From idea to reviewed PRs" />
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
        Nothing went straight to code. Each idea became a written design, then a small plan, then a
        run of phased pull requests into a protected main branch, with a review pass before every
        merge.
      </p>
      <ol className="space-y-3">
        {PHASES.map((p) => (
          <li key={p.n} className="flex gap-4 rounded-2xl border border-border bg-surface/50 p-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 font-mono text-sm font-bold text-accent-strong">
              {p.n}
            </span>
            <div>
              <p className="font-display text-sm font-semibold">{p.t}</p>
              <p className="text-sm text-muted">{p.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ReviewSection() {
  return (
    <section>
      <SectionHeading id="review" kicker="Quality" title="The review panel, and what it caught" />
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
        Every PR went past a panel of reviewer agents working in parallel, each prompted to pick
        holes in one dimension ({LENSES}). Their notes were synthesised and worked through before
        merge. AI-written code earned the same scrutiny as anything else. A sample of what it
        caught:
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {CATCHES.map(([t, d]) => (
          <li key={t} className="rounded-2xl border border-border bg-surface/50 p-4">
            <p className="text-sm font-semibold text-foreground">{t}</p>
            <p className="mt-0.5 text-sm text-muted">{d}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ToolsSection() {
  return (
    <section>
      <SectionHeading id="tools" kicker="Tooling" title="What I built it with" />
      <div className="grid gap-3 sm:grid-cols-2">
        <GroupCard icon={<Cpu size={18} weight="duotone" />} title="Models" rows={MODELS} />
        <GroupCard
          icon={<Brain size={18} weight="duotone" />}
          title="Skills and commands"
          rows={HARNESS}
        />
        <GroupCard icon={<Wrench size={18} weight="duotone" />} title="MCP servers" rows={MCPS} />
        <div className="rounded-2xl border border-border bg-surface/50 p-4">
          <div className="flex items-center gap-2 text-accent-strong">
            <Code size={18} weight="duotone" />
            <p className="font-display text-sm font-semibold text-foreground">Editors and CLI</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            VS Code as the daily driver, with JetBrains Rider for heavier refactors. iTerm2 running
            the Claude Code CLI, which is where most of the work happened.
          </p>
        </div>
      </div>
    </section>
  );
}

function DecisionsSection() {
  return (
    <section>
      <SectionHeading id="decisions" kicker="Judgment" title="Decisions and overrides" />
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
        The agent did the volume: parallel review on every PR, codebase audits and stale-file
        sweeps, doc alignment, the live-API bug hunt, and most of the test scaffolding. I set the
        direction and made every structural call. Some of those:
      </p>
      <ul className="space-y-3">
        {DECISIONS.map(([choice, why]) => (
          <li key={choice} className="rounded-2xl border border-border bg-surface/50 p-4">
            <div className="flex items-center gap-2">
              <GitBranch size={15} weight="bold" className="text-accent-strong" />
              <p className="font-display text-sm font-semibold text-foreground">{choice}</p>
            </div>
            <p className="mt-1 text-sm text-muted">{why}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HowItWasBuilt() {
  return (
    <main className="relative mx-auto max-w-6xl px-5 pb-24">
      <div className="max-w-2xl py-8 sm:py-10">
        <p className="font-mono text-[11px] uppercase tracking-wider text-accent-strong">
          How it was built
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
          Built with an AI pair, run like a real project.
        </h1>
        <p className="mt-3 text-muted">
          The brief asks how you work with AI tools, so here is the honest version. I built this
          with Claude Code as a pair, but kept it on a tight process: a design first, small reviewed
          PRs, and a review pass on every change. What follows is the short version.
        </p>
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            {[
              ['Total time', '~8 hrs'],
              ['Hands-on', '~4 hrs'],
              ['AI working', '~8 hrs'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</p>
                <p className="font-display text-xl font-bold tracking-tight">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            About a focused half-day of hands-on time (thinking, reviewing, directing). The agent
            worked alongside for roughly the same span, mostly in parallel, which is where the
            breadth came from.
          </p>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[11rem_1fr] lg:gap-12">
        <SideNav />
        <div className="min-w-0 space-y-16">
          <WorkflowSection />
          <ReviewSection />
          <ToolsSection />
          <DecisionsSection />
        </div>
      </div>
    </main>
  );
}
