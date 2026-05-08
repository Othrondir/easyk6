# Phase 1: Foundation & Project Shape - Research

**Researched:** 2026-04-23
**Domain:** TypeScript/Vite k6 browser foundation with upstream Playwright POM reuse
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Phase 1 should reshape the repo directly into the target architecture instead of using a long-lived hybrid layout.
- **D-02:** Synced upstream Playwright material from `easyPlaywright` should live in `src/pages/`.
- **D-03:** The generated k6-compatible page layer should live in `lib/pages/`.
- **D-04:** Persistent k6-only overrides should live in `lib/pages-k6-patches/`.
- **D-05:** All new code introduced in Phase 1 should be TypeScript; existing JavaScript may coexist temporarily only as legacy reference.
- **D-06:** Public commands should stay recruiter-friendly and simple: `smoke`, `perf`, `sync:src`, and `convert-pages`.
- **D-07:** Phase 1 should create only the command skeleton needed for the next phases: `build`, `smoke`, `perf`, `sync:src`, and `convert-pages`.
- **D-08:** A Node-based runner should exist behind the command surface, with `perf` as the main advanced entry point.
- **D-09:** Public naming should prefer simple commands over highly technical script names.
- **D-10:** Configuration should use `.env.example` and `.env` in the repo root as the main developer-facing convention.
- **D-11:** The demo target should remain built in around the current `QAbbalah` URL for zero-friction showcase runs.
- **D-12:** Runtime-stable values belong in `.env`; execution-time selections such as profile, scenario, and mode belong in CLI flags.
- **D-13:** Outside demo mode, invalid real-target configuration should fail fast with a clear error message rather than silently falling back.
- **D-14:** Demo mode should be explicit: `npm run smoke` should use the built-in demo target by default.
- **D-15:** Real-target execution should use the same command grammar through CLI flags, e.g. `perf --profile smoke --env local`.
- **D-16:** Configuration precedence should be `CLI > .env > built-in demo defaults`.
- **D-17:** `.env.example` should stay minimal in Phase 1 and define only `BASE_URL`.
- **D-18:** The current JavaScript starter tree should move under a legacy-oriented location such as `legacy/` or `legacy-js/`.
- **D-19:** The new TypeScript/k6 architecture should become the first thing a recruiter sees when opening the repo.
- **D-20:** Legacy material only needs a brief note in the main docs; it should not dominate the explanation.
- **D-21:** The old JavaScript code is reference material for ideas and comparisons, not a codebase to migrate line by line.

### the agent's Discretion
- Exact file names for internal helper modules, validator modules, and Vite/TS config support files
- Exact alias names and folder-level barrel exports, as long as they preserve the chosen repo shape
- Exact wording of config validation errors and help text, as long as they stay clear and recruiter-friendly

### Deferred Ideas (OUT OF SCOPE)
- None - discussion stayed within phase scope
</user_constraints>

<research_summary>
## Summary

Phase 1 sits between two proven baselines. Current `easyk6` is a JavaScript-first starter with direct `k6 run` scripts and hardcoded config in `config/config.js`. `easyPlaywright` already shows the permanent upstream TypeScript POM shape under `src/pages/`, while `ir-perf-k6` proves the build/runner side: Vite multi-entry bundling, a thin Node CLI wrapper, explicit layer boundaries, and generated-vs-custom separation.

Standard approach for this repo is not "copy enterprise repo whole." It is: adopt the same structural seams that will matter later, keep the first public command surface tiny, and make build/config behavior deterministic before sync/conversion or real smoke journeys arrive. That means Phase 1 should establish `src/pages/`, `lib/pages/`, `lib/pages-k6-patches/`, `k6/simulations/`, and `scripts/`, move current JavaScript artifacts under `legacy-js/`, add a Vite build that emits CommonJS test bundles under `dist/tests/`, and add a Node runner that resolves config before invoking k6.

Config should stay intentionally small. Root `.env.example` with only `BASE_URL`, CLI flags for profile/scenario/demo selection, and a shared runtime config module with precedence `CLI > .env > built-in demo defaults` satisfy the captured decisions without dragging in a big platform layer. Phase 1 does not need real sync or conversion logic; explicit placeholders for `sync:src` and `convert-pages` are better than fake implementations.

