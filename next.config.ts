import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reads outside the project root (~/.claude/memory, ~/Fieldnotes, ~/Code) at request
  // time. Nothing is bundled from there, so no tracing config is needed — but this app
  // is local-only by construction: never deploy it.
  serverExternalPackages: ["gray-matter"],
  // The dev server is the app (launchd runs `next dev`), so its "N" badge sat in
  // the Mac window over the filters. Compile and runtime errors still surface.
  devIndicators: false,
};

export default nextConfig;
