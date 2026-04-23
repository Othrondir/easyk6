# Phase 1: Foundation & Project Shape - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 1-Foundation & Project Shape
**Areas discussed:** Repository structure, command surface, configuration model, legacy handling

---

## Repository structure

### Reestructuración en Fase 1

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Reshape directly to target architecture in Phase 1 | ✓ |
| 2 | Keep current tree and add new tree in parallel | |
| 3 | Delay major structure work to Phase 2 | |

**User's choice:** 1
**Notes:** User wants the repo to become target-shaped immediately, not hybrid.

### Dónde vive el upstream sincronizado

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | `src/pages/` (and supporting source folders if needed) | ✓ |
| 2 | `src/upstream/easyPlaywright/...` | |
| 3 | Other layout | |

**User's choice:** 1
**Notes:** Keep upstream source simple and aligned with the reference direction.

### Dónde vive la capa k6 generada

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | `lib/pages/` + `lib/pages-k6-patches/` | ✓ |
| 2 | `generated/` + `patches/` at repo root | |
| 3 | `src/generated/` | |

**User's choice:** 1
**Notes:** User chose the pattern already proven in the reference repo.

### Lenguaje base del código nuevo

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | All new Phase 1 code in TypeScript | ✓ |
| 2 | TypeScript only for some layers | |
| 3 | Stay in JavaScript until Phase 2 | |

**User's choice:** 1
**Notes:** New foundation should be TypeScript-first from the start.

---

## Command surface

### Comando principal visible para recruiters

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | `npm run smoke` as the star command, plus `perf` underneath | ✓ |
| 2 | Only `perf --profile ...` | |
| 3 | Keep `test:smoke` / `test:load` naming | |
| 4 | Other | |

**User's choice:** 1
**Notes:** Keep the first impression simple and obvious.

### Qué comandos existen ya en Fase 1

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Skeleton of `build`, `smoke`, `perf`, `sync:src`, `convert-pages` | ✓ |
| 2 | Add full lint/format/test/report surface immediately | |
| 3 | Keep only `build` and `smoke` for now | |

**User's choice:** 1
**Notes:** Enough base surface to support later phases without overpromising.

### UX del runner

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Node runner behind `perf` with flags like `--profile`, `--env`, `--test` | ✓ |
| 2 | Direct npm scripts only, no runner | |
| 3 | Mixed direct scripts and advanced runner | |

**User's choice:** 1
**Notes:** User wants stronger DX as part of the showcase.

### Nomenclatura pública

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Simple recruiter-friendly names | ✓ |
| 2 | Technical names like `k6:env:external` from the start | |
| 3 | Double layer of simple + technical aliases | |

**User's choice:** 1
**Notes:** Keep the public surface easy to scan.

---

## Configuration model

### Fuente principal de configuración

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | `.env` + `.env.example` with startup validation | ✓ |
| 2 | `config.ts` with editable defaults in code | |
| 3 | Mixed env plus code defaults as the primary model | |

**User's choice:** 1
**Notes:** Professional and easy to explain.

### Experiencia de demo sin configuración

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Allow demo smoke without touching `.env` | ✓ |
| 2 | Always require `.env` | |
| 3 | Separate demo and real commands | |

**User's choice:** 1
**Notes:** This is important for portfolio usability.

### Separación de entornos

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Single `.env` for v1 | ✓ |
| 2 | Internal/external env files like `ir-perf-k6` | |
| 3 | Multiple `.env.*` variants | |

**User's choice:** 1
**Notes:** Avoid clutter in the showcase repo.

### Validación inicial

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Validate only the minimum in Phase 1 | ✓ |
| 2 | Validate a broader set immediately | |
| 3 | Very light validation only | |

**User's choice:** 1
**Notes:** Keep the first foundation phase lean.

### Ubicación del `.env`

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | `.env` and `.env.example` at repo root | ✓ |
| 2 | Keep env files inside `config/` | |
| 3 | Other convention | |

**User's choice:** 1
**Notes:** Root-level env files are the clearest for reviewers.

### Default demo target

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Keep `QAbbalah` as the built-in demo target | ✓ |
| 2 | Inject demo target only via command | |
| 3 | No real default demo target | |

**User's choice:** 1
**Notes:** It matches both the current repo and the upstream Playwright showcase.

### Reparto CLI vs `.env`

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | `.env` for runtime target/settings, CLI for profile/scenario/mode | ✓ |
| 2 | Put profile/scenario defaults into `.env` too | |
| 3 | Centralize nearly everything in typed config code | |

**User's choice:** 1
**Notes:** Stable values in env, run-time choices in CLI.

### Error handling fuera de demo

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Fail fast with a clear error and suggest fixing `.env` or using demo | ✓ |
| 2 | Silent fallback to demo | |
| 3 | Interactive prompt in the terminal | |

**User's choice:** 1
**Notes:** Explicit failure is preferred over surprising fallbacks.

### Cómo se activa el modo demo

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | `npm run smoke` explicitly uses demo defaults | ✓ |
| 2 | Auto-fallback to demo when `BASE_URL` missing | |
| 3 | Demo default with warning-only fallback | |

**User's choice:** 1
**Notes:** Demo mode should be predictable.

### Nombre del comando para target real

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Same grammar via flags, e.g. `perf --profile smoke --env local` | ✓ |
| 2 | Separate `smoke:real` command | |
| 3 | Separate `smoke:custom` command | |

**User's choice:** 1
**Notes:** One command grammar across demo and real targets.

### Precedencia de configuración

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | `CLI > .env > default demo` | ✓ |
| 2 | `.env > CLI > default demo` | |
| 3 | `config.ts > CLI > .env` | |

**User's choice:** 1
**Notes:** Standard precedence, easy to communicate.

### Variables mínimas en `.env.example`

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Only `BASE_URL` for now | ✓ |
| 2 | `BASE_URL` plus runner/browser defaults | |
| 3 | `BASE_URL` plus future credential placeholders | |

**User's choice:** 1
**Notes:** Keep `.env.example` minimal in Phase 1.

---

## Legacy handling

### Destino del árbol actual

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Move current JS starter tree to `legacy/` or `legacy-js/` | ✓ |
| 2 | Keep both old and new trees in root for several phases | |
| 3 | Delete the old tree quickly and rebuild clean | |

**User's choice:** 1
**Notes:** Preserve context without polluting the new architecture.

### Qué ve primero un recruiter

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | New TypeScript/k6 architecture first | ✓ |
| 2 | Explicit before/after coexistence | |
| 3 | Keep current starter public until Phase 3 | |

**User's choice:** 1
**Notes:** The new architecture should dominate the first impression.

### Cómo documentar el legado

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Brief note in README only | ✓ |
| 2 | Dedicated transition document | |
| 3 | Barely document it | |

**User's choice:** 1
**Notes:** Enough context without distracting the reader.

### Reutilización del JS actual

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Reuse ideas only; no line-by-line migration | ✓ |
| 2 | Migrate most current JS into the new shape | |
| 3 | Keep both paths alive for longer | |

**User's choice:** 1
**Notes:** The new architecture should not be forced to mirror the starter code.

---

## the agent's Discretion

- Exact module names for internal build/config helpers
- Exact alias naming and TS config structure
- Exact error-message phrasing

## Deferred Ideas

None
