import assert from "node:assert/strict";
import { test } from "node:test";
import { DEBRIEF, FRAME, POOLS, SOURCES, STUDIES } from "../content/slice.ts";
import {
  DESIGN,
  DOOR_KINDS,
  MOMENTS,
  N,
  PER_TEAM,
  SHOWN,
  TEAMS,
  TURNS,
  WOBBLES,
  deal,
  dirOf,
  facts,
  isSure,
  luckBand,
  momentsLean,
  readings,
  rng,
  tally,
  type Call,
  type Calls,
  type Person,
} from "./slice.ts";

const SEEDS = [1, 2, 3, 7, 42, 99, 1234, 20260930];
const dealt = (seed: number) => deal(POOLS, rng(seed));

test("a deal is sixteen people, eight to a team, eight of them doing well", () => {
  for (const seed of SEEDS) {
    const d = dealt(seed);
    assert.equal(d.length, N);
    assert.deepEqual(
      d.map((p) => p.n),
      Array.from({ length: N }, (_, i) => i + 1),
    );
    for (const team of TEAMS)
      assert.equal(d.filter((p) => p.team === team).length, PER_TEAM);
    assert.equal(d.filter((p) => p.year === 1).length, N / 2);
  }
});

test("the design holds in every deal: the moments six of eight on each team, the first second six on Ash and four on Birch", () => {
  for (const seed of SEEDS) {
    const f = facts(dealt(seed));
    assert.equal(f.Ash.momentsMatched, 6);
    assert.equal(f.Birch.momentsMatched, 6);
    assert.equal(f.Ash.doorMatched, 6);
    assert.equal(f.Birch.doorMatched, 4);
    for (const team of TEAMS) {
      assert.equal(f[team].conflictN, 4);
      assert.equal(f[team].conflictYearWithMoments, DESIGN[team].conflict);
      assert.equal(
        f[team].conflictYearWithDoor,
        f[team].conflictN - DESIGN[team].conflict,
      );
    }
  }
});

test("each person has six moments that never tie at one, three or six, and lean the way the six do", () => {
  for (const seed of SEEDS)
    for (const p of dealt(seed)) {
      assert.equal(p.moments.length, MOMENTS);
      for (const k of SHOWN) {
        const sum = p.moments.slice(0, k).reduce((a, m) => a + m.dir, 0);
        assert.notEqual(sum, 0, `person ${p.n} at ${k}`);
      }
      assert.equal(momentsLean(p, MOMENTS), p.lean);
      assert.equal(momentsLean(p, 3), p.lean);
      assert.equal(new Set(p.moments.map((m) => m.text)).size, MOMENTS);
    }
});

test("two people begin against how they go on, five have one moment against the rest, and the year goes with how a turned person goes on", () => {
  for (const seed of SEEDS) {
    const d = dealt(seed);
    const turned = d.filter((p) => p.turn);
    const wobbled = d.filter((p) => p.wobble !== null);
    assert.equal(turned.length, TURNS);
    assert.equal(wobbled.length, WOBBLES);
    for (const p of turned) {
      assert.equal(p.moments[0].dir, -p.lean);
      assert.ok(p.moments.slice(1).every((m) => m.dir === p.lean));
      assert.equal(p.year, p.lean);
      assert.equal(p.wobble, null);
    }
    for (const p of wobbled) {
      assert.ok(p.wobble! >= 1 && p.wobble! < MOMENTS);
      assert.equal(p.moments[p.wobble!].dir, -p.lean);
      assert.equal(p.moments.filter((m) => m.dir !== p.lean).length, 1);
    }
    for (const p of d.filter((p) => !p.turn && p.wobble === null))
      assert.ok(p.moments.every((m) => m.dir === p.lean));
  }
});

test("the words come from the right pole, and every kind of first second is met three or four times", () => {
  const inDoor = new Set(DOOR_KINDS.flatMap((k) => POOLS.door[k].in));
  const outDoor = new Set(DOOR_KINDS.flatMap((k) => POOLS.door[k].out));
  const inMoment = new Set(POOLS.moment.in);
  const outMoment = new Set(POOLS.moment.out);
  for (const seed of SEEDS) {
    const d = dealt(seed);
    for (const p of d) {
      assert.ok(
        (p.door.dir === 1 ? inDoor : outDoor).has(p.door.text),
        p.door.text,
      );
      assert.ok(
        POOLS.door[p.kind][p.door.dir === 1 ? "in" : "out"].includes(
          p.door.text,
        ),
      );
      for (const m of p.moments)
        assert.ok((m.dir === 1 ? inMoment : outMoment).has(m.text), m.text);
    }
    for (const k of DOOR_KINDS) {
      const c = d.filter((p) => p.kind === k).length;
      assert.ok(c === 3 || c === 4, `${k} ${c}`);
    }
  }
  assert.ok(POOLS.moment.in.length >= MOMENTS);
  assert.ok(POOLS.moment.out.length >= MOMENTS);
  const all = [...inDoor, ...outDoor, ...inMoment, ...outMoment];
  assert.equal(new Set(all).size, all.length);
});

test("the first second is not readable off the order: any position holds either team and either pole", () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    const first = dealt(seed)[0];
    seen.add(`${first.team}${first.door.dir}${first.door.dir === first.lean}`);
  }
  assert.ok(seen.size >= 6, [...seen].join(" "));
});

test("the same seed deals the same sixteen, another seed does not", () => {
  assert.deepEqual(dealt(7), dealt(7));
  assert.notDeepEqual(dealt(7), dealt(8));
});

