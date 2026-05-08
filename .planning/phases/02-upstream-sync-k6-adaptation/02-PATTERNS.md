# Phase 2: Upstream Sync & k6 Adaptation - Pattern Map

**Mapped:** 2026-05-08
**Files analyzed:** 16 (5 source, 9 test, 2 vendor) + 3 doc updates
**Analogs found:** 16 / 16 (every target file has at least one strong analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/sync-src.mjs` | tooling/CLI | file-I/O + child-process | `ir-perf-k6/scripts/sync-frontend-src.mjs` (full file) + `easyk6/scripts/perf-runner.mjs` (CLI shape) | exact (sync) + role-match (CLI shape) |
| `scripts/convert-pages.mjs` | tooling/CLI | file-I/O + transform | `ir-perf-k6/config/convert-to-k6.sh` (ruleset) + `easyk6/scripts/perf-runner.mjs` (CLI shape) | exact (rules) + role-match (CLI shape) |
| `scripts/lib/transforms.mjs` (optional split) | utility | transform | extracted from `convert-to-k6.sh:299-637` | exact |
| `scripts/lib/patch-injector.mjs` (optional split) | utility | transform | `convert-to-k6.sh:751-787` | exact |
| `lib/pages/base/base-page.ts` | model/base-class | request-response (k6 VU) | `ir-perf-k6/lib/base/base-page.ts` | exact |
| `lib/pages/base/selectors.ts` | utility/shim | request-response (k6 VU) | `ir-perf-k6/lib/utils/selectors.ts` | exact |
| `lib/pages-k6-patches/HomePage.k6-patch.ts` | model-fragment (injected) | request-response (k6 VU) | `ir-perf-k6/lib/pages-k6-patches/main-menu/main-menu.k6-patch.ts` (minimal patch) + `project-list.k6-patch.ts` (full patch) | exact |
| `lib/vendor/k6-testing.js` | vendored library | request-response | `ir-perf-k6/lib/vendor/k6-testing.js` (verbatim) | exact |
| `lib/vendor/k6-testing-wrapper.js` | vendor wrapper | request-response | `ir-perf-k6/lib/vendor/k6-testing-wrapper.js` (verbatim) | exact |
| `lib/vendor/README.md` | docs | n/a | `ir-perf-k6/lib/vendor/README.md` (adapted) | role-match |
| `tests/unit/sync-src.test.mjs` | test | request-response | `easyk6/tests/unit/perf-runner.test.mjs` (subprocess CLI test) | exact |
| `tests/unit/convert-transforms.test.mjs` | test | transform unit | `easyk6/tests/unit/runtime-config.test.mjs` (TS-module loader) | role-match |
| `tests/unit/convert-pages.test.mjs` | test | file-I/O | `easyk6/tests/unit/perf-runner.test.mjs` + `runtime-config.test.mjs` | role-match |
| `tests/unit/convert-patch-injection.test.mjs` | test | transform unit | `easyk6/tests/unit/runtime-config.test.mjs` | role-match |
| `tests/unit/convert-roundtrip.test.mjs` | test | file-I/O + TS check | `easyk6/tests/unit/runtime-config.test.mjs` (`ts.transpileModule`) | exact (TS load) |
| `tests/unit/k6page-base.test.mjs` | test | request-response | `easyk6/tests/unit/runtime-config.test.mjs` (load TS via `ts.transpileModule`) | exact |
| `tests/unit/selectors.test.mjs` | test | request-response | `easyk6/tests/unit/runtime-config.test.mjs` | exact |
| `tests/integration/upst-03-roundtrip.test.mjs` | test | file-I/O + child-process | `easyk6/tests/unit/perf-runner.test.mjs` (`spawnSync` runner) | role-match |
| `tests/fixtures/upstream/*.ts` | fixture | n/a | `easyPlaywright/src/pages/HomePage.ts` (smaller variant) | exact |
| `tests/fixtures/expected/*.ts` | fixture | n/a | `ir-perf-k6/lib/pages/<converted>` (none read; reconstruct from rules) | partial |
| `README.md` (update) | docs | n/a | `easyk6/README.md` Phase 1 quickstart | role-match |
| `PROJECT_STRUCTURE.md` (update) | docs | n/a | `easyk6/PROJECT_STRUCTURE.md` Phase 1 layout | role-match |

## Pattern Assignments

### `scripts/sync-src.mjs` (tooling/CLI, file-I/O + child-process)

**Primary analog:** `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\scripts\sync-frontend-src.mjs` (full file, 195 lines)
**Secondary analog:** `C:\Users\pzhly\Documents\GitHub\easyk6\scripts\perf-runner.mjs` (commander shape only)

**Imports + module header pattern** (sync-frontend-src.mjs:1-26):
```javascript
#!/usr/bin/env node

// Cross-platform (Windows-friendly) sync of upstream UI `src/` into local `src/`.
// Mirrors the logic of cicd/sync-frontend-src.sh without requiring bash.

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
```

**KEY ADAPTATION for easyk6:** swap manual `parseArgs` for `commander` (Phase 1 already depends on it; perf-runner uses it). Drop the `--dest` flag — the wipe target is hardcoded to `src/pages/` (security mitigation per RESEARCH §"Wipe operation runs against wrong directory"). Keep the `node:` prefixed imports — Phase 1 uses identical style.

**`run()` spawn helper** (sync-frontend-src.mjs:78-91) — port verbatim:
```javascript
function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}: ${stderr || stdout}`));
    });
  });
}
```

**`checkGit()` precheck** (sync-frontend-src.mjs:93-99) — port verbatim, only invoke before git mode:
```javascript
async function checkGit() {
  try {
    await run('git', ['--version']);
  } catch (e) {
    throw new Error('Git is required on PATH. Please install Git and retry.');
  }
}
```

**`promptConfirm()` interactive guard** (sync-frontend-src.mjs:101-106) — port verbatim:
```javascript
async function promptConfirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}
```

**`emptyDir()` wipe helper** (sync-frontend-src.mjs:112-121) — port verbatim:
```javascript
async function emptyDir(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const tasks = entries.map(async (e) =>
      fs.rm(path.join(dir, e.name), { recursive: true, force: true }));
    await Promise.all(tasks);
  } catch (e) {
    if (e && e.code === 'ENOENT') return; // nothing to empty
    throw e;
  }
}
```

**Git-mode body** (sync-frontend-src.mjs:159-184) — port with subdir narrowing to `src/pages/`:
```javascript
const tmpParent = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-frontend-'));
const tmp = path.join(tmpParent, 'repo');
try {
  console.log('[sync-frontend-src] Cloning...');
  await run('git', ['clone', '--depth', '1', '--branch', args.branch, args.repo, tmp]);

  const upstreamSrc = path.join(tmp, 'src');                     // ← easyk6 narrows to 'src/pages'
  const exists = await fs.stat(upstreamSrc).then(s => s.isDirectory()).catch(() => false);
  if (!exists) {
    throw new Error(`Expected directory '${upstreamSrc}' in remote repository.`);
  }

  await ensureDir(args.dest);
  await emptyDir(args.dest);
  await copyDir(upstreamSrc, args.dest);
} finally {
  try { await fs.rm(tmpParent, { recursive: true, force: true }); } catch { /* ignore */ }
}
```

**Prompt + skip-on-CI behavior** (sync-frontend-src.mjs:154-157) — port verbatim, **add `--yes` and `CI=1` short-circuits per D-28**:
```javascript
if (process.env.CI !== '1' && !args.yes) {
  const ok = await promptConfirm(`This will replace contents of '${args.dest}/'. Continue? [y/N] `);
  if (!ok) { console.log('Aborted.'); return; }
}
```

**main() shape + error handling** (perf-runner.mjs:113-143):
```javascript
async function main() {
  const cli = buildCli();
  cli.parse(process.argv);
  const cliOptions = cli.opts();
  // ... work
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

**Key adaptations for easyk6:**
1. **Add local mode** (default per D-22/D-23). Use `fs.cp(upstreamPages, 'src/pages', { recursive: true })` — Node 16+ builtin (RESEARCH §"Don't Hand-Roll").
2. **Mode selection** via flag presence: `--repo` ⇒ git, otherwise local. **Validate** mutual exclusion of `--repo` + `--source` (RESEARCH §"Mode flags").
3. **Hardcode wipe target** to `src/pages/` (drop `--dest` flag — security per RESEARCH §"Wipe operation").
4. **Realpath traversal check** before wipe (RESEARCH §"Path traversal via `--source`"): `await fs.realpath(resolvedSource)` and reject if outside project root sibling-set.
5. **Write `.sync-meta.json`** after successful copy (D-27, schema in RESEARCH §`.sync-meta.json` Schema): `{ source, mode, branch?, commit?, syncedAt }`.
6. **Capture commit SHA** in git mode via `await run('git', ['-C', tmp, 'rev-parse', 'HEAD'])` (RESEARCH Pattern 2).
7. **Use `commander` not manual parseArgs** — Phase 1 baseline (perf-runner.mjs:8, 19-31).
8. **Pre-flight upstream check** before wipe (Pitfall 8): verify `<source>/src/pages/` exists or fail fast with the upstream-not-found error message style.

---

### `scripts/convert-pages.mjs` (tooling/CLI, file-I/O + transform)

**Primary analog:** `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\config\convert-to-k6.sh` (937 lines, ruleset only — port to Node)
**Secondary analog:** `C:\Users\pzhly\Documents\GitHub\easyk6\scripts\perf-runner.mjs` (CLI scaffold)

**CLI scaffold** — copy from `perf-runner.mjs:1-31`:
```javascript
#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function buildCli() {
  const program = new Command();
  program
    .name('easyk6-convert-pages')
    .description('Convert synced Playwright Page Objects to k6-safe modules.');
  // ... options (--source-dir omitted per D-31; --no-emit-banner for tests if desired)
  return program;
}
```

**Stage 1 — strip Playwright imports** (convert-to-k6.sh:299-302):
```bash
# Source rule (sed):
sed -i "/import.*expect.*from '@playwright\/test'/d" "$temp_file"
sed -i "/import { Page, Locator } from '@playwright\/test';/d" "$temp_file"
sed -i "/import { Page } from '@playwright\/test';/d" "$temp_file"
sed -i "/import { Locator } from '@playwright\/test';/d" "$temp_file"
```
**Node port (proposed):**
```javascript
function stripPlaywrightImports(content) {
  return content
    .split(/\r?\n/)
    .filter(line => !/^import .*from ['"]@playwright\/test['"];?\s*$/.test(line))
    .join('\n');
}
```

**Stage 2 — strip duplicate k6 imports for idempotency** (convert-to-k6.sh:305-311) — port the matching `sed` lines to a single `filter` over regexes; covers `k6/browser`, `k6/experimental/browser`, `K6Page`, `K6PlaywrightSelectors`, residual `expect`.

**Stage 3 — inject k6 imports + extends K6Page via awk block** (convert-to-k6.sh:640-700):
```awk
# Source: convert-to-k6.sh:653-667 (awk inside bash script)
/^import / && k6_imports_added == 0 {
    print ""
    print "import { Page, Locator } from '"'"'k6/browser'"'"';"
    print "import { K6Page } from \"" import "\";"
    print "import { expect } from '"'"'@lib/vendor/k6-testing-wrapper.js'"'"';"
    print ""
    k6_imports_added = 1
}

/^(export default )?class [A-Za-z][A-Za-z0-9]* \{/ && class_extended == 0 {
    sub(/\{/, "extends K6Page {")
    class_extended = 1
}
```
**Node port — single-pass scanner** that:
1. Computes `k6_import` via `computeK6ImportPath(relPath)` (RESEARCH "Computing K6Page import depth"):
   ```javascript
   function computeK6ImportPath(relPath) {
     const depth = (relPath.match(/[\\/]/g) || []).length;
     return '../'.repeat(depth) + 'base/base-page';
   }
   ```
2. Inserts the three import lines before the first existing `import` (or before the first `class` if no imports remain).
3. Replaces FIRST `class X {` with `class X extends K6Page {` — **easyk6 ADAPTATION:** also handle `class X extends BasePage {` ⇒ `class X extends K6Page {` (RESEARCH R5 note: ir-perf converter doesn't, easyk6 must).

**Stage 4 — `super(page)` injection** (convert-to-k6.sh:711-722):
```awk
/constructor\(page: Page\) \{/ {
    print
    getline next_line
    if (next_line !~ /super\(page\)/) {
        print "        super(page);"
    }
    print next_line
    next
}
```
**Node port:** scan lines, if `constructor(page: Page) {` appears and the next non-blank line lacks `super(page)`, inject `        super(page);` (8-space indent matches upstream style — verified vs `easyPlaywright/src/pages/HomePage.ts:31-32`, which already calls `super(page)`, so this is defensive only).

**Stage 5 — `expect(...).toX()` balanced-paren walker** (convert-to-k6.sh:434-615) — **port the Python verbatim**. Two helpers + one driver:

`extractBalancedParens(text, start)` (sh:434-450):
```javascript
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
```

`stripExpectMessage(expr)` (sh:452-487) — port verbatim, tracks string boundaries (`'`, `"`, `` ` ``) with backslash escapes, plus `()`, `{}`, `[]` depths; splits only on top-level commas.

`processExpectCalls(content)` (sh:489-615) — drives the walker; rules table:

| `expect(X).toBeVisible(opts?)` | `await X.waitFor({ state: 'visible' })` | sh:581-587 |
| `expect(X).not.toBeVisible(opts?)` | `await X.waitFor({ state: 'hidden' })` | sh:582 |
| `expect(X).toBeHidden(opts?)` | `await X.waitFor({ state: 'hidden' })` | sh:589-595 |
| `expect(X).toBeEnabled(opts?)` | `await X.waitFor({ state: 'visible' })` | sh:597-602 |
| **All others** (`toHaveText`, `toHaveCount`, `toBe`, `.resolves.X`, etc.) | `// k6-compat: <original>` (commented) | sh:604-611 |

`timeout` extraction (sh:583-586) — preserve numeric `timeout: N` in opts:
```javascript
const timeoutMatch = methodArgs.trim() ? /timeout:\s*(\d+)/.exec(methodArgs) : null;
const opts = timeoutMatch
  ? `{ state: '${state}', timeout: ${timeoutMatch[1]} }`
  : `{ state: '${state}' }`;
```

**Stage 6 — simple regex transforms** (convert-to-k6.sh:373-637) — port these only (others not needed per RESEARCH "Conversion Rule Inventory" R20-R27 = skip):

| Rule | Source line | Replace |
|------|-------------|---------|
| `.first()` → `.nth(0)` | sh:631 | `s/\.first\(\)/.nth(0)/g` |
| `.last()` → `.nth(-1)` | sh:634 | `s/\.last\(\)/.nth(-1)/g` |
| `.clear()` → `.fill('')` | sh:637 | `s/\.clear\(\)/.fill(''))/g` |
| `this.page.getByTitle('X')` → `this.page.locator('[title="X"]')` | sh:373-374 | both quote variants |
| `this.page.getByText/Role/TestId(` → `this.selectors.X(` | sh:377-379 | three rules |
| `page.getByTestId(` (no `this.`) → `this.selectors.getByTestId(` | sh:382 | edge case |
| `this.page.locator('X', { hasText: Y })` → `` this.page.locator(`X:has-text("${Y}")`) `` | sh:385-386 | both quote variants |

**Stage 7 — page-field shadow strip** (convert-to-k6.sh:732-737):
```awk
/^[[:space:]]*(private|protected)?[[:space:]]*(readonly[[:space:]]+)?page[[:space:]]*:/ {
    next
}
{ print }
```
Critical for `useDefineForClassFields:true`. easyPlaywright's `BasePage.ts:10` declares `protected readonly page: Page` — but BasePage is skipped per Pitfall 4. The components (e.g., `NavigationComponent.ts:10` `private readonly page: Page`) MUST be processed by this rule once they extend K6Page.

**Stage 8 — patch injection** (covered in `scripts/lib/patch-injector.mjs` section below).

**Stage 9 — header banner write** (convert-to-k6.sh:791-800):
```bash
echo "// K6-compatible version - Auto-generated from Playwright Page Object"
echo "// Source: $src"
if [ -f "$patch_file" ]; then
    echo "// K6-PATCHES: Includes methods from $patch_file"
fi
```
**Node port (D-33):**
```javascript
const banner = [
  '// K6-compatible version - Auto-generated from Playwright Page Object',
  `// Source: ${path.relative(projectRoot, srcPath).replace(/\\/g, '/')}`,
  patchExists ? `// K6-PATCHES: Includes methods from ${patchRel}` : null,
  '',
].filter(v => v !== null).join('\n');
await fs.writeFile(tgtPath, banner + '\n' + content, 'utf8');
```

**Per-file orchestration with error handling** (RESEARCH "Per-file convert with error handling"):
```javascript
async function convertAll() {
  const sourceDir = 'src/pages';
  const SKIP_FILES = new Set(['BasePage.ts', 'index.ts']);  // Pitfall 4 + 5
  const files = await collectTsFiles(sourceDir);
  let errors = 0;
  for (const [count, file] of files.entries()) {
    const rel = path.relative(sourceDir, file);
    if (SKIP_FILES.has(rel)) continue;
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
  if (errors > 0) process.exit(1);  // D-35
}
```

**Wipe `lib/pages/` except `base/`** (D-34):
```javascript
async function emptyLibPagesExceptBase() {
  const entries = await fs.readdir('lib/pages', { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'base') continue;
    await fs.rm(path.join('lib/pages', e.name), { recursive: true, force: true });
  }
}
```

**Recursive TS file collection** (RESEARCH "Recursively listing TS files"):
```javascript
async function collectTsFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      out.push(path.join(e.parentPath ?? dir, e.name));
    }
  }
  return out;
}
```

**Key adaptations for easyk6:**
1. **`BasePage.ts` and `index.ts` skip** — hardcoded set at top of file (RESEARCH Open Question 2 + Pitfall 4/5).
2. **Hand-author `lib/pages/index.ts`** in 02-02-PLAN as a barrel that re-exports the converted POMs (drop the upstream `BasePage` re-export, or shim it: `export { K6Page as BasePage } from './base/base-page'`).
3. **Windows path handling** in import emit (Pitfall 1): always `.split(path.sep).join('/')` before writing import strings, OR use `path.posix` exclusively for emitted paths.
4. **EOL preservation** (Pitfall 2): detect input EOL once per file, normalize all transforms back to that EOL before write.
5. **Pre-flight `src/pages/` not empty** (Pitfall 10): if no `.ts` files (excluding `.gitkeep` + `.sync-meta.json`), error with "src/pages/ is empty. Run `npm run sync:src` first."
6. **No `--source-dir` flag** (Pitfall 6): convert always reads `src/pages/`, always writes `lib/pages/`. Don't accept overrides — prevents double-conversion.

---

### `scripts/lib/transforms.mjs` (utility, transform — optional split)

Pure functions, no I/O, exported for unit testing. Each transform from convert-to-k6.sh becomes a named export. Test surface = one test per transform.

**Source:** `convert-to-k6.sh:280-737` (extract logic; keep stages independent).

**Module skeleton:**
```javascript
// scripts/lib/transforms.mjs
export function stripPlaywrightImports(content) { /* sh:299-311 */ }
export function stripDuplicateK6Imports(content) { /* sh:305-311 */ }
export function injectK6Imports(content, k6ImportPath) { /* sh:653-687 */ }
export function ensureExtendsK6Page(content) { /* sh:693-697 + easyk6 BasePage→K6Page rule */ }
export function ensureSuperPageCall(content) { /* sh:711-723 */ }
export function transformExpectAssertions(content) { /* sh:434-615 */ }
export function transformLocatorShortcuts(content) { /* .first/.last/.clear from sh:631-637 */ }
export function transformGetByMethods(content) { /* sh:373-386 */ }
export function stripPageFieldShadow(content) { /* sh:732-737 */ }
export function computeK6ImportPath(relPath) { /* sh:269-277 */ }
```

**Adaptations:** see Stage rules above. Order matters — see RESEARCH Pattern 3 pipeline order: 1→2→3→4→5→6→7→8→9.

---

### `scripts/lib/patch-injector.mjs` (utility, transform — optional split)

**Primary analog:** `convert-to-k6.sh:751-787` (Python embedded in bash).

**Source code from analog (sh:763-784):**
```python
last_endregion = content.rfind('// #endregion')
if last_endregion != -1:
    line_start = content.rfind('\n', 0, last_endregion)
    if line_start == -1:
        line_start = 0
    else:
        line_start += 1
    content = content[:line_start] + patch_content + '\n' + content[line_start:]
