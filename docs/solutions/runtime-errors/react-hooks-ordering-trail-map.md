---
title: "React hooks ordering error — useMemo after early return on Trail Map page"
category: "runtime-errors"
tags:
  - react
  - hooks
  - useMemo
  - early-return
  - trail-map
  - type-consolidation
  - react-memo
  - performance
severity: critical
module: "Trail Map"
symptoms:
  - "Runtime crash on Trail Map page"
  - "React error: Rendered more hooks than during the previous render"
  - "Crash occurs when loading state transitions to loaded"
date_solved: 2026-03-18
related_files:
  - client/src/pages/project/Trail.tsx
  - client/src/pages/project/TrailMapCanvas.tsx
  - client/src/pages/project/types/trail.ts
---

# React Hooks Ordering Error on Trail Map Page

## Problem

**Error message:** `Rendered more hooks than during the previous render`

**When it occurs:** Navigating to the Trail Map page (`/projects/:projectId/trail`). The page shows a loading spinner while trail data is fetched via `useQuery`. When `isLoading` transitions from `true` to `false`, React crashes with the hooks ordering error and the component white-screens.

This is a runtime error (not caught by TypeScript) because React's Rules of Hooks are enforced at runtime by tracking the ordinal position of each hook call.

## Root Cause

React requires that **every hook is called in the exact same order on every render**. React identifies hooks by their call index (1st, 2nd, 3rd...), not by variable name. If the number of hooks changes between renders, React cannot map state to the correct hook and throws the error.

In `client/src/pages/project/Trail.tsx`, the `useMemo` for `highlightedNodesMap` was placed **after** an `if (isLoading) return` early return:

```tsx
// ... 38 hooks (useState, useQuery, useMutation, useCallback) above ...

if (isLoading) {
  return <Spinner />;  // <-- Early return exits here when loading
}

// ... non-hook derived values ...

// THIS useMemo NEVER RUNS WHEN isLoading=true
const { highlightedNodesMap, validationNodeIds } = useMemo(() => {
  // ... build validation highlight data ...
}, [validationResults, highlightIssues, selectedLayer]);
```

**What happens at runtime:**

| Render | `isLoading` | Hooks called | Result |
|--------|-------------|-------------|--------|
| 1st | `true` | N hooks, then early return | React records N hooks |
| 2nd | `false` | Same N hooks + `useMemo` = N+1 | **CRASH:** React expected N, got N+1 |

The bug is subtle — the `useMemo` isn't inside an `if` statement directly. It's placed after an early `return`, which has the same effect: the hook is conditionally reachable.

## Solution

### Fix 1 (Critical): Move `useMemo` above the early return

The `useMemo` was relocated to before the `if (isLoading)` block. Now it runs on every render, maintaining consistent hook count. During loading, it short-circuits (returns empty Map) because `validationResults` is `null`.

```tsx
// All useCallback hooks above...

// useMemo is NOW BEFORE the early return
const { highlightedNodesMap, validationNodeIds } = useMemo(() => {
  const map = new Map<string, 'unreachable' | 'orphan' | 'circular'>();
  const nodeIdSet = new Set<string>();
  if (validationResults && (highlightIssues || selectedLayer === 'validation')) {
    // ... build validation data (only when results exist) ...
  }
  return { highlightedNodesMap: map, validationNodeIds: Array.from(nodeIdSet) };
}, [validationResults, highlightIssues, selectedLayer]);

// Early return is now AFTER all hooks
if (isLoading) {
  return <Spinner />;
}
```

### Additional fixes from code review

**Fix 2: Replace O(n^2) `nodeIds.includes()` with `Set`** — Inside the `useMemo`, duplicate checking used `Array.includes()` (O(n) per call in a loop). Replaced with `Set<string>` for O(1) dedup.

**Fix 3: Extract canonical trail types to `types/trail.ts`** — Types `TrailMapNode`, `TrailMapEdge`, `TrailMapNodeType`, `TrailMapEdgeType`, and `UnlockConditionType` were duplicated across 7 files with field mismatches. Created single source of truth.

