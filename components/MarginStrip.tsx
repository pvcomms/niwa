"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { extOf, viewName, type Note } from "@/lib/margin";
import { useOnDesk } from "./desk";
import Sketch from "./Sketch";

type Meta = { writable: boolean; speech: boolean };
type Rec = "idle" | "recording" | "done";

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const MIMES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

/**
 * The margin of every view: a tab at the page's edge, and behind it a strip
 * where the reader says what comes to mind — typed, or spoken into the
 * microphone — while looking at whatever they are looking at. What is kept
 * is the words, the moment, the view and its address, and what was on the
 * desk. A deployed garden has no reader and shows no tab.
 */
export default function MarginStrip() {
  const pathname = usePathname();
  const about = useOnDesk();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [rec, setRec] = useState<Rec>("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [kept, setKept] = useState<Note | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);
  const openRef = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const closer = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/margin?head=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Meta | null) => {
        if (m) setMeta({ writable: m.writable, speech: m.speech });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    openRef.current = open;
    if (open) window.setTimeout(() => area.current?.focus(), 30);
  }, [open]);

  const stopTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };

  const discard = useCallback(() => {
    stopTimer();
    if (recorder.current && recorder.current.state !== "inactive") {
      recorder.current.onstop = null;
      recorder.current.stream.getTracks().forEach((t) => t.stop());
      recorder.current.stop();
    }
    recorder.current = null;
    chunks.current = [];
    setBlob(null);
    setSeconds(0);
    setRec("idle");
  }, []);

  const close = useCallback(() => {
    discard();
    setTrouble(null);
    setOpen(false);
  }, [discard]);

  // The apostrophe opens the margin from any view — a mark in the margin — unless
  // the reader is typing. Escape closes it before any view gets to hear it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (
        e.key === "'" &&
        !typing &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !openRef.current
      ) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && openRef.current) {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [close]);

  useEffect(() => () => discard(), [discard]);

  const start = useCallback(async () => {
    setTrouble(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices) {
      setTrouble("this window cannot record; type instead.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = (e as DOMException).name;
      setTrouble(
        name === "NotAllowedError" || name === "SecurityError"
          ? "the microphone was refused. the app asks once; in a browser, allow it for this site. typing still works."
          : name === "NotFoundError"
            ? "no microphone was found. typing still works."
            : `could not record: ${(e as Error).message}`,
      );
      return;
    }
    const mime = MIMES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const r = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    chunks.current = [];
    r.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setBlob(new Blob(chunks.current, { type: r.mimeType || mime }));
      setRec("done");
    };
    recorder.current = r;
    startedAt.current = Date.now();
    setSeconds(0);
    setRec("recording");
    r.start(250);
    timer.current = window.setInterval(
      () => setSeconds((Date.now() - startedAt.current) / 1000),
      200,
    );
  }, []);

  const stop = useCallback(() => {
    stopTimer();
    setSeconds((Date.now() - startedAt.current) / 1000);
    if (recorder.current && recorder.current.state !== "inactive")
      recorder.current.stop();
  }, []);

  const keep = useCallback(async () => {
    if (busy || rec === "recording") return;
    if (!text.trim() && !blob) return;
    setBusy(true);
    setTrouble(null);
    try {
      const form = new FormData();
      form.set("view", pathname ?? "/");
      form.set("url", `${window.location.pathname}${window.location.search}`);
      form.set("text", text);
      form.set("about", JSON.stringify(about));
      if (blob) {
        form.set("audio", blob, `note.${extOf(blob.type)}`);
        form.set("mime", blob.type);
        form.set("seconds", String(Math.round(seconds * 10) / 10));
      }
      const r = await fetch("/api/margin", { method: "POST", body: form });
      const out = (await r.json().catch(() => null)) as
        | (Note & { error?: undefined })
        | { error: string }
        | null;
      if (!r.ok || !out || "error" in out) {
        setTrouble(out && "error" in out && out.error ? out.error : `not kept (${r.status})`);
        return;
      }
      setKept(out);
      setText("");
      discard();
      if (closer.current) window.clearTimeout(closer.current);
      closer.current = window.setTimeout(() => {
        setKept(null);
        setOpen(false);
      }, 1600);
    } finally {
      setBusy(false);
    }
  }, [about, blob, busy, discard, pathname, rec, seconds, text]);

  if (!meta?.writable) return null;
  const where = `at the ${viewName(pathname ?? "/")}`;
  const canKeep = !busy && rec !== "recording" && (!!text.trim() || !!blob);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="m-tab hand fixed right-0 z-[60] px-[5px] py-3 text-[15px]"
          style={{
            top: "calc(50% - 2.4rem)",
            color: "var(--muted)",
            background: "var(--surface)",
            border: "1px solid var(--rule)",
            borderRight: "none",
            borderRadius: "4px 0 0 4px",
          }}
          aria-label="Write in the margin. Also the apostrophe key."
          title="the margin · '"
        >
          margin
        </button>
      )}
      {open && (
        <aside
          role="dialog"
          aria-label="The margin"
          className="m-strip panel sketched fixed right-3 z-[61] w-[22rem] max-w-[calc(100vw-1.5rem)] p-4"
          style={{ top: "50%", borderRadius: 3 }}
        >
          <Sketch seed="margin-strip" draw />
          <div className="flex items-center justify-between gap-2">
            <span className="meta" style={{ color: "var(--accent)" }}>
              in the margin
            </span>
            <button
              onClick={close}
              aria-label="Close"
              className="chip px-2 py-0.5 text-[11px] leading-none"
              style={{ color: "var(--muted)" }}
            >
              esc
            </button>
          </div>
          <p
            className="hand mt-1.5 text-[15px] leading-[1.3]"
            style={{ color: "var(--muted)" }}
          >
            {where}
            {about ? ` · about ${about.label}` : ""}
          </p>
          <textarea
            ref={area}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                keep();
              }
            }}
            rows={4}
            placeholder="what comes to mind, here"
            aria-label="What comes to mind"
            className="m-area mt-3 w-full resize-none bg-transparent px-0 py-1 text-[15px] leading-[1.55]"
            style={{
              color: "var(--ink)",
              borderBottom: "1px solid var(--rule)",
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {rec === "done" ? (
              <>
                <span
                  className="meta"
                  style={{ color: "var(--ink)", textTransform: "none" }}
                >
                  {clock(seconds)} spoken
                </span>
                <button
                  onClick={discard}
                  className="chip m-seg px-2 py-0.5 text-[11px] leading-none"
                  style={{ color: "var(--faint)" }}
                  aria-label="Discard the recording"
                >
                  ×
                </button>
              </>
            ) : (
              <button
                onClick={rec === "recording" ? stop : start}
                data-on={rec === "recording"}
                className="chip m-rec m-seg inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: rec === "recording" ? "var(--accent)" : "var(--muted)",
                  borderColor: rec === "recording" ? "var(--accent)" : undefined,
                }}
                aria-pressed={rec === "recording"}
              >
                <span className="m-dot" aria-hidden />
                {rec === "recording" ? `stop · ${clock(seconds)}` : "record"}
              </button>
            )}
            <span className="flex-1" />
            <button
              onClick={keep}
              disabled={!canKeep}
              className="chip m-seg px-3 py-1 text-[10px] tracking-[0.14em] uppercase disabled:opacity-40"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--ink)",
                borderColor: canKeep ? "var(--ink)" : undefined,
              }}
            >
              {busy ? "keeping…" : "keep"}
            </button>
          </div>
          <p className="meta mt-3" style={{ color: "var(--faint)" }}>
            ' opens · ⌘↵ keeps
            {meta.speech ? " · spoken notes can be written out" : ""}
          </p>
          {trouble && (
            <p
              className="hand fade mt-2 text-[14.5px] leading-[1.3]"
              style={{ color: "var(--accent)" }}
              role="alert"
            >
              {trouble}
            </p>
          )}
          {kept && (
            <p
              className="hand fade mt-2 text-[15px] leading-[1.3]"
              style={{ color: "var(--ink)" }}
              role="status"
            >
              kept ·{" "}
              <a
                href={`/margin?id=${encodeURIComponent(kept.id)}`}
                style={{ color: "var(--accent)" }}
              >
                read the margin
              </a>
            </p>
          )}
        </aside>
      )}
    </>
  );
}