else:
    export_pos = content.rfind('export default')
    if export_pos != -1:
        brace_pos = content.rfind('}', 0, export_pos)
        if brace_pos != -1:
            content = content[:brace_pos] + patch_content + '\n' + content[brace_pos:]
```

**Node port with easyk6 fallback adaptation (RESEARCH §"Patch Injection Algorithm"):**
```javascript
export function injectPatch(content, patchContent) {
  // Primary: before LAST '// #endregion'
  const lastEndregion = content.lastIndexOf('// #endregion');
  if (lastEndregion !== -1) {
    let lineStart = content.lastIndexOf('\n', lastEndregion);
    lineStart = lineStart === -1 ? 0 : lineStart + 1;
    return content.slice(0, lineStart) + patchContent + '\n' + content.slice(lineStart);
  }
  // easyk6 ADAPTATION: skip 'export default' middle step (never present in easyPlaywright POMs)
  // Fallback: before file's last '}' (final closing brace of last class)
  const lastBrace = content.lastIndexOf('}');
  if (lastBrace !== -1) {
    return content.slice(0, lastBrace) + patchContent + '\n' + content.slice(lastBrace);
  }
  throw new Error('Cannot locate injection point in generated POM.');
}
```

**Patch path resolution (Pitfall 7):**
```javascript
export function patchPathFor(relPath) {
  return path.join('lib/pages-k6-patches', relPath.replace(/\.ts$/, '.k6-patch.ts'));
}
```

**Logging** (D-43, sh:747):
```javascript
console.log(`  ↳ Injecting k6-specific methods from: ${patchPath}`);
```

---

### `lib/pages/base/base-page.ts` (model/base-class, request-response)

**Primary analog:** `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\base\base-page.ts` (full file, 48 lines)
**Secondary analog (for `pageUrl` field semantics):** `C:\Users\pzhly\Documents\GitHub\easyPlaywright\src\pages\BasePage.ts:9-32`

**Verbatim contract from ir-perf-k6/lib/base/base-page.ts:1-23:**
```typescript
import { Page, Locator } from 'k6/browser';
import { K6PlaywrightSelectors } from '../utils/selectors';  // ← easyk6 path: './selectors'

