/**
 * The notice: how to use the garden, and what it leaves to the reader. The
 * text itself is content (`content/notice.ts`); this is its shape and the
 * check that it is whole — every view has a card, every step of the round
 * names a view that exists, and nothing in it is a path or an address that
 * belongs to one machine.
 */

/** One view, on one card. */
export type Card = {
  href: string;
  name: string;
  /** How to get there in the Mac app, and on the keyboard where there is one. */
  key: string;
  /** What it is for. */
  for: string;
  /** What you do on it. */
  do: string;
  /** What the desk reads back. */
  reads: string;
  /** What it will not do — one thing, plainly. */
  never: string;
};

/** One step of the round: when to take it, where it goes, what to do there. */
export type Step = {
  when: string;
  views: string[];
  key: string;
  text: string;
};

export type Ground = { what: string; how: string };

export type Key = { key: string; does: string; where: string };

export type Notice = {
  /** The stance, in paragraphs. The first is set large. */
  stance: string[];
  grounded: { lead: string; items: Ground[] };
  round: Step[];
  views: Card[];
  keys: Key[];
  /** What it will not do. */
  not: string[];
  /** What is the reader's to do. */
  yours: string[];
  /** The two views that ask a model, and on what terms. */
  model: string;
};

const HOME = /\/(Users|home)\//;
const MAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

const blank = (s: string) => s.trim().length === 0;

/**
 * Every way the notice can be incomplete or carry something it should not,
 * as plain sentences. Empty when it is whole. `views` is the list of routes
 * the garden actually has, so a card for a view that went away, or a view
 * with no card, is caught.
 */
export function validateNotice(n: Notice, views: string[]): string[] {
  const out: string[] = [];
  const text: string[] = [];

  if (n.stance.length < 2) out.push("the stance needs at least two paragraphs");
  n.stance.forEach((p, i) => {
    if (blank(p)) out.push(`stance paragraph ${i + 1} is empty`);
    text.push(p);
  });

  if (blank(n.grounded.lead)) out.push("grounded has no lead");
  text.push(n.grounded.lead);
  if (n.grounded.items.length === 0) out.push("grounded lists nothing");
  n.grounded.items.forEach((g, i) => {
    if (blank(g.what) || blank(g.how)) out.push(`ground ${i + 1} is incomplete`);
    text.push(g.what, g.how);
  });

  if (n.round.length === 0) out.push("the round has no steps");
  n.round.forEach((s, i) => {
    if (blank(s.when) || blank(s.text)) out.push(`step ${i + 1} is incomplete`);
    if (s.views.length === 0) out.push(`step ${i + 1} names no view`);
    for (const v of s.views)
      if (!views.includes(v)) out.push(`step ${i + 1} names a view that does not exist: ${v}`);
    text.push(s.when, s.key, s.text);
  });

  const seen = new Set<string>();
  n.views.forEach((c, i) => {
    if (seen.has(c.href)) out.push(`two cards for ${c.href}`);
    seen.add(c.href);
    if (!views.includes(c.href)) out.push(`a card for a view that does not exist: ${c.href}`);
    for (const f of ["name", "key", "for", "do", "reads", "never"] as const)
      if (blank(c[f])) out.push(`card ${i + 1} (${c.href}) has no ${f}`);
    text.push(c.name, c.key, c.for, c.do, c.reads, c.never);
  });
  for (const v of views)
    if (v !== "/notice" && !seen.has(v)) out.push(`no card for ${v}`);

  if (n.keys.length === 0) out.push("no keys");
  n.keys.forEach((k, i) => {
    if (blank(k.key) || blank(k.does) || blank(k.where)) out.push(`key ${i + 1} is incomplete`);
    text.push(k.key, k.does, k.where);
  });

  if (n.not.length === 0) out.push("what it will not do is empty");
  if (n.yours.length === 0) out.push("what is yours is empty");
  n.not.forEach((s, i) => (blank(s) ? out.push(`not ${i + 1} is empty`) : text.push(s)));
  n.yours.forEach((s, i) => (blank(s) ? out.push(`yours ${i + 1} is empty`) : text.push(s)));
  if (blank(n.model)) out.push("the model is not spoken of");
  text.push(n.model);

  for (const t of text) {
    if (HOME.test(t)) out.push(`a home path in the notice: ${t.slice(0, 40)}`);
    if (MAIL.test(t)) out.push(`an address in the notice: ${t.slice(0, 40)}`);
  }
  return out;
}
