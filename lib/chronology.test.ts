import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LIFE,
  ageWords,
  dayAt,
  domainIdOf,
  formatDay,
  fromU,
  momentsOf,
  msAt,
  packRows,
  parseEntry,
  readings,
  relate,
  serialiseEntry,
  slugOf,
  spanWords,
  tally,
  ticksFor,
  timeOf,
  toU,
  validDay,
  validateEntry,
  validateLife,
  wholeOf,
  xOf,
  yearsWords,
  zoom,
  type Axis,
  type Entry,
  type Life,
} from "./chronology.ts";
import type { GardenNode } from "./garden.ts";

const TODAY = "2026-09-24";
const NOW = timeOf(TODAY, "mid");

const entry = (over: Partial<Entry>): Entry => ({
  slug: over.slug ?? slugOf(over.title ?? "x", over.day ?? "2020"),
  title: "x",
  day: "2020",
  until: null,
  lane: "work",
  looms: 2,
  again: null,
  why: null,
  tags: [],
  stones: [],
  recorded: TODAY,
  note: "",
  ...over,
});

const LIFE: Life = { ...DEFAULT_LIFE, born: "2001-05" };

test("days carry their precision, and a coarse day is a period", () => {
  assert.ok(validDay("2011"));
  assert.ok(validDay("2011-06"));
  assert.ok(validDay("2011-06-12"));
  assert.ok(!validDay("2011-13"));
  assert.ok(!validDay("2011-02-30"));
  assert.ok(!validDay("11"));
  assert.equal(formatDay("2011"), "c. 2011");
  assert.equal(formatDay("2011-06"), "Jun 2011");
  assert.equal(formatDay("2011-06-12"), "12 Jun 2011");
  assert.equal(timeOf("2011", "start"), Date.UTC(2011, 0, 1));
  assert.equal(timeOf("2011", "end"), Date.UTC(2012, 0, 1));
  assert.equal(
    timeOf("2011-06", "mid"),
    (Date.UTC(2011, 5, 1) + Date.UTC(2011, 6, 1)) / 2,
  );
  assert.equal(dayAt(timeOf("2011-06-12", "mid")), "2011-06-12");
  assert.equal(dayAt(timeOf("2011-06-12", "mid"), "month"), "2011-06");
  assert.equal(spanWords("2011", "2013"), "2011–2013");
  assert.equal(spanWords("2011-06", "now"), "Jun 2011 – now");
  assert.equal(
    spanWords("2011-06-12", "2012-03-03"),
    "12 Jun 2011 – 3 Mar 2012",
  );
});

test("durations and ages are said in words, never as a decimal", () => {
  assert.equal(yearsWords(0.01), "4 days");
  assert.equal(yearsWords(0.5), "6 months");
  assert.equal(yearsWords(1), "a year");
  assert.equal(yearsWords(2.26), "2 years and 3 months");
  assert.equal(ageWords(23.9), "age 23");
  assert.equal(ageWords(-0.4), "the year before you were born");
  assert.equal(ageWords(null), "");
});

test("both scales invert exactly, and proportional widens childhood", () => {
  const born = "2001-05-14";
  for (const scale of ["clock", "proportional"] as const) {
    const axis = { born, scale };
    for (const day of [
      "1998-02-01",
      "2001-05-14",
      "2008-09-09",
      "2026-09-24",
    ]) {
      const ms = timeOf(day, "mid");
      assert.ok(
        Math.abs(fromU(toU(ms, axis), axis) - ms) < 1000,
        `${scale} ${day}`,
      );
    }
    const view = {
      u0: toU(timeOf("1996"), axis),
      u1: toU(timeOf("2030"), axis),
    };
    const x = xOf(timeOf("2010-03-03"), view, axis, 100, 900);
    assert.ok(
      Math.abs(msAt(x, view, axis, 100, 900) - timeOf("2010-03-03")) < 1000,
    );
  }
  const clock = { born, scale: "clock" as const };
  const prop = { born, scale: "proportional" as const };
  const width = (axis: Axis, a: string, b: string) =>
    toU(timeOf(b), axis) - toU(timeOf(a), axis);
  // the first seven years take the same room as years 8 to 14 on the clock, and far more in proportion
  assert.ok(
    Math.abs(
      width(clock, "2001-05-14", "2008-05-14") -
        width(clock, "2008-05-14", "2015-05-14"),
    ) < 0.01,
  );
  assert.ok(
    width(prop, "2001-05-14", "2008-05-14") >
      2 * width(prop, "2008-05-14", "2015-05-14"),
  );
  // without a birth day, proportional falls back to clock
  assert.equal(
    toU(NOW, { born: null, scale: "proportional" }),
    toU(NOW, { born: null, scale: "clock" }),
  );
});

