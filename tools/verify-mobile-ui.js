import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");

assert.match(main, /requestFullscreen\(\{ navigationUI: "hide" \}\)/, "fullscreen uses the standard API");
assert.match(main, /webkitRequestFullscreen|webkitEnterFullscreen/, "fullscreen has a mobile WebKit fallback");
assert.match(main, /webkitExitFullscreen/, "fullscreen exit has a mobile WebKit fallback");
assert.match(main, /function refreshFullscreenButton[\s\S]*aria-pressed/, "fullscreen state updates the button");
assert.match(main, /function ensureFullscreenFallback[\s\S]*app-fullscreen/, "fullscreen falls back when native fullscreen silently fails");

const landscapePractice = css.match(/@media \(orientation: landscape\) and \(max-height: 560px\) \{([\s\S]*?)\n\}/)?.[1] || "";
assert.match(landscapePractice, /\.practice-panel[\s\S]*right:/, "landscape practice panel stays on the right");
assert.doesNotMatch(landscapePractice, /\.practice-panel[\s\S]*left:\s*max\(/, "landscape practice panel does not cover the left stick");

console.log("Mobile fullscreen and practice-panel layout checks passed.");
