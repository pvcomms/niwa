"use client";

import { useEffect, useRef, useState } from "react";
import {
  HUES,
  LAYOUTS,
  expression,
  keyOf,
  regionsOf,
  slugOf,
  type Region,
  type Value,
  type ValuesConfig,
} from "@/lib/bearing";
import Sketch from "./Sketch";

export type Focus = { kind: "value" | "region"; key: string } | null;

type Props = {
  config: ValuesConfig;
  onChange: (next: ValuesConfig) => void;
  /** What the sheet was clicked on while editing: scroll to it, focus it. */
  focus: Focus;
  state: "idle" | "saving" | "kept" | "error";
  dir: string | null;
  writable: boolean;
  onDone: () => void;
};

const shortHome = (p: string) => p.replace(/^\/Users\/[^/]+/, "~");

const blank = (n: number): Value => ({
  id: `value-${n}-${Date.now().toString(36)}`,
  name: "",
  blurb: "",
  terms: [],
});

/**
 * The values, edited in place: names, what each means, the terms that mark a
 * stone as being about it, its hue; the regions where they overlap, named;
 * three circles or five. Every change redraws the sheet at once and is
 * written back to the reader's file a moment later.
 */
export default function ValuesEditor({
  config,
  onChange,
  focus,
  state,
  dir,
  writable,
  onDone,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const layout = LAYOUTS[config.layout];
  const values = config.values;

  useEffect(() => {
    if (!focus || !root.current) return;
    const el = root.current.querySelector<HTMLElement>(
      `[data-${focus.kind}="${CSS.escape(focus.key)}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el.querySelector<HTMLInputElement>("input")?.focus();
  }, [focus]);

  const setValue = (i: number, change: Partial<Value>) =>
    onChange({
      ...config,
      values: values.map((v, k) => (k === i ? { ...v, ...change } : v)),
    });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= values.length) return;
    const next = [...values];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...config, values: next });
  };

  const setLayout = (n: 3 | 5) => {
    if (n === config.layout) return;
    const next =
      n < values.length
        ? values.slice(0, n)
        : [
            ...values,
            ...Array.from({ length: n - values.length }, (_, k) =>
              blank(values.length + k + 1),
            ),
          ];
    onChange({ ...config, layout: n, values: next });
  };

  const setRegion = (key: string, change: Partial<Region>) =>
    onChange({
      ...config,
      regions: {
        ...config.regions,
        [key]: { ...(config.regions[key] ?? { name: "", blurb: "" }), ...change },
      },
    });

  return (
    <div ref={root} className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="meta" style={{ color: "var(--faint)" }}>
          the values · editing
        </div>
        <div className="flex items-center gap-3">
          <span
            className="meta"
            style={{
              color: state === "error" ? "var(--accent)" : "var(--faint)",
            }}
          >
            {!writable
              ? "not kept here"
              : state === "saving"
                ? "keeping…"
                : state === "kept"
                  ? "kept"
                  : state === "error"
                    ? "not kept"
                    : ""}
          </span>
          <button
            onClick={onDone}
            className="chip px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
            style={{ fontFamily: "var(--font-mono)", color: "var(--ink)" }}
          >
            done
          </button>
        </div>
      </div>

      {/* how many circles */}
      <div className="flex items-center gap-3">
        <span className="meta" style={{ color: "var(--faint)" }}>
          circles
        </span>
        {([3, 5] as const).map((n) => {
          const on = config.layout === n;
          return (
            <button
              key={n}
              onClick={() => setLayout(n)}
              className="seg relative px-1 text-[12px]"
              style={{
                fontFamily: "var(--font-mono)",
                color: on ? "var(--ink)" : "var(--faint)",
              }}
              aria-pressed={on}
            >
              {n}
              {on && (
                <Sketch
                  kind="underline"
                  seed={`circles-${n}`}
                  color="var(--accent)"
                />
              )}
            </button>
          );
        })}
        <span
          className="hand ml-auto text-[13px]"
          style={{ color: "var(--faint)" }}
        >
          {config.layout === 5
            ? "five: not every overlap is drawable"
            : "three: every region is real"}
        </span>
      </div>

      {/* each value */}
      <ol className="flex flex-col gap-4">
        {values.map((v, i) => (
          <li key={v.id} data-value={v.id} className="border-t pt-3 rule">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1"
                role="radiogroup"
                aria-label="Hue"
              >
                {Array.from({ length: HUES }, (_, h) => {
                  const on = (v.hue ?? i) === h;
                  return (
                    <button
                      key={h}
                      onClick={() => setValue(i, { hue: h })}
                      role="radio"
                      aria-checked={on}
                      aria-label={`hue ${h + 1}`}
                      className="b-swatch"
                      style={{
                        background: `var(--value-${h})`,
                        outline: on ? `2px solid var(--value-${h})` : "none",
                        outlineOffset: 2,
                      }}
                    />
                  );
                })}
              </div>
              <span className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="b-arrow meta"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === values.length - 1}
                  className="b-arrow meta"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </span>
            </div>
            <input
              value={v.name}
              onChange={(e) => setValue(i, { name: e.target.value })}
              placeholder={`the ${["first", "second", "third", "fourth", "fifth"][i]} value`}
              className="search mt-2 w-full px-3 py-1.5 text-[13px]"
              style={{
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
              aria-label="Name"
            />
            <textarea
              value={v.blurb}
              onChange={(e) => setValue(i, { blurb: e.target.value })}
              placeholder="what it means, in your words"
              rows={2}
              className="search mt-1.5 w-full resize-y px-3 py-1.5 text-[13px] leading-[1.5]"
              aria-label="Meaning"
            />
            <Terms
              terms={v.terms}
              onChange={(terms) => setValue(i, { terms })}
            />
          </li>
        ))}
      </ol>

      {/* the regions */}
      <div className="border-t pt-3 rule">
        <div className="meta" style={{ color: "var(--faint)" }}>
          the regions · name where they overlap
        </div>
        <ol className="mt-2 flex flex-col gap-3">
          {regionsOf(layout).map((ids) => {
            const key = keyOf(
              ids.map((i) => values[i]?.id ?? "").filter(Boolean),
            );
            const r = config.regions[key] ?? { name: "", blurb: "" };
            return (
              <li key={key} data-region={key}>
                <div className="flex items-center gap-2">
                  {ids.map((i) => (
                    <span
                      key={i}
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 99,
                        background: `var(--value-${values[i]?.hue ?? i})`,
                      }}
                    />
                  ))}
                  <span
                    className="meta"
                    style={{ color: "var(--muted)", textTransform: "none" }}
                  >
                    {expression(ids, values)}
                  </span>
                  <span
                    className="hand ml-auto truncate text-[13px]"
                    style={{ color: "var(--faint)" }}
                  >
                    {ids.map((i) => values[i]?.name || "—").join(" · ")}
                  </span>
                </div>
                <input
                  value={r.name}
                  onChange={(e) => setRegion(key, { name: e.target.value })}
                  placeholder="its name"
                  className="search hand mt-1.5 w-full px-3 py-1 text-[15px]"
                  aria-label="Region name"
                />
                <input
                  value={r.blurb}
                  onChange={(e) => setRegion(key, { blurb: e.target.value })}
                  placeholder="one line on it"
                  className="search mt-1 w-full px-3 py-1 text-[12.5px]"
                  aria-label="Region blurb"
                />
              </li>
            );
          })}
        </ol>
      </div>

      <p
        className="hand text-[13.5px] leading-[1.3]"
        style={{ color: "var(--faint)" }}
      >
        {writable && dir
          ? `kept in ${shortHome(dir)}/values.json — the file is yours to edit by hand too.`
          : "a deployed sheet keeps no edits; they last until you leave the page."}
      </p>
    </div>
  );
}

/** The words that mark a stone as being about a value, as chips. */
function Terms({
  terms,
  onChange,
}: {
  terms: string[];
  onChange: (t: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().toLowerCase();
    if (!t || terms.includes(t)) return setDraft("");
    onChange([...terms, t]);
    setDraft("");
  };
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {terms.map((t) => (
        <span
          key={t}
          className="chip inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-[11px]"
          style={{ color: "var(--muted)" }}
        >
          {t}
          <button
            onClick={() => onChange(terms.filter((x) => x !== t))}
            className="b-x"
            aria-label={`Drop the term ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && terms.length) {
            onChange(terms.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={
          terms.length ? "another term" : "terms that mark a note as about it"
        }
        className="search min-w-[9rem] flex-1 px-2 py-0.5 text-[11.5px]"
        aria-label="Add a term"
      />
    </div>
  );
}