/**
 * Base class for k6-compatible Page Object Models.
 * Provides access to the k6 Page object and helper selectors.
 */
export class K6Page {
  protected page: Page;
  protected selectors: K6PlaywrightSelectors;

  constructor(page: Page) {
    this.page = page;
    this.selectors = new K6PlaywrightSelectors(page);
  }
}
```

**easyPlaywright BasePage navigate pattern (BasePage.ts:14-32) — what converted code expects to inherit:**
```typescript
constructor(page: Page) {
  this.page = page;
}

async navigate(): Promise<void> {
  await this.page.goto(this.pageUrl);
  await this.waitForPageLoad();
}

async waitForPageLoad(): Promise<void> {
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForLoadState('networkidle');
}
```

**Recommended easyk6 K6Page** (synthesizes both analogs, per RESEARCH §"K6Page Contract" recommendation #1):
```typescript
import { Page } from 'k6/browser';
import { K6PlaywrightSelectors } from './selectors';

/**
 * Base class for k6-compatible Page Object Models.
 * Adapts upstream easyPlaywright BasePage.navigate() shape so converted POMs
 * inherit `super.navigate()` without rewrites.
 */
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
    if ('waitForLoadState' in this.page) {
      await (this.page as { waitForLoadState: (s: string) => Promise<void> }).waitForLoadState(state);
    }
  }
}
```

**Key adaptations for easyk6:**
1. **Drop `waitForSpinnerToDisappear`** (ir-perf:29-46) — IriusRisk-specific; QAbbalah is a static blog (RESEARCH §"Adaptation needed").
2. **Add `pageUrl` and `pageTitle` protected fields** so converted subclasses' `protected readonly pageUrl = ''` declarations type-check (HomePage.ts:17-18).
3. **Add `navigate()` and `waitForLoadState()`** mirroring upstream BasePage shape — A1 assumption flagged in RESEARCH; verify k6 1.5 `Page.waitForLoadState` exists during 02-02 plan-check.
4. **Selectors import path** — use `./selectors` (sibling), not `../utils/selectors` (ir-perf layout).

---

### `lib/pages/base/selectors.ts` (utility/shim, request-response)

**Primary analog:** `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\utils\selectors.ts` (full file, 85 lines) — port verbatim.

**Class header + getByTestId (selectors.ts:1-22):**
```typescript
import { Page } from 'k6/browser';

