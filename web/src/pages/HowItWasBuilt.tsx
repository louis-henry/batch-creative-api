import { useEffect, useState, type ReactNode } from 'react';
import {
  Brain,
  Lightning,
  Wrench,
  PuzzlePiece,
  Code,
  Terminal,
  Notebook,
  CloudArrowUp,
  Robot,
  Hand,
  GitBranch,
  CheckCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * A walkthrough of how this app was built with Claude Code. The content is drawn
 * from the real repo history and dev setup, written to read like a developer
 * talking a technical lead through their process.
 */

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'workflow', label: 'The workflow' },
  { id: 'review', label: 'Review committee' },
  { id: 'toolkit', label: 'AI toolkit' },
  { id: 'setup', label: 'Setup & environment' },
  { id: 'split', label: 'Human vs agent' },
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
      { rootMargin: '-25% 0px -65% 0px' },
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
    <div className="mb-5 scroll-mt-24" id={id}>
      <p className="font-mono text-[11px] uppercase tracking-wider text-accent-strong">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-border bg-surface/50 p-4">{children}</div>;
}

function GroupCard({ icon, title, rows }: { icon: ReactNode; title: string; rows: string[][] }) {
  return (
    <Card>
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
    </Card>
  );
}

const PRINCIPLES: string[][] = [
  [
    'Design before code',
    'Every feature started as a short written spec and a plan, then code. Not a one-shot prompt.',
  ],
  [
    'Small, reviewed PRs',
    'Work shipped in focused pull requests into a protected main branch. Nothing merged unread.',
  ],
  [
    'Adversarial review',
    'A panel of reviewer agents went at each PR. AI output earned the same scrutiny as anything else.',
  ],
  [
    'Lean on purpose',
    'The effort went into the resilient core and the output quality, not the infra the brief cares less about.',
  ],
];

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
    t: 'Docs and overhaul',
    d: 'Governance docs, then a product overhaul, a full audit, and cleanup passes.',
  },
];

const PANEL = [
  ['Correctness', 'Logic, edge cases, and regressions against the plan.'],
  ['Types and architecture', 'Boundaries, the ports and adapters rule, and type design.'],
  ['Security', 'Input validation, secret handling, and the failure-reason invariant.'],
  ['Accessibility', 'Keyboard paths, screen readers, and colour contrast.'],
  ['Tests', 'Coverage of real behaviour, not implementation detail.'],
  ['Performance and DX', 'Hot paths, bundle weight, and how the code reads.'],
];

const CATCHES = [
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
    'A denial-of-service vector, closed with a body limit before any bytes get buffered.',
  ],
  [
    'A contrast failure',
    'Accent text sat near 1.7 to 1 on the light theme. It was retuned to a token at 5.25 to 1.',
  ],
];

const SKILLS: string[][] = [
  [
    'review-panel',
    'Spin up a panel of specialist reviewer agents over a diff or PR. This repo ships the skill under .claude/skills.',
  ],
  ['brainstorming', 'Agree a design with me before any code gets written.'],
  ['writing-plans', 'Turn the design into a bite-size, testable plan.'],
  ['using-superpowers', 'Pull in the right skill for the task at hand.'],
  ['debugging', 'A disciplined loop for tracking a bug to its root cause.'],
];

const COMMANDS: string[][] = [
  ['/code-review', 'Kick off a cloud review panel over the branch or a PR.'],
  ['project commands', 'Repeatable tasks wired up under .claude for this repo.'],
];

const MCPS: string[][] = [
  ['context7', 'Current provider and library docs, instead of stale memory.'],
  ['playwright', 'Drive a real browser for QA and screenshots.'],
  ['serena', 'Move around the code by symbol rather than grep.'],
  ['basic-memory', 'Persist decisions and context across sessions.'],
];

const PLUGINS: string[][] = [
  ['superpowers', 'The skills, brainstorming, and planning harness.'],
  ['pr-review-toolkit', 'The specialist reviewer agents used on each PR.'],
  ['feature-dev', 'Explore, architect, and review helpers.'],
];

const ENVIRONMENT = [
  {
    icon: <Code size={18} weight="duotone" />,
    t: 'Editors',
    d: 'VS Code as the daily driver, with JetBrains Rider as the heavier alternative when I want its refactoring tools.',
  },
  {
    icon: <Terminal size={18} weight="duotone" />,
    t: 'Terminal',
    d: 'iTerm2 running the Claude Code CLI, which is where most of the work happens.',
  },
  {
    icon: <Notebook size={18} weight="duotone" />,
    t: 'Notes and memory',
    d: 'An Obsidian vault for design notes and decisions, backed by Basic Memory so context carries across sessions.',
  },
  {
    icon: <CloudArrowUp size={18} weight="duotone" />,
    t: 'Source, CI, and deploy',
    d: 'GitHub with a protected main and a PR per change. CircleCI is the planned pipeline, and Vercel hosts the web app with a long-lived host for the API.',
  },
];

const DELEGATED = [
  'Parallel code review on every pull request',
  'Codebase exploration, audits, and stale-file sweeps',
  'Documentation alignment across the README, ADRs, and governance',
  'Diagnosing the Gemini 400 against the live API',
  'Mechanical refactors and most of the test scaffolding',
  'Generating and curating the demo output',
];

const MANUAL = [
  'Owned the architecture: ports and adapters, one generic resilience executor, a single style spec. I set the shape and the agent built to it.',
  'Chose the stack and the trade-offs: TypeScript over Python, Hono over Next.',
  'Directed the product: one clean social post per product, not a burned-in ad system.',
  'Drew every scope line: no queue, no auth, deploy last, to match what the brief grades.',
  'Designed the UI and its interactions, and reworked it when a version did not feel right.',
  'Accepted or rejected each review finding, and made the final merge call on every PR.',
];

