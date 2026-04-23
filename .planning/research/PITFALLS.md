# Pitfalls Research

**Domain:** Showcase k6 browser framework that reuses Playwright Page Objects
**Researched:** 2026-04-23
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Treating k6 like Playwright at runtime

**What goes wrong:**
Developers assume upstream Playwright page objects can run in k6 unchanged.

**Why it happens:**
The object model looks similar, so the adaptation boundary is easy to underestimate.

**How to avoid:**
Create a clear sync -> convert -> patch pipeline and ban direct scenario imports from raw Playwright pages.

**Warning signs:**
- Scenario files start importing from `src/pages`
- k6 execution errors cluster around unsupported APIs
- Conversion fixes appear as one-off hacks inside tests

**Phase to address:**
Phase 2

---

### Pitfall 2: Overbuilding for Grafana before smoke works

**What goes wrong:**
Time goes into dashboards and observability while the actual adapted smoke path is still unstable.

**Why it happens:**
Observability feels impressive in a portfolio and can distract from the harder architectural proof.

**How to avoid:**
Lock the first milestone to runnable smoke, example profiles, and strong docs. Treat Grafana as a later milestone.

**Warning signs:**
- New files appear under monitoring or dashboard folders before smoke is green
- Requirements drift toward infra instead of adaptation

**Phase to address:**
Phase 5

---

### Pitfall 3: Copying all enterprise complexity from `ir-perf-k6`

**What goes wrong:**
The showcase becomes noisy, hard to read, and harder to run.

**Why it happens:**
Reference repos often contain useful patterns mixed with company-specific complexity.

**How to avoid:**
Adopt only the parts that strengthen the story: sync, conversion, scenario registry, profile runner, and concise reporting.

**Warning signs:**
- Folder explosion without direct demo value
- Docs start needing internal company context to make sense
- Commands require Docker, K8s, and multiple external services just to show smoke

**Phase to address:**
Phase 1

---

### Pitfall 4: Manual edits to generated output

**What goes wrong:**
Useful fixes are lost during the next sync or conversion.

**Why it happens:**
Generated files are convenient places to patch quickly.

**How to avoid:**
Reserve generated folders for disposable output and place durable fixes in a patch layer or in the converter.

**Warning signs:**
- Git diff shows hand-written logic inside generated files
- Team members fear re-running conversion

**Phase to address:**
Phase 2

---

### Pitfall 5: Showcase docs explain commands but not architecture

**What goes wrong:**
Recruiters can run the repo but miss why the repo demonstrates strong engineering judgment.

**Why it happens:**
Technical authors focus only on setup and omit the design story.

**How to avoid:**
Document the adaptation path, folder boundaries, and why smoke is primary while load/capacity are examples.

**Warning signs:**
- README becomes command-only
- A reviewer cannot tell which code is upstream, generated, or custom

**Phase to address:**
Phase 5

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-code scenario list in one file | Fast first demo | No scalable execution model | Only in the first spike, not in v1 |
| Put env validation inside scenarios | Fewer helper files | Duplicated config logic | Never once the runner exists |
| Keep repo JS-only to avoid build setup | Lower short-term effort | Weakens the adaptation story | Only if abandoning the `ir-perf-k6` direction entirely |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `easyPlaywright` sync | Manual file copying with undocumented steps | One scripted sync path with clear source/target folders |
| k6 browser Docker | Using the wrong image or browser setup | Use a pinned browser-enabled k6 image or documented local browser install |
| Env configuration | Mixing local secrets into source files | Use `.env` or env vars validated before execution |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Running too many browser VUs in a showcase repo | Local runs feel flaky or memory-heavy | Keep smoke tiny and mark load/capacity as examples | As soon as local hardware is modest |
| Mixing smoke and example profile behavior | Commands become confusing | Give smoke its own supported defaults and label other profiles clearly | During recruiter demos |
| Unbounded screenshot/logging output | Run artifacts become noisy and slow | Keep defaults minimal and profile-aware | Even at small scale |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Committing demo credentials | Repo becomes unsafe to share publicly | Use env files excluded from git |
| Shipping commands that disable browser protections without warning | Users run insecure defaults blindly | Document container/browser caveats clearly |
| Embedding private company assumptions from reference repos | Repo becomes unusable outside original context | Rewrite configs and docs for public/local usage |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Too many commands for first run | Reviewer gives up | One obvious smoke command first |
| Ambiguous scenario names | Reviewer does not know what was tested | Use short descriptive IDs and explanations |
| Hidden architecture boundaries | Reviewer cannot appreciate the engineering | Explicit docs for upstream, generated, and patch layers |

## "Looks Done But Isn't" Checklist

- [ ] **Upstream sync:** Often missing repeatability -> verify sync can be rerun from scratch
- [ ] **Generated page layer:** Often missing patch preservation -> verify re-conversion does not lose custom behavior
- [ ] **Smoke runner:** Often missing env validation -> verify bad config fails early with a clear message
- [ ] **Showcase docs:** Often missing architectural explanation -> verify a new reviewer can tell what is original vs adapted

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Direct Playwright runtime assumptions | MEDIUM | Move unsupported logic into converter/patch layer and refactor scenarios back to k6-safe imports |
| Scope drift into observability | LOW | Cut milestone back to smoke success and move Grafana work to v2 |
| Manual edits in generated files | MEDIUM | Re-run conversion, restore durable fixes into patches, document no-edit boundaries |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Treating k6 like Playwright at runtime | Phase 2 | Converted pages are the only scenario dependency path |
| Overbuilding for Grafana before smoke works | Phase 5 | Grafana remains deferred in roadmap and docs |
| Copying all enterprise complexity | Phase 1 | Folder structure stays readable and local-first |
| Manual edits to generated output | Phase 2 | Re-sync/re-convert keeps custom patches intact |
| Showcase docs missing architecture | Phase 5 | README and architecture docs explain the adaptation story clearly |

## Sources

- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\CLAUDE.md`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\docs\DEVELOPMENT.md`
- `C:\Users\pzhly\Documents\GitHub\ir-perf-k6\config\convert-to-k6.sh`
- `C:\Users\pzhly\Documents\GitHub\easyPlaywright\README.md`
- Current `easyk6` repo state

---
*Pitfalls research for: Showcase k6 browser framework that reuses Playwright Page Objects*
*Researched: 2026-04-23*
