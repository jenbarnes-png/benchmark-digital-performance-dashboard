import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE as BEACON_SESSION_COOKIE, canUseAdmin, fetchBeaconUser } from "./lib/beaconSession";

function basicAuthOk(request: NextRequest): boolean | null {
  const username = process.env.SITE_USERNAME;
  const password = process.env.SITE_PASSWORD;
  if (!username || !password) return null; // not configured

  const auth = request.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const [user, pass] = Buffer.from(encoded, "base64").toString("utf-8").split(":");
      if (user === username && pass === password) return true;
    }
  }
  return false;
}

function signInRedirect(request: NextRequest) {
  const signIn = new URL(
    process.env.BEACON_SIGNIN_URL ?? "https://project-beacon.co.uk/signin",
  );
  const siteUrl = process.env.BEACON_SITE_URL;
  if (siteUrl) {
    signIn.searchParams.set(
      "next",
      `${siteUrl}${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
  }
  return NextResponse.redirect(signIn);
}

function adminForbidden(email: string, role: string) {
  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Admin is staff only</title>
<body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem">
<h1>Admin is staff only</h1>
<p>You're signed in as ${esc(email)} (${esc(role)}). Admin / Data Entry is only available to Project Beacon staff and admins.</p>
<p><a href="/">Back to the dashboard</a></p></body>`,
    { status: 403, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

// Gate for the whole app, including Admin.
//
// Primary gate is the Project Beacon login: Beacon sets its session cookie on
// .project-beacon.co.uk, so it reaches this subdomain too. Set BEACON_AUTH=on
// in Vercel to enable it.
//
// This is deliberately only an *optimistic* check — it confirms a session
// cookie exists and nothing more. Proxy runs on every request including
// prefetches, so Next's auth guide says not to make network or database calls
// here. The cookie is properly verified against Beacon's API server-side, in
// app/layout.tsx via lib/beaconAuth.ts, which is what actually protects the
// data.
//
// The older SITE_USERNAME/SITE_PASSWORD Basic Auth still works and still
// satisfies the gate, so nothing breaks during the switch-over and preview
// deployments stay reachable. Once Beacon sign-in is bedded in, those two env
// vars can be removed.
export async function proxy(request: NextRequest) {
  if (basicAuthOk(request) === true) return NextResponse.next();

  if (process.env.BEACON_AUTH === "on") {
    const sessionToken = request.cookies.get(BEACON_SESSION_COOKIE)?.value;
    if (sessionToken) {
      // Admin / Data Entry (pages, form submissions and the screenshot route
      // all live under /admin) is staff-only. This one path gets the real
      // check here rather than the optimistic cookie test, so a forged cookie
      // or a client account can't reach it. Low traffic, so the extra call is fine.
      if (request.nextUrl.pathname.startsWith("/admin")) {
        const user = await fetchBeaconUser(sessionToken);
        if (!user) return signInRedirect(request);
        if (!canUseAdmin(user.role)) return adminForbidden(user.email, user.role);
      }
      // Pass the path through so that if the server-side check then rejects an
      // expired or revoked session, it can still send the user back here after
      // they sign in. A server layout cannot read the pathname on its own.
      const headers = new Headers(request.headers);
      headers.set(
        "x-beacon-path",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return NextResponse.next({ request: { headers } });
    }

    return signInRedirect(request);
  }

  // Beacon gate off: fall back to the Basic Auth behaviour.
  if (basicAuthOk(request) === false) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Benchmark", charset="UTF-8"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  // /api/cron is excluded — it's called by an automated scheduler (see
  // .github/workflows/sync-data.yml and vercel.json), which can't
  // supply the Basic Auth popup credentials or hold a Beacon session. It has
  // its own separate CRON_SECRET check instead (see app/api/cron/sync/route.ts).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron).*)"],
};
