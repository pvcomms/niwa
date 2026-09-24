import fs from "node:fs";
import path from "node:path";
import { GARDEN_DIR } from "./garden.ts";
import { parseCourse, serialiseCourse, type Course } from "./course.ts";

/**
 * A belief's course, kept as one small markdown file beside the vault's
 * notes: the question as put and as put before, and the reader's marks on
 * what hit it. Read by the belief's id, not the file's name, so a file can
 * be renamed by hand without losing its belief.
 */
export const COURSE_DIR =
  process.env.NIWA_COURSE_DIR ?? path.join(GARDEN_DIR, "..", "course");

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function readCourses(): Course[] {
  if (!fs.existsSync(COURSE_DIR)) return [];
  return fs
    .readdirSync(COURSE_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) =>
      parseCourse(
        f.slice(0, -3),
        fs.readFileSync(path.join(COURSE_DIR, f), "utf8"),
      ),
    );
}

export function readCourse(belief: string): Course | null {
  return readCourses().find((c) => c.belief === belief) ?? null;
}

/** Keep a course. A file that already holds another belief under this slug is left alone. */
export function writeCourse(c: Course): Course {
  const existing = readCourses();
  const mine = existing.find((e) => e.belief === c.belief);
  let slug = mine?.slug ?? c.slug;
  if (!mine) {
    const taken = new Set(existing.map((e) => e.slug));
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
  }
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const kept = { ...c, slug };
  fs.mkdirSync(COURSE_DIR, { recursive: true });
  fs.writeFileSync(path.join(COURSE_DIR, `${slug}.md`), serialiseCourse(kept));
  return kept;
}

export function deleteCourse(belief: string): boolean {
  const mine = readCourse(belief);
  if (!mine) return false;
  if (!SLUG.test(mine.slug)) throw new Error("bad slug");
  fs.unlinkSync(path.join(COURSE_DIR, `${mine.slug}.md`));
  return true;
}
