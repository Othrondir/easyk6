// scripts/lib/transforms.mjs
// Source-to-source transforms ported from ir-perf-k6/config/convert-to-k6.sh.
// Each function is pure: takes a string, returns a string. Walker functions
// also return a string. No file I/O; orchestration lives in convert-pages.mjs.

import path from 'node:path';

// ---------- Helpers ----------

/**
 * Source: convert-to-k6.sh:434-450 (Python original).
 * Returns [innerExpr, indexAfterCloseParen] or [null, -1] when no balanced () found.
 */
export function extractBalancedParens(text, start) {
  if (start >= text.length || text[start] !== '(') return [null, -1];
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return [text.slice(start + 1, i), i + 1];
    }
  }
  return [null, -1];
}

/**
 * Source: convert-to-k6.sh:452-487. Splits an `expect(...)` argument list
 * on top-level commas, tracking string boundaries (', ", `) with backslash
 * escapes plus (), {}, [] depth. Returns the first segment so optional
 * `, 'msg'` second-arg is dropped.
 */
export function stripExpectMessage(expr) {
  let depthRound = 0,
    depthCurly = 0,
    depthSquare = 0;
  let inString = null;
  let escape = false;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '(') depthRound++;
    else if (ch === ')') depthRound--;
    else if (ch === '{') depthCurly++;
    else if (ch === '}') depthCurly--;
    else if (ch === '[') depthSquare++;
    else if (ch === ']') depthSquare--;
    else if (
      ch === ',' &&
      depthRound === 0 &&
      depthCurly === 0 &&
      depthSquare === 0
    ) {
      return expr.slice(0, i).trim();
    }
  }
  return expr.trim();
}

// ---------- Stage 1: strip @playwright/test imports (R1) ----------
export function stripPlaywrightImports(content) {
  return content
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*import\s.*from\s+['"]@playwright\/test['"];?\s*$/.test(line)
    )
    .join('\n');
}

/**
 * R6a: Strip the residual `import { BasePage } from './BasePage';` line that
 * upstream easyPlaywright POMs carry. The converter's R5 rule rewrites
 * `extends BasePage` -> `extends K6Page` but leaves the import dangling
 * because `./BasePage` has no resolution target after sync (BasePage.ts is
 * in SKIP_FILES). See Phase 3 RESEARCH §3.2(a).
 *
 * Regex is intentionally tight:
 *   - matches `import { BasePage } from './BasePage';` and `from '.BasePage';`
 *     (with optional trailing semicolon and whitespace)
 *   - does NOT match `import { Something } from './BasePage'` (non-BasePage symbol)
 *   - does NOT match `import { BasePage } from '@other/BasePage'` (different module path)
 *   - does NOT match multi-line imports (defended by lib/pages/BasePage.ts passthrough)
 */
export function stripLocalBasePageImports(content) {
  return content
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*import\s+\{\s*BasePage\s*\}\s+from\s+['"]\.\/?BasePage['"];?\s*$/.test(line)
    )
    .join('\n');
}

