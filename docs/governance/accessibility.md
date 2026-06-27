# Accessibility

The demo FE is small, but accessibility is a baseline, not a feature.

## Targets

- WCAG 2.1 AA for the demo UI.

## Practices

- **Semantic HTML** first; ARIA only to fill genuine gaps. shadcn/ui (Radix)
  primitives give accessible dialogs, tabs, and toggles out of the box.
- **Keyboard**: every interactive element is reachable and operable by keyboard,
  with visible focus states. The upload area accepts keyboard + drag-drop.
- **Status updates** (generating, failover, done, failed) are announced via an
  `aria-live` region so progress isn't visual-only.
- **Color is not the only signal**, status uses icon + text, not just color.
  Contrast meets AA.
- **Images** carry meaningful `alt` text; decorative images are marked as such.
- **Motion**: animations are subtle and respect `prefers-reduced-motion`.

## Checks

Manual keyboard pass + an automated axe check on the main page before release.
