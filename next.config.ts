import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/hexmap.ts reads this file at runtime via a computed path
  // (import.meta.url + path.join), which Next's build-time file tracer
  // can't follow statically — without this it's silently dropped from
  // the Vercel serverless bundle, and the hex map 500s in production
  // (worked fine locally, since nothing is bundled there).
  outputFileTracingIncludes: {
    "/*": ["./data/hexmap/**/*"],
  },
};

export default nextConfig;
