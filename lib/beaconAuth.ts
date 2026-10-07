import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE, fetchBeaconUser, type BeaconUser } from "./beaconSession";

// Session cookie set by Project Beacon on .project-beacon.co.uk, so it is sent
// to this subdomain too. The value is an opaque token — only Beacon's API can
// say whether it is valid, hence the lookup in beaconSession.ts.
const BEACON_SIGNIN_URL =
  process.env.BEACON_SIGNIN_URL ?? "https://project-beacon.co.uk/signin";
const SITE_URL = process.env.BEACON_SITE_URL;

/**
 * Whether the Beacon gate is switched on.
 *
 * Follows the same convention as the SITE_USERNAME/SITE_PASSWORD gate this
 * replaces: no-op unless configured, so local dev needs no setup. Set
 * BEACON_AUTH=on in Vercel to enable it for the deployed site.
 */
export function beaconAuthEnabled(): boolean {
  return process.env.BEACON_AUTH === "on";
}

export function signInUrl(returnTo?: string): string {
  const url = new URL(BEACON_SIGNIN_URL);
  if (returnTo) url.searchParams.set("next", returnTo);
  return url.toString();
}

/**
 * Ask Beacon whether the caller's session is valid.
 *
 * This is the authoritative check and runs server-side, per request. The
 * optimistic cookie-presence check in proxy.ts is not enough on its own — an
 * expired or forged cookie passes it — but it keeps this network call off
 * prefetches and static assets.
 */
export async function getBeaconUser(): Promise<BeaconUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return fetchBeaconUser(token);
}

/**
 * Require a signed-in Beacon user, or redirect to sign in.
 *
 * Call at the top of a layout or page. Returns the user so callers can also
 * branch on role.
 */
export async function requireBeaconUser(): Promise<BeaconUser | null> {
  if (!beaconAuthEnabled()) return null;

  const user = await getBeaconUser();
  if (!user) {
    // proxy.ts forwards the current path; without it we can only send them
    // back to the dashboard root.
    const path = (await headers()).get("x-beacon-path") ?? "";
    redirect(signInUrl(SITE_URL ? `${SITE_URL}${path}` : undefined));
  }
  return user;
}