/**
 * Helper functions to mimic Playwright-like selectors for xk6-browser.
 * Note: These are simplified versions and may not cover all Playwright's advanced selector capabilities.
 */
export class K6PlaywrightSelectors {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  getByTestId(testId: string) {
    return this.page.locator(`[data-testid="${testId}"]`);
  }
```

**getByText with `exact` option (selectors.ts:32-39):**
```typescript
getByText(text: string, options?: { exact?: boolean }) {
  if (options?.exact) {
    return this.page.locator('*').filter({ hasText: new RegExp(`^${this.escapeRegex(text)}$`) });
  }
  return this.page.locator('*').filter({ hasText: text });
}

private escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**getByRole + filterByText (selectors.ts:58-83):**
```typescript
getByRole(role: string, options?: { name?: string | RegExp }) {
  const roleLocator = this.page.locator(`[role="${role}"]`);
  if (options?.name) {
    if (typeof options.name === 'string') {
      return roleLocator.filter({ hasText: new RegExp(`^${this.escapeRegex(options.name)}$`) });
    }
    return roleLocator.filter({ hasText: options.name });
  }
  return roleLocator;
}

filterByText(locator: any, text: string) {
  return locator.filter({ hasText: text });
}
```

**Key adaptations for easyk6:** none — port verbatim. The shim's value is API stability + conversion symmetry (RESEARCH §"Selector Shim"). Update the JSDoc comment to drop "xk6-browser" → "k6/browser" (k6 1.5 stable namespace).

---

### `lib/pages-k6-patches/HomePage.k6-patch.ts` (model-fragment, request-response)

**Primary analogs:**
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\pages-k6-patches\main-menu\main-menu.k6-patch.ts` (minimal example, 7 lines — header-only)
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\pages-k6-patches\project\project-list.k6-patch.ts` (full method-injection example, 98 lines)

**Header banner from main-menu.k6-patch.ts:1-3 (mandatory):**
```typescript
// K6-SPECIFIC METHODS - Automatically injected by convert-to-k6.sh
// These methods are NOT in upstream Playwright Page Objects
// DO NOT add to src/pages/ - they belong here
```

**Method-fragment shape from project-list.k6-patch.ts:5-37 (no imports, no class declaration, sits inside class scope):**
```typescript
  /**
   * Changes the project list sort order by clicking the sort dropdown and selecting an option.
   * k6-specific method added to handle VU-based project shuffling in load tests.
   * @param optionIndex The index of the sort option to select (0-based)
   * @param timeout Timeout in milliseconds for waiting
   * @returns The text of the selected option, or null if the dropdown wasn't found
   */
  async changeSortOrder(optionIndex: number = 1, timeout: number = 30000): Promise<string | null> {
    try {
      const projectActionsDropdown = this.page.locator('[data-testid="dpdw-projects-actions"]');
      await projectActionsDropdown.waitFor({ state: 'visible', timeout });
      await projectActionsDropdown.click();
      ...
```

**Recommended easyk6 demo content (RESEARCH §"Patch Injection Algorithm" → "Example demonstration patch"):**
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

**Key adaptations for easyk6:**
1. **Update header banner attribution** — `convert-pages.mjs` not `convert-to-k6.sh`.
2. **2-space indent** matches `easyPlaywright/src/pages/HomePage.ts` style (sh:744 says 2 OR 4 — match the host file).
3. **Method must reference upstream-defined `waitForHomePageContent()`** (HomePage.ts:57-59) to prove the patch sits inside HomePage's class scope, not at module top-level. Same proof technique as ir-perf project-list.k6-patch.ts:53-59 (calls `this.rows.projects`).
4. **No imports** (D-41) — `Locator`, `Page` come from converter's injected k6 imports; `K6Page` provides `this.page` + `this.selectors`.

---

### `lib/vendor/k6-testing.js` + `lib/vendor/k6-testing-wrapper.js` (vendored library)

**Primary analog:** `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\vendor\k6-testing.js` (verbatim copy from k6 jslib v0.5.0, ~50KB) + `k6-testing-wrapper.js` (10 lines).

**Wrapper file (k6-testing-wrapper.js:1-9) — port verbatim:**
```javascript
// ES6 wrapper for k6-testing CommonJS module
// This allows Vite to import the CommonJS module
const testing = require('./k6-testing.js');

// Re-export the expect function
export const expect = testing.expect;

// Export default as well for compatibility
export default testing;
```

**`k6-testing.js`:** copy bit-for-bit from `ir-perf-k6/lib/vendor/k6-testing.js` (already at 0.5.0 — RESEARCH notes 0.6.1 is current; 02-02-PLAN can decide whether to upgrade or match the reference).

**Vendor README.md** (adapted from `ir-perf-k6/lib/vendor/README.md:1-35`):
```markdown
# Vendor Libraries

Third-party k6 libraries bundled locally to avoid external CDN dependencies during test execution.

## Files

| Library | Version | Source | Purpose |
|---------|---------|--------|---------|
| `k6-testing.js` | 0.5.0 | k6 jslib | Playwright-compatible assertions (`expect`, etc.) used by converted POMs whose original `expect()` calls were commented out by `convert-pages.mjs`. |

## Wrappers

The `k6-testing-wrapper.js` file provides a CommonJS-compatible export shape so Vite can bundle it.

## Updates

To update:
1. Download new version from https://jslib.k6.io/k6-testing/<version>/index.js
2. Replace `k6-testing.js` and update version above.
3. Re-run `npm run build && npm run validate:build`.
```

**Key adaptations for easyk6:**
1. **Drop k6-reporter and k6-summary entries** (ir-perf README:14-17 mentions them; easyk6 doesn't need either at Phase 2).
2. **State the import path** the converter injects: `'@lib/vendor/k6-testing-wrapper.js'` — must match the `@lib` Vite alias (vite.config.ts:62).
3. **RESEARCH Open Question 1 (vendor vs CDN)** — recommended vendor; doc this rationale in the README.

---

### `tests/unit/sync-src.test.mjs` (test, request-response)

**Primary analog:** `C:\Users\pzhly\Documents\GitHub\easyk6\tests\unit\perf-runner.test.mjs` (full file, 64 lines) — uses `spawnSync` to drive the script and assert on stdout/stderr/exit code.

**Spawn helper + assertions (perf-runner.test.mjs:1-39):**
```javascript
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const runnerScript = path.join(projectRoot, 'scripts', 'perf-runner.mjs');

function runRunner(args, env) {
  const result = spawnSync(process.execPath, [runnerScript, ...args], {
    cwd: projectRoot,
    env,
    encoding: 'utf8',
  });
  return result;
}

test('shell-provided BASE_URL is accepted by the public runner', () => {
  const env = { ...process.env, BASE_URL: 'https://shell.example.test' };
  const result = runRunner(['--profile', 'smoke', '--dry-run'], env);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Resolved base URL: https:\/\/shell\.example\.test\//u);
});
```

**Tempdir + writeFile setup pattern (perf-runner.test.mjs:42-62):**
```javascript
test('env file beats shell BASE_URL in the public runner', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'easyk6-perf-runner-'));
  const envFile = path.join(tempDir, '.env');
  try {
    await writeFile(envFile, 'BASE_URL=https://env.example.test\n', 'utf8');
    // ... call runner, assert
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});
```

**Key adaptations for easyk6 sync-src tests:**
1. **Build a fake upstream** in tempdir: `<tmp>/easyPlaywrightFake/src/pages/HomePage.ts` (single fixture file).
2. **Drive sync-src with `--source <tmp>/easyPlaywrightFake --yes`** — ensures the prompt is skipped.
3. **Assertions:**
   - `result.status === 0`
   - `<easyk6 root>/src/pages/HomePage.ts` exists post-run
   - `.sync-meta.json` exists with `{ mode: 'local', source, syncedAt }` (parse JSON, validate keys via `assert.match` on values)
4. **Mutex test:** `--source X --repo Y` → exit code non-zero, stderr matches /mutually exclusive/.
5. **CI bypass:** spawn with `env: { ...process.env, CI: '1' }` and no `--yes` → still completes (no stdin).
6. **Note:** RESEARCH says "❌ Wave 0" for this file — doesn't exist yet, planner authors it.

---

### `tests/unit/convert-transforms.test.mjs` (test, transform unit)

**Primary analog (TS-loader pattern):** `C:\Users\pzhly\Documents\GitHub\easyk6\tests\unit\runtime-config.test.mjs:1-32` — but transforms are pure `.mjs` so no TS load needed. Use a simpler shape.

**Imports + per-rule test pattern:**
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  stripPlaywrightImports,
  injectK6Imports,
  ensureExtendsK6Page,
  transformExpectAssertions,
  transformLocatorShortcuts,
  transformGetByMethods,
  computeK6ImportPath,
} from '../../scripts/lib/transforms.mjs';

test('R1: strips @playwright/test imports', () => {
  const input = `import { Page, Locator, expect } from '@playwright/test';\nclass Foo {}`;
  const out = stripPlaywrightImports(input);
  assert.doesNotMatch(out, /@playwright\/test/);
  assert.match(out, /class Foo \{\}/);
});

test('R5: rewrites class X extends BasePage to extends K6Page', () => {
  const input = `class HomePage extends BasePage {\n}`;
  const out = ensureExtendsK6Page(input);
  assert.match(out, /class HomePage extends K6Page \{/);
});

test('R8: expect(X).toBeVisible() → await X.waitFor({ state: visible })', () => {
  const input = `    await expect(this.button).toBeVisible();`;
  const out = transformExpectAssertions(input);
  assert.match(out, /await this\.button\.waitFor\(\{ state: 'visible' \}\);/);
});

test('R8 nested: expect(this.x.filter({ hasText: y })).toBeVisible() handled by walker', () => {
  const input = `await expect(this.button.filter({ hasText: 'foo' })).toBeVisible();`;
  const out = transformExpectAssertions(input);
  assert.match(out, /await this\.button\.filter\(\{ hasText: 'foo' \}\)\.waitFor\(\{ state: 'visible' \}\);/);
});

test('R12: unsupported expect (toHaveText) is commented with k6-compat', () => {
  const input = `    await expect(locator).toHaveText('hi');`;
  const out = transformExpectAssertions(input);
  assert.match(out, /\/\/ k6-compat:.*toHaveText/);
});

test('R13: .first() → .nth(0)', () => {
  const out = transformLocatorShortcuts(`x.first()`);
  assert.equal(out.trim(), 'x.nth(0)');
});

test('computeK6ImportPath: components/X.ts → ../base/base-page', () => {
  assert.equal(computeK6ImportPath('components/X.ts'), '../base/base-page');
});
test('computeK6ImportPath: HomePage.ts → ./base/base-page', () => {
  // depth 0 → '' + 'base/base-page' would be wrong; rule emits relative './'
  // Adjust per chosen convention; see RESEARCH §"Computing K6Page import depth".
});
```

**Key adaptations for easyk6:**
1. **One test per RESEARCH §"Conversion Rule Inventory" rule** in scope (R1, R3, R5, R7, R8, R9, R10, R11, R12, R13, R14, R15, R16, R17, R19, R28).
2. **Walker corner cases** from sh:412-414 comments — nested `.filter({ hasText: ... })`, `.nth(0)` inside expect, multi-line expect statements.
3. **No I/O in this file** — tests are pure-function, sub-millisecond.

---

### `tests/unit/convert-pages.test.mjs` (test, file-I/O)

**Primary analog:** `easyk6/tests/unit/perf-runner.test.mjs` (spawnSync pattern) + `runtime-config.test.mjs` (tempdir setup).

**Test cases driven by RESEARCH §"Phase Requirements → Test Map":**
1. `BasePage.ts` is skipped — populate `src/pages/` with `BasePage.ts` + `HomePage.ts`, run convert, assert `lib/pages/BasePage.ts` does NOT exist, `lib/pages/HomePage.ts` DOES exist.
2. `index.ts` is skipped — same shape.
3. `lib/pages/base/` preserved — pre-create `lib/pages/base/sentinel.ts`, run convert, assert sentinel still exists.
4. Per-file error doesn't abort run — populate two POMs where one has unparseable syntax; convert exits non-zero but the other POM IS converted.
5. Header banner is present — assert first line of each output `lib/pages/*.ts` matches `/^\/\/ K6-compatible version/`.

**Drive via spawnSync** (perf-runner.test.mjs:16-24 pattern). Setup uses `mkdtemp` + custom `cwd` — but convert-pages reads/writes hardcoded paths, so the test must set up a tempdir as the project root with `src/pages/` and `lib/pages/base/` populated, then `cwd: tempProjectRoot`.

---

### `tests/unit/convert-patch-injection.test.mjs` (test, transform unit)

**Primary analog:** `runtime-config.test.mjs` (pure-function tests, no spawn).

**Test cases:**
```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import { injectPatch } from '../../scripts/lib/patch-injector.mjs';

test('primary path: injects before last // #endregion', () => {
  const src = `class X {\n  a() {}\n  // #endregion\n}\n`;
  const patch = `  b() {}\n`;
  const out = injectPatch(src, patch);
  // patch appears immediately above the #endregion line
  assert.match(out, /  b\(\) \{\}\n  \/\/ #endregion\n/);
});

test('fallback (easyk6): no #endregion, injects before last }', () => {
  const src = `export class HomePage {\n  a() {}\n}\n`;
  const patch = `  b() {}\n`;
  const out = injectPatch(src, patch);
  assert.match(out, /  b\(\) \{\}\n\}/);
  assert.doesNotMatch(out, /\/\/ #endregion/);
});

test('throws if no closing brace exists at all', () => {
  assert.throws(() => injectPatch(`// no class`, `  b() {}\n`), /Cannot locate injection point/);
});
```

**Key adaptations:** assert specifically the **easyk6 fallback path** (no `// #endregion`, no `export default`) — verifies the adaptation called out in RESEARCH §"Pitfall 3".

---

### `tests/unit/convert-roundtrip.test.mjs` (test, file-I/O + TS check)

**Primary analog:** `runtime-config.test.mjs:20-32` — `ts.transpileModule` to dynamically load TS without full `tsc`.

**TS load pattern (verbatim):**
```javascript
async function loadTypeScriptModule(fileUrl) {
  const source = await readFile(fileUrl, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: fileUrl.pathname,
  });
  const encoded = Buffer.from(outputText, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}
```

**Test shape:**
1. Set up tempdir with `src/pages/HomePage.ts` = `tests/fixtures/upstream/HomePage.ts` (small variant, copied at test start).
2. Spawn `convert-pages.mjs` with `cwd: tempdir`.
3. Read `lib/pages/HomePage.ts` (generated).
4. **Diagnostic check:** call `ts.transpileModule` on the output — assert no syntax errors (`ts.flattenDiagnosticMessageText` returns empty).
5. **Optional snapshot diff:** compare against `tests/fixtures/expected/HomePage.ts` if maintained.

**Key adaptation:** the test must mock `K6Page` and `K6PlaywrightSelectors` since `transpileModule` doesn't run module resolution. Either skip type-check on imports (use `target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext` — already does syntax-only) OR substitute `lib/pages/base/*` with stub files in the tempdir.

---

### `tests/unit/k6page-base.test.mjs` (test, request-response)

**Primary analog:** `runtime-config.test.mjs` — load TS module via `ts.transpileModule`, instantiate, exercise.

**Test shape:**
```javascript
test('K6Page constructor stores page + selectors', async () => {
  const { K6Page } = await loadTypeScriptModule(new URL('../../lib/pages/base/base-page.ts', import.meta.url));
  const fakePage = { goto: () => {}, locator: () => ({}) };
  const instance = new K6Page(fakePage);
  // Note: page/selectors are protected; reach via subclass for full coverage.
  assert.ok(instance);
});

test('K6Page.navigate() no-ops when pageUrl is empty (default)', async () => {
  // ...
});
```

**Key adaptation:** because `K6Page.page` and `K6Page.selectors` are `protected`, write a tiny TS subclass fixture in `tests/fixtures/k6page-test-subclass.ts` that exposes them, and load the subclass via the same loader.

---

### `tests/unit/selectors.test.mjs` (test, request-response)

**Primary analog:** `runtime-config.test.mjs` (TS-loader).

**Test shape:**
```javascript
test('getByTestId returns page.locator with [data-testid="..."]', async () => {
  const { K6PlaywrightSelectors } = await loadTypeScriptModule(
    new URL('../../lib/pages/base/selectors.ts', import.meta.url)
  );
  const calls = [];
  const fakePage = { locator: (sel) => { calls.push(sel); return {}; } };
  const sel = new K6PlaywrightSelectors(fakePage);
  sel.getByTestId('foo');
  assert.equal(calls[0], '[data-testid="foo"]');
});

test('getByText with options.exact wraps in regex anchors', async () => {
  // assert .filter({ hasText }) called with /^foo$/
});

test('escapeRegex escapes special chars', async () => {
  // private — test indirectly via getByText({ exact: true, ... })
});
```

---

### `tests/integration/upst-03-roundtrip.test.mjs` (test, file-I/O + child-process)

**Primary analog:** `easyk6/tests/unit/perf-runner.test.mjs` (spawnSync drives the runner).

**Test shape — full UPST-03 acceptance (RESEARCH §"Phase Requirements → Test Map"):**
1. In a tempdir, set up: `src/pages/HomePage.ts` (fixture), `lib/pages-k6-patches/HomePage.k6-patch.ts` (fixture), `lib/pages/base/base-page.ts`, `lib/pages/base/selectors.ts`.
2. Run `convert-pages.mjs` (spawnSync, `cwd: tempdir`).
3. Read `lib/pages/HomePage.ts`. Assert `measureNavigation` (or whatever the patch defines) appears in output.
4. **Re-sync** (copy fixture upstream → `src/pages/` again — simulating a maintainer rerun).
5. Run `convert-pages.mjs` again.
6. Re-read `lib/pages/HomePage.ts`. Assert patch method STILL present.
7. **Determinism check:** byte-level diff between first and second outputs is empty.

**Key adaptation:** this is the locked acceptance per D-44. Failures here block the phase gate.

---

### `tests/fixtures/upstream/*.ts` and `tests/fixtures/expected/*.ts`

**Primary analog (upstream):** `C:\Users\pzhly\Documents\GitHub\easyPlaywright\src\pages\HomePage.ts` (small variant — extract a 30-50 line subset that exercises R1, R5, R7, R8, R12, R13, R19).

**Recommended fixture upstream content** (mirror the smallest meaningful POM):
```typescript
// tests/fixtures/upstream/HomePage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  protected readonly pageUrl = '';
  protected readonly pageTitle = /Demo/i;

  private readonly mainContent: Locator;

  constructor(page: Page) {
    super(page);
    this.mainContent = page.locator('#main').first();
  }

  async waitForContent(): Promise<void> {
    await this.mainContent.waitFor({ state: 'visible', timeout: 5000 });
  }

  async verifyVisible(): Promise<void> {
    await expect(this.mainContent).toBeVisible();
  }

  async verifyTitleHasText(): Promise<void> {
    await expect(this.mainContent).toHaveText('hi');
  }
}
```

**Expected output content** — reconstruct by hand from the conversion rules; commit alongside upstream fixture so any rule change shows up in CI as a diff.

---

### `README.md` and `PROJECT_STRUCTURE.md` (docs updates)

**Primary analog:** existing Phase 1 sections in those same files.

**README quickstart pattern (Phase 2 should preserve top-to-bottom flow per CONTEXT §Specifics):**
```
npm install
npm run sync:src       # ← Phase 2 (was placeholder)
npm run convert-pages  # ← Phase 2 (was placeholder)
npm run build
npm run smoke -- --demo
```

**PROJECT_STRUCTURE.md additions:**
- `src/pages/` — synced from upstream; treat as read-only.
- `lib/pages/base/` — hand-authored K6Page + selector shim; survives `convert-pages` wipe.
- `lib/pages/` — generated; safe to read, do not edit (changes are wiped).
- `lib/pages-k6-patches/` — maintainer-authored TS fragments injected at convert time.
- `lib/vendor/` — bundled k6 jslib (k6-testing).

**Key adaptation:** match the existing tone and table style of Phase 1 PROJECT_STRUCTURE.md (architecture-first, then folder map). Add a one-line callout for `.sync-meta.json` (recruiter-facing provenance signal — CONTEXT §Specifics).

---

## Shared Patterns

### ESM CLI module shape (applies to: `sync-src.mjs`, `convert-pages.mjs`)

**Source:** `easyk6/scripts/perf-runner.mjs:1-31` + `:113-143`
```javascript
#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function buildCli() {
  const program = new Command();
  program.name('easyk6-XYZ').description('...');
  // options...
  return program;
}

async function main() {
  const cli = buildCli();
  cli.parse(process.argv);
  const opts = cli.opts();
  // work...
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

### Cross-platform path emit (applies to: any code generating import paths)

**Source:** RESEARCH §"Pitfall 1: Windows path-separator drift"
```javascript
function toPosixPath(p) {
  return p.split(path.sep).join('/');
}
// Use whenever emitting an import string. Or use path.posix.* for emit-paths exclusively.
```

### Fail-fast error handling (applies to: both scripts)

**Source:** `easyk6/lib/config/runtime-config.ts` + `perf-runner.mjs:140-143`
```javascript
// Single-line, no stack traces, no jargon — recruiter-readable.
throw new Error('BASE_URL must be a valid absolute URL.');

// Top-level catcher prints message, exits 1.
main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

### Test loader for TS modules (applies to: all `tests/unit/*.test.mjs` that exercise `lib/*.ts`)

**Source:** `easyk6/tests/unit/runtime-config.test.mjs:20-32`
```javascript
import ts from 'typescript';

async function loadTypeScriptModule(fileUrl) {
  const source = await readFile(fileUrl, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: fileUrl.pathname,
  });
  const encoded = Buffer.from(outputText, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}
```

### Tempdir setup + try/finally cleanup (applies to: every integration test + sync/convert tests)

**Source:** `easyk6/tests/unit/runtime-config.test.mjs:68-85`
```javascript
const tempDir = await mkdtemp(path.join(tmpdir(), 'easyk6-XYZ-'));
try {
  // populate fixtures, run subject, assert
} finally {
  await rm(tempDir, { force: true, recursive: true });
}
```

### Subprocess test driver (applies to: `tests/unit/sync-src.test.mjs`, `tests/unit/convert-pages.test.mjs`, `tests/integration/*`)

**Source:** `easyk6/tests/unit/perf-runner.test.mjs:16-24`
```javascript
function runScript(scriptName, args, env, cwd = projectRoot) {
  return spawnSync(process.execPath, [path.join(scriptName), ...args], {
    cwd, env, encoding: 'utf8',
  });
}
```

### Header banner format (applies to: every generated `lib/pages/*.ts`)

**Source:** `convert-to-k6.sh:791-800` + D-33
```
// K6-compatible version - Auto-generated from Playwright Page Object
// Source: src/pages/<rel>
// K6-PATCHES: Includes methods from lib/pages-k6-patches/<rel>.k6-patch.ts   ← only if patch exists
```

### `.gitkeep` survival policy (applies to: `src/pages/`, `lib/pages-k6-patches/`)

**Source:** RESEARCH §"Idempotency Boundaries"
- Wipe operations DO remove `.gitkeep`.
- Both wipe operations IMMEDIATELY repopulate the dir with real content.
- `.gitkeep` is git-tracked; recovers via `git checkout`.
- **Do not regenerate `.gitkeep`** in either script.

---

## No Analog Found

None. Every target file has at least one strong analog in the local Phase 1 baseline or in `ir-perf-k6` / `easyPlaywright`.

The CLOSEST thing to a no-analog item is `tests/fixtures/expected/*.ts` — the expected converted output must be reconstructed by applying the rules by hand. There is no machine-readable "expected output" in `ir-perf-k6` because its generated `lib/pages/` was committed but the upstream POMs that produced it differ from easyPlaywright's. Treat as **partial** match: the structure (banner + extends + transformed body) matches the rules, but the specific text must be authored fresh.

---

## Metadata

**Analog search scope:**
- `C:\Users\pzhly\Documents\GitHub\easyk6\scripts\` (Phase 1 placeholders + perf-runner)
- `C:\Users\pzhly\Documents\GitHub\easyk6\lib\config\` (runtime-config baseline)
- `C:\Users\pzhly\Documents\GitHub\easyk6\tests\unit\` (Phase 1 test patterns)
- `C:\Users\pzhly\Documents\GitHub\easyk6\vite.config.ts`, `tsconfig.json`, `package.json`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\scripts\` (sync-frontend-src.mjs)
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\config\convert-to-k6.sh` (full ruleset)
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\base\` (K6Page contract)
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\utils\selectors.ts`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\pages-k6-patches\` (7 patch examples)
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\lib\vendor\` (k6-testing + wrapper + README)
- `C:\Users\pzhly\Documents\GitHub\easyPlaywright\src\pages\` (10 upstream POMs)

**Files scanned:** 21 source files read; 3 reference repos surveyed.

**Pattern extraction date:** 2026-05-08
