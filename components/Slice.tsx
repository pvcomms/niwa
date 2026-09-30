"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  CALL_NAMES,
  DEBRIEF,
  DOOR_NAME,
  FRAME,
  POOLS,
  SOURCES,
  STUDIES,
  YEAR_WORDS,
} from "@/content/slice";
import {
  DOOR_KINDS,
  MOMENTS,
  N,
  PER_TEAM,
  SHOWN,
  SLICE_IDS,
  TEAMS,
  TURNS,
  WOBBLES,
  deal,
  dirOf,
  facts,
  per100,
  readings,
  rng,
  tally,
  three,
  type Band,
  type Call,
  type Calls,
  type Person,
  type Tally,
} from "@/lib/slice";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const lede = "mt-3 max-w-[38rem] text-[15.5px] leading-[1.7]";
const para = "mt-4 max-w-[40rem] text-[15.5px] leading-[1.7]";
const h3 = "display mt-10 text-[24px] leading-[1.15]";
const pad = (n: number) => String(n).padStart(2, "0");
const sliceName = (k: number) => (k === 1 ? "1 moment" : `${k} moments`);

type Phase = "frame" | "play" | "debrief";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="meta" style={{ color: "var(--accent)" }}>
      {children}
    </div>
  );
}

function Pips({ n, done }: { n: number; done: number }) {
  return (
    <span className="sl-pips" aria-hidden>
      {Array.from({ length: n }, (_, k) => (
        <i
          key={k}
          className={
            k < done ? "sl-pip-on" : k === done ? "sl-pip-now" : undefined
          }
        />
      ))}
    </span>
  );
}

/** Seven cells, the first second and the six moments: what has been met so far. */
function Strip({ seen }: { seen: number }) {
  return (
    <div className="sl-strip" aria-hidden>
      <i className="sl-cell sl-cell-door" />
      {Array.from({ length: MOMENTS }, (_, k) => (
        <i
          key={k}
          className={k < seen ? "sl-cell sl-cell-on" : "sl-cell sl-cell-off"}
        />
      ))}
    </div>
  );
}

type BarRow = {
  label: string;
  value: number;
  /** Part of the value drawn apart, in the against colour. */
  against?: number;
  marks?: { at: number; kind: "moments" | "door"; label: string }[];
};

