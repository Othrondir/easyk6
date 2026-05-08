# Phase 2: Upstream Sync & k6 Adaptation - Research

**Researched:** 2026-05-08
**Domain:** Source-to-source code transformation (Playwright POMs → k6 browser POMs); cross-platform Node sync workflow
**Confidence:** HIGH

## Summary

Phase 2 implements three commands that together realize UPST-01/02/03: `sync:src` (idempotent local-or-git copy of `easyPlaywright/src/pages/` into `easyk6/src/pages/`), `convert-pages` (Node port of `ir-perf-k6/config/convert-to-k6.sh` that emits k6-safe modules under `lib/pages/`), and the patch-injection mechanism (`lib/pages-k6-patches/<rel>.k6-patch.ts` fragments concatenated into generated POMs before `// #endregion`).

The research surfaces a critical asymmetry between the ir-perf-k6 reference and the EasyK6 target: **ir-perf-k6 was built against an older k6 browser API where `getByText`, `getByRole`, `.first()`, `.clear()`, and Playwright-style `expect()` were absent**. As of k6 1.5 (the locked toolchain version), all of those exist natively or via the official `k6-testing` jslib (Playwright-compatible assertions). The locked decision D-32 still requires parity with ir-perf-k6's transform rules, so the converter MUST implement them — but the recruiter-facing narrative should acknowledge that several transforms are defensive/idiomatic, not strictly required for the converted code to run on k6 1.5.

The upstream POMs (`BasePage`, `HomePage`, `AboutPage`, `PostPage`, plus four `components/`) contain exactly the patterns the converter must handle: `expect(X).toBeVisible()` (4 sites), `expect(X).toHaveTitle/toHaveText/toHaveAttribute` (3 sites in `BasePage` only), `.first()` (~21 sites), no `getByTitle/getByText/getByRole/getByTestId`, no `// #endregion` markers. All POMs `extends BasePage` and call `super(page)` already. **No `getBy*` calls exist in upstream**, so the selector-shim transform rules are effectively dead code for this milestone — but D-32 mandates parity, so they ship to keep behavior correct against future upstream changes.

**Primary recommendation:** Build the converter as a 5-stage pipeline (import strip → import inject → class extends K6Page → balanced-paren expect walker → simple regex transforms → patch injection), driven by a locked transform table. Author the K6Page base + selector shim by hand from the ir-perf-k6 contract. Ship one demonstrative `HomePage` patch (e.g., `measureNavigation()` timing helper) to prove the injection mechanism survives a fresh sync→convert cycle. Use the ALL-mode dependency-free approach — no scenario/import-graph walking — since upstream has only 4 POMs + 4 components.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Upstream source mode (sync:src):**
- **D-22:** `sync:src` supports two modes: local filesystem copy (default) and git clone. Recruiter-friendly local path keeps the showcase zero-network; git mode keeps the pipeline portable to a clean checkout.
- **D-23:** Default upstream source path is `../easyPlaywright` (sibling repo). Override via `--source <path>` flag or `EASYPLAYWRIGHT_SRC` env var.
- **D-24:** Git mode is opt-in via `--repo <url>` and `--branch <ref>` flags; mirrors `ir-perf-k6/scripts/sync-frontend-src.mjs` shape (depth=1 clone into temp dir, then copy `src/pages/`).
- **D-25:** Sync only mirrors upstream `src/pages/` into local `src/pages/`. Other upstream content (`src/data/`, `src/fixtures/`, `src/utils/`, `src/tests/`) is out of scope for v1 — POMs are the recruiter-facing artifact.
- **D-26:** Sync is idempotent: `src/pages/` is emptied before copy. Local edits there are by definition non-persistent (the patches layer holds anything that must survive).
- **D-27:** `src/pages/.sync-meta.json` is written on every sync with `{ source, mode, branch?, commit?, syncedAt }`. Recruiters can read where the upstream came from at a glance.
- **D-28:** Non-CI runs prompt before wiping `src/pages/`. `--yes` and `CI=1` skip the prompt. Mirrors `sync-frontend-src.mjs` UX.

**Conversion engine (convert-pages):**
- **D-29:** Conversion is implemented in Node.js (ESM `.mjs`), not Bash. The host is Windows-friendly and the existing `scripts/*.mjs` Phase 1 baseline already proves the pattern; bash+sed pipelines from `ir-perf-k6` would require WSL or Git Bash for recruiters.
- **D-30:** Transform strategy: line/regex rewrites for the simple rules, balanced-parentheses walker (Node port of the python routine in `convert-to-k6.sh`) handles `expect(...).toBeVisible()` etc.
- **D-31:** `convert-pages` runs in ALL mode for v1 — every `*.ts` under `src/pages/` is converted. No selective dependency-graph walk in this milestone.
- **D-32:** Conversion fidelity matches `ir-perf-k6/config/convert-to-k6.sh` rules at parity for the patterns present in easyPlaywright POMs. (Full rule list in CONTEXT.md.)
- **D-33:** Generated files are written with a header banner: `// K6-compatible version - Auto-generated from Playwright Page Object` plus source path.
- **D-34:** `convert-pages` clears `lib/pages/` (except `lib/pages/base/`) before generating, so deleted upstream POMs don't leave orphan generated files.
- **D-35:** Conversion errors are reported per file but don't abort the run; exit code is non-zero if any file failed.

**K6Page base class:**
- **D-36:** A hand-written `lib/pages/base/base-page.ts` (exporting `K6Page`) is the parent every generated POM extends. Adapts the ir-perf-k6 K6Page contract.
- **D-37:** `lib/pages/base/base-page.ts` is hand-authored, lives alongside the generated POMs but outside the wipe path.
- **D-38:** Selector wrapper (`this.selectors.getByText/getByRole/getByTestId`) is a thin shim over k6 browser locators. Lives at `lib/pages/base/selectors.ts`.

**Patch layer (lib/pages-k6-patches):**
- **D-39:** Patch mechanism is file-injection: a patch file at `lib/pages-k6-patches/<rel>.k6-patch.ts` is concatenated into the generated `lib/pages/<rel>.ts` immediately before the last `// #endregion` marker.
- **D-40:** When the upstream POM has no `// #endregion` marker, the patch is injected before the final closing brace of the class.
- **D-41:** Patch files are plain TypeScript fragments (method bodies inside an existing class scope), not module files.
- **D-42:** v1 ships at least one demonstration patch on `HomePage` so the mechanism is provably load-bearing.
- **D-43:** `convert-pages` logs `↳ Injecting k6-specific methods from: <patch>` whenever a patch is applied.
- **D-44:** Patches must survive a fresh `sync:src` + `convert-pages` round-trip without manual intervention. UPST-03 acceptance check.

**Plan split:**
- **D-45:** 02-01-PLAN.md owns sync workflow and source-folder boundaries.
- **D-46:** 02-02-PLAN.md owns the converter, K6Page base, selector shim, patch-layer injection, and the demonstration patch.

### Claude's Discretion
- Exact module names within `lib/pages/base/` (e.g., `selectors.ts` vs `k6-selectors.ts`)
- Internal helper functions inside `scripts/sync-src.mjs` and `scripts/convert-pages.mjs`
- Wording of error/progress messages from sync and convert (must stay clear and recruiter-friendly)
- Whether the balanced-paren walker is one inline function or a tiny helper module
- Exact contents of the demonstration k6 patch on `HomePage`, as long as it exercises the injection mechanism end-to-end