test("zoom stays inside the whole and never tighter than the minimum", () => {
  const whole = { u0: 0, u1: 100 };
  const v = zoom({ u0: 0, u1: 100 }, 50, 0.5, whole, 1);
  assert.deepEqual(v, { u0: 25, u1: 75 });
  const edge = zoom({ u0: 0, u1: 50 }, 5, 1.5, whole, 1);
  assert.equal(edge.u0, 0);
  assert.equal(edge.u1, 75);
  const out = zoom(v, 50, 10, whole, 1);
  assert.deepEqual(out, whole);
  const tight = zoom(v, 50, 0.0001, whole, 1);
  assert.ok(Math.abs(tight.u1 - tight.u0 - 1) < 1e-9);
});

test("ticks thin out as the window widens", () => {
  const decades = ticksFor(timeOf("1900"), timeOf("2026"));
  assert.ok(decades.filter((t) => t.label).every((t) => +t.label! % 10 === 0));
  const years = ticksFor(timeOf("2010"), timeOf("2020"));
  assert.equal(years.filter((t) => t.label).length, 10);
  const months = ticksFor(timeOf("2020-01", "start"), timeOf("2021-01", "end"));
  assert.ok(months.some((t) => t.label === "Apr"));
  assert.ok(months.some((t) => t.label === "2020"));
  const days = ticksFor(timeOf("2020-03-01", "start"), timeOf("2020-04-15", "end"));
  assert.ok(days.some((t) => t.label === "Mar 2020"));
  assert.ok(days.some((t) => t.label === "3"));
});

test("stretches pack into rows so overlapping ones never share a line", () => {
  const spans = [
    { s: 0, e: 20 },
    { s: 0, e: 38 },
    { s: 13, e: 16 },
    { s: 20, e: 24 },
    { s: 25, e: 30 },
  ];
  const rows = packRows(
    spans,
    (x) => x.s,
    (x) => x.e,
  );
  // the longest that starts first takes row 0; the other from 0 takes row 1; 13–16 needs a third; 20–24 and then 25–30 fit after 0–20
  assert.deepEqual(rows, [1, 0, 2, 1, 1]);
});

