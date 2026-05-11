/**
 * BasePage — re-export shim.
 *
 * Upstream easyPlaywright POMs `import { BasePage } from './BasePage'`. The
 * converter strips this import in the common case (see scripts/lib/transforms.mjs
 * stripLocalBasePageImports), but a passthrough is kept here as a defensive net
 * for edge-case imports (multi-line, comment-wrapped, future POM variants).
 *
 * Runtime contract: BasePage IS K6Page. They are the same class behind the
 * re-export. New code should import K6Page directly from `./base/base-page`.
 */
export { K6Page as BasePage } from './base/base-page';
