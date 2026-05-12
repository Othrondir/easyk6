---
phase: 01
slug: foundation-project-shape
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-08
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Phase 01 scope is build/runner/repo-shape foundation: Vite multi-entry CommonJS build, shared runtime-config module, public perf/smoke runner shell, archived legacy starter. No network endpoints, no auth surface, no persisted data, no third-party callouts. The runner spawns a local k6 process with explicit env values and exits.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Developer shell → Node runner | `scripts/perf-runner.mjs` reads CLI flags, parsed `.env`, and shell `process.env` | Operator-supplied `BASE_URL` (config string), profile/scenario names |
| Node runner → child `k6` process | Runner spawns `k6 run dist/tests/smoke/...` with normalized env via `toRunnerEnv()` | Resolved `BASE_URL` only |
| k6 browser scenario → target site | Smoke shell navigates to resolved `BASE_URL` | Outbound HTTP(S) only; no creds in this phase |
| Filesystem `.env` → runner | `dotenv` parses `.env` / `--env-file` paths supplied by operator | `BASE_URL` (no secrets in scope this phase) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|

*No threats raised in `01-01-PLAN.md`, `01-02-PLAN.md`, or `01-03-PLAN.md` threat sections, and SUMMARYs carry no `## Threat Flags`. Phase scope is local build/runner shell with no external attack surface introduced.*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|

No accepted risks.

---

## Surface Notes (advisory, not threats)

Recorded for downstream phases — none block Phase 01.

| Area | Note | Owner |
|------|------|-------|
| `.env` handling | `dotenv` loads operator-controlled file. Path comes from operator CLI flag; no untrusted file ingestion. Future phases adding secrets must add `.env` ignore + secret-scan check. | Phase 02+ |
| Child-process spawn | `scripts/perf-runner.mjs` invokes `k6` via `child_process`. Args derived from validated runtime config (URL parsed via `new URL()`). No shell-string concat. | Phase 03 (load profiles) |
| Demo URL | Default demo `BASE_URL` points to a public GitHub Pages site (`https://othrondir.github.io/QAbbalah/`). Opt-in via `--demo` only; no traffic until operator triggers. | Phase 04 (recruiter polish) |
| Build output | `dist/` is gitignored where appropriate; `validate-build.mjs` enforces expected artifacts only. No upload/publish path in this phase. | n/a |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-08 | 0 | 0 | 0 | Claude (gsd-secure-phase) |

Audit notes (2026-05-08):
- State B run (`SECURITY.md` did not exist; PLANs + SUMMARYs present).
- Phase plans contained no `<threat_model>` block; SUMMARYs contained no `## Threat Flags`. Empty threat register accepted.
- Re-confirmed Phase 01 scope is local build/runner with no auth, no persistence, no network endpoint introduced. Surface notes recorded above for downstream phases that will introduce real attack surface.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer) — n/a, register empty
- [x] Accepted risks documented in Accepted Risks Log — none
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-08
