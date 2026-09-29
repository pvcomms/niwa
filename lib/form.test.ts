import { test } from "node:test";
import assert from "node:assert/strict";
import {
  argumentForm,
  clashes,
  inWords,
  parse,
  show,
  type Formula,
} from "./form.ts";

const f = (s: string): Formula => {
  const r = parse(s);
  if (!r.ok) throw new Error(`${s}: ${r.error}`);
  return r.f;
};

test("the notation reads in symbols, ASCII and words alike, with the usual binding", () => {
  assert.equal(show(f("p -> q")), "p → q");
  assert.equal(show(f("p → q")), "p → q");
  assert.equal(show(f("p implies q")), "p → q");
  assert.equal(show(f("if p then q")), "p → q");
  assert.equal(show(f("if p and q then r")), "p ∧ q → r");
  assert.equal(show(f("~p & q | r")), "¬p ∧ q ∨ r");
  assert.equal(show(f("not (p or q)")), "¬(p ∨ q)");
  assert.equal(show(f("p -> q -> r")), "p → q → r");
  assert.equal(show(f("(p -> q) -> r")), "(p → q) → r");
  assert.equal(show(f("P iff Q")), "p ↔ q");
  assert.equal(show(f("[p <-> q] and ¬¬r")), "(p ↔ q) ∧ ¬¬r");
});

test("what does not read says why, in plain words", () => {
  const e = (s: string) => {
    const r = parse(s);
    assert.equal(r.ok, false, s);
    return r.ok ? "" : r.error;
  };
  assert.match(e("remote -> q"), /‘remote’ is not a letter/);
  assert.match(e("(p & q"), /never closed/);
  assert.match(e("p q"), /no connective/);
  assert.match(e("if p q"), /waiting for its ‘then’/);
  assert.match(e("p ->"), /stops before/);
  assert.match(e("p ) q"), /never opened/);
  assert.match(e("p # q"), /not part of the notation/);
  assert.match(e(""), /nothing written/);
});

test("a row where every premise holds and the conclusion does not is found, and named", () => {
  // Affirming the consequent: p → q, q ⊢ p.
  const a = argumentForm(
    [
      { label: "1", src: "p -> q" },
      { label: "2", src: "q" },
    ],
    { label: "c", src: "p" },
  );
  assert.equal(a.state, "read");
  if (a.state !== "read") return;
  assert.deepEqual(a.letters, ["p", "q"]);
  assert.equal(a.rows.length, 4);
  assert.deepEqual(a.live, [0, 2]);
  assert.deepEqual(a.against, [2]);
  assert.deepEqual(a.rows[2], { p: false, q: true });
});

test("modus ponens has no such row; a lone conclusion that holds everywhere is marked", () => {
  const mp = argumentForm(
    [
      { label: "1", src: "p -> q" },
      { label: "2", src: "p" },
    ],
    { label: "c", src: "q" },
  );
  assert.equal(mp.state === "read" && mp.against.length, 0);
  assert.equal(mp.state === "read" && mp.always, false);
  const taut = argumentForm([{ label: "1", src: "q" }], {
    label: "c",
    src: "p or not p",
  });
  assert.equal(taut.state === "read" && taut.always, true);
  const none = argumentForm(
    [
      { label: "1", src: "p" },
      { label: "2", src: "~p" },
    ],
    { label: "c", src: "q" },
  );
  assert.equal(none.state === "read" && none.live.length, 0);
});

test("an argument half-written or with a line that does not read is held, not read", () => {
  assert.equal(argumentForm([], { label: "c", src: "p" }).state, "empty");
  assert.equal(
    argumentForm([{ label: "1", src: "p" }], { label: "c", src: "" }).state,
    "empty",
  );
  const u = argumentForm([{ label: "premise 1", src: "p ->" }], {
    label: "the conclusion",
    src: "q",
  });
  assert.equal(u.state, "unread");
  assert.equal(u.state === "unread" && u.unread[0].label, "premise 1");
  const wide = argumentForm([{ label: "1", src: "a&b&c&d&e&f&g&h&i&j&k" }], {
    label: "c",
    src: "a",
  });
  assert.equal(wide.state, "wide");
});

test("sets that can't be held together are the smallest, and none hides inside another", () => {
  const c = clashes([
    { id: "a", src: "s" },
    { id: "b", src: "~s" },
    { id: "c", src: "p -> q" },
    { id: "d", src: "p" },
    { id: "e", src: "~q" },
    { id: "f", src: "r & ~r" },
    { id: "g", src: "not a formula" },
  ]);
  const ids = c.clashes.map((x) => x.ids.join(""));
  assert.deepEqual(ids, ["f", "ab", "cde"]);
  assert.equal(c.clashes[1].rows, 2);
  assert.equal(c.whole, false);
  assert.deepEqual(
    clashes([
      { id: "a", src: "p" },
      { id: "b", src: "p -> q" },
    ]),
    { clashes: [], whole: true },
  );
  assert.deepEqual(clashes([]), { clashes: [], whole: null });
});

test("a formula is said back with each letter's sentence in its place", () => {
  const key = { r: "I work remotely.", c: "My firm is cutting", l: "" };
  assert.equal(
    inWords(f("r & c -> l"), key),
    "if (‘I work remotely’ and ‘My firm is cutting’), then l",
  );
  assert.equal(inWords(f("~r"), key), "not ‘I work remotely’");
});