test("the tally counts inner, outer, circumstances and gaps, and finds the record's silences", () => {
  const es: Entry[] = [
    entry({
      title: "Moved cities",
      day: "2009-08",
      lane: "place",
      looms: 3,
      recorded: "2026-09-01",
    }),
    entry({ title: "Bangalore", day: "2024-08", until: "now", lane: "place" }),
    entry({
      title: "Stopped believing in plans",
      day: "2025-03-03",
      lane: "mind",
      again: "yes",
    }),
    entry({
      title: "Single-income household",
      day: "2001",
      until: "2021",
      lane: "structure",
    }),
    entry({
      title: "Feed era",
      day: "2012",
      until: "now",
      lane: "conjuncture",
    }),
    entry({ title: "Pandemic lockdown", day: "2020-03-24", lane: "happening" }),
    entry({ title: "Berlin", day: "2026-10-19", lane: "place" }),
    entry({
      title: "",
      day: "2003",
      until: "2006",
      lane: "gap",
      why: "no-record",
    }),
  ];
  const t = tally(es, LIFE, TODAY, TODAY);
  assert.equal(t.n, 8);
  assert.equal(t.inner, 1);
  assert.equal(t.outer, 3);
  assert.equal(t.world, 3);
  assert.equal(t.gaps, 1);
  assert.equal(t.spans, 4);
  assert.equal(t.expected, 1);
  assert.equal(t.late, 3);
  assert.equal(t.again.yes, 1);
  assert.equal(t.first, "2001");
  assert.equal(t.last, TODAY);
  assert.equal(t.longest?.title, "Bangalore");
  assert.deepEqual(t.live.structure, []);
  assert.deepEqual(t.live.conjuncture, ["Feed era"]);
  // 2009-09 to 2024-08 has nothing of the reader's own; 2001–2009 is partly a named gap but not wholly, so it counts too
  assert.ok(t.silent.some((s) => s.from === "2009-09" && s.to === "2024-08"));
  const words = readings(t, LIFE, TODAY, TODAY);
  assert.match(
    words[0],
    /^8 set down: 1 inner, 3 in the world, 3 of the circumstances, 1 gap named\.$/,
  );
  assert.match(
    words[1],
    /^from c\. 2001 to 24 Sep 2026 — 25 years(?: and \d+ months)? of record, from age 0\.$/,
  );
  assert.match(words[2], /^today, age 25: under Feed era\.$/);
  assert.ok(
    words.some((w) => /^the longest stretch set down is Bangalore — /.test(w)),
  );
  assert.ok(
    words.some((w) =>
      /^between Sep 2009 and Aug 2024 nothing is set down — 14 years/.test(w),
    ),
  );
  assert.ok(
    words.some(
      (w) => w === "1 set down ahead of today — expected, not happened.",
    ),
  );
  assert.ok(
    words.some(
      (w) => w === "3 were written down more than a year after they happened.",
    ),
  );
  assert.ok(
    words.some(
      (w) =>
        w === "asked whether you would have it again: 1 yes, 0 no, 0 unsure.",
    ),
  );
  for (const w of words)
    assert.doesNotMatch(w, /score|rank|best|worst|should|significant/i);
  // as of an earlier present, the live conditions and that year's entries change
  const then = tally(es, LIFE, "2009-10-01", TODAY);
  assert.deepEqual(then.live.structure, ["Single-income household"]);
  assert.equal(then.live.year[0]?.title, "Moved cities");
  assert.match(
    readings(then, LIFE, "2009-10-01", TODAY)[2],
    /^as of 1 Oct 2009, age 8: under Single-income household; that year Moved cities\.$/,
  );
});

test("relations are said plainly", () => {
  const a = entry({ title: "Panic attack", day: "2017-04-02" });
  const b = entry({
    title: "First job",
    day: "2011-09",
    until: "2018-02",
    lane: "work",
  });
  const c = entry({ title: "Quit", day: "2018-03-02" });
  assert.equal(relate(a, b, NOW), "during First job");
  assert.equal(relate(c, b, NOW), "right after First job ended");
  assert.equal(relate(b, a, NOW), "holds Panic attack");
  assert.match(relate(c, a, NOW), /^11 months after Panic attack$/);
  assert.match(relate(a, c, NOW), /^11 months before Quit$/);
  assert.equal(
    relate(a, entry({ title: "Same", day: "2017-04-02" }), NOW),
    "the same time as Same",
  );
});

test("the garden's notes speak in dates, and the extractor only listens", () => {
  const node = (id: string, body: string, modified: string): GardenNode => ({
    id,
    label: id,
    kind: "project",
    description: "",
    body,
    file: null,
    modified,
    stage: "fresh",
    signed: null,
    degree: 0,
    source: "memory",
  });
  const ms = momentsOf(
    [
      node(
        "a",
        "Sep 5 — the ledger. Built on 2026-09-17. Deadline Dec 15 2026. Trip completed Jul 28. Aug 31 verdict. Jan–Jun 2025 first job. 7 Sep BlueDot.\n```\n2020-01-01 in a fence is ignored\n```",
        "2026-09-20T10:00:00.000Z",
      ),
    ],
    TODAY,
  );
  const said = ms
    .filter((m) => m.how === "said")
    .map((m) => m.day)
    .sort();
  assert.deepEqual(said, [
    "2025-06",
    "2026-07-28",
    "2026-08-31",
    "2026-09-05",
    "2026-09-07",
    "2026-09-17",
    "2026-12-15",
  ]);
  assert.deepEqual(
    ms.filter((m) => m.how === "touched").map((m) => m.day),
    ["2026-09-20"],
  );
  // a bare month-day well ahead of the note's own change is read as the year before
  const back = momentsOf(
    [node("b", "Nov 30 was the deadline.", "2026-02-01T00:00:00.000Z")],
    TODAY,
  );
  assert.deepEqual(
    back.filter((m) => m.how === "said").map((m) => m.day),
    ["2025-11-30"],
  );
});

