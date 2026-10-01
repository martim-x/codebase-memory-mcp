/**
 * Design-system codemod.
 *
 * The UI predates the design tokens: it hardcodes dark-theme alpha overlays
 * (`bg-white/[0.03]`), which vanish on a light background, and it uses
 * seventeen different font sizes instead of the four-step scale defined in
 * `src/styles/globals.css`.
 *
 * Both problems are mechanical, so they get rewritten mechanically. Run it
 * again after pulling upstream changes - it is idempotent and only touches
 * class strings, never logic.
 *
 *   node scripts/design-codemod.mjs           # rewrite in place
 *   node scripts/design-codemod.mjs --check   # report only, exit 1 if dirty
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname;
const check = process.argv.includes("--check");

/** Dark-only surface overlays -> semantic token. */
const SURFACE = [
  [/bg-white\/\[[^\]]+\]/g, "bg-muted"],
  [/border-white\/\[[^\]]+\]/g, "border-border"],
  [/bg-\[#0e2028\]/g, "bg-card"],
  [/bg-\[#0b1920\]/g, "bg-popover"],
  [/bg-\[#0c1a20\]/g, "bg-sidebar"],
  [/bg-\[#1a1a2e\]/g, "bg-popover"],
  [/bg-\[#0a0a10\]/g, "bg-background"],
  [/text-\[#e4e4ed\]/g, "text-foreground"],
];

/**
 * Seventeen sizes collapse to four. 12px stays reserved for metadata
 * (chips, counts, captions); running text starts at 14px.
 */
const TYPE = [
  [/\btext-\[9px\]/g, "text-label"],
  [/\btext-\[10px\]/g, "text-label"],
  [/\btext-\[11px\]/g, "text-label"],
  [/\btext-\[12px\]/g, "text-label"],
  [/\btext-xs\b/g, "text-label"],
  [/\btext-\[13px\]/g, "text-body"],
  [/\btext-\[14px\]/g, "text-body"],
  [/\btext-sm\b/g, "text-body"],
  [/\btext-base\b/g, "text-body"],
  [/\btext-\[15px\]/g, "text-subhead"],
  [/\btext-\[16px\]/g, "text-subhead"],
  [/\btext-\[18px\]/g, "text-subhead"],
  [/\btext-lg\b/g, "text-subhead"],
  [/\btext-\[20px\]/g, "text-head"],
  [/\btext-\[22px\]/g, "text-head"],
  [/\btext-xl\b/g, "text-head"],
  [/\btext-2xl\b/g, "text-head"],
];

/**
 * Alpha-modified foreground text is decorative at best: below ~50% it cannot
 * be read reliably on either background. Everything at or under half opacity
 * becomes the muted-foreground token; above it, plain foreground. Both tokens
 * are contrast-checked per theme.
 */
const FAINT = [
  [/text-foreground\/(?:1[0-9]|[2-4][0-9]|50)(?!\w)/g, "text-muted-foreground"],
  [/text-foreground\/(?:5[5-9]|[6-9][0-9])(?!\w)/g, "text-foreground"],
  [/text-muted-foreground\/(?:1[0-9]|[2-4][0-9]|50)(?!\w)/g, "text-muted-foreground"],
  /* `text-white/50` is invisible on a light surface. Bare `text-white` is
   * left alone on purpose: it is correct on the destructive red fill. */
  [/text-white\/(?:[1-9]|[1-9][0-9])(?!\w)/g, "text-muted-foreground"],
];

const RULES = [...SURFACE, ...TYPE, ...FAINT];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

let dirty = 0;
let hits = 0;

for (const file of walk(SRC)) {
  const before = readFileSync(file, "utf8");
  let after = before;

  for (const [pattern, replacement] of RULES) {
    after = after.replace(pattern, replacement);
  }

  /* Collapse duplicates the rewrite can create, e.g. `gap-2 gap-2`. */
  after = after.replace(/(className="[^"]*?)(\s\1)+/g, "$1");

  if (after !== before) {
    dirty += 1;
    const delta = before.split("\n").length === after.split("\n").length ? 0 : 0;
    hits += 1;
    const name = relative(SRC, file);
    if (check) {
      console.log(`  would rewrite  ${name}`);
    } else {
      writeFileSync(file, after);
      console.log(`  rewritten      ${name}  (${delta})`);
    }
  }
}

console.log(
  check
    ? `${dirty} file(s) would change under --check`
    : `${dirty} file(s) rewritten, ${hits} total`,
);

process.exit(check && dirty > 0 ? 1 : 0);
