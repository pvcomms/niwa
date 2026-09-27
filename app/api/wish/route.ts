import { buildGarden } from "@/lib/garden";
import { readConfig } from "@/lib/bearing-store";
import { DEFAULT_CONFIG } from "@/lib/bearing";
import { readClaims } from "@/lib/tack-store";
import { speechUp } from "@/lib/speech";
import {
  gardenBeings,
  gardenFacts,
  validateList,
  validatePod,
  validateSitting,
} from "@/lib/wish";
import {
  LISTS,
  WISH_DIR,
  deletePod,
  deleteSitting,
  readList,
  readPods,
  readSittings,
  writeList,
  writePod,
  writeSitting,
  type ListName,
} from "@/lib/wish-store";
import {
  DEFAULT_PODS,
  DEFAULT_TRUTHS,
  DEFAULT_WISHES,
  SPECIMEN_FACTS,
  SPECIMEN_PODS,
  SPECIMEN_SITTINGS,
} from "@/content/wish";

export const dynamic = "force-dynamic";

/**
 * The practice: the pods, the sittings, the three lists, what the garden
 * offers (facts about the reader in the record's words, people it has
 * notes on), and whether the speech server on this machine is up. A
 * deployed garden serves the specimen read-only and has no voice.
 */
export async function GET() {
  const deployed = Boolean(process.env.NIWA_MODE);
  if (deployed)
    return Response.json(
      {
        pods: SPECIMEN_PODS,
        sittings: SPECIMEN_SITTINGS,
        wishes: DEFAULT_WISHES,
        truths: DEFAULT_TRUTHS,
        facts: SPECIMEN_FACTS,
        offers: { facts: [], beings: [] },
        speech: false,
        writable: false,
        dir: null,
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  // The six every practice begins with are always there; a kept file replaces its default by slug, and rings of the reader's own sit among them by order.
  const kept = readPods();
  const pods = [
    ...DEFAULT_PODS.filter((d) => !kept.some((k) => k.slug === d.slug)),
    ...kept,
  ].sort((a, b) => a.order - b.order || (a.slug < b.slug ? -1 : 1));
  const nodes = buildGarden().nodes;
  const values = readConfig().config.values.map((v) => ({ name: v.name }));
  const hull = readClaims()
    .filter((c) => c.layer === "hull" && !c.letGo)
    .map((c) => ({ text: c.text, chosen: c.chosen || c.opened }));
  const facts = readList("facts", []);
  const have = new Set(facts.map((f) => f.toLowerCase()));
  return Response.json(
    {
      pods,
      sittings: readSittings(),
      wishes: readList("wishes", DEFAULT_WISHES),
      truths: readList("truths", DEFAULT_TRUTHS),
      facts,
      offers: {
        facts: gardenFacts(
          nodes,
          values.length ? values : DEFAULT_CONFIG.values,
          hull,
        ).filter((f) => !have.has(f.toLowerCase())),
        beings: gardenBeings(nodes),
      },
      speech: await speechUp(),
      writable: true,
      dir: WISH_DIR,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Keep a pod, a sitting, or one of the lists. */
export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    pod?: unknown;
    pods?: unknown;
    sitting?: unknown;
    fresh?: unknown;
    list?: unknown;
    items?: unknown;
  } | null;
  try {
    if (body?.pods !== undefined) {
      const pods = (Array.isArray(body.pods) ? body.pods : []).map((p) =>
        validatePod(p),
      );
      for (const p of pods) writePod(p);
      return Response.json({ pods: readPods() });
    }
    if (body?.pod !== undefined)
      return Response.json({ pod: writePod(validatePod(body.pod)) });
    if (body?.sitting !== undefined)
      return Response.json({
        sitting: writeSitting(
          validateSitting(body.sitting),
          body.fresh === true,
        ),
      });
    if (
      typeof body?.list === "string" &&
      (LISTS as string[]).includes(body.list)
    )
      return Response.json({
        list: body.list,
        items: writeList(body.list as ListName, validateList(body.items)),
      });
    return Response.json({ error: "nothing to keep" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const url = new URL(req.url);
  const pod = url.searchParams.get("pod");
  const sitting = url.searchParams.get("sitting");
  try {
    const gone = pod
      ? deletePod(pod)
      : sitting
        ? deleteSitting(sitting)
        : false;
    return gone
      ? Response.json({ gone: true })
      : new Response(null, { status: 404 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
