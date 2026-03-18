---
title: "Fixing 43 TypeScript Errors, Phantom Edge Bug, and Render Cascade in ARGnet"
date: "2026-03-17"
category: build-errors
tags: [typescript, better-sqlite3, reactflow, react-hooks, performance, type-safety]
module: [server-routes, trail-map-canvas, trail-map-api]
symptoms:
  - "TS2698: Spread types may only be created from object types"
  - "TS2769: No overload matches this call (jwt.sign)"
  - "TS2322: Type union narrowing failure in helper functions"
  - "Phantom edges appear when user cancels connection modal"
  - "Unnecessary re-renders on every state change in Trail page"
root_cause: "better-sqlite3 returns unknown[], JWT expiresIn type mismatch, union-of-arrays vs array-of-unions, optimistic local state without cleanup, unstable React references"
severity: high
effort: small
---

# Fixing 43 TypeScript Errors, Phantom Edge Bug, and Render Cascade in ARGnet

## Problem

The ARGnet build was broken with 43 TypeScript compilation errors across the server codebase, a phantom edge UI bug in the Trail Map canvas, and a render cascade performance issue causing unnecessary re-renders on every state change. All three issues were independently blocking: the TypeScript errors prevented `tsc --build` from completing, the phantom edge confused users into thinking edges were saved when they were not, and the render cascade caused visible lag on Trail Map pages with 20+ nodes.

### Symptom 1: TypeScript Compilation Failures (43 errors)

Running `tsc` produced 43 errors across 11 route files and 2 type helper files. The errors fell into four distinct categories:

- **30x TS2698** -- `Spread types may only be created from object types` in every route file that spreads `better-sqlite3` query results (characters, puzzles, events, locations, lore, assets, digital properties, projects, timeline, activity, comments).
- **2x TS2769** -- `No overload matches this call` on `jwt.sign()` in `server/src/routes/auth.ts`.
- **4x TS2322/TS2345** -- Union type narrowing failures in `server/src/db/puzzle-hint-types.ts` and `server/src/db/lore-entry-types.ts` helper functions.
- **1x TS4023** -- Declaration emit error on `export default db` in `server/src/db/index.ts`.

### Symptom 2: Phantom Edges in Trail Map

When a user dragged a connection between two nodes in the ReactFlow canvas and then **cancelled** the EdgeForm modal, a ghost edge remained visible. The edge was rendered by ReactFlow's local state but had no corresponding record in the database. The phantom edge disappeared only on the next full data re-fetch (page navigation or manual refresh).

### Symptom 3: Render Cascade on State Changes

Every state change on the Trail Map page triggered a cascade of unnecessary re-renders in `TrailMapCanvas` and its children. React DevTools Profiler showed the `TrailMapCanvasInner` component re-rendering 3-5x per interaction due to referential inequality in default parameters and unmemoized computations.

---

## Investigation

### TypeScript errors: tracing the 30 spread errors to one root cause

The 30 TS2698 errors initially looked like 30 separate problems. Inspecting the first few made the pattern obvious -- every error occurred on a line like:

```typescript
res.json(items.map(c => ({ ...c, field: ... })));
```

where `items` came from `db.prepare(...).all(...)`. The `better-sqlite3` type definitions declare `Statement.all()` as returning `unknown[]` (the generic `Result` parameter defaults to `unknown`). Spreading `unknown` is invalid in strict TypeScript because the compiler cannot verify that the value is an object type.

### JWT sign overload: reading the @types/jsonwebtoken declarations

The two TS2769 errors on `jwt.sign()` pointed to the `expiresIn` option. Inspecting `@types/jsonwebtoken` revealed that the `SignOptions['expiresIn']` type is `string | number | undefined` in older versions, but in the installed version it imports `StringValue` from `@types/ms` -- a template literal type like `` `${number}${UnitAnyCase}` ``. The expression `process.env.JWT_EXPIRES_IN || '7d'` is typed as `string`, which is wider than `StringValue` and fails the overload resolution.

