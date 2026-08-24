import { NextResponse, type NextRequest } from "next/server";

// Simple shared-password gate for the whole app (including Admin) while
// there's no per-user login. No-ops if SITE_USERNAME/SITE_PASSWORD
// aren't set, so local dev never needs them — set both in Vercel's
// project env vars to turn this on for the deployed site.
export function proxy(request: NextRequest) {
  const username = process.env.SITE_USERNAME;
  const password = process.env.SITE_PASSWORD;
  if (!username || !password) return NextResponse.next();

  const auth = request.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const [user, pass] = Buffer.from(encoded, "base64").toString("utf-8").split(":");
      if (user === username && pass === password) return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Benchmark", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
