/**
 * Screenshots the PUBLIC garden for docs/img/garden.png.
 *
 *   node --experimental-strip-types scripts/snapshot.mjs public
 *   NIWA_MODE=public pnpm exec next dev --port 5051 --hostname 127.0.0.1
 *   node scripts/shot.mjs
 *
 * playwright is not a dependency of this repo and must not become one — a graph
 * renderer does not need a browser driver to run. Point PLAYWRIGHT_DIR at an
 * installation that already has its browsers, or install one and pass the path.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const url = process.env.NIWA_SHOT_URL ?? "http://127.0.0.1:5051";
const out = process.env.NIWA_SHOT_OUT ?? "docs/img/garden.png";
const dir =
  process.env.PLAYWRIGHT_DIR ??
  path.join(os.homedir(), "Code", "shosai", "node_modules", "playwright");

const { chromium } = createRequire(import.meta.url)(dir);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(url, { waitUntil: "load" });
await page.waitForSelector("canvas", { timeout: 30_000 });
// The force simulation needs to settle, and stones fade in on arrival.
await page.waitForTimeout(12_000);
// "fit" frames the connected ontology, which is the part worth looking at.
await page.getByRole("button", { name: "Frame the whole garden" }).click();
await page.waitForTimeout(3_000);
await fs.mkdir(path.dirname(out), { recursive: true });
await page.screenshot({ path: out });
await browser.close();
console.log(`wrote ${out}`);
