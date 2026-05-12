---
phase: 1
slug: foundation-project-shape
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` |
| **Config file** | `none - uses built-in Node 22 test runner` |
| **Quick run command** | `node --test tests/unit/runtime-config.test.mjs` |
| **Full suite command** | `npm run build && node scripts/validate-build.mjs && node --test tests/unit/runtime-config.test.mjs` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/unit/runtime-config.test.mjs` once the test file exists; before then run the task-specific `verify` command in the plan.
- **After every plan wave:** Run `npm run build && node scripts/validate-build.mjs && node --test tests/unit/runtime-config.test.mjs`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | BUILD-01 | build | `npm run build && node scripts/validate-build.mjs` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | BUILD-01 | docs/structure | `rg -n "legacy-js|src/pages|lib/pages-k6-patches|npm run build" README.md PROJECT_STRUCTURE.md` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | BUILD-02 | unit | `node --test tests/unit/runtime-config.test.mjs` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 2 | BUILD-01, BUILD-02 | cli/build | `npm run build && node scripts/validate-build.mjs && node scripts/perf-runner.mjs --profile smoke --demo --show-config` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/runtime-config.test.mjs` - config precedence and fail-fast coverage for BUILD-02
- [ ] `scripts/validate-build.mjs` - build artifact presence check for BUILD-01
- [ ] `k6/simulations/smoke/smoke-shell.test.ts` - placeholder or real shell entry so `npm run build` has a stable target

---

## Manual-Only Verifications

All Phase 1 behaviors can be automated through build, CLI, and unit checks if the runner supports `--show-config` and `--dry-run`.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
