import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileHistory } from "./course-history.ts";

/** A throwaway repository with a note that grows over three days. */
function repo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "niwa-history-"));
  const g = (args: string[], day: string) =>
    execFileSync("git", ["-C", dir, ...args], {
      stdio: "ignore",
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: `${day}T12:00:00Z`,
        GIT_COMMITTER_DATE: `${day}T12:00:00Z`,
        GIT_AUTHOR_NAME: "t",
        GIT_AUTHOR_EMAIL: "t@t",
        GIT_COMMITTER_NAME: "t",
        GIT_COMMITTER_EMAIL: "t@t",
      },
    });
  g(["init", "-q"], "2026-09-01");
  const file = path.join(dir, "essay.md");
  fs.writeFileSync(file, "# essay\n\nrests on Alpha.\n");
  g(["add", "."], "2026-09-01");
  g(["commit", "-q", "-m", "one"], "2026-09-01");
  fs.writeFileSync(file, "# essay\n\nrests on Alpha, and on [[beta-note]].\n");
  g(["add", "."], "2026-09-04");
  g(["commit", "-q", "-m", "two"], "2026-09-04");
  fs.writeFileSync(
    file,
    "# essay\n\nrests on Alpha, on [[beta-note]], and Gamma Ray.\n",
  );
  g(["add", "."], "2026-09-09");
  g(["commit", "-q", "-m", "three"], "2026-09-09");
  return dir;
}

test("fileHistory reads the days a file changed and when each name first appeared", () => {
  const dir = repo();
  const h = fileHistory(path.join(dir, "essay.md"), [
    { id: "alpha", strings: ["Alpha"] },
    { id: "beta", strings: ["Beta Note", "beta-note"] },
    { id: "gamma", strings: ["Gamma Ray"] },
    { id: "delta", strings: ["Delta"] },
  ]);
  assert.deepEqual(h.rewrites, ["2026-09-01", "2026-09-04", "2026-09-09"]);
  assert.equal(h.since, "2026-09-01");
  // alpha was there when the record begins, so the record cannot date it
  assert.deepEqual(h.arrivals, { beta: "2026-09-04", gamma: "2026-09-09" });
  fs.rmSync(dir, { recursive: true, force: true });
});

test("fileHistory is empty for a file outside any repository", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "niwa-nogit-"));
  const file = path.join(dir, "loose.md");
  fs.writeFileSync(file, "nothing\n");
  const h = fileHistory(file, [{ id: "x", strings: ["nothing"] }]);
  // the temp dir may sit inside a repository on some machines; either way, no arrival is invented
  assert.deepEqual(h.arrivals, {});
  fs.rmSync(dir, { recursive: true, force: true });
});
