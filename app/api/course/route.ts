import { buildGarden, fingerprint, type GardenNode } from "@/lib/garden";
import { buildFlow } from "@/lib/flow";
import { inputsOf, isBlank, validateCourse } from "@/lib/course";
import { historyOf } from "@/lib/course-history";
import {
  COURSE_DIR,
  deleteCourse,
  readCourses,
  writeCourse,
} from "@/lib/course-store";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The courses kept — one per belief, with its question and the reader's
 * marks — or, with `?belief=`, what that belief's own file remembers: the
 * days it was steered and the day each input first appeared in it. A
 * deployed garden has no vault or history to read, so under NIWA_MODE it
 * serves none and refuses every write — the sheet still draws.
 */
export async function GET(req: Request) {
  const belief = new URL(req.url).searchParams.get("belief");
  if (belief !== null) {
    if (process.env.NIWA_MODE)
      return Response.json(
        { rewrites: [], arrivals: {}, since: null },
        { headers: { "cache-control": "public, max-age=300" } },
      );
    const g = buildGarden();
    const nodes = new Map<string, GardenNode>(g.nodes.map((n) => [n.id, n]));
    const node = nodes.get(belief);
    if (!node) return new Response(null, { status: 404 });
    const inputs = inputsOf(buildFlow(g.links), nodes, belief);
    return Response.json(historyOf(node, inputs, nodes, fingerprint()), {
      headers: { "cache-control": "no-store" },
    });
  }
  if (process.env.NIWA_MODE)
    return Response.json(
      { courses: [], writable: false, dir: null },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  return Response.json(
    { courses: readCourses(), writable: true, dir: COURSE_DIR },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Keep a course, whole. A course with nothing said in it is removed rather than kept empty. */
export async function PUT(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const body = await req.json().catch(() => null);
  try {
    const course = validateCourse(body, today());
    if (isBlank(course)) {
      deleteCourse(course.belief);
      return Response.json({ ...course, gone: true });
    }
    return Response.json(writeCourse(course));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (process.env.NIWA_MODE) return new Response(null, { status: 404 });
  const belief = new URL(req.url).searchParams.get("belief") ?? "";
  if (!belief)
    return Response.json({ error: "which belief?" }, { status: 400 });
  try {
    return Response.json({ gone: deleteCourse(belief) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
