import assert from "node:assert/strict";
import { test } from "node:test";
import type { GardenNode } from "./garden.ts";
import {
  aboutOf,
  callsFrom,
  emptyFence,
  fenceAbout,
  hasUse,
  isDue,
  parseFence,
  readings,
  recordReadings,
  serialiseFence,
  slugOf,
  standingOf,
  stateOf,
  tally,
  validateFence,
  whyOf,
  type Fence,
} from "./fence.ts";
import { EXAMPLE_FENCE, SPECIMEN_FENCES } from "../content/fence.ts";

const [FIRST, SECOND] = SPECIMEN_FENCES;
const TODAY = "2026-09-28";
const VERDICT =
  /\b(you should|should (keep|clear|take|come)|wise|unwise|reckless|careless|rash|foolish|good|bad|better|worse|mistake|wrong|recommend\w*|score|safe|risky)\b/i;

/** Taken down for a while before anything was found, and the day to look again has passed. */
const THIRD: Fence = {
  ...emptyFence("2026-09-20"),
  slug: "2026-09-20-the-lock-on-the-side-door",
  fence: "The lock on the side door.",
  uses: [
    {
      id: "u1",
      text: "So no one walks in from the garden.",
      known: "guess",
      holds: "",
      instead: "",
      by: "you",
      kept: true,
    },
  ],
  calls: [
    {
      on: "2026-09-20",
      call: "trial",
      until: "2026-09-27",
      note: "",
      unseen: true,
    },
  ],
};

const node = (
  id: string,
  kind: GardenNode["kind"],
  body: string,
  file: string,
): GardenNode => ({
  id,
  label: id.replace(/^\w+?_/, "").replace(/_/g, " "),
  kind,
  description: "",
  body,
  file,
  modified: null,
  stage: "tended",
  signed: null,
  degree: 0,
  source: "memory",
});

test("the record's reason is the paragraph after **Why:**, links unwrapped", () => {
  const body =
    "Audio cues startle him.\n\n**Why:** startle response, not mild annoyance — consistent with his noise hypersensitivity ([[user_sensory_needs]]). The chime was [[feedback_hooks|a hook]] once, and `afplay` ran on **every** stop.\n\n**How to apply:** never add afplay.";
  assert.equal(
    whyOf(body),
    "startle response, not mild annoyance — consistent with his noise hypersensitivity. The chime was a hook once, and afplay ran on every stop.",
  );
  assert.equal(whyOf("**Why**: a reason.\n**How to apply:** b"), "a reason.");
  assert.equal(whyOf("No reason given here."), "");
  const long = whyOf(`**Why:** ${"word ".repeat(120)}`);
  assert.ok(long.length <= 321 && long.endsWith("…"), long);
});

test("the rules in the record stand as fences, oldest first, each with the reason it was given", () => {
  const nodes = [
    node("feedback_b", "feedback", "No reason on record.", "/m/b.md"),
    node("feedback_a", "feedback", "Rule.\n\n**Why:** because.", "/m/a.md"),
    node("project_c", "project", "**Why:** not a rule.", "/m/c.md"),
  ];
  const since = (f: string | null) => (f === "/m/a.md" ? "2026-04-20" : null);
  assert.deepEqual(standingOf(nodes, since), [
    { id: "feedback_a", label: "a", why: "because.", since: "2026-04-20" },
    { id: "feedback_b", label: "b", why: "", since: null },
  ]);
  const about = aboutOf(nodes[1], "2026-04-20");
  assert.equal(about.mine, true);
  const f = fenceAbout(about, TODAY);
  assert.equal(f.fence, "a");
  assert.equal(f.maker, "me");
  assert.equal(f.when, "2026-04-20");
  assert.deepEqual(f.uses[0], {
    id: "u1",
    text: "because.",
    known: "written",
    holds: "",
    instead: "",
    by: "garden",
    kept: false,
  });
  assert.equal(
    hasUse(f),
    false,
    "a reason from the record is hollow until kept",
  );
  assert.deepEqual(readings(f, TODAY).slice(0, 3), [
    "set down 28 Sep · you put it up · 20 Apr 2026",
    "1 thing it might be for: 1 from the record, not yet kept",
    "no use found yet",
  ]);
  const kept = { ...f, uses: [{ ...f.uses[0], kept: true }] };
  assert.equal(hasUse(kept), true);
});

