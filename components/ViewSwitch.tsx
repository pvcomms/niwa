"use client";

import Link from "next/link";
import Sketch from "./Sketch";

/**
 * The ways into the same garden: the whole drawn as a graph, listed, the
 * reader's values drawn as a sheet a decision can be set down on, the
 * garden's own taste as a curve a thing can be weighed against, the
 * threads given a direction so a stone's roots and reach can be read, and a
 * belief's course through what hit it, marked after the fact, the
 * reader's life as a number line, and how a claim reached them — and, last,
 * the notice at the gate that says how to use all of it.
 */
const VIEWS = [
  { href: "/", label: "garden" },
  { href: "/catalogue", label: "catalogue" },
  { href: "/bearing", label: "bearing" },
  { href: "/distribution", label: "distribution" },
  { href: "/flow", label: "flow" },
  { href: "/course", label: "course" },
  { href: "/chronology", label: "chronology" },
  { href: "/alarm", label: "alarm" },
  { href: "/way", label: "way" },
  { href: "/margin", label: "margin" },
  { href: "/provenance", label: "provenance" },
  { href: "/notice", label: "notice" },
] as const;

export type View = (typeof VIEWS)[number]["href"];

export default function ViewSwitch({ current }: { current: View }) {
  return (
    <nav
      aria-label="Views"
      className="chip inline-flex max-w-full flex-wrap items-center justify-center p-[3px]"
      style={{
        background: "color-mix(in srgb, var(--surface) 80%, transparent)",
      }}
    >
      {VIEWS.map((v) => {
        const on = v.href === current;
        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={on ? "page" : undefined}
            className="view-tab rounded-full px-2.5 py-[5px] text-[10px] tracking-[0.14em] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              color: on ? "var(--ink)" : "var(--faint)",
            }}
          >
            <span className="relative inline-block">
              {v.label}
              {on && (
                <Sketch kind="underline" seed={v.label} color="var(--accent)" />
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
