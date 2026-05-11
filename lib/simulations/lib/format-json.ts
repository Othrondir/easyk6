/**
 * Pure JSON formatter for k6 handleSummary artifacts (PROF-04).
 *
 * The .json sibling of every reports/<profile>-<scenario>.md is the
 * raw-data path per CONTEXT D-09 — minimal transformation is the right
 * call. Stable 2-space indent for diff-friendliness and recruiter
 * readability when opened in a JSON viewer.
 *
 * Defensive guard: an undefined `data` payload still returns valid JSON
 * (`'{}'` after stringify) instead of throwing, so a misconfigured run
 * never breaks the artifact-emission chain.
 *
 * Goja-safe: JSON.stringify is part of the ES standard library and is
 * available in the k6 1.5 goja runtime. No imports needed.
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data ?? {}, null, 2);
}
