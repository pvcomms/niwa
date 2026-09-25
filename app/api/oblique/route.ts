import fs from "node:fs";
import path from "node:path";
import { buildGarden, type Garden, type GardenNode } from "@/lib/garden";
import { DEFAULT_CONFIG } from "@/lib/bearing";
import { readConfig } from "@/lib/bearing-store";
import { SLUG, gardenCards, validateCard } from "@/lib/oblique";
import { OBLIQUE_DIR, addCard, readDecks, removeCard } from "@/lib/oblique-store";
import { STARTER } from "@/content/oblique";

export const dynamic = "force-dynamic";

/** The nodes the garden can deal from: read off disk here, the baked snapshot when deployed. */
function nodes(): GardenNode[] {
  if (process.env.NIWA_MODE) {
    const raw = fs.readFileSync(path.join(process.cwd(), "data", "garden.json"), "utf8");
    return (JSON.parse(raw) as Garden).nodes;
  }
  return buildGarden().nodes;
}

/**
 * The decks — the garden's starter first, then the reader's own — and every
 * card the garden itself can deal. `?id=` names the stone the reader came
 * from, so the sheet can say what the card is about. A deployed garden has
 * no reader's decks and no vault to write; it deals the starter and its own
 * public stones, and refuses every write.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const ns = nodes();
  const about = id ? (ns.find((n) => n.id === id) ?? null) : null;
  const deployed = Boolean(process.env.NIWA_MODE);
  const values = deployed ? DEFAULT_CONFIG.values : readConfig().config.values;
  return Response.json(
    {
      decks: [STARTER, ...(deployed ? [] : readDecks())],
      garden: gardenCards(ns, values),
      about: about ? { id: about.id, label: about.label, kind: about.kind } : null,
      writable: !deployed,
      dir: deployed ? null : OBLIQUE_DIR,
    },
    { headers: { "cache-control": deployed ? "public, max-age=300" : "no-store" } },
  );
}

/** Add one card to a deck of the reader's; `deck` defaults to "deck". */
export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { deck?: unknown; text?: unknown } | null;
  try {
    const slug = typeof body?.deck === "string" && body.deck ? body.deck : "deck";
    if (!SLUG.test(slug) || slug === STARTER.slug) throw new Error("bad deck");
    return Response.json(addCard(slug, validateCard(body?.text)));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Take a card back out of one of the reader's decks. */
export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const url = new URL(req.url);
  const slug = url.searchParams.get("deck") ?? "";
  const index = Number(url.searchParams.get("index"));
  if (!SLUG.test(slug) || slug === STARTER.slug || !Number.isInteger(index))
    return Response.json({ error: "bad card" }, { status: 400 });
  const d = removeCard(slug, index);
  if (!d) return new Response(null, { status: 404 });
  return Response.json(d);
}
