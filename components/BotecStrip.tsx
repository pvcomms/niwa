"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DRAFT,
  emptyBotec,
  hasContent,
  validateBotec,
  viewWords,
  type Botec,
} from "@/lib/botec";
import Envelope from "./Envelope";
import { onDesk } from "./desk";
import Sketch from "./Sketch";

const localToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const chip =
  "chip bt-seg px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase disabled:opacity-40";
const mono = { fontFamily: "var(--font-mono)" } as const;

/**
 * The back of an envelope, on every view: a tab at the page's edge and the
 * backslash key open it over whatever is being looked at, so a thing can be
 * worked out on the spot. It remembers the view it was started at and what
 * was on the desk. The envelope stays in this browser until it is kept —
 * then it is a file, and the sheet at /botec is where it is read back. A
 * deployed garden keeps nothing, and the envelope still works.
 */
export default function BotecStrip() {
  const pathname = usePathname();
  const [writable, setWritable] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [b, setB] = useState<Botec | null>(null);
  const [slug, setSlug] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [kept, setKept] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const [focus, setFocus] = useState(0);
  const bRef = useRef<Botec | null>(null);
  const slugRef = useRef("");
  const dirtyRef = useRef(false);
  // Counts the changes, so keeping that lands after another change does not mark that one kept.
  const revRef = useRef(0);
  const openRef = useRef(false);
  openRef.current = open;

  useEffect(() => {
    fetch("/api/botec?head=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((m: { writable?: boolean } | null) => setWritable(!!m?.writable))
      .catch(() => setWritable(false));
    try {
      const raw = localStorage.getItem(DRAFT);
      if (!raw) return;
      const d = JSON.parse(raw) as {
        botec?: unknown;
        slug?: string;
        dirty?: boolean;
      };
      const s = typeof d.slug === "string" ? d.slug : "";
      const draft = { ...validateBotec(d.botec), slug: s };
      bRef.current = draft;
      slugRef.current = s;
      dirtyRef.current = !!d.dirty;
      setB(draft);
      setSlug(s);
      setDirty(!!d.dirty);
    } catch {}
  }, []);

  const remember = useCallback(() => {
    try {
      const cur = bRef.current;
      if (cur && hasContent(cur))
        localStorage.setItem(
          DRAFT,
          JSON.stringify({
            botec: cur,
            slug: slugRef.current,
            dirty: dirtyRef.current,
          }),
        );
      else localStorage.removeItem(DRAFT);
    } catch {}
  }, []);

  const here = useCallback(
    () => ({
      view: pathname ?? "/",
      url: `${window.location.pathname}${window.location.search}`,
      about: onDesk(),
    }),
    [pathname],
  );

  const start = useCallback(() => {
    const fresh = emptyBotec(localToday(), here());
    bRef.current = fresh;
    slugRef.current = "";
    dirtyRef.current = false;
    setB(fresh);
    setSlug("");
    setDirty(false);
    setKept(null);
    setSure(false);
    setTrouble(null);
    remember();
    setFocus((f) => f + 1);
  }, [here, remember]);

  const show = useCallback(() => {
    // An envelope with nothing on it yet is started again here, so it knows where it was started.
    if (!bRef.current || !hasContent(bRef.current)) start();
    else setFocus((f) => f + 1);
    setOpen(true);
    window.dispatchEvent(new CustomEvent("niwa-strip", { detail: "botec" }));
  }, [start]);

  const close = useCallback(() => {
    setOpen(false);
    setSure(false);
    setTrouble(null);
  }, []);

  const edit = useCallback(
    (f: (x: Botec) => Botec, done?: boolean) => {
      const cur = bRef.current;
      if (!cur) return;
      const next = f(cur);
      if (next !== cur) {
        bRef.current = next;
        dirtyRef.current = true;
        revRef.current++;
        setB(next);
        setDirty(true);
        setKept(null);
        setSure(false);
      }
      if (done || next !== cur) remember();
    },
    [remember],
  );

  const keep = useCallback(async () => {
    const cur = bRef.current;
    if (!cur || !writable || busy) return;
    if (!hasContent(cur)) {
      setTrouble("put down what you are working out, or a line");
      return;
    }
    setBusy(true);
    setTrouble(null);
    const at = revRef.current;
    try {
      const r = await fetch("/api/botec", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          botec: { ...cur, slug: slugRef.current, touched: localToday() },
          fresh: !slugRef.current,
        }),
      });
      const out = (await r.json().catch(() => null)) as
        Botec | { error: string } | null;
      if (!r.ok || !out || "error" in out) {
        setTrouble(
          out && "error" in out ? out.error : `not kept (${r.status})`,
        );
        return;
      }
      slugRef.current = out.slug;
      const still = revRef.current === at;
      if (still) dirtyRef.current = false;
      bRef.current = {
        ...(bRef.current ?? cur),
        slug: out.slug,
        put: out.put,
        touched: out.touched,
      };
      setB(bRef.current);
      setSlug(out.slug);
      if (still) {
        setDirty(false);
        setKept(out.slug);
      }
      remember();
    } catch {
      setTrouble("not kept — the garden did not answer");
    } finally {
      setBusy(false);
    }
  }, [busy, remember, writable]);

  // The backslash opens the envelope from any view — the back of one — unless the reader is typing.
  // Escape closes it before any view gets to hear it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (
        e.key === "\\" &&
        !typing &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !openRef.current
      ) {
        e.preventDefault();
        show();
      } else if (e.key === "Escape" && openRef.current) {
        e.stopPropagation();
        close();
      }
    };
    const onAsk = () => show();
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail !== "botec") setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("niwa-botec", onAsk);
    window.addEventListener("niwa-strip", onOther);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("niwa-botec", onAsk);
      window.removeEventListener("niwa-strip", onOther);
    };
  }, [close, show]);

  // The sheet is the envelope at full size; on it, the tab would only cover it.
  if (writable === null || pathname === "/botec") return null;
  const where = b?.view ? `at the ${viewWords(b.view)}` : "";
  const unkept = !!b && hasContent(b) && (!slug || dirty);

  return (
    <>
      {!open && (
        <button
          onClick={show}
          className="bt-tab hand fixed right-0 z-[60] px-[5px] py-3 text-[15px]"
          style={{
            top: "calc(50% + 2.7rem)",
            color: "var(--muted)",
            background: "var(--surface)",
            border: "1px solid var(--rule)",
            borderRight: "none",
            borderRadius: "4px 0 0 4px",
          }}
          aria-label="Work something out on the back of an envelope. Also the backslash key."
          title="the back of an envelope · \"
        >
          botec
        </button>
      )}
      {open && b && (
        <aside
          role="dialog"
          aria-label="The back of an envelope"
          className="bt-strip panel sketched fixed right-3 z-[61] flex w-[38rem] max-w-[calc(100vw-1.5rem)] flex-col"
          style={{ top: "50%", borderRadius: 3 }}
        >
          <Sketch seed="botec-strip" draw />
          <div className="flex items-start justify-between gap-3 px-5 pt-4">
            <div className="min-w-0">
              <span className="meta" style={{ color: "var(--accent)" }}>
                on the back of an envelope
              </span>
              {(where || b.about) && (
                <p
                  className="hand mt-0.5 truncate text-[15px] leading-[1.3]"
                  style={{ color: "var(--muted)" }}
                >
                  {where}
                  {b.about ? `${where ? " · " : ""}about ${b.about.label}` : ""}
                </p>
              )}
            </div>
            <button
              onClick={close}
              aria-label="Close"
              className="chip shrink-0 px-2 py-0.5 text-[11px] leading-none"
              style={{ color: "var(--muted)" }}
            >
              esc
            </button>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-3">
            <Envelope
              botec={b}
              edit={edit}
              writable
              wide={false}
              seed={`strip-${slug || b.put}`}
              focus={focus}
              onKeep={writable ? keep : undefined}
            />
          </div>
          <div
            className="flex flex-wrap items-center gap-2 px-5 pt-2 pb-4"
            style={{ borderTop: "1px solid var(--rule)" }}
          >
            {writable ? (
              <button
                onClick={keep}
                disabled={busy || !unkept}
                className={chip}
                style={{
                  ...mono,
                  color: "var(--ink)",
                  borderColor: unkept ? "var(--ink)" : undefined,
                }}
              >
                {busy
                  ? "keeping…"
                  : slug
                    ? dirty
                      ? "keep again"
                      : "kept"
                    : "keep"}
              </button>
            ) : (
              <span
                className="hand text-[14.5px] leading-tight"
                style={{ color: "var(--faint)" }}
              >
                this copy of the garden keeps nothing; the envelope stays in
                this browser
              </span>
            )}
            <button
              onClick={() =>
                unkept && !slug && !sure ? setSure(true) : start()
              }
              className={chip}
              style={{
                ...mono,
                color: sure ? "var(--accent)" : "var(--muted)",
                borderColor: sure ? "var(--accent)" : undefined,
              }}
            >
              {sure ? "let this one go — sure?" : "a new envelope"}
            </button>
            <span className="flex-1" />
            {writable && (
              <Link
                href={
                  slug ? `/botec?slug=${encodeURIComponent(slug)}` : "/botec"
                }
                onClick={close}
                className="bt-link hand text-[15.5px]"
                style={{ color: kept ? "var(--accent)" : "var(--muted)" }}
              >
                {slug ? "on the sheet →" : "the envelopes kept →"}
              </Link>
            )}
          </div>
          {(trouble || kept) && (
            <p
              className="hand fade -mt-2 px-5 pb-3 text-[15px] leading-[1.3]"
              style={{ color: trouble ? "var(--accent)" : "var(--ink)" }}
              role={trouble ? "alert" : "status"}
            >
              {trouble ??
                "kept — it is a file now, and the sheet reads it back"}
            </p>
          )}
        </aside>
      )}
    </>
  );
}
