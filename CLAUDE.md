<!-- GSD:project-start source:PROJECT.md -->
## Project

**EasyK6**

EasyK6 is a recruiter-facing k6 browser performance framework that adapts this simple starter repo into a more serious architecture. It reuses Playwright Page Objects from `C:\Users\pzhly\Documents\GitHub\easyPlaywright` as the permanent upstream model, while borrowing the execution patterns and project shape that proved useful in `C:\Users\pzhly\Documents\GitHub\ir-perf-k6`.

The first milestone is not "enterprise perf platform." It is a clean, understandable showcase repo where smoke-level browser performance tests actually run, and where load/capacity code exists as illustrative examples of how the framework scales.

**Core Value:** Demonstrate that one Playwright POM source can power maintainable k6 browser smoke tests through a clean architecture that recruiters can read, trust, and run locally.

### Constraints

- **Upstream source of truth**: `easyPlaywright` page objects define the long-term object model
- **Reference architecture**: Reuse good ideas from `ir-perf-k6`, but do not inherit enterprise-only weight that hurts recruiter readability
- **Execution scope**: Smoke must work end to end; load and capacity may remain example code in this milestone
- **Showcase quality**: Naming, folder structure, docs, and commands must be understandable to a technical reviewer without private company context
- **Local-first workflow**: The repo should be runnable locally without needing Kubernetes, cloud infra, or internal services
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| k6 with browser module | 1.5.x | Browser-level performance execution | Official k6 browser support gives real browser metrics and aligns with the target adaptation from `ir-perf-k6` |
| Node.js | 22.x LTS | Build scripts and local tooling | Matches both reference repos' modern toolchain and keeps scripting predictable |
| TypeScript | 5.9.x | Typed source for scenarios, helpers, and generated layers | Best fit for adapting Playwright-origin code and for showing code quality to recruiters |
| Vite | 5.4.x | Bundle project code into k6-runnable output | Already proven in `ir-perf-k6`; useful because k6's native TS support is partial and Node-style resolution is limited |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv` | 17.x | Load environment configuration | Use for local `.env` driven smoke runs and profile selection |
| `commander` | 11.x | Runner CLI interface | Use for human-friendly commands like `perf --profile smoke` |
| `@types/k6` | 0.45.x | Type support for k6 APIs | Use across all TypeScript source files for editor safety |
| ESLint + Prettier | 9.x / 3.x | Linting and formatting | Use to keep recruiter-facing code consistent and readable |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| Docker browser image for k6 | Reproducible browser execution | Prefer a pinned `grafana/k6:*with-browser` image when containerizing local runs |
| npm scripts | Repeatable local entry points | Keep commands simple: build, sync, convert, smoke, perf |
| Small converter script | Transform upstream Playwright pages to k6-safe modules | Needed because direct Playwright code does not run unchanged in k6 browser flows |
## Installation
# Core
# Supporting
# Dev dependencies
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vite bundling | Native `k6 run script.ts` only | Small throwaway scripts with minimal imports and no richer project structure |
| TypeScript source + generated k6 layer | Plain JavaScript everywhere | Tiny examples where conversion and type safety are unnecessary |
| Scripted sync from `easyPlaywright` | Manual copy/paste of page objects | Never for this project; manual sync undermines the showcase value |
| Local-first runner | Kubernetes-first workflow | Only later if the repo grows beyond showcase scope |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Direct Playwright runtime as the execution engine for perf flows | It misses the point of demonstrating k6 adaptation | Keep Playwright as upstream source, run perf with k6 browser |
| Copying all of `ir-perf-k6` | Brings internal-company complexity and hurts clarity | Reuse only patterns that strengthen the showcase |
| Hard-coded test target values in scenario files | Makes the repo brittle and less professional | Centralized env/config validation |
## Stack Patterns by Variant
- Use typed scenarios, `.env`, and a single smoke-oriented runner
- Because that gives the cleanest recruiter demo path
- Keep load/capacity profiles in code behind the same runner
- Because the repo can show depth without forcing heavy setup in v1
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `k6@1.5.x` | modern browser module workflows | Use the same major/minor line across local and Docker execution |
| `typescript@5.9.x` | `vite@5.4.x` | Matches the proven reference build path |
| `node@22.x` | npm 11.x toolchain | Already aligned with the existing repo tool versions |
## Sources
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\README.md` — proven reference stack and execution model
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\docs\DEVELOPMENT.md` — architecture and build rationale
- `C:\Users\pzhly\Documents\GitHub\easyPlaywright\README.md` — permanent upstream Playwright model
- https://grafana.com/docs/k6/latest/using-k6-browser/ — browser module guidance
- https://grafana.com/docs/k6/latest/using-k6-browser/running-browser-tests/ — browser execution and Docker notes
- https://grafana.com/docs/k6/latest/using-k6/javascript-typescript-compatibility-mode/ — TS support limits and bundling rationale
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
