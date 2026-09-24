"use client";

import Link from "next/link";
import Sketch from "./Sketch";

/**
 * The ways into the same garden: the whole drawn as a graph, listed, the
 * reader's values drawn as a sheet a decision can be set down on, and the
 * garden's own taste as a curve a thing can be weighed against.
 */
const VIEWS = [
  { href: "/", label: "garden" },
  { href: "/catalogue", label: "catalogue" },
  { href: "/bearing", label: "bearing" },
  { href: "/distribution", label: "distribution" },
] as const;

export type View = (typeof VIEWS)[number]["href"];

export default function ViewSwitch({ current }: { current: View }) {
  return (
    <nav
      aria-label="Views"
      className="chip inline-flex items-center p-[3px]"
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