**Primary recommendation:** Build exact Phase 2/3 seams now: TS/Vite foundation, legacy isolation, root env convention, shared runtime-config module, and a thin `perf` runner with dry-run/show-config support.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `typescript` | `5.9.3` | Source language and path alias support | Matches reference repo and fits TypeScript-first repo shape |
| `vite` | `5.4.21` | Build k6 test bundles from TS entrypoints | Proven in `ir-perf-k6`; simple multi-entry CommonJS output |
| `@types/k6` | `0.45.3` | Type safety for `k6`, `k6/browser`, and options | Keeps simulation shell and future converted files typed |
| `glob` | `10.4.5` | Discover `k6/simulations/**/*.test.ts` build entries | Same pattern already used in reference repo |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vite-plugin-node-polyfills` | `0.19.0` | Smooth over Node API usage inside bundled tests | Use once converted page objects or helpers pull Node-style imports |
| `dotenv` | `17.2.3` | Load root `.env` or an explicit env file for runner/config | Use in Node runner only; keep runtime config deterministic |
| `commander` | `11.1.0` | Thin CLI parser for `perf`/`smoke` grammar | Use instead of hand-parsing argv |
| `node:test` | built into Node 22 | Unit-test config parsing and precedence | Good enough for small validation surface without adding Vitest yet |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `vite` | `tsup` / `esbuild` | Simpler config, but weaker parity with reference repo's proven k6 build shape |
| `commander` | Hand-rolled `process.argv` parsing | Smaller dependency, but lower clarity and worse flag validation |
| Small explicit config validator | `zod` / `envalid` | Good if env surface grows later; Phase 1 only needs one required env var |

**Installation:**
```bash
npm install
npm install -D typescript@5.9.3 vite@5.4.21 @types/k6@0.45.3 glob@10.4.5 vite-plugin-node-polyfills@0.19.0
npm install commander@11.1.0 dotenv@17.2.3
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
easyk6/
├── k6/
│   ├── scenarios/              # Reusable flows, introduced gradually after Phase 1
│   └── simulations/            # Executable k6 entrypoints (.test.ts)
├── lib/
│   ├── config/                 # Shared runtime config helpers
│   ├── pages/                  # Generated k6-compatible POMs
│   └── pages-k6-patches/       # Preserved k6-only overrides
├── src/
│   └── pages/                  # Upstream Playwright POM source of truth
├── scripts/                    # Runner, validation, sync/conversion helpers
├── legacy-js/                  # Old starter repo retained as reference only
├── dist/                       # Built k6 bundles
└── .env.example                # Minimal root env contract
```

### Pattern 1: Source / generated / custom boundary
**What:** Keep upstream source, generated k6 output, and manual k6 patches in separate folders from day one.
**When to use:** Immediately; this is core to the repo story.
**Example:**
```text
src/pages/              # synced from easyPlaywright
lib/pages/              # generated output, do not edit manually
lib/pages-k6-patches/   # durable custom behavior injected after conversion
```

### Pattern 2: Thin Node runner over k6
**What:** Let `npm run perf` resolve config and then invoke k6, instead of embedding config logic in every simulation file.
**When to use:** Phase 1, because command grammar and config precedence are already decided.
**Example:**
```js
const config = resolveRuntimeConfig(process.argv.slice(2));

if (config.showConfig) {
  console.log(JSON.stringify(config, null, 2));
  process.exit(0);
}

if (config.dryRun) {
  console.log(`k6 run ${config.entryFile}`);
  process.exit(0);
}

spawnSync('k6', ['run', config.entryFile], { stdio: 'inherit' });
```

### Pattern 3: Vite multi-entry CommonJS output for k6
**What:** Discover simulation entrypoints, build them to `dist/tests/...`, externalize `k6` modules, and keep output debuggable.
**When to use:** Before there are many scenarios; avoids another build-system reshape later.
**Example:**
```ts
const entries = globSync('./k6/simulations/**/*.test.ts').reduce(
  (acc, file) => {
    const match = file.match(/k6\/simulations\/(.+)\.ts$/);
    if (match) acc[`tests/${match[1]}`] = resolve(__dirname, file);
    return acc;
  },
  {} as Record<string, string>
);

