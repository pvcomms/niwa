"use client";

import { useMemo } from "react";
import { formOf, formReadings, uid, type Dialogue as D } from "@/lib/dialogue";
import { holds, inWords, parse, show, type Formula } from "@/lib/form";
import Sketch from "./Sketch";

const mono = { fontFamily: "var(--font-mono)" } as const;
const chip = "chip d-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase";
const rule = { borderBottom: "1px solid var(--rule)" } as const;
/** More rows than this and only the ones where every premise holds are drawn. */
const SHOW_ALL = 16;

function Chip({
  children,
  onClick,
  on,
}: {
  children: React.ReactNode;
  onClick: () => void;
  on?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={chip}
      style={{
        ...mono,
        color: on ? "var(--ink)" : "var(--muted)",
        borderColor: on ? "var(--ink)" : undefined,
      }}
    >
      {children}
    </button>
  );
}

/** A formula as written, then as read: in symbols and said back in words, or why it does not read. */
function Reads({ src, keyOf }: { src: string; keyOf: Record<string, string> }) {
  if (!src.trim()) return null;
  const r = parse(src);
  if (!r.ok)
    return (
      <p className="hand mt-0.5 text-[14px]" style={{ color: "var(--accent)" }}>
        {r.error}
      </p>
    );
  return (
    <p
      className="mt-0.5 text-[12.5px] leading-[1.45]"
      style={{ color: "var(--muted)" }}
    >
      <span style={{ ...mono, color: "var(--ink)" }}>{show(r.f)}</span>
      <span className="hand text-[14px]"> — {inWords(r.f, keyOf)}</span>
    </p>
  );
}

const nextLetter = (used: Set<string>) =>
  [..."pqrstuvwabcdefghijklmnoxyz"].find((l) => !used.has(l)) ?? "";

/**
 * The form: the argument written over letters, and the rows. The reader
 * gives each sentence a letter and writes the premises and the conclusion;
 * the rows show where every premise holds and whether the conclusion does
 * there, and the lines under them say it. Whether a sentence is so is not
 * asked and not answered.
 */