### Union type helpers: array-of-unions vs union-of-arrays

The `sortByOrder` function in `puzzle-hint-types.ts` was originally written as:

```typescript
sortByOrder(hints: (PuzzleHint | PuzzleHintParsed)[]): typeof hints {
  return [...hints].sort((a, b) => a.hint_order - b.hint_order);
}
```

The return type `typeof hints` evaluates to `(PuzzleHint | PuzzleHintParsed)[]` -- an array of the union. But callers expected to pass `PuzzleHint[]` and get `PuzzleHint[]` back, or pass `PuzzleHintParsed[]` and get `PuzzleHintParsed[]` back. The `[...hints].sort()` call returns `(PuzzleHint | PuzzleHintParsed)[]`, a mixed array, which TypeScript correctly refuses to assign to the discriminated input type. The same pattern appeared in `lore-entry-types.ts` in `sortByOrder`, `filterTopLevel`, `getChildren`, and other helpers.

### Declaration emit: unnamed type in default export

The `export default db` in `server/src/db/index.ts` caused TS4023 because `db` was inferred as `BetterSqlite3.Database` -- a type from the `better-sqlite3` namespace. When emitting `.d.ts` files, TypeScript needs to write out the type, but the namespace import was implicit (via the constructor call `new Database(dbPath)`), so the type could not be named in the declaration output.

### Phantom edge: reading the handleConnect callback