export default defineConfig({
  build: {
    lib: { entry: entries, formats: ['cjs'] },
    outDir: 'dist',
    minify: false,
  },
});
```

### Anti-Patterns to Avoid
- **Long-lived hybrid layout:** keeping new TS files beside primary `pages/`, `tests/`, and `utils/` starter directories muddies the repo story immediately.
- **Hidden config fallbacks:** silently using demo URL for non-demo runs will violate `BUILD-02`.
- **Direct edits in `lib/pages/`:** generated layer must stay disposable or Phase 2 sync/conversion will become fragile.
- **Enterprise cargo-culting:** importing K8s/reporting complexity from `ir-perf-k6` in Phase 1 would dilute recruiter readability.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI flag parsing | ad hoc `process.argv` splitting | `commander` | Better help text, validation, defaults, and long-term readability |
| Multi-entry TS bundling for k6 | custom Babel/Webpack glue | `vite` + `glob` | Already proven in reference repo; less maintenance |
| Node polyfill mapping | manual alias maze | `vite-plugin-node-polyfills` | Easier once converted upstream modules pull Node APIs |
| Future sync/conversion behavior | fake "real" implementation in Phase 1 | explicit placeholders + docs | Honest skeleton now prevents accidental bad contracts |

**Key insight:** Hand-roll only the small repo-specific pieces: runtime config precedence and the exact public command grammar. Reuse commodity tooling for parsing, build discovery, and polyfills.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Build works, structure still tells old story
**What goes wrong:** `npm run build` exists, but root repo still looks like a JS starter.
**Why it happens:** Teams add TS tooling without moving legacy assets out of the way.
**How to avoid:** Move current starter assets under `legacy-js/` in same phase that adds TS foundation.
**Warning signs:** README and root folder tree still begin with `pages/`, `tests/`, and `utils/`.

### Pitfall 2: Config logic duplicates between runner and test files
**What goes wrong:** CLI flags, `.env`, and demo defaults are resolved in more than one place.
**Why it happens:** Runner and simulation files each read `process.env` independently.
**How to avoid:** Put precedence rules in one shared `runtime-config` module and have runner plus simulations import it.
**Warning signs:** Different error messages for missing `BASE_URL`, or smoke/perf disagree on resolved target.

### Pitfall 3: Phase 1 accidentally implements Phase 2
**What goes wrong:** Sync/conversion work starts early and slows planning.
**Why it happens:** Foundation work often drifts into "just enough real implementation."
**How to avoid:** Keep `sync:src` and `convert-pages` as explicit skeleton commands with truthful placeholder output.
**Warning signs:** Plan touches upstream repo sync logic, conversion regexes, or generated `lib/pages` content beyond placeholders.

### Pitfall 4: Vite output not shaped for k6 execution
**What goes wrong:** Build succeeds, but k6 cannot run output cleanly.
**Why it happens:** Wrong format, wrong output path, or bundled k6 modules.
**How to avoid:** Emit CommonJS, externalize `k6` imports, keep output under `dist/tests/`, and validate the expected file exists after build.
**Warning signs:** `dist/` lacks `tests/...`, or built files inline `k6/browser` helpers unexpectedly.
</common_pitfalls>

<code_examples>
## Code Examples

### Shared runtime config precedence
```ts
export function resolveRuntimeConfig(cli: CliOptions, env: NodeJS.ProcessEnv) {
  const demo = cli.demo ?? false;
  const baseUrl = cli.baseUrl || env.BASE_URL || (demo ? 'https://othrondir.github.io/QAbbalah/' : '');

  if (!baseUrl) {
    throw new Error('BASE_URL is required when demo mode is disabled.');
  }

  return {
    profile: cli.profile || 'smoke',
    scenario: cli.scenario || 'smoke-shell',
    baseUrl: new URL(baseUrl).toString(),
    demo,
  };
}
```

### Minimal smoke shell entrypoint
```ts
import { browser } from 'k6/browser';
import { resolveK6RuntimeConfig } from '@config';

export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      options: { browser: { type: 'chromium' } },
    },
  },
};

export default async function () {
  const page = await browser.newPage();
  const config = resolveK6RuntimeConfig();
  await page.goto(config.baseUrl);
  await page.close();
}
```

### Build validation script
```js
const required = [
  'dist/tests/smoke/smoke-shell.test.js',
  'scripts/perf-runner.mjs',
  '.env.example',
  'lib/config/runtime-config.ts',
];

