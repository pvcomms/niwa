import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reads outside the project root (~/.claude/memory, ~/Fieldnotes, ~/Code) at request
  // time. Nothing is bundled from there, so no tracing config is needed — but this app
  // is local-only by construction: never deploy it.
  serverExternalPackages: ["gray-matter"],
};

export default nextConfig;