test("luck: sixteen coin flips land between 5 and 11 in 92 of a hundred, eight between 2 and 6", () => {
  const b = luckBand(16);
  assert.equal(b.lo, 5);
  assert.equal(b.hi, 11);
  assert.ok(Math.abs(b.cover - 0.9231) < 0.001, String(b.cover));
  const t = luckBand(8);
  assert.equal(t.lo, 2);
  assert.equal(t.hi, 6);
  assert.ok(Math.abs(t.cover - 0.9297) < 0.001, String(t.cover));
});

/** A reader who makes the same call rule at every slice. */
function reader(d: Person[], rule: (p: Person, seen: number) => Call): Calls {
  return d.map((p) => SHOWN.map((k) => rule(p, k)) as [Call, Call, Call]);
}
const sureOf = (dir: 1 | -1): Call => (dir === 1 ? 1 : 4);
const leanOf = (dir: 1 | -1): Call => (dir === 1 ? 2 : 3);

test("a reader who only goes by the first second matches the year as often as the first second did, at every call", () => {
  for (const seed of SEEDS) {
    const d = dealt(seed);
    const t = tally(
      d,
      reader(d, (p) => sureOf(p.door.dir)),
    );
    assert.equal(t.doorMatched, 10);
    assert.deepEqual(t.matched, [10, 10, 10]);
    assert.deepEqual(t.sure, [16, 16, 16]);
    assert.deepEqual(t.conflict.withDoor, [8, 8, 8]);
    assert.equal(t.conflict.n, 8);
    assert.equal(t.conflict.yearWithDoor, 3);
    assert.equal(t.conflict.yearWithMoments, 5);
  }
});

test("a reader who only goes by the moments so far matches what the tally says the moments did", () => {
  for (const seed of SEEDS) {
    const d = dealt(seed);
    const t = tally(
      d,
      reader(d, (p, k) => leanOf(momentsLean(p, k))),
    );
    assert.deepEqual(t.matched, t.momentsMatched);
    assert.deepEqual(t.sure, [0, 0, 0]);
    // the six come to the year for twelve of sixteen; the three do too; the one for twelve less those turned
    assert.equal(t.momentsMatched[2], 12);
    assert.equal(t.momentsMatched[1], 12);
    assert.equal(t.momentsMatched[0], 12 - TURNS);
    // at one moment a turned person's first moment can share the first second's pole
    const turnedInConflict = d.filter(
      (p) => p.turn && p.door.dir !== p.lean,
    ).length;
    assert.equal(t.conflict.withDoor[0], turnedInConflict);
    assert.equal(t.conflict.withDoor[1], 0);
    assert.equal(t.conflict.withDoor[2], 0);
  }
});

test("sure counts are ones and fours, and sure-against counts the ones that missed", () => {
  const d = dealt(5);
  const calls: Calls = d.map((p) => [
    sureOf(p.year),
    sureOf(p.year === 1 ? -1 : 1),
    leanOf(p.year),
  ]);
  const t = tally(d, calls);
  assert.deepEqual(t.matched, [16, 0, 16]);
  assert.deepEqual(t.sure, [16, 16, 0]);
  assert.deepEqual(t.sureAgainst, [0, 16, 0]);
  assert.equal(dirOf(2), 1);
  assert.equal(dirOf(3), -1);
  assert.ok(isSure(1) && isSure(4) && !isSure(2) && !isSure(3));
});

test("team tallies add up to the whole", () => {
  const d = dealt(11);
  const calls = reader(d, (p, k) =>
    k === 1 ? sureOf(p.door.dir) : leanOf(p.lean),
  );
  const t = tally(d, calls);
  for (const s of [0, 1, 2] as const) {
    assert.equal(
      t.teams.Ash.matched[s] + t.teams.Birch.matched[s],
      t.matched[s],
    );
    assert.equal(t.teams.Ash.sure[s] + t.teams.Birch.sure[s], t.sure[s]);
    assert.equal(
      t.teams.Ash.conflictWithDoor[s] + t.teams.Birch.conflictWithDoor[s],
      t.conflict.withDoor[s],
    );
  }
});

test("no reading, and no line of the sheet, grades the reader", () => {
  const verdict =
    /\b(fooled|gullible|naive|should|wrong|mistake|mistakes|failed|stupid|biased|good|bad|tricked|right|correct|accurate|worse|better|blind|lucky|unlucky)\b/i;
  const rules: ((p: Person, k: number) => Call)[] = [
    (p) => sureOf(p.door.dir),
    (p, k) => leanOf(momentsLean(p, k)),
    (p) => sureOf(p.year),
    (p) => sureOf(p.year === 1 ? -1 : 1),
    (p, k) => (k === 1 ? sureOf(p.door.dir) : leanOf(p.lean)),
  ];
  for (const seed of SEEDS.slice(0, 3))
    for (const rule of rules) {
      const d = dealt(seed);
      for (const r of readings(tally(d, reader(d, rule))))
        assert.doesNotMatch(r, verdict, r);
    }
  const lines = [
    FRAME.tagline,
    FRAME.title,
    ...FRAME.lede,
    ...FRAME.slices.flatMap((s) => [s.name, s.does]),
    DEBRIEF.called.lede,
    DEBRIEF.conflict.lede,
    DEBRIEF.teams.lede,
    ...DEBRIEF.limits.body,
    ...STUDIES.flatMap((s) => [s.head]),
  ];
  for (const l of lines) assert.doesNotMatch(l, verdict, l);
});

test("every study points at sources that exist, and every source has a DOI", () => {
  const ids = new Set(SOURCES.map((s) => s.id));
  for (const s of STUDIES)
    for (const id of s.sources) assert.ok(ids.has(id), id);
  for (const s of SOURCES) assert.match(s.doi, /^10\.\d{4,9}\/\S+$/);
  assert.equal(new Set(SOURCES.map((s) => s.doi)).size, SOURCES.length);
});