### Deferred Ideas (OUT OF SCOPE)
- **Selective conversion mode** (only convert POMs imported by k6 scenarios) — useful once the scenario tree grows
- **Sync of upstream `src/data/` and `src/fixtures/`** — defer until Phase 3+ needs shared test data
- **Generic multi-upstream adapter** — already explicitly out of scope per REQUIREMENTS.md
- **AST-based conversion via ts-morph** — cleanest long-term approach; deferred (regex+walker is sufficient)
- **Conversion of upstream `src/tests/` Playwright specs into k6 scenarios** — explicit non-goal; scenarios are hand-written in Phase 3
- **Patch validation step** that diffs generated output before/after patch injection — nice to have; not required

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UPST-01 | Maintainer can sync Playwright Page Objects from `easyPlaywright` into `easyk6` with a documented scripted command | "Sync Mode Reference Implementation" + ".sync-meta.json schema" sections; canonical ref `ir-perf-k6/scripts/sync-frontend-src.mjs` |
| UPST-02 | Synced upstream page objects can be converted into k6-compatible modules without manual locator rewrites inside scenario files | "Conversion Rule Inventory" + "K6Page Contract" + "Selector Shim" sections; canonical ref `ir-perf-k6/config/convert-to-k6.sh` |
| UPST-03 | k6-specific extensions survive repeated upstream sync/conversion cycles through a preserved patch mechanism | "Patch Injection Algorithm" + "Idempotency Boundaries" + "Round-Trip Test" sections; canonical ref `ir-perf-k6/lib/pages-k6-patches/` |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Upstream POM source acquisition | Build/Tooling (Node script) | — | Sync runs at maintainer time, not k6 runtime; nothing to do with browser/server. |
| Source-to-source conversion | Build/Tooling (Node script) | — | Pure source transformation; emits TypeScript that downstream Vite consumes. |
| K6Page abstract base + selector shim | Library/Runtime (k6) | — | Hand-authored TS that ships into the k6 build via `lib/pages/base/`. Runs inside k6 browser VU. |
| Patch fragment injection | Build/Tooling (Node script) | Library/Runtime (k6) | Injection happens at convert time; injected code executes inside k6 VU. |
| Sync provenance (`.sync-meta.json`) | Build/Tooling (filesystem artifact) | Documentation | Recruiter-readable metadata; not consumed by k6 runtime. |
| Round-trip verification | Test infrastructure (Node) | — | `node --test` exercises the convert pipeline; doesn't require k6 runtime. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs` / `node:fs/promises` | Node 22 builtin | All filesystem ops (read, write, copy, mkdtemp, rm) | Phase 1 scripts pattern — no extra deps. `[VERIFIED: Node 22.20 installed]` |
| `node:path` | Node 22 builtin | Cross-platform path joining (Windows-safe) | Critical: hardcoded `/` separators break on Windows. `[VERIFIED]` |
| `node:child_process` (`spawn`) | Node 22 builtin | `git clone` invocation for sync git mode | `ir-perf-k6/scripts/sync-frontend-src.mjs:78` uses this exact pattern. `[CITED]` |
| `node:os` (`tmpdir`, `mkdtemp`) | Node 22 builtin | Temp dir for git clone | Same pattern as ref impl. `[CITED]` |
| `node:readline` | Node 22 builtin | Confirmation prompt | Same as `sync-frontend-src.mjs:101-106`. `[CITED]` |
| `commander` | 11.1.0 (already installed) | CLI flag parsing | Already used by `perf-runner.mjs` in Phase 1 — keep convention. `[VERIFIED: package.json]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:test` + `node:assert/strict` | Node 22 builtin | Unit tests for sync/convert | Established Phase 1 pattern (`tests/unit/*.test.mjs`). |
| `typescript` | 5.9.3 (already installed) | `ts.transpileModule()` for loading `.ts` modules in tests | Same pattern as `tests/unit/runtime-config.test.mjs`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex + balanced-paren walker | `ts-morph` (TypeScript AST) | AST cleaner, but adds 500KB+ dev dep + 50ms+ startup. Deferred per CONTEXT.md. |
| Node port of bash converter | Spawn the original `convert-to-k6.sh` | Requires bash on Windows (WSL/Git Bash). Violates D-29 cross-platform mandate. |
| Custom selector shim | Use k6 1.5 native `getByText/getByRole/getByTestId` | Native exists in k6 1.5, but D-38 locks the shim wrapper. Shim provides API stability against k6 minor version changes. |
| `expect→waitFor` walker transform | Vendor `k6-testing` jslib (Playwright-compat assertions) | k6-testing supports `toBeVisible/toHaveText/toHaveAttribute/toHaveTitle` directly. D-32 locks ir-perf-parity, so walker ships. **NOTE: ir-perf actually does both — it transforms `toBeVisible` to `waitFor` AND injects `import { expect } from '@lib/vendor/k6-testing-wrapper.js'` for residual `toHaveText`/etc. that get commented out.** Keep parity. |

**Installation:** No new dependencies. Phase 2 uses only Node builtins + `commander` from Phase 1.

**Version verification:**
```bash
node --version  # v22.20.0 verified [VERIFIED 2026-05-08]
npm view commander version  # latest: 14.x; we use 11.1.0 [VERIFIED: package.json]
k6 version  # k6.exe v1.5.0 [VERIFIED 2026-05-08]
```

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────────┐
                    │           MAINTAINER LOCAL MACHINE              │
                    └─────────────────────────────────────────────────┘
                                          │
            ┌─────────────────────────────┴────────────────────────────┐
            │                                                          │
            ▼                                                          ▼
  ┌─────────────────────┐                                   ┌─────────────────────┐
  │  ../easyPlaywright  │                                   │  github.com         │
  │  (sibling repo)     │                                   │  /Othrondir         │
  │  src/pages/*.ts     │                                   │  /easyPlaywright    │
  └──────────┬──────────┘                                   └──────────┬──────────┘
             │ default mode                                            │ git mode
             │ (--source / EASYPLAYWRIGHT_SRC)                         │ (--repo / --branch)
             │                                                         │ depth=1 clone → tmpdir
             └──────────────────────────┬──────────────────────────────┘
                                        │
                                        ▼
                          ┌─────────────────────────────┐
                          │  scripts/sync-src.mjs       │
                          │  • prompt unless --yes/CI=1 │
                          │  • empty src/pages/         │
                          │  • copy upstream src/pages/ │
                          │  • write .sync-meta.json    │
                          └──────────────┬──────────────┘
                                         │
                                         ▼
                          ┌─────────────────────────────┐
                          │  src/pages/                 │
                          │  ├── BasePage.ts            │
                          │  ├── HomePage.ts            │
                          │  ├── AboutPage.ts           │
                          │  ├── PostPage.ts            │
                          │  ├── components/*.ts        │
                          │  ├── index.ts               │
                          │  └── .sync-meta.json        │
                          └──────────────┬──────────────┘
                                         │
                                         │ npm run convert-pages
                                         ▼
                          ┌─────────────────────────────┐
                          │  scripts/convert-pages.mjs  │
                          │  • wipe lib/pages/* (keep   │
                          │    base/)                   │
                          │  • for each *.ts:           │
                          │    1. strip @playwright     │
                          │    2. inject k6 imports     │
                          │    3. class X extends       │
                          │       K6Page                │
                          │    4. expect()→waitFor()    │
                          │       (balanced-paren)      │
                          │    5. .first/.clear/.last   │
                          │       transforms            │
                          │    6. selector shim routing │
                          │    7. inject patch (if any) │
                          │    8. write banner+content  │
                          └──────────────┬──────────────┘
                                         │
                  ┌──────────────────────┴───────────────────────┐
                  │                                              │
                  ▼                                              ▼
   ┌─────────────────────────┐                     ┌─────────────────────────┐
   │  lib/pages/             │                     │  lib/pages-k6-patches/  │
   │  ├── base/  (HAND-AUTH) │◄────injection───────│  ├── HomePage.k6-       │
   │  │   ├── base-page.ts   │                     │  │     patch.ts        │
   │  │   └── selectors.ts   │                     │  └── (other patches)   │
   │  ├── HomePage.ts (GEN)  │                     │  TS fragments only,    │
   │  ├── AboutPage.ts (GEN) │                     │  no imports, no class  │
   │  ├── PostPage.ts (GEN)  │                     │  declaration           │
   │  ├── BasePage.ts (GEN)  │                     └─────────────────────────┘
   │  ├── components/  (GEN) │
   │  └── index.ts (GEN)     │
   └────────────┬────────────┘
                │ Phase 3 imports via @pages alias
                ▼
   ┌─────────────────────────┐
   │  k6/scenarios/*.ts      │
   │  k6/simulations/**/.ts  │
   │  (Phase 3+ work)        │
   └─────────────────────────┘
```

### Recommended Project Structure

```
easyk6/
├── scripts/
│   ├── sync-src.mjs                # ESM CLI: local-or-git copy of src/pages/
│   ├── convert-pages.mjs           # ESM CLI: orchestrate transforms + patches
│   └── lib/                        # OPTIONAL: split convert helpers if file gets long
│       ├── transforms.mjs          # pure transform functions (testable)
│       └── patch-injector.mjs      # patch-locating + injection logic
├── lib/
│   └── pages/
│       └── base/                   # NEVER WIPED by convert-pages
│           ├── base-page.ts        # exports K6Page (hand-authored)
│           └── selectors.ts        # exports K6PlaywrightSelectors shim
├── src/
│   └── pages/                      # WIPED+REPOPULATED by sync-src
│       └── .gitkeep                # boundary marker; survives because it's not in git as part of upstream
└── tests/
    └── unit/
        ├── sync-src.test.mjs       # arg parse, .sync-meta.json shape, prompt skip
        ├── convert-transforms.test.mjs  # individual transform rules
        ├── convert-patch-injection.test.mjs  # endregion + fallback brace logic
        └── convert-roundtrip.test.mjs  # fixture POM → expected output
```

### Pattern 1: ESM Script Skeleton (mirrors Phase 1)

```typescript
// Source: scripts/perf-runner.mjs (Phase 1 pattern)
#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { promises as fs, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function buildCli() {
  const program = new Command();
  program.name('easyk6-sync').description('...');
  // ... options
  return program;
}