/** Counts as bars on one scale, with what a coin does behind them. */
function Bars({
  rows,
  max,
  band,
  unit,
}: {
  rows: BarRow[];
  max: number;
  band?: Band;
  unit: string;
}) {
  const at = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className="sl-bars">
      {rows.map((r) => {
        const held = r.value - (r.against ?? 0);
        const text = `${r.label}: ${r.value} of ${max}${
          r.against ? `, ${r.against} of them against the year` : ""
        }${r.marks?.map((m) => `; ${m.label} ${m.at}`).join("") ?? ""}`;
        return (
          <div className="sl-row" key={r.label}>
            <span className="sl-rl">{r.label}</span>
            <span className="sl-track" role="img" aria-label={text}>
              {band && (
                <i
                  className="sl-band"
                  style={{
                    left: at(band.lo),
                    width: `${((band.hi - band.lo) / max) * 100}%`,
                  }}
                />
              )}
              <i className="sl-fill" style={{ width: at(held) }} />
              {!!r.against && (
                <i
                  className="sl-against"
                  style={{ left: at(held), width: at(r.against) }}
                />
              )}
              {r.marks?.map((m) => (
                <i
                  key={m.kind}
                  className={`sl-mark sl-mark-${m.kind}`}
                  style={{ left: at(m.at) }}
                />
              ))}
            </span>
            <span className="sl-rv">
              {r.value}
              <small> {unit}</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** One circle per call: whose way it went, and whether it was sure. */
function Dot({ c, p }: { c: Call; p: Person }) {
  const with_ =
    dirOf(c) === p.door.dir ? "door" : dirOf(c) === p.lean ? "moments" : "";
  const sure = c === 1 || c === 4;
  return (
    <i
      className={`sl-dot sl-dot-${with_}${sure ? " sl-dot-sure" : ""}`}
      title={CALL_NAMES[c - 1].name}
    >
      <span className="sr-only">{CALL_NAMES[c - 1].name}</span>
    </i>
  );
}

export default function Slice() {
  const [theme, setTheme] = useTheme();
  const [phase, setPhase] = useState<Phase>("frame");
  const [people, setPeople] = useState<Person[]>([]);
  const [i, setI] = useState(0);
  const [calls, setCalls] = useState<Call[][]>([]);
  const [pressed, setPressed] = useState<Call | null>(null);
  const [reduced, setReduced] = useState(false);
  const busy = useRef(false);
  const card = useRef<HTMLElement>(null);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const fresh = () => deal(POOLS, rng((Math.random() * 2 ** 32) >>> 0));

  const top = () =>
    document
      .getElementById("sl-top")
      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });

  const begin = () => {
    setPeople(fresh());
    setI(0);
    setCalls([]);
    setPhase("play");
    top();
  };

  const asked = calls[i]?.length ?? 0;
  const revealed = asked === 3;
  const p = people[i];

  const pick = (c: Call) => {
    if (phase !== "play" || busy.current || asked >= 3) return;
    busy.current = true;
    setPressed(c);
    setTimeout(
      () => {
        busy.current = false;
        setPressed(null);
        setCalls((cs) => {
          const next = cs.slice();
          next[i] = [...(next[i] ?? []), c];
          return next;
        });
      },
      reduced ? 60 : 200,
    );
  };

  const next = () => {
    if (phase !== "play" || !revealed) return;
    if (i + 1 < N) {
      setI(i + 1);
      requestAnimationFrame(() =>
        card.current?.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        }),
      );
    } else {
      setPhase("debrief");
      top();
    }
  };

  const again = () => {
    setPeople(fresh());
    setI(0);
    setCalls([]);
    setPhase("play");
    top();
  };

  const keys = useRef({ pick, next });
  keys.current = { pick, next };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const v = Number(e.key);
      if (v >= 1 && v <= 4) keys.current.pick(v as Call);
      else if (e.key === "Enter" && t?.tagName !== "BUTTON")
        keys.current.next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const t =
    phase === "debrief" ? tally(people, calls as unknown as Calls) : null;

  return (
    <main className="sl scroll-thin relative h-dvh w-full overflow-y-auto">
      <div id="sl-top" className="mx-auto max-w-[80rem] px-5 pb-24 sm:px-10">
        <header className="rise flex flex-wrap items-start justify-between gap-4 pt-6 sm:pt-8">
          <div className="flex items-baseline gap-3">
            <h1
              className="display text-[40px] leading-none"
              style={{ color: "var(--ink)" }}
            >
              niwa
            </h1>
            <div>
              <div className="meta" style={{ color: "var(--accent)" }}>
                slice
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                {FRAME.tagline}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/slice" />
            <button
              onClick={() => setTheme(theme === "paper" ? "sumi" : "paper")}
              className="chip px-2.5 py-1.5 text-[10px] tracking-[0.14em] uppercase"
              style={{ ...mono, color: "var(--muted)" }}
              aria-label="Toggle theme"
            >
              {theme === "paper" ? "sumi" : "paper"}
            </button>
          </div>
        </header>

        {phase === "frame" && (
          <section
            className="panel sketched rise relative mt-6 p-5 sm:p-8"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="The sitting"
          >
            <Sketch seed="slice-frame" draw />
            <Label>the slice</Label>
            <p
              className="display mt-4 max-w-[40rem] text-[25px] leading-[1.22] sm:text-[30px]"
              style={{ color: "var(--ink)" }}
            >
              {FRAME.title}
            </p>
            {FRAME.lede.map((l) => (
              <p key={l} className={lede} style={{ color: "var(--muted)" }}>
                {l}
              </p>
            ))}
            <p className={lede} style={{ color: "var(--muted)" }}>
              {FRAME.door}
            </p>
            <ol className="sl-protocol mt-6">
              {FRAME.slices.map((s, k) => (
                <li key={s.name}>
                  <span className="sl-code" aria-hidden>
                    {k + 1}
                  </span>
                  <span>
                    <b className="font-medium" style={{ color: "var(--ink)" }}>
                      {s.name}
                    </b>
                    <span
                      className="block text-[13.5px] leading-[1.45]"
                      style={{ color: "var(--muted)" }}
                    >
                      {s.does}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                className={chip}
                onClick={begin}
                style={{
                  ...mono,
                  color: "var(--accent)",
                  borderColor: "var(--accent)",
                }}
              >
                {FRAME.begin}
              </button>
              <span className="sl-hint">
                keys 1 · 2 · 3 · 4 call, enter goes on
              </span>
            </div>
          </section>
        )}

        {phase === "play" && p && (
          <section
            ref={card}
            className="panel sketched relative mt-6 scroll-mt-6 p-5 sm:p-8"
            style={{ borderRadius: 3 }}
            aria-labelledby="sl-person"
          >
            <Sketch seed={`slice-card-${p.n}`} draw />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <Label>
                  № {pad(p.n)} of {N}
                </Label>
              </div>
              <Pips n={N} done={i} />
            </div>
            <h2
              id="sl-person"
              className="display mt-4 text-[30px] leading-[1.08] sm:text-[36px]"
              style={{ color: "var(--ink)" }}
            >
              Starts on {p.team}
            </h2>
            <Strip seen={SHOWN[Math.min(asked, 2)]} />
            <dl className="sl-lines">
              <div className="sl-line sl-line-door" key={`door-${p.n}`}>
                <dt>{FRAME.first}</dt>
                <dd>{p.door.text}</dd>
              </div>
              {p.moments.map((m, k) => {
                const shown = SHOWN[Math.min(asked, 2)];
                const prev = asked > 0 ? SHOWN[Math.min(asked, 2) - 1] : 0;
                const seen = k < shown;
                return seen ? (
                  <div
                    className="sl-line sl-line-moment sl-in"
                    key={`${p.n}-${k}-s`}
                    style={{
                      animationDelay: `${Math.max(0, k - prev) * 90}ms`,
                    }}
                  >
                    <dt>moment {k + 1}</dt>
                    <dd>{m.text}</dd>
                  </div>
                ) : (
                  <div
                    className="sl-line sl-line-hidden"
                    key={`${p.n}-${k}-h`}
                    aria-hidden
                  >
                    <dt>moment {k + 1}</dt>
                    <dd>{FRAME.hidden}</dd>
                  </div>
                );
              })}
            </dl>

            {!revealed && (
              <div className="sl-ask">
                {asked > 0 && (
                  <ul className="sl-was">
                    {calls[i].map((c, k) => (
                      <li key={k}>
                        at {sliceName(SHOWN[k])}:{" "}
                        <b>{CALL_NAMES[c - 1].name}</b>
                      </li>
                    ))}
                  </ul>
                )}
                <p
                  className="text-[15.5px] leading-[1.5]"
                  style={{ color: "var(--ink)" }}
                >
                  {FRAME.ask}
                </p>
                <div className="sl-bubbles" role="group" aria-label={FRAME.ask}>
                  {CALL_NAMES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className="sl-bub"
                      aria-pressed={pressed === c.key}
                      aria-label={`${c.key}, ${c.name}`}
                      onClick={() => pick(c.key)}
                    >
                      <i>{c.key}</i>
                      <small>{c.name}</small>
                    </button>
                  ))}
                </div>
                <p className="sl-hint mt-3">
                  call {asked + 1} of 3 · {sliceName(SHOWN[asked])} met
                </p>
              </div>
            )}

            {revealed && (
              <div className="sl-ask sl-in" aria-live="polite">
                <p
                  className="display text-[26px] leading-[1.15]"
                  style={{ color: "var(--ink)" }}
                >
                  {YEAR_WORDS[p.year === 1 ? "in" : "out"]}
                </p>
                <ul className="sl-recall">
                  {calls[i].map((c, k) => {
                    const hit = dirOf(c) === p.year;
                    return (
                      <li key={k}>
                        <span className="sl-hint">
                          at {sliceName(SHOWN[k])}
                        </span>
                        <b>{CALL_NAMES[c - 1].name}</b>
                        <span
                          style={{ color: hit ? "var(--ink)" : "var(--muted)" }}
                        >
                          {hit ? "matched the year" : "went against the year"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    className={chip}
                    onClick={next}
                    style={{
                      ...mono,
                      color: "var(--accent)",
                      borderColor: "var(--accent)",
                    }}
                  >
                    {i + 1 < N ? FRAME.next : FRAME.finish}
                  </button>
                  <span className="sl-hint">enter</span>
                </div>
              </div>
            )}
          </section>
        )}

        {phase === "debrief" && t && (
          <Debrief t={t} people={people} calls={calls} again={again} />
        )}
      </div>
    </main>
  );
}

function Debrief({
  t,
  people,
  calls,
  again,
}: {
  t: Tally;
  people: Person[];
  calls: Call[][];
  again: () => void;
}) {
  const r = readings(t);
  const f = facts(people);
  const conflict = people.filter((p) => p.door.dir !== p.lean);
  const cite = (ids: string[]) =>
    ids.map((id) => SOURCES.findIndex((s) => s.id === id) + 1);
  const turned = people
    .filter((p) => p.turn)
    .map((p) => `№ ${pad(p.n)}`)
    .join(" and ");

  const called: BarRow[] = SLICE_IDS.map((s) => ({
    label: sliceName(SHOWN[s]),
    value: t.matched[s],
    marks: [
      { at: t.momentsMatched[s], kind: "moments", label: "the moments only" },
      { at: t.doorMatched, kind: "door", label: "the first second only" },
    ],
  }));
  const sure: BarRow[] = SLICE_IDS.map((s) => ({
    label: sliceName(SHOWN[s]),
    value: t.sure[s],
    against: t.sureAgainst[s],
  }));

  return (
    <>
      <section
        className="panel sketched rise relative mt-6 p-5 sm:p-8"
        style={{ borderRadius: 3 }}
        aria-labelledby="sl-called"
      >
        <Sketch seed="slice-called" draw />
        <Label>the debrief</Label>
        <h2
          id="sl-called"
          className="display mt-4 text-[30px] leading-[1.08] sm:text-[36px]"
          style={{ color: "var(--ink)" }}
        >
          {DEBRIEF.called.title}
        </h2>
        <p className={lede} style={{ color: "var(--muted)" }}>
          {DEBRIEF.called.lede}
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <div className="meta" style={{ color: "var(--muted)" }}>
              calls that matched the year
            </div>
            <Bars rows={called} max={t.n} band={t.band} unit="of 16" />
            <div className="sl-legend">
              <span>
                <i className="sl-key sl-key-fill" /> your calls
              </span>
              <span>
                <i className="sl-key sl-key-band" /> a coin: {t.band.lo} to{" "}
                {t.band.hi}
              </span>
              <span>
                <i className="sl-key sl-key-moments" /> only the moments so far
              </span>
              <span>
                <i className="sl-key sl-key-door" /> only the first second
              </span>
            </div>
            <p className="sl-read">{r[0]}</p>
            <p className="sl-read">{r[3]}</p>
          </div>
          <div>
            <div className="meta" style={{ color: "var(--muted)" }}>
              calls you were sure of
            </div>
            <Bars rows={sure} max={t.n} unit="of 16" />
            <div className="sl-legend">
              <span>
                <i className="sl-key sl-key-fill" /> sure, and it matched
              </span>
              <span>
                <i className="sl-key sl-key-against" /> sure, and it went
                against the year
              </span>
            </div>
            <p className="sl-read">{r[1]}</p>
            <p className="sl-read">{r[2]}</p>
          </div>
        </div>
      </section>

      <section
        className="panel sketched rise relative mt-6 p-5 sm:p-8"
        style={{ borderRadius: 3 }}
        aria-labelledby="sl-conflict"
      >
        <Sketch seed="slice-conflict" draw />
        <h2
          id="sl-conflict"
          className="display text-[26px] leading-[1.12] sm:text-[30px]"
          style={{ color: "var(--ink)" }}
        >
          {DEBRIEF.conflict.title}
        </h2>
        <p className={lede} style={{ color: "var(--muted)" }}>
          {DEBRIEF.conflict.lede}
        </p>
        <div className="sl-legend mt-4">
          <span>
            <i className="sl-dot sl-dot-door sl-dot-sure" /> with the first
            second
          </span>
          <span>
            <i className="sl-dot sl-dot-moments sl-dot-sure" /> with the moments
          </span>
          <span>solid is sure, pale is lean</span>
        </div>
        <ul className="sl-conflict">
          {conflict.map((p) => (
            <ConflictRow key={p.n} p={p} calls={calls[p.n - 1]} />
          ))}
        </ul>
        <p className="sl-read">{r[4]}</p>
      </section>

      <section
        className="panel sketched rise relative mt-6 p-5 sm:p-8"
        style={{ borderRadius: 3 }}
        aria-labelledby="sl-teams"
      >
        <Sketch seed="slice-teams" draw />
        <h2
          id="sl-teams"
          className="display text-[26px] leading-[1.12] sm:text-[30px]"
          style={{ color: "var(--ink)" }}
        >
          {DEBRIEF.teams.title}
        </h2>
        <p className={lede} style={{ color: "var(--muted)" }}>
          {DEBRIEF.teams.lede}
        </p>
        <div className="sl-table-wrap mt-5">
          <table className="sl-table">
            <thead>
              <tr>
                <th scope="col" />
                {TEAMS.map((tm) => (
                  <th scope="col" key={tm}>
                    {tm}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TeamRow
                label="the first second matched the year"
                cells={TEAMS.map((tm) => `${f[tm].doorMatched} of ${f[tm].n}`)}
                note={`a coin: ${t.teamBand.lo} to ${t.teamBand.hi}`}
              />
              <TeamRow
                label="the six moments matched the year"
                cells={TEAMS.map(
                  (tm) => `${f[tm].momentsMatched} of ${f[tm].n}`,
                )}
              />
              <TeamRow
                label="your calls matched, at 1 · 3 · 6 moments"
                cells={TEAMS.map((tm) => t.teams[tm].matched.join(" · "))}
                note={`of ${PER_TEAM}`}
              />
              <TeamRow
                label="you were sure, at 1 · 3 · 6"
                cells={TEAMS.map((tm) => t.teams[tm].sure.join(" · "))}
                note={`of ${PER_TEAM}`}
              />
              <TeamRow
                label="your calls went with the first second where it pointed away, at 1 · 3 · 6"
                cells={TEAMS.map((tm) =>
                  t.teams[tm].conflictWithDoor.join(" · "),
                )}
                note={`of ${f.Ash.conflictN}`}
              />
            </tbody>
          </table>
        </div>
        <p className="sl-read">{r[5]}</p>
        <p className="sl-read">{r[6]}</p>
      </section>

      <section
        className="panel sketched rise relative mt-6 p-5 sm:p-8"
        style={{ borderRadius: 3 }}
        aria-labelledby="sl-deal"
      >
        <Sketch seed="slice-deal" draw />
        <h2
          id="sl-deal"
          className="display text-[26px] leading-[1.12] sm:text-[30px]"
          style={{ color: "var(--ink)" }}
        >
          {DEBRIEF.deal.title}
        </h2>
        <p className={para} style={{ color: "var(--muted)" }}>
          Each team was dealt {PER_TEAM} people, and {t.n / 2} of the {t.n} were
          doing well a year on. On every team {f.Ash.conflictN} came in with a
          first second that pointed away from where their six moments came to.
          The six moments matched the year for {f.Ash.momentsMatched} of{" "}
          {f.Ash.n} on Ash and {f.Birch.momentsMatched} of {f.Birch.n} on Birch.
          The first second matched it for {f.Ash.doorMatched} on Ash and{" "}
          {f.Birch.doorMatched} on Birch. Over {PER_TEAM} people a coin lands
          between {t.teamBand.lo} and {t.teamBand.hi} in{" "}
          {per100(t.teamBand.cover)} sittings of a hundred, so both are inside
          what a coin does: the teams were dealt differently, and eight
          outcomes on one team are too few to show it.
        </p>
        <p className={para} style={{ color: "var(--muted)" }}>
          {TURNS} of the sixteen ({turned}) began against how they went on: their
          first moment pointed one way and their six moments and their year the
          other. {WOBBLES} more had one moment against the rest. Who was on
          which team, the words each was given and the order you met them in
          were drawn fresh for this sitting.
        </p>
        <p className={para} style={{ color: "var(--muted)" }}>
          The first second came in five kinds:{" "}
          {DOOR_KINDS.map((k, n) => (
            <Fragment key={k}>
              {n > 0 && (n === DOOR_KINDS.length - 1 ? ", and " : ", ")}
              {DOOR_NAME[k]}
            </Fragment>
          ))}
          . Each is something a room can be swayed by without anyone deciding to
          be. {POOLS.moment.in.length + POOLS.moment.out.length} moments were in
          the pool, each pointing one way from the wording alone.
        </p>
      </section>

      <section
        className="panel sketched rise relative mt-6 p-5 sm:p-8"
        style={{ borderRadius: 3 }}
        aria-labelledby="sl-studies"
      >
        <Sketch seed="slice-studies" draw />
        <h2
          id="sl-studies"
          className="display text-[26px] leading-[1.12] sm:text-[30px]"
          style={{ color: "var(--ink)" }}
        >
          {DEBRIEF.studies.title}
        </h2>
        <p className={lede} style={{ color: "var(--muted)" }}>
          {DEBRIEF.studies.lede}
        </p>
        <div className="mt-2 grid gap-x-10 lg:grid-cols-2">
          {STUDIES.map((s) => (
            <div key={s.id}>
              <h3 className="display mt-8 text-[24px] leading-[1.15]">
                {s.head}
              </h3>
              <p
                className="mt-3 text-[15px] leading-[1.65]"
                style={{ color: "var(--muted)" }}
              >
                {s.body}{" "}
                <sup className="sl-cite">
                  {cite(s.sources).map((n, k) => (
                    <Fragment key={n}>
                      {k > 0 && ", "}
                      <a href={`#sl-src-${n}`}>{n}</a>
                    </Fragment>
                  ))}
                </sup>
              </p>
            </div>
          ))}
        </div>

        <h3 className={h3}>{DEBRIEF.limits.title}</h3>
        {DEBRIEF.limits.body.map((b) => (
          <p key={b} className={para} style={{ color: "var(--muted)" }}>
            {b}
          </p>
        ))}

        <h3 className={h3}>Sources</h3>
        <ol className="sl-sources">
          {SOURCES.map((s, n) => (
            <li key={s.id} id={`sl-src-${n + 1}`}>
              {s.cite}{" "}
              <span style={mono} className="text-[11.5px]">
                doi:{s.doi}
              </span>
            </li>
          ))}
        </ol>
        <p className={para} style={{ color: "var(--faint)" }}>
          Every citation was checked against Crossref. Each finding is taken
          from the paper or its abstract, and the figures quoted were read
          there.
        </p>

        <div className="mt-8">
          <button
            type="button"
            className={chip}
            onClick={again}
            style={{
              ...mono,
              color: "var(--accent)",
              borderColor: "var(--accent)",
            }}
          >
            {DEBRIEF.again}
          </button>
        </div>
      </section>
    </>
  );
}

function ConflictRow({ p, calls }: { p: Person; calls: Call[] }) {
  const withDoor = p.year === p.door.dir;
  return (
    <li className="sl-crow">
      <span className="sl-cn">
        № {pad(p.n)} · {p.team}
      </span>
      <span className="sl-dots">
        {calls.map((c, k) => (
          <Dot key={k} c={c} p={p} />
        ))}
      </span>
      <span className="sl-cy">
        the year went with the {withDoor ? "first second" : "moments"}
      </span>
      <span className="sl-ct">{p.door.text}</span>
    </li>
  );
}

function TeamRow({
  label,
  cells,
  note,
}: {
  label: string;
  cells: string[];
  note?: string;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      {cells.map((c, k) => (
        <td key={k}>
          {c}
          {note && <small> {note}</small>}
        </td>
      ))}
    </tr>
  );
}
