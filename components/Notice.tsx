"use client";

import Link from "next/link";
import { Fragment, useEffect, type CSSProperties } from "react";
import { NOTICE } from "@/content/notice";
import { viewName } from "@/lib/margin";
import { putOnDesk } from "./desk";
import Sketch from "./Sketch";
import ViewSwitch from "./ViewSwitch";
import { useTheme } from "./useTheme";

const mono = { fontFamily: "var(--font-mono)" } as const;

/**
 * The notice at the gate: what the garden is for, what it is grounded in,
 * one way round it when something is on your mind, each view on one card,
 * the keys, what it will not do and what is the reader's to do. Every word
 * of it is content (`content/notice.ts`); this only sets it.
 */
export default function Notice() {
  const [theme, setTheme] = useTheme();
  const n = NOTICE;
  const [first, ...rest] = n.stance;

  useEffect(() => {
    putOnDesk(null);
  }, []);

  return (
    <main className="notice scroll-thin relative h-dvh w-full overflow-y-auto">
      <div className="mx-auto max-w-[80rem] px-5 pb-16 sm:px-10">
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
                notice
              </div>
              <p
                className="hand mt-1 max-w-[27rem] text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                How to use the garden, and what it leaves to you. Read it once
                at the gate; come back when a view is not doing what you
                expected of it.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch current="/notice" />
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

        {/* ── the stance, and what it is grounded in ───────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section
            className="panel sketched rise relative p-5 sm:p-8"
            style={{ borderRadius: 3, animationDelay: "60ms" }}
            aria-label="What this is for"
          >
            <Sketch seed="notice-stance" draw />
            <div className="meta" style={{ color: "var(--accent)" }}>
              what this is for
            </div>
            <p
              className="display mt-4 max-w-[38rem] text-[25px] leading-[1.22] sm:text-[30px]"
              style={{ color: "var(--ink)" }}
            >
              {first}
            </p>
            {rest.map((p, i) => (
              <p
                key={i}
                className="mt-4 max-w-[40rem] text-[15.5px] leading-[1.7]"
                style={{
                  color: i === rest.length - 1 ? "var(--ink)" : "var(--muted)",
                }}
              >
                {p}
              </p>
            ))}
            <p
              className="hand mt-6 max-w-[40rem] text-[17px] leading-[1.3]"
              style={{ color: "var(--accent)" }}
            >
              {n.model}
            </p>
          </section>

          <aside className="flex flex-col gap-5">
            <section
              className="panel sketched rise relative p-4"
              style={{ borderRadius: 3, animationDelay: "120ms" }}
              aria-label="What it is grounded in"
            >
              <Sketch seed="notice-ground" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                what it is grounded in
              </div>
              <p
                className="hand mt-2 text-[15.5px] leading-[1.3]"
                style={{ color: "var(--muted)" }}
              >
                {n.grounded.lead}
              </p>
              <dl className="mt-4 flex flex-col gap-3.5">
                {n.grounded.items.map((g) => (
                  <div key={g.what}>
                    <dt className="meta" style={{ color: "var(--faint)" }}>
                      {g.what}
                    </dt>
                    <dd
                      className="mt-1 text-[13.5px] leading-[1.55]"
                      style={{ color: "var(--ink)" }}
                    >
                      {g.how}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </aside>
        </div>

        {/* ── one way round ─────────────────────────────────────────────── */}
        <section
          className="rise mt-12"
          style={{ animationDelay: "180ms" }}
          aria-label="One way round"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2
              className="display text-[28px] leading-none"
              style={{ color: "var(--ink)" }}
            >
              one way round
            </h2>
            <span
              className="hand text-[15.5px]"
              style={{ color: "var(--muted)" }}
            >
              when something is on your mind. Take the steps that apply, in any
              order; skip the rest.
            </span>
          </div>
          <ol className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {n.round.map((s, i) => (
              <li
                key={s.when}
                className="n-step relative flex gap-4"
                style={{ "--i": i } as CSSProperties}
              >
                <span
                  className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center text-[12px]"
                  style={{ ...mono, color: "var(--ink)" }}
                  aria-hidden
                >
                  <Sketch kind="ring" seed={`step-${i}`} color="var(--accent)" />
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span
                      className="display text-[19px] leading-none"
                      style={{ color: "var(--ink)" }}
                    >
                      {s.when}
                    </span>
                    {s.views.map((v) => (
                      <Link
                        key={v}
                        href={v}
                        className="n-go meta"
                        style={{ color: "var(--accent)" }}
                      >
                        the {viewName(v)}
                      </Link>
                    ))}
                    <kbd className="n-key">{s.key}</kbd>
                  </div>
                  <p
                    className="mt-1.5 max-w-[34rem] text-[14px] leading-[1.6]"
                    style={{ color: "var(--muted)" }}
                  >
                    {s.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── each view, on one card ────────────────────────────────────── */}
        <section
          className="rise mt-12"
          style={{ animationDelay: "240ms" }}
          aria-label="Each view"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2
              className="display text-[28px] leading-none"
              style={{ color: "var(--ink)" }}
            >
              each view, on one card
            </h2>
            <span
              className="hand text-[15.5px]"
              style={{ color: "var(--muted)" }}
            >
              what it is for, what you do, what the desk reads back, and the one
              thing it never does.
            </span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {n.views.map((c, i) => (
              <article
                key={c.href}
                className="n-card panel sketched relative p-4"
                style={{ borderRadius: 3, "--i": i } as CSSProperties}
              >
                <Sketch seed={`card-${c.href}`} draw />
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={c.href}
                    className="n-title display text-[22px] leading-none"
                    style={{ color: "var(--ink)" }}
                  >
                    {c.name}
                  </Link>
                  <kbd className="n-key">{c.key}</kbd>
                </div>
                <dl className="mt-3 flex flex-col gap-2.5">
                  <Row label="for" text={c.for} />
                  <Row label="do" text={c.do} />
                  <Row label="reads back" text={c.reads} />
                  <Row label="never" text={c.never} accent />
                </dl>
              </article>
            ))}
          </div>
        </section>

        {/* ── the keys · what it will not do · what is yours ───────────── */}
        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section
            className="panel sketched rise relative min-w-0 p-4 sm:p-6"
            style={{ borderRadius: 3, animationDelay: "300ms" }}
            aria-label="The keys"
          >
            <Sketch seed="notice-keys" draw />
            <div className="meta" style={{ color: "var(--accent)" }}>
              the keys
            </div>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 text-[13px] sm:grid-cols-[auto_minmax(0,1fr)_fit-content(11rem)]">
              {n.keys.map((k) => (
                <Fragment key={k.key}>
                  <dt>
                    <kbd className="n-key">{k.key}</kbd>
                  </dt>
                  <dd style={{ color: "var(--ink)" }}>{k.does}</dd>
                  <dd
                    className="meta col-start-2 sm:col-start-3 sm:text-right"
                    style={{ color: "var(--faint)", textTransform: "none" }}
                  >
                    {k.where}
                  </dd>
                </Fragment>
              ))}
            </dl>
          </section>

          <div className="flex min-w-0 flex-col gap-6">
            <section
              className="panel sketched rise relative p-4 sm:p-6"
              style={{ borderRadius: 3, animationDelay: "340ms" }}
              aria-label="What it will not do"
            >
              <Sketch seed="notice-not" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                what it will not do
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {n.not.map((s) => (
                  <li
                    key={s}
                    className="relative pl-5 text-[14px] leading-[1.55]"
                    style={{ color: "var(--ink)" }}
                  >
                    <span
                      aria-hidden
                      className="absolute top-[0.62em] left-0 h-px w-3"
                      style={{ background: "var(--accent)" }}
                    />
                    {s}
                  </li>
                ))}
              </ul>
            </section>

            <section
              className="panel sketched rise relative p-4 sm:p-6"
              style={{ borderRadius: 3, animationDelay: "380ms" }}
              aria-label="What is yours to do"
            >
              <Sketch seed="notice-yours" draw />
              <div className="meta" style={{ color: "var(--accent)" }}>
                what is yours to do
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {n.yours.map((s) => (
                  <li
                    key={s}
                    className="relative pl-5 text-[14px] leading-[1.55]"
                    style={{ color: "var(--ink)" }}
                  >
                    <span
                      aria-hidden
                      className="absolute top-[0.42em] left-0 h-2 w-2 rounded-full"
                      style={{ border: "1px solid var(--accent)" }}
                    />
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <p
          className="meta mt-8"
          style={{ color: "var(--faint)", textTransform: "none" }}
        >
          this notice is a file — content/notice.ts — and says only what is
          written there
        </p>
      </div>
    </main>
  );
}

function Row({
  label,
  text,
  accent = false,
}: {
  label: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-[4.6rem_minmax(0,1fr)] gap-x-2">
      <dt
        className="meta pt-[3px]"
        style={{ color: accent ? "var(--accent)" : "var(--faint)" }}
      >
        {label}
      </dt>
      <dd
        className="text-[13.5px] leading-[1.55]"
        style={{ color: accent ? "var(--ink)" : "var(--muted)" }}
      >
        {text}
      </dd>
    </div>
  );
}