test("the file round-trips, and js-yaml's bare dates come back as strings", () => {
  const e = entry({
    slug: "2019-moved-to-bangalore",
    title: "Moved to Bangalore",
    day: "2019-08",
    until: "2026-09-21",
    lane: "place",
    looms: 3,
    again: "unsure",
    tags: ["move", "city"],
    stones: ["project_relocation_reset"],
    recorded: "2026-09-24",
    note: "Nobody asked me.\n\nOne day the house was boxes.",
  });
  const raw = serialiseEntry(e);
  assert.ok(raw.includes('day: "2019-08"'));
  assert.deepEqual(parseEntry(e.slug, raw), e);
  // a hand-written file with bare dates and a bare number
  const hand = parseEntry(
    "x",
    "---\ntitle: Piano\nday: 2019-06-12\nuntil: now\nlane: taste\nlooms: 1\nrecorded: 2026-09-24\n---\nbadly, happily\n",
  );
  assert.equal(hand.day, "2019-06-12");
  assert.equal(hand.until, "now");
  assert.equal(hand.looms, 1);
  assert.equal(hand.note, "badly, happily");
});

test("validation refuses what it must and fills what it may", () => {
  const v = validateEntry(
    { title: "  Moved  ", day: "2019-08", lane: "place" },
    TODAY,
  );
  assert.equal(v.title, "Moved");
  assert.equal(v.slug, "2019-moved");
  assert.equal(v.looms, 2);
  assert.equal(v.recorded, TODAY);
  assert.throws(
    () => validateEntry({ title: "", day: "2019", lane: "place" }, TODAY),
    /title/,
  );
  assert.throws(
    () => validateEntry({ title: "x", day: "19", lane: "place" }, TODAY),
    /when/,
  );
  assert.throws(
    () =>
      validateEntry(
        { title: "x", day: "2019", until: "2018", lane: "place" },
        TODAY,
      ),
    /before it began/,
  );
  assert.throws(
    () => validateEntry({ title: "x", day: "2019", lane: "Not A Lane" }, TODAY),
    /lane/,
  );
  assert.throws(
    () => validateEntry({ title: "x", day: "2019", lane: "gap" }, TODAY),
    /gap is a stretch/,
  );
  const g = validateEntry(
    { title: "", day: "1999", until: "2001", lane: "gap" },
    TODAY,
  );
  assert.equal(g.why, "no-record");
  assert.equal(
    slugOf("Père — Noël! 2019", "2019-12-24"),
    "2019-pere-noel-2019",
  );
  assert.equal(
    slugOf("Père — Noël! 2019", "2019-12-24"),
    slugOf("Père — Noël! 2019", "2019-12"),
  );
});

test("the life validates its lanes and keeps the layers reserved", () => {
  const l = validateLife({
    born: "2001",
    scale: "proportional",
    domains: [
      { id: "Mind", label: "Mind", register: "inner" },
      { id: "work", label: "" },
    ],
  });
  assert.equal(l.born, "2001");
  assert.equal(l.scale, "proportional");
  assert.deepEqual(l.domains, [
    { id: "mind", label: "Mind", register: "inner" },
    { id: "work", label: "work", register: "outer" },
  ]);
  assert.throws(
    () => validateLife({ domains: [{ id: "gap", label: "Gap" }] }),
    /bad lane/,
  );
  assert.throws(
    () =>
      validateLife({
        domains: [
          { id: "a", label: "A" },
          { id: "a", label: "B" },
        ],
      }),
    /two lanes/,
  );
  assert.throws(
    () =>
      validateLife({ born: "yesterday", domains: [{ id: "a", label: "A" }] }),
    /born/,
  );
  assert.equal(domainIdOf("Gap", new Set()), "gap-lane");
  assert.equal(domainIdOf("Work", new Set(["work"])), "work-2");
  assert.equal(domainIdOf("2nd city", new Set()), "lane-2nd-city");
});

test("the whole of the line runs from birth to the horizon", () => {
  const [t0, t1] = wholeOf([], { ...LIFE, horizon: "2030" }, NOW);
  assert.ok(t0 < timeOf("2001-05", "start") && t0 > timeOf("1999"));
  assert.ok(t1 > timeOf("2030", "end"));
  const [e0, e1] = wholeOf([], DEFAULT_LIFE, NOW);
  assert.ok(e1 - e0 > 30 * 365 * 86_400_000);
});