test("a fence reads back what was found, what was guessed, what would come through and the calls; never a verdict", () => {
  const a = readings(FIRST, TODAY);
  assert.deepEqual(a, [
    "set down 8 Sep · put up by Marta, who ran the studio before me · 2021 · someone you can ask",
    "3 things it might be for: 1 found by asking, 1 seen at work, 1 guess",
    "a use found: After the week a client was sent another client's drafts.",
    "of what was found: 1 still holds, 1 not sure",
    "something else does this now for 1: the Thursday review, partly",
    "if it came down: 2 things you said would come through",
    "if it has to go back up: easily — A line back in the Friday calendar.",
    "moved 12 Sep: To the day a send is ready — the check stays, the wait goes.",
  ]);
  const b = readings(SECOND, TODAY);
  assert.deepEqual(b, [
    "set down 15 Sep · you put it up — the week we all went home · March 2020",
    "2 things it might be for: 1 found written, 1 guess",
    "a use found: So the ones working from home were not forgotten.",
    "of what was found: 1 no longer holds",
    "if it came down: 2 things you said would come through",
    "if it has to go back up: easily — One message on a Monday.",
    "put back up 26 Sep: Twice a week, Monday and Thursday. · before that: down for a while 15 Sep",
    "afterwards: of the 2 you listed, 1 came through, 1 did not",
  ]);
  const c = readings(THIRD, TODAY);
  assert.deepEqual(c, [
    "set down 20 Sep",
    "1 thing it might be for: 1 guess",
    "no use found yet: every one is a guess",
    "not said yet what would come through",
    "not said yet whether it could go back up",
    "down for a while since 20 Sep, until 27 Sep — the day to look again was 1 day ago, before a use was found",
  ]);
  assert.equal(
    readings(THIRD, "2026-09-25")[5],
    "down for a while since 20 Sep, until 27 Sep — 2 days to go, before a use was found",
  );
  const blank = readings({ ...emptyFence(TODAY), fence: "x" }, TODAY);
  assert.equal(blank[1], "nothing set down yet that it might be for");
  assert.equal(blank.at(-1), "no call yet");
  for (const s of [...a, ...b, ...c, ...blank]) assert.doesNotMatch(s, VERDICT);
});

test("where a fence stands decides which calls it can take", () => {
  assert.equal(stateOf(FIRST), "move");
  assert.equal(stateOf(SECOND), "back");
  assert.equal(stateOf(THIRD), "trial");
  assert.equal(stateOf(EXAMPLE_FENCE), "open");
  assert.deepEqual(callsFrom("open"), ["keep", "move", "down", "trial"]);
  assert.deepEqual(callsFrom("trial"), ["back", "move", "down"]);
  assert.deepEqual(callsFrom("down"), ["back", "move"]);
  assert.equal(isDue(THIRD, "2026-09-26"), false);
  assert.equal(isDue(THIRD, "2026-09-27"), true);
  assert.equal(
    isDue(SECOND, TODAY),
    false,
    "a trial answered is no longer due",
  );
});

test("the record counts the calls, the uses found and guessed, and what came through; it never grades", () => {
  const t = tally([FIRST, SECOND, THIRD], TODAY);
  assert.equal(t.n, 3);
  assert.equal(t.found, 2);
  assert.equal(t.unseen, 1);
  assert.equal(t.uses, 6);
  assert.equal(t.guesses, 3);
  assert.deepEqual(t.by, { asked: 1, written: 1, seen: 1 });
  assert.equal(t.looked, 1);
  assert.equal(t.listed, 1);
  const r = recordReadings(t);
  assert.deepEqual(r, [
    "3 fences set down · a use found for 2",
    "where they stand: moved 1 · down for a while 1 · put back up 1",
    "taken down before a use was found: 1",
    "what they might be for: 6 — 3 guesses, 3 found (found by asking 1, found written 1, seen at work 1) · of the found, 1 still holds, 1 no longer, 1 not sure",
    "looked at again after coming down: 1 — something you listed came through for 1 of 1",
    "a day to look again has come: The lock on the side door (27 Sep)",
  ]);
  for (const s of r) assert.doesNotMatch(s, VERDICT);
  assert.deepEqual(recordReadings(tally([], TODAY)), [
    "no fences set down yet",
  ]);
});

