import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate for the private deployment. Local dev and the public build set no
 * NIWA_PASSWORD, so this is a no-op there; the private deployment sets one and
 * every request needs it. Basic auth on purpose — the browser supplies the
 * prompt, there is no login page to get wrong, and it works on any plan.
 */
export function middleware(request: NextRequest) {
  const expected = process.env.NIWA_PASSWORD;
  if (!expected) return NextResponse.next();

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    let supplied = "";
    try {
      const decoded = atob(header.slice(6));
      supplied = decoded.slice(decoded.indexOf(":") + 1);
    } catch {
      /* malformed header — falls through to the challenge */
    }
    // Length-independent compare, so a wrong guess leaks nothing by timing.
    let same = supplied.length === expected.length;
    for (let i = 0; i < Math.max(supplied.length, expected.length); i++) {
      if (supplied.charCodeAt(i) !== expected.charCodeAt(i)) same = false;
    }
    if (same) return NextResponse.next();
  }

  return new NextResponse("niwa is private.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="niwa", charset="UTF-8"',
      "cache-control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
