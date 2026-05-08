# Vendor Libraries

Third-party k6 libraries bundled locally to avoid CDN dependencies during
test execution. This makes the recruiter-facing showcase repo runnable
without internet access once `npm install` is done.

## Files

| Library | Version | Source | Purpose |
|---------|---------|--------|---------|
| `k6-testing.js` | 0.5.0 | k6 jslib | Playwright-compatible assertions (`expect`, etc.) used by converted POMs whose original `expect(...).toX()` calls were commented out by `scripts/convert-pages.mjs`. |

## Wrappers

`k6-testing-wrapper.js` provides a CommonJS-compatible export shape so Vite
can bundle the underlying CommonJS module. The converter injects:

```ts
import { expect } from '@lib/vendor/k6-testing-wrapper.js';
```

The `@lib` alias is wired in `vite.config.ts`.

## Updates

To update:
1. Download the new version from `https://jslib.k6.io/k6-testing/<version>/index.js`.
2. Replace `k6-testing.js` and update the version row above.
3. Re-run `npm run build && npm run validate:build` to confirm bundling still works.
