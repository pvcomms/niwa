import { test } from "node:test";
import assert from "node:assert/strict";
import type { GardenNode } from "./garden.ts";
import {
  adopt,
  askQuestions,
  census,
  censusWords,
  driftAlong,
  emptyHop,
  emptyProvenance,
  evidenceOf,
  hostsIn,
  keepAll,
  parseProvenance,
  proposedCount,
  readings,
  serialiseProvenance,
  tally,
  titleOf,
  validateProposal,
  validateProvenance,
  type Hop,
  type Provenance,
} from "./provenance.ts";

const TODAY = "2026-09-24";

const hop = (over: Partial<Hop>): Hop => ({ ...emptyHop(), ...over });

const prov = (over: Partial<Provenance> = {}): Provenance => ({
  ...emptyProvenance(TODAY),
  slug: "2026-09-24-remote-first-to-go",
  title: "Remote workers are always the first to go",
  claim:
    "Remote workers are always the first to go when a company cuts — everyone knows it, the data shows it.",
  origin:
    "In a survey of 412 managers, 31% said location would be one factor among several in any future reduction.",
  originWho: "a consultancy's survey",
  knowing: ["read", "told"],
  hops: [
    hop({
      id: "h1",
      who: "a business desk",
      channel: "press",
      where: "a national paper",
      day: "2024-11",
      said: "Remote staff first in line for cuts, survey finds.",
      gains: "the click",
      reframed: true,
      turns: [
        {
          id: "t1",
          was: "one factor",
          became: "first in line",
          by: "you",
          kept: true,
        },
      ],
    }),
    hop({
      id: "h2",
      who: "@officeguy",
      channel: "post",
      where: "x.com",
      day: "2025-02",
      said: "Wake up. Nobody who WFH is safe — a new study found remote workers are ALWAYS first to be cut. Let that sink in.",
      seen: {
        title: "@officeguy on X",
        host: "x.com",
        words: "…",
        on: "2026-09-18",
      },
      gains: "sells a course",
      runsOn: "course sales",
      asked: [
        {
          id: "q1",
          text: "who paid for the survey?",
          answer: "",
          by: "you",
          kept: true,
        },
      ],
    }),
    hop({
      id: "h3",
      who: "Dana, at lunch",
      channel: "talk",
      where: "the office",
      reframed: false,
    }),
  ],
  checks: [
    {
      id: "c1",
      text: "find the survey and read the question as asked",
      how: "the PDF",
      went: "held",
      on: "2026-09-20",
      by: "you",
      kept: true,
    },
    {
      id: "c2",
      text: "find one firm that cut",
      how: "a filing",
      went: "",
      on: null,
      by: "proposed",
      kept: false,
    },
  ],
  ...over,
});

test("the census counts the families a wording leans on, and names what it names", () => {
  const c = census(
    "Wake up. Nobody who WFH is safe — a new study found remote workers are ALWAYS first to be cut, according to Forbes. Let that sink in, and Dana agrees.",
  );
  assert.deepEqual(c.hits.urgency, ["wake up"]);
  assert.deepEqual(c.hits.absolutes, ["nobody", "always"]);
  assert.deepEqual(c.hits.authority, ["a new study found"]);
  assert.deepEqual(c.hits.reframe, ["let that sink in"]);
  assert.equal(c.attributed, 1);
  assert.ok(c.named.includes("Forbes") && c.named.includes("Dana"));
  assert.ok(!c.named.includes("Wake"), "a sentence's first word is not a name");
  assert.equal(c.n, 5);
  assert.equal(
    censusWords(c),
    "absolutes ×2 (nobody, always) · urgency ×1 (wake up) · unnamed authority ×1 (a new study found) · reframing ×1 (let that sink in)",
  );
  const quiet = census(
    "In a survey of 412 managers, 31% said location would be one factor.",
  );
  assert.equal(quiet.n, 0);
  assert.equal(censusWords(quiet), "");
});