async function main() {
  const cli = buildCli();
  cli.parse(process.argv);
  const opts = cli.opts();
  // ... work
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

### Pattern 2: Sync Mode Reference Implementation

The sync script extends `ir-perf-k6/scripts/sync-frontend-src.mjs` with a local-mode default. The git-mode path is a near-verbatim port; the local-mode path uses `fs.cp({ recursive: true })`.

**Mode selection:**
```javascript
// Source: scripts/sync-src.mjs (proposed)
function selectMode(opts) {
  if (opts.repo) return 'git';
  if (opts.source) return 'local';
  if (process.env.EASYPLAYWRIGHT_SRC) return 'local';
  // default: local from ../easyPlaywright
  return 'local';
}
```

**Local mode:**
```javascript
async function syncLocal(opts) {
  const source = path.resolve(opts.source ?? process.env.EASYPLAYWRIGHT_SRC ?? '../easyPlaywright');
  const upstreamPages = path.join(source, 'src/pages');
  if (!existsSync(upstreamPages)) {
    throw new Error(`Upstream src/pages not found at: ${upstreamPages}`);
  }
  await emptyDir('src/pages');
  await fs.cp(upstreamPages, 'src/pages', { recursive: true });
  return { source: path.normalize(source), mode: 'local' };
}
```

**Git mode (mirrors `sync-frontend-src.mjs:159-188`):**
```javascript
async function syncGit(opts) {
  const tmpParent = await fs.mkdtemp(path.join(os.tmpdir(), 'easyk6-sync-'));
  const tmp = path.join(tmpParent, 'repo');
  try {
    await run('git', ['clone', '--depth', '1', '--branch', opts.branch, opts.repo, tmp]);
    const upstreamPages = path.join(tmp, 'src/pages');
    if (!await fs.stat(upstreamPages).then(s => s.isDirectory()).catch(() => false)) {
      throw new Error(`Expected 'src/pages' in remote repo.`);
    }
    // capture commit SHA for .sync-meta.json
    const { stdout } = await run('git', ['-C', tmp, 'rev-parse', 'HEAD']);
    const commit = stdout.trim();
    await emptyDir('src/pages');
    await fs.cp(upstreamPages, 'src/pages', { recursive: true });
    return { source: opts.repo, mode: 'git', branch: opts.branch, commit };
  } finally {
    await fs.rm(tmpParent, { recursive: true, force: true });
  }
}
```

### Pattern 3: Conversion Pipeline (per-file)

```javascript
// Source: scripts/convert-pages.mjs (proposed); rules from convert-to-k6.sh
async function convertFile(srcPath, tgtPath, relPath) {
  let content = await fs.readFile(srcPath, 'utf8');

  // Stage 1: Strip Playwright imports
  content = stripPlaywrightImports(content);

  // Stage 2: Inject k6 imports + K6Page extends
  content = injectK6Imports(content, computeK6ImportPath(relPath));

  // Stage 3: Class extends K6Page
  content = ensureExtendsK6Page(content);

  // Stage 4: super(page) injection if missing
  content = ensureSuperPageCall(content);

  // Stage 5: expect(...) walker (balanced-paren)
  content = transformExpectAssertions(content);

  // Stage 6: Simple regex transforms
  content = applySimpleTransforms(content);
  // .first() → .nth(0)
  // .last() → .nth(-1)
  // .clear() → .fill('')
  // page.getByTitle('x') → page.locator('[title="x"]')
  // page.getByText/getByRole/getByTestId → this.selectors.*

  // Stage 7: Patch injection
  const patchPath = path.join('lib/pages-k6-patches', relPath.replace(/\.ts$/, '.k6-patch.ts'));
  if (existsSync(patchPath)) {
    console.log(`  ↳ Injecting k6-specific methods from: ${patchPath}`);
    content = injectPatch(content, await fs.readFile(patchPath, 'utf8'));
  }

  // Stage 8: Write with banner header
  const banner = [
    '// K6-compatible version - Auto-generated from Playwright Page Object',
    `// Source: ${srcPath}`,
    existsSync(patchPath) ? `// K6-PATCHES: Includes methods from ${patchPath}` : null,
    '',
  ].filter(Boolean).join('\n');

  await fs.mkdir(path.dirname(tgtPath), { recursive: true });
  await fs.writeFile(tgtPath, banner + '\n' + content, 'utf8');
}
```

### Pattern 4: Balanced-Paren Walker (Node port of Python from convert-to-k6.sh:434-450)

```javascript
// Source: convert-to-k6.sh:434-450 (Python original)
function extractBalancedParens(text, start) {
  if (start >= text.length || text[start] !== '(') return [null, -1];
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) return [text.slice(start + 1, i), i + 1];
    }
  }
  return [null, -1];
}

// Strip optional message arg from expect(X, 'msg') → X
// Tracks string boundaries (', ", `) with backslash escapes; tracks (), {}, [].
function stripExpectMessage(expr) {
  // Source: convert-to-k6.sh:452-487 — port verbatim. Splits only on top-level commas.
  // ... full implementation needed
}
```

### Pattern 5: Patch Injection Algorithm

```javascript
// Source: convert-to-k6.sh:751-787 (Python original)
function injectPatch(content, patchContent) {
  // Primary: inject before LAST '// #endregion' line
  const lastEndregion = content.lastIndexOf('// #endregion');
  if (lastEndregion !== -1) {
    let lineStart = content.lastIndexOf('\n', lastEndregion);
    lineStart = lineStart === -1 ? 0 : lineStart + 1;
    return content.slice(0, lineStart) + patchContent + '\n' + content.slice(lineStart);
  }
  // Fallback: inject before final closing brace of last class
  // (ir-perf uses 'export default' anchor; easyPlaywright uses 'export class' — adapt accordingly)
  const exportDefault = content.lastIndexOf('export default');
  if (exportDefault !== -1) {
    const bracePos = content.lastIndexOf('}', exportDefault);
    if (bracePos !== -1) {
      return content.slice(0, bracePos) + patchContent + '\n' + content.slice(bracePos);
    }
  }
  // Final fallback: inject before file's last '}' (most-likely class end)
  const lastBrace = content.lastIndexOf('}');
  if (lastBrace !== -1) {
    return content.slice(0, lastBrace) + patchContent + '\n' + content.slice(lastBrace);
  }
  throw new Error('Cannot locate injection point in generated POM.');
}
```

**KEY ADAPTATION FROM REF:** easyPlaywright POMs use `export class HomePage` (named export at declaration), NOT `export default`. The fallback path in ir-perf-k6's converter looks for `export default`. The easyk6 port MUST adapt the fallback to look for the last class closing brace, since `// #endregion` is also absent from easyPlaywright POMs `[VERIFIED: grep for "#endregion" returned no matches]`.

### Anti-Patterns to Avoid
- **Running the bash original via WSL/Git Bash:** breaks D-29 cross-platform requirement. Recruiter without bash → broken showcase.
- **Calling out to ts-morph for AST:** adds 500KB dev dep + ~50ms startup. Deferred per CONTEXT.md.
- **Globbing with `**` in Node script:** Node's built-in globbing is partial; use `fs.readdir({ recursive: true })` (Node 18.17+) or recursive helper. `[VERIFIED: Node 22 supports recursive readdir]`
- **Hardcoded forward-slashes in path concatenation:** breaks on Windows. Use `path.join()` everywhere.
- **Reading `.sync-meta.json` for git provenance from working tree:** if the user re-clones easyk6 fresh, the file already exists. Always rewrite on every sync.
- **Selectively syncing files:** D-26 mandates full wipe. Partial sync creates ghost files when upstream deletes a POM.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recursive directory copy | Manual `readdir`+`copyFile` loop | `fs.cp(src, dst, { recursive: true })` | Node 16.7+ builtin; preserves symlinks/perms. `[VERIFIED: Node 22]` |
| Recursive directory wipe | Custom rm walker | `fs.rm(dir, { recursive: true, force: true })` | Node 14.14+ builtin. `[VERIFIED]` |
| Temp directory | Custom `Date.now()` dir creation | `fs.mkdtemp(path.join(os.tmpdir(), 'prefix-'))` | Atomic + collision-safe. Used by ref impl. `[CITED: sync-frontend-src.mjs:159]` |
| Git clone wrapper | spawn + parsing flag list | `spawn('git', ['clone', '--depth', '1', '--branch', X, repo, dst])` | Same as ref impl. Don't try to detect URL formats; let git fail. `[CITED]` |
| TS-style assertion library | Custom test helpers | `node:test` + `node:assert/strict` | Phase 1 baseline already proves this. Zero deps. |
| Loading TS modules in Node tests | Custom transpile | `typescript.transpileModule()` then `import('data:text/javascript;base64,...')` | Pattern from `tests/unit/runtime-config.test.mjs:20-32`. `[CITED]` |
| CLI flag parsing | Manual `process.argv` walk | `commander` (already installed) | Phase 1 uses it; consistency wins. `[CITED: package.json]` |
| Confirmation prompt | Custom stdin reader | `node:readline.createInterface().question()` | Same pattern as `sync-frontend-src.mjs:101-106`. `[CITED]` |
| Balanced-paren scanner | New parser | Port the Python from `convert-to-k6.sh:434-450` verbatim | The reference rules are the source of truth (D-32). Don't reinvent. |
| Selector pseudo-API | Use k6 1.5 native `getBy*` directly | Wrap them in `K6PlaywrightSelectors` shim | D-38 locks the shim. Provides API stability against k6 minor changes; converter can rewrite `this.page.getByX` → `this.selectors.getByX` once. `[VERIFIED: ir-perf K6PlaywrightSelectors at lib/utils/selectors.ts]` |

**Key insight:** Phase 2 introduces ZERO new runtime dependencies. Every capability is either a Node builtin, a Phase 1 dev dep (`typescript`, `commander`), or a verbatim port of a reference algorithm. This is essential for keeping the recruiter-facing scope simple — `npm install` should not balloon between Phase 1 and Phase 2.

## Conversion Rule Inventory

This is the **definitive transform table** the planner should use to scope 02-02-PLAN. Each rule cites its line in `convert-to-k6.sh` and notes whether it applies to the easyPlaywright POMs as they exist today.