**Fix 4: Wrap `TrailMapCanvas` in `React.memo`** — Prevents re-renders of the entire ReactFlow canvas when parent state (modals, sidebar) changes but canvas props haven't.

**Fix 5: Extract MiniMap `nodeColor` to module scope** — Inline callback recreated a color map on every render. Extracted to stable module-level constant + function.

**Fix 6: Fix 4 `useCallback` dependency arrays** — Changed deps from entire mutation objects (new identity every render) to `.mutate` (stable reference), making the callbacks truly memoized.

**Fix 7: Remove debug `console.log` + `JSON.stringify`** from `updatePositionsMutation`.

**Fix 8: Remove dead `trailApi` connection methods** and `|| trailData?.connections` fallbacks.

## Key Code Changes

**10 files changed, +179 lines, -282 lines (net -103 lines)**

| File | Change |
|------|--------|
| `client/src/pages/project/Trail.tsx` | Moved `useMemo` above early return; replaced local types; fixed `useCallback` deps; removed dead fallbacks |
| `client/src/pages/project/TrailMapCanvas.tsx` | Removed 66 lines of duplicate types; added `React.memo`; extracted minimap color function |
| `client/src/pages/project/types/trail.ts` | **NEW** — canonical type definitions (74 lines) |
| `client/src/lib/api.ts` | Removed 3 dead `connection` API methods |
| 6 component files | Import types from `types/trail.ts` instead of defining locally |

## Verification

- **TypeScript:** `npx tsc --noEmit` — zero errors
- **Vite build:** `npx vite build` — succeeds cleanly
- **Hook count:** All 41 hooks in `Trail.tsx` execute unconditionally before the early return on every render

## Prevention

### The Rule

All hooks must be called **unconditionally** before any early returns. This is a hard requirement of the React runtime, not a style preference.

### Safe Component Structure

```tsx
function MyComponent({ data, isLoading }: Props) {
  // PHASE 1: ALL HOOKS (unconditional, every render)
  const [state, setState] = useState(initialValue);
  const memoized = useMemo(() => compute(data), [data]);
  const callback = useCallback(() => action(), []);

  // PHASE 2: EARLY RETURNS (after all hooks)
  if (isLoading) return <Spinner />;
  if (!data) return <EmptyState />;

  // PHASE 3: DERIVED VALUES (plain JS, no hooks)
  const filtered = data.items.filter(item => item.active);

  // PHASE 4: JSX
  return <div>{filtered.map(...)}</div>;
}
```

The boundary between Phase 1 and Phase 2 is the critical line. No hook may appear in Phase 2, 3, or 4.

### When This Bug Recurs

- **Adding a new hook** at the logical point where its value is used (Phase 3), not realizing it must go in Phase 1
- **Adding an early return** above existing hook calls
- **Refactoring** that reorders hooks relative to conditional returns

### Automated Prevention

The ESLint rule `react-hooks/rules-of-hooks` catches this at lint time. The package `eslint-plugin-react-hooks` is installed in this project but **no ESLint config file exists**, so the rule is not active. Creating an `.eslintrc.cjs` that extends `plugin:react-hooks/recommended` would catch this class of bug automatically.

### Code Review Checklist

- [ ] All hooks are grouped at the top of the component, above any early returns
- [ ] No new `return` statements were added above existing hook calls
- [ ] No hook calls inside `if`, `for`, `while`, or ternary expressions
- [ ] `useMemo`/`useCallback` for new derived values are in Phase 1, not inline

## Related Documentation

- [`docs/solutions/build-errors/typescript-spread-unknown-phantom-edge-render-cascade.md`](../build-errors/typescript-spread-unknown-phantom-edge-render-cascade.md) — Related Trail Map fixes including TypeScript errors, phantom edge bug, and render cascade performance issues involving `useMemo`/`useCallback` placement