test("a fence survives its file, and the file reads as bullets a person can edit", () => {
  const example = {
    ...EXAMPLE_FENCE,
    put: TODAY,
    touched: TODAY,
    slug: slugOf(EXAMPLE_FENCE.fence, TODAY),
  };
  const about = fenceAbout(
    aboutOf(
      node("feedback_a", "feedback", "**Why:** because.", "/m/a.md"),
      null,
    ),
    TODAY,
  );
  for (const f of [...SPECIMEN_FENCES, THIRD, example, { ...about, slug: "x" }])
    assert.deepEqual(parseFence(f.slug, serialiseFence(f)), f);
  const raw = serialiseFence(FIRST);
  assert.match(raw, /^- \[asked · still holds\] After the week/m);
  assert.match(
    raw,
    /^ {2}- something else does this now: the Thursday review, partly$/m,
  );
  assert.match(raw, /^maker: ask$/m);
  const two = serialiseFence(SECOND);
  assert.match(
    two,
    /^- 2026-09-15: down for a while until 2026-09-26 — Two weeks without it, watching the board\.$/m,
  );
  assert.match(two, /^- \[came through\] Blocked work sitting for days\.$/m);
  assert.match(
    serialiseFence(THIRD),
    /^- 2026-09-20: down for a while until 2026-09-27 · before a use was found$/m,
  );
  assert.match(
    serialiseFence(about),
    /^- \[found it written · from the record · hollow\] because\.$/m,
  );
  const hand = parseFence(
    "2026-09-01-the-hedge",
    "---\nput: 2026-09-01\nwhen: 1998\n---\n\n## the fence\n\nThe hedge.\n\n## what it might be for\n\n- To keep the deer out.\n- [asked · still holds] Shelter for the bees.\n\n## the calls\n\n- 2026-09-02: kept — it stays\n",
  );
  assert.equal(hand.put, "2026-09-01");
  assert.equal(hand.when, "1998");
  assert.deepEqual(
    hand.uses.map((u) => [u.known, u.holds, u.by, u.kept]),
    [
      ["guess", "", "you", true],
      ["asked", "holds", "you", true],
    ],
  );
  assert.deepEqual(hand.calls, [
    {
      on: "2026-09-02",
      call: "keep",
      until: "",
      note: "it stays",
      unseen: false,
    },
  ]);
});

test("validation clamps every choice, drops a call it does not know, and refuses a fence with no words", () => {
  assert.throws(() => validateFence({ fence: " " }), /needs what it is/);
  const f = validateFence({
    fence: "x",
    put: TODAY,
    maker: "god",
    back: "maybe",
    uses: [
      { text: "a", known: "vibes", holds: "forever" },
      { text: " " },
      { text: "b", id: "Bad Id!", by: "garden", kept: false },
    ],
    through: [{ text: "t", came: "maybe" }],
    calls: [
      { on: "2026-09-29", call: "keep" },
      { on: TODAY, call: "trial", until: "2026-10-05", unseen: true },
      { on: TODAY, call: "explode" },
      { on: TODAY, call: "move", until: "2026-10-05", unseen: true },
    ],
  });
  assert.equal(f.slug, "2026-09-28-x");
  assert.equal(f.maker, "");
  assert.equal(f.back, "");
  assert.deepEqual(
    f.uses.map((u) => [u.id, u.known, u.holds, u.by, u.kept]),
    [
      ["u1", "guess", "", "you", true],
      ["u2", "guess", "", "garden", false],
    ],
  );
  assert.deepEqual(f.through, [{ id: "t1", text: "t", came: "" }]);
  assert.deepEqual(
    f.calls.map((c) => [c.on, c.call, c.until, c.unseen]),
    [
      [TODAY, "trial", "2026-10-05", true],
      [TODAY, "move", "", false],
      ["2026-09-29", "keep", "", false],
    ],
  );
});
