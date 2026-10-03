import test from "node:test";
import assert from "node:assert/strict";
import * as sass from "sass";

test("keeps the optimized navbar logo aspect ratio", () => {
  const css = sass.compile("src/components/nav/nav.scss").css;
  const rule = css.match(/\.nav__logo-img\s*\{([^}]*)\}/)?.[1] || "";

  assert.match(rule, /width:\s*40px/);
  assert.match(rule, /height:\s*auto/);
});
