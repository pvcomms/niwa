import assert from "node:assert/strict";
import { test } from "node:test";
import { NOTICE } from "../content/notice.ts";
import { VIEW_NAME } from "./margin.ts";
import { validateNotice, type Notice } from "./notice.ts";

const VIEWS = Object.keys(VIEW_NAME);

test("the notice is whole", () => {
  assert.deepEqual(validateNotice(NOTICE, VIEWS), []);
});

test("a card for every view the garden has, and for no other", () => {
  const cards = NOTICE.views.map((c) => c.href).sort();
  assert.deepEqual(cards, VIEWS.filter((v) => v !== "/notice").sort());
});

test("a missing card, a step to nowhere and a home path are each named", () => {
  const broken: Notice = {
    ...NOTICE,
    views: NOTICE.views.slice(1),
    round: [{ ...NOTICE.round[0], views: ["/nowhere"] }],
    stance: [NOTICE.stance[0], "kept at /Users/someone/garden"],
  };
  const p = validateNotice(broken, VIEWS);
  assert.ok(p.some((s) => s === "no card for /"), p.join("\n"));
  assert.ok(p.some((s) => s.includes("does not exist: /nowhere")), p.join("\n"));
  assert.ok(p.some((s) => s.startsWith("a home path")), p.join("\n"));
});

test("the notice keeps the constellation's promises in so many words", () => {
  const said = [...NOTICE.stance, ...NOTICE.not].join(" ").toLowerCase();
  assert.match(said, /scor/, "it must say it will not score");
  assert.match(said, /recommend/, "it must say it will not recommend");
  assert.match(said, /\btrue\b/, "it must say it will not say whether a thing is true");
  assert.match(said, /yours/, "it must say the judgment is the reader's");
  for (const c of NOTICE.views)
    assert.ok(c.never.trim().endsWith("."), `${c.name}'s never is a sentence`);
});