const DECISIONS = [
  [
    'Owned the layering',
    'Ports and adapters, a pure domain, and one generic executor that wraps every provider. I set this structure up front so the resilience engineering stays visible instead of buried in a gateway.',
  ],
  [
    'TypeScript, not Python',
    'The AI here is orchestrating hosted providers over HTTP, not training models. Node fits the I/O fan-out and lets the API and web share one language.',
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
    'I kept a resource policy the security pass wanted scoped, and threw out a contrast warning that was a false alarm once the real ratio was computed. The panel advises, it does not decide.',
  ],
];

function OverviewSection() {
  return (
    <section>
      <SectionHeading id="overview" kicker="At a glance" title="How the work ran" />
      <div className="grid gap-3 sm:grid-cols-2">
        {PRINCIPLES.map(([t, d]) => (
          <Card key={t}>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} weight="fill" className="text-accent-strong" />
              <p className="font-display text-sm font-semibold text-foreground">{t}</p>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section>
      <SectionHeading id="workflow" kicker="Process" title="From idea to reviewed PRs" />
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
        Nothing went straight to code. Each idea became a written design, then a small plan, then a
        run of phased pull requests into a protected main branch.
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
      <SectionHeading id="review" kicker="Quality" title="An adversarial review committee" />
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
        Every substantial PR went past a panel of reviewer agents working in parallel, each with one
        job, then their notes were pulled together and worked through before merge. The whole thing
        is codified as a reusable skill in this repo. A full six-member panel looks like this:
      </p>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PANEL.map(([role, focus], i) => (
          <Card key={role}>
            <div className="flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded bg-primary/15 font-mono text-[10px] font-bold text-accent-strong">
                {i + 1}
              </span>
              <p className="text-sm font-semibold text-foreground">{role}</p>
            </div>
            <p className="mt-1.5 text-sm text-muted">{focus}</p>
          </Card>
        ))}
      </div>
      <p className="mb-3 text-sm font-medium text-foreground">A sample of what it caught:</p>
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

function ToolkitSection() {
  return (
    <section>
      <SectionHeading id="toolkit" kicker="Tooling" title="The AI toolkit" />
      <div className="grid gap-3 sm:grid-cols-2">
        <GroupCard icon={<Brain size={18} weight="duotone" />} title="Skills" rows={SKILLS} />
        <GroupCard
          icon={<Lightning size={18} weight="duotone" />}
          title="Commands"
          rows={COMMANDS}
        />
        <GroupCard icon={<Wrench size={18} weight="duotone" />} title="MCP servers" rows={MCPS} />
        <GroupCard
          icon={<PuzzlePiece size={18} weight="duotone" />}
          title="Plugins"
          rows={PLUGINS}
        />
      </div>
      <div className="mt-3 rounded-2xl border border-border bg-surface-2/40 p-4">
        <p className="text-sm leading-relaxed text-muted">
          <span className="font-semibold text-foreground">On the setup. </span>
          For this challenge I kept the MCP and plugin set lean to keep token and context overhead
          low. My fuller setup wires in more for end-to-end work: Atlassian for issues and docs,
          Slack for comms, Figma for design handoff, and Sentry for observability that auto-ingests
          and triages issues. It also pulls in specialist skills across design, security, and
          testing (unit, integration, and end to end), so a feature can move from ticket to shipped
          on the same agent harness.
        </p>
      </div>
    </section>
  );
}

function SetupSection() {
  return (
    <section>
      <SectionHeading id="setup" kicker="Environment" title="Setup and environment" />
      <div className="grid gap-3 sm:grid-cols-2">
        {ENVIRONMENT.map((e) => (
          <Card key={e.t}>
            <div className="flex items-center gap-2 text-accent-strong">
              {e.icon}
              <p className="font-display text-sm font-semibold text-foreground">{e.t}</p>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{e.d}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SplitColumn({ icon, title, rows }: { icon: ReactNode; title: string; rows: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-5">
      <div className="flex items-center gap-2 text-accent-strong">
        {icon}
        <p className="font-display text-sm font-semibold text-foreground">{title}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {rows.map((r) => (
          <li key={r} className="flex gap-2">
            <CheckCircle size={14} weight="fill" className="mt-1 shrink-0 text-accent-strong" />
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SplitSection() {
  return (
    <section>
      <SectionHeading id="split" kicker="Division of labour" title="Human vs agent" />
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
        The agent did the volume. I set the direction and owned every structural call: the
        architecture, the stack, the product shape, and the scope. The agent proposed and built, but
        the decisions were mine, and I overrode it whenever it drifted.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <SplitColumn
          icon={<Robot size={18} weight="duotone" />}
          title="Delegated to agents"
          rows={DELEGATED}
        />
        <SplitColumn icon={<Hand size={18} weight="duotone" />} title="My calls" rows={MANUAL} />
      </div>
    </section>
  );
}

function DecisionsSection() {
  return (
    <section>
      <SectionHeading id="decisions" kicker="Judgment" title="Decisions and overrides" />
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
          with Claude Code as a pair, but kept it on a tight process: agree a design first, ship
          small reviewed PRs, and run an adversarial review pass on everything. The points below
          come straight from the repo and my setup.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[11rem_1fr] lg:gap-12">
        <SideNav />
        <div className="min-w-0 space-y-16">
          <OverviewSection />
          <WorkflowSection />
          <ReviewSection />
          <ToolkitSection />
          <SetupSection />
          <SplitSection />
          <DecisionsSection />
        </div>
      </div>
    </main>
  );
}