test("drift along the chain: what each hand's wording gained and lost", () => {
  const d = driftAlong(prov());
  // origin → h1 → h2 → (h3 said nothing) → you
  assert.deepEqual(
    d.map((x) => `${x.from}>${x.to}`),
    ["origin>h1", "h1>h2", "h2>you"],
  );
  assert.ok(d[0].gained.includes("first") && d[0].gained.includes("line"));
  assert.ok(
    d[0].lost.includes("factor") &&
      d[0].lost.includes("managers") &&
      d[0].lost.includes("412"),
    "the number and the hedge are what was lost",
  );
  assert.ok(d[1].gained.includes("always"));
});

test("the tally counts, and the readings say what was counted without grading it", () => {
  const p = prov();
  const t = tally(p);
  assert.equal(t.hands, 3);
  assert.equal(t.dated, 2);
  assert.equal(t.first, "2024-11");
  assert.equal(t.checked, 1);
  assert.equal(t.reframed, 1);
  assert.equal(t.turns, 1);
  assert.equal(t.checks, 1);
  assert.equal(t.checksProposed, 1);
  assert.equal(t.held, 1);
  const words = readings(p, TODAY);
  assert.equal(words[0], "you know it because: i read it and i was told.");
  assert.equal(
    words[1],
    "3 hands between the first saying and you: the press (a business desk, a national paper), a post (@officeguy, x.com) and someone said (Dana, at lunch, the office).",
  );
  assert.equal(
    words[2],
    "2 of 3 dated, the first Nov 2024 · 1 read once or seen with your own eyes, 2 not — what is not checked is drawn hollow.",
  );
  assert.equal(
    words[3],
    "the first saying is a consultancy's survey's, in their words.",
  );
  assert.match(
    words[4],
    /^between the first saying and what reached you, the claim gained '.+' and lost '.+'\.$/,
  );
  assert.equal(
    words[5],
    "you marked 1 hand as turning the wording; 1 turn noted.",
  );
  assert.equal(
    words[6],
    "as it reached you it leans on absolutes ×2 (always, everyone knows) · unnamed authority ×1 (data shows); it does not say where it got this and names no one.",
  );
  assert.match(words[7], /^of the hands, @officeguy leans hardest: /);
  assert.equal(
    words[8],
    "2 of 3 hands have what they gain named; 1 have what they run on; 0 have a record noted · 1 question put.",
  );
  assert.equal(words[9], "1 check named (1 more proposed): 1 made — 1 held.");
  assert.equal(words.length, 10);
  for (const w of words) {
    assert.doesNotMatch(
      w,
      /\b(true|false|credible|trustworthy|reliable|score)\b/i,
    );
  }
  assert.equal(
    readings(emptyProvenance(TODAY), TODAY)[0],
    "put the claim in your own words, as it reached you. then name the hands it came through — the last one first, if that is the one you remember.",
  );
});

test("the readings add the garden's evidence when a stone is bound", () => {
  const node = (
    id: string,
    kind: GardenNode["kind"],
    body = "",
  ): GardenNode => ({
    id,
    label: id,
    kind,
    description: "",
    body,
    file: null,
    modified: null,
    stage: "unknown",
    signed: null,
    degree: 0,
    source: "garden",
  });
  const nodes = new Map<string, GardenNode>([
    ["belief", node("belief", "garden")],
    [
      "r1",
      node(
        "r1",
        "reading",
        "see https://www.substack.com/p/x and https://nytimes.com/a",
      ),
    ],
    ["r2", node("r2", "reading", "https://substack.com/p/y")],
    ["f1", node("f1", "note")],
    ["g1", node("ghost:x", "ghost")],
  ]);
  const inputs = ["r1", "r2", "f1", "g1"].map((id) => ({
    id,
    threads: ["link" as const],
    date: null,
    dated: null,
  }));
  const ev = evidenceOf(nodes.get("belief")!, inputs, nodes);
  assert.equal(ev.n, 4);
  assert.equal(ev.read, 2);
  assert.equal(ev.own, 1);
  assert.equal(ev.unwritten, 1);
  assert.deepEqual(ev.hosts, [
    { host: "substack.com", n: 2 },
    { host: "nytimes.com", n: 1 },
  ]);
  const words = readings(prov(), TODAY, ev);
  assert.equal(
    words.at(-1),
    "in the garden, 4 stones flow into belief: 1 of your own writing, 2 things you read and 1 never written down · they name substack.com (2) and nytimes.com.",
  );
  assert.deepEqual(hostsIn(["no links here"]), []);
});

