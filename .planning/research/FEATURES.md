# Feature Research

**Domain:** Showcase k6 browser framework that reuses Playwright Page Objects
**Researched:** 2026-04-23
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Scripted upstream page-object sync | Core value depends on reusing Playwright POM without manual duplication | MEDIUM | Must target `easyPlaywright` as source of truth |
| k6-compatible generated page layer | Recruiters need to see clear adaptation, not ad hoc selectors in tests | HIGH | Separate generated code from hand-written patches |
| Named scenario registry | Makes the framework look intentional and scalable | MEDIUM | Mirrors the strongest part of `ir-perf-k6` |
| Smoke profile with one-command execution | Showcase repos must be easy to run | MEDIUM | This is the main supported workflow |
| Centralized env/config validation | Prevents "works on my machine" demos | LOW | Keep credentials and base URL out of scenario code |
| Clear docs and quickstart | Recruiters will read before they run | LOW | Must explain what is upstream, generated, and custom |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Selective reuse of `ir-perf-k6` patterns | Shows architectural judgment instead of blind copying | MEDIUM | Good showcase signal for seniority |
| Example load and capacity profiles | Demonstrates depth beyond smoke without forcing heavy setup | MEDIUM | Keep clearly marked as examples |
| Report-ready summary artifacts | Makes demos easier to review and extend later | MEDIUM | Console summary is enough for v1 if structured well |
| Recruiter-oriented architecture narrative | Helps non-domain reviewers understand why the repo is impressive | LOW | This is a showcase-specific differentiator |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full Grafana stack in v1 | Sounds impressive in a portfolio | Distracts from proving the core adaptation works | Add it in a later milestone after smoke execution is stable |
| Generic multi-upstream adapter system | Feels flexible | Adds abstraction before the main value is proven | Hard-code `easyPlaywright` as the permanent upstream for now |
| Huge scenario catalog | Looks bigger on paper | Bloats the repo and hides the main demonstration | Keep a small, polished smoke set plus example profiles |
| Manual locator patches inside scenarios | Quick fix for conversion gaps | Makes maintenance look weak and undermines POM reuse | Keep fixes in converter output or dedicated k6 patch layer |

## Feature Dependencies

```text
Upstream sync
    └──requires──> generated k6 page layer
                         └──requires──> build pipeline

Smoke runner
    └──requires──> scenario registry
                         └──requires──> reusable smoke flows

Example load/capacity profiles
    └──enhances──> smoke runner

Grafana stack
    ──conflicts with──> first-milestone scope discipline
```

### Dependency Notes

- **Upstream sync requires generated k6 page layer:** syncing alone is not useful unless those pages become executable in k6
- **Generated k6 page layer requires build pipeline:** typed imports, aliases, and output packaging need a repeatable build step
- **Smoke runner requires scenario registry:** one-command execution is clean only when scenarios are centrally declared
- **Load/capacity profiles enhance smoke runner:** they should reuse the same runner and config path, not fork architecture
- **Grafana stack conflicts with first-milestone scope discipline:** observability is valuable later, but it weakens focus now

## MVP Definition

### Launch With (v1)

- [ ] Upstream sync from `easyPlaywright` — proves reuse story
- [ ] k6-compatible generated/patchable page layer — proves adaptation story
- [ ] Smoke scenario registry and runnable smoke simulation — proves execution story
- [ ] Local runner with env validation — proves usability story
- [ ] Clear README and architecture docs — proves showcase story

### Add After Validation (v1.x)

- [ ] Example load profile — add once smoke flow is stable
- [ ] Example capacity profile — add after load example structure is in place
- [ ] Report-ready artifacts — add once smoke output is consistent

### Future Consideration (v2+)

- [ ] Grafana integration — defer until the adapted framework is stable
- [ ] CI workflow — defer until local experience is solid
- [ ] Generic upstream adapter support — defer unless a second upstream source really appears

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Upstream sync command | HIGH | MEDIUM | P1 |
| k6-compatible page conversion | HIGH | HIGH | P1 |
| Smoke scenario registry | HIGH | MEDIUM | P1 |
| Local runner + env config | HIGH | MEDIUM | P1 |
| Load example profile | MEDIUM | LOW | P2 |
| Capacity example profile | MEDIUM | LOW | P2 |
| Structured summary artifacts | MEDIUM | MEDIUM | P2 |
| Grafana integration | LOW for v1 | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competitor A | Competitor B | Our Approach |
|---------|--------------|--------------|--------------|
| Upstream POM reuse | `ir-perf-k6` does this at enterprise scale | Typical small k6 examples do not | Keep the reuse idea, drop enterprise sprawl |
| Smoke execution UX | Simple portfolio repos are easy to run but shallow | Enterprise repos are powerful but heavy | Aim for simple commands plus serious architecture |
| Example scaling stories | Most showcase repos stop at smoke | `ir-perf-k6` includes stronger profile depth | Keep load/capacity as examples to show depth without heavy setup |

## Sources

- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\README.md`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\docs\DEVELOPMENT.md`
- `C:\Users\pzhly\Documents\GitHub\easyPlaywright\README.md`
- Current `easyk6` repo structure and README

---
*Feature research for: Showcase k6 browser framework that reuses Playwright Page Objects*
*Researched: 2026-04-23*