// ---------- Stage 2: strip duplicate k6 imports (R2 — defensive idempotency) ----------
export function stripDuplicateK6Imports(content) {
  const patterns = [
    /^\s*import\s+\{\s*Page,\s*Locator\s*\}\s+from\s+['"]k6\/browser['"];?\s*$/,
    /^\s*import\s+\{\s*Page\s*\}\s+from\s+['"]k6\/browser['"];?\s*$/,
    /^\s*import\s+\{\s*Locator\s*\}\s+from\s+['"]k6\/browser['"];?\s*$/,
    /^\s*import\s+\{\s*K6Page\s*\}\s+from\s+['"][^'"]*base-page['"];?\s*$/,
    /^\s*import\s+\{\s*K6PlaywrightSelectors\s*\}\s+from\s+['"][^'"]*selectors['"];?\s*$/,
    /^\s*import\s+\{\s*expect\s*\}\s+from\s+['"]@lib\/vendor\/k6-testing-wrapper\.js['"];?\s*$/,
  ];
  return content
    .split(/\r?\n/)
    .filter((line) => !patterns.some((p) => p.test(line)))
    .join('\n');
}

// ---------- Stage 3: inject k6 imports (R3 + R4) ----------
export function injectK6Imports(content, k6ImportPath, includeExpect = false) {
  const importLines = [
    `import { Page, Locator } from 'k6/browser';`,
    `import { K6Page } from "${k6ImportPath}";`,
  ];
  if (includeExpect) {
    importLines.push(
      `import { expect } from '@lib/vendor/k6-testing-wrapper.js';`
    );
  }
  const block = importLines.join('\n');

  const lines = content.split(/\r?\n/);
  const firstImport = lines.findIndex((l) => /^\s*import\s/.test(l));
  if (firstImport !== -1) {
    lines.splice(firstImport, 0, block, '');
    return lines.join('\n');
  }
  const firstClass = lines.findIndex((l) => /^\s*(export\s+)?class\s/.test(l));
  if (firstClass !== -1) {
    lines.splice(firstClass, 0, block, '');
    return lines.join('\n');
  }
  return block + '\n\n' + content;
}

// ---------- Stage 4: ensure class extends K6Page (R5 + easyk6 BasePage adaptation) ----------
export function ensureExtendsK6Page(content) {
  // Case A: `class X extends BasePage {` -> `class X extends K6Page {` (easyk6 ADAPTATION)
  let out = content.replace(
    /^(\s*(?:export\s+)?class\s+[A-Za-z_$][\w$]*)\s+extends\s+BasePage\s*\{/m,
    '$1 extends K6Page {'
  );
  if (out !== content) return out;
  // Case B: `class X {` -> `class X extends K6Page {`
  out = content.replace(
    /^(\s*(?:export\s+)?class\s+[A-Za-z_$][\w$]*)\s*\{/m,
    '$1 extends K6Page {'
  );
  return out;
}

// ---------- Stage 5: ensure super(page) call (R7) ----------
export function ensureSuperPageCall(content) {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/constructor\s*\(\s*page\s*:\s*Page\s*\)\s*\{/.test(lines[i])) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j < lines.length && !/super\s*\(\s*page\s*\)/.test(lines[j])) {
        const indentMatch = lines[j].match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '        ';
        lines.splice(i + 1, 0, `${indent}super(page);`);
      }
      break;
    }
  }
  return lines.join('\n');
}

// ---------- Stage 6: balanced-paren walker for expect(...).to* (R8-R12) ----------
export function transformExpectAssertions(content) {
  const out = [];
  let i = 0;
  while (i < content.length) {
    const idx = content.indexOf('expect(', i);
    if (idx === -1) {
      out.push(content.slice(i));
      break;
    }
    out.push(content.slice(i, idx));

    const [inner, afterArgs] = extractBalancedParens(
      content,
      idx + 'expect'.length
    );
    if (inner === null) {
      out.push('expect(');
      i = idx + 'expect('.length;
      continue;
    }
    const target = stripExpectMessage(inner);

    let chainStart = afterArgs;
    let negated = false;
    if (content.slice(chainStart, chainStart + 4) === '.not') {
      negated = true;
      chainStart += 4;
    }
    const rest = content.slice(chainStart);
    const methodMatch = /^\.([A-Za-z_$][\w$]*)/.exec(rest);
    if (!methodMatch) {
      out.push(content.slice(idx, afterArgs));
      i = afterArgs;
      continue;
    }
    const method = methodMatch[1];
    const methodArgsStart = chainStart + methodMatch[0].length;
    const [methodArgs, afterMethod] = extractBalancedParens(
      content,
      methodArgsStart
    );
    if (methodArgs === null) {
      out.push(content.slice(idx, afterArgs));
      i = afterArgs;
      continue;
    }

    let state = null;
    if (method === 'toBeVisible') state = negated ? 'hidden' : 'visible';
    else if (method === 'toBeHidden') state = 'hidden';
    else if (method === 'toBeEnabled') state = 'visible';

    if (state) {
      const tm = /timeout:\s*(\d+)/.exec(methodArgs || '');
      const opts = tm
        ? `{ state: '${state}', timeout: ${tm[1]} }`
        : `{ state: '${state}' }`;
      out.push(`${target}.waitFor(${opts})`);
      i = afterMethod;
    } else {
      // Unsupported assertion (toHaveText, toHaveCount, toBe, etc.) — comment
      // the whole statement out with `// k6-compat:` prefix.
      //
      // Boundary fix (Rule 1 bug found during 02-03 round-trip): the original
      // walker only commented `expect(...).method(...)`, leaving any preceding
      // `await ` / `return ` keyword orphaned and any trailing `;` as a stray
      // statement. Both produce invalid TypeScript. We now absorb both into
      // the commented region — matching the canonical ir-perf-k6 behavior at
      // convert-to-k6.sh:604-611.
      // 1) Peel back trailing `await ` / `return ` from the last out chunk.
      let leading = '';
      const last = out.length ? out[out.length - 1] : '';
      const m = /(await|return)\s+$/.exec(last);
      if (m) {
        leading = m[0];
        out[out.length - 1] = last.slice(0, last.length - leading.length);
      }
      // 2) Eat trailing `;` (and any whitespace between `)` and `;`).
      let tail = afterMethod;
      const trailing = /^\s*;/.exec(content.slice(tail));
      let trailText = '';
      if (trailing) {
        trailText = trailing[0];
        tail += trailing[0].length;
      }
      const original = leading + content.slice(idx, afterMethod) + trailText;
      out.push(`// k6-compat: ${original}`);
      i = tail;
    }
  }
  return out.join('');
}

// ---------- Stage 7: locator-method shortcuts (R13, R14, R15) ----------
export function transformLocatorShortcuts(content) {
  return content
    .replace(/\.first\(\)/g, '.nth(0)')
    .replace(/\.last\(\)/g, '.nth(-1)')
    .replace(/\.clear\(\)/g, ".fill('')");
}

// ---------- Stage 8: getBy* + locator(hasText) -> selector shim / has-text (R16-R19) ----------
export function transformGetByMethods(content) {
  let out = content;
  // R16
  out = out.replace(
    /this\.page\.getByTitle\(\s*'([^']+)'\s*\)/g,
    `this.page.locator('[title="$1"]')`
  );
  out = out.replace(
    /this\.page\.getByTitle\(\s*"([^"]+)"\s*\)/g,
    `this.page.locator('[title="$1"]')`
  );
  // R17
  out = out.replace(/this\.page\.getByText\(/g, 'this.selectors.getByText(');
  out = out.replace(/this\.page\.getByRole\(/g, 'this.selectors.getByRole(');
  out = out.replace(
    /this\.page\.getByTestId\(/g,
    'this.selectors.getByTestId('
  );
  // R18
  out = out.replace(
    /(?<!this\.)\bpage\.getByTestId\(/g,
    'this.selectors.getByTestId('
  );
  // R19 — both quote variants. The hasText capture trims trailing whitespace
  // so the emitted backtick template reads `${expr}` rather than `${expr }`.
  out = out.replace(
    /this\.page\.locator\(\s*'([^']+)'\s*,\s*\{\s*hasText:\s*([^}]+?)\s*\}\s*\)/g,
    'this.page.locator(`$1:has-text("${$2}")`)'
  );
  out = out.replace(
    /this\.page\.locator\(\s*"([^"]+)"\s*,\s*\{\s*hasText:\s*([^}]+?)\s*\}\s*\)/g,
    'this.page.locator(`$1:has-text("${$2}")`)'
  );
  return out;
}

// ---------- Stage 9: strip page field shadow (R28) ----------
export function stripPageFieldShadow(content) {
  return content
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*(?:private|protected)?\s*(?:readonly\s+)?page\s*:\s*Page\s*;?\s*$/.test(
          line
        )
    )
    .join('\n');
}

// ---------- Helper: compute import path depth ----------
/**
 * For a relative path inside src/pages/ (e.g. 'HomePage.ts' or 'components/Nav.ts'),
 * returns the POSIX-style relative path from the converted file's location
 * back to lib/pages/base/base-page.
 */
export function computeK6ImportPath(relPath) {
  const normalized = relPath.split(path.sep).join('/');
  const depth = (normalized.match(/\//g) || []).length;
  return depth === 0
    ? './base/base-page'
    : '../'.repeat(depth) + 'base/base-page';
}

// ---------- Helper: detect if R12 commented-out expect calls remain ----------
export function hasResidualExpectCompat(content) {
  return /^\s*\/\/ k6-compat:\s*expect/m.test(content);
}