export default function DialogueForm({
  d,
  writable,
  change,
  commit,
}: {
  d: D;
  writable: boolean;
  /** Set the dialogue; `keep` writes it now rather than on blur. */
  change: (next: D, keep?: boolean) => void;
  commit: () => void;
}) {
  const keyOf = useMemo(
    () => Object.fromEntries(d.letters.map((l) => [l.letter, l.text])),
    [d.letters],
  );
  const form = useMemo(() => formOf(d), [d]);
  const lines = useMemo(() => formReadings(d, form), [d, form]);
  const a = form.argument;
  const blank = !d.letters.length && !d.premises.length && !d.conclusion;
  if (blank && !writable) return null;

  const used = new Set(d.letters.map((l) => l.letter));
  const setLetter = (i: number, patch: Partial<D["letters"][number]>) =>
    change({
      ...d,
      letters: d.letters.map((l, j) => (j === i ? { ...l, ...patch } : l)),
    });
  const setPremise = (id: string, text: string) =>
    change({
      ...d,
      premises: d.premises.map((p) => (p.id === id ? { ...p, form: text } : p)),
    });

  // The columns: the letters, each premise that reads, then the conclusion.
  const cols =
    a.state === "read"
      ? [
          ...d.premises
            .map((p, i) => ({ label: `${i + 1}`, r: parse(p.form) }))
            .filter(
              (c): c is { label: string; r: { ok: true; f: Formula } } =>
                c.r.ok,
            ),
          { label: "∴", r: parse(d.conclusion) as { ok: true; f: Formula } },
        ]
      : [];
  const shown =
    a.state === "read"
      ? a.rows.length <= SHOW_ALL
        ? a.rows.map((_, i) => i)
        : a.live
      : [];

  return (
    <section
      className="panel sketched rise relative p-4"
      style={{ borderRadius: 3, animationDelay: "170ms" }}
      aria-label="The form"
    >
      <Sketch seed="dialogue-form" draw />
      <div className="meta" style={{ color: "var(--accent)" }}>
        the form
      </div>
      <p
        className="hand mt-1 text-[15px] leading-[1.3]"
        style={{ color: "var(--faint)" }}
      >
        give each sentence a letter, then write the argument over the letters —
        not, and, or, if … then, iff, or ¬ ∧ ∨ → ↔. The rows show what the form
        does; whether a sentence is so stays yours.
      </p>

      {/* the letters */}
      <div className="mt-3 flex flex-col gap-1.5">
        {d.letters.map((l, i) => (
          <div key={i} className="flex items-baseline gap-2 text-[14px]">
            <input
              value={l.letter}
              onChange={(e) =>
                setLetter(i, { letter: e.target.value.slice(-1).toLowerCase() })
              }
              onBlur={commit}
              readOnly={!writable}
              aria-label="The letter"
              className="w-[1.4rem] shrink-0 bg-transparent py-0.5 text-center"
              style={{ ...mono, ...rule, color: "var(--ink)" }}
            />
            <input
              value={l.text}
              onChange={(e) => setLetter(i, { text: e.target.value })}
              onBlur={commit}
              readOnly={!writable}
              placeholder="the sentence it stands for"
              aria-label={`What ${l.letter} stands for`}
              className="min-w-0 flex-1 bg-transparent py-0.5"
              style={{ ...rule, color: "var(--ink)" }}
            />
            {writable && (
              <button
                onClick={() =>
                  change(
                    { ...d, letters: d.letters.filter((_, j) => j !== i) },
                    true,
                  )
                }
                className="meta"
                style={{ color: "var(--faint)" }}
                aria-label={`Drop the letter ${l.letter}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* the premises and the conclusion */}
      <ol className="mt-3 flex flex-col gap-2">
        {d.premises.map((p, i) => (
          <li key={p.id}>
            <div className="flex items-baseline gap-2">
              <span
                className="meta w-[1.4rem] shrink-0 text-center"
                style={{ color: "var(--faint)" }}
              >
                {i + 1}
              </span>
              <input
                value={p.form}
                onChange={(e) => setPremise(p.id, e.target.value)}
                onBlur={commit}
                readOnly={!writable}
                placeholder="a premise, e.g. p -> q"
                aria-label={`Premise ${i + 1}`}
                className="min-w-0 flex-1 bg-transparent py-0.5 text-[13px]"
                style={{ ...mono, ...rule, color: "var(--ink)" }}
              />
              {writable && (
                <button
                  onClick={() =>
                    change(
                      {
                        ...d,
                        premises: d.premises.filter((x) => x.id !== p.id),
                      },
                      true,
                    )
                  }
                  className="meta"
                  style={{ color: "var(--faint)" }}
                  aria-label={`Drop premise ${i + 1}`}
                >
                  ×
                </button>
              )}
            </div>
            <div className="pl-[1.9rem]">
              <Reads src={p.form} keyOf={keyOf} />
            </div>
          </li>
        ))}
        <li>
          <div
            className="flex items-baseline gap-2"
            style={{ borderTop: "1px solid var(--ink)", paddingTop: 6 }}
          >
            <span
              className="w-[1.4rem] shrink-0 text-center text-[13px]"
              style={{ ...mono, color: "var(--ink)" }}
            >
              ∴
            </span>
            <input
              value={d.conclusion}
              onChange={(e) => change({ ...d, conclusion: e.target.value })}
              onBlur={commit}
              readOnly={!writable}
              placeholder="the conclusion"
              aria-label="The conclusion"
              className="min-w-0 flex-1 bg-transparent py-0.5 text-[13px]"
              style={{ ...mono, ...rule, color: "var(--ink)" }}
            />
          </div>
          <div className="pl-[1.9rem]">
            <Reads src={d.conclusion} keyOf={keyOf} />
          </div>
        </li>
      </ol>

      {writable && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip
            onClick={() =>
              change(
                {
                  ...d,
                  letters: [
                    ...d.letters,
                    { letter: nextLetter(used), text: "" },
                  ],
                },
                true,
              )
            }
          >
            a letter
          </Chip>
          <Chip
            onClick={() =>
              change(
                { ...d, premises: [...d.premises, { id: uid(), form: "" }] },
                true,
              )
            }
          >
            a premise
          </Chip>
        </div>
      )}

      {/* the rows */}
      {a.state === "read" && (
        <div className="scroll-thin mt-4 overflow-x-auto">
          <table
            className="text-[12px]"
            style={{ ...mono, borderCollapse: "collapse" }}
            aria-label="The rows"
          >
            <thead>
              <tr style={{ color: "var(--muted)" }}>
                {a.letters.map((l) => (
                  <th key={l} className="px-1.5 pb-1 font-normal">
                    {l}
                  </th>
                ))}
                {cols.map((c, j) => (
                  <th
                    key={c.label}
                    className="px-1.5 pb-1 font-normal"
                    style={
                      j === 0
                        ? { borderLeft: "1px solid var(--rule)" }
                        : undefined
                    }
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => {
                const row = a.rows[i];
                const live = a.live.includes(i);
                const against = a.against.includes(i);
                return (
                  <tr
                    key={i}
                    style={{
                      color: against
                        ? "var(--accent)"
                        : live
                          ? "var(--ink)"
                          : "var(--faint)",
                      boxShadow: against
                        ? "inset 2px 0 0 var(--accent)"
                        : undefined,
                    }}
                  >
                    {a.letters.map((l) => (
                      <td key={l} className="px-1.5 text-center">
                        {row[l] ? "●" : "○"}
                      </td>
                    ))}
                    {cols.map((c, j) => (
                      <td
                        key={c.label}
                        className="px-1.5 text-center"
                        style={
                          j === 0
                            ? { borderLeft: "1px solid var(--rule)" }
                            : undefined
                        }
                      >
                        {holds(c.r.f, row) ? "●" : "○"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p
            className="meta mt-1.5"
            style={{ color: "var(--faint)", textTransform: "none" }}
          >
            ● holds · ○ does not
            {a.rows.length > SHOW_ALL
              ? ` · the ${a.live.length} rows of ${a.rows.length} where every premise holds`
              : " · full ink where every premise holds"}
          </p>
        </div>
      )}

      {lines.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {lines.map((l) => (
            <li
              key={l}
              className="text-[13.5px] leading-[1.5]"
              style={{ color: "var(--ink)" }}
            >
              {l}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