test("a provenance survives its file: serialise, parse, the same", () => {
  const p = prov();
  const back = parseProvenance(p.slug, serialiseProvenance(p));
  assert.deepEqual(back, p);
  // a hop's quote with a colon, a hash and quotes inside
  const tricky = prov({
    hops: [
      hop({
        id: "h9",
        who: 'a "friend": #1',
        said: 'He said: "it\'s #over" — really.\nTwo lines.',
      }),
    ],
  });
  assert.deepEqual(
    parseProvenance(tricky.slug, serialiseProvenance(tricky)).hops[0],
    tricky.hops[0],
  );
});

test("validation at the boundary: a claim or a hand is needed, proposals arrive hollow, caps hold", () => {
  assert.throws(
    () => validateProvenance({ title: "x" }, TODAY),
    /say the claim as it reached you, or name a hand/,
  );
  const v = validateProvenance(
    {
      claim: "Sugar is poison. Everyone knows.",
      hops: [
        {
          who: "a friend",
          channel: "nonsense",
          asked: [{ text: "who says?" }],
        },
      ],
      checks: [{ text: "find the dose", went: "held", on: "not a day" }],
      knowing: ["read", "read", "wrong"],
    },
    TODAY,
  );
  assert.equal(v.title, "Sugar is poison");
  assert.equal(v.slug, "2026-09-24-sugar-is-poison");
  assert.equal(v.recorded, TODAY);
  assert.deepEqual(v.knowing, ["read"]);
  assert.equal(v.hops[0].channel, "other");
  assert.equal(
    v.hops[0].asked[0].kept,
    false,
    "from the desk, kept must be said",
  );
  assert.equal(v.checks[0].on, null);
  assert.equal(v.checks[0].went, "held");
  assert.equal(titleOf({ title: "", claim: "" }), "a claim");
});

test("what the model sends is capped and pinned to hands that exist; adopting repeats nothing", () => {
  const p = prov();
  const raw = {
    checks: [
      { text: "find the survey and read the question as asked", how: "again" },
      {
        text: "ask the consultancy who commissioned it",
        how: "their press office",
      },
    ],
    questions: [
      { hop: "h2", text: "who paid for the survey?" },
      { hop: "h2", text: "did he link the survey or the paper?" },
      { hop: "nope", text: "dropped" },
    ],
    turns: [
      { hop: "h2", was: "first in line", became: "ALWAYS first" },
      { hop: "h1", was: "", became: "x" },
    ],
  };
  const pr = validateProposal(
    raw,
    p.hops.map((h) => h.id),
  );
  assert.equal(pr.questions.length, 2);
  assert.equal(pr.turns.length, 1);
  let n = 0;
  const next = adopt(p, pr, () => `p${++n}`);
  assert.equal(
    next.checks.length,
    3,
    "the check already named is not repeated",
  );
  assert.equal(next.checks[2].by, "proposed");
  assert.equal(next.checks[2].kept, false);
  const h2 = next.hops.find((h) => h.id === "h2")!;
  assert.equal(h2.asked.length, 2, "the question already put is not repeated");
  assert.equal(h2.asked[1].text, "did he link the survey or the paper?");
  assert.equal(h2.turns.length, 1);
  assert.equal(h2.turns[0].kept, false);
  assert.equal(proposedCount(next), 4);
  assert.equal(proposedCount(keepAll(next, true)), 0);
  assert.equal(keepAll(next, false).checks.length, 1);
  const ask = askQuestions(p, TODAY);
  assert.match(ask.system, /never say whether the claim is true or false/);
  assert.match(
    ask.user,
    /hand 2 \(id h2\): @officeguy · a post · x\.com · 2025-02/,
  );
  assert.deepEqual(
    (ask.schema.properties.questions.items.properties.hop as { enum: string[] })
      .enum,
    ["h1", "h2", "h3"],
  );
});
