import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aboutKey,
  byDay,
  dayOf,
  extOf,
  filterNotes,
  idOf,
  localIso,
  parseNote,
  readings,
  serialiseNote,
  tally,
  timeOf,
  validateNote,
  viewName,
  type Note,
} from "./margin.ts";
import { SPECIMEN_NOTES } from "../content/specimen-margin.ts";

const NOW = "2026-09-24T18:00:00+02:00";

test("a note's id and moment are the machine's own clock, day and minute read off them", () => {
  const d = new Date(2026, 8, 24, 21, 41, 8);
  assert.equal(idOf(d, "ab"), "20260924-214108-ab");
  const at = localIso(d);
  assert.ok(at.startsWith("2026-09-24T21:41:08"), at);
  assert.match(at, /[+-]\d\d:\d\d$/);
  assert.equal(dayOf(at), "2026-09-24");
  assert.equal(timeOf(at), "21:41");
  assert.equal(viewName("/alarm"), "alarm");
  assert.equal(viewName("/"), "garden");
  assert.equal(viewName("/elsewhere"), "elsewhere");
  assert.equal(extOf("audio/mp4"), "m4a");
  assert.equal(extOf("audio/webm;codecs=opus"), "webm");
  assert.equal(extOf(""), "webm");
});

test("a note is kept only with words, typed or spoken; the address stays inside its view", () => {
  const at = "2026-09-24T21:41:08+02:00";
  const n = validateNote(
    {
      view: "/alarm",
      url: "/alarm?id=the-open-plan-job",
      text: "  a thought  ",
      about: { kind: "pathway", id: "the-open-plan-job", label: " The open-plan job " },
      seconds: 12,
    },
    "20260924-214108-ab",
    at,
  );
  assert.equal(n.text, "a thought");
  assert.deepEqual(n.about, {
    kind: "pathway",
    id: "the-open-plan-job",
    label: "The open-plan job",
  });
  assert.equal(n.seconds, null, "seconds mean nothing without audio");
  assert.throws(
    () => validateNote({ view: "/alarm", text: "  " }, "20260924-214108-ab", at),
    /nothing to keep/,
  );
  const spoken = validateNote(
    {
      view: "/way",
      url: "/elsewhere?x=1",
      audio: "20260924-214108-ab.m4a",
      seconds: 7.26,
      about: { kind: "way", id: "" },
    },
    "20260924-214108-ab",
    at,
  );
  assert.equal(spoken.url, "/way");
  assert.equal(spoken.seconds, 7.3);
  assert.equal(spoken.about, null);
  const stray = validateNote(
    { view: "nowhere", text: "x" },
    "20260924-214108-ab",
    at,
  );
  assert.equal(stray.view, "/");
  assert.equal(stray.url, "/");
  assert.throws(
    () =>
      validateNote(
        { view: "/", audio: "../etc/passwd" },
        "20260924-214108-ab",
        at,
      ),
    /bad audio/,
  );
  assert.throws(() => validateNote({ text: "x" }, "no", at), /bad id/);
});

test("the file round-trips: frontmatter, the words, and what was said under its own heading", () => {
  const n: Note = {
    id: "20260924-214108-ab",
    at: "2026-09-24T21:41:08+02:00",
    view: "/chronology",
    url: "/chronology?id=x&stone=y",
    about: { kind: "entry", id: "x", label: 'Berlin: "a month", then more' },
    text: "First line.\n\nSecond paragraph, with a colon: here.",
    audio: "20260924-214108-ab.m4a",
    seconds: 41,
    said: "What I said.\n\nIn two parts.",
  };
  const raw = serialiseNote(n);
  assert.ok(raw.includes('label: "Berlin: \\"a month\\", then more"'));
  assert.ok(raw.includes("\n## said\n"));
  assert.deepEqual(parseNote(n.id, raw), n);
  const plain: Note = { ...n, audio: null, seconds: null, said: null, text: "Only words." };
  assert.deepEqual(parseNote(plain.id, serialiseNote(plain)), plain);
  const spokenOnly: Note = { ...n, text: "" };
  const rawSpoken = serialiseNote(spokenOnly);
  assert.ok(rawSpoken.endsWith("---\n\n## said\n\nWhat I said.\n\nIn two parts.\n"), rawSpoken);
  assert.deepEqual(parseNote(spokenOnly.id, rawSpoken), spokenOnly);
  assert.equal(aboutKey(n.about), "entry:x");
  assert.equal(aboutKey(null), null);
});

test("the margin can be read by view, by what it was about, by a word, and by day", () => {
  const all = SPECIMEN_NOTES;
  assert.equal(filterNotes(all, { view: "/alarm" }).length, 2);
  assert.equal(filterNotes(all, { about: "pathway:the-open-plan-job" }).length, 2);
  assert.equal(filterNotes(all, { q: "PIANO" }).length, 1, "the said words count");
  assert.equal(filterNotes(all, { q: "chronology" }).length, 1, "the view's name counts");
  assert.equal(filterNotes(all, { view: "/way", q: "sublet" }).length, 1);
  const days = byDay(all);
  assert.deepEqual(
    days.map((d) => [d.day, d.notes.length]),
    [
      ["2026-09-24", 1],
      ["2026-09-22", 1],
      ["2026-09-21", 1],
      ["2026-09-19", 2],
    ],
  );
});

test("the tally counts and the readings say what was counted, never how it went", () => {
  const t = tally(SPECIMEN_NOTES);
  assert.equal(t.total, 5);
  assert.equal(t.spoken, 2);
  assert.equal(t.written, 3);
  assert.equal(t.both, 0);
  assert.equal(t.unsaid, 1);
  assert.equal(t.days, 4);
  assert.equal(t.first, "2026-09-19T08:12:04+02:00");
  assert.equal(t.last, "2026-09-24T12:00:33+02:00");
  assert.deepEqual(
    t.byView.map((v) => [v.view, v.n]),
    [
      ["/alarm", 2],
      ["/", 1],
      ["/chronology", 1],
      ["/way", 1],
    ],
  );
  assert.equal(t.byAbout[0].about.label, "The open-plan job");
  assert.equal(t.byAbout[0].n, 2);
  const words = readings(t, NOW);
  assert.deepEqual(words, [
    "5 notes since 19 Sep: 2 spoken, 3 written.",
    "made on 4 days; the last 24 Sep at 12:00.",
    "most at the alarm (2), then the garden (1) and the chronology (1).",
    "most often about The open-plan job (2), then A year away, somewhere I can't drive (1).",
    "1 spoken note not yet written out.",
  ]);
  for (const w of words)
    assert.doesNotMatch(w, /should|score|risk|recommend|good|bad|better/i);
  assert.match(readings(tally([]), NOW)[0], /^nothing in the margin yet/);
  const one = tally([SPECIMEN_NOTES[1]]);
  assert.equal(readings(one, NOW)[1], "all on 22 Sep; the last at 07:18.");
  assert.equal(readings(one, "2027-01-01T00:00:00+01:00")[0], "1 note since 22 Sep 2026: 0 spoken, 1 written.");
});
