/**
 * Pure markdown formatter for k6 handleSummary artifacts (PROF-04).
 *
 * Goja safety contract (CONTEXT D-19):
 *   - No `new URL`, no Buffer, no process, no fs, no path module.
 *   - No imports — pure function with zero runtime dependencies.
 *   - String ops only. JSON.stringify is NOT used here (lives in format-json.ts).
 *   - Optional chaining + nullish coalescing for missing metric values.
 *
 * Walked structure (see RESEARCH §6 Example 4):
 *   data.metrics[name].values['p(95)']  -> trend percentiles (ms)
 *   data.metrics[name].values.rate      -> rate metrics
 *   data.metrics[name].values.count     -> counters
 *   data.metrics[name].thresholds[bound].ok -> boolean per threshold
 *
 * 5-section structure (CONTEXT D-11):
 *   1. Header     — title + 4-bullet metadata block
 *   2. What ran   — one-line profile description
 *   3. Thresholds — | Metric | Bound | Actual | Verdict |
 *   4. Key metrics — | Metric | Value |
 *   5. Footer     — pointer to the JSON sibling artifact
 */

export interface FormatMeta {
  profile: string;
  scenario: string;
  baseUrl: string;
  runDateIso: string;
}

interface MetricValues {
  [key: string]: number | undefined;
}

interface MetricThreshold {
  ok: boolean;
}

interface MetricEntry {
  type?: string;
  contains?: string;
  values?: MetricValues;
  thresholds?: Record<string, MetricThreshold>;
}

interface K6Data {
  metrics?: Record<string, MetricEntry>;
}

/**
 * One-line human description of each profile's executor shape.
 * Falls back to the literal profile name for unknown profiles so
 * the formatter never throws on a future profile addition.
 */
function describeProfile(profile: string): string {
  if (profile === 'smoke') return '1 VU, 1 iteration shared-iterations';
  if (profile === 'load')
    return '5 VUs, ~2 min ramping-vus (30s ramp / 60s hold / 30s ramp down)';
  if (profile === 'capacity')
    return '0->10 iter/s ramping-arrival-rate over 3 min';
  return profile;
}

/**
 * Pick the threshold's "actual" value from the metric's `values` payload.
 * - `p(95)<3000` -> values['p(95)'] in ms
 * - `rate<0.01`  -> values.rate as percent
 * Falls back to 'n/a' when the metric is missing or the bound is unknown.
 */
function pickActualForBound(
  metric: MetricEntry | undefined,
  bound: string
): string {
  const values = metric?.values;
  if (!values) return 'n/a';
  const pctMatch = /^(p\([0-9]+\))</.exec(bound);
  if (pctMatch) {
    const v = values[pctMatch[1]];
    return typeof v === 'number' ? `${v}ms` : 'n/a';
  }
  if (bound.startsWith('rate<')) {
    const v = values.rate;
    return typeof v === 'number' ? `${(v * 100).toFixed(2)}%` : 'n/a';
  }
  return 'n/a';
}

function fmtMs(value: number | undefined): string {
  return typeof value === 'number' && value > 0 ? `${value}ms` : 'n/a';
}

function fmtRate(value: number | undefined): string {
  return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : 'n/a';
}

function fmtBytes(count: number | undefined): string {
  if (typeof count !== 'number') return 'n/a';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)} MB`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(2)} kB`;
  return `${count} B`;
}

export function formatMarkdown(data: K6Data, meta: FormatMeta): string {
  const lines: string[] = [];
  const metrics = data?.metrics ?? {};

  // Section 1 — Header
  lines.push(`# ${meta.profile} run — ${meta.scenario}`);
  lines.push('');
  lines.push(`- Profile: \`${meta.profile}\``);
  lines.push(`- Scenario: \`${meta.scenario}\``);
  lines.push(`- Base URL: ${meta.baseUrl}`);
  lines.push(`- Run date: ${meta.runDateIso}`);
  lines.push('');

  // Section 2 — What ran
  lines.push('## What ran');
  lines.push('');
  lines.push(describeProfile(meta.profile));
  lines.push('');

  // Section 3 — Thresholds
  lines.push('## Thresholds');
  lines.push('');
  lines.push('| Metric | Bound | Actual | Verdict |');
  lines.push('|---|---|---|---|');
  for (const [metricName, metric] of Object.entries(metrics)) {
    if (!metric?.thresholds) continue;
    for (const [bound, result] of Object.entries(metric.thresholds)) {
      const actual = pickActualForBound(metric, bound);
      const verdict = result?.ok ? '✅ PASS' : '❌ FAIL';
      lines.push(`| \`${metricName}\` | \`${bound}\` | ${actual} | ${verdict} |`);
    }
  }
  lines.push('');

  // Section 4 — Key metrics
  lines.push('## Key metrics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(
    `| LCP p(95) | ${fmtMs(metrics.browser_web_vital_lcp?.values?.['p(95)'])} |`
  );
  lines.push(
    `| iteration_duration p(95) | ${fmtMs(metrics.iteration_duration?.values?.['p(95)'])} |`
  );
  lines.push(
    `| http_req_failed rate | ${fmtRate(metrics.http_req_failed?.values?.rate)} |`
  );
  const bhrd = metrics.browser_http_req_duration?.values?.['p(95)'];
  if (typeof bhrd === 'number' && bhrd > 0) {
    lines.push(`| browser_http_req_duration p(95) | ${bhrd}ms |`);
  } else {
    // Empty-metric fallback (RESEARCH §5 Pitfall 1 + Phase 03-02 SUMMARY
    // Run 1 evidence). The literal string is grep-asserted in the
    // Wave-0 RED test fixture.
    lines.push(
      '| browser_http_req_duration p(95) | n/a (no samples — browser scenario) |'
    );
  }
  lines.push(
    `| browser_data_received total | ${fmtBytes(metrics.browser_data_received?.values?.count)} |`
  );
  lines.push('');

  // Section 5 — Footer
  lines.push('---');
  lines.push(`Raw data: \`reports/${meta.profile}-${meta.scenario}.json\``);

  return lines.join('\n');
}