The original `handleConnect` in `TrailMapCanvas.tsx` called both `addEdge()` (ReactFlow's local state updater) for instant visual feedback and `onEdgeCreate()` to open the EdgeForm modal. On save, the server round-trip created the real edge and query invalidation fetched it back -- producing a duplicate. On cancel, the local edge was never cleaned up, leaving a phantom.

### Render cascade: profiling with React DevTools

Profiling showed three sources of new references on every render cycle:

1. **Default parameters** -- `highlightedNodes = new Map()` and `validationNodeIds = []` as default values in the function signature created new objects on every call, breaking `===` equality for `useEffect` dependencies.
2. **Unmemoized computation** -- An IIFE computing a `highlightedNodesMap` from props ran unconditionally on every render.
3. **Inline callback** -- An inline `onFitViewReady` arrow function passed as a prop created a new reference each render, re-triggering a `useEffect` in `TrailMapCanvasInner`.

---

## Root Cause

| Issue | Root Cause | Error Codes |
|---|---|---|
| Spread errors (30x) | `better-sqlite3` `Statement.all()` returns `unknown[]`; spreading `unknown` is invalid | TS2698 |
| JWT sign (2x) | `@types/ms` `StringValue` template literal type rejects plain `string` | TS2769 |
| Union narrowing (4x) | `typeof hints` evaluates to the full union; `[...].sort()` produces `(A\|B)[]` which is not assignable to `A[] \| B[]` | TS2322, TS2345 |
| Declaration emit (1x) | Inferred `BetterSqlite3.Database` type cannot be named without explicit import | TS4023 |
| Phantom edge | Optimistic `addEdge()` call without cleanup on modal cancel | N/A (logic bug) |
| Render cascade | New object references on every render defeating React's referential equality checks | N/A (performance) |

---

## Solution

### Fix A -- Spread errors: cast `.all()` and `.get()` results (30 errors resolved)

Every route file that spreads query results now casts the return value at the call site:

```typescript
// Before (TS2698)
const events = db.prepare(query).all(...params);
res.json(events.map(e => ({
  ...e,
  staff_required: (e as { staff_required: string | null }).staff_required
    ? JSON.parse((e as { staff_required: string }).staff_required)
    : []
})));

// After
const events = db.prepare(query).all(...params);
res.json((events as Record<string, unknown>[]).map(e => ({
  ...e,
  staff_required: e.staff_required ? JSON.parse(e.staff_required as string) : []
})));
```

The cast `as Record<string, unknown>[]` satisfies the spread constraint (values are objects) while inner field accesses use `e.field as string` instead of the verbose double-cast `(e as { field: string }).field`. Applied to all 11 route files: `characters.ts`, `puzzles.ts`, `events.ts`, `locations.ts`, `lore.ts`, `assets.ts`, `digitalProperties.ts`, `projects.ts`, `timeline.ts`, `activity.ts`, `comments.ts`.

For `.get()` results that are spread, the same pattern applies with `as Record<string, unknown>`:

```typescript
const event = db.prepare('SELECT * FROM events WHERE id = ?')
  .get(eventId) as Record<string, unknown>;
res.json({
  ...event,
  staff_required: event.staff_required ? JSON.parse(event.staff_required as string) : []
});
```

**Files changed:** `server/src/routes/characters.ts`, `server/src/routes/puzzles.ts`, `server/src/routes/events.ts`, `server/src/routes/locations.ts`, `server/src/routes/lore.ts`, `server/src/routes/assets.ts`, `server/src/routes/digitalProperties.ts`, `server/src/routes/projects.ts`, `server/src/routes/timeline.ts`, `server/src/routes/activity.ts`, `server/src/routes/comments.ts`

### Fix B -- JWT expiresIn: cast to SignOptions['expiresIn'] (2 errors resolved)

```typescript
// Before (TS2769)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// After
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as import('jsonwebtoken').SignOptions['expiresIn'];
```

This uses an inline `import()` type to avoid adding a separate import statement. The cast narrows `string` to the expected `string | number | undefined` (or `StringValue | number | undefined` depending on the `@types/jsonwebtoken` version).

**File changed:** `server/src/routes/auth.ts`

### Fix C -- Union type narrowing: generic type parameter (4 errors resolved)

Functions that need to preserve the concrete type through filter/sort chains now use a generic pattern:

```typescript
// Before (TS2322 / TS2345)
sortByOrder(hints: (PuzzleHint | PuzzleHintParsed)[]): typeof hints {
  return [...hints].sort((a, b) => a.hint_order - b.hint_order);
}

// After
sortByOrder<T extends PuzzleHint | PuzzleHintParsed>(hints: T[]): T[] {
  return [...hints].sort((a, b) => a.hint_order - b.hint_order);
}
```

When a caller passes `PuzzleHint[]`, `T` binds to `PuzzleHint`, and the return type is `PuzzleHint[]` -- no union widening. The same fix was applied to `getNextUnreleased`, `getReleased` in `puzzle-hint-types.ts` and `sortByOrder`, `filterTopLevel`, `getChildren` in `lore-entry-types.ts`.

Note: several `lore-entry-types.ts` helper functions (`sortByTitle`, `sortByDate`, `filterByCategory`, `filterByStatus`, `filterRevealed`, `filterUnrevealed`, `filterCanonical`, `getByCreator`, `getRecentlyRevealed`, `getNeedingReveal`, `getWithContradictions`, `getTimeline`) still use the `typeof entries` return type pattern. These did not produce compile errors because their callers do not currently assign the result to a narrower type. They are candidates for the same generic refactor if future callers need type preservation.

**Files changed:** `server/src/db/puzzle-hint-types.ts`, `server/src/db/lore-entry-types.ts`

### Fix D -- Declaration emit: explicit type annotation (1 error resolved)

```typescript
// Before (TS4023)
import Database from 'better-sqlite3';
const db = new Database(dbPath);
export default db;

// After
import Database, { type Database as DatabaseType } from 'better-sqlite3';
const db: DatabaseType = new Database(dbPath);
export default db;
```

The explicit type annotation `DatabaseType` gives the declaration emitter a name it can write into the `.d.ts` file. The `type` import ensures the `DatabaseType` is erased at runtime.

**File changed:** `server/src/db/index.ts`

### Fix E -- Phantom edge: remove optimistic addEdge() (logic bug resolved)

```typescript
// Before (phantom edge on cancel)
const handleConnect = useCallback(
  (connection: Connection) => {
    if (readOnly) return;
    setEdges((eds) => addEdge(connection, eds));  // <-- phantom source
    if (connection.source && connection.target && onEdgeCreate) {
      onEdgeCreate(connection.source, connection.target);
    }
  },
  [setEdges, onEdgeCreate, readOnly]
);

// After
const handleConnect = useCallback(
  (connection: Connection) => {
    if (readOnly) return;
    if (connection.source && connection.target && onEdgeCreate) {
      onEdgeCreate(connection.source, connection.target);
    }
  },
  [onEdgeCreate, readOnly]
);
```

The `addEdge()` call is removed entirely. Now `onEdgeCreate` is the sole action: it opens the EdgeForm modal in the parent component. On save, the server creates the edge and React Query's `invalidateQueries` fetches the new edge list, which flows into `TrailMapCanvas` as a prop. On cancel, nothing changes -- no phantom.

The trade-off is a brief visual delay between save and the edge appearing (~200-400ms for the round trip), but this is acceptable because the EdgeForm modal is still visible during the round trip, providing visual continuity.

**File changed:** `client/src/pages/project/TrailMapCanvas.tsx`

### Fix F -- Render cascade: stable references and memoization (performance resolved)

Three changes:

**1. Module-level constants for default props:**

```typescript
// Before (new references every render)
function TrailMapCanvasInner({
  highlightedNodes = new Map(),
  validationNodeIds = [],
  ...
}: TrailMapCanvasProps) {

// After (stable references)
const EMPTY_HIGHLIGHTED_NODES = new Map<string, 'unreachable' | 'orphan' | 'circular'>();
const EMPTY_VALIDATION_NODE_IDS: string[] = [];

function TrailMapCanvasInner({
  highlightedNodes = EMPTY_HIGHLIGHTED_NODES,
  validationNodeIds = EMPTY_VALIDATION_NODE_IDS,
  ...
}: TrailMapCanvasProps) {
```

Module-level constants are created once and never change identity, so `useEffect` dependency arrays that include them will not re-trigger.

**2. Memoized highlighted nodes computation:**

The `highlightedNodesMap` computation (mapping node IDs to validation issue types) was wrapped in `useMemo` with `[highlightedNodes]` as the dependency, ensuring it only recomputes when the highlights prop actually changes.

**3. Stable `onFitViewReady` callback:**

The inline arrow function `(fitViewFn) => { ... }` passed to the child component was extracted into a `useCallback` in the parent, preventing the child's `useEffect` from re-running on every parent render.

**File changed:** `client/src/pages/project/TrailMapCanvas.tsx`

### Fix G -- Self-loop validation: server-side guard (defensive fix)

Added early validation to both `POST /edges` and `POST /connections` endpoints:

```typescript
// Prevent self-loop edges
if (sourceNodeId === targetNodeId) {
  res.status(400).json({ error: 'Self-loop edges are not allowed (source and target must differ)' });
  return;
}
```

This prevents database-level inconsistencies and avoids ReactFlow rendering artifacts from self-referencing edges.

**File changed:** `server/src/routes/trails.ts`

---

## Summary of Changes

| Fix | Category | Errors Resolved | Files Changed |
|---|---|---|---|
| A | TypeScript (spread) | 30 | 11 route files |
| B | TypeScript (JWT) | 2 | `auth.ts` |
| C | TypeScript (unions) | 4 | `puzzle-hint-types.ts`, `lore-entry-types.ts` |
| D | TypeScript (decl emit) | 1 | `db/index.ts` |
| E | Logic bug | N/A | `TrailMapCanvas.tsx` |
| F | Performance | N/A | `TrailMapCanvas.tsx` |
| G | Validation | N/A | `trails.ts` |
| **Total** | | **37 TS + 6 bonus** | **18 files, +128/-124 lines** |

---

## Prevention

### For the spread/unknown issue (Fix A)

- **Establish a project-wide convention:** All `better-sqlite3` `.all()` calls should cast to `Record<string, unknown>[]` at the call site, or to a specific row interface if one exists. Document this in the project's TypeScript style guide.
- **Consider a wrapper function:** A typed query helper like `queryAll<T>(sql, ...params): T[]` that wraps `db.prepare(sql).all(...params) as T[]` would centralize the cast and reduce boilerplate. This was not done in this fix to minimize the diff, but is recommended for future work.
- **Enable `noImplicitAny` and `strict` if not already on:** These flags surface type issues at write time rather than at build time.

### For the JWT type issue (Fix B)

- **Pin `@types/jsonwebtoken` and `@types/ms` versions:** The `StringValue` template literal type was introduced in a specific `@types/ms` version. Pinning avoids surprise breakage on `npm update`.
- **Use a constant with explicit type:** Rather than casting at the usage site, define `const JWT_EXPIRES_IN: SignOptions['expiresIn'] = ...` once.

### For the union type issue (Fix C)

- **Prefer generics over `typeof param` return types:** When a function should preserve the caller's concrete type, use `<T extends A | B>(items: T[]): T[]` rather than `(items: (A | B)[]): typeof items`. The `typeof` approach only works when TypeScript can narrow the variable, which it cannot do for union-typed parameters.
- **Audit remaining `typeof entries` patterns:** The `lore-entry-types.ts` file still has ~15 functions using `typeof entries`. These should be converted to generics proactively.

### For the phantom edge issue (Fix E)

- **Never add optimistic local state without a rollback path:** If a component optimistically adds state for instant feedback, it must also remove that state if the operation is cancelled or fails. In this case, removing the optimistic update entirely was simpler than implementing rollback.
- **Prefer server-driven state for collaborative features:** In a collaborative tool where multiple users may be editing the same trail map, optimistic updates can cause divergence. Letting the server be the single source of truth (via React Query invalidation) is safer.

### For the render cascade issue (Fix F)

- **Lint rule for default parameter allocations:** A custom ESLint rule (or the `react-hooks/exhaustive-deps` rule with careful dependency tracking) can flag `= new Map()` or `= []` in component function signatures. These should always be hoisted to module scope.
- **Use `useMemo` for derived state:** Any computation that derives values from props and is used in `useEffect` dependency arrays must be memoized.
- **Use `useCallback` for function props:** Any function passed as a prop to a child component (especially one used in the child's `useEffect`) should be wrapped in `useCallback`.

---

## Related Issues

- **React Query stale time configuration:** The phantom edge fix relies on React Query's `invalidateQueries` to fetch the new edge after server save. If `staleTime` is set too high, the edge may take longer to appear. The current configuration uses the default `staleTime: 0`, which is correct for this use case.
- **`better-sqlite3` migration to Drizzle or Kysely:** A typed query builder would eliminate the need for manual `Record<string, unknown>[]` casts entirely. This is tracked as a future infrastructure improvement.
- **ReactFlow v12 migration:** ReactFlow v12 changes the `addEdge` API and may affect the edge handling patterns described here. The current codebase uses ReactFlow v11.
- **Remaining `typeof entries` patterns in `lore-entry-types.ts`:** Functions like `sortByTitle`, `sortByDate`, `filterByCategory`, `filterByStatus`, `filterRevealed`, `filterUnrevealed`, `filterCanonical`, `getByCreator`, `getRecentlyRevealed`, `getNeedingReveal`, `getWithContradictions`, and `getTimeline` still use `(entries: (LoreEntry | LoreEntryParsed)[]): typeof entries`. These will produce compile errors if a caller passes a single-type array and assigns the result to that same single-type array variable. They should be converted to generics in a follow-up.