| # | Rule | Line in ref | Walker needed? | Applies to easyPlaywright? | Notes |
|---|------|-------------|----------------|---------------------------|-------|
| R1 | Strip `import ... from '@playwright/test'` (variants: with/without `expect`, `Page`, `Locator`) | sh:299-302, sh:311 | No (regex) | YES — every POM `[VERIFIED: 8 hits]` | 4 import variants in ref; only the `Page, Locator, expect` form appears in easyPlaywright. |
| R2 | Strip duplicate k6 imports (`k6/browser`, `k6/experimental/browser`, `K6Page`, `K6PlaywrightSelectors`) before re-injecting | sh:305-310 | No | NOT YET (no prior k6 imports) | Defensive against repeated runs. Required since convert is idempotent. |
| R3 | Inject `import { Page, Locator } from 'k6/browser';` + `import { K6Page } from "<rel>../base/base-page";` before first import | sh:653-687 (awk) | No (line-based) | YES — every POM | Use computed depth: `BasePage.ts` → `./base/base-page`; `components/X.ts` → `../base/base-page`. |
| R4 | Inject `import { expect } from '@lib/vendor/k6-testing-wrapper.js';` (if any expect calls remain after walker) | sh:663, sh:681 | No | YES (if commented `// k6-compat:` lines exist) | EasyK6 should ALSO have a vendored k6-testing wrapper OR import from URL `https://jslib.k6.io/k6-testing/0.6.1/index.js`. **Open question: vendor or CDN?** See Open Questions section. |
| R5 | Replace `class X {` with `class X extends K6Page {` on first class match | sh:693-697 (awk) | No (regex) | YES — every concrete page (HomePage, AboutPage, PostPage, components) | **HomePage already `extends BasePage`** — converter must rewrite `extends BasePage` → `extends K6Page` instead of just adding `extends`. ⚠️ ir-perf converter DOES NOT handle this case (its upstream POMs don't extend anything); easyk6 port MUST add this rule. |
| R6 | Strip the upstream `BasePage.ts` from output OR convert it to a no-op shim | — | No | NEW: not in ref | easyPlaywright BasePage exists upstream; after conversion HomePage/AboutPage/PostPage extend K6Page (not BasePage). Two options: (a) skip `BasePage.ts` entirely during conversion and emit nothing for it; (b) emit a shim that re-exports `K6Page as BasePage`. Recommend (a) — simpler, fewer surprises. ⚠️ Adds a "skip filename" rule to the converter. |
| R7 | Inject `super(page)` into `constructor(page: Page) { ... }` if not already present | sh:711-723 (awk) | No (line-based) | NO — easyPlaywright already calls `super(page)` (extends BasePage); after R5 rewrites to `extends K6Page`, the existing `super(page)` line stays correct | Defensive. Keep rule for robustness. |
| R8 | `expect(X).toBeVisible()` → `await X.waitFor({ state: 'visible' })` (with optional `timeout` extraction) | sh:489-621 (Python) | YES | YES — 4 hits in `BasePage`/`HomePage`/`AboutPage`/`PostPage` | The marquee balanced-paren transform. |
| R9 | `expect(X).not.toBeVisible()` → `await X.waitFor({ state: 'hidden' })` | sh:582-587 | YES | NOT YET (no `.not` in upstream) | Keep rule for future. |
| R10 | `expect(X).toBeHidden()` → `await X.waitFor({ state: 'hidden' })` | sh:589-595 | YES | NOT YET | Keep rule. |
| R11 | `expect(X).toBeEnabled()` → `await X.waitFor({ state: 'visible' })` | sh:597-602 | YES | NOT YET | Keep rule. |
| R12 | All other `expect(X).*` → `// k6-compat: <original>` (commented out) | sh:604-611 | YES | YES — `toHaveText`, `toHaveTitle`, `toHaveAttribute` all in `BasePage.ts` | **NOTE:** Since k6-testing jslib supports these, the comment-out rule is conservative. CONTEXT.md D-32 locks parity, so this is the chosen behavior. Recruiter-facing comment should explain why. |
| R13 | `.first()` → `.nth(0)` | sh:631 | No (regex) | YES — 21 hits | **k6 1.5 supports `.first()` natively** `[VERIFIED via k6 docs]` — transform is technically unnecessary. Keep per D-32 parity, but note the recruiter rationale. |
| R14 | `.last()` → `.nth(-1)` | sh:634 | No | NOT YET | Keep rule. **k6 1.5 supports `.last()` natively** — same rationale. |
| R15 | `.clear()` → `.fill('')` | sh:637 | No | NOT YET | **k6 1.5 supports `.clear()` natively** — same rationale. |
| R16 | `this.page.getByTitle('X')` → `this.page.locator('[title="X"]')` | sh:373-374 | No (regex, single + double quote variants) | NOT YET | Keep. |
| R17 | `this.page.getByText/getByTestId/getByRole(...)` → `this.selectors.X(...)` | sh:377-379 | No | NOT YET | Keep — required for selector shim contract. |
| R18 | `page.getByTestId(...)` (no `this.`) → `this.selectors.getByTestId(...)` | sh:382 | No | NOT YET | Edge case; keep. |
| R19 | `this.page.locator('X', { hasText: Y })` → `this.page.locator(\`X:has-text("${Y}")\`)` | sh:385-386 | No | YES — appears in `PostPage.ts:111` `(via :has-text in template)`, multiple components use `:has-text` directly inline | Already partially expressed in upstream (uses `:has-text("...")` in template literals). Rule still safe. |
| R20 | Comment out `new NotificationBanner` instantiations | sh:389-390 | No | NO — easyPlaywright doesn't use this class | Skip (drop rule from port). |
| R21 | Helper-path remaps (`'../../helpers/X'` → `'../../utils/helpers/X'`, etc.) | sh:351-369 | No | NO — easyPlaywright POMs don't import helpers | Skip (drop rules from port). |
| R22 | API-service import strip (`'../../api/X-api-service'`) | sh:322-325 | No | NO | Skip. |
| R23 | `@faker-js/faker` import strip | sh:329-330 | No | NO | Skip. |
| R24 | `validateNotification` strip | sh:331-334 | No | NO | Skip. |
| R25 | `ENV` import conditional strip | sh:342-345 | No | NO — no `@environment` in upstream | Skip. |
| R26 | `copies` import conditional inject | sh:664-666 (awk) | No | NO | Skip. |
| R27 | i18n shim generation (lib/i18n/X.ts) | sh:914-924 | No | NO — no upstream i18n dir | Skip. |
| R28 | "Strip page-field shadow declarations" awk block (avoids double-define warning with `useDefineForClassFields:true`) | sh:732-737 | No | YES (defensive) — `BasePage.ts:10` declares `protected readonly page: Page` | Adapt rule. **Important for k6 + TypeScript strict-class-fields combo**. |
| R29 | Header banner write at top of generated file | sh:791-800 | No | YES — every output file | Required by D-33. |

**Summary by category:**
- **Rules to port verbatim:** R1, R2, R3, R5 (with adaptation), R7, R8, R9, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R28, R29
- **Rules to ADD (not in ref):** R6 (skip BasePage.ts) — easyPlaywright-specific
- **Rules to skip:** R20-R27 — not applicable to easyPlaywright POMs
- **Total rules in scope:** ~20 rules, 1 walker (expect transform), 1 file-skip

## K6Page Contract

The hand-authored `lib/pages/base/base-page.ts` MUST mirror the ir-perf-k6 K6Page shape. Verified contract:

```typescript
// Source: ../ir-perf-k6/lib/base/base-page.ts (verbatim) [CITED]
import { Page, Locator } from 'k6/browser';
import { K6PlaywrightSelectors } from './selectors';  // adapted: ir-perf imports from '../utils/selectors'

export class K6Page {
  protected page: Page;
  protected selectors: K6PlaywrightSelectors;

  constructor(page: Page) {
    this.page = page;
    this.selectors = new K6PlaywrightSelectors(page);
  }

  // Optional helpers for the easyk6 milestone:
  // - navigate(url: string) — convenience for converted code
  // - waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle')
  // (these mirror upstream BasePage methods that converted code may invoke via super.X())
}
```

**Adaptation needed:** ir-perf-k6's K6Page exposes `waitForSpinnerToDisappear(timeoutMs, pollIntervalMs)` for the IriusRisk app spinner. easyk6 doesn't need this (QAbbalah is a static blog). The simpler K6Page is correct.

**Crucial:** the easyPlaywright `BasePage.navigate()` calls `this.page.goto(this.pageUrl)` followed by `waitForLoadState('domcontentloaded')` and `waitForLoadState('networkidle')`. Subclasses (HomePage, etc.) override `navigate()` and call `super.navigate()`. Converted code therefore expects `K6Page.navigate()` to exist with the same shape. **K6Page MUST expose `navigate(url?: string)` even though the upstream signature is `navigate(): Promise<void>` (URL comes from `pageUrl`).** Three options:

1. **Mirror exactly:** add `protected pageUrl: string = ''` field on K6Page; converted POMs keep `pageUrl` field intact and call `super.navigate()`. ✅ Recommended — minimal surface change.
2. Make `navigate(url: string)` and rewrite calls. More converter work.
3. Drop `navigate()` from K6Page; let each generated POM call `this.page.goto()` directly. Loses the upstream pattern.

**Recommend option 1.** K6Page becomes:

```typescript
export class K6Page {
  protected page: Page;
  protected selectors: K6PlaywrightSelectors;
  protected pageUrl: string = '';
  protected pageTitle: RegExp | string = /.*/;

  constructor(page: Page) {
    this.page = page;
    this.selectors = new K6PlaywrightSelectors(page);
  }

  async navigate(): Promise<void> {
    if (this.pageUrl) {
      await this.page.goto(this.pageUrl);
    }
    await this.waitForLoadState();
  }

  async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle'): Promise<void> {
    // k6/browser supports .waitForNavigation but not waitForLoadState directly in all versions.
    // SAFEST: just wait for networkidle equivalent via Page.waitForLoadState if exposed; else no-op.
    // [ASSUMED] k6 1.5 Page.waitForLoadState exists. Need to VERIFY against k6 docs.
    if ('waitForLoadState' in this.page) {
      await (this.page as any).waitForLoadState(state);
    }
  }
}
```

> Mark `waitForLoadState` block as `[ASSUMED]` — needs k6 1.5 API verification before locking in 02-02-PLAN.

## Selector Shim

Hand-authored `lib/pages/base/selectors.ts`. Port from `ir-perf-k6/lib/utils/selectors.ts` verbatim — the API surface is small and stable:

| Method | Behavior | k6 1.5 native equivalent |
|--------|----------|--------------------------|
| `getByTestId(testId: string)` | `page.locator('[data-testid="X"]')` | `page.getByTestId(testId)` exists `[VERIFIED]` |
| `getByText(text: string, options?: { exact?: boolean })` | `page.locator('*').filter({ hasText: text })` (or RegExp for exact) | `page.getByText(text, options)` exists `[VERIFIED]` |
| `getByRole(role: string, options?: { name?: string \| RegExp })` | `page.locator('[role="X"]')` then `.filter({ hasText: name })` | `page.getByRole(role, options)` exists `[VERIFIED]` |
| `filterByText(locator, text)` | `locator.filter({ hasText: text })` | `locator.filter({ hasText: text })` exists |

**Recruiter-facing note:** the shim adds an indirection that may seem redundant given k6 1.5 supports these natively. Two reasons to keep it:
1. **API stability:** if k6 1.6+ changes the `getByText` semantics, only `selectors.ts` updates; converted POMs stay frozen.
2. **Conversion symmetry:** the converter rewrites `this.page.getByX` → `this.selectors.getByX` once; if we used native, every transitive call site would need rewriting too.

## Patch Injection Algorithm

**Detailed reference (from sh:751-787):**

1. Read source file content + patch fragment content.
2. Find the LAST occurrence of `// #endregion` (string match, not regex; case-sensitive).
3. If found:
   - Find the start of that line: `lastIndexOf('\n', endregionPos)` then `+ 1`.
   - Insert `patchContent + '\n'` at the line start. Result: patch appears immediately above the `// #endregion` line.
4. If NOT found:
   - Find LAST `export default` (ir-perf fallback anchor).
   - Find `}` BEFORE the `export default` position.
   - Insert patch + `\n` before that brace.
5. **easyk6 ADAPTATION:** easyPlaywright POMs use `export class HomePage` (named export at declaration), NOT `export default`. The fallback chain becomes:
   - LAST `// #endregion` (primary) → fallback to last `}` in file (final closing brace of last class).
   - Skip the `export default` middle step entirely since it's never present.

**Verification of upstream:**
- `// #endregion` markers in upstream `easyPlaywright/src/pages/`: **0 hits** `[VERIFIED via grep]`
- `export default` in upstream POMs: **0 hits** (uses `export class X`) `[VERIFIED]`
- Final `}` always exists at file end (TypeScript class closing). ✓

**Implication:** the demonstration patch on HomePage will use the **final-brace fallback path**, not the `// #endregion` primary path. The primary path is dead code in the easyk6 milestone but kept for parity (D-32) and to handle future upstream that might add region markers.

**Patch file format constraints (from D-41 + sh:744 examples):**
- Plain TypeScript fragment (method body inside an existing class scope).
- NO `import` statements (any imports needed must already be injected by the converter or live in K6Page).
- NO `class X { ... }` declaration.
- Comments + method definitions only.
- Indented with 2 or 4 spaces (matches surrounding class style).

**Example demonstration patch (proposed for HomePage):**

```typescript
// File: lib/pages-k6-patches/HomePage.k6-patch.ts
// K6-SPECIFIC METHODS - Auto-injected by convert-pages.mjs
// These methods are NOT in upstream Playwright Page Objects.
// DO NOT add to src/pages/ — they belong here so they survive re-sync cycles.

  /**
   * k6-only timing helper: measures navigation duration to the home page.
   * Returns elapsed milliseconds. Use this in scenarios that need to
   * record per-iteration page-load timings without enabling k6's full
   * browser performance trace.
   */
  async measureNavigation(): Promise<number> {
    const start = Date.now();
    await this.navigate();
    await this.waitForHomePageContent();
    return Date.now() - start;
  }
```

This satisfies D-42 (load-bearing, not theoretical). It's small enough to read at a glance and exercises both the patch injection AND a method that calls upstream-defined `waitForHomePageContent()` — proving the patch sits inside the class scope.

## Sync Mode Reference Implementation

### Mode flags

| Mode | Trigger | Source resolution |
|------|---------|-------------------|
| **local** (default) | None / `--source <path>` / `EASYPLAYWRIGHT_SRC=<path>` | Local FS path. Defaults to `../easyPlaywright`. |
| **git** | `--repo <url>` (and optionally `--branch <ref>`) | Shallow clone (depth=1) into `os.tmpdir()/easyk6-sync-XXXXXX/repo`, then copy `<tmp>/repo/src/pages/`. |

**Validation:** `--repo` and `--source` are mutually exclusive. If both supplied, fail fast with a clear error.

### `.sync-meta.json` Schema (D-27)

```typescript
type SyncMeta = {
  source: string;            // path or URL
  mode: 'local' | 'git';
  branch?: string;           // git mode only
  commit?: string;           // git mode only — short SHA from `git rev-parse HEAD` post-clone
  syncedAt: string;          // ISO 8601 UTC timestamp
};
```

**Example local-mode:**
```json
{
  "source": "C:\\Users\\me\\Documents\\GitHub\\easyPlaywright",
  "mode": "local",
  "syncedAt": "2026-05-08T14:23:01.000Z"
}
```

**Example git-mode:**
```json
{
  "source": "https://github.com/Othrondir/easyPlaywright.git",
  "mode": "git",
  "branch": "main",
  "commit": "7e9c365abc123def456",
  "syncedAt": "2026-05-08T14:23:01.000Z"
}
```

**Path normalization:** `source` MUST be normalized via `path.normalize()` (local mode) before serialization. On Windows this preserves backslashes — recruiter-readable. Don't force forward-slashes; preserving the OS-native form is more honest.

### Prompt + skip behavior (D-28)

```javascript
const isCI = process.env.CI === '1';
const skipPrompt = opts.yes || isCI;

if (!skipPrompt) {
  const ok = await promptConfirm(`This will replace contents of 'src/pages/'. Continue? [y/N] `);
  if (!ok) {
    console.log('Aborted.');
    return;
  }
}
```

Pattern verbatim from `sync-frontend-src.mjs:154-157`.

## Idempotency Boundaries

| Path | sync:src | convert-pages | Why |
|------|----------|---------------|-----|
| `src/pages/` | **WIPED then repopulated** | Read-only | Sync owns this folder. Wipe ensures deleted upstream files don't ghost. |
| `src/pages/.sync-meta.json` | Written on every sync | Ignored | Provenance metadata; not a POM. |
| `lib/pages/` | Untouched | **WIPED (except `base/`) then repopulated** | Convert owns this. Wipe ensures deleted upstream POMs don't ghost. |
| `lib/pages/base/` | Untouched | **PRESERVED** during wipe | Hand-authored. Listed as "skip" in the wipe loop. |
| `lib/pages-k6-patches/` | Untouched | Read-only | Maintainer-owned. Survives both commands. |
| `lib/pages-k6-patches/.gitkeep` | N/A | N/A | Boundary marker; unaffected. |
| Root files (`README`, `package.json`, etc.) | Untouched | Untouched | Both scripts ONLY touch their assigned folders. |

**Wipe implementation (D-26, D-34):**
```javascript
// sync-src.mjs
async function emptySrcPages() {
  await emptyDir('src/pages');  // wipes everything
}

// convert-pages.mjs  
async function emptyLibPagesExceptBase() {
  const entries = await fs.readdir('lib/pages', { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'base') continue;  // PRESERVE base/
    await fs.rm(path.join('lib/pages', e.name), { recursive: true, force: true });
  }
}
```

**`.gitkeep` files:** these live in git but are wiped by the empty-dir call. Since `sync-src.mjs` immediately repopulates from upstream and `convert-pages.mjs` immediately repopulates from generated output, the working-tree state is correct. **`.gitkeep` files are NOT regenerated** — their absence after a successful sync is correct (folders have real content). If users delete and re-clone the repo, git restores `.gitkeep` because it's tracked.

**Edge case:** if sync fails between wipe and copy, `src/pages/` is left empty + `.gitkeep` is gone. User can either re-run sync or `git checkout src/pages/.gitkeep`. Acceptable for a recruiter-facing tool. A wrap-in-try-rollback is overkill for the showcase scope.

## Common Pitfalls

### Pitfall 1: Windows path-separator drift in generated imports
**What goes wrong:** When the converter computes `K6Page` import depth via string operations on file paths, Windows backslashes leak into emitted TS imports (e.g., `from "..\..\base\base-page"`).
**Why it happens:** `path.relative()` on Windows returns `\`-separated paths. TS imports must use `/`.
**How to avoid:** Always do `relPath.split(path.sep).join('/')` before emitting any import string. Or: use `path.posix.relative()` exclusively for emit-paths.
**Warning signs:** Converted file fails `tsc --noEmit` with "Cannot find module" on Windows but works on macOS/Linux.

### Pitfall 2: Line-ending preservation
**What goes wrong:** Reading source with default Node encoding then writing with `'\n'` joins corrupts CRLF to LF (or vice versa). Git status shows huge diffs even when content is identical.
**Why it happens:** `fs.readFile(path, 'utf8')` returns a string with whatever line endings the file has. Most string operations (`split('\n')`, regex `m` flag) work, but rejoining changes the form.
**How to avoid:** 
- Read with `'utf8'` (no `binary` mode).
- Detect input EOL: `content.includes('\r\n') ? '\r\n' : '\n'`.
- After all transforms, normalize back: `transformed.replace(/\r?\n/g, detectedEol)`.
- Alternatively, configure `.gitattributes` for `* text=auto eol=lf` to standardize on commit, BUT recruiter testing on Windows may still see CRLF locally. Safest: preserve.
**Warning signs:** `git diff` after a fresh sync+convert shows every line changed. Quote: "all line endings flipped".

### Pitfall 3: Missing `// #endregion` markers (covered in D-40)
**What goes wrong:** Patch injector takes the fallback path (find `export default`), but easyPlaywright doesn't use `export default`. Falls all the way through and throws.
**Why it happens:** ir-perf-k6's converter assumes `export default ClassName` at the end of every POM. easyPlaywright uses `export class ClassName` (named export at declaration). Different style.
**How to avoid:** Implement the fallback as documented above: primary `// #endregion`, fallback to last `}` in file. Drop the `export default` middle step OR keep it as a no-op middle step that just falls through.
**Warning signs:** Converter throws "Cannot locate injection point" on every POM with a patch.

### Pitfall 4: `BasePage.ts` getting converted into a broken POM
**What goes wrong:** Converter applies R5 (`class X { → class X extends K6Page {`) to upstream `BasePage.ts`. Result: `class BasePage extends K6Page` — a class extending a class that has the same role. Subclasses (HomePage etc.) then extend a chain that's confused: HomePage extends BasePage (named, but rewritten) extends K6Page.
**Why it happens:** ALL-mode conversion (D-31) applies all rules to all files.
**How to avoid:** Add a file-skip rule in convert-pages.mjs for `BasePage.ts` (case-sensitive, top-level only — don't skip `components/SomeBasePage.ts` if such existed). Output: nothing emitted for `lib/pages/BasePage.ts`. The barrel `index.ts` still references `BasePage`, so we ALSO need a step to rewrite `index.ts` to drop the `export { BasePage }` line OR re-export `K6Page as BasePage`.
**Warning signs:** TypeScript compile errors "Class 'X' incorrectly extends base class 'BasePage'".

### Pitfall 5: `index.ts` barrel export references upstream types
**What goes wrong:** Generated `lib/pages/index.ts` retains `export { BasePage } from './BasePage'` after conversion. Phase 3 imports break.
**Why it happens:** `index.ts` is treated as just another `.ts` file. None of the existing rules touch barrel exports.
**How to avoid:** Either (a) ALSO skip `index.ts` and hand-author `lib/pages/index.ts` once during plan 02-02, OR (b) add a rule to rewrite `BasePage` references in barrel. Recommend (a) — simpler, makes the boundary explicit. Add `index.ts` to the skip list alongside `BasePage.ts`.

### Pitfall 6: Idempotency check — re-running convert-pages on already-converted output
**What goes wrong:** The user accidentally points convert-pages at `lib/pages/` (already converted) instead of `src/pages/` (upstream). Double-conversion happens; imports duplicate.
**Why it happens:** R2 (strip duplicate k6 imports) prevents some damage, but `class X extends K6Page extends K6Page` slipping through is possible.
**How to avoid:** Source path is hardcoded to `src/pages/` (D-31 says ALL `*.ts` under `src/pages/`). Don't accept a `--source-dir` flag on convert-pages. Validate source dir contains the sync-meta marker (or fail with a clear "did you run sync:src first?" message).
**Warning signs:** "extends K6Page extends K6Page" in generated output.

### Pitfall 7: Patch file path mismatch
**What goes wrong:** Patch file at `lib/pages-k6-patches/HomePage.k6-patch.ts` doesn't get applied because the converter's path computation expects `lib/pages-k6-patches/<rel>.k6-patch.ts` where rel is the path RELATIVE to `src/pages/`. For `src/pages/HomePage.ts`, rel is `HomePage.ts` → expected patch `HomePage.k6-patch.ts` (correct). For `src/pages/components/NavigationComponent.ts`, rel is `components/NavigationComponent.ts` → expected patch `components/NavigationComponent.k6-patch.ts`.
**Why it happens:** Path computation must mirror the source folder hierarchy. ir-perf-k6 ref does this via `${rel%.ts}.k6-patch.ts`.
**How to avoid:** Compute patch path as `path.join('lib/pages-k6-patches', relPath.replace(/\.ts$/, '.k6-patch.ts'))`. Test with a nested patch file.
**Warning signs:** Converter logs "Injecting" only for top-level POMs, never for components.

### Pitfall 8: Empty upstream `src/pages/` after sync if upstream changed structure
**What goes wrong:** Maintainer points `--source` at a directory that doesn't have `src/pages/`. sync wipes `src/pages/` and ends with nothing.
**Why it happens:** No pre-flight check.
**How to avoid:** Verify `<source>/src/pages/` exists BEFORE wiping local `src/pages/`. Same pattern as `sync-frontend-src.mjs:166-168`.
**Warning signs:** Empty `src/pages/` after a "successful" sync.

### Pitfall 9: BOM/UTF8 handling
**What goes wrong:** Upstream files written with BOM (some Windows editors). After read+transform+write, BOM either duplicated or lost. Vite build sees changed bytes.
**Why it happens:** Node's `'utf8'` encoding strips BOM on read but doesn't re-add on write (unlike PowerShell).
**How to avoid:** Trust Node defaults. If a file has BOM in upstream, accept that the transformed copy won't. Cross-platform consistency wins.
**Warning signs:** First convert run shows clean diff; second run identical except for byte-order. (This is unlikely to bite easyPlaywright but is worth knowing.)

### Pitfall 10: Recruiter runs convert-pages BEFORE sync-src
**What goes wrong:** `src/pages/` only contains `.gitkeep`. Converter wipes `lib/pages/` then has nothing to write. Build fails because `lib/pages/HomePage.ts` doesn't exist.
**Why it happens:** No dependency between commands; they're independent.
**How to avoid:** Detect empty source: if `src/pages/` has no `.ts` files (excluding `.gitkeep` and `.sync-meta.json`), error with: "src/pages/ is empty. Run `npm run sync:src` first."
**Warning signs:** "No files to convert" or zero-output silent success.

## Code Examples

### Computing K6Page import depth (Source: convert-to-k6.sh:269-277)

```javascript
function computeK6ImportPath(relPath) {
  // relPath = 'HomePage.ts' → '../base/base-page'
  // relPath = 'components/NavigationComponent.ts' → '../../base/base-page'
  const depth = (relPath.match(/\//g) || []).length;
  return '../'.repeat(depth) + 'base/base-page';
}
```

### Detecting + preserving line endings

```javascript
async function readWithEol(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  return { content, eol };
}

async function writePreservingEol(filePath, content, eol) {
  const normalized = content.replace(/\r?\n/g, eol);
  await fs.writeFile(filePath, normalized, 'utf8');
}
```

### Per-file convert with error handling (Source: sh:817-848 pattern)

```javascript
async function convertAll() {
  const sourceDir = 'src/pages';
  const files = await collectTsFiles(sourceDir);
  let errors = 0;

  for (const [count, file] of files.entries()) {
    const rel = path.relative(sourceDir, file);
    if (rel === 'BasePage.ts' || rel === 'index.ts') continue; // skip per Pitfall 4 + 5

    const tgt = path.join('lib/pages', rel);
    console.log(`[${count + 1}/${files.length}] Converting: ${rel}`);
    try {
      await convertFile(file, tgt, rel);
      console.log(`  ✓ Converted successfully`);
    } catch (err) {
      errors++;
      console.error(`  ✗ Error converting ${rel}: ${err.message}`);
    }
  }

  if (errors > 0) {
    process.exit(1);  // D-35: non-zero exit on any failure
  }
}
```

### Recursively listing TS files (Node 22)

```javascript
async function collectTsFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      // dirent.parentPath available in Node 20+; recursive readdir returns flat list
      out.push(path.join(e.parentPath ?? dir, e.name));
    }
  }
  return out;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `bash + sed + python3` for conversion (ir-perf-k6 v11) | `Node ESM` for conversion (easyk6) | This phase (D-29) | Cross-platform: works on Windows without WSL. Recruiter-friendly. |
| `k6/experimental/browser` import | `k6/browser` import (stable) | k6 1.0 (mid-2024) | Generated POMs target stable namespace. Strip rules match BOTH `k6/experimental/browser` and `k6/browser` (R2). |
| Custom selector pseudo-shim | k6 1.5 native `getByText`/`getByRole`/`getByTestId` | k6 ~1.3-1.5 | Shim still ships per D-38 for API stability + conversion symmetry. Native is documented as the "real" target. |
| `.first()`/`.last()` polyfills via `.nth(0)`/`.nth(-1)` | Native `.first()`/`.last()` on Locator | k6 1.x browser maturity | Transform still ships per D-32 parity. Native is a fallback option. |
| Custom `expect→waitFor` walker | `k6-testing` jslib (Playwright-compat assertions) | k6-testing v0.5+ | Walker still ships per D-32. Vendored `k6-testing-wrapper.js` handles residual `expect()` calls (commented + injected import). |

**Deprecated/outdated:**
- The bash+sed pipeline (`convert-to-k6.sh`) — works on Linux/macOS only; not portable.
- `k6/experimental/browser` namespace — still works in k6 1.5 but deprecation path documented.

## Project Constraints (from CLAUDE.md)

| Constraint | Impact on Phase 2 |
|-----------|-------------------|
| Recruiter-facing showcase | Sync + convert must read top-to-bottom in README. Avoid jargon and enterprise-only features. |
| Local-first workflow | Default sync mode = local FS copy. Git mode is opt-in. No CI/Docker requirements. |
| `easyPlaywright` is permanent upstream | `--source` defaults to `../easyPlaywright`; git default repo URL is the GitHub mirror. |
| No enterprise weight | NO selective conversion graph walk, NO multi-upstream adapter, NO ts-morph. |
| Smoke must work end-to-end | Phase 2 doesn't run smoke, but converted output MUST compile under Phase 1's existing `tsc --noEmit` (via `tsconfig.json`) and Vite build (via `vite.config.ts` aliases). |
| GSD workflow enforcement | Phase 2 work goes through `/gsd:execute-phase`. No raw repo edits outside the workflow. |
| `npm install` must NOT balloon | Phase 2 introduces zero new runtime deps; only Node builtins + Phase 1's `commander` + `dotenv` (already installed). |
| Conventions section is empty | This phase is free to ESTABLISH conventions. Document patterns inline in `scripts/convert-pages.mjs` so a reviewer reads rules without running code. |

## Runtime State Inventory

> Phase 2 is greenfield from a runtime-state perspective: it CREATES content under `src/pages/` and `lib/pages/`, but does not rename existing identifiers, modify databases, or alter OS-registered processes.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 2 has no datastore. | None |
| Live service config | None — no external services touched. | None |
| OS-registered state | None — no OS-level registrations. | None |
| Secrets/env vars | New env var `EASYPLAYWRIGHT_SRC` (optional override). Phase 1's `BASE_URL` unchanged. | Document `EASYPLAYWRIGHT_SRC` in `.env.example` as optional. |
| Build artifacts | `dist/tests/smoke/smoke-shell.test.js` (Phase 1) is unaffected. New artifacts: `src/pages/*.ts`, `lib/pages/*.ts`, `src/pages/.sync-meta.json`. | Update `.gitignore` policy: `src/pages/` content IS tracked (it's the synced snapshot — provenance matters); `.sync-meta.json` IS tracked; `lib/pages/` content IS tracked (generated, but readable showcase artifact). |

**Key gitignore decision:** ir-perf-k6's pattern is to gitignore generated `lib/pages/`. For easyk6's recruiter-showcase scope, **track everything** so a reviewer can read converted output without running the build. State this in PROJECT_STRUCTURE.md.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Both scripts | ✓ | 22.20.0 `[VERIFIED]` | — (hard requirement; package.json engines locks ≥18) |
| npm | Test runner | ✓ | 11.6.1 `[VERIFIED]` | — |
| git | sync-src git mode | ✓ (assume; standard dev tool) | — | If absent, git mode fails fast with "Git is required on PATH" (matches `sync-frontend-src.mjs:93-99` pattern). Local mode still works. |
| `../easyPlaywright` sibling | sync-src local mode | ✓ `[VERIFIED at C:/Users/pzhly/Documents/GitHub/easyPlaywright]` | last commit 7e9c365 | If absent, sync local-mode fails with clear error. User can use git mode (`--repo`). |
| k6 binary | NOT needed for Phase 2 | ✓ 1.5.0 `[VERIFIED]` | — | k6 only runs during smoke (Phase 3). Phase 2 work is build-time only. |
| TypeScript compiler | Tests load `.ts` modules | ✓ 5.9.3 `[VERIFIED in package.json]` | — | — |
| `commander` | Both scripts CLI | ✓ 11.1.0 | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — both modes available.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` + `node:assert/strict` (Phase 1 baseline) |
| Config file | None — `node --test tests/unit/*.test.mjs` |
| Quick run command | `node --test tests/unit/sync-src.test.mjs tests/unit/convert-transforms.test.mjs` |
| Full suite command | `node --test tests/unit/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UPST-01 | sync-src local mode copies upstream `src/pages/` into local `src/pages/` and writes `.sync-meta.json` | integration (uses tmp dirs) | `node --test tests/unit/sync-src.test.mjs` | ❌ Wave 0 |
| UPST-01 | sync-src refuses unknown flags / mutually exclusive `--repo`+`--source` | unit | `node --test tests/unit/sync-src.test.mjs` | ❌ Wave 0 |
| UPST-01 | sync-src writes correct `.sync-meta.json` shape (mode/source/syncedAt; branch+commit when git) | unit (mock git or use a fixture local upstream) | `node --test tests/unit/sync-src.test.mjs` | ❌ Wave 0 |
| UPST-01 | sync-src prompt is skipped under `--yes` / `CI=1` | integration (spawn child) | `node --test tests/unit/sync-src.test.mjs` | ❌ Wave 0 |
| UPST-02 | Each transform rule (R1, R3, R5, R7, R8, R12, R13, R16, R17, R19, R28) produces expected output on a fixture line | unit (pure functions) | `node --test tests/unit/convert-transforms.test.mjs` | ❌ Wave 0 |
| UPST-02 | Balanced-paren walker handles nested `expect(this.x.filter({ hasText: y })).toBeVisible()` | unit | `node --test tests/unit/convert-transforms.test.mjs` | ❌ Wave 0 |
| UPST-02 | `BasePage.ts` is skipped during conversion | unit | `node --test tests/unit/convert-pages.test.mjs` | ❌ Wave 0 |
| UPST-02 | Round-trip: feed real `easyPlaywright/src/pages/HomePage.ts` to converter, output compiles via `tsc --noEmit` | integration | `node --test tests/unit/convert-roundtrip.test.mjs` (with TS type-check via `typescript.transpileModule`) | ❌ Wave 0 |
| UPST-02 | `lib/pages/base/` is preserved during convert wipe | integration | `node --test tests/unit/convert-pages.test.mjs` | ❌ Wave 0 |
| UPST-02 | Per-file error doesn't abort the run; exit code is non-zero if any file failed | integration (corrupt one fixture file) | `node --test tests/unit/convert-pages.test.mjs` | ❌ Wave 0 |
| UPST-03 | Patch injection: when patch exists, content is concatenated before `// #endregion` (uses fixture with #endregion) | unit | `node --test tests/unit/convert-patch-injection.test.mjs` | ❌ Wave 0 |
| UPST-03 | Patch injection: when no `// #endregion`, content is injected before final `}` | unit (uses easyPlaywright-shaped fixture) | `node --test tests/unit/convert-patch-injection.test.mjs` | ❌ Wave 0 |
| UPST-03 | Patch survives full sync→convert round-trip without manual intervention | integration | `node --test tests/integration/upst-03-roundtrip.test.mjs` | ❌ Wave 0 |
| UPST-03 | Re-running sync→convert with an existing patch produces identical output (deterministic) | integration | `node --test tests/integration/upst-03-roundtrip.test.mjs` | ❌ Wave 0 |
| (Phase 1 contract) | Phase 1 build still works after Phase 2 lands (`npm run build` + `npm run validate:build`) | smoke | `npm run build && npm run validate:build` | ✓ exists |

### Sampling Rate

- **Per task commit:** `node --test tests/unit/<changed-file>.test.mjs` (sub-second feedback)
- **Per wave merge:** `node --test tests/unit/*.test.mjs && node --test tests/integration/*.test.mjs`
- **Phase gate:** Full test suite green + `npm run build && npm run validate:build` + manual `npm run sync:src && npm run convert-pages` on a fresh checkout (UPST-03 round-trip is the locked acceptance per D-44).

### Wave 0 Gaps

- [ ] `tests/unit/sync-src.test.mjs` — covers UPST-01 (4 sub-cases above)
- [ ] `tests/unit/convert-transforms.test.mjs` — covers UPST-02 transform rules (one test per rule R1-R19, R28)
- [ ] `tests/unit/convert-pages.test.mjs` — covers UPST-02 file-orchestration behaviors (skip BasePage.ts, preserve base/, error handling)
- [ ] `tests/unit/convert-patch-injection.test.mjs` — covers UPST-03 injection algorithm (primary path + fallback)
- [ ] `tests/integration/upst-03-roundtrip.test.mjs` — covers UPST-03 acceptance (sync → convert → assert patched method exists in output → re-sync → re-convert → assert still present)
- [ ] (Optional) `tests/fixtures/upstream/*.ts` — minimal Playwright POM fixtures to feed the converter
- [ ] (Optional) `tests/fixtures/expected/*.ts` — expected k6 output for round-trip diffing

**Framework install:** None needed — `node:test` is built into Node 22 `[VERIFIED]`. `typescript` already installed for module loading.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 2 has no user-facing auth surface. |
| V3 Session Management | no | No sessions. |
| V4 Access Control | no | Local maintainer tooling only; no remote endpoints. |
| V5 Input Validation | YES | CLI flag values (`--source`, `--repo`, `--branch`) — validate types and reject path traversal. |
| V6 Cryptography | no | No secrets handled. |
| V12 Files and Resources | YES | Filesystem operations under controlled paths (`src/pages/`, `lib/pages/`). Avoid path-traversal escapes. |
| V13 API and Web Services | no | No HTTP server/client beyond `git clone`. |
| V14 Configuration | YES | `.env`-style config (`EASYPLAYWRIGHT_SRC` env var) — keep precedence consistent with Phase 1's `CLI > .env > shell env`. |

### Known Threat Patterns for Phase 2

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `--source ../../../../etc` | Tampering / Information disclosure | Resolve `--source` against `process.cwd()`; verify resolved path exists and contains `src/pages/`; reject if absolute path points outside `${HOME}` (soft check, log warning, don't block — recruiter use case is legitimate sibling repos). |
| Path traversal via `--source` containing symlinks pointing into protected dirs | Tampering | Use `fs.realpath()` before any wipe operation. Refuse to wipe a directory that resolves outside the project root. |
| Wipe operation runs against wrong directory (e.g., user typo `--source ./src/pages`) | Tampering / Denial of service | The wipe target is always `src/pages/` (hardcoded in script, not flag-driven). Only the SOURCE is flag-driven. Mitigation: don't accept `--target` flag. |
| `git clone` of malicious repo | Tampering / Code injection | Out of scope: maintainer is implicitly trusted to run `--repo <url>` only against repos they trust. Document in README "verify repo origin before running git mode." |
| Patch injection of malicious TS code | Tampering | Patches are maintainer-authored TS that ships with the easyk6 repo (not external). Treat as part of the codebase trust boundary. Document in `lib/pages-k6-patches/README.md`. |
| Generated TS code with broken syntax causes Vite build to dump partial files | Information disclosure (low) | D-35: per-file errors logged but don't abort. Acceptable — Vite build will fail in Phase 3 if a converted file has syntax errors, surfacing the bug. |

**ASVS L1 sufficiency:** This is a maintainer-time CLI tool (not a network service). ASVS L1 is the right bar for "trusted local input, no remote attack surface" use cases. The threat model is "user shoots themselves in the foot via typo" — addressed by hardcoding the wipe target.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | k6 1.5 `Page.waitForLoadState(state)` exists with same shape as Playwright | K6Page Contract | If absent, `K6Page.waitForLoadState()` becomes a no-op or needs replacement (e.g., poll `document.readyState` via `page.evaluate`). Plan should verify against k6/browser docs before locking. |
| A2 | k6 1.5 `Locator.filter({ hasText })` accepts the same shape ir-perf shim assumes | Selector Shim | If filter API differs, `getByText`/`getByRole` shim methods need rewriting. Low risk — k6 docs `[CITED]` confirm `.filter()` exists. |
| A3 | The k6-testing jslib import path (`@lib/vendor/k6-testing-wrapper.js` from ir-perf) is the right model for easyk6 | R4 transform | If we choose CDN import (`https://jslib.k6.io/k6-testing/0.6.1/index.js`) instead of vendoring, R4 changes accordingly. Recommend deciding in 02-02-PLAN. |
| A4 | Path traversal mitigation via `fs.realpath()` resolves correctly on Windows | Security Domain | Low risk — Node's `realpath` works on Windows. |
| A5 | Recruiter testing on macOS/Linux/Windows will all share the same `path.normalize()` output for the local-mode `source` field in `.sync-meta.json` | Sync Mode | False — Windows preserves `\`, POSIX uses `/`. The mitigation is to accept that the file is OS-specific (recruiter runs locally; metadata reflects the host). Document this in the file's header comment or README. |
| A6 | easyPlaywright POMs will not gain new patterns (e.g., `getByText`, `// #endregion`, `export default`) before Phase 2 ships | Conversion Rule Inventory | Low risk — easyPlaywright last commit is 2026-02-14; D-50 explicitly out-of-scopes upstream content beyond `src/pages/`. If upstream evolves, the converter has the rules ready (R17, primary endregion path) — they just become live. |

**If this table is non-empty, the planner / discuss-phase should confirm A1 and A3 with the user before locking 02-02-PLAN.** A1 affects the K6Page contract; A3 affects whether we vendor or CDN-import k6-testing.

## Open Questions (RESOLVED)

> All six questions raised during research were resolved during 02-CONTEXT lock-in and 02-02-PLAN/02-03-PLAN authoring. Each carries a `RESOLVED:` marker below for traceability. The 02-02 split into 02-02 + 02-03 (per checker scope_sanity blocker) only changed *which plan* delivers each piece — the locked decisions are unchanged.

1. **k6-testing import strategy: vendor vs CDN?**
   - What we know: ir-perf-k6 vendors `lib/vendor/k6-testing.js` + a CommonJS wrapper. CDN URL `https://jslib.k6.io/k6-testing/0.6.1/index.js` works in k6 directly but not with Vite's bundler unless treated as external.
   - What's unclear: easyk6's Vite config marks `k6/*` as external but doesn't yet handle `https://*` imports.
   - Recommendation: **vendor** — it's a single small file, mirrors ir-perf, keeps the recruiter-facing repo zero-network. Add `lib/vendor/k6-testing.js` + wrapper as part of Phase 2.
   - **RESOLVED:** vendor locally (locked as A3 in Assumptions Log). `lib/vendor/k6-testing.js` + `lib/vendor/k6-testing-wrapper.js` ship in Plan 02-03 (post-split). The converter injects `import { expect } from '@lib/vendor/k6-testing-wrapper.js';` only when residual `// k6-compat:` lines remain after Stage 5 of the transform pipeline. Documented in `lib/vendor/README.md`.

2. **Should `BasePage.ts` skip be hardcoded or configurable?**
   - What we know: D-31 says ALL mode. CONTEXT.md doesn't explicitly state `BasePage.ts` handling.
   - What's unclear: Configurable skip-list (e.g., array `SKIP_FILES = ['BasePage.ts', 'index.ts']` in script source) vs hardcoded.
   - Recommendation: hardcoded `const SKIP_FILES = new Set(['BasePage.ts', 'index.ts'])` at top of `convert-pages.mjs`. Recruiter reads it instantly. Configurability adds noise.
   - **RESOLVED:** hardcoded `const SKIP_FILES = new Set(['BasePage.ts', 'index.ts'])` at the top of `scripts/convert-pages.mjs` (Plan 02-03). Recruiter reads the skip-list inline; no flag noise. Configurable variant explicitly rejected.

3. **Should the demonstration patch live in 02-02 or a third sub-plan?**
   - D-46 says 02-02 owns "demonstration patch." ✓
   - No question; documented for completeness.
   - **RESOLVED:** **moved to Plan 02-03** (post-split per checker scope_sanity blocker). The demo patch on `HomePage` ships with the orchestrator + integration round-trip in 02-03 because it requires the full sync→convert pipeline to prove UPST-03 end-to-end. The split does NOT change which decision (D-46) owns the work — only which plan delivers it.

4. **`.gitkeep` regeneration after wipe?**
   - What we know: D-26 wipes `src/pages/`. `.gitkeep` is git-tracked; absent from disk after wipe but restored on `git checkout`.
   - What's unclear: Whether sync-src should re-emit `.gitkeep` to keep folder listed even on dirty workdir.
   - Recommendation: don't bother. Folder is repopulated immediately. If sync fails mid-way, user runs `git checkout src/pages/.gitkeep`.
   - **RESOLVED:** do NOT regenerate `.gitkeep` in either `scripts/sync-src.mjs` or `scripts/convert-pages.mjs`. Both wipes immediately repopulate the target directory; `.gitkeep` is git-tracked so a stray `git checkout src/pages/.gitkeep` is the recovery path for a mid-sync abort.

5. **`tsc --noEmit` enforcement on generated output?**
   - What we know: `tsconfig.json` includes `lib/**/*.ts`. Phase 1 has no `tsc` test gate.
   - What's unclear: Whether 02-02 should add a `tsc --noEmit` step after conversion.
   - Recommendation (research): add it as a non-blocking validation step in the converter. Stronger version (exit 1 on any TS error) belongs in Phase 3 when scenarios consume `lib/pages/`.
   - **RESOLVED:** **DEFERRED to Phase 3.** Rationale: Plan 02-03 keeps `scripts/convert-pages.mjs` simple and recruiter-readable. Wave 0 already covers TS validity per generated file via `tests/unit/convert-roundtrip.test.mjs` (calls `ts.transpileModule` and asserts no diagnostics on the generated `HomePage.ts`), so the gate exists at unit-test level. A repo-wide `tsc --noEmit` step lands in Phase 3 alongside scenarios that import from `@pages/` — that is the natural moment to enforce a typecheck gate across the full `lib/pages/` tree. The converter itself stays a pure transformer with no compiler dependency at runtime.

6. **Vite alias path for K6Page in generated imports**
   - Generated POMs at `lib/pages/HomePage.ts` import from `'./base/base-page'`. Generated POMs at `lib/pages/components/NavigationComponent.ts` import from `'../base/base-page'`. Both use relative paths — works fine.
   - **Alternative:** use the `@lib/pages/base/base-page` alias (Vite resolves it). Single import string works at any depth. Simpler converter (no `computeK6ImportPath` needed).
   - Recommendation: use **relative imports** for generated POMs (mirrors ir-perf-k6, makes `tsc --noEmit` work without alias resolution). Use the `@pages` alias only in scenario files (Phase 3+).
   - **RESOLVED:** **relative imports** for generated POMs. Plan 02-02 ships `computeK6ImportPath(relPath)` in `scripts/lib/transforms.mjs` (returns `./base/base-page` for top-level POMs, `../base/base-page` for one-level-deep `components/*`). The `@pages` Vite alias is reserved for Phase 3 scenario imports.

## Sources

### Primary (HIGH confidence)
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\config\convert-to-k6.sh` — the canonical conversion ruleset (read in full); `[VERIFIED via Read tool]`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\scripts\sync-frontend-src.mjs` — sync pattern reference; `[VERIFIED]`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\base\base-page.ts` — K6Page contract; `[VERIFIED]`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\utils\selectors.ts` — selector shim; `[VERIFIED]`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\pages-k6-patches\` — patch examples; `[VERIFIED]`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\vendor\k6-testing-wrapper.js` + `README.md` — vendoring pattern for k6-testing; `[VERIFIED]`
- `C:\Users\pzhly\Documents\GitHub\easyPlaywright\src\pages\*.ts` (8 files); `[VERIFIED via Read]`
- `https://grafana.com/docs/k6/latest/javascript-api/k6-browser/page/` — confirms native `getBy*` on k6 1.5; `[CITED]`
- `https://grafana.com/docs/k6/latest/javascript-api/k6-browser/locator/waitfor/` — confirms `state` options; `[CITED]`
- `https://grafana.com/docs/k6/latest/javascript-api/k6-browser/locator/` — confirms `.first()`, `.last()`, `.clear()`, `.filter()` natively; `[CITED]`
- `https://github.com/grafana/k6-jslib-testing` — confirms Playwright-compatible assertion list; `[CITED]`

### Secondary (MEDIUM confidence)
- `https://jslib.k6.io/` — k6-testing 0.6.1 latest; `[CITED]`
- Phase 1 test files (`tests/unit/runtime-config.test.mjs`, `tests/unit/perf-runner.test.mjs`) — testing patterns to mirror; `[VERIFIED]`
- `easyk6/scripts/perf-runner.mjs` — ESM CLI structure to mirror; `[VERIFIED]`

### Tertiary (LOW confidence)
- None tagged LOW — all critical claims have HIGH or MEDIUM evidence.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies are Node builtins or already-installed Phase 1 tools.
- Architecture: HIGH — every transform rule traces to a specific line in `convert-to-k6.sh`; every constraint traces to a CONTEXT.md decision.
- Pitfalls: HIGH — all 10 pitfalls observed in the upstream POM patterns or in the ir-perf-k6 reference.
- Validation: HIGH — `node:test` baseline already proven in Phase 1.
- A1/A3 assumptions: MEDIUM — k6 API verified for surface methods; specific `waitForLoadState` semantics + `k6-testing` vendoring strategy need user confirmation.

**Research date:** 2026-05-08
**Valid until:** 2026-06-07 (30 days; conversion rules are stable, k6 1.5 toolchain is locked)