for (const file of required) {
  if (!existsSync(file)) throw new Error(`Missing required artifact: ${file}`);
}
```
</code_examples>

<validation_architecture>
## Validation Architecture

Phase 1 should validate three things continuously: build emits runnable k6 bundles, config precedence is deterministic, and public commands surface the intended grammar. `node:test` is enough for config precedence and error cases; build validation can stay in a dedicated Node script so execute-phase has fast, grepable checkpoints.

Recommended automation split:
- **Quick check:** `node --test tests/unit/runtime-config.test.mjs`
- **Full check:** `npm run build && node scripts/validate-build.mjs && node --test tests/unit/runtime-config.test.mjs`
- **CLI contract check:** `node scripts/perf-runner.mjs --profile smoke --demo --show-config`

This keeps feedback under one minute and avoids adding a larger test framework before Phase 1 proves the structure.
</validation_architecture>

<sota_updates>
## State of the Art (2024-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Webpack-heavy k6 bundling | Vite-based k6 bundling | 2024-2025 adoption matured | Simpler config, faster builds, easier multi-entry output |
| JS-only POM demos | TS-first POM repos with strict toolchain pins | Already standard in upstream showcase repo | EasyK6 should match TypeScript-first expectations |
| Per-test env parsing | Central runner/config modules | Common in mature perf repos now | Cleaner command surface and fail-fast config |

**New tools/patterns to consider:**
- `node:test` for lightweight unit coverage on config/CLI helpers.
- Vite path aliases that map future generated layers cleanly before they contain real code.

**Deprecated/outdated:**
- Root-level hardcoded `config/config.js` as primary config source.
- JS starter tree as the main public architecture after TypeScript foundation lands.
</sota_updates>

<open_questions>
## Open Questions

1. **Should Phase 1 add Node polyfills immediately or only wire them in Vite?**
   - What we know: `ir-perf-k6` already needs polyfills for converted code.
   - What's unclear: current EasyK6 Phase 1 shell may not need them yet.
   - Recommendation: add plugin wiring in `vite.config.ts` now, but keep actual usage minimal until Phase 2 conversion.

2. **Should config validation use a schema library in Phase 1?**
   - What we know: only `BASE_URL` is required right now.
   - What's unclear: how fast the env surface will expand in Phase 2/3.
   - Recommendation: start with explicit small validation logic; revisit `zod` or `envalid` if env variables multiply.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/01-foundation-project-shape/01-CONTEXT.md` - locked decisions and exact phase boundary
- `.planning/ROADMAP.md` - phase goal, success criteria, and intended plan split
- `package.json` - current EasyK6 command surface and version baseline
- `config/config.js` - current hardcoded config approach that must be replaced
- `README.md` and `PROJECT_STRUCTURE.md` - current public repo narrative and starter-first shape
- `../easyPlaywright/README.md`, `../easyPlaywright/playwright.config.ts`, `../easyPlaywright/src/pages/BasePage.ts`, `../easyPlaywright/src/pages/HomePage.ts` - permanent upstream TypeScript POM model
- `../ir-perf-k6/package.json`, `../ir-perf-k6/vite.config.ts`, `../ir-perf-k6/scripts/k6-runner.js`, `../ir-perf-k6/docs/DEVELOPMENT.md`, `../ir-perf-k6/config/convert-to-k6.sh` - reference build, runner, and layer boundaries

### Secondary (MEDIUM confidence)
- `.planning/PROJECT.md` and `.planning/STATE.md` - recruiter-facing project goals and current workflow state

### Tertiary (LOW confidence - needs validation)
- None - all recommendations derived from local canonical references
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: TypeScript + Vite + k6 browser shell
- Ecosystem: CLI runner, env loading, build discovery, layer boundaries
- Patterns: source/generated/custom split, thin Node runner, CommonJS dist output
- Pitfalls: hybrid layout, config duplication, premature Phase 2 work

**Confidence breakdown:**
- Standard stack: HIGH - versions and tools taken from local reference repo
- Architecture: HIGH - directly aligned with locked decisions and reference layering
- Pitfalls: HIGH - visible from current repo vs target repo delta
- Code examples: MEDIUM - synthesized from local reference patterns rather than copied executable snippets

**Research date:** 2026-04-23
**Valid until:** 2026-05-23
</metadata>

---

*Phase: 01-foundation-project-shape*
*Research completed: 2026-04-23*
*Ready for planning: yes*
