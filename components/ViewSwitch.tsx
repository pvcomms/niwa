"use client";

import Link from "next/link";

/** The two ways into the same garden: the whole drawn as a graph, or listed. */
const VIEWS = [
  { href: "/", glyph: "庭", label: "garden" },
  { href: "/catalogue", glyph: "目録", label: "catalogue" },
] as const;

export default function ViewSwitch({
  current,
}: {
  current: "/" | "/catalogue";
}) {
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
              background: on
                ? "color-mix(in srgb, var(--ink) 7%, transparent)"
                : "transparent",
            }}
          >
            <span className="mr-1.5 tracking-normal normal-case">
              {v.glyph}
            </span>
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
